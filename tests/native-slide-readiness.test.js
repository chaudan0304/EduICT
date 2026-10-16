import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('native text slides are ready without rendered images; imported slides still require images', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-native-ready-'));
  process.env.EDUICT_APP_ROOT = root;
  process.env.EDUICT_DATA_DIR = root;
  process.env.EDUICT_DB_PATH = path.join(root, 'fixture.sqlite');
  const { createLesson, updateLesson } = await import('../server/db/lessons.js');
  const { closeConnection } = await import('../server/db/connection.js');
  try {
    const native = createLesson({ title: 'Text fixture', type: 'native', slides: [{ type: 'TITLE', title: 'Hello', render_status: 'pending' }, { type: 'CONTENT', content: 'Text' }] });
    assert.equal(native.render_status, 'ready');
    assert.equal(native.rendered_slides, 2);
    const imported = createLesson({ title: 'Imported fixture', type: 'imported', slides: [{ type: 'IMPORTED_SLIDE' }] });
    assert.equal(imported.render_status, 'processing');
    assert.equal(imported.rendered_slides, 0);
    const linked = createLesson({ title: 'Linked fixture', type: 'linked_powerpoint', source_file_path: 'D:\\fixture\\old.pptx' });
    assert.throws(() => updateLesson(linked.id, { title: 'Stale', expected_source_file_path: 'D:\\fixture\\other.pptx' }), error => error.statusCode === 409);
    assert.equal(updateLesson(linked.id, { title: 'Fresh', expected_source_file_path: linked.source_file_path }).title, 'Fresh');
  } finally { closeConnection(); fs.rmSync(root, { recursive: true, force: true }); }
});
