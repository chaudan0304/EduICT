/**
 * aiService.js
 * Frontend REST API client kết nối với phân hệ Trợ Giảng AI (/api/ai/*)
 */

export async function fetchAiStatus() {
  try {
    const res = await fetch('/api/ai/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[AI Service] Không thể kiểm tra trạng thái AI:', err.message);
  }
  return { enabled: false, configured: false, model: 'gemini-2.5-flash' };
}

export async function analyzeLessonApi(lessonId) {
  const res = await fetch('/api/ai/analyze-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể phân tích bài giảng.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { lessonTitle, objectives, keyKnowledge, keywords, suggestedActivities, ... }, isCached }
}

export async function generateQuestionsApi({ lessonId, count = 5, difficulty = 'mixed', types = ['MULTIPLE_CHOICE'] }) {
  const res = await fetch('/api/ai/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, count, difficulty, types })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể tạo câu hỏi trắc nghiệm từ AI.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { questions: [...] }, isCached }
}

export async function generateLessonFlowApi({ lessonId, durationMinutes = 35 }) {
  const res = await fetch('/api/ai/generate-lesson-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, durationMinutes })
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

export async function analyzeClassApi(classId) {
  const res = await fetch('/api/ai/analyze-class', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classId })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Không thể phân tích lớp học.');
    err.errorCode = data.errorCode || 'AI_PROVIDER_ERROR';
    throw err;
  }
  return data; // { success: true, data: { summary, strengths, weaknesses, studentsNeedingSupport, recommendations } }
}
