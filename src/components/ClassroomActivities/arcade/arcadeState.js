import { shuffle, studentId } from '../activityState';

export const TEAM_NAMES = ['Mặt Trời', 'Cầu Vồng', 'Sóng Biển', 'Lá Xanh'];
export const TEAM_COLORS = ['#1576cf', '#e45b62', '#99732b', '#248670'];
export const DEFAULT_QUESTIONS = `Nêu tên một bộ phận của máy tính. | Màn hình, bàn phím, chuột hoặc thân máy.
Phím nào dùng để xuống dòng khi gõ văn bản? | Phím Enter.
Em đặt ngón trỏ lên nút chuột nào? | Nút trái.
Em cần làm gì trước khi rời phòng máy? | Lưu bài, làm theo hướng dẫn tắt máy và thu dọn chỗ học.
Nêu một cách bảo vệ mắt khi dùng máy tính. | Ngồi đủ khoảng cách, nghỉ mắt theo hướng dẫn.
Thiết bị nào giúp gõ chữ vào máy tính? | Bàn phím.
Em dùng thiết bị nào để nghe âm thanh? | Loa hoặc tai nghe.
Nêu một việc nên làm khi máy tính bị lỗi. | Báo giáo viên, không tự tháo máy.
Khi bạn chưa làm được bài, em có thể giúp thế nào? | Hướng dẫn bạn thao tác, không làm thay toàn bộ.
Phím cách có tác dụng gì khi gõ văn bản? | Tạo khoảng cách giữa các từ.
Em nên đặt cốc nước ở đâu khi học máy tính? | Xa thiết bị theo nội quy phòng máy.
Nêu một điều em học được hôm nay. | Giáo viên xác nhận theo bài học.`;

export const parseQuestions = text => text.split('\n').map(line => {
  const [question, ...answer] = line.split('|');
  return { question: question.trim().slice(0, 400), answer: answer.join('|').trim().slice(0, 600) };
}).filter(item => item.question).slice(0, 24);

export function normalizeConfig(value, kind) {
  return { teamCount: kind === 'tug' ? 2 : [1, 2, 3, 4].includes(value?.teamCount) && (kind === 'puzzle' || value.teamCount > 1) ? value.teamCount : 2,
    names: TEAM_NAMES.map((name, i) => typeof value?.names?.[i] === 'string' ? value.names[i].slice(0, 32) : name),
    mode: ['luck', 'questions'].includes(value?.mode) ? value.mode : kind === 'gifts' ? 'luck' : 'questions',
    questions: typeof value?.questions === 'string' ? value.questions.slice(0, 12000) : DEFAULT_QUESTIONS,
    picture: ['computer', 'keyboard', 'mouse', 'custom'].includes(value?.picture) ? value.picture : 'computer',
    answer: typeof value?.answer === 'string' ? value.answer.slice(0, 100) : '',
  };
}

const integers = (items, min, max, count) => Array.isArray(items) && items.length === count && items.every(n => Number.isInteger(n) && n >= min && n <= max);
export function validRound(value, kind) {
  return value?.kind === kind && typeof value.id === 'string' && Array.isArray(value.teams) && value.teams.length >= 1 && value.teams.length <= 4
    && (kind !== 'tug' || value.teams.length === 2) && (kind !== 'gifts' || value.teams.length >= 2)
    && (kind !== 'puzzle' || ['computer', 'keyboard', 'mouse', 'custom'].includes(value.picture) && typeof value.secret === 'string' && typeof value.photoFingerprint === 'string' && typeof value.photoName === 'string' && typeof value.awaitingGuess === 'boolean')
    && value.teams.every(team => typeof team.name === 'string' && team.name.length <= 32 && Array.isArray(team.ids) && team.ids.every(id => typeof id === 'string') && Number.isSafeInteger(team.score) && team.score >= 0 && team.score < 100000 && typeof team.boost === 'boolean')
    && Number.isInteger(value.turn) && value.turn >= 0 && value.turn < value.teams.length && Number.isInteger(value.turns) && value.turns >= 0
    && Number.isInteger(value.prompt) && value.prompt >= 0 && Array.isArray(value.questions) && value.questions.length <= 24
    && value.questions.every(q => typeof q.question === 'string' && typeof q.answer === 'string')
    && integers(value.boxes, -1, 1, 12) && integers(value.deck, 0, 11, 12) && new Set(value.deck).size === 12
    && (value.pending === null || Number.isInteger(value.pending) && value.pending >= 0 && value.pending < 12)
    && Number.isInteger(value.position) && Math.abs(value.position) <= 4 && typeof value.finished === 'boolean'
    && Array.isArray(value.winners) && value.winners.every(i => Number.isInteger(i) && i >= 0 && i < value.teams.length)
    && typeof value.last === 'string' && ['luck', 'questions'].includes(value.mode);
}

export function createRound(kind, config, participants, extra = {}) {
  const members = shuffle(participants.map(studentId));
  return { id: globalThis.crypto?.randomUUID?.() || `round_${Date.now()}_${Math.random()}`, kind,
    teams: Array.from({ length: config.teamCount }, (_, i) => ({ name: config.names[i].trim() || TEAM_NAMES[i], ids: members.filter((_, index) => index % config.teamCount === i), score: 0, boost: false })),
    mode: config.mode, questions: parseQuestions(config.questions), turn: 0, turns: 0, prompt: 0,
    boxes: Array(12).fill(-1), deck: shuffle(Array.from({ length: 12 }, (_, i) => i)), pending: null,
    position: 0, finished: false, winners: [], last: 'Sẵn sàng! Cùng cổ vũ cho các tổ.', ...extra };
}

export const nextTurn = round => ({ ...round, turn: (round.turn + 1) % round.teams.length, turns: round.turns + 1, prompt: round.prompt + 1, pending: null });
export const scoreWinners = teams => {
  const best = Math.max(...teams.map(team => team.score));
  return best > 0 ? teams.flatMap((team, i) => team.score === best ? [i] : []) : [];
};
export const currentQuestion = round => round.questions.length ? round.questions[round.prompt % round.questions.length] : { question: 'Thầy cô đưa câu hỏi hoặc nhiệm vụ cho tổ đang chơi.', answer: '' };
