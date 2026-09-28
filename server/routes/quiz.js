import { sendJson, parseJsonBody } from './helpers.js';
import {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  createQuizSession,
  getQuizSessionById,
  updateQuizSession,
  saveQuizResults
} from '../db.js';

export async function tryHandleQuiz(req, res, ctx) {
  const { pathname, method, url } = ctx;

  // 12.1 GET /api/questions (Danh sách câu hỏi kèm lọc)
  if (pathname === '/api/questions' && method === 'GET') {
    try {
      const grade = url.searchParams.get('grade');
      const topic = url.searchParams.get('topic');
      const difficulty = url.searchParams.get('difficulty');
      const type = url.searchParams.get('type');
      const lesson_id = url.searchParams.get('lesson_id') || url.searchParams.get('lessonId');
      const search = url.searchParams.get('search');

      const questions = getAllQuestions({
        grade,
        topic,
        difficulty,
        type,
        lesson_id,
        search
      });
      sendJson(res, 200, questions);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.2 POST /api/questions (Tạo mới câu hỏi)
  if (pathname === '/api/questions' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const created = createQuestion(body);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.3 GET /api/questions/:id (Chi tiết câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+$/) && method === 'GET') {
    const qId = pathname.replace('/api/questions/', '');
    try {
      const q = getQuestionById(qId);
      if (!q) {
        sendJson(res, 404, { error: 'Không tìm thấy câu hỏi' });
        return true;
      }
      sendJson(res, 200, q);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.4 PUT /api/questions/:id (Cập nhật câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+$/) && method === 'PUT') {
    const qId = pathname.replace('/api/questions/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateQuestion(qId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.5 DELETE /api/questions/:id (Xóa câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+$/) && method === 'DELETE') {
    const qId = pathname.replace('/api/questions/', '');
    try {
      deleteQuestion(qId);
      sendJson(res, 200, { success: true, id: qId });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.6 POST /api/questions/:id/duplicate (Nhân bản câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+\/duplicate$/) && method === 'POST') {
    const parts = pathname.split('/');
    const qId = parts[3];
    try {
      const duplicated = duplicateQuestion(qId);
      sendJson(res, 201, duplicated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 13.1 POST /api/quiz-sessions (Khởi tạo phiên đố vui)
  if (pathname === '/api/quiz-sessions' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const session = createQuizSession(body);
      sendJson(res, 201, session);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 13.2 GET /api/quiz-sessions/:id (Chi tiết phiên đố vui kèm câu hỏi và kết quả)
  if (pathname.match(/^\/api\/quiz-sessions\/[^/]+$/) && method === 'GET') {
    const sId = pathname.replace('/api/quiz-sessions/', '');
    try {
      const session = getQuizSessionById(sId);
      if (!session) {
        sendJson(res, 404, { error: 'Không tìm thấy phiên đố vui' });
        return true;
      }
      sendJson(res, 200, session);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 13.3 PUT /api/quiz-sessions/:id (Cập nhật trạng thái / tiến độ phiên)
  if (pathname.match(/^\/api\/quiz-sessions\/[^/]+$/) && method === 'PUT') {
    const sId = pathname.replace('/api/quiz-sessions/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateQuizSession(sId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 13.4 POST /api/quiz-sessions/:id/results (Lưu kết quả câu hỏi / tổng kết)
  if (pathname.match(/^\/api\/quiz-sessions\/[^/]+\/results$/) && method === 'POST') {
    const parts = pathname.split('/');
    const sId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const updated = saveQuizResults(sId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  return false;
}
