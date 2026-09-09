// quizStorage.js: Định nghĩa, REST API client & Caching cho phân hệ Quick Quiz

export const LOCAL_QUESTIONS_KEY = 'eduict_question_bank_cache_v1';
export const LOCAL_QUIZ_SESSIONS_KEY = 'eduict_quiz_sessions_cache_v1';

// 6 Chủ đề chuẩn Tin học GDPT 2018
export const INFORMATICS_TOPICS = [
  { id: 'all', label: 'Tất cả chủ đề', icon: '📚' },
  { id: 'TOPIC_A', label: 'Chủ đề A: Máy tính và em', icon: '💻' },
  { id: 'TOPIC_B', label: 'Chủ đề B: Mạng máy tính và Internet', icon: '🌐' },
  { id: 'TOPIC_C', label: 'Chủ đề C: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin', icon: '📁' },
  { id: 'TOPIC_D', label: 'Chủ đề D: Đạo đức, pháp luật và văn hóa trong môi trường số', icon: '🛡️' },
  { id: 'TOPIC_E', label: 'Chủ đề E: Ứng dụng tin học', icon: '📝' },
  { id: 'TOPIC_F', label: 'Chủ đề F: Giải quyết vấn đề với máy tính (Lập trình)', icon: '🧩' },
];

