// starLedger — client helper cộng ⭐ SAO THƯỞNG qua sổ cái gamification.
//
// Mục tiêu (gộp sổ cái sao — option 1b): mọi nguồn cộng sao thưởng (trò chơi,
// sơ đồ chỗ ngồi, trình chiếu, Quick Quiz, tham gia tiết học) đều đi qua MỘT
// cổng server /api/gamification/stars/award -> ghi star_transactions + cập nhật
// students.stars, rồi trả newBalance để client đồng bộ lại số dư cục bộ.
//
// Vì sao phải qua server thay vì tự cộng vào mảng students: nguồn off-ledger
// trước đây sửa student.stars trực tiếp rồi lưu cả bảng (full-row reinsert) ->
// dễ ghi đè số dư server bằng giá trị cũ. Lấy newBalance từ server loại bỏ bẫy
// đó và giữ star_transactions làm nguồn sự thật duy nhất.
//
// LƯU Ý: endpoint award CHỈ nhận số nguyên dương 1..100 (chống tự thưởng sao
// tùy ý). Các điều chỉnh GIẢM sao thủ công KHÔNG dùng helper này.
// Điểm tốt / nội quy (goodScores, "Sao Thi Đua") là hệ RIÊNG, không đi qua đây.

import apiClient from '../services/apiClient';

let _seq = 0;
function makeTxId(source, studentId) {
  _seq = (_seq + 1) % 1_000_000;
  return `${source || 'AWARD'}_${studentId}_${Date.now()}_${_seq}`;
}

/**
 * Cộng sao thưởng cho 1 học sinh qua sổ cái server.
 * @returns {Promise<number>} số dư sao mới (newBalance) do server trả về.
 * @throws {Error} nếu thiếu dữ liệu, số sao không hợp lệ, hoặc lỗi server.
 */
export async function awardStars({ studentId, classId, amount, reason, source, sessionId = null, id } = {}) {
  if (!studentId || !classId) {
    throw new Error('Thiếu studentId hoặc classId khi cộng sao.');
  }
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < 1 || amt > 100) {
    throw new Error('Số sao thưởng phải là số nguyên trong khoảng 1–100.');
  }
  const payload = {
    id: id || makeTxId(source, studentId),
    studentId,
    classId,
    amount: amt,
    reason: reason || 'Thưởng sao',
    source: source || 'AWARD',
    sessionId: sessionId || null,
  };
  const data = await apiClient.post('/api/gamification/stars/award', payload);
  return data?.newBalance;
}

/**
 * Trả về mảng students mới với số dư sao của 1 học sinh được cập nhật từ server.
 * Dùng ngay sau awardStars() để đồng bộ state cục bộ với newBalance.
 */
export function applyNewBalance(students, studentId, newBalance) {
  if (typeof newBalance !== 'number') return students;
  return (students || []).map(s => (String(s.id) === String(studentId) ? { ...s, stars: newBalance } : s));
}

/**
 * Điều chỉnh sao có DẤU (dương = cộng, âm = trừ) qua /adjust — dùng cho chỉnh
 * tay của giáo viên và badge nội quy âm. Nhận số nguyên khác 0 trong -100..100.
 * @returns {Promise<number>} newBalance.
 */
export async function adjustStars({ studentId, classId, amount, reason, source, sessionId = null, id } = {}) {
  if (!studentId || !classId) {
    throw new Error('Thiếu studentId hoặc classId khi điều chỉnh sao.');
  }
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt === 0 || amt < -100 || amt > 100) {
    throw new Error('Số sao điều chỉnh phải là số nguyên khác 0, trong khoảng -100..100.');
  }
  const payload = {
    id: id || makeTxId(source || 'ADJUST', studentId),
    studentId,
    classId,
    amount: amt,
    reason: reason || 'Điều chỉnh sao',
    source: source || 'ADJUST',
    sessionId: sessionId || null,
  };
  const data = await apiClient.post('/api/gamification/stars/adjust', payload);
  return data?.newBalance;
}

/**
 * Thay đổi sao theo delta có dấu: amount > 0 -> awardStars (cộng thưởng),
 * amount < 0 -> adjustStars (trừ). Tiện cho các site cộng/trừ (+/-) 1 chỗ.
 * @returns {Promise<number>} newBalance.
 */
export async function changeStars(opts = {}) {
  const amt = Number(opts.amount);
  if (amt >= 1) return awardStars(opts);
  return adjustStars(opts);
}
