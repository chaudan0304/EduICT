import { getDatabase } from '../db/connection.js';
import { createLesson } from '../db/lessons.js';
import { normalizePowerPointEmbed } from '../../shared/powerPointOnline.js';
import { MAX_ONLINE_BATCH_ITEMS } from '../../shared/powerPointOnlineBatch.js';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/lessons/powerpoint-online/batch
 * { items: [{ online_embed_url, lesson_id, expected_url, expected_updated_at,
 *             replace_existing } | { online_embed_url, new_id: UUIDv4, title, grade }] }
 * Returns { lessons, created, updated, unchanged }. All writes commit together.
 * Stable new_id makes retrying a committed request safe after a lost response.
 */
export function savePowerPointOnlineBatch(body, { sourceRefs = new Map() } = {}) {
  if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > MAX_ONLINE_BATCH_ITEMS) {
    fail('Danh sách cần có từ 1 đến 200 bài.');
  }
  const ids = new Set();
  const urls = new Set();
  const items = body.items.map((item, index) => {
    const prefix = `Dòng ${index + 1}: `;
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail(prefix + 'Dữ liệu không hợp lệ.');
    let url;
    try { url = normalizePowerPointEmbed(item.online_embed_url); }
    catch (err) { fail(prefix + err.message); }
    if (urls.has(url)) fail(prefix + 'Liên kết trùng với một dòng khác trong danh sách.');
    urls.add(url);
    const existing = typeof item.lesson_id === 'string' && item.lesson_id.length > 0;
    let id;
    if (existing) {
      if (item.lesson_id.length > 200 || item.new_id !== undefined) fail(prefix + 'Bài được chọn không hợp lệ.');
      id = item.lesson_id;
      if (typeof item.expected_url !== 'string' || item.expected_url.length > 8192 || typeof item.expected_updated_at !== 'string' || item.expected_updated_at.length > 100) fail(prefix + 'Hãy tải lại danh sách bài trước khi lưu.');
    } else {
      if (item.lesson_id !== undefined || typeof item.new_id !== 'string' || !uuidPattern.test(item.new_id)) fail(prefix + 'Mã bài mới không hợp lệ.');
      id = `online_${item.new_id}`;
      if (typeof item.title !== 'string' || !item.title.trim() || item.title.trim().length > 250 || !Number.isInteger(item.grade) || item.grade < 1 || item.grade > 5) fail(prefix + 'Hãy nhập tên bài và chọn khối từ 1 đến 5.');
    }
    if (ids.has(id)) fail(prefix + 'Một bài chỉ được chọn một lần trong danh sách.');
    ids.add(id);
    return { ...item, id, existing, url, prefix };
  });

  const db = getDatabase();
  const get = db.prepare('SELECT * FROM lessons WHERE id = ?');
  const update = db.prepare("UPDATE lessons SET online_embed_url = ?, onedrive_drive_id = '', onedrive_item_id = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const source = db.prepare('UPDATE lessons SET onedrive_drive_id = ?, onedrive_item_id = ? WHERE id = ?');
  const result = { lessons: [], created: 0, updated: 0, unchanged: 0 };
  db.exec('BEGIN IMMEDIATE;');
  try {
    // Check every target before writing any rows. The write lock prevents races.
    const operations = items.map(item => {
      const current = get.get(item.id);
      if (item.existing) {
        if (!current) fail(item.prefix + 'Bài đã bị xóa. Hãy tải lại danh sách.', 409);
        if ((current.online_embed_url || '') === item.url) return { item, action: 'unchanged' };
        if ((current.online_embed_url || '') !== item.expected_url || (current.updated_at || '') !== item.expected_updated_at) fail(item.prefix + 'Bài đã thay đổi. Hãy tải lại danh sách và kiểm tra lựa chọn.', 409);
        if (current.online_embed_url && item.replace_existing !== true) fail(item.prefix + 'Cần xác nhận thay liên kết Online đang có.');
        return { item, action: 'updated' };
      }
      if (current) {
        if (current.type !== 'powerpoint_online' || current.online_embed_url !== item.url || current.title !== item.title.trim() || Number(current.grade) !== item.grade) fail(item.prefix + 'Mã bài đã được sử dụng. Hãy lập lại danh sách.', 409);
        return { item, action: 'unchanged' };
      }
      return { item, action: 'created' };
    });
    for (const { item, action } of operations) {
      if (action === 'updated') update.run(item.url, item.id);
      if (action === 'created') createLesson({ id: item.id, type: 'powerpoint_online', title: item.title.trim(), grade: item.grade, online_embed_url: item.url });
      const ref = sourceRefs.get(item.id);
      if (ref) source.run(ref.driveId, ref.itemId, item.id);
      result[action]++;
      result.lessons.push(get.get(item.id));
    }
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
