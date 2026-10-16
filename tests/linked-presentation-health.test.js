import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

test('linked files: distinguish missing, unavailable, changed and invalid paths', async () => {
  const { checkLinkedPresentationFiles } = await import('../server/services/linkedPresentationHealth.js');
  const lessons = [
    { id: 'ok', type: 'linked_powerpoint', source_file_path: 'D:\\Slides\\ok.pptx', source_file_size: 10 },
    { id: 'changed', type: 'linked_powerpoint', source_file_path: 'D:\\Slides\\changed.pptx', source_file_size: 20 },
    { id: 'missing', type: 'linked_powerpoint', source_file_path: 'D:\\Slides\\missing.pptx' },
    { id: 'denied', type: 'linked_powerpoint', source_file_path: 'D:\\Slides\\denied.pptx' },
    { id: 'invalid', type: 'linked_powerpoint', source_file_path: '\\\\server\\private.pptx' },
    { id: 'online', type: 'powerpoint_online' },
  ];
  let calls = 0;
  const stat = file => { calls++; if (file.includes('missing')) throw Object.assign(new Error(), { code: 'ENOENT' }); if (file.includes('denied')) throw Object.assign(new Error(), { code: 'EACCES' }); return { isFile: () => true, size: 10 }; };
  const result = checkLinkedPresentationFiles(lessons, stat);
  assert.deepEqual(result.map(item => item.state), ['ok', 'changed', 'missing', 'unavailable', 'invalid']);
  assert.equal(calls, 4);
});

test('linked files: batch relink is atomic and rejects stale paths without overwriting another edit', async () => {
  const { relinkPresentations } = await import('../server/services/linkedPresentationHealth.js');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE lessons (id TEXT PRIMARY KEY, type TEXT, title TEXT, grade INTEGER, source_file_path TEXT, source_file_name TEXT, source_filename TEXT, source_file_size INTEGER, updated_at TEXT)');
  const insert = db.prepare('INSERT INTO lessons (id,type,title,grade,source_file_path) VALUES (?,?,?,?,?)');
  insert.run('a', 'linked_powerpoint', 'Bài A', 1, 'D:\\old\\a.pptx');
  insert.run('b', 'linked_powerpoint', 'Bài B', 1, 'D:\\old\\b.pptx');
  const stat = () => ({ isFile: () => true, size: 42 });
  try {
    assert.throws(() => relinkPresentations(db, [
      { lessonId: 'a', expectedPath: 'D:\\old\\a.pptx', path: 'E:\\new\\a.pptx' },
      { lessonId: 'b', expectedPath: 'stale', path: 'E:\\new\\b.pptx' },
    ], stat), /thay đổi/);
    assert.equal(db.prepare("SELECT source_file_path FROM lessons WHERE id='a'").get().source_file_path, 'D:\\old\\a.pptx');
    const result = relinkPresentations(db, [{ lessonId: 'a', expectedPath: 'D:\\old\\a.pptx', path: 'E:\\new\\a.pptx' }], stat);
    assert.equal(result.updated, 1);
    assert.equal(db.prepare("SELECT source_file_path FROM lessons WHERE id='a'").get().source_file_path, 'E:\\new\\a.pptx');
  } finally { db.close(); }
});
