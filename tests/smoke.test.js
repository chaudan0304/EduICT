/**
 * Smoke tests — Giai đoạn 1 (Part 16)
 *
 * Chạy bằng test runner tích hợp của Node (không thêm dependency):
 *   npm test    ->  node --test
 *
 * Kiểm tra nhanh các bất biến quan trọng SAU refactor:
 *   1. Lớp service mới (corsConfig, pathService) hoạt động đúng & giữ mặc định.
 *   2. Tầng DB khởi tạo schema + CRUD roundtrip trên DB tạm (EDUICT_DB_PATH).
 *
 * DB tạm được trỏ qua EDUICT_DB_PATH TRƯỚC khi import db.js, nên không đụng
 * tới CSDL thật của người dùng.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// Cô lập HOÀN TOÀN khỏi CSDL thật, TRƯỚC mọi import chạm DB.
//
// LƯU Ý QUAN TRỌNG: envLoader.loadEnv() ghi đè process.env bằng giá trị trong
// .env (kể cả EDUICT_DB_PATH). Nếu chỉ set EDUICT_DB_PATH mà không chặn .env,
// getDatabase() sẽ kết nối vào CSDL thật ghi trong .env → test ghi vào DB thật.
// Vì vậy ta trỏ EDUICT_APP_ROOT sang thư mục tạm (không có .env) để loadEnv()
// KHÔNG tìm thấy .env và không ghi đè, rồi trỏ EDUICT_DB_PATH sang file tạm.
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_smoke_'));
const TMP_DB = path.join(TMP_ROOT, `smoke_${Date.now()}.sqlite`);
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = TMP_DB;

// --- Part 12: corsConfig ---
const { resolveCorsOrigin } = await import('../server/services/corsConfig.js');

test('corsConfig: mặc định trả wildcard (giữ nguyên hành vi WEB)', () => {
  delete process.env.EDUICT_CORS_ORIGIN;
  assert.equal(resolveCorsOrigin('http://any.example'), '*');
});

test('corsConfig: allowlist echo lại origin hợp lệ, chặn origin lạ', () => {
  process.env.EDUICT_CORS_ORIGIN = 'http://a.local, http://b.local';
  assert.equal(resolveCorsOrigin('http://b.local'), 'http://b.local');
  assert.equal(resolveCorsOrigin('http://evil.local'), 'http://a.local');
  delete process.env.EDUICT_CORS_ORIGIN;
});

// --- Part 5/14: pathService tôn trọng EDUICT_DB_PATH ---
const pathService = await import('../server/services/pathService.js');

test('pathService: getDatabasePath tôn trọng EDUICT_DB_PATH', () => {
  assert.equal(pathService.getDatabasePath(), TMP_DB);
});

// PLACEHOLDER_DB_TESTS
// --- Part 2/3: tầng DB khởi tạo schema + CRUD roundtrip trên DB tạm ---
const db = await import('../server/db.js');

test('db: khởi tạo schema, foreign_keys BẬT', () => {
  const conn = db.getDatabase();
  const fk = conn.prepare('PRAGMA foreign_keys;').get();
  assert.equal(fk.foreign_keys, 1);
});

test('db: CRUD roundtrip bảng classes + students (FK cascade)', () => {
  const conn = db.getDatabase();
  conn.prepare(
    `INSERT INTO classes (id, name, grade, subject) VALUES (?, ?, ?, ?)`
  ).run('smoke_c1', 'Lớp Smoke', 3, 'Tin Học');
  conn.prepare(
    `INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)`
  ).run('smoke_s1', 'smoke_c1', 'HS Smoke');

  const cls = conn.prepare('SELECT * FROM classes WHERE id = ?').get('smoke_c1');
  assert.equal(cls.name, 'Lớp Smoke');
  const stu = conn.prepare('SELECT COUNT(*) n FROM students WHERE class_id = ?').get('smoke_c1');
  assert.equal(stu.n, 1);

  // Xóa lớp -> ON DELETE CASCADE phải dọn học sinh
  conn.prepare('DELETE FROM classes WHERE id = ?').run('smoke_c1');
  const left = conn.prepare('SELECT COUNT(*) n FROM students WHERE class_id = ?').get('smoke_c1');
  assert.equal(left.n, 0, 'FK CASCADE phải xóa học sinh khi xóa lớp');
});

// --- Part 11: validateSqlDump chặn lệnh nguy hiểm, cho dump hợp lệ ---
test('db: validateSqlDump cho phép dump app-generated hợp lệ', () => {
  const ok = `PRAGMA foreign_keys = ON;\nCREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY);\nINSERT OR REPLACE INTO classes (id) VALUES ('c1');`;
  assert.doesNotThrow(() => db.validateSqlDump(ok));
});

test('db: validateSqlDump chặn ATTACH/load_extension/VACUUM INTO', () => {
  assert.throws(() => db.validateSqlDump("ATTACH DATABASE 'evil.db' AS e;"), /ATTACH/);
  assert.throws(() => db.validateSqlDump('SELECT load_extension("x");'), /load_extension/);
  assert.throws(() => db.validateSqlDump('VACUUM INTO "/tmp/x.db";'), /VACUUM INTO/);
  assert.throws(() => db.validateSqlDump(''), /trống|không hợp lệ/);
});

// --- Part B (Giai đoạn 1B): COM mutex serial hóa tự động hóa PowerPoint ---
// Không cần PowerPoint thật: chỉ kiểm chứng TÍNH CHẤT loại trừ tương hỗ của
// withComLock (chain promise). Import động SAU khi env đã cô lập.
const pptx = await import('../server/pptxService.js');

test('pptx: withComLock chạy tuần tự, không cho 2 job COM chồng lấn', async () => {
  let active = 0;
  let maxActive = 0;
  const order = [];
  const mk = (id, ms) => pptx.withComLock(async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    order.push(`start:${id}`);
    await new Promise(r => setTimeout(r, ms));
    order.push(`end:${id}`);
    active--;
    return id;
  });

  // 3 job "gần như đồng thời" — mutex phải ép chúng chạy nối tiếp.
  const results = await Promise.all([mk('a', 15), mk('b', 5), mk('c', 10)]);

  assert.equal(maxActive, 1, 'KHÔNG được có 2 job COM chạy song song');
  assert.deepEqual(results, ['a', 'b', 'c'], 'kết quả trả đúng theo từng job');
  // FIFO: mỗi job phải end trước khi job kế tiếp start.
  assert.deepEqual(order, [
    'start:a', 'end:a', 'start:b', 'end:b', 'start:c', 'end:c',
  ], 'phải theo thứ tự FIFO, không chồng lấn');
  assert.equal(pptx.getComLockStats().active, 0, 'sau khi xong active phải về 0');
});

test('pptx: withComLock — 1 job lỗi KHÔNG làm đứng hàng đợi', async () => {
  const p1 = pptx.withComLock(async () => { throw new Error('COM job hỏng'); });
  await assert.rejects(p1, /COM job hỏng/, 'lỗi của job phải được truyền lại nguyên vẹn');

  // Job sau vẫn phải chạy được (chain không kẹt).
  const v = await pptx.withComLock(async () => 'ok-sau-loi');
  assert.equal(v, 'ok-sau-loi');
  assert.equal(pptx.getComLockStats().active, 0);
});

// Dọn file DB tạm + thư mục gốc tạm sau khi chạy xong.
after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(TMP_DB + suffix); } catch { /* bỏ qua */ }
  }
  try { fs.rmSync(TMP_ROOT, { recursive: true, force: true }); } catch { /* bỏ qua */ }
});

