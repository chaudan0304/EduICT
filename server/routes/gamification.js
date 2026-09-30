import { sendJson, parseJsonBody } from './helpers.js';
import {
  awardStar,
  getStarHistory,
  getAllRewards,
  redeemReward,
  getRedemptionHistory,
  getAllChallenges,
  getStudentProgress,
  updateChallengeProgress
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
      const result = awardStar({ id, studentId, classId, amount, reason, source, sessionId });
      if (!result.success) {
        return sendJson(res, 409, { error: result.message });
      }
      return sendJson(res, 200, result);
    } catch (e) {
      console.error('Lỗi khi tặng sao:', e);
      return sendJson(res, 400, { error: e.message || 'Lỗi server.' });
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
      return sendJson(res, 500, { error: 'Lỗi server.' });
    }
  }

  // 2. REWARD SYSTEM
  if (pathname === '/api/gamification/rewards' && method === 'GET') {
    try {
      const rewards = getAllRewards();
      return sendJson(res, 200, rewards);
    } catch (e) {
      console.error('Lỗi lấy phần thưởng:', e);
      return sendJson(res, 500, { error: 'Lỗi server.' });
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
      return sendJson(res, 400, { error: e.message || 'Lỗi server.' });
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
      return sendJson(res, 500, { error: 'Lỗi server.' });
    }
  }

  // 3. CHALLENGE SYSTEM
  if (pathname === '/api/gamification/challenges' && method === 'GET') {
    try {
      const challenges = getAllChallenges();
      return sendJson(res, 200, challenges);
    } catch (e) {
      console.error('Lỗi lấy thử thách:', e);
      return sendJson(res, 500, { error: 'Lỗi server.' });
    }
  }

  if (pathname.startsWith('/api/gamification/challenges/progress/') && method === 'GET') {
    try {
      const parts = pathname.split('/');
      const classId = parts[5];
      const studentId = parts[6];
      if (!classId || !studentId) return sendJson(res, 400, { error: 'Invalid URL' });
      const progress = getStudentProgress(studentId, classId);
      return sendJson(res, 200, progress);
    } catch (e) {
      console.error('Lỗi lấy tiến độ thử thách:', e);
      return sendJson(res, 500, { error: 'Lỗi server.' });
    }
  }

  if (pathname === '/api/gamification/challenges/progress/update' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { studentId, classId, challengeId, amount } = body;
      if (!studentId || !classId || !challengeId) {
        return sendJson(res, 400, { error: 'Thiếu thông tin.' });
      }
      const result = updateChallengeProgress(studentId, classId, challengeId, amount || 1);
      return sendJson(res, 200, result);
    } catch (e) {
      console.error('Lỗi cập nhật tiến độ:', e);
      return sendJson(res, 400, { error: e.message || 'Lỗi server.' });
    }
  }

  return false;
}
