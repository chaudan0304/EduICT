import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { getDatabase } from '../db/connection.js';
import { getUploadsDir } from './pathService.js';

const slots = new Set(['roster', 'gifts', 'train', 'treasure', 'arcade-v2:gifts', 'arcade-v2:tug', 'arcade-v2:puzzle', 'process-train-v1', 'sleeping-dragon-v1', 'picture-file']);
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function classKey(classId) {
  if (typeof classId !== 'string' || !classId || classId.length > 150) fail('Lớp học không hợp lệ.');
  if (!getDatabase().prepare('SELECT 1 FROM classes WHERE id = ?').get(classId)) fail('Lớp học không còn tồn tại.', 404);
  return `classroom_activity:${classId}`;
}
function read(key) {
  const row = getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  if (!row) return { version: null, updatedAt: null, states: {} };
  const value = JSON.parse(row.value);
  if (!value || typeof value.version !== 'string' || !value.states || Array.isArray(value.states) || typeof value.states !== 'object') fail('Dữ liệu trò chơi chưa đọc được. Hãy khôi phục từ bản sao lưu.', 500);
  return value;
}
export function readActivities(classId) { return read(classKey(classId)); }
export function saveActivities(body) {
  const key = classKey(body?.classId);
  if (body.expectedVersion !== null && (typeof body.expectedVersion !== 'string' || body.expectedVersion.length > 80)) fail('Thiếu phiên bản dữ liệu trước khi lưu.');
  if (!body.states || typeof body.states !== 'object' || Array.isArray(body.states) || Object.keys(body.states).some(slot => !slots.has(slot))) fail('Thiết lập trò chơi không hợp lệ.');
  if (Buffer.byteLength(JSON.stringify(body.states)) > 1024 * 1024) fail('Tiến độ trò chơi vượt quá 1 MB cho một lớp.', 413);
  const db = getDatabase(); db.exec('BEGIN IMMEDIATE');
  try {
    const old = read(key);
    if (old.version !== body.expectedVersion) { db.exec('ROLLBACK'); return { conflict: true, current: old }; }
    const next = { version: randomUUID(), updatedAt: new Date().toISOString(), states: body.states };
    db.prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(next));
    db.exec('COMMIT'); return next;
  } catch (error) { try { db.exec('ROLLBACK'); } catch { /* Already rolled back. */ } throw error; }
}

export function saveActivityPicture(body) {
  classKey(body?.classId);
  const match = typeof body.dataUrl === 'string' && body.dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) fail('Chỉ chọn ảnh PNG, JPG hoặc WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) fail('Ảnh tối đa 3 MB.', 413);
  const type = match[1];
  const valid = type === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : type === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (!valid) fail('Nội dung tệp không đúng định dạng ảnh.');
  const fingerprint = createHash('sha256').update(bytes).digest('hex');
  if (body.expectedFingerprint && body.expectedFingerprint !== fingerprint) fail('Ảnh khác ảnh của ván đang chơi. Hãy chọn đúng ảnh hoặc tạo ván mới.');
  const name = `${fingerprint}.${type === 'jpeg' ? 'jpg' : type}`;
  const directory = path.join(getUploadsDir(), 'classroom-games'); fs.mkdirSync(directory, { recursive: true });
  try { fs.writeFileSync(path.join(directory, name), bytes, { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  return { src: `/uploads/classroom-games/${name}`, fingerprint, name: typeof body.name === 'string' ? body.name.slice(0, 200) : 'Ảnh lớp học' };
}
