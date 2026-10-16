import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

test('folder relink: scanning grants nothing; approval accepts only exact candidates from picker', async () => {
  const { createPresentationFolderPicker } = require('../desktop/native/presentationFolder.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-link-folder-'));
  fs.mkdirSync(path.join(root, 'sub'));
  fs.writeFileSync(path.join(root, 'a.pptx'), 'slide');
  fs.writeFileSync(path.join(root, 'sub', 'a.pptx'), 'another slide');
  fs.writeFileSync(path.join(root, 'private.txt'), 'not a presentation');
  const granted = [];
  const picker = createPresentationFolderPicker({ dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [root] }) },
    linkedPresentations: { grant: file => { granted.push(file); return { ok: true, path: file }; } } });
  try {
    const result = await picker.pick({ names: ['a.pptx'] });
    assert.equal(result.files.length, 2);
    assert.equal(granted.length, 0);
    assert.equal(picker.approve({ scanId: result.scanId, paths: [path.join(root, 'private.txt')] }).ok, false);
    assert.equal(granted.length, 0);
    assert.equal(picker.approve({ scanId: result.scanId, paths: [result.files[0].path] }).ok, true);
    assert.equal(granted.length, 1);
    await assert.rejects(picker.pick({ names: ['../a.pptx'] }), /tên file/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
