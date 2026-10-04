import { sendJson, parseJsonBody } from './helpers.js';
import {
  awardStar,
  adjustStars,
  getStarHistory,
  getAllRewards,
  redeemReward,
  getRedemptionHistory
} from '../db.js';

export async function tryHandleGamification(req, res, ctx) {
  const { pathname, method } = ctx;

  // 1. STAR SYSTEM
  if (pathname === '/api/gamification/stars/award' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { id, studentId, classId, amount, reason, source, sessionId } = body;
      if (!id || !studentId || !classId || !amount || !reason || !source) {
        return sendJson(res, 400, { error: 'Thiếu thông tin bắt buộc để tặng sao.' });
      }
      // Chặn số sao bất thường do client gửi (chống tự thưởng sao tùy ý)
      const amt = Number(amount);
      if (!Number.isInteger(amt) || amt < 1 || amt > 100) {
        return sendJson(res, 400, { error: 'Số sao không hợp lệ (chỉ nhận số nguyên 1–100).' });
      }
      const result = awardStar({ id, studentId, classId, amount: amt, reason, source, sessionId });
      if (!result.success) {
        return sendJson(res, 409, { error: result.message });
      }
      return sendJson(res, 200, result);
    } catch (e) {
      console.error('Lỗi khi tặng sao:', e);
      return sendJson(res, e.statusCode || 400, { error: e.message || 'Lỗi server.' });
    }
  }

  // 1b. ĐIỀU CHỈNH SAO CÓ DẤU (giáo viên chỉnh tay +/- , badge nội quy âm)
  if (pathname === '/api/gamification/stars/adjust' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { id, studentId, classId, amount, reason, source, sessionId } = body;
      if (!id || !studentId || !classId || amount === undefined || amount === null || !reason || !source) {
        return sendJson(res, 400, { error: 'Thiếu thông tin bắt buộc để điều chỉnh sao.' });
      }
      const amt = Number(amount);
      if (!Number.isInteger(amt) || amt === 0 || amt < -100 || amt > 100) {
        return sendJson(res, 400, { error: 'Số sao điều chỉnh không hợp lệ (số nguyên khác 0, trong khoảng -100..100).' });
      }
      const result = adjustStars({ id, studentId, classId, amount: amt, reason, source, sessionId });
      if (!result.success) {
        return sendJson(res, 409, { error: result.message });
      }
      return sendJson(res, 200, result);
    } catch (e) {
      console.error('Lỗi khi điều chỉnh sao:', e);
      return sendJson(res, e.statusCode || 400, { error: e.message || 'Lỗi server.' });
    }
  }

  if (pathname.startsWith('/api/gamification/stars/history/') && method === 'GET') {
    try {
      const parts = pathname.split('/');
      const classId = parts[5];
      const studentId = parts[6];
      if (!classId || !studentId) return sendJson(res, 400, { error: 'Invalid URL' });
      const history = getStarHistory(studentId, classId);
      return sendJson(res, 200, history);
    } catch (e) {
      console.error('Lỗi lấy lịch sử sao:', e);
      return sendJson(res, e.statusCode || 500, { error: 'Lỗi server.' });
    }
  }

  // 2. REWARD SYSTEM
  if (pathname === '/api/gamification/rewards' && method === 'GET') {
    try {
      const rewards = getAllRewards();
      return sendJson(res, 200, rewards);
    } catch (e) {
      console.error('Lỗi lấy phần thưởng:', e);
      return sendJson(res, e.statusCode || 500, { error: 'Lỗi server.' });
    }
  }

  if (pathname === '/api/gamification/rewards/redeem' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { id, studentId, classId, rewardId, sessionId } = body;
      if (!id || !studentId || !classId || !rewardId) {
        return sendJson(res, 400, { error: 'Thiếu thông tin bắt buộc để đổi quà.' });
      }
      const result = redeemReward({ id, studentId, classId, rewardId, sessionId });
      if (!result.success) {
        return sendJson(res, 409, { error: result.message });
      }
      return sendJson(res, 200, result);
    } catch (e) {
      console.error('Lỗi đổi quà:', e);
      return sendJson(res, e.statusCode || 400, { error: e.message || 'Lỗi server.' });
    }
  }

  if (pathname.startsWith('/api/gamification/rewards/history/') && method === 'GET') {
    try {
      const parts = pathname.split('/');
      const classId = parts[5];
      const studentId = parts[6];
      if (!classId || !studentId) return sendJson(res, 400, { error: 'Invalid URL' });
      const history = getRedemptionHistory(studentId, classId);
      return sendJson(res, 200, history);
    } catch (e) {
      console.error('Lỗi lấy lịch sử đổi quà:', e);
      return sendJson(res, e.statusCode || 500, { error: 'Lỗi server.' });
    }
  }

  return false;
}
