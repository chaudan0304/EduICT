import { sendJson, parseJsonBody } from './helpers.js';
import {
  getAllLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  duplicateLesson,
  saveLessonSlides
} from '../db.js';
import { deleteLessonPresentationsDir } from '../pptxService.js';

// 11.1 & 11.2 — collection routes on /api/lessons (must run BEFORE the pptx
// group and the generic /api/lessons/:id CRUD to preserve original first-match order)
export async function tryHandleLessonsCollection(req, res, ctx) {
  const { pathname, method, url } = ctx;

  // 11.1 GET /api/lessons (Danh sách bài học kèm bộ lọc)
  if (pathname === '/api/lessons' && method === 'GET') {
    try {
      const grade = url.searchParams.get('grade');
      const topic = url.searchParams.get('topic');
      const search = url.searchParams.get('search');
      const similarity_status = url.searchParams.get('similarity_status');
      const type = url.searchParams.get('type');
      const lessons = getAllLessons({ grade, topic, search, similarity_status, type });
      sendJson(res, 200, lessons);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2 POST /api/lessons (Tạo bài học mới)
  if (pathname === '/api/lessons' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const created = createLesson(body);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  return false;
}

// 11.3 - 11.7 — generic /api/lessons/:id CRUD routes (must run AFTER the pptx
// group so specific lesson sub-routes like scan-duplicates are not swallowed)
export async function tryHandleLessonsCrud(req, res, ctx) {
  const { pathname, method } = ctx;

  // 11.3 GET /api/lessons/:id (Chi tiết bài học + slides)
  if (pathname.match(/^\/api\/lessons\/[^/]+$/) && method === 'GET') {
    const lessonId = pathname.replace('/api/lessons/', '');
    try {
      const lesson = getLessonById(lessonId);
      if (!lesson) {
        sendJson(res, 404, { error: 'Không tìm thấy bài học' });
        return true;
      }
      sendJson(res, 200, lesson);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.4 PUT /api/lessons/:id (Cập nhật bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+$/) && method === 'PUT') {
    const lessonId = pathname.replace('/api/lessons/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateLesson(lessonId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.5 DELETE /api/lessons/:id (Xóa bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+$/) && method === 'DELETE') {
    const lessonId = pathname.replace('/api/lessons/', '');
    try {
      deleteLesson(lessonId);
      deleteLessonPresentationsDir(lessonId);
      sendJson(res, 200, { success: true, id: lessonId });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.6 POST /api/lessons/:id/duplicate (Nhân bản bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+\/duplicate$/) && method === 'POST') {
    const parts = pathname.split('/');
    const lessonId = parts[3];
    try {
      const duplicated = duplicateLesson(lessonId);
      sendJson(res, 201, duplicated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.7 PUT /api/lessons/:id/slides (Cập nhật toàn bộ slides của bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+\/slides$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const lessonId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const slides = Array.isArray(body) ? body : (body.slides || []);
      const saved = saveLessonSlides(lessonId, slides);
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  return false;
}
