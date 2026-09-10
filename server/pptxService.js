import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { createLesson, updateLesson } from './db.js';

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

// Gọi script PowerShell để render các slide PowerPoint qua COM Object (Windows)
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
      '-PptxPath', pptxPath,
      '-OutputDir', outputDir
    ];

    const child = spawn('powershell.exe', args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';
    let timer = null;

    timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {}
      reject(new Error('Quá thời gian xử lý file PowerPoint (Timeout 60s).'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf-8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Không thể khởi chạy PowerShell để xử lý PowerPoint: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const trimmed = stdoutData.trim();
        if (!trimmed) {
          throw new Error(stderrData || `Tiến trình kết xuất PowerPoint kết thúc với mã lỗi ${code}`);
        }

        // Tìm chuỗi JSON trong output
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error(`Đầu ra từ tiến trình không hợp lệ: ${trimmed}`);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.success) {
          throw new Error(parsed.error || 'Xử lý file PowerPoint thất bại.');
        }

        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Lỗi phân tích kết quả render PowerPoint: ${parseErr.message}`));
      }
    });
  });
}

// Gọi script Python + LibreOffice + PyMuPDF fallback
export function renderPptxWithLibreOffice(pptxPath, outputDir, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(pptxPath)) {
      return reject(new Error(`File PowerPoint không tồn tại: ${pptxPath}`));
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const child = spawn(pythonCmd, [FALLBACK_SCRIPT, pptxPath, outputDir], {
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
        if (!jsonMatch) {
          throw new Error(stderrData || `Đầu ra fallback không hợp lệ (mã ${code})`);
        }
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.success) {
          throw new Error(parsed.error || 'Render qua LibreOffice thất bại.');
        }
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Lỗi kết xuất LibreOffice: ${parseErr.message}`));
      }
    });
  });
}

// Bộ kết xuất đa tầng (Multi-Engine Renderer)
export async function renderPptxMultiEngine(pptxPath, outputDir) {
  let primaryError = null;

  // 1. Nếu trên Windows, thử PowerPoint COM trước
  if (process.platform === 'win32') {
    try {
      const res = await renderPptxWithPowerPoint(pptxPath, outputDir);
      if (res && res.success && res.slides && res.slides.length > 0) {
        return res;
      }
    } catch (err) {
      primaryError = err;
      console.warn('PowerPoint COM render không thành công, chuyển sang kiểm tra LibreOffice fallback:', err.message);
    }
  }

  // 2. Thử fallback LibreOffice + PyMuPDF
  try {
    const resFallback = await renderPptxWithLibreOffice(pptxPath, outputDir);
    if (resFallback && resFallback.success && resFallback.slides && resFallback.slides.length > 0) {
      return resFallback;
    }
  } catch (errFallback) {
    console.warn('LibreOffice fallback không thành công:', errFallback.message);
    const combinedMsg = primaryError 
      ? `Không thể kết xuất slide PowerPoint:\n- Thử PowerPoint COM: ${primaryError.message}\n- Thử LibreOffice: ${errFallback.message}`
      : `Không thể kết xuất slide PowerPoint: ${errFallback.message}`;
    throw new Error(combinedMsg);
  }

  throw new Error(primaryError ? primaryError.message : 'Không thể kết xuất các slide từ file PowerPoint.');
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

    // Gợi ý tên bài học từ tên file (bỏ đuôi .pptx, bỏ các tiền tố KHBD_ nếu có)
    let suggestedTitle = path.basename(originalName, ext)
      .replace(/^KHBD[_-]/i, '')
      .replace(/^[A-Z0-9]+[_-]/i, '')
      .trim();

    if (!suggestedTitle) suggestedTitle = path.basename(originalName, ext);

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

        if (filename === 'docProps/app.xml' || filename === 'docProps/core.xml') {
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
            } else {
              coreXmlBuffer = decompressed;
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

  // Phân tích tiêu đề bài từ tên file hoặc core.xml
  let cleanName = '';
  if (originalName) {
    const ext = path.extname(originalName);
    cleanName = path.basename(originalName, ext)
      .replace(/^KHBD[_-]/i, '')
      .replace(/^[A-Z0-9]+[_-]/i, '')
      .trim();
    if (!cleanName) cleanName = path.basename(originalName, ext);
  }

  let suggestedTitle = cleanName;
  if (!suggestedTitle || /^(presentation|slide|document|untitled|bai_giang)$/i.test(suggestedTitle)) {
    if (coreXmlBuffer) {
      const xml = coreXmlBuffer.toString('utf8');
      const titleMatch = xml.match(/<dc:title>([^<]+)<\/dc:title>/i);
      if (titleMatch && titleMatch[1].trim()) {
        suggestedTitle = titleMatch[1].trim();
      }
    }
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
      teacher_notes: ''
    });
  });

  return slides;
}

