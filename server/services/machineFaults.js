import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db/connection.js';
import { MACHINE_COUNT, MACHINE_STATUSES, MACHINE_FAULT_CATEGORIES } from '../../shared/machineFaults.js';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
function validateMachine(number) {
  if (!Number.isInteger(number) || number < 1 || number > MACHINE_COUNT) fail('Số máy phải từ 1 đến 31.');
}
function readMachine(db, number) {
  const fault = db.prepare('SELECT * FROM broken_machines WHERE machine_number = ?').get(number) || null;
  const revision = db.prepare('SELECT COALESCE(MAX(id), 0) AS revision FROM machine_fault_history WHERE machine_number = ?').get(number).revision;
  return { machineNumber: number, revision, fault };
}
export function getMachineFaults() {
  const db = getDatabase();
  return { machines: Array.from({ length: MACHINE_COUNT }, (_, i) => readMachine(db, i + 1)) };
}
export function getMachineFaultHistory(number, before = 0) {
  validateMachine(number);
  if (!Number.isSafeInteger(before) || before < 0) fail('Mốc lịch sử không hợp lệ.');
  const rows = getDatabase().prepare(`SELECT * FROM machine_fault_history
    WHERE machine_number = ? AND (? = 0 OR id < ?) ORDER BY id DESC LIMIT 51`).all(number, before, before);
  return { events: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null };
}

// Synchronous transaction: fault, history, and revision are committed together.
function writeFault(db, number, input, current) {
  const now = new Date().toISOString();
  const normal = input.status === 'normal';
  const category = normal ? (current.fault?.category || 'other') : input.category;
  const note = normal ? (current.fault?.note || current.fault?.issue || '') : input.note;
  const reportedAt = current.fault?.reported_at || now;
  const event = normal ? 'resolved' : (current.fault ? 'updated' : 'reported');
  if (normal) db.prepare('DELETE FROM broken_machines WHERE machine_number = ?').run(number);
  else db.prepare(`INSERT INTO broken_machines (machine_number, issue, reported_at, status, category, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(machine_number) DO UPDATE SET
    issue = excluded.issue, status = excluded.status, category = excluded.category,
    note = excluded.note, updated_at = excluded.updated_at`).run(number, note || MACHINE_FAULT_CATEGORIES[category], reportedAt, input.status, category, note, now);
  db.prepare(`INSERT INTO machine_fault_history
    (machine_number, event, status, category, note, reported_at, recorded_at, operation_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(number, event, input.status, category, note, reportedAt, now, input.operationId);
}

export function saveMachineFault(number, input) {
  validateMachine(number);
  if (!input || !Object.hasOwn(MACHINE_STATUSES, input.status)) fail('Trạng thái máy không hợp lệ.');
  if (input.status !== 'normal' && !Object.hasOwn(MACHINE_FAULT_CATEGORIES, input.category)) fail('Loại lỗi không hợp lệ.');
  if (typeof input.note !== 'string' || input.note.length > 500 || input.note.includes('\0')) fail('Ghi chú tối đa 500 ký tự.');
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) fail('Thiếu phiên bản trạng thái máy. Hãy tải lại.');
  if (typeof input.operationId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(input.operationId)) fail('Mã thao tác không hợp lệ.');
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const receipt = db.prepare('SELECT * FROM machine_fault_history WHERE operation_id = ?').get(input.operationId);
    const current = readMachine(db, number);
    if (receipt) {
      if (receipt.machine_number !== number || receipt.status !== input.status ||
        (input.status !== 'normal' && (receipt.category !== input.category || receipt.note !== input.note.trim()))) fail('Mã thao tác đã được sử dụng cho nội dung khác.', 409);
    } else {
      if (current.revision !== input.expectedRevision) fail('Máy đã được cập nhật ở nơi khác. Hãy tải lại trạng thái trước khi lưu.', 409);
      if (input.status !== 'normal' || current.fault) writeFault(db, number, { ...input, note: input.note.trim() }, current);
    }
    const result = readMachine(db, number);
    db.exec('COMMIT;');
    return result;
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
}

// Compatibility for older clients: retain usable faults and never erase history.
export function reconcileBrokenMachines(numbers) {
  if (!Array.isArray(numbers)) fail('Danh sách máy không hợp lệ.');
  const desired = new Set(numbers.map(Number));
  for (const number of desired) validateMachine(number);
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE;');
  try {
    for (let number = 1; number <= MACHINE_COUNT; number++) {
      const current = readMachine(db, number);
      if (desired.has(number) && current.fault?.status !== 'unavailable') {
        writeFault(db, number, { status: 'unavailable', category: current.fault?.category || 'other', note: current.fault?.note || '', operationId: randomUUID() }, current);
      } else if (!desired.has(number) && current.fault?.status === 'unavailable') {
        writeFault(db, number, { status: 'normal', operationId: randomUUID() }, current);
      }
    }
    db.exec('COMMIT;');
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
}
