import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { getGeminiConfig } from './envLoader.js';
import { 
  getLessonById, 
  getAiGenerationCache, 
  saveAiGenerationCache,
  getQuizSessionById,
  getSessionById
} from '../db.js';
import { buildLessonAnalysisPrompt } from './prompts/lessonAnalysisPrompt.js';
import { buildQuestionGenerationPrompt } from './prompts/questionGenerationPrompt.js';
import { buildLessonFlowPrompt } from './prompts/lessonFlowPrompt.js';
import { buildQuizAnalysisPrompt } from './prompts/quizAnalysisPrompt.js';
import { buildClassAnalysisPrompt } from './prompts/classAnalysisPrompt.js';

// In-memory rate limiter: Tối đa 15 requests / phút / client IP
const requestHistory = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 15;

function checkRateLimit(clientIp = 'default') {
  const now = Date.now();
  const timestamps = requestHistory.get(clientIp) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  validTimestamps.push(now);
  requestHistory.set(clientIp, validTimestamps);
  return true;
}

export function getAiStatus() {
  const cfg = getGeminiConfig();
  return {
    enabled: cfg.enabled,
    configured: cfg.configured,
    model: cfg.model
  };
}

// Bóc tách JSON an toàn từ kết quả của Gemini (loại bỏ markdown blocks nếu có)
function parseJsonOutput(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();
  
  // Bỏ bọc ```json ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    // Thử trích xuất khối JSON đầu tiên bằng regex { ... } hoặc [ ... ]
    const matchObj = text.match(/\{[\s\S]*\}/);
    if (matchObj) {
      try {
        return JSON.parse(matchObj[0]);
      } catch (e2) {}
    }
    const matchArr = text.match(/\[[\s\S]*\]/);
    if (matchArr) {
      try {
        return JSON.parse(matchArr[0]);
      } catch (e3) {}
    }
    throw new Error(`JSON không hợp lệ: ${err.message}`);
  }
}

// Tính mã băm SHA-256 nội dung để cache
export function computeHash(content) {
  return crypto.createHash('sha256').update(String(content)).digest('hex');
}

/**
 * Hàm gọi Gemini cốt lõi với đầy đủ Cache, Timeout, Retry, Validation và Logging
 */
export async function callGeminiStructured({
  feature,
  entityType = null,
  entityId = null,
  inputDataString,
  promptText,
  systemInstruction = null,
  clientIp = 'default',
  maxRetries = 2,
  timeoutMs = 45000
}) {
  const cfg = getGeminiConfig();

  if (!cfg.enabled) {
    return {
      success: false,
      errorCode: 'AI_DISABLED',
      error: 'Tính năng Trợ Giảng AI hiện đang tắt trong cấu hình hệ thống.'
    };
  }

  if (!cfg.configured) {
    return {
      success: false,
      errorCode: 'AI_NOT_CONFIGURED',
      error: 'Trợ Giảng AI chưa được cấu hình GEMINI_API_KEY trong file .env.'
    };
  }

  if (!checkRateLimit(clientIp)) {
    return {
      success: false,
      errorCode: 'AI_RATE_LIMIT',
      error: 'Gemini đang quá tải hoặc bạn đã gửi yêu cầu quá nhanh. Vui lòng chờ 1 phút.'
    };
  }

  // 1. Kiểm tra Cache trong SQLite theo inputHash
  const inputHash = computeHash(`${feature}:${cfg.model}:${inputDataString}`);
  const cached = getAiGenerationCache(feature, inputHash);
  if (cached && cached.result) {
    console.log(`[AI Cache] ✅ Tái sử dụng kết quả cache cho ${feature} (${inputHash.slice(0, 8)})`);
    return {
      success: true,
      data: cached.result,
      isCached: true,
      model: cached.model
    };
  }

  // 2. Khởi tạo Gemini client chính thức từ @google/genai
  const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const tStart = Date.now();
    try {
      console.log(`[AI Request] Gọi Gemini feature=${feature} (Lần ${attempt}/${maxRetries + 1}, model=${cfg.model})...`);

      // Cấu hình request
      const config = {
        responseMimeType: 'application/json',
      };
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      // Tạo promise với timeout
      const requestPromise = ai.models.generateContent({
        model: cfg.model,
        contents: promptText,
        config
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs);
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);
      const duration = Date.now() - tStart;

      const rawText = typeof response.text === 'function' ? response.text() : (response.text || '');
      const parsedData = parseJsonOutput(rawText);

      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('AI_INVALID_RESPONSE');
      }

      // Lưu kết quả vào Cache SQLite
      saveAiGenerationCache({
        feature,
        entityType,
        entityId,
        model: cfg.model,
        inputHash,
        status: 'SUCCESS',
        result: parsedData
      });

      console.log(`[AI Request] ✅ Thành công feature=${feature} (${duration}ms)`);

      return {
        success: true,
        data: parsedData,
        isCached: false,
        model: cfg.model
      };

    } catch (err) {
      const duration = Date.now() - tStart;
      lastError = err;
      const errMsg = err.message || '';

      console.warn(`[AI Request] ⚠️ Thất bại lần ${attempt} feature=${feature} (${duration}ms): ${errMsg}`);

      // Phân loại lỗi
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401') || errMsg.includes('unauthenticated')) {
        return {
          success: false,
          errorCode: 'AI_AUTH_ERROR',
          error: 'Khóa GEMINI_API_KEY không hợp lệ hoặc đã hết hạn.'
        };
      }

      if (errMsg === 'AI_TIMEOUT') {
        if (attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        return {
          success: false,
          errorCode: 'AI_TIMEOUT',
          error: 'AI phản hồi quá lâu (quá 45 giây). Vui lòng thử lại.'
        };
      }

      // Retry với exponential backoff cho lỗi mạng hoặc rate limit tạm thời
      if (attempt <= maxRetries) {
        const backoffMs = attempt * 1500;
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }

  return {
    success: false,
    errorCode: 'AI_PROVIDER_ERROR',
    error: `Không thể hoàn thành yêu cầu từ Gemini: ${lastError?.message || 'Lỗi không xác định'}`
  };
}

