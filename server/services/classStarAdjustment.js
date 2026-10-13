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
  const selected = body.selectedStudentIds;
  if (selected !== undefined && (!Array.isArray(selected) || !selected.length || selected.length > 1000
    || selected.some(id => typeof id !== 'string' || !expectedStudentIds.includes(id))
    || new Set(selected).size !== selected.length)) fail('Chọn ít nhất một học sinh đang có trong lớp.');
  const source = selected ? 'GROUP_BATCH' : 'CLASS_BATCH';
  const reason = body.reason?.trim() || (amount > 0 ? 'Cộng sao' : 'Trừ sao') + (selected ? ' nhóm học sinh' : ' cả lớp');
  const fingerprint = createHash('sha256').update(JSON.stringify({
    classId, amount, reason, semester, date, studentIds: [...expectedStudentIds].sort(),
    ...(selected ? { selectedStudentIds: [...selected].sort() } : {}),
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
        (id, student_id, class_id, amount, reason, source, session_id) VALUES (?, ?, ?, ?, ?, ?, NULL)`);
      const timestamp = new Date().toISOString();
      const records = [];
      let changedCount = 0;
      let totalChange = 0;
      const targets = selected ? students.filter(s => selected.includes(String(s.id))) : students;
      for (const student of targets) {
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
        ledger.run(recordId, student.id, classId, delta, reason, source);
        if (delta !== 0) {
          changedCount++;
          totalChange += delta;
          records.push({ id: recordId, studentId: student.id, studentName: student.name,
            date, timestamp, semester, title: reason, type: delta > 0 ? 'positive' : 'negative',
            points: Math.abs(delta), scoreChange: delta, operationId, requestedAmount: amount,
            source });
        }
        student.stars = after;
      }
      merits.unshift(...records);
      db.prepare('UPDATE classes SET good_scores = ? WHERE id = ?').run(JSON.stringify(merits), classId);
      result = { success: true, operationId, classId, amount, studentCount: targets.length, changedCount, totalChange, source };
      db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(receiptKey, JSON.stringify({ fingerprint, result,
        studentIds: targets.map(s => String(s.id)), date, semester, reason }));
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

function latestBatch(db, classId) {
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key LIKE 'class_star_batch:%' ORDER BY rowid DESC").all();
  for (const row of rows) {
    try {
      const receipt = JSON.parse(row.value);
      if (receipt.result?.classId === classId && !receipt.undoneBy) return { ...receipt, key: row.key };
    } catch { /* A malformed unrelated receipt is not an undo candidate. */ }
  }
  return null;
}

export function getLatestClassStarBatch(classId) {
  if (typeof classId !== 'string' || !classId.trim()) fail('Chọn lớp học.');
  const latest = latestBatch(getDatabase(), classId);
  return { batch: latest ? { operationId: latest.result.operationId, amount: latest.result.amount,
    studentCount: latest.result.studentCount, totalChange: latest.result.totalChange,
    reason: latest.reason || 'Điều chỉnh sao cả lớp', date: latest.date || '', source: latest.result.source || 'CLASS_BATCH' } : null };
}

/** Reverse actual deltas, not requested amounts. Later rewards are preserved. */
export function undoClassStars(body) {
  if (!body || typeof body.classId !== 'string' || !body.classId.trim()
    || typeof body.operationId !== 'string' || !/^[a-zA-Z0-9_-]{10,80}$/.test(body.operationId)
    || typeof body.targetOperationId !== 'string' || !/^[a-zA-Z0-9_-]{10,80}$/.test(body.targetOperationId)
    || body.confirmed !== true) fail('Thiếu xác nhận hoặc thông tin hoàn tác.');
  const { classId, operationId, targetOperationId } = body;
  const key = `class_star_undo:${operationId}`;
  const fingerprint = createHash('sha256').update(JSON.stringify({ classId, targetOperationId })).digest('hex');
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE');
  try {
    const saved = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    const previous = saved ? JSON.parse(saved.value) : null;
    if (previous && previous.fingerprint !== fingerprint) fail('Mã hoàn tác đã dùng cho lượt khác.', 409);
    const classroom = db.prepare('SELECT name, good_scores FROM classes WHERE id = ?').get(classId);
    if (!classroom) fail('Không tìm thấy lớp.', 404);
    const students = db.prepare('SELECT id, name, stars FROM students WHERE class_id = ? ORDER BY rowid').all(classId);
    const merits = readMerits(classroom.good_scores);
    let result = previous?.result;
    if (!previous) {
      const original = latestBatch(db, classId);
      if (!original || original.result.operationId !== targetOperationId) fail('Lượt sao gần nhất đã thay đổi hoặc đã hoàn tác. Hãy tải lại.', 409);
      const oldRecords = merits.filter(record => record.operationId === targetOperationId && record.source !== 'BATCH_UNDO');
      // Version 1.8 receipts lack studentIds; their zero-delta attempts can be
      // reconstructed from deterministic ledger IDs without changing balances.
      const hasOriginalEntry = db.prepare('SELECT 1 FROM star_transactions WHERE id = ? AND class_id = ?');
      const targetIds = original.studentIds || students.filter(s => hasOriginalEntry.get(
        `CLASS_BATCH_${createHash('sha256').update(JSON.stringify([targetOperationId, s.id])).digest('hex')}`, classId)).map(s => String(s.id));
      if (targetIds.length !== original.result.studentCount) fail('Danh sách học sinh của lượt gốc đã thay đổi. Không thể hoàn tác an toàn.', 409);
      const ledger = db.prepare('SELECT amount FROM star_transactions WHERE id = ? AND class_id = ? AND student_id = ?');
      const insert = db.prepare(`INSERT INTO star_transactions (id, student_id, class_id, amount, reason, source, session_id) VALUES (?, ?, ?, ?, ?, 'BATCH_UNDO', NULL)`);
      const update = db.prepare('UPDATE students SET stars = ? WHERE id = ? AND class_id = ?');
      const timestamp = new Date().toISOString();
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const reason = `Hoàn tác: ${original.reason || 'Điều chỉnh sao cả lớp'}`.slice(0, 300);
      let totalChange = 0; let changedCount = 0;
      const records = [];
      for (const studentId of targetIds) {
        const student = students.find(s => String(s.id) === studentId);
        const transactionId = `CLASS_BATCH_${createHash('sha256').update(JSON.stringify([targetOperationId, studentId])).digest('hex')}`;
        const entry = ledger.get(transactionId, classId, studentId);
        if (!student || !entry || !Number.isSafeInteger(entry.amount)) fail('Thiếu nhật ký hoặc học sinh của lượt gốc. Không thể hoàn tác an toàn.', 409);
        const delta = -entry.amount;
        const before = Number(student.stars ?? 0); const after = before + delta;
        if (!Number.isSafeInteger(before) || !Number.isSafeInteger(after) || after < 0) fail('Sao của một học sinh đã được sử dụng hoặc điều chỉnh. Hoàn tác sẽ làm số sao âm nên chưa thực hiện.', 409);
        const id = `BATCH_UNDO_${createHash('sha256').update(JSON.stringify([operationId, studentId])).digest('hex')}`;
        insert.run(id, studentId, classId, delta, reason);
        update.run(after, studentId, classId);
        if (delta) {
          totalChange += delta; changedCount++;
          records.push({ id, studentId, studentName: student.name, date, timestamp,
            semester: original.semester || oldRecords[0]?.semester || 'hk1', title: reason,
            type: delta > 0 ? 'positive' : 'negative', points: Math.abs(delta), scoreChange: delta,
            operationId, reversesOperationId: targetOperationId, source: 'BATCH_UNDO' });
        }
        student.stars = after;
      }
      merits.unshift(...records);
      db.prepare('UPDATE classes SET good_scores = ? WHERE id = ?').run(JSON.stringify(merits), classId);
      const { key: originalKey, ...storedOriginal } = original;
      db.prepare('UPDATE app_settings SET value = ? WHERE key = ?').run(JSON.stringify({ ...storedOriginal, undoneBy: operationId }), originalKey);
      result = { success: true, operationId, classId, targetOperationId, studentCount: targetIds.length, changedCount, totalChange, source: 'BATCH_UNDO' };
      db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(key, JSON.stringify({ fingerprint, result }));
    }
    db.exec('COMMIT');
    return { ...result, className: classroom.name, replayed: Boolean(previous),
      balances: students.map(s => ({ studentId: s.id, newBalance: Number(s.stars ?? 0) })), goodScores: merits };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function readClassStarGroups(classId) {
  const db = getDatabase();
  if (!db.prepare('SELECT 1 FROM classes WHERE id = ?').get(classId)) fail('Không tìm thấy lớp.', 404);
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(`class_star_groups:${classId}`);
  if (!row) return { version: 0, groups: [] };
  try {
    const value = JSON.parse(row.value);
    if (Number.isInteger(value.version) && value.version >= 0 && Array.isArray(value.groups) && value.groups.length <= 50
      && value.groups.every(group => group && typeof group.id === 'string' && typeof group.name === 'string'
        && Array.isArray(group.studentIds) && group.studentIds.every(id => typeof id === 'string'))) return value;
  } catch { /* Do not silently replace corrupt group settings. */ }
  fail('Dữ liệu nhóm không hợp lệ. Hãy khôi phục dữ liệu.', 409);
}

export function saveClassStarGroups(body) {
  if (!body || typeof body.classId !== 'string' || !body.classId || !Number.isInteger(body.version)
    || !Array.isArray(body.groups) || body.groups.length > 50) fail('Thông tin nhóm không hợp lệ.');
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = readClassStarGroups(body.classId);
    if (current.version !== body.version) fail('Danh sách nhóm đã thay đổi. Đóng và mở lại để tải dữ liệu mới.', 409);
    const ids = new Set(db.prepare('SELECT id FROM students WHERE class_id = ?').all(body.classId).map(s => String(s.id)));
    const groups = body.groups.map(group => {
      if (!group || typeof group.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(group.id)
        || typeof group.name !== 'string' || !group.name.trim() || group.name.trim().length > 80
        || !Array.isArray(group.studentIds) || !group.studentIds.length || group.studentIds.length > 1000
        || group.studentIds.some(id => typeof id !== 'string' || !ids.has(id))
        || new Set(group.studentIds).size !== group.studentIds.length) fail('Tên nhóm hoặc học sinh của nhóm không hợp lệ.');
      return { id: group.id, name: group.name.trim(), studentIds: group.studentIds };
    });
    if (new Set(groups.map(g => g.id)).size !== groups.length) fail('Mã nhóm không được trùng nhau.');
    const result = { version: current.version + 1, groups };
    db.prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(`class_star_groups:${body.classId}`, JSON.stringify(result));
    db.exec('COMMIT'); return result;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
