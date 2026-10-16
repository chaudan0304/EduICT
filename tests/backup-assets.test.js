import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

test('backup assets: omit unused temp/cache, preserve referenced temporary files, reuse immutable snapshots', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-backup-assets-'));
  const uploads = path.join(root, 'uploads');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE lessons (thumbnail_url TEXT, source_file_path TEXT)');
  const write = (relative, data) => { const file = path.join(uploads, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
  write('classroom-games/image.png', 'persistent image');
  write('presentations/p1/slide.png', 'persistent image');
  write('temp/unused/source.pptx', 'not needed'.repeat(500));
  write('cache/unused.png', 'cache'.repeat(500));
  write('temp/keep/Slide 1.png', 'referenced image');
  db.prepare('INSERT INTO lessons VALUES (?, ?)').run('/uploads/temp/keep/Slide%201.png', '');
  write('Temp/Keep#2/slide.png', 'windows reference');
  write('cache/used.png', 'cached reference');
  db.prepare('INSERT INTO lessons VALUES (?, ?)').run('/uploads/cache/used.png?v=1', JSON.stringify({ path: 'D:\\Uploads\\Temp\\Keep#2\\slide.png' }));
  try {
    const { copyBackupAssets } = await import('../server/services/backupAssets.js');
    const first = path.join(root, 'backup1', 'files');
    const a = await copyBackupAssets({ uploadsDir: uploads, destination: first, database: db });
    assert.equal(fs.existsSync(path.join(first, 'temp/unused/source.pptx')), false);
    assert.equal(fs.existsSync(path.join(first, 'cache/unused.png')), false);
    assert.equal(fs.readFileSync(path.join(first, 'temp/keep/Slide 1.png'), 'utf8'), 'referenced image');
    assert.equal(fs.readFileSync(path.join(first, 'Temp/Keep#2/slide.png'), 'utf8'), 'windows reference');
    assert.equal(fs.readFileSync(path.join(first, 'cache/used.png'), 'utf8'), 'cached reference');
    assert.equal(Object.keys(a.filesChecksums).length, 5);
    assert.ok(a.excludedBytes >= 7000);
    const second = path.join(root, 'backup2', 'files');
    const b = await copyBackupAssets({ uploadsDir: uploads, destination: second, database: db, previous: [{ filesDir: first, filesChecksums: a.filesChecksums }] });
    assert.deepEqual(b.filesChecksums, a.filesChecksums);
    assert.equal(b.copiedBytes, 0);
    assert.equal(b.reusedBytes, b.logicalBytes);
    // Live files are never hard-linked into a backup.
    write('classroom-games/image.png', 'edited live image');
    assert.equal(fs.readFileSync(path.join(second, 'classroom-games/image.png'), 'utf8'), 'persistent image');
    fs.rmSync(path.join(root, 'backup1'), { recursive: true, force: true });
    assert.equal(fs.readFileSync(path.join(second, 'classroom-games/image.png'), 'utf8'), 'persistent image');
  } finally { db.close(); fs.rmSync(root, { recursive: true, force: true }); }
});

test('backup assets: corrupt reuse candidate is copied fresh; paths outside snapshot are not reused', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-backup-copy-'));
  const db = new DatabaseSync(':memory:');
  try {
    const { copyBackupAssets } = await import('../server/services/backupAssets.js');
    const uploads = path.join(root, 'uploads'); fs.mkdirSync(uploads);
    fs.writeFileSync(path.join(uploads, 'file.txt'), 'safe');
    const first = path.join(root, 'first');
    const a = await copyBackupAssets({ uploadsDir: uploads, destination: first, database: db });
    fs.writeFileSync(path.join(first, 'file.txt'), 'bad');
    const second = path.join(root, 'second');
    const b = await copyBackupAssets({ uploadsDir: uploads, destination: second, database: db, previous: [{ filesDir: first, filesChecksums: { ...a.filesChecksums, '../../outside': a.filesChecksums['file.txt'] } }] });
    assert.equal(fs.readFileSync(path.join(second, 'file.txt'), 'utf8'), 'safe');
    assert.equal(b.copiedBytes, 4);
  } finally { db.close(); fs.rmSync(root, { recursive: true, force: true }); }
});