// 3. Hàng đợi Render Slide Nền (Background Worker Queue, MAX_CONCURRENT = 1)
class PptxBackgroundQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(task) {
    // task: { lessonId, fileHash, pptxPath, targetSlidesDir }
    this.queue.push(task);
    console.log(`[PPTX Queue] Đã đưa vào hàng đợi: lesson ${task.lessonId} (Tổng hàng đợi: ${this.queue.length})`);
    this.processNext();
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();

    try {
      console.log(`[PPTX Queue] Bắt đầu render background cho lesson ${task.lessonId} (hash: ${task.fileHash.slice(0, 8)})...`);
      await renderPptxMultiEngine(task.pptxPath, task.targetSlidesDir);

      const slideFiles = fs.readdirSync(task.targetSlidesDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      const slides = slideFiles.map((f, idx) => ({
        id: `slide_${task.lessonId}_${idx + 1}`,
        lesson_id: task.lessonId,
        order_index: idx,
        type: 'IMPORTED_SLIDE',
        title: `Slide ${idx + 1}`,
        layout: 'FULL_IMAGE',
        image_url: `/uploads/presentations/${task.lessonId}/slides/${encodeURIComponent(f)}`,
        content: '',
        teacher_notes: ''
      }));

      const thumbnailUrl = slides.length > 0 ? slides[0].image_url : '';

      // Lưu kết quả vào SHA-256 cache
      saveRenderCache(task.fileHash, slides.length, task.targetSlidesDir);

      // Cập nhật database trạng thái ready
      updateLesson(task.lessonId, {
        render_status: 'ready',
        thumbnail_url: thumbnailUrl,
        slide_count: slides.length,
        slides
      });

      console.log(`[PPTX Queue] ✓ Hoàn tất render background cho lesson ${task.lessonId} (${slides.length} slides)`);
    } catch (err) {
      console.error(`[PPTX Queue] ❌ Lỗi render background cho lesson ${task.lessonId}:`, err.message);
      try {
        updateLesson(task.lessonId, {
          render_status: 'failed'
        });
      } catch (dbErr) {
        console.error('[PPTX Queue] Lỗi cập nhật status failed:', dbErr.message);
      }
    } finally {
      this.isProcessing = false;
      // Kích hoạt task tiếp theo
      setImmediate(() => this.processNext());
    }
  }
}

export const pptxBackgroundQueue = new PptxBackgroundQueue();

// 4. Fast Import Pipeline (Giai đoạn A: Phản hồi ngay < 30ms)
export async function fastImportPptx({ originalName, buffer, lessonData = {} }) {
  initUploadDirectories();

  const ext = path.extname(originalName).toLowerCase();
  if (ext !== '.pptx') {
    throw new Error('Định dạng file không được hỗ trợ. Vui lòng chỉ tải lên file có phần mở rộng .pptx');
  }

  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
    throw new Error('File không hợp lệ hoặc bị hỏng (Không phải định dạng .pptx tiêu chuẩn).');
  }

  // 1. Trích xuất metadata tối thiểu trong ~2ms
  const meta = extractPptxMinimalMetadata(buffer, originalName);
  const lessonId = lessonData.id || `les_pptx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  const lessonDir = path.join(PRESENTATIONS_DIR, lessonId);
  const slidesDir = path.join(lessonDir, 'slides');
  fs.mkdirSync(slidesDir, { recursive: true });

  // 2. Lưu file gốc .pptx
  const pptxPath = path.join(lessonDir, 'original.pptx');
  fs.writeFileSync(pptxPath, buffer);
  const sourceFilePath = `/uploads/presentations/${lessonId}/original.pptx`;

  // 3. Kiểm tra SHA-256 Cache
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
      source_file_name: originalName,
      source_file_path: sourceFilePath,
      thumbnail_url: thumbnailUrl,
      slide_count: slides.length,
      render_status: 'ready',
      file_hash: meta.fileHash,
      slides
    });

    return {
      success: true,
      lesson: created,
      isCached: true
    };
  }

  // CACHE MISS: Tạo bài học với render_status = 'processing'
  // Tạo placeholder slides dựa vào slideCount lấy từ XML
  const placeholderSlides = Array.from({ length: meta.slideCount }, (_, idx) => ({
    id: `slide_${lessonId}_${idx + 1}`,
    lesson_id: lessonId,
    order_index: idx,
    type: 'IMPORTED_SLIDE',
    title: `Slide ${idx + 1}`,
    layout: 'FULL_IMAGE',
    image_url: '',
    content: '',
    teacher_notes: ''
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
    source_file_name: originalName,
    source_file_path: sourceFilePath,
    thumbnail_url: '',
    slide_count: meta.slideCount,
    render_status: 'processing',
    file_hash: meta.fileHash,
    slides: placeholderSlides
  });

  // Đưa việc render vào hàng đợi background (không chặn HTTP response!)
  pptxBackgroundQueue.enqueue({
    lessonId,
    fileHash: meta.fileHash,
    pptxPath,
    targetSlidesDir: slidesDir
  });

  return {
    success: true,
    lesson: created,
    isCached: false
  };
}
