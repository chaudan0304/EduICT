import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { 
  createLesson, 
  updateLesson, 
  getLessonByFileHash, 
  getAllLessons,
  getLessonById,
  updateSlideRenderStatus,
  syncLessonOverallRenderStatus
} from './db.js';
import { 
  extractPptxContentFingerprint, 
  calculateFileHash, 
  SIMILARITY_STATUS, 
  calculateSimilarity, 
  DUPLICATE_THRESHOLDS,
  extractTitleFromSlide1Xml,
  extractTitleFromFileName
} from './duplicateDetector.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const PRESENTATIONS_DIR = path.join(UPLOADS_DIR, 'presentations');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
const CACHE_DIR = path.join(UPLOADS_DIR, 'cache');
const RENDERER_SCRIPT = path.resolve(process.cwd(), 'server', 'pptx-renderer.ps1');
const FALLBACK_SCRIPT = path.resolve(process.cwd(), 'server', 'pptx-renderer-fallback.py');

// Đảm bảo các thư mục cần thiết tồn tại
export function initUploadDirectories() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(PRESENTATIONS_DIR)) fs.mkdirSync(PRESENTATIONS_DIR, { recursive: true });
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Xóa an toàn thư mục
export function removeDirectorySafe(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn('Không thể xóa thư mục:', dirPath, err.message);
  }
}

// Xóa thư mục lưu trữ bài trình chiếu của một lesson
export function deleteLessonPresentationsDir(lessonId) {
  if (!lessonId) return;
  const safeId = path.basename(lessonId);
  const targetDir = path.join(PRESENTATIONS_DIR, safeId);
  removeDirectorySafe(targetDir);
}

export const RENDER_STAGES = {
  UPLOAD: 'UPLOAD',
  PPTX_PARSE: 'PPTX_PARSE',
  PPTX_TO_PDF: 'PPTX_TO_PDF',
  PDF_PAGE_RENDER: 'PDF_PAGE_RENDER',
  THUMBNAIL_RENDER: 'THUMBNAIL_RENDER',
  FILE_STORAGE: 'FILE_STORAGE',
  URL_RESOLUTION: 'URL_RESOLUTION'
};

export function logStageEvent({
  lessonId = '',
  slideId = '',
  slideNumber = null,
  originalFile = '',
  stage = RENDER_STAGES.UPLOAD,
  attempt = 1,
  errorCode = '',
  errorMessage = '',
  duration = 0,
  outputPath = '',
  outputSize = 0,
  exitCode = null,
  stdout = '',
  stderr = '',
  inputPath = ''
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    lessonId,
    slideId,
    slideNumber,
    originalFile,
    stage,
    attempt,
    errorCode: errorCode || (errorMessage ? 'STAGE_ERROR' : 'OK'),
    errorMessage: errorMessage || '',
    durationMs: duration,
    outputPath,
    outputSize,
    exitCode,
    inputPath
  };

  const statusStr = errorMessage ? `❌ [${logEntry.errorCode}] ${errorMessage}` : '✅ OK';
  console.log(`[STAGE:${stage}] lesson=${lessonId || 'N/A'} slide=${slideNumber !== null ? slideNumber : 'ALL'} attempt=${attempt} (${duration}ms) -> ${statusStr}`);
  if (stderr && stderr.trim()) {
    console.warn(`[STAGE:${stage}][STDERR]`, stderr.trim());
  }
  return logEntry;
}

export function validateImageFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { valid: false, reason: 'File không tồn tại trên ổ đĩa' };
    }
    const stat = fs.statSync(filePath);
    if (stat.size <= 1024) {
      return { valid: false, reason: `File kích thước quá nhỏ hoặc rỗng (${stat.size} bytes <= 1024)` };
    }

    const buf = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 32, 0);
    fs.closeSync(fd);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return { valid: true, mimeType: 'image/png', width, height, sizeBytes: stat.size };
      }
      return { valid: false, reason: `Kích thước ảnh PNG không hợp lệ (${width}x${height})` };
    }

    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      return { valid: true, mimeType: 'image/jpeg', width: 1920, height: 1080, sizeBytes: stat.size };
    }

    // WebP: RIFF .... WEBP
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      return { valid: true, mimeType: 'image/webp', width: 1920, height: 1080, sizeBytes: stat.size };
    }

    return { valid: false, reason: 'Định dạng ảnh không được hỗ trợ hoặc file bị hỏng' };
  } catch (err) {
    return { valid: false, reason: `Lỗi thẩm định ảnh: ${err.message}` };
  }
}

// Xuất file PowerPoint sang PDF (Giai đoạn 1 của Decoupled Pipeline)
export function renderPptxToPdf(pptxPath, targetPdfPath, timeoutMs = 60000, context = {}) {
  return new Promise((resolve, reject) => {
    const tStart = Date.now();
    if (!fs.existsSync(pptxPath)) {
      const err = new Error(`File PowerPoint không tồn tại: ${pptxPath}`);
      logStageEvent({
        stage: RENDER_STAGES.PPTX_TO_PDF,
        originalFile: path.basename(pptxPath),
        inputPath: pptxPath,
        duration: Date.now() - tStart,
        errorMessage: err.message,
        errorCode: 'FILE_NOT_FOUND',
        ...context
      });
      return reject(err);
    }
    const parentDir = path.dirname(targetPdfPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', RENDERER_SCRIPT,
      '-PptxPath', path.resolve(pptxPath),
      '-OutputFile', path.resolve(targetPdfPath),
      '-Mode', 'pdf'
    ];

    const child = spawn('powershell.exe', args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';
    let timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch {}
      const err = new Error('Quá thời gian xuất file PDF từ PowerPoint (Timeout 60s).');
      logStageEvent({
        stage: RENDER_STAGES.PPTX_TO_PDF,
        originalFile: path.basename(pptxPath),
        inputPath: pptxPath,
        duration: Date.now() - tStart,
        errorMessage: err.message,
        errorCode: 'TIMEOUT',
        stderr: stderrData,
        stdout: stdoutData,
        ...context
      });
      reject(err);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdoutData += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderrData += chunk.toString('utf-8'); });

    child.on('error', (err) => {
      clearTimeout(timer);
      logStageEvent({
        stage: RENDER_STAGES.PPTX_TO_PDF,
        originalFile: path.basename(pptxPath),
        inputPath: pptxPath,
        duration: Date.now() - tStart,
        errorMessage: err.message,
        errorCode: 'SPAWN_ERROR',
        stderr: stderrData,
        stdout: stdoutData,
        ...context
      });
      reject(new Error(`Không thể khởi chạy PowerShell để xuất PDF: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - tStart;
      try {
        const trimmed = stdoutData.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error(stderrData || `Tiến trình xuất PDF kết thúc với mã ${code}`);
        }
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.success) {
          throw new Error(parsed.error || 'Xuất PDF từ PowerPoint thất bại.');
        }
        if (!fs.existsSync(targetPdfPath) || fs.statSync(targetPdfPath).size <= 1024) {
          throw new Error('File PDF sau xuất không tồn tại hoặc có kích thước rỗng (0 bytes).');
        }

        const size = fs.statSync(targetPdfPath).size;
        logStageEvent({
          stage: RENDER_STAGES.PPTX_TO_PDF,
          originalFile: path.basename(pptxPath),
          inputPath: pptxPath,
          outputPath: targetPdfPath,
          outputSize: size,
          duration,
          exitCode: code,
          ...context
        });

        resolve(parsed);
      } catch (parseErr) {
        logStageEvent({
          stage: RENDER_STAGES.PPTX_TO_PDF,
          originalFile: path.basename(pptxPath),
          inputPath: pptxPath,
          outputPath: targetPdfPath,
          duration,
          exitCode: code,
          errorMessage: parseErr.message,
          errorCode: 'PARSE_ERROR',
          stderr: stderrData,
          stdout: stdoutData,
          ...context
        });
        reject(new Error(`Lỗi phân tích kết quả xuất PDF: ${parseErr.message}`));
      }
    });
  });
}

// Render từng trang của PDF thành ảnh PNG chất lượng cao (Giai đoạn 2 của Decoupled Pipeline)
export function renderPdfPagesToImages(pdfPath, outputDir, timeoutMs = 60000, context = {}) {
  return new Promise((resolve, reject) => {
    const tStart = Date.now();
    if (!fs.existsSync(pdfPath)) {
      const err = new Error(`File PDF không tồn tại: ${pdfPath}`);
      logStageEvent({
        stage: RENDER_STAGES.PDF_PAGE_RENDER,
        inputPath: pdfPath,
        duration: Date.now() - tStart,
        errorMessage: err.message,
        errorCode: 'FILE_NOT_FOUND',
        ...context
      });
      return reject(err);
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = [
      FALLBACK_SCRIPT,
      '--mode', 'pdf_all',
      '--input', path.resolve(pdfPath),
      '--output-dir', path.resolve(outputDir),
      '--dpi', '150'
    ];

    const child = spawn(pythonCmd, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';
    let timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch {}
      const err = new Error('Quá thời gian render slide từ PDF (Timeout 60s).');
      logStageEvent({
        stage: RENDER_STAGES.PDF_PAGE_RENDER,
        inputPath: pdfPath,
        duration: Date.now() - tStart,
        errorMessage: err.message,
        errorCode: 'TIMEOUT',
        stderr: stderrData,
        ...context
      });
      reject(err);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdoutData += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderrData += chunk.toString('utf-8'); });

    child.on('error', (err) => {
      clearTimeout(timer);
      logStageEvent({
        stage: RENDER_STAGES.PDF_PAGE_RENDER,
        inputPath: pdfPath,
        duration: Date.now() - tStart,
        errorMessage: err.message,
        errorCode: 'SPAWN_ERROR',
        stderr: stderrData,
        ...context
      });
      reject(new Error(`Không thể khởi chạy Python PyMuPDF để render PDF: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - tStart;
      try {
        const trimmed = stdoutData.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error(stderrData || `Tiến trình render PDF kết thúc với mã ${code}`);
        }
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.success && (!parsed.slides || parsed.slides.length === 0)) {
          throw new Error(parsed.error || 'Render ảnh từ PDF thất bại.');
        }

        // Validate chất lượng từng file ảnh
        if (Array.isArray(parsed.slides)) {
          parsed.slides.forEach((s) => {
            const outPath = s.filePath || path.join(outputDir, s.fileName);
            const val = validateImageFile(outPath);
            if (val.valid) {
              s.status = 'completed';
              s.sizeBytes = val.sizeBytes;
              s.width = val.width;
              s.height = val.height;
            } else {
              s.status = 'failed';
              s.error = val.reason;
            }
          });
        }

        logStageEvent({
          stage: RENDER_STAGES.PDF_PAGE_RENDER,
          inputPath: pdfPath,
          outputPath: outputDir,
          duration,
          exitCode: code,
          ...context
        });

        resolve(parsed);
      } catch (parseErr) {
        logStageEvent({
          stage: RENDER_STAGES.PDF_PAGE_RENDER,
          inputPath: pdfPath,
          outputPath: outputDir,
          duration,
          exitCode: code,
          errorMessage: parseErr.message,
          errorCode: 'PARSE_ERROR',
          stderr: stderrData,
          stdout: stdoutData,
          ...context
        });
        reject(new Error(`Lỗi phân tích kết quả render slide từ PDF: ${parseErr.message}`));
      }
    });
  });
}

