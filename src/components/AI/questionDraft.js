import { DIFFICULTIES } from '../QuickQuiz/quizStorage';

export const QUESTION_LEVELS = DIFFICULTIES.filter(level => level.id !== 'all');

export function normalizeDifficulty(value) {
  const aliases = { recognition: 'NHẬN BIẾT', understanding: 'THÔNG HIỂU', application: 'VẬN DỤNG' };
  const text = String(value || '').trim().normalize('NFC');
  const normalized = aliases[text.toLocaleLowerCase('vi')] || text.toLocaleUpperCase('vi');
  return QUESTION_LEVELS.some(level => level.id === normalized) ? normalized : 'NHẬN BIẾT';
}

export function normalizeQuestion(question) {
  const options = Array.isArray(question.options) ? question.options.map(option => String(option).trim()) : [];
  const answerIndex = options.indexOf(String(question.correctAnswer ?? question.correct_answer ?? '').trim());
  const index = Number(question.correctIndex ?? question.correct_index);
  return {
    ...question,
    questionText: String(question.questionText || question.question_text || question.question || '').trim(),
    options,
    correctIndex: answerIndex >= 0 ? answerIndex : (Number.isInteger(index) && index >= 0 && index < options.length ? index : -1),
    difficulty: normalizeDifficulty(question.difficulty),
    explanation: String(question.explanation || '')
  };
}

export function validateQuestion(question) {
  if (!question.questionText.trim()) return 'Chưa có nội dung câu hỏi.';
  if (question.options.length !== 4 || question.options.some(option => !option.trim())) return 'Cần đủ 4 phương án có nội dung.';
  if (new Set(question.options.map(option => option.trim().toLocaleLowerCase('vi'))).size !== 4) return 'Các phương án phải khác nhau.';
  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) return 'Hãy chọn một đáp án đúng.';
  return '';
}

export function lessonDisplayTitle(title = '') {
  return title.replace(/\.(pptx?|ppsx?)$/i, '').replace(/^(?:KHBD[_\s-]*)?(?:LQTH\d?|TINHOC\d?|TH\d?)[_\s-]+/i, '').replace(/_/g, ' ');
}