// ====================================================
// 5 CHỨC NĂNG TRỢ GIẢNG AI NGHIỆP VỤ
// ====================================================

// 1. Phân tích bài giảng
export async function analyzeLessonService({ lessonId, clientIp }) {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    throw new Error('Không tìm thấy bài học để phân tích.');
  }

  const inputData = JSON.stringify({
    id: lesson.id,
    title: lesson.title,
    grade: lesson.grade,
    topic: lesson.topic,
    slideCount: (lesson.slides || []).length,
    slides: (lesson.slides || []).map(s => ({ title: s.title, content: s.content }))
  });

  const prompt = buildLessonAnalysisPrompt({
    title: lesson.title,
    grade: lesson.grade,
    topic: lesson.topic,
    duration: lesson.duration_minutes || 35,
    objectives: lesson.objectives,
    keywords: lesson.keywords,
    slides: lesson.slides || []
  });

  return callGeminiStructured({
    feature: 'ANALYZE_LESSON',
    entityType: 'lesson',
    entityId: lessonId,
    inputDataString: inputData,
    promptText: prompt,
    clientIp
  });
}

// 2. Tạo câu hỏi ngân hàng câu hỏi
export async function generateQuestionsService({ lessonId, count = 5, difficulty = 'mixed', types = ['MULTIPLE_CHOICE'], clientIp }) {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    throw new Error('Không tìm thấy bài học để tạo câu hỏi.');
  }

  const slidesText = (lesson.slides || [])
    .slice(0, 30)
    .map(s => `${s.title}: ${s.content}`)
    .filter(Boolean)
    .join('\n');

  const inputData = JSON.stringify({
    lessonId,
    title: lesson.title,
    grade: lesson.grade,
    topic: lesson.topic,
    count,
    difficulty,
    types,
    textSummary: slidesText.slice(0, 3000)
  });

  const prompt = buildQuestionGenerationPrompt({
    lessonTitle: lesson.title,
    grade: lesson.grade,
    topic: lesson.topic,
    slidesContent: slidesText,
    count: Number(count) || 5,
    difficulty,
    types
  });

  const res = await callGeminiStructured({
    feature: 'GENERATE_QUESTIONS',
    entityType: 'lesson',
    entityId: lessonId,
    inputDataString: inputData,
    promptText: prompt,
    clientIp
  });

  // Validate cấu trúc câu hỏi
  if (res.success && res.data && Array.isArray(res.data.questions)) {
    const validQuestions = res.data.questions.filter(q => {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4) return false;
      if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
        // Tự động chuẩn hóa correctIndex nếu thiếu
        if (q.options[q.correctIndex]) {
          q.correctAnswer = q.options[q.correctIndex];
        } else {
          return false;
        }
      }
      q.correctIndex = q.options.indexOf(q.correctAnswer);
      q.grade = Number(lesson.grade) || 3;
      q.lesson_id = lesson.id;
      q.source = 'AI_GEMINI';
      return true;
    });
    res.data.questions = validQuestions;
  }

  return res;
}

