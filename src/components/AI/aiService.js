/**
 * aiService.js
 * Frontend REST API client kết nối với phân hệ Trợ Giảng AI (/api/ai/*)
 */
import apiClient from '../../services/apiClient';

export async function fetchAiStatus() {
  try {
    return { ...await apiClient.get('/api/ai/status', { timeout: 8000 }), available: true };
  } catch (err) {
    console.warn('[AI Service] Không thể kiểm tra trạng thái AI:', err.message);
  }
  return { enabled: false, configured: false, available: false, model: 'gemini-3.5-flash-lite' };
}

export async function analyzeLessonApi(lessonId, { signal } = {}) {
  const res = await fetch('/api/ai/analyze-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId }),
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể phân tích bài giảng.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { lessonTitle, objectives, keyKnowledge, keywords, suggestedActivities, ... }, isCached }
}

export async function fetchQuestionSourceApi(lessonId, signal) {
  const res = await fetch(`/api/ai/question-source/${encodeURIComponent(lessonId)}`, { signal });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Không thể đọc nội dung bài học.');
  return data.data;
}

export async function generateQuestionsApi({ lessonId, count = 5, difficulty = 'mixed', types = ['MULTIPLE_CHOICE'], sourceContent, instructions, signal }) {
  const res = await fetch('/api/ai/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, count, difficulty, types, sourceContent, instructions }),
    signal
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể tạo câu hỏi trắc nghiệm từ AI.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { questions: [...] }, isCached }
}

export async function generateLessonFlowApi({ lessonId, durationMinutes = 35, signal }) {
  const res = await fetch('/api/ai/generate-lesson-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, durationMinutes }),
    signal
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể tạo tiến trình tiết học.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { totalDuration, activities: [...] }, isCached }
}

export async function analyzeQuizApi(quizSessionId) {
  const res = await fetch('/api/ai/analyze-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizSessionId })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể phân tích kết quả đố vui.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { summary, strengths, weaknesses, recommendedReinforcement, recommendedMinutes } }
}

export async function analyzeClassApi(classId, { signal } = {}) {
  const res = await fetch('/api/ai/analyze-class', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classId }),
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể phân tích lớp học.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { summary, strengths, weaknesses, studentsNeedingSupport, recommendations } }
}
