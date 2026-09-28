import { sendJson, parseJsonBody, parseRequestBodyBuffer, parseMultipart } from './helpers.js';
import {
  createLesson,
  getAllLessons,
  getClassStats,
  updateLesson,
  getLessonById
} from '../db.js';
import {
  processPptxUploadPreview,
  commitImportedPptx,
  cancelImportSession,
  fastImportPptx,
  retrySingleSlideRender,
  ensureLessonThumbnail
} from '../pptxService.js';
import { checkDuplicateBatch, scanLibraryDuplicates } from '../duplicateDetector.js';

export async function tryHandlePptx(req, res, ctx) {
  const { pathname, method } = ctx;

  // 11.2.1 POST /api/lessons/upload-pptx-preview (Upload file PowerPoint và trích xuất slide xem trước)
  if (pathname === '/api/lessons/upload-pptx-preview' && method === 'POST') {
    try {
      const rawBuffer = await parseRequestBodyBuffer(req);
      const contentType = req.headers['content-type'] || '';
      let fileName = 'bai_giang.pptx';
      let fileBuffer = null;

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          sendJson(res, 400, { error: 'Thiếu boundary trong multipart request' });
          return true;
        }
        const parsed = parseMultipart(rawBuffer, boundaryMatch[1].trim());
        fileName = parsed.fileName;
        fileBuffer = parsed.fileBuffer;
      } else if (contentType.includes('application/json')) {
        const json = JSON.parse(rawBuffer.toString('utf-8'));
        fileName = json.fileName || 'bai_giang.pptx';
        fileBuffer = json.fileBase64 ? Buffer.from(json.fileBase64, 'base64') : null;
      } else {
        // Hỗ trợ binary stream trực tiếp kèm header X-File-Name
        const headerFileName = req.headers['x-file-name'];
        if (headerFileName) {
          try {
            fileName = decodeURIComponent(headerFileName);
          } catch {
            fileName = headerFileName;
          }
        }
        fileBuffer = rawBuffer;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        sendJson(res, 400, { error: 'Không tìm thấy dữ liệu file PowerPoint.' });
        return true;
      }

      const previewData = await processPptxUploadPreview({ originalName: fileName, buffer: fileBuffer });
      sendJson(res, 200, { success: true, ...previewData });
    } catch (err) {
      console.error('Lỗi render PPTX preview:', err);
      sendJson(res, 500, { error: err.message || 'Không thể xử lý file PowerPoint.' });
    }
    return true;
  }

  // 11.2.2 POST /api/lessons/confirm-import-pptx (Lưu bài học PowerPoint chính thức vào database)
  if (pathname === '/api/lessons/confirm-import-pptx' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { tempId, title, grade, topic, durationMinutes, description, originalFileName } = body;

      if (!tempId) {
        sendJson(res, 400, { error: 'Mã phiên import tạm thời không hợp lệ.' });
        return true;
      }

      const lessonId = `les_pptx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const commitResult = await commitImportedPptx(tempId, lessonId);

      const slides = commitResult.slides.map((s, idx) => ({
        id: `slide_${lessonId}_${idx + 1}`,
        lesson_id: lessonId,
        order_index: idx,
        type: 'IMPORTED_SLIDE',
        title: s.title,
        layout: 'FULL_IMAGE',
        image_url: s.imageUrl,
        content: '',
        teacher_notes: ''
      }));

      const created = createLesson({
        id: lessonId,
        title: title || 'Bài giảng PowerPoint',
        grade: Number(grade) || 3,
        subject: 'Tin Học',
        topic: topic || 'Chung',
        duration_minutes: Number(durationMinutes) || 35,
        objectives: description || '',
        keywords: `PowerPoint, ${topic || ''}`,
        type: 'imported',
        source_file_name: originalFileName || '',
        source_file_path: commitResult.sourceFilePath,
        thumbnail_url: commitResult.thumbnailUrl,
        slide_count: commitResult.slideCount,
        slides
      });

      sendJson(res, 201, { success: true, lesson: created });
    } catch (err) {
      console.error('Lỗi xác nhận import PPTX:', err);
      sendJson(res, 500, { error: err.message || 'Không thể lưu bài học PowerPoint vào thư viện.' });
    }
    return true;
  }

  // 11.2.3 POST /api/lessons/cancel-import-pptx (Hủy bỏ phiên import tạm thời)
  if (pathname === '/api/lessons/cancel-import-pptx' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (body.tempId) {
        cancelImportSession(body.tempId);
      }
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2.3.1 POST /api/lessons/check-duplicates (Kiểm tra trùng lặp siêu tốc cho 1 hoặc nhiều file PPTX)
  if (pathname === '/api/lessons/check-duplicates' && method === 'POST') {
    try {
      const rawBuffer = await parseRequestBodyBuffer(req);
      const contentType = req.headers['content-type'] || '';
      let filesToCheck = [];

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          sendJson(res, 400, { error: 'Thiếu boundary trong multipart request' });
          return true;
        }
        const parsed = parseMultipart(rawBuffer, boundaryMatch[1].trim());
        if (parsed.files && parsed.files.length > 0) {
          filesToCheck = parsed.files;
        } else if (parsed.fileBuffer) {
          filesToCheck = [{ name: parsed.fileName, buffer: parsed.fileBuffer }];
        }
      } else if (contentType.includes('application/json')) {
        const json = JSON.parse(rawBuffer.toString('utf-8'));
        if (Array.isArray(json.files)) {
          filesToCheck = json.files.map(f => ({
            name: f.name || f.fileName || 'bai_giang.pptx',
            buffer: Buffer.from(f.fileBase64 || f.base64 || '', 'base64')
          }));
        } else if (json.fileBase64) {
          filesToCheck = [{
            name: json.fileName || 'bai_giang.pptx',
            buffer: Buffer.from(json.fileBase64, 'base64')
          }];
        }
      } else {
        const headerFileName = req.headers['x-file-name'];
        let name = 'bai_giang.pptx';
        if (headerFileName) {
          try { name = decodeURIComponent(headerFileName); } catch { name = headerFileName; }
        }
        filesToCheck = [{ name, buffer: rawBuffer }];
      }

      if (filesToCheck.length === 0) {
        sendJson(res, 400, { error: 'Không tìm thấy file để kiểm tra trùng lặp.' });
        return true;
      }

      const existingLessons = getAllLessons();
      const results = checkDuplicateBatch({ files: filesToCheck, existingLessons });
      sendJson(res, 200, { success: true, count: results.length, results });
    } catch (err) {
      console.error('Lỗi kiểm tra trùng lặp:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi kiểm tra bài giảng trùng lặp.' });
    }
    return true;
  }

  // 11.2.3.2 GET /api/lessons/scan-duplicates (Quét tự động toàn bộ thư viện bài giảng)
  if (pathname === '/api/lessons/scan-duplicates' && method === 'GET') {
    try {
      const lessons = getAllLessons();
      const classStats = getClassStats();
      const report = scanLibraryDuplicates(lessons, classStats);
      sendJson(res, 200, { success: true, ...report });
    } catch (err) {
      console.error('Lỗi quét trùng lặp thư viện:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi quét trùng lặp thư viện.' });
    }
    return true;
  }

  // 11.2.3.3 POST /api/lessons/resolve-duplicate (Giáo viên xác nhận giữ lại bài)
  if (pathname === '/api/lessons/resolve-duplicate' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { lessonId } = body;
      if (!lessonId) {
        sendJson(res, 400, { error: 'Thiếu lessonId' });
        return true;
      }
      updateLesson(lessonId, {
        similarity_status: 'unique',
        duplicate_of_id: null
      });
      sendJson(res, 200, { success: true, message: 'Đã xác nhận giữ lại bài giảng' });
    } catch (err) {
      console.error('Lỗi resolve duplicate:', err);
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2.4 POST /api/lessons/import-fast (Import nhanh PPTX < 30ms, trích xuất metadata và render nền)
  if (pathname === '/api/lessons/import-fast' && method === 'POST') {
    try {
      const rawBuffer = await parseRequestBodyBuffer(req);
      const contentType = req.headers['content-type'] || '';
      let fileName = 'bai_giang.pptx';
      let fileBuffer = null;
      let fields = {};

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          sendJson(res, 400, { error: 'Thiếu boundary trong multipart request' });
          return true;
        }
        const parsed = parseMultipart(rawBuffer, boundaryMatch[1].trim());
        fileName = parsed.fileName;
        fileBuffer = parsed.fileBuffer;
        fields = parsed.fields || {};
      } else if (contentType.includes('application/json')) {
        const json = JSON.parse(rawBuffer.toString('utf-8'));
        fileName = json.fileName || 'bai_giang.pptx';
        fileBuffer = json.fileBase64 ? Buffer.from(json.fileBase64, 'base64') : null;
        fields = json;
      } else {
        const headerFileName = req.headers['x-file-name'];
        if (headerFileName) {
          try {
            fileName = decodeURIComponent(headerFileName);
          } catch {
            fileName = headerFileName;
          }
        }
        fileBuffer = rawBuffer;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        sendJson(res, 400, { error: 'Không tìm thấy dữ liệu file PowerPoint.' });
        return true;
      }

      const allowDuplicate = fields.allowDuplicate === true || fields.allowDuplicate === 'true' || fields.allow_duplicate === true || fields.allow_duplicate === 'true';

      const result = await fastImportPptx({
        originalName: fileName,
        buffer: fileBuffer,
        lessonData: {
          title: fields.title,
          grade: fields.grade ? Number(fields.grade) : undefined,
          subject: fields.subject,
          topic: fields.topic,
          durationMinutes: fields.durationMinutes ? Number(fields.durationMinutes) : undefined,
          description: fields.description,
          allowDuplicate,
          similarity_status: fields.similarity_status || fields.similarityStatus,
          similarity_score: fields.similarity_score !== undefined ? Number(fields.similarity_score) : (fields.similarityScore !== undefined ? Number(fields.similarityScore) : undefined),
          duplicate_of_id: fields.duplicate_of_id || fields.duplicateOfId
        }
      });

      if (result.isDuplicate && !allowDuplicate) {
        sendJson(res, 409, result);
        return true;
      }

      sendJson(res, 201, result);
    } catch (err) {
      console.error('Lỗi fastImportPptx:', err);
      sendJson(res, 500, { error: err.message || 'Không thể import nhanh file PowerPoint.' });
    }
    return true;
  }

  // 11.2.5 GET /api/lessons/:id/render-status (Kiểm tra trạng thái render slide nền)
  if (pathname.match(/^\/api\/lessons\/[^/]+\/render-status$/) && method === 'GET') {
    const parts = pathname.split('/');
    const lessonId = parts[3];
    try {
      const lesson = getLessonById(lessonId);
      if (!lesson) {
        sendJson(res, 404, { error: 'Không tìm thấy bài học' });
        return true;
      }
      sendJson(res, 200, {
        id: lesson.id,
        title: lesson.title,
        importStatus: lesson.importStatus || lesson.import_status || 'IMPORTED',
        import_status: lesson.import_status || lesson.importStatus || 'IMPORTED',
        renderStatus: lesson.renderStatus || lesson.render_status || 'ready',
        render_status: lesson.render_status || lesson.renderStatus || 'ready',
        renderProgress: lesson.renderProgress !== undefined ? lesson.renderProgress : (lesson.render_progress || 0),
        render_progress: lesson.render_progress !== undefined ? lesson.render_progress : (lesson.renderProgress || 0),
        totalSlides: lesson.totalSlides !== undefined ? lesson.totalSlides : (lesson.total_slides || lesson.slide_count || (lesson.slides ? lesson.slides.length : 0)),
        total_slides: lesson.total_slides !== undefined ? lesson.total_slides : (lesson.totalSlides || lesson.slide_count || (lesson.slides ? lesson.slides.length : 0)),
        renderedSlides: lesson.renderedSlides !== undefined ? lesson.renderedSlides : (lesson.rendered_slides || 0),
        rendered_slides: lesson.rendered_slides !== undefined ? lesson.rendered_slides : (lesson.renderedSlides || 0),
        failedSlides: lesson.failedSlides !== undefined ? lesson.failedSlides : (lesson.failed_slides || 0),
        failed_slides: lesson.failed_slides !== undefined ? lesson.failed_slides : (lesson.failedSlides || 0),
        slide_count: lesson.slide_count || lesson.total_slides || (lesson.slides ? lesson.slides.length : 0),
        thumbnailUrl: lesson.thumbnailUrl || lesson.thumbnail_url || '',
        thumbnail_url: lesson.thumbnail_url || lesson.thumbnailUrl || '',
        slides: (lesson.slides || []).map(s => ({
          ...s,
          slideNumber: s.slideNumber || s.slide_number || (s.order_index !== undefined ? s.order_index + 1 : 1),
          slide_number: s.slide_number || s.slideNumber || (s.order_index !== undefined ? s.order_index + 1 : 1),
          status: s.status || s.render_status || 'ready',
          render_status: s.render_status || s.status || 'ready',
          imageUrl: s.imageUrl || s.image_url || '',
          image_url: s.image_url || s.imageUrl || '',
          attempts: s.attempts !== undefined ? s.attempts : (s.render_attempts || 0),
          renderedAt: s.renderedAt || s.rendered_at || null,
          rendered_at: s.rendered_at || s.renderedAt || null,
          errorCode: s.errorCode || s.error_code || null,
          error_code: s.error_code || s.errorCode || null,
          errorMessage: s.errorMessage || s.error_message || null,
          error_message: s.error_message || s.errorMessage || null
        }))
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2.6 POST /api/lessons/:lessonId/slides/:slideNumber/retry (Chuẩn theo Requirement 13)
  const slideRetryMatch = pathname.match(/^\/api\/lessons\/([^/]+)\/slides\/(\d+)\/retry$/);
  if (slideRetryMatch && method === 'POST') {
    const lessonId = slideRetryMatch[1];
    const slideNumber = Number(slideRetryMatch[2]);
    try {
      const lesson = getLessonById(lessonId);
      if (!lesson) {
        sendJson(res, 404, { error: 'Không tìm thấy bài học' });
        return true;
      }
      const targetSlide = (lesson.slides || []).find(s => (s.slide_number || s.order_index + 1) === slideNumber);
      const slideId = targetSlide ? targetSlide.id : null;
      const result = await retrySingleSlideRender(lessonId, slideId, slideNumber);
      sendJson(res, result.success ? 200 : 422, result);
    } catch (err) {
      console.error(`Lỗi khi retry slide ${slideNumber} của bài ${lessonId}:`, err);
      sendJson(res, 500, { error: err.message || 'Lỗi xử lý kết xuất lại slide' });
    }
    return true;
  }

  // 11.2.7 POST /api/lessons/:id/generate-thumbnail hoặc /retry-thumbnail (Requirement 2)
  const thumbMatch = pathname.match(/^\/api\/lessons\/([^/]+)\/(generate-thumbnail|retry-thumbnail)$/);
  if (thumbMatch && method === 'POST') {
    const lessonId = thumbMatch[1];
    try {
      const result = await ensureLessonThumbnail(lessonId);
      sendJson(res, 200, result);
    } catch (err) {
      console.error(`Lỗi khi tạo thumbnail cho bài ${lessonId}:`, err);
      sendJson(res, 500, { error: err.message || 'Không thể tạo ảnh xem trước' });
    }
    return true;
  }

  // 11.2.8 POST /api/lessons/retry-slide (Thử lại kết xuất hình ảnh cho một slide đơn lẻ - Tương thích ngược)
  if (pathname === '/api/lessons/retry-slide' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { lessonId, slideId, slideNumber } = body;
      if (!lessonId || (!slideId && !slideNumber)) {
        sendJson(res, 400, { error: 'Thiếu lessonId hoặc thông tin slide (slideId/slideNumber)' });
        return true;
      }
      const result = await retrySingleSlideRender(lessonId, slideId, Number(slideNumber));
      sendJson(res, result.success ? 200 : 422, result);
    } catch (err) {
      console.error('Lỗi khi retry slide:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi xử lý kết xuất lại slide' });
    }
    return true;
  }

  return false;
}
