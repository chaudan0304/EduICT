import fs from 'node:fs';
import path from 'node:path';
import { linkedPowerPointMetadata } from './linkedPowerPoint.js';

function validSource(file) {
  return typeof file === 'string' && file.length <= 1024 && /^[A-Za-z]:[\\/]/.test(file)
    && !/[<>"|?*]/.test(file) && ![...file].some(c => c.charCodeAt(0) < 32)
    && file.indexOf(':', 2) === -1 && ['.ppt', '.pptx'].includes(path.win32.extname(file).toLowerCase());
}

export function checkLinkedPresentationFiles(lessons, stat = fs.statSync) {
  return lessons.filter(l => l.type === 'linked_powerpoint').map(lesson => {
    const base = { id: lesson.id };
    if (!validSource(lesson.source_file_path)) return { ...base, state: 'invalid' };
    try {
      const file = stat(lesson.source_file_path);
      if (!file.isFile()) return { ...base, state: 'invalid' };
      return { ...base, state: lesson.source_file_size > 0 && Number(lesson.source_file_size) !== file.size ? 'changed' : 'ok', size: file.size };
    } catch (error) { return { ...base, state: ['ENOENT', 'ENOTDIR'].includes(error.code) ? 'missing' : 'unavailable' }; }
  });
}

export function relinkPresentations(db, items, stat = fs.statSync) {
  const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
  if (!Array.isArray(items) || !items.length || items.length > 200) fail('Chọn từ 1 đến 200 bài để sửa liên kết.');
  const ids = new Set();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const item of items) {
      if (!item || typeof item.lessonId !== 'string' || ids.has(item.lessonId)) fail('Danh sách bài không hợp lệ hoặc bị trùng.');
      ids.add(item.lessonId);
      const lesson = db.prepare('SELECT * FROM lessons WHERE id=?').get(item.lessonId);
      if (!lesson || lesson.type !== 'linked_powerpoint') fail('Bài không còn là PowerPoint liên kết.', 409);
      if (lesson.source_file_path !== item.expectedPath) fail('Liên kết đã thay đổi ở cửa sổ khác. Hãy kiểm tra lại.', 409);
      if (!validSource(item.path)) fail('Đường dẫn PowerPoint mới không hợp lệ.');
      let file;
      try { file = stat(item.path); } catch { fail('Không đọc được file mới. Hãy chọn lại file trên máy.'); }
      if (!file.isFile()) fail('Đường dẫn đã chọn không phải là tệp.');
      const metadata = linkedPowerPointMetadata({ source_file_path: item.path, source_file_size: file.size }, lesson);
      db.prepare('UPDATE lessons SET source_file_path=?, source_file_name=?, source_filename=?, source_file_size=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(metadata.source_file_path, metadata.source_file_name, metadata.source_file_name, file.size, item.lessonId);
    }
    db.exec('COMMIT');
    return { success: true, updated: items.length };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
