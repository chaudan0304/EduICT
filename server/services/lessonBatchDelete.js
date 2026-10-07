import { getDatabase } from '../db/connection.js';
import { deleteLesson } from '../db/lessons.js';
import { deleteLessonPresentationsDir } from '../pptxService.js';

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };

// Delete library records together; never delete linked local files or cloud files.
export function deleteLessonsBatch(body) {
  if (body?.confirm !== true || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 200) fail('Hãy xác nhận xóa từ 1 đến 200 bài mỗi đợt.');
  const ids = body.ids;
  if (ids.some(id => typeof id !== 'string' || !id.trim() || id.length > 200 || /[/\\]/.test(id) || Array.from(id).some(char => char.charCodeAt(0) < 32) || id === '.' || id === '..') || new Set(ids).size !== ids.length) fail('Danh sách bài không hợp lệ hoặc bị chọn trùng.');
  const db = getDatabase();
  const get = db.prepare('SELECT id, type, render_status, import_status FROM lessons WHERE id = ?');
  let lessons;
  let referencedSessions = 0;
  db.exec('BEGIN IMMEDIATE;');
  try {
    lessons = ids.map(id => {
      const lesson = get.get(id);
      if (!lesson) fail('Một bài đã bị xóa. Hãy tải lại Thư viện và chọn lại; chưa xóa bài nào trong đợt này.', 409);
      if (lesson.render_status === 'processing' || lesson.import_status === 'IMPORTING') fail('Có bài đang nhập hoặc xử lý slide. Hãy đợi hoàn tất rồi xóa; chưa xóa bài nào trong đợt này.', 409);
      return lesson;
    });
    for (const lesson of lessons) referencedSessions += deleteLesson(lesson.id).referencedSessions;
    db.exec('COMMIT;');
  } catch (err) { db.exec('ROLLBACK;'); throw err; }

  // Files cannot share a SQLite transaction. Report cleanup failures after commit.
  const cleanupWarnings = [];
  for (const lesson of lessons) {
    if (lesson.type === 'linked_powerpoint' || lesson.type === 'powerpoint_online') continue;
    if (!deleteLessonPresentationsDir(lesson.id)) cleanupWarnings.push(lesson.id);
  }
  return { deletedIds: ids, deleted: ids.length, referencedSessions, cleanupWarnings };
}
