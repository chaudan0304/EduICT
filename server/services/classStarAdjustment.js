import { createHash } from 'node:crypto';
import { getDatabase } from '../db/connection.js';

function fail(message, statusCode = 400) {
  throw Object.assign(new Error(message), { statusCode });
}

function readMerits(value) {
  try {
    const records = JSON.parse(value || '[]');
    if (Array.isArray(records)) return records;
  } catch { /* Preserve invalid stored data instead of replacing it. */ }
  fail('Nhật ký sao của lớp không hợp lệ. Hãy khôi phục dữ liệu trước khi tiếp tục.', 409);
}

/**
 * Apply one confirmed signed adjustment to the entire, unchanged class roster.
 * Balances, individual ledger entries, merit history and the retry receipt are
 * committed together. Reusing operationId with the same payload never reapplies.
 */
export function adjustClassStars(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Thiếu thông tin điều chỉnh sao.');
  const { operationId, classId, amount, semester, date, expectedStudentIds, confirmed } = body;
  if (typeof operationId !== 'string' || !/^[a-zA-Z0-9_-]{10,80}$/.test(operationId)) fail('Mã lượt điều chỉnh không hợp lệ.');
  if (typeof classId !== 'string' || !classId.trim() || classId.length > 200) fail('Lớp học không hợp lệ.');
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100) fail('Số sao phải là số nguyên khác 0, từ -100 đến 100.');
  if (confirmed !== true) fail('Cần xác nhận trước khi thay đổi sao cả lớp.');
  if (!['hk1', 'hk2'].includes(semester)) fail('Học kỳ không hợp lệ.');
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail('Ngày ghi nhận không hợp lệ.');
  if (!Array.isArray(expectedStudentIds) || !expectedStudentIds.length || expectedStudentIds.length > 1000
    || expectedStudentIds.some(id => typeof id !== 'string' || !id.trim() || id.length > 200)
    || new Set(expectedStudentIds).size !== expectedStudentIds.length) fail('Danh sách học sinh không hợp lệ.');
  if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 300)) fail('Lý do tối đa 300 ký tự.');
  const reason = body.reason?.trim() || (amount > 0 ? 'Cộng sao cả lớp' : 'Trừ sao cả lớp');
  const fingerprint = createHash('sha256').update(JSON.stringify({
    classId, amount, reason, semester, date, studentIds: [...expectedStudentIds].sort(),
  })).digest('hex');
  const receiptKey = `class_star_batch:${operationId}`;
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE');
  try {
    const saved = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(receiptKey);
    const receipt = saved ? JSON.parse(saved.value) : null;
    if (receipt && receipt.fingerprint !== fingerprint) fail('Mã lượt điều chỉnh đã dùng cho thao tác khác.', 409);
    const classroom = db.prepare('SELECT id, name, good_scores FROM classes WHERE id = ?').get(classId);
    if (!classroom) fail('Không tìm thấy lớp học. Hãy tải lại danh sách lớp.', 404);
    const students = db.prepare('SELECT id, name, stars FROM students WHERE class_id = ? ORDER BY rowid').all(classId);
    const merits = readMerits(classroom.good_scores);
    const expected = new Set(expectedStudentIds);
    if (!receipt && (students.length !== expected.size || students.some(s => !expected.has(String(s.id))))) {
      fail('Danh sách học sinh đã thay đổi. Hãy tải lại lớp và xác nhận lại.', 409);
    }

    let result = receipt?.result;
    if (!receipt) {
      const update = db.prepare('UPDATE students SET stars = ? WHERE id = ? AND class_id = ?');
      const ledger = db.prepare(`INSERT INTO star_transactions
        (id, student_id, class_id, amount, reason, source, session_id) VALUES (?, ?, ?, ?, ?, 'CLASS_BATCH', NULL)`);
      const timestamp = new Date().toISOString();
      const records = [];
      let changedCount = 0;
      let totalChange = 0;
      for (const student of students) {
        const before = Number(student.stars ?? 0);
        if (!Number.isSafeInteger(before) || before < 0 || !Number.isSafeInteger(before + amount)) {
          fail('Số sao hiện có không hợp lệ. Hãy kiểm tra dữ liệu của lớp.', 409);
        }
        const after = Math.max(0, before + amount);
        const delta = after - before;
        const recordId = `CLASS_BATCH_${createHash('sha256').update(JSON.stringify([operationId, student.id])).digest('hex')}`;
        update.run(after, student.id, classId);
        // Include zero-delta attempts in the ledger, but not the merit board:
        // legacy merit consumers interpret zero points as one star.
        ledger.run(recordId, student.id, classId, delta, reason);
        if (delta !== 0) {
          changedCount++;
          totalChange += delta;
          records.push({ id: recordId, studentId: student.id, studentName: student.name,
            date, timestamp, semester, title: reason, type: delta > 0 ? 'positive' : 'negative',
            points: Math.abs(delta), scoreChange: delta, operationId, requestedAmount: amount,
            source: 'CLASS_BATCH' });
        }
        student.stars = after;
      }
      merits.unshift(...records);
      db.prepare('UPDATE classes SET good_scores = ? WHERE id = ?').run(JSON.stringify(merits), classId);
      result = { success: true, operationId, classId, amount, studentCount: students.length, changedCount, totalChange };
      db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(receiptKey, JSON.stringify({ fingerprint, result }));
    }
    // Return current values on a retry; an old receipt must not undo later awards.
    const response = { ...result, className: classroom.name, replayed: Boolean(receipt),
      balances: students.map(s => ({ studentId: s.id, newBalance: Number(s.stars ?? 0) })), goodScores: merits };
    db.exec('COMMIT');
    return response;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