// Render dự phòng cho 1 slide đơn lẻ (PDF page -> PNG trước, nếu hỏng thì PowerPoint COM đơn slide)
export async function renderSingleSlideFallback({ pptxPath, pdfPath, slideNumber, outputFilePath, width = 1920, height = 1080 }) {
  // Phương án 1: Trích xuất nhanh từ PDF hiện hữu (< 200ms)
  if (pdfPath && fs.existsSync(pdfPath)) {
    try {
      const res = await new Promise((resolve, reject) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const args = [
          FALLBACK_SCRIPT,
          '--mode', 'pdf_single',
          '--input', path.resolve(pdfPath),
          '--page', String(slideNumber),
          '--output-file', path.resolve(outputFilePath),
          '--dpi', '150'
        ];

        const child = spawn(pythonCmd, args, { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        let stdoutData = '';
        let stderrData = '';
        const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {} reject(new Error('Timeout render single slide từ PDF')); }, 15000);

        child.stdout.on('data', chunk => stdoutData += chunk.toString('utf-8'));
        child.stderr.on('data', chunk => stderrData += chunk.toString('utf-8'));
        child.on('close', () => {
          clearTimeout(timer);
          try {
            const jsonMatch = stdoutData.trim().match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const p = JSON.parse(jsonMatch[0]);
              if (p.success && fs.existsSync(outputFilePath) && fs.statSync(outputFilePath).size > 1024) {
                return resolve(p);
              }
            }
            reject(new Error(stderrData || 'Render PDF single page thất bại'));
          } catch (e) {
            reject(e);
          }
        });
      });
      return res;
    } catch (pdfErr) {
      console.warn(`[PPTX Retry] Render slide ${slideNumber} từ PDF thất bại, thử xuất trực tiếp qua PowerPoint COM:`, pdfErr.message);
    }
  }

  // Phương án 2: Xuất trực tiếp slide từ PowerPoint COM
  if (pptxPath && fs.existsSync(pptxPath) && process.platform === 'win32') {
    return new Promise((resolve, reject) => {
      const args = [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', RENDERER_SCRIPT,
        '-PptxPath', path.resolve(pptxPath),
        '-OutputFile', path.resolve(outputFilePath),
        '-Mode', 'single_slide',
        '-SlideIndex', String(slideNumber),
        '-Width', String(width),
        '-Height', String(height)
      ];

      const child = spawn('powershell.exe', args, { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
      let stdoutData = '';
      let stderrData = '';
      const timer = setTimeout(() => { try { child.kill('SIGTERM'); } catch {} reject(new Error('Timeout export single slide từ PowerPoint COM')); }, 30000);

      child.stdout.on('data', chunk => stdoutData += chunk.toString('utf-8'));
      child.stderr.on('data', chunk => stderrData += chunk.toString('utf-8'));
      child.on('close', (code) => {
        clearTimeout(timer);
        try {
          const jsonMatch = stdoutData.trim().match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const p = JSON.parse(jsonMatch[0]);
            if (p.success && fs.existsSync(outputFilePath) && fs.statSync(outputFilePath).size > 1024) {
              return resolve(p);
            }
            throw new Error(p.error || 'Xuất single slide thất bại');
          }
          throw new Error(stderrData || `PowerPoint COM trả về mã ${code}`);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  throw new Error(`Không thể kết xuất slide ${slideNumber}: Thiếu cả PDF và file gốc PPTX hợp lệ.`);
}

// Gọi script PowerShell legacy all_png (giữ để tương thích)
export function renderPptxWithPowerPoint(pptxPath, outputDir, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(pptxPath)) {
      return reject(new Error(`File PowerPoint không tồn tại: ${pptxPath}`));
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', RENDERER_SCRIPT,
      '-PptxPath', path.resolve(pptxPath),
      '-OutputDir', path.resolve(outputDir),
      '-Mode', 'all_png'
    ];

    const child = spawn('powershell.exe', args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';
    let timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch {}
      reject(new Error('Quá thời gian xử lý file PowerPoint (Timeout 60s).'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdoutData += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderrData += chunk.toString('utf-8'); });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Không thể khởi chạy PowerShell: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const trimmed = stdoutData.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error(stderrData || `Tiến trình kết thúc với mã ${code}`);
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.success && (!parsed.slides || parsed.slides.length === 0)) {
          throw new Error(parsed.error || 'Xử lý file PowerPoint thất bại.');
        }
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Lỗi phân tích kết quả render PowerPoint: ${parseErr.message}`));
      }
    });
  });
}

// Gọi script Python + LibreOffice fallback (giữ để tương thích)
export function renderPptxWithLibreOffice(pptxPath, outputDir, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(pptxPath)) {
      return reject(new Error(`File PowerPoint không tồn tại: ${pptxPath}`));
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const child = spawn(pythonCmd, [FALLBACK_SCRIPT, '--mode', 'pptx_libreoffice', '--input', path.resolve(pptxPath), '--output-dir', path.resolve(outputDir)], {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';
    let timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch {}
      reject(new Error('Quá thời gian xử lý LibreOffice fallback (Timeout 60s).'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdoutData += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderrData += chunk.toString('utf-8'); });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Không thể khởi chạy Python LibreOffice fallback: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const trimmed = stdoutData.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error(stderrData || `Đầu ra fallback không hợp lệ (mã ${code})`);
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.success && (!parsed.slides || parsed.slides.length === 0)) {
          throw new Error(parsed.error || 'Render qua LibreOffice thất bại.');
        }
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Lỗi kết xuất LibreOffice: ${parseErr.message}`));
      }
    });
  });
}

