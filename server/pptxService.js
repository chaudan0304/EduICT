import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const PRESENTATIONS_DIR = path.join(UPLOADS_DIR, 'presentations');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
const RENDERER_SCRIPT = path.resolve(process.cwd(), 'server', 'pptx-renderer.ps1');

// Đảm bảo các thư mục cần thiết tồn tại
export function initUploadDirectories() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(PRESENTATIONS_DIR)) fs.mkdirSync(PRESENTATIONS_DIR, { recursive: true });
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
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

// Gọi script PowerShell để render các slide PowerPoint
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

// Xử lý upload file PPTX và trích xuất slide vào thư mục tạm thời
export async function processPptxUploadPreview({ originalName, buffer }) {
  initUploadDirectories();

  // Kiểm tra đuôi file
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== '.pptx') {
    throw new Error('Định dạng file không được hỗ trợ. Vui lòng chỉ tải lên file PowerPoint có phần mở rộng .pptx');
  }

  // Kiểm tra magic header của file ZIP/PPTX (PK\x03\x04)
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
    const renderResult = await renderPptxWithPowerPoint(pptxPath, slidesDir);

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
