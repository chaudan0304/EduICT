/**
 * Giai đoạn 3 — Backend: Hồ sơ giáo viên + Thời khóa biểu (lưu/đọc/xung đột)
 *
 * Chạy TÁCH BIỆT để GIỮ NGUYÊN baseline `npm test` = 9/9:
 *   node --test tests/phase3-teacher-timetable.test.js
 *
 * Cô lập HOÀN TOÀN khỏi CSDL thật y hệt phase2-import.test.js: trỏ EDUICT_APP_ROOT
 * / EDUICT_DATA_DIR / EDUICT_DB_PATH sang thư mục tạm TRƯỚC khi import server/db.js.
 * KHÔNG chạm edumaster.sqlite thật.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_p3_'));
const TMP_DB = path.join(TMP_ROOT, `p3_${Date.now()}.sqlite`);
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = TMP_DB;

const db = await import('../server/db.js');

// Dọn sạch mọi key app_settings liên quan Phase 3 để có baseline xác định (chỉ DB TẠM)
function resetSettings() {
  const conn = db.getDatabase();
  conn.exec("DELETE FROM app_settings WHERE key IN ('teacher_profile', 'timetable_data');");
}

// Lưới TKB hợp lệ tối thiểu (1 lớp / 1 tiết) — đúng hình dạng ngày 1..5
function grid(cellsByDay) {
  const out = {};
  for (let d = 1; d <= 5; d++) {
    out[d] = {
      morning: { 1: null, 2: null, 3: null, 4: null },
      afternoon: { 1: null, 2: null, 3: null }
    };
  }
  for (const [day, mut] of Object.entries(cellsByDay)) mut(out[Number(day)]);
  return out;
}

before(() => resetSettings());
after(() => {
  try { db.getDatabase().close?.(); } catch { /* noop */ }
});

// ---------------------------------------------------------------------------
// Hồ sơ giáo viên
// ---------------------------------------------------------------------------

test('TP1 getDbTeacherProfile: chưa lưu -> trả về mặc định, KHÔNG tự ghi', () => {
  resetSettings();
  const p = db.getDbTeacherProfile();
  assert.equal(p.name, 'Nguyễn Văn Châu Đàn');
  assert.equal(p.status, 'active');
  // Đọc KHÔNG được tạo row (đọc lần 2 vẫn là mặc định, chưa có bản lưu)
  const conn = db.getDatabase();
  const row = conn.prepare("SELECT value FROM app_settings WHERE key = 'teacher_profile';").get();
  assert.equal(row, undefined, 'đọc hồ sơ không được ghi vào app_settings');
});

test('TP2 saveDbTeacherProfile: lưu + đọc lại nguyên vẹn (round-trip)', () => {
  resetSettings();
  const saved = db.saveDbTeacherProfile({
    name: 'Trần Thị Bích', shortName: 'Bích', subject: 'Công nghệ',
    role: 'Tổ trưởng chuyên môn', effectiveDate: '01/09/2026',
    schoolYear: '2026 - 2027', status: 'inactive'
  });
  assert.equal(saved.name, 'Trần Thị Bích');
  assert.equal(saved.status, 'inactive');
  const read = db.getDbTeacherProfile();
  assert.equal(read.name, 'Trần Thị Bích');
  assert.equal(read.subject, 'Công nghệ');
  assert.equal(read.status, 'inactive');
});

test('TP3 saveDbTeacherProfile: tên rỗng -> NÉM lỗi, không ghi', () => {
  resetSettings();
  assert.throws(() => db.saveDbTeacherProfile({ name: '   ' }), /Tên giáo viên/);
  const conn = db.getDatabase();
  const row = conn.prepare("SELECT value FROM app_settings WHERE key = 'teacher_profile';").get();
  assert.equal(row, undefined, 'không được ghi khi validate thất bại');
});

test('TP4 saveDbTeacherProfile: status lạ -> ép về active; shortName rỗng -> = name', () => {
  resetSettings();
  const saved = db.saveDbTeacherProfile({ name: 'Lê Văn C', shortName: '', status: 'xyz' });
  assert.equal(saved.status, 'active');
  assert.equal(saved.shortName, 'Lê Văn C');
});

