import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-audit-fixes-'));
process.env.EDUICT_APP_ROOT = root;
process.env.EDUICT_DATA_DIR = root;
process.env.EDUICT_DB_PATH = path.join(root, 'edumaster.sqlite');
delete process.env.EDUICT_SHARED_LOCAL_DATA;
const { getDatabase, closeConnection } = await import('../server/db/connection.js');
const { getStudentRosterVersion, saveStudentsForClass } = await import('../server/db/classes.js');
const { awardStar, adjustStars } = await import('../server/db/gamification.js');
const { createBackup, verifyBackup, restoreBackup } = await import('../server/services/backupService.js');
const { createQuizSession, saveQuizResults } = await import('../server/db/quiz.js');
const { cancelImportSession, commitImportedPptx, withComLock } = await import('../server/pptxService.js');
const { handleApiRequest } = await import('../server/routes/index.js');
const { requestWithTimeout } = await import('../server/ai/requestTimeout.js');
const require = createRequire(import.meta.url);
let db = getDatabase();
after(() => {
  closeConnection();
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
  fs.rmSync(root, { recursive: true, force: true });
});
function seed(id, stars = 0) {
  db.prepare('INSERT INTO classes(id,name,grade) VALUES(?,?,3)').run(id, id);
  saveStudentsForClass(id, [{ id: `${id}_s`, name: 'Audit student', stars }]);
  return `${id}_s`;
}

test('roster CAS rejects stale membership and preserves ledger stars during note edits', () => {
  const sid = seed('cas', 0);
  const version = getStudentRosterVersion('cas');
  awardStar({ id: 'cas_award', studentId: sid, classId: 'cas', amount: 5, source: 'AUDIT', reason: 'Audit' });
  saveStudentsForClass('cas', [{ id: sid, name: 'Audit student', stars: 0, note: 'Changed' }], { expectedVersion: version, preserveStars: true });
  assert.equal(db.prepare('SELECT stars FROM students WHERE id=? AND class_id=?').get(sid, 'cas').stars, 5);
  const stale = getStudentRosterVersion('cas');
  db.prepare('INSERT INTO students(id,class_id,name,stars) VALUES(?,?,?,0)').run('cas_new', 'cas', 'New');
  assert.throws(() => saveStudentsForClass('cas', [{ id: sid, name: 'Old', stars: 0 }], { expectedVersion: stale, preserveStars: true }), { statusCode: 409 });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM students WHERE class_id=?').get('cas').n, 2);
});

