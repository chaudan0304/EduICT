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

// Trỏ DB sang file tạm TRƯỚC mọi import chạm DB.
const TMP_DB = path.join(os.tmpdir(), `eduict_smoke_${Date.now()}.sqlite`);
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

// Dọn file DB tạm sau khi chạy xong.
after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(TMP_DB + suffix); } catch { /* bỏ qua */ }
  }
});