// 5 Loại câu hỏi
export const QUESTION_TYPES = [
  { id: 'all', label: 'Tất cả loại câu hỏi' },
  { id: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm 4 lựa chọn (A/B/C/D)', icon: '🔘' },
  { id: 'TRUE_FALSE', label: 'Đúng / Sai', icon: '⚖️' },
  { id: 'SHORT_ANSWER', label: 'Điền khuyết / Trả lời ngắn', icon: '✏️' },
  { id: 'ORAL', label: 'Vấn đáp / Giơ tay phát biểu', icon: '🗣️' },
  { id: 'IMAGE_CHOICE', label: 'Chọn theo hình ảnh', icon: '🖼️' },
];

// 3 Mức độ nhận thức GDPT
export const DIFFICULTIES = [
  { id: 'all', label: 'Tất cả mức độ' },
  { id: 'NHẬN BIẾT', label: 'Nhận biết', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'THÔNG HIỂU', label: 'Thông hiểu', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
  { id: 'VẬN DỤNG', label: 'Vận dụng', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
];

// Tạo câu hỏi mặc định khi thêm mới
export function createDefaultQuestion(grade = 3, topic = 'TOPIC_A') {
  return {
    id: `qb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    question: '',
    grade: Number(grade) || 3,
    subject: 'Tin Học',
    topic: topic || 'TOPIC_A',
    lesson_id: null,
    type: 'MULTIPLE_CHOICE',
    difficulty: 'NHẬN BIẾT',
    options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
    correct_answer: 'Phương án A',
    correct_index: 0,
    explanation: '',
    points: 1,
    image_url: ''
  };
}

// ====================================================
// THUẬT TOÁN XÁO TRỘN CÂU HỎI & ĐÁP ÁN (FISHER-YATES)
// ====================================================

// Xáo trộn mảng tổng quát
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Xáo trộn thứ tự các phương án A/B/C/D nhưng BẢO TOÀN chính xác vị trí đáp án đúng
export function shuffleQuestionOptions(question) {
  if (!question || !Array.isArray(question.options) || question.options.length <= 1) {
    return question;
  }

  // Đóng gói từng phương án kèm chỉ số ban đầu
  const indexedOptions = question.options.map((opt, idx) => ({
    text: opt,
    isCorrect: idx === (question.correct_index ?? 0)
  }));

  // Xáo trộn mảng bằng Fisher-Yates
  const shuffled = shuffleArray(indexedOptions);

  // Xác định vị trí mới của đáp án đúng
  const newCorrectIndex = shuffled.findIndex(item => item.isCorrect);
  const newOptions = shuffled.map(item => item.text);

  return {
    ...question,
    options: newOptions,
    correct_index: newCorrectIndex >= 0 ? newCorrectIndex : 0,
    correct_answer: newOptions[newCorrectIndex >= 0 ? newCorrectIndex : 0]
  };
}

// ====================================================
// LOCALSTORAGE CACHE FALLBACK (100% OFFLINE)
// ====================================================

export function getLocalQuestionsCache() {
  try {
    const raw = localStorage.getItem(LOCAL_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalQuestionsCache(questions) {
  try {
    localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(questions));
  } catch {}
}

// ====================================================
// REST API INTEGRATION
// ====================================================

// 1. Lấy danh sách câu hỏi
export async function fetchQuestionsApi(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.grade && filters.grade !== 'all') params.append('grade', filters.grade);
    if (filters.topic && filters.topic !== 'all') params.append('topic', filters.topic);
    if (filters.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.lesson_id) params.append('lesson_id', filters.lesson_id);
    if (filters.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/questions${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    saveLocalQuestionsCache(data);
    return data;
  } catch (err) {
    console.warn('API /api/questions không khả dụng, dùng cache offline:', err);
    let list = getLocalQuestionsCache();
    if (filters.grade && filters.grade !== 'all') {
      list = list.filter(q => Number(q.grade) === Number(filters.grade));
    }
    if (filters.topic && filters.topic !== 'all') {
      list = list.filter(q => q.topic === filters.topic);
    }
    if (filters.difficulty && filters.difficulty !== 'all') {
      list = list.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(q => (q.question && q.question.toLowerCase().includes(s)) || (q.explanation && q.explanation.toLowerCase().includes(s)));
    }
    return list;
  }
}

// 2. Tạo mới câu hỏi
export async function createQuestionApi(questionData) {
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const created = await res.json();
    const cache = getLocalQuestionsCache();
    saveLocalQuestionsCache([created, ...cache]);
    return created;
  } catch (err) {
    console.warn('API createQuestion lỗi, lưu cục bộ:', err);
    const created = {
      ...questionData,
      id: questionData.id || `qb_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    const cache = getLocalQuestionsCache();
    saveLocalQuestionsCache([created, ...cache]);
    return created;
  }
}

// 3. Cập nhật câu hỏi
export async function updateQuestionApi(id, questionData) {
  try {
    const res = await fetch(`/api/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json();
    const cache = getLocalQuestionsCache();
    saveLocalQuestionsCache(cache.map(q => q.id === id ? updated : q));
    return updated;
  } catch (err) {
    console.warn('API updateQuestion lỗi, cập nhật cache:', err);
    const cache = getLocalQuestionsCache();
    const updated = { ...cache.find(q => q.id === id), ...questionData, id };
    saveLocalQuestionsCache(cache.map(q => q.id === id ? updated : q));
    return updated;
  }
}

// 4. Xóa câu hỏi
export async function deleteQuestionApi(id) {
  try {
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cache = getLocalQuestionsCache();
    saveLocalQuestionsCache(cache.filter(q => q.id !== id));
    return true;
  } catch (err) {
    console.warn('API deleteQuestion lỗi, xóa khỏi cache:', err);
    const cache = getLocalQuestionsCache();
    saveLocalQuestionsCache(cache.filter(q => q.id !== id));
    return true;
  }
}

// 5. Nhân bản câu hỏi
export async function duplicateQuestionApi(id) {
  try {
    const res = await fetch(`/api/questions/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dup = await res.json();
    const cache = getLocalQuestionsCache();
    saveLocalQuestionsCache([dup, ...cache]);
    return dup;
  } catch (err) {
    console.warn('API duplicateQuestion lỗi, nhân bản cache:', err);
    const cache = getLocalQuestionsCache();
    const original = cache.find(q => q.id === id);
    if (!original) throw new Error('Không tìm thấy câu hỏi');
    const dup = {
      ...original,
      id: `qb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      question: `${original.question} (Bản sao)`,
      created_at: new Date().toISOString()
    };
    saveLocalQuestionsCache([dup, ...cache]);
    return dup;
  }
}

// 6. Tạo phiên đố vui Quick Quiz
export async function createQuizSessionApi(sessionPayload) {
  try {
    const res = await fetch('/api/quiz-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionPayload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API createQuizSession lỗi, tạo phiên offline:', err);
    return {
      ...sessionPayload,
      id: `quiz_sess_${Date.now()}`,
      created_at: new Date().toISOString()
    };
  }
}

// 7. Lấy chi tiết phiên đố vui
export async function fetchQuizSessionDetailApi(sessionId) {
  try {
    const res = await fetch(`/api/quiz-sessions/${sessionId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchQuizSessionDetail lỗi:', err);
    return null;
  }
}

// 8. Cập nhật kết quả phiên đố vui
export async function saveQuizResultsApi(sessionId, resultsPayload) {
  try {
    const res = await fetch(`/api/quiz-sessions/${sessionId}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultsPayload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API saveQuizResults lỗi:', err);
    return { success: true, offline: true };
  }
}