// BỘ KẾT XUẤT ĐA TẦNG NÂNG CẤP: DECOUPLED 2-STAGE PIPELINE (PPTX -> PDF 1 lần -> PyMuPDF từng trang)
export async function renderPptxMultiEngine(pptxPath, outputDir, options = {}) {
  const resolvedOutDir = path.resolve(outputDir);
  const pdfPath = options.pdfPath ? path.resolve(options.pdfPath) : path.join(path.dirname(resolvedOutDir), 'presentation.pdf');

  let pdfGenerated = false;
  let stage1Error = null;

  // BƯỚC 1: Xuất PPTX -> PDF 1 lần duy nhất (nếu PDF chưa có hoặc bắt buộc xuất mới)
  if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size <= 1024) {
    if (process.platform === 'win32') {
      try {
        console.log(`[PPTX Engine] Bước 1: Xuất PPTX -> PDF qua PowerPoint COM: ${path.basename(pptxPath)}`);
        await renderPptxToPdf(pptxPath, pdfPath);
        pdfGenerated = true;
      } catch (err) {
        stage1Error = err;
        console.warn(`[PPTX Engine] PowerPoint COM xuất PDF thất bại:`, err.message);
      }
    }

    if (!pdfGenerated) {
      try {
        console.log(`[PPTX Engine] Bước 1 (Fallback): Thử xuất PDF qua LibreOffice...`);
        await renderPptxWithLibreOffice(pptxPath, path.dirname(pdfPath));
        if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1024) {
          pdfGenerated = true;
        }
      } catch (loErr) {
        console.warn(`[PPTX Engine] LibreOffice xuất PDF thất bại:`, loErr.message);
      }
    }
  } else {
    pdfGenerated = true;
  }

  // BƯỚC 2: Tách các trang PDF thành ảnh PNG qua PyMuPDF
  if (pdfGenerated && fs.existsSync(pdfPath)) {
    try {
      console.log(`[PPTX Engine] Bước 2: Tách các trang PDF thành PNG qua PyMuPDF...`);
      const renderRes = await renderPdfPagesToImages(pdfPath, resolvedOutDir);
      let slides = renderRes.slides || [];

      // Kiểm tra chất lượng từng slide: Nếu slide nào lỗi hoặc 0 bytes, thử fallback đơn slide
      for (const s of slides) {
        if (s.status === 'failed' || !s.sizeBytes || s.sizeBytes <= 1024) {
          console.warn(`[PPTX Engine] Slide ${s.slideNumber} chưa hợp lệ, thử fallback đơn slide...`);
          try {
            const singleOut = path.join(resolvedOutDir, s.fileName);
            await renderSingleSlideFallback({
              pptxPath,
              pdfPath,
              slideNumber: s.slideNumber,
              outputFilePath: singleOut
            });
            s.status = 'completed';
            s.sizeBytes = fs.statSync(singleOut).size;
            s.error = '';
          } catch (retryErr) {
            console.error(`[PPTX Engine] Fallback đơn slide ${s.slideNumber} thất bại:`, retryErr.message);
            s.status = 'failed';
            s.error = retryErr.message;
          }
        }
      }

      const completedCount = slides.filter(s => s.status === 'completed').length;
      return {
        success: completedCount > 0,
        slideCount: slides.length,
        slides,
        pdfPath,
        hasFailedSlide: completedCount < slides.length
      };
    } catch (stage2Err) {
      console.error(`[PPTX Engine] Lỗi bước 2 (PDF -> Images):`, stage2Err.message);
    }
  }

  // BƯỚC 3: Phương án dự phòng cuối: Thử xuất tất cả PNG trực tiếp từ PowerPoint COM
  if (process.platform === 'win32') {
    try {
      console.log(`[PPTX Engine] Bước 3 (Dự phòng cuối): Xuất toàn bộ ảnh PNG trực tiếp qua PowerPoint COM...`);
      const resLegacy = await renderPptxWithPowerPoint(pptxPath, resolvedOutDir);
      if (resLegacy && resLegacy.slides && resLegacy.slides.length > 0) {
        return resLegacy;
      }
    } catch (legacyErr) {
      console.error(`[PPTX Engine] Bước 3 thất bại:`, legacyErr.message);
    }
  }

  throw new Error(`Không thể kết xuất slide PowerPoint:\n${stage1Error ? stage1Error.message : 'Lỗi kết xuất không xác định'}`);
}

// HÀM RETRY 1 SLIDE DUY NHẤT VỚI EXPONENTIAL BACKOFF (1s -> 3s -> 7s, tối đa 3 lần)
export async function retrySingleSlideRender(lessonId, slideId, slideNumber) {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    throw new Error(`Không tìm thấy bài học ${lessonId}`);
  }

  const slide = (lesson.slides || []).find(s => s.id === slideId || s.order_index === slideNumber - 1);
  const attempts = ((slide && slide.render_attempts) ? Number(slide.render_attempts) : 0) + 1;

  if (attempts > 3) {
    updateSlideRenderStatus(slideId, {
      render_status: 'failed',
      error_code: 'FAILED_PERMANENT',
      error_message: 'Đã vượt quá số lần thử lại tối đa (3 lần).',
      render_attempts: attempts
    });
    return {
      success: false,
      error: 'Đã vượt quá số lần thử lại tối đa (3 lần).',
      slide: (getLessonById(lessonId)?.slides || []).find(s => s.id === slideId)
    };
  }

  // Exponential backoff delay: Attempt 1 -> 1s, Attempt 2 -> 3s, Attempt 3 -> 7s
  const backoffDelays = [0, 1000, 3000, 7000];
  const delayMs = backoffDelays[attempts] || 1000;
  if (delayMs > 0) {
    await new Promise(res => setTimeout(res, delayMs));
  }

  const lessonDir = path.join(PRESENTATIONS_DIR, lessonId);
  const slidesDir = path.join(lessonDir, 'slides');
  const pdfPath = path.join(lessonDir, 'presentation.pdf');
  const pptxPath = path.join(lessonDir, 'original.pptx');

  const fileName = `slide_${String(slideNumber).padStart(2, '0')}.png`;
  const outputFilePath = path.join(slidesDir, fileName);

  try {
    // Nếu chưa có presentation.pdf, thử xuất lại từ original.pptx
    if (!fs.existsSync(pdfPath) && fs.existsSync(pptxPath)) {
      try {
        await renderPptxToPdf(pptxPath, pdfPath);
      } catch (e) {
        console.warn(`[Retry] Không thể tái tạo presentation.pdf:`, e.message);
      }
    }

    await renderSingleSlideFallback({
      pptxPath,
      pdfPath: fs.existsSync(pdfPath) ? pdfPath : null,
      slideNumber,
      outputFilePath
    });

    const val = validateImageFile(outputFilePath);
    if (!val.valid) {
      throw new Error(val.reason || 'Ảnh sau kết xuất không hợp lệ');
    }

    const imageUrl = `/uploads/presentations/${lessonId}/slides/${encodeURIComponent(fileName)}?t=${Date.now()}`;

    const updatedSlide = updateSlideRenderStatus(slideId, {
      render_status: 'ready',
      image_url: imageUrl,
      render_path: outputFilePath,
      slide_number: slideNumber,
      attempts: attempts,
      render_attempts: attempts,
      rendered_at: new Date().toISOString(),
      error_code: '',
      error_message: ''
    });

    // Nếu slide được retry là slide 1, cập nhật ngay thumbnail cho bài học
    if (Number(slideNumber) === 1) {
      updateLesson(lessonId, {
        thumbnail_url: imageUrl,
        thumbnail_path: outputFilePath
      });
    }

    logStageEvent({
      stage: RENDER_STAGES.PDF_PAGE_RENDER,
      lessonId,
      slideId,
      slideNumber,
      attempt: attempts,
      outputPath: outputFilePath,
      outputSize: val.sizeBytes,
      errorCode: 'OK'
    });

    const updatedLesson = getLessonById(lessonId);

    return {
      success: true,
      slide: updatedSlide,
      lessonStatus: updatedLesson?.render_status || 'ready'
    };
  } catch (err) {
    console.error(`[Retry] Lỗi khi thử lại render slide ${slideNumber} của bài ${lessonId}:`, err.message);
    const updatedSlide = updateSlideRenderStatus(slideId, {
      render_status: 'failed',
      error_code: attempts >= 3 ? 'FAILED_PERMANENT' : 'RENDER_FAILED',
      error_message: err.message,
      slide_number: slideNumber,
      attempts: attempts,
      render_attempts: attempts
    });

    logStageEvent({
      stage: RENDER_STAGES.PDF_PAGE_RENDER,
      lessonId,
      slideId,
      slideNumber,
      attempt: attempts,
      errorMessage: err.message,
      errorCode: attempts >= 3 ? 'FAILED_PERMANENT' : 'RENDER_FAILED'
    });

    const updatedLesson = getLessonById(lessonId);

    return {
      success: false,
      error: err.message,
      slide: updatedSlide,
      lessonStatus: updatedLesson?.render_status || 'failed'
    };
  }
}