test('legacy HTTP roster writes without a version are rejected instead of replacing students', async () => {
  const req = Readable.from([JSON.stringify({ students: [] })]);
  req.url = '/api/classes/cas/students'; req.method = 'PUT'; req.headers = { host: 'localhost' };
  const res = { setHeader() {}, end(value) { this.body = JSON.parse(value); } };
  await handleApiRequest(req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM students WHERE class_id=?').get('cas').n, 2);
});

test('PowerPoint import rejects traversal before deleting or creating anything outside its session', async () => {
  const sentinel = path.join(root, 'uploads', 'keep.txt');
  fs.mkdirSync(path.dirname(sentinel), { recursive: true }); fs.writeFileSync(sentinel, 'keep');
  for (const id of ['..', '.', '../outside', 'tmp_123_abc', 'C:/outside']) {
    assert.throws(() => cancelImportSession(id), { statusCode: 400 });
    await assert.rejects(commitImportedPptx(id, 'lesson'), { statusCode: 400 });
  }
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
});

test('full backups include and verify classroom images; restoring retains the image', async () => {
  const picture = path.join(root, 'uploads', 'classroom-games', 'audit.png');
  fs.mkdirSync(path.dirname(picture), { recursive: true }); fs.writeFileSync(picture, 'audit image');
  const backup = await createBackup();
  assert.equal(backup.manifest.uploadsComplete, true);
  assert.ok(backup.manifest.filesChecksums['classroom-games/audit.png']);
  await verifyBackup(backup.backupId);
  await restoreBackup(backup.backupId);
  db = getDatabase();
  assert.equal(fs.readFileSync(picture, 'utf8'), 'audit image');
});

test('another backend lease blocks archive restore and desktop update rollback', async () => {
  const backup = await createBackup();
  const modulePath = require.resolve('../server/services/databaseAccess.cjs');
  const child = spawn(process.execPath, ['-e', `const {registerDatabaseUser}=require(${JSON.stringify(modulePath)}); registerDatabaseUser(${JSON.stringify(process.env.EDUICT_DB_PATH)}); console.log('READY'); process.stdin.resume(); process.stdin.on('end',()=>process.exit(0));`], { stdio: ['pipe', 'pipe', 'inherit'] });
  try {
    await once(child.stdout, 'data');
    await assert.rejects(restoreBackup(backup.backupId), { code: 'DATABASE_IN_USE' });
    const { restoreDatabaseFromBackup } = require('../desktop/migration/updateGuard.cjs');
    const result = restoreDatabaseFromBackup({ backup: { dir: path.join(root, 'backups', backup.backupId) }, dataDir: root });
    assert.equal(result.code, 'DATABASE_IN_USE');
  } finally { const exited = once(child, 'exit'); child.stdin.end(); await exited; }
});

test('individual deductions record actual change and retain requested amount', () => {
  const sid = seed('deduct', 5);
  adjustStars({ id: 'audit_deduct', studentId: sid, classId: 'deduct', amount: -100, source: 'AUDIT', reason: 'Audit' });
  const row = getDatabase().prepare('SELECT amount,requested_amount FROM star_transactions WHERE id=?').get('audit_deduct');
  assert.equal(row.amount, -5); assert.equal(row.requested_amount, -100);
});

test('restored legacy star tables remain writable without restarting either backend', () => {
  const sid = seed('legacy_stars', 5);
  getDatabase().exec('ALTER TABLE star_transactions DROP COLUMN requested_amount');
  awardStar({ id: 'legacy_award', studentId: sid, classId: 'legacy_stars', amount: 1, source: 'AUDIT', reason: 'Audit' });
  adjustStars({ id: 'legacy_deduct', studentId: sid, classId: 'legacy_stars', amount: -100, source: 'AUDIT', reason: 'Audit' });
  const row = getDatabase().prepare('SELECT amount,requested_amount FROM star_transactions WHERE id=?').get('legacy_deduct');
  assert.equal(row.amount, -6); assert.equal(row.requested_amount, -100);
});

test('confirmed class quiz saves results and awards exactly once; declined rewards award nothing', () => {
  const sid = seed('quiz');
  const session = createQuizSession({ id: 'audit_quiz', class_id: 'quiz', mode: 'CLASS', star_reward_per_correct: 2,
    questions: [{ question: 'Audit?', options: ['A', 'B'], correct_index: 0, correct_answer: 'A' }] });
  const payload = { status: 'COMPLETED', award_stars: true, confirmed: true,
    results: [{ quiz_question_id: session.questions[0].id, distribution: { 0: 1, 1: 0 } }] };
  const first = saveQuizResults(session.id, payload);
  const second = saveQuizResults(session.id, payload);
  assert.equal(first.status, 'COMPLETED'); assert.equal(first.total_stars_awarded, 2);
  assert.equal(second.total_stars_awarded, 2);
  assert.equal(getDatabase().prepare('SELECT stars FROM students WHERE id=? AND class_id=?').get(sid, 'quiz').stars, 2);
  assert.equal(getDatabase().prepare('SELECT COUNT(*) n FROM star_transactions WHERE session_id=?').get(session.id).n, 1);
  const declined = createQuizSession({ id: 'audit_quiz_declined', class_id: 'quiz', mode: 'CLASS', star_reward_per_correct: 2,
    questions: [{ question: 'Audit?', options: ['A', 'B'], correct_index: 0, correct_answer: 'A' }] });
  assert.equal(saveQuizResults(declined.id, { status: 'COMPLETED', results: [{ quiz_question_id: declined.questions[0].id, distribution: { 0: 1 } }], total_stars_awarded: 999 }).total_stars_awarded, 0);
});

test('student and quiz API helpers reject HTTP failures rather than returning offline success', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => '{"error":"AUDIT_FAILED"}' });
  try {
    const { syncStudentsToSqlite } = await import('../src/utils/storage.js');
    const { saveQuizResultsApi, createQuizSessionApi } = await import('../src/components/QuickQuiz/quizStorage.js');
    await assert.rejects(syncStudentsToSqlite('audit', [], 'old'), /AUDIT_FAILED/);
    await assert.rejects(saveQuizResultsApi('audit', {}), /500/);
    await assert.rejects(createQuizSessionApi({}), /500/);
  } finally { globalThis.fetch = original; }
});

test('AI timeout aborts the client signal once without retrying', async () => {
  let aborted = false, calls = 0;
  await assert.rejects(requestWithTimeout(signal => { calls++; signal.addEventListener('abort', () => { aborted = true; }); return new Promise(() => {}); }, 15), /AI_TIMEOUT/);
  assert.equal(aborted, true); assert.equal(calls, 1);
  assert.equal(await requestWithTimeout(() => Promise.resolve('done'), 50), 'done');
});

test('web PowerPoint renderer waits for the same filesystem lock as desktop', async () => {
  const { acquire } = require('../server/services/powerpointLock.cjs');
  const original = process.env.EDUICT_RUNTIME; process.env.EDUICT_RUNTIME = 'web';
  const lock = await acquire(path.join(root, 'locks'));
  try {
    let ran = false;
    const job = withComLock(() => { ran = true; });
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(ran, false);
    lock.release(); await job; assert.equal(ran, true);
  } finally { lock.release(); if (original === undefined) delete process.env.EDUICT_RUNTIME; else process.env.EDUICT_RUNTIME = original; }
});