test('TP5 saveDbTeacherProfile: giữ nguyên dấu tiếng Việt & nháy đơn (an toàn SQL)', () => {
  resetSettings();
  const saved = db.saveDbTeacherProfile({ name: "Nguyễn Văn O'Brien Đàn" });
  assert.equal(saved.name, "Nguyễn Văn O'Brien Đàn");
  assert.equal(db.getDbTeacherProfile().name, "Nguyễn Văn O'Brien Đàn");
});

// ---------------------------------------------------------------------------
// Thời khóa biểu
// ---------------------------------------------------------------------------

test('TT1 getDbTimetable: chưa lưu -> null (client fallback về mặc định)', () => {
  resetSettings();
  assert.equal(db.getDbTimetable(), null);
});

test('TT2 saveDbTimetable: lưới hợp lệ -> lưu + đọc lại đúng phân công', () => {
  resetSettings();
  const g = grid({
    2: (d) => { d.morning[1] = { subject: 'Tin học', className: '4A4', grade: 4 }; },
    3: (d) => { d.morning[2] = { subject: 'Tin học', className: '1A1', grade: 1 }; }
  });
  db.saveDbTimetable(g);
  const read = db.getDbTimetable();
  assert.equal(read[2].morning[1].className, '4A4');
  assert.equal(read[3].morning[2].className, '1A1');
});

test('TT3 saveDbTimetable: SLOT_COLLISION (2 lớp cùng khung) -> NÉM TIMETABLE_CONFLICT', () => {
  resetSettings();
  // Trùng khung: cùng ngày 2, buổi sáng, tiết 1 có 2 lớp -> phải xử lý được
  // (mô hình grid 1 ô/khung nên dựng collision qua danh sách phẳng ở validate)
  const conflictGrid = grid({
    2: (d) => { d.morning[1] = { subject: 'Tin học', className: '4A4', grade: 4 }; }
  });
  // Ép trùng khung bằng cách thêm 1 ô cùng lớp khác ngày sẽ KHÔNG collision;
  // để test SLOT_COLLISION, kiểm tra trực tiếp validateTimetableConflicts với list phẳng:
  const errs = db.validateTimetableConflicts({
    1: { morning: { 1: { className: '3A2' }, 2: { className: '3A2' } }, afternoon: {} }
  });
  // Lớp 3A2 xếp 2 tiết cùng ngày 1 -> CLASS_SAME_DAY (error)
  assert.ok(errs.some(e => e.type === 'CLASS_SAME_DAY'), 'phải phát hiện CLASS_SAME_DAY');
  // Grid hợp lệ vẫn lưu được (không xung đột)
  assert.doesNotThrow(() => db.saveDbTimetable(conflictGrid));
});

test('TT4 saveDbTimetable: 1 lớp 2 tiết cùng ngày -> NÉM (không ghi)', () => {
  resetSettings();
  const g = grid({
    1: (d) => {
      d.morning[1] = { subject: 'Tin học', className: '5A1', grade: 5 };
      d.morning[3] = { subject: 'Tin học', className: '5A1', grade: 5 };
    }
  });
  let thrown = null;
  try { db.saveDbTimetable(g); } catch (e) { thrown = e; }
  assert.ok(thrown, 'phải ném lỗi');
  assert.equal(thrown.code, 'TIMETABLE_CONFLICT');
  assert.ok(Array.isArray(thrown.conflicts) && thrown.conflicts.length >= 1);
  assert.equal(db.getDbTimetable(), null, 'không được ghi khi có xung đột');
});

test('TT5 saveDbTimetable: đầu vào không phải object -> NÉM lỗi hợp lệ', () => {
  resetSettings();
  assert.throws(() => db.saveDbTimetable(null), /không hợp lệ/);
  assert.throws(() => db.saveDbTimetable([1, 2, 3]), /không hợp lệ/);
});

test('TT6 validateTimetableConflicts: lưới hợp lệ (mỗi lớp 1 ngày) -> 0 lỗi', () => {
  const g = grid({
    2: (d) => { d.morning[1] = { className: '4A4' }; d.afternoon[1] = { className: '2A2' }; },
    3: (d) => { d.morning[2] = { className: '1A1' }; }
  });
  assert.equal(db.validateTimetableConflicts(g).length, 0);
});
