import { sendJson, parseJsonBody } from './helpers.js';
import {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  saveSessionActivities,
  addSessionEvent,
  addStudentParticipation
} from '../db.js';

export async function tryHandleSessions(req, res, ctx) {
  const { pathname, method, url } = ctx;

  // 10. CLASSROOM SESSIONS API
  // 10.1 GET /api/sessions (Danh sách)
  if (pathname === '/api/sessions' && method === 'GET') {
    try {
      const classId = url.searchParams.get('classId') || null;
      const sessions = getAllSessions(classId);
      sendJson(res, 200, sessions);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.2 POST /api/sessions (Tạo mới)
  if (pathname === '/api/sessions' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const created = createSession(body);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.3 GET /api/sessions/:id (Chi tiết)
  if (pathname.match(/^\/api\/sessions\/[^/]+$/) && method === 'GET') {
    const sessionId = pathname.replace('/api/sessions/', '');
    try {
      const session = getSessionById(sessionId);
      if (!session) {
        sendJson(res, 404, { error: 'Không tìm thấy session' });
        return true;
      }
      sendJson(res, 200, session);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.4 PUT /api/sessions/:id (Cập nhật session)
  if (pathname.match(/^\/api\/sessions\/[^/]+$/) && method === 'PUT') {
    const sessionId = pathname.replace('/api/sessions/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateSession(sessionId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.5 DELETE /api/sessions/:id (Xóa session)
  if (pathname.match(/^\/api\/sessions\/[^/]+$/) && method === 'DELETE') {
    const sessionId = pathname.replace('/api/sessions/', '');
    try {
      deleteSession(sessionId);
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.6 PUT /api/sessions/:id/activities (Cập nhật toàn bộ activities)
  if (pathname.match(/^\/api\/sessions\/[^/]+\/activities$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const sessionId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const activities = Array.isArray(body) ? body : (body.activities || []);
      const saved = saveSessionActivities(sessionId, activities);
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.7 POST /api/sessions/:id/events (Ghi nhận event)
  if (pathname.match(/^\/api\/sessions\/[^/]+\/events$/) && method === 'POST') {
    const parts = pathname.split('/');
    const sessionId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const result = addSessionEvent(sessionId, body);
      sendJson(res, 201, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.8 POST /api/sessions/:id/participation (Ghi nhận học sinh tham gia / cộng sao)
  if (pathname.match(/^\/api\/sessions\/[^/]+\/participation$/) && method === 'POST') {
    const parts = pathname.split('/');
    const sessionId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const result = addStudentParticipation(sessionId, body);
      sendJson(res, 201, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  return false;
}
