import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('optimized backup: correct year, reuse, delete independence, package import and actual restore on isolated data', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-recovery-roundtrip-'));
  process.env.EDUICT_APP_ROOT = root;
  process.env.EDUICT_DATA_DIR = root;
  process.env.EDUICT_DB_PATH = path.join(root, 'edumaster.sqlite');
  const connection = await import('../server/db/connection.js');
  const { createBackup, deleteBackup, verifyBackup, restoreBackup, getBackupLocation } = await import('../server/services/backupService.js');
  const { downloadBackupPackage, importBackupPackage } = await import('../server/services/backupPackage.js');
  try {
    const db = connection.getDatabase();
    db.prepare('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)').run('current_school_year', '2030 - 2031');
    db.prepare('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)').run('fixture_marker', 'before');
    const asset = path.join(root, 'uploads', 'classroom-games', 'image.txt');
    fs.mkdirSync(path.dirname(asset), { recursive: true }); fs.writeFileSync(asset, 'fixture original image');
    const first = await createBackup();
    assert.equal(first.manifest.schoolYear, '2030 - 2031');
    const second = await createBackup();
    assert.ok(second.manifest.reusedBytes > 0);
    assert.ok(second.manifest.newBytes < second.manifest.sizeBytes);
    deleteBackup(first.backupId);
    await verifyBackup(second.backupId);
    const packageFile = path.join(root, 'sample.eduict');
    const response = fs.createWriteStream(packageFile); response.setHeader = () => {};
    await downloadBackupPackage(second.backupId, response);
    const imported = await importBackupPackage(fs.createReadStream(packageFile));
    assert.equal(fs.readFileSync(path.join(getBackupLocation(imported.backupId), 'files', 'classroom-games', 'image.txt'), 'utf8'), 'fixture original image');
    db.prepare("UPDATE app_settings SET value='after' WHERE key='fixture_marker'").run();
    fs.writeFileSync(asset, 'changed live image');
    await restoreBackup(imported.backupId);
    assert.equal(connection.getDatabase().prepare("SELECT value FROM app_settings WHERE key='fixture_marker'").get().value, 'before');
    assert.equal(fs.readFileSync(asset, 'utf8'), 'fixture original image');
  } finally { connection.closeConnection(); fs.rmSync(root, { recursive: true, force: true }); }
});