// 3. Tạo tiến trình tiết học (Lesson Flow)
export async function generateLessonFlowService({ lessonId, durationMinutes = 35, clientIp }) {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    throw new Error('Không tìm thấy bài học để tạo tiến trình.');
  }

  const targetDuration = Number(durationMinutes) || 35;
  const inputData = JSON.stringify({
    lessonId,
    title: lesson.title,
    grade: lesson.grade,
    topic: lesson.topic,
    durationMinutes: targetDuration,
    objectives: lesson.objectives
  });

  const prompt = buildLessonFlowPrompt({
    lessonTitle: lesson.title,
    grade: lesson.grade,
    topic: lesson.topic,
    durationMinutes: targetDuration,
    objectives: lesson.objectives
  });

  const res = await callGeminiStructured({
    feature: 'GENERATE_LESSON_FLOW',
    entityType: 'lesson',
    entityId: lessonId,
    inputDataString: inputData,
    promptText: prompt,
    clientIp
  });

  // Chuẩn hóa tổng thời gian activities đảm bảo bằng targetDuration
  if (res.success && res.data && Array.isArray(res.data.activities)) {
    let currentTotal = res.data.activities.reduce((sum, a) => sum + (Number(a.duration) || 0), 0);
    if (currentTotal !== targetDuration && res.data.activities.length > 0) {
      const diff = targetDuration - currentTotal;
      // Điều chỉnh vào hoạt động thực hành (Pha 3)
      const practiceAct = res.data.activities.find(a => a.type === 'ACTIVITY' || a.type === 'PRACTICE') || res.data.activities[0];
      practiceAct.duration = Math.max(3, (Number(practiceAct.duration) || 5) + diff);
      res.data.totalDuration = targetDuration;
    }
  }

  return res;
}

// 4. Phân tích kết quả Quick Quiz
export async function analyzeQuizService({ quizSessionId, clientIp }) {
  const quiz = getQuizSessionById(quizSessionId);
  if (!quiz) {
    throw new Error('Không tìm thấy phiên đố vui để phân tích.');
  }

  const questionsData = (quiz.questions || []).map(q => {
    const resultObj = (quiz.results || []).find(r => r.quiz_question_id === q.id) || {};
    return {
      question: q.question,
      correctAnswer: q.correct_answer,
      accuracyRate: resultObj.accuracy_rate || 0,
      correctCount: resultObj.correct_count || 0,
      wrongCount: resultObj.wrong_count || 0
    };
  });

  const inputData = JSON.stringify({
    id: quiz.id,
    title: quiz.title,
    totalQuestions: quiz.total_questions,
    averageAccuracy: quiz.average_accuracy,
    questions: questionsData
  });

  const prompt = buildQuizAnalysisPrompt({
    quizTitle: quiz.title,
    totalQuestions: quiz.total_questions,
    averageAccuracy: quiz.average_accuracy,
    totalResponses: (quiz.student_results || []).length,
    questionsData
  });

  return callGeminiStructured({
    feature: 'ANALYZE_QUIZ',
    entityType: 'quiz_session',
    entityId: quizSessionId,
    inputDataString: inputData,
    promptText: prompt,
    clientIp
  });
}

// 5. Phân tích lớp học (Sổ điểm & Năng lực)
export async function analyzeClassService({ classId, clientIp, classData, students = [] }) {
  const struggling = students
    .filter(s => s.eval_regular === 'C' || s.skill_mouse === 'C' || s.skill_keyboard === 'C' || (s.score_hk1 !== null && s.score_hk1 < 5))
    .map(s => ({
      machineNumber: s.machine_number,
      skillMouse: s.skill_mouse,
      skillKeyboard: s.skill_keyboard,
      skillPaint: s.skill_paint,
      evalRegular: s.eval_regular,
      note: s.note
    }));

  const inputData = JSON.stringify({
    classId,
    name: classData?.name,
    grade: classData?.grade,
    studentCount: students.length,
    strugglingCount: struggling.length,
    struggling
  });

  const prompt = buildClassAnalysisPrompt({
    className: classData?.name,
    grade: classData?.grade,
    totalStudents: students.length,
    stats: {
      attendanceRate: 100,
      totalStars: students.reduce((sum, s) => sum + (s.stars || 0), 0)
    },
    strugglingStudents: struggling
  });

  return callGeminiStructured({
    feature: 'ANALYZE_CLASS',
    entityType: 'class',
    entityId: classId,
    inputDataString: inputData,
    promptText: prompt,
    clientIp
  });
}