// Xử lý upload file PPTX và trích xuất slide vào thư mục tạm thời
export async function processPptxUploadPreview({ originalName, buffer }) {
  initUploadDirectories();

  // Kiểm tra đuôi file
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== '.pptx') {
    throw new Error('Định dạng file không được hỗ trợ. Vui lòng chỉ tải lên file PowerPoint có phần mở rộng .pptx');
  }

  // Kiểm tra magic header của file ZIP/PPTX (PK\\x03\\x04)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
    throw new Error('File không hợp lệ hoặc đã bị hỏng (Không phải định dạng .pptx tiêu chuẩn).');
  }

  const tempId = `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const sessionDir = path.join(TEMP_DIR, tempId);
  const slidesDir = path.join(sessionDir, 'slides');
  const pptxPath = path.join(sessionDir, 'source.pptx');

  fs.mkdirSync(slidesDir, { recursive: true });
  fs.writeFileSync(pptxPath, buffer);

  try {
    const renderResult = await renderPptxMultiEngine(pptxPath, slidesDir);

    if (!renderResult.slides || renderResult.slides.length === 0) {
      throw new Error('File PowerPoint không chứa slide nào hoặc không thể kết xuất nội dung.');
    }

    // Gợi ý tên bài học: ưu tiên đọc từ slide 1, fallback qua tên file
    const slide1Title = extractSlide1Title(buffer, originalName);
    const fileTitle = extractTitleFromFileName(originalName);
    let suggestedTitle = slide1Title || fileTitle || path.basename(originalName, ext);

    const slides = renderResult.slides.map((s) => ({
      index: s.index,
      title: s.title || `Slide ${s.index + 1}`,
      fileName: s.fileName,
      imageUrl: `/uploads/temp/${tempId}/slides/${encodeURIComponent(s.fileName)}`,
      sizeBytes: s.sizeBytes
    }));

    return {
      tempId,
      originalFileName: originalName,
      fileSizeBytes: buffer.length,
      slideCount: slides.length,
      suggestedTitle,
      slides
    };
  } catch (err) {
    // Dọn dẹp thư mục tạm nếu gặp lỗi
    removeDirectorySafe(sessionDir);
    throw err;
  }
}

// Xác nhận lưu bài học đã import: Chuyển file từ temp sang thư mục chính thức
export async function commitImportedPptx(tempId, lessonId) {
  initUploadDirectories();

  const tempSessionDir = path.join(TEMP_DIR, tempId);
  if (!fs.existsSync(tempSessionDir)) {
    throw new Error('Phiên import tạm thời đã hết hạn hoặc không tồn tại. Vui lòng thử import lại.');
  }

  const targetLessonDir = path.join(PRESENTATIONS_DIR, lessonId);
  const targetSlidesDir = path.join(targetLessonDir, 'slides');

  // Đảm bảo thư mục đích tồn tại sạch sẽ
  removeDirectorySafe(targetLessonDir);
  fs.mkdirSync(targetSlidesDir, { recursive: true });

  // 1. Sao chép/Di chuyển file PowerPoint gốc
  const tempPptx = path.join(tempSessionDir, 'source.pptx');
  const targetPptx = path.join(targetLessonDir, 'original.pptx');
  if (fs.existsSync(tempPptx)) {
    fs.copyFileSync(tempPptx, targetPptx);
  }

  // 2. Sao chép các file slide PNG
  const tempSlidesDir = path.join(tempSessionDir, 'slides');
  const finalSlides = [];

  if (fs.existsSync(tempSlidesDir)) {
    const slideFiles = fs.readdirSync(tempSlidesDir);
    // Sắp xếp các file slide theo thứ tự Slide1, Slide2,... Slide14
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    slideFiles.forEach((f, idx) => {
      const srcFile = path.join(tempSlidesDir, f);
      const destFile = path.join(targetSlidesDir, f);
      fs.copyFileSync(srcFile, destFile);

      finalSlides.push({
        index: idx,
        title: `Slide ${idx + 1}`,
        fileName: f,
        imageUrl: `/uploads/presentations/${lessonId}/slides/${encodeURIComponent(f)}`
      });
    });
  }

  // 3. Xóa thư mục tạm thời
  removeDirectorySafe(tempSessionDir);

  const thumbnailUrl = finalSlides.length > 0 ? finalSlides[0].imageUrl : '';
  const relativeSourcePath = `/uploads/presentations/${lessonId}/original.pptx`;

  return {
    sourceFilePath: relativeSourcePath,
    thumbnailUrl,
    slideCount: finalSlides.length,
    slides: finalSlides
  };
}

// Hủy bỏ phiên import tạm thời
export function cancelImportSession(tempId) {
  if (!tempId) return;
  const safeId = path.basename(tempId);
  const tempSessionDir = path.join(TEMP_DIR, safeId);
  removeDirectorySafe(tempSessionDir);
}

// ====================================================
// TỐI ƯU HÓA: EXTRACTION NHANH + CACHING + BACKGROUND QUEUE
// ====================================================

// 1. Trích xuất metadata tối thiểu từ file PPTX bằng Node.js thuần (ZIP parser < 5ms)
export function extractPptxMinimalMetadata(buffer, originalName = '') {
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  let slideCount = 0;
  let slideFilesCount = 0;
  let appXmlBuffer = null;
  let coreXmlBuffer = null;
  let slide1XmlBuffer = null;

  try {
    // Tìm EOCD (End of Central Directory)
    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset !== -1) {
      const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
      const cdEntries = buffer.readUInt16LE(eocdOffset + 10);
      let pos = cdOffset;

      for (let i = 0; i < cdEntries; i++) {
        if (pos + 46 > buffer.length) break;
        if (buffer.readUInt32LE(pos) !== 0x02014b50) break;

        const method = buffer.readUInt16LE(pos + 10);
        const compSize = buffer.readUInt32LE(pos + 20);
        const nameLen = buffer.readUInt16LE(pos + 28);
        const extraLen = buffer.readUInt16LE(pos + 30);
        const commentLen = buffer.readUInt16LE(pos + 32);
        const localOffset = buffer.readUInt32LE(pos + 42);

        const filename = buffer.toString('utf8', pos + 46, pos + 46 + nameLen);

        if (filename === 'docProps/app.xml' || filename === 'docProps/core.xml' || filename === 'ppt/slides/slide1.xml') {
          if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
            const localNameLen = buffer.readUInt16LE(localOffset + 26);
            const localExtraLen = buffer.readUInt16LE(localOffset + 28);
            const dataStart = localOffset + 30 + localNameLen + localExtraLen;
            const compData = buffer.subarray(dataStart, dataStart + compSize);
            
            let decompressed = null;
            if (method === 8) {
              decompressed = zlib.inflateRawSync(compData);
            } else if (method === 0) {
              decompressed = compData;
            }

            if (filename === 'docProps/app.xml') {
              appXmlBuffer = decompressed;
            } else if (filename === 'docProps/core.xml') {
              coreXmlBuffer = decompressed;
            } else if (filename === 'ppt/slides/slide1.xml') {
              slide1XmlBuffer = decompressed;
            }
          }
        } else if (/^ppt\/slides\/slide[0-9]+\.xml$/i.test(filename)) {
          slideFilesCount++;
        }

        pos += 46 + nameLen + extraLen + commentLen;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc ZIP metadata PPTX:', err.message);
  }

  // Phân tích số slide từ docProps/app.xml
  if (appXmlBuffer) {
    const xml = appXmlBuffer.toString('utf8');
    const m = xml.match(/<Slides>(\d+)<\/Slides>/i);
    if (m) slideCount = parseInt(m[1], 10);
  }
  if (!slideCount && slideFilesCount > 0) {
    slideCount = slideFilesCount;
  }
  if (!slideCount) {
    slideCount = 1; // Mặc định tối thiểu 1 slide
  }

  // Phân tích tiêu đề bài: ưu tiên slide 1 -> fallback tên file -> core.xml
  let suggestedTitle = '';
  if (slide1XmlBuffer) {
    suggestedTitle = extractTitleFromSlide1Xml(slide1XmlBuffer.toString('utf8')) || '';
  }
  if (!suggestedTitle && originalName) {
    suggestedTitle = extractTitleFromFileName(originalName);
  }

  if (!suggestedTitle || /^(presentation|slide|document|untitled|bai_giang)$/i.test(suggestedTitle)) {
    if (coreXmlBuffer) {
      const xml = coreXmlBuffer.toString('utf8');
      const titleMatch = xml.match(/<dc:title>([^<]+)<\/dc:title>/i);
      if (titleMatch && titleMatch[1].trim()) {
        suggestedTitle = titleMatch[1].trim();
      }
    }
  }
  if (!suggestedTitle) {
    suggestedTitle = path.basename(originalName, path.extname(originalName)) || 'Bài giảng PowerPoint';
  }

  const detectedGrade = detectGradeFromFileName(originalName, 3);

  return {
    fileHash,
    slideCount,
    suggestedTitle: suggestedTitle || 'Bài giảng PowerPoint',
    detectedGrade,
    fileSizeBytes: buffer.length
  };
}

/**
 * Trích xuất tiêu đề bài học từ slide 1 của buffer PPTX
 */
export function extractSlide1Title(buffer, originalName = '') {
  try {
    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= 0; i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) return null;

    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
    const cdEntries = buffer.readUInt16LE(eocdOffset + 10);
    let pos = cdOffset;

    for (let i = 0; i < cdEntries; i++) {
      if (pos + 46 > buffer.length) break;
      if (buffer.readUInt32LE(pos) !== 0x02014b50) break;

      const compSize = buffer.readUInt32LE(pos + 20);
      const nameLen = buffer.readUInt16LE(pos + 28);
      const extraLen = buffer.readUInt16LE(pos + 30);
      const commentLen = buffer.readUInt16LE(pos + 32);
      const localOffset = buffer.readUInt32LE(pos + 42);
      const filename = buffer.toString('utf8', pos + 46, pos + 46 + nameLen);

      if (filename === 'ppt/slides/slide1.xml') {
        const localNameLen = buffer.readUInt16LE(localOffset + 26);
        const localExtraLen = buffer.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const compData = buffer.subarray(dataStart, dataStart + compSize);
        const method = buffer.readUInt16LE(pos + 10);
        const decompressed = method === 8 ? zlib.inflateRawSync(compData) : compData;
        return extractTitleFromSlide1Xml(decompressed.toString('utf8'));
      }
      pos += 46 + nameLen + extraLen + commentLen;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function detectGradeFromFileName(fileName = '', fallbackGrade = 3) {
  if (!fileName) return Number(fallbackGrade) || 3;
  const fn = fileName.toUpperCase();

  for (let g = 1; g <= 5; g++) {
    const tinHocPattern = new RegExp(`(?:TIN\\s*HỌC|TIN\\s*HOC|TINHOC|TIN|TH)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (tinHocPattern.test(fn)) return g;

    const lopPattern = new RegExp(`(?:LỚP|LOP|LP)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (lopPattern.test(fn)) return g;

    const khoiPattern = new RegExp(`(?:KHỐI|KHOI|KH)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (khoiPattern.test(fn)) return g;

    const lqthPattern = new RegExp(`LQTH[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (lqthPattern.test(fn)) return g;

    const kPattern = new RegExp(`(^|[^a-zA-Z0-9])K[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (kPattern.test(fn)) return g;
  }

  return Number(fallbackGrade) || 3;
}

// 2. Quản lý Cache Render dựa trên SHA-256
export function checkRenderCache(fileHash) {
  if (!fileHash) return null;
  initUploadDirectories();

  const cacheDir = path.join(CACHE_DIR, fileHash);
  const metaFile = path.join(cacheDir, 'meta.json');
  const slidesDir = path.join(cacheDir, 'slides');

  if (fs.existsSync(metaFile) && fs.existsSync(slidesDir)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      const files = fs.readdirSync(slidesDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
      if (files.length > 0) {
        return {
          isCached: true,
          slideCount: meta.slideCount || files.length,
          files
        };
      }
    } catch {}
  }
  return null;
}

export function saveRenderCache(fileHash, slideCount, sourceSlidesDir) {
  if (!fileHash || !fs.existsSync(sourceSlidesDir)) return;
  initUploadDirectories();

  const cacheDir = path.join(CACHE_DIR, fileHash);
  const cacheSlidesDir = path.join(cacheDir, 'slides');

  try {
    if (!fs.existsSync(cacheSlidesDir)) {
      fs.mkdirSync(cacheSlidesDir, { recursive: true });
    }

    const files = fs.readdirSync(sourceSlidesDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
    files.forEach(f => {
      const src = path.join(sourceSlidesDir, f);
      const dest = path.join(cacheSlidesDir, f);
      fs.copyFileSync(src, dest);
    });

    const sourcePdf = path.join(path.dirname(sourceSlidesDir), 'presentation.pdf');
    if (fs.existsSync(sourcePdf)) {
      fs.copyFileSync(sourcePdf, path.join(cacheDir, 'presentation.pdf'));
    }

    const meta = {
      fileHash,
      slideCount: files.length,
      createdAt: Date.now(),
      status: 'ready'
    };
    fs.writeFileSync(path.join(cacheDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[PPTX Cache] Lỗi lưu cache hash ${fileHash}:`, err.message);
  }
}

export function applyCacheToLesson(fileHash, lessonId, targetSlidesDir) {
  const cacheDir = path.join(CACHE_DIR, fileHash);
  const cacheSlidesDir = path.join(cacheDir, 'slides');

  if (!fs.existsSync(cacheSlidesDir)) return [];
  if (!fs.existsSync(targetSlidesDir)) fs.mkdirSync(targetSlidesDir, { recursive: true });

  const cachePdf = path.join(cacheDir, 'presentation.pdf');
  const targetPdf = path.join(path.dirname(targetSlidesDir), 'presentation.pdf');
  if (fs.existsSync(cachePdf) && !fs.existsSync(targetPdf)) {
    try {
      fs.copyFileSync(cachePdf, targetPdf);
    } catch {}
  }

  const files = fs.readdirSync(cacheSlidesDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  files.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  const slides = [];
  files.forEach((f, idx) => {
    const src = path.join(cacheSlidesDir, f);
    const dest = path.join(targetSlidesDir, f);
    fs.copyFileSync(src, dest);

    slides.push({
      id: `slide_${lessonId}_${idx + 1}`,
      lesson_id: lessonId,
      order_index: idx,
      type: 'IMPORTED_SLIDE',
      title: `Slide ${idx + 1}`,
      layout: 'FULL_IMAGE',
      image_url: `/uploads/presentations/${lessonId}/slides/${encodeURIComponent(f)}`,
      content: '',
      teacher_notes: '',
      render_status: 'ready',
      error_code: '',
      error_message: '',
      render_attempts: 1
    });
  });

  return slides;
}

export const MAX_CONCURRENT_PPTX_RENDER = parseInt(process.env.MAX_CONCURRENT_PPTX_RENDER || '2', 10);

// 3. Hàng đợi Render Slide Nền (Background Worker Queue có giới hạn Concurrency & Deduplication)
class PptxBackgroundQueue {
  constructor(maxConcurrency = MAX_CONCURRENT_PPTX_RENDER) {
    this.queue = [];
    this.runningCount = 0;
    this.maxConcurrency = maxConcurrency;
    this.runningLessonIds = new Set();
    this.queuedLessonIds = new Set();
  }

  isLessonActive(lessonId) {
    return this.runningLessonIds.has(lessonId) || this.queuedLessonIds.has(lessonId);
  }

  enqueue(task) {
    // task: { lessonId, fileHash, pptxPath, targetSlidesDir, type = 'full' | 'thumbnail' }
    if (!task || !task.lessonId) return;

    if (this.runningLessonIds.has(task.lessonId) || this.queuedLessonIds.has(task.lessonId)) {
      console.log(`[PPTX Queue] Lesson ${task.lessonId} đã có trong hàng đợi hoặc đang chạy, bỏ qua enqueue trùng.`);
      return;
    }

    this.queuedLessonIds.add(task.lessonId);
    this.queue.push(task);
    console.log(`[PPTX Queue] Đã nhận task ${task.type || 'full'} cho lesson ${task.lessonId} (Đang chạy: ${this.runningCount}/${this.maxConcurrency}, Hàng đợi: ${this.queue.length})`);
    this.dispatch();
  }

  dispatch() {
    while (this.runningCount < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      this.queuedLessonIds.delete(task.lessonId);
      this.runningLessonIds.add(task.lessonId);
      this.runningCount++;

      this.executeTask(task).finally(() => {
        this.runningLessonIds.delete(task.lessonId);
        this.runningCount--;
        this.dispatch();
      });
    }
  }

  async executeTask(task) {
    if (task.type === 'thumbnail') {
      return this.processThumbnailOnly(task);
    }
    return this.processFullRender(task);
  }

  async processThumbnailOnly(task) {
    const tStart = Date.now();
    try {
      console.log(`[PPTX Queue] Bắt đầu render thumbnail cho lesson ${task.lessonId}...`);
      const targetPdfPath = path.join(PRESENTATIONS_DIR, task.lessonId, 'presentation.pdf');
      const lessonDir = path.join(PRESENTATIONS_DIR, task.lessonId);
      const slidesDir = task.targetSlidesDir || path.join(lessonDir, 'slides');
      fs.mkdirSync(slidesDir, { recursive: true });

      const outputFilePath = path.join(slidesDir, 'slide_01.png');

      // Nếu chưa có presentation.pdf, xuất PPTX -> PDF 1 lần duy nhất
      if (!fs.existsSync(targetPdfPath) || fs.statSync(targetPdfPath).size <= 1024) {
        if (task.pptxPath && fs.existsSync(task.pptxPath)) {
          await renderPptxToPdf(task.pptxPath, targetPdfPath, 60000, { lessonId: task.lessonId, slideNumber: 1 });
        }
      }

      await renderSingleSlideFallback({
        pptxPath: task.pptxPath,
        pdfPath: fs.existsSync(targetPdfPath) ? targetPdfPath : null,
        slideNumber: 1,
        outputFilePath
      });

      const val = validateImageFile(outputFilePath);
      if (!val.valid) {
        throw new Error(val.reason || 'Ảnh thumbnail sau khi kết xuất không hợp lệ');
      }

      const imageUrl = `/uploads/presentations/${task.lessonId}/slides/slide_01.png?t=${Date.now()}`;

      // Cập nhật slide 1 trong DB
      const lesson = getLessonById(task.lessonId);
      const slide1 = (lesson?.slides || []).find(s => s.order_index === 0);
      if (slide1) {
        updateSlideRenderStatus(slide1.id, {
          render_status: 'ready',
          image_url: imageUrl,
          render_path: outputFilePath,
          slide_number: 1,
          rendered_at: new Date().toISOString()
        });
      }

      updateLesson(task.lessonId, {
        thumbnail_url: imageUrl,
        thumbnail_path: outputFilePath
      });

      syncLessonOverallRenderStatus(task.lessonId);

      logStageEvent({
        stage: RENDER_STAGES.THUMBNAIL_RENDER,
        lessonId: task.lessonId,
        slideNumber: 1,
        duration: Date.now() - tStart,
        outputPath: outputFilePath,
        outputSize: val.sizeBytes,
        errorCode: 'OK'
      });

      console.log(`[PPTX Queue] ✅ Hoàn tất render thumbnail cho lesson ${task.lessonId}`);
    } catch (err) {
      console.warn(`[PPTX Queue] ⚠️ Không thể tạo thumbnail cho lesson ${task.lessonId}:`, err.message);
      logStageEvent({
        stage: RENDER_STAGES.THUMBNAIL_RENDER,
        lessonId: task.lessonId,
        slideNumber: 1,
        duration: Date.now() - tStart,
        errorMessage: err.message,
        errorCode: 'THUMBNAIL_RENDER_FAILED'
      });

      // Tuyệt đối không đánh dấu import thất bại! Giữ import_status = 'IMPORTED'
      try {
        updateLesson(task.lessonId, {
          import_status: 'IMPORTED'
        });
        syncLessonOverallRenderStatus(task.lessonId);
      } catch (e) {}
    }
  }

  async processFullRender(task) {
    const tStart = Date.now();
    try {
      console.log(`[PPTX Queue] Bắt đầu render background cho lesson ${task.lessonId} (hash: ${(task.fileHash || '').slice(0, 8)})...`);
      const targetPdfPath = path.join(PRESENTATIONS_DIR, task.lessonId, 'presentation.pdf');
      const renderRes = await renderPptxMultiEngine(task.pptxPath, task.targetSlidesDir, { pdfPath: targetPdfPath });

      const returnedSlides = renderRes.slides || [];
      const slides = returnedSlides.map((s, idx) => {
        const outPath = s.filePath || path.join(task.targetSlidesDir, s.fileName);
        const val = validateImageFile(outPath);
        const isOk = (s.status === 'completed' || s.status === 'ready') && val.valid;
        const fn = s.fileName || `slide_${String(idx + 1).padStart(2, '0')}.png`;

        return {
          id: `slide_${task.lessonId}_${idx + 1}`,
          lesson_id: task.lessonId,
          order_index: idx,
          slide_number: idx + 1,
          type: 'IMPORTED_SLIDE',
          title: s.title || `Slide ${idx + 1}`,
          layout: 'FULL_IMAGE',
          image_url: isOk ? `/uploads/presentations/${task.lessonId}/slides/${encodeURIComponent(fn)}` : '',
          render_path: isOk ? outPath : '',
          content: '',
          teacher_notes: '',
          render_status: isOk ? 'ready' : 'failed',
          error_code: isOk ? '' : 'RENDER_FAILED',
          error_message: isOk ? '' : (s.error || val.reason || 'Không kết xuất được hình ảnh'),
          render_attempts: 1,
          attempts: 1,
          rendered_at: isOk ? new Date().toISOString() : ''
        };
      });

      const readyCount = slides.filter(s => s.render_status === 'ready').length;
      const failedCount = slides.filter(s => s.render_status === 'failed').length;
      
      let overallStatus = 'ready';
      if (failedCount === slides.length && slides.length > 0) {
        overallStatus = 'failed';
      } else if (failedCount > 0) {
        overallStatus = 'partial';
      } else {
        overallStatus = 'ready';
      }

      const firstReady = slides.find(s => s.render_status === 'ready');
      const thumbnailUrl = firstReady ? firstReady.image_url : '';
      const thumbnailPath = firstReady ? firstReady.render_path : '';

      // Lưu kết quả vào SHA-256 cache nếu có ít nhất 1 slide thành công
      if (readyCount > 0 && task.fileHash) {
        saveRenderCache(task.fileHash, slides.length, task.targetSlidesDir);
      }

      // Cập nhật database: Giữ import_status = 'IMPORTED'
      updateLesson(task.lessonId, {
        import_status: 'IMPORTED',
        render_status: overallStatus,
        thumbnail_url: thumbnailUrl,
        thumbnail_path: thumbnailPath,
        slide_count: slides.length,
        total_slides: slides.length,
        rendered_slides: readyCount,
        failed_slides: failedCount,
        render_progress: slides.length > 0 ? Math.round((readyCount / slides.length) * 100) : 0,
        slides
      });

      logStageEvent({
        stage: RENDER_STAGES.FILE_STORAGE,
        lessonId: task.lessonId,
        duration: Date.now() - tStart,
        outputSize: readyCount,
        errorCode: overallStatus === 'failed' ? 'FAILED' : 'OK'
      });

      console.log(`[PPTX Queue] Hoàn tất render background cho lesson ${task.lessonId} (Tổng: ${slides.length}, Sẵn sàng: ${readyCount}, Lỗi: ${failedCount}, Trạng thái: ${overallStatus})`);

      // Tự động kích hoạt auto-retry nền nếu có slide bị lỗi (Requirement 5)
      if (failedCount > 0) {
        const failedSlides = slides.filter(s => s.render_status === 'failed');
        console.log(`[PPTX Queue] Bài ${task.lessonId} có ${failedSlides.length} slide lỗi, kích hoạt auto-retry nền với backoff...`);
        (async () => {
          for (const fs of failedSlides) {
            try {
              console.log(`[PPTX Auto-Retry] Đang tự động thử lại slide ${fs.order_index + 1}...`);
              await retrySingleSlideRender(task.lessonId, fs.id, fs.order_index + 1);
            } catch (retryErr) {
              console.warn(`[PPTX Auto-Retry] Thử lại slide ${fs.order_index + 1} không thành công:`, retryErr.message);
            }
          }
        })();
      }

    } catch (err) {
      console.error(`[PPTX Queue] ❌ Lỗi render background cho lesson ${task.lessonId}:`, err.message);
      try {
        // QUAN TRỌNG: Không để việc render thất bại làm import thất bại!
        // Giữ import_status = 'IMPORTED', chỉ render_status = 'failed'
        updateLesson(task.lessonId, {
          import_status: 'IMPORTED',
          render_status: 'failed'
        });
        syncLessonOverallRenderStatus(task.lessonId);
      } catch (dbErr) {
        console.error('[PPTX Queue] Lỗi cập nhật status failed:', dbErr.message);
      }
    }
  }
}

export const pptxBackgroundQueue = new PptxBackgroundQueue();

// Đảm bảo bài học có thumbnail xem trước (Requirement 2)
export async function ensureLessonThumbnail(lessonId) {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    throw new Error(`Không tìm thấy bài học ${lessonId}`);
  }

  // 1. Nếu đã có thumbnail_url và file ảnh thực tế hợp lệ trên đĩa
  if (lesson.thumbnail_url && lesson.thumbnail_url.trim() !== '') {
    const rel = lesson.thumbnail_url.split('?')[0];
    const diskPath = path.resolve(process.cwd(), rel.startsWith('/') ? rel.slice(1) : rel);
    if (validateImageFile(diskPath).valid) {
      return { success: true, thumbnailUrl: lesson.thumbnail_url };
    }
  }

  const lessonDir = path.join(PRESENTATIONS_DIR, lessonId);
  const slidesDir = path.join(lessonDir, 'slides');
  const pptxPath = path.join(lessonDir, 'original.pptx');

  // 2. Kiểm tra xem trên đĩa đã có ảnh slide 1 chưa (slide_01.png hoặc Slide1.PNG)
  if (fs.existsSync(slidesDir)) {
    const files = fs.readdirSync(slidesDir);
    const slide1File = files.find(f => /^slide_?0?1\.(png|jpe?g|webp)$/i.test(f));
    if (slide1File) {
      const fullPath = path.join(slidesDir, slide1File);
      if (validateImageFile(fullPath).valid) {
        const thumbUrl = `/uploads/presentations/${lessonId}/slides/${encodeURIComponent(slide1File)}?t=${Date.now()}`;
        updateLesson(lessonId, {
          thumbnail_url: thumbUrl,
          thumbnail_path: fullPath
        });
        const slide1 = (lesson.slides || []).find(s => s.order_index === 0);
        if (slide1) {
          updateSlideRenderStatus(slide1.id, {
            image_url: thumbUrl,
            render_status: 'ready',
            render_path: fullPath,
            slide_number: 1
          });
        }
        syncLessonOverallRenderStatus(lessonId);
        return { success: true, thumbnailUrl: thumbUrl };
      }
    }
  }

  // 3. Nếu chưa có ảnh slide 1, đưa vào hàng đợi render thumbnail
  pptxBackgroundQueue.enqueue({
    lessonId,
    fileHash: lesson.file_hash || '',
    pptxPath,
    targetSlidesDir: slidesDir,
    type: 'thumbnail'
  });

  return { success: true, queued: true, message: 'Đã đưa bài học vào hàng đợi tạo thumbnail' };
}

// 4. Fast Import Pipeline (Giai đoạn A: Phản hồi ngay < 30ms, kiểm tra trùng lặp trước khi ghi đĩa / render)
export async function fastImportPptx({ originalName, buffer, lessonData = {} }) {
  initUploadDirectories();

  const ext = path.extname(originalName).toLowerCase();
  if (ext !== '.pptx') {
    throw new Error('Định dạng file không được hỗ trợ. Vui lòng chỉ tải lên file có phần mở rộng .pptx');
  }

  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
    throw new Error('File không hợp lệ hoặc bị hỏng (Không phải định dạng .pptx tiêu chuẩn).');
  }

  // 1. Trích xuất metadata và content fingerprint siêu tốc trong ~3ms
  const meta = extractPptxContentFingerprint(buffer, originalName);

  // 2. KIỂM TRA TRÙNG LẶP HOÀN TOÀN (SHA-256) TRƯỚC KHI GHI ĐĨA HOẶC RENDER
  const existingExact = getLessonByFileHash(meta.fileHash);
  if (existingExact && !lessonData.allowDuplicate) {
    return {
      success: false,
      isDuplicate: true,
      status: SIMILARITY_STATUS.EXACT_DUPLICATE,
      similarityScore: 100,
      message: `Bài giảng đã tồn tại trong thư viện (Trùng file hoàn toàn với "${existingExact.title || existingExact.source_file_name}")`,
      matchedLesson: {
        id: existingExact.id,
        title: existingExact.title,
        source_file_name: existingExact.source_file_name || existingExact.source_filename,
        slide_count: existingExact.slide_count,
        grade: existingExact.grade,
        thumbnail_url: existingExact.thumbnail_url,
        created_at: existingExact.created_at
      }
    };
  }

  // Xác định trạng thái trùng / gần trùng
  let similarityStatus = lessonData.similarity_status || (existingExact ? SIMILARITY_STATUS.EXACT_DUPLICATE : SIMILARITY_STATUS.UNIQUE);
  let similarityScore = lessonData.similarity_score !== undefined ? Number(lessonData.similarity_score) : (existingExact ? 100 : 0);
  let duplicateOfId = lessonData.duplicate_of_id || (existingExact ? existingExact.id : null);

  if (!existingExact && similarityStatus === SIMILARITY_STATUS.UNIQUE) {
    const allLessons = getAllLessons();
    for (const cand of allLessons) {
      const { similarityScore: score } = calculateSimilarity(meta, cand);
      if (score >= DUPLICATE_THRESHOLDS.NEAR_DUPLICATE_LIKELY && score > similarityScore) {
        similarityScore = score;
        similarityStatus = SIMILARITY_STATUS.NEAR_DUPLICATE;
        duplicateOfId = cand.id;
      }
    }
  }

  const lessonId = lessonData.id || `les_pptx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  const lessonDir = path.join(PRESENTATIONS_DIR, lessonId);
  const slidesDir = path.join(lessonDir, 'slides');
  fs.mkdirSync(slidesDir, { recursive: true });

  // 3. Lưu file gốc .pptx
  const pptxPath = path.join(lessonDir, 'original.pptx');
  fs.writeFileSync(pptxPath, buffer);
  const sourceFilePath = `/uploads/presentations/${lessonId}/original.pptx`;

  // 4. Kiểm tra SHA-256 Cache (Requirement 10)
  const cached = checkRenderCache(meta.fileHash);

  if (cached && cached.isCached) {
    // CACHE HIT: Sao chép ảnh từ cache trong ~10ms, trạng thái ready ngay lập tức!
    const slides = applyCacheToLesson(meta.fileHash, lessonId, slidesDir);
    const thumbnailUrl = slides.length > 0 ? slides[0].image_url : '';

    const created = createLesson({
      id: lessonId,
      title: lessonData.title || meta.suggestedTitle,
      grade: Number(lessonData.grade) || meta.detectedGrade || 3,
      subject: lessonData.subject || 'Tin Học',
      topic: lessonData.topic || 'Chung',
      duration_minutes: Number(lessonData.durationMinutes || lessonData.duration_minutes) || 35,
      objectives: lessonData.description || lessonData.objectives || '',
      keywords: `PowerPoint, ${lessonData.topic || ''}`,
      type: 'imported',
      import_status: 'IMPORTED',
      source_file_name: originalName,
      source_filename: originalName,
      source_file_size: meta.fileSizeBytes,
      source_file_path: sourceFilePath,
      thumbnail_url: thumbnailUrl,
      slide_count: slides.length,
      total_slides: slides.length,
      rendered_slides: slides.length,
      failed_slides: 0,
      render_progress: 100,
      render_status: 'ready',
      file_hash: meta.fileHash,
      similarity_status: similarityStatus,
      similarity_score: similarityScore,
      duplicate_of_id: duplicateOfId,
      content_fingerprint: meta.contentFingerprint,
      slides
    });

    return {
      success: true,
      lesson: created,
      isCached: true
    };
  }

  // CACHE MISS: Tạo bài học với import_status = 'IMPORTED', render_status = 'processing'
  // Tạo placeholder slides với render_status = 'pending'
  const placeholderSlides = Array.from({ length: meta.slideCount }, (_, idx) => ({
    id: `slide_${lessonId}_${idx + 1}`,
    lesson_id: lessonId,
    order_index: idx,
    slide_number: idx + 1,
    type: 'IMPORTED_SLIDE',
    title: `Slide ${idx + 1}`,
    layout: 'FULL_IMAGE',
    image_url: '',
    render_path: '',
    thumbnail_path: '',
    content: '',
    teacher_notes: '',
    render_status: 'pending',
    error_code: '',
    error_message: '',
    render_attempts: 0,
    attempts: 0,
    rendered_at: ''
  }));

  const created = createLesson({
    id: lessonId,
    title: lessonData.title || meta.suggestedTitle,
    grade: Number(lessonData.grade) || meta.detectedGrade || 3,
    subject: lessonData.subject || 'Tin Học',
    topic: lessonData.topic || 'Chung',
    duration_minutes: Number(lessonData.durationMinutes || lessonData.duration_minutes) || 35,
    objectives: lessonData.description || lessonData.objectives || '',
    keywords: `PowerPoint, ${lessonData.topic || ''}`,
    type: 'imported',
    import_status: 'IMPORTED',
    source_file_name: originalName,
    source_filename: originalName,
    source_file_size: meta.fileSizeBytes,
    source_file_path: sourceFilePath,
    thumbnail_url: '',
    thumbnail_path: '',
    slide_count: meta.slideCount,
    total_slides: meta.slideCount,
    rendered_slides: 0,
    failed_slides: 0,
    render_progress: 0,
    render_status: 'processing',
    file_hash: meta.fileHash,
    similarity_status: similarityStatus,
    similarity_score: similarityScore,
    duplicate_of_id: duplicateOfId,
    content_fingerprint: meta.contentFingerprint,
    slides: placeholderSlides
  });

  // Đưa việc render vào hàng đợi background (không chặn HTTP response!)
  pptxBackgroundQueue.enqueue({
    lessonId,
    fileHash: meta.fileHash,
    pptxPath,
    targetSlidesDir: slidesDir,
    type: 'full'
  });

  return {
    success: true,
    lesson: created,
    isCached: false
  };
}

// 5. Tự động phục hồi & đối chiếu bài học cũ từ ổ đĩa (Self-Healing Reconciliation)
export function reconcileImportedLessons() {
  setImmediate(() => {
    try {
      const lessons = getAllLessons();
      const importedLessons = lessons.filter(l => l.type === 'imported');
      let healedCount = 0;

      for (const les of importedLessons) {
        const lessonDir = path.join(PRESENTATIONS_DIR, les.id);
        const slidesDir = path.join(lessonDir, 'slides');
        if (!fs.existsSync(slidesDir)) continue;

        const files = fs.readdirSync(slidesDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
        if (files.length === 0) {
          // Nếu bài học chưa có thumbnail, thử kích hoạt tạo thumbnail
          if (!les.thumbnail_url || les.thumbnail_url.trim() === '') {
            ensureLessonThumbnail(les.id).catch(() => {});
          }
          continue;
        }

        let needsUpdate = false;
        const currentSlides = (getLessonById(les.id)?.slides || []);
        
        for (const s of currentSlides) {
          const slideNum = s.slide_number || (s.order_index + 1);
          if (!s.image_url || s.image_url.trim() === '' || s.render_status === 'failed') {
            const matchedFile = files.find(f => {
              const n = parseInt(f.replace(/\D/g, ''), 10);
              return n === slideNum;
            });
            if (matchedFile) {
              const fullPath = path.join(slidesDir, matchedFile);
              if (validateImageFile(fullPath).valid) {
                const imgUrl = `/uploads/presentations/${les.id}/slides/${encodeURIComponent(matchedFile)}?t=${Date.now()}`;
                updateSlideRenderStatus(s.id, {
                  image_url: imgUrl,
                  render_status: 'ready',
                  render_path: fullPath,
                  slide_number: slideNum,
                  error_code: '',
                  error_message: ''
                });
                needsUpdate = true;
              }
            }
          }
        }

        // Kiểm tra thumbnail_url
        if (!les.thumbnail_url || les.thumbnail_url.trim() === '') {
          const slide1File = files.find(f => {
            const n = parseInt(f.replace(/\D/g, ''), 10);
            return n === 1;
          });
          if (slide1File) {
            const fullPath = path.join(slidesDir, slide1File);
            if (validateImageFile(fullPath).valid) {
              const thumbUrl = `/uploads/presentations/${les.id}/slides/${encodeURIComponent(slide1File)}?t=${Date.now()}`;
              updateLesson(les.id, {
                thumbnail_url: thumbUrl,
                thumbnail_path: fullPath
              });
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate || les.render_status === 'failed') {
          syncLessonOverallRenderStatus(les.id);
          healedCount++;
        }
      }

      if (healedCount > 0) {
        console.log(`[PPTX Reconcile] Đã tự động phục hồi và đồng bộ ${healedCount} bài học từ file ảnh trên ổ đĩa.`);
      }
    } catch (err) {
      console.warn('[PPTX Reconcile] Lỗi trong quá trình tự động đối chiếu:', err.message);
    }
  });
}

// 6. Tự động bù thông tin bài học cũ (Background Backfill, không chặn luồng chính)
export function backfillOldLessonsMetadata() {
  setImmediate(() => {
    try {
      const lessons = getAllLessons();
      const needBackfill = lessons.filter(l => 
        l.type === 'imported' && 
        (!l.source_file_size || !l.content_fingerprint || !l.file_hash)
      );

      if (needBackfill.length === 0) return;
      console.log(`[PPTX Backfill] Kiểm tra thấy ${needBackfill.length} bài học cũ cần cập nhật metadata/hash...`);

      for (const les of needBackfill) {
        const pptxDiskPath = path.join(PRESENTATIONS_DIR, les.id, 'original.pptx');
        if (fs.existsSync(pptxDiskPath)) {
          try {
            const buf = fs.readFileSync(pptxDiskPath);
            const meta = extractPptxContentFingerprint(buf, les.source_file_name || les.title);
            updateLesson(les.id, {
              file_hash: meta.fileHash,
              source_file_size: meta.fileSizeBytes,
              source_filename: les.source_file_name || les.title,
              content_fingerprint: meta.contentFingerprint,
              slide_count: les.slide_count || meta.slideCount
            });
          } catch (readErr) {
            console.warn(`[PPTX Backfill] Không thể đọc file bài ${les.id}:`, readErr.message);
          }
        }
      }
      console.log(`[PPTX Backfill] Hoàn tất cập nhật metadata cho các bài học cũ.`);
    } catch (err) {
      console.warn('[PPTX Backfill] Lỗi khi chạy backfill:', err.message);
    }
  });
}

// Khởi chạy backfill và self-healing nhẹ nhàng trong nền khi nạp module
backfillOldLessonsMetadata();
reconcileImportedLessons();


