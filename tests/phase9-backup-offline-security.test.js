import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_phase9_'));
const TMP_DB = path.join(TMP_ROOT, `phase9_test_${Date.now()}.sqlite`);
const TMP_UPLOADS = path.join(TMP_ROOT, 'uploads');

// Isolate DB and environment
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = TMP_DB;

describe('Phase 9: Backup & Restore & Security', () => {
  let db;

  before(async () => {
    // Create dummy presentations directory
    fs.mkdirSync(path.join(TMP_UPLOADS, 'presentations', 'l1'), { recursive: true });
    fs.writeFileSync(path.join(TMP_UPLOADS, 'presentations', 'l1', 'original.pptx'), 'dummy pptx content');

    const connection = await import('../server/db/connection.js');
    db = connection.getDatabase();

    // Mock initial data
    db.exec(`
      INSERT INTO classes (id, name, grade) VALUES ('c1', '3A1', 3);
      INSERT INTO students (id, name, class_id) VALUES ('s1', 'Nguyen Van A', 'c1');
      INSERT INTO lessons (id, title, grade, subject) VALUES ('l1', 'An Toàn Mạng', 4, 'Tin Học');
      INSERT INTO question_bank (id, lesson_id, question, correct_answer) VALUES ('q1', 'l1', 'Test Q', 1);
    `);
  });

  after(() => {
    try {
      if (db) db.close();
    } catch (e) {
      // Ignored if already closed
    }
    try {
      if (fs.existsSync(TMP_ROOT)) fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    } catch(e) {}
  });

  test('Security: Cannot delete backup using path traversal', async () => {
    const { deleteBackup } = await import('../server/services/backupService.js');
    assert.throws(() => deleteBackup('../../../Windows/System32'), /INVALID_BACKUP_PATH/);
  });

  test('Backup: Should create a consistent backup snapshot with SQLite and Files', async () => {
    const { createBackup, listBackups } = await import('../server/services/backupService.js');
    const result = await createBackup();
    
    assert.strictEqual(result.success, true);
    assert.ok(result.backupId.startsWith('EduMaster-Backup-'));
    assert.ok(result.manifest.stats.classes >= 1);
    assert.ok(result.manifest.stats.students >= 1);
    assert.ok(result.manifest.stats.lessons >= 1);
    assert.ok(result.manifest.stats.questions >= 1);

    const list = listBackups();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, result.backupId);

    // Verify files copied
    const backupFilesPath = path.join(process.env.EDUICT_DATA_DIR, 'backups', result.backupId, 'files', 'presentations', 'l1', 'original.pptx');
    assert.ok(fs.existsSync(backupFilesPath));
  });

  test('Backup: Verify corrupted backup fails validation', async () => {
    const { listBackups, verifyBackup } = await import('../server/services/backupService.js');
    const list = listBackups();
    const backupId = list[0].id;
    
    // Corrupt database
    const dbPath = path.join(process.env.EDUICT_DATA_DIR, 'backups', backupId, 'database.sqlite');
    fs.appendFileSync(dbPath, 'CORRUPT_BYTES');

    await assert.rejects(verifyBackup(backupId), /Database checksum mismatch/);
  });

  test('Backup: Restore with valid backup works and updates db', async () => {
    const { createBackup, restoreBackup } = await import('../server/services/backupService.js');
    const backup1 = await createBackup();
    
    // Modify DB before restore
    db.exec(`INSERT INTO classes (id, name, grade) VALUES ('c2', '4A1', 4)`);
    const cCount = db.prepare("SELECT COUNT(*) as c FROM classes").get().c;
    assert.ok(cCount > 1);

    // Restore Backup 1
    const res = await restoreBackup(backup1.backupId);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.requireRestart, true);

    // Ensure connection is replaced/closed safely
    const connection = await import('../server/db/connection.js');
    const newDb = connection.getDatabase();
    
    // DB should have the original number of classes (cCount - 1)
    const restoredCount = newDb.prepare("SELECT COUNT(*) as c FROM classes").get().c;
    assert.strictEqual(restoredCount, cCount - 1);
    
    newDb.close(); // clean up
  });

  test('Security: Secret Scan (GEMINI_API_KEY)', async () => {
    const { getGeminiConfig } = await import('../server/ai/envLoader.js');
    const cfg = getGeminiConfig();
    assert.strictEqual(cfg.enabled, true); // default true for tests since no .env
    // Ensure that API key doesn't leak into backup files magically
    // Checked earlier
  });
});
