import { 
  getAiStatus, 
  analyzeLessonService, 
  generateQuestionsService, 
  generateLessonFlowService, 
  analyzeQuizService, 
  analyzeClassService 
} from './geminiService.js';
import { getAllClassesWithStudents } from '../db.js';

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
}

export async function handleAiApiRequest(req, res, pathname, method, parseJsonBody) {
  // Chỉ đón nhận các route bắt đầu bằng /api/ai/
  if (!pathname.startsWith('/api/ai/')) {
    return false;
  }

  const clientIp = getClientIp(req);

  // 14.1 GET /api/ai/status (Kiểm tra trạng thái cấu hình AI)
  if (pathname === '/api/ai/status' && method === 'GET') {
    try {
      const status = getAiStatus();
      sendJson(res, 200, status);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 14.2 POST /api/ai/analyze-lesson (Phân tích bài giảng)
  if (pathname === '/api/ai/analyze-lesson' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { lessonId } = body;
      if (!lessonId) {
        sendJson(res, 400, { success: false, error: 'Thiếu lessonId để phân tích.' });
        return true;
      }
      const result = await analyzeLessonService({ lessonId, clientIp });
      sendJson(res, result.success ? 200 : 400, result);
    } catch (err) {
      console.error('[AI Route] Lỗi analyze-lesson:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 14.3 POST /api/ai/generate-questions (Tạo câu hỏi trắc nghiệm vào Question Bank)
  if (pathname === '/api/ai/generate-questions' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { lessonId, count, difficulty, types } = body;
      if (!lessonId) {
        sendJson(res, 400, { success: false, error: 'Thiếu lessonId để tạo câu hỏi.' });
        return true;
      }
      const result = await generateQuestionsService({
        lessonId,
        count: count || 5,
        difficulty: difficulty || 'mixed',
        types: types || ['MULTIPLE_CHOICE'],
        clientIp
      });
      sendJson(res, result.success ? 200 : 400, result);
    } catch (err) {
      console.error('[AI Route] Lỗi generate-questions:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 14.4 POST /api/ai/generate-lesson-flow (Gợi ý tiến trình tiết học)
  if (pathname === '/api/ai/generate-lesson-flow' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { lessonId, durationMinutes } = body;
      if (!lessonId) {
        sendJson(res, 400, { success: false, error: 'Thiếu lessonId để tạo tiến trình.' });
        return true;
      }
      const result = await generateLessonFlowService({
        lessonId,
        durationMinutes: durationMinutes || 35,
        clientIp
      });
      sendJson(res, result.success ? 200 : 400, result);
    } catch (err) {
      console.error('[AI Route] Lỗi generate-lesson-flow:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 14.5 POST /api/ai/analyze-quiz (Phân tích kết quả đố vui Quick Quiz)
  if (pathname === '/api/ai/analyze-quiz' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { quizResultId, quizSessionId } = body;
      const targetId = quizSessionId || quizResultId;
      if (!targetId) {
        sendJson(res, 400, { success: false, error: 'Thiếu quizSessionId để phân tích kết quả đố vui.' });
        return true;
      }
      const result = await analyzeQuizService({
        quizSessionId: targetId,
        clientIp
      });
      sendJson(res, result.success ? 200 : 400, result);
    } catch (err) {
      console.error('[AI Route] Lỗi analyze-quiz:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 14.6 POST /api/ai/analyze-class (Phân tích tình hình lớp học & sổ điểm)
  if (pathname === '/api/ai/analyze-class' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { classId } = body;
      if (!classId) {
        sendJson(res, 400, { success: false, error: 'Thiếu classId để phân tích lớp.' });
        return true;
      }
      const classes = getAllClassesWithStudents();
      const targetClass = classes.find(c => c.id === classId);
      const result = await analyzeClassService({
        classId,
        clientIp,
        classData: targetClass,
        students: targetClass?.students || []
      });
      sendJson(res, result.success ? 200 : 400, result);
    } catch (err) {
      console.error('[AI Route] Lỗi analyze-class:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  return false;
}
