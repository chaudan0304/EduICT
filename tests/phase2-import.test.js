/**
 * Giai đoạn 2 — Backend import & Class/Student CRUD tests
 *
 * Chạy tách biệt với smoke test để GIỮ NGUYÊN baseline `npm test` = 9/9:
 *   node --test tests/phase2-import.test.js
 *
 * Cô lập HOÀN TOÀN khỏi CSDL thật y hệt smoke.test.js: trỏ EDUICT_APP_ROOT
 * sang thư mục tạm (không có .env → loadEnv không ghi đè) rồi trỏ
 * EDUICT_DB_PATH sang file .sqlite tạm. KHÔNG chạm edumaster.sqlite thật.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_p2_'));
const TMP_DB = path.join(TMP_ROOT, `p2_${Date.now()}.sqlite`);
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = TMP_DB;

const db = await import('../server/db.js');

const YEAR = '2026 - 2027';

// Xóa sạch dữ liệu seed để có baseline xác định (chỉ trên DB TẠM)
function resetDb() {
  const conn = db.getDatabase();
  conn.exec('DELETE FROM students; DELETE FROM classes;');
}

function makePayload(sheets, opts = {}) {
  return {
    autoCreateClasses: opts.autoCreateClasses !== false,
    defaultSchoolYear: opts.schoolYear || YEAR,
    totalWorkbookSheets: opts.totalWorkbookSheets ?? sheets.length,
    sheetsSkipped: opts.sheetsSkipped ?? 0,
    sheets
  };
}

function sheet(sheetName, className, students, extra = {}) {
  return { sheetName, className: className ?? sheetName, schoolYear: YEAR, students, ...extra };
}

function stu(name, dob, gender = 'Nam', extra = {}) {
  return { name, dob, gender, ...extra };
}

function classByName(name) {
  const all = db.getAllClassesWithStudents(YEAR);
  return all.find(c => c.name === name);
}

before(() => resetDb());
after(() => {
  try { db.getDatabase().close?.(); } catch { /* noop */ }
});

test('T1 đa sheet: 1 file nhiều sheet -> nhiều lớp mới', () => {
  resetDb();
  const res = db.batchImportClassesAndStudents(makePayload([
    sheet('1A1', '1A01', [stu('Nguyễn Văn An', '01/09/2018'), stu('Trần Thị Bình', '02/09/2018', 'Nữ')]),
    sheet('1A2', '1A02', [stu('Lê Văn Cường', '03/09/2018')])
  ]));
  assert.equal(res.success, true);
  assert.equal(res.summary.classesCreated, 2);
  assert.equal(res.summary.studentsAdded, 3);
  assert.equal(classByName('1A01').students.length, 2);
  assert.equal(classByName('1A02').students.length, 1);
});

test('T2 lớp đã tồn tại: tái dùng classId, KHÔNG tạo lớp mới', () => {
  resetDb();
  db.batchImportClassesAndStudents(makePayload([sheet('1A01', '1A01', [stu('Nguyễn Văn An', '01/09/2018')])]));
  const idBefore = classByName('1A01').id;
  const res = db.batchImportClassesAndStudents(makePayload([
    sheet('1A01', '1A01', [stu('Phạm Thị Dung', '05/09/2018', 'Nữ')])
  ]));
  assert.equal(res.summary.classesCreated, 0);
  assert.equal(res.sheetResults[0].classId, idBefore);
  assert.equal(classByName('1A01').students.length, 2);
});

test('T3 lớp mới: tạo classId dạng class_*, createdClass=true', () => {
  resetDb();
  const res = db.batchImportClassesAndStudents(makePayload([sheet('2A1', '2A01', [stu('Đỗ Văn Em', '01/09/2017')])]));
  assert.equal(res.sheetResults[0].createdClass, true);
  assert.match(res.sheetResults[0].classId, /^class_/);
  assert.equal(classByName('2A01').grade, 2);
});

test('T4 chống trùng: import lại cùng HS -> studentsExisting, không thêm', () => {
  resetDb();
  const s = [stu('Nguyễn Văn An', '01/09/2018'), stu('Trần Thị Bình', '02/09/2018', 'Nữ')];
  db.batchImportClassesAndStudents(makePayload([sheet('1A01', '1A01', s)]));
  const res = db.batchImportClassesAndStudents(makePayload([sheet('1A01', '1A01', s)]));
  assert.equal(res.summary.studentsAdded, 0);
  assert.equal(res.summary.studentsExisting, 2);
  assert.equal(classByName('1A01').students.length, 2);
});

test('T5 cùng tên khác ngày sinh: được tạo riêng (KHÔNG coi là trùng)', () => {
  resetDb();
  const res = db.batchImportClassesAndStudents(makePayload([sheet('1A01', '1A01', [
    stu('Nguyễn Văn An', '01/09/2018'),
    stu('Nguyễn Văn An', '15/03/2018')
  ])]));
  assert.equal(res.summary.studentsAdded, 2);
  assert.equal(classByName('1A01').students.length, 2);
});

test('T6 giới tính không hợp lệ: bị đánh lỗi, không chèn', () => {
  resetDb();
  const res = db.batchImportClassesAndStudents(makePayload([sheet('1A01', '1A01', [
    stu('Nguyễn Văn An', '01/09/2018', 'Nam'),
    stu('Lỗi Giới Tính', '02/09/2018', 'X')
  ])]));
  assert.equal(res.summary.studentsAdded, 1);
  assert.equal(res.summary.rowsError, 1);
  assert.equal(classByName('1A01').students.length, 1);
});

test('T7 đổi tên lúc import: sheet 1A1 -> lớp lưu tên 1A01', () => {
  resetDb();
  db.batchImportClassesAndStudents(makePayload([sheet('1A1', '1A01', [stu('Nguyễn Văn An', '01/09/2018')])]));
  assert.ok(classByName('1A01'), 'phải có lớp tên 1A01');
  assert.equal(classByName('1A1'), undefined, 'không được lưu theo tên sheet gốc');
});

test('T8 (BUG XXVIII) import #2 trong cùng phiên vẫn ghi dữ liệu', () => {
  resetDb();
  const r1 = db.batchImportClassesAndStudents(makePayload([sheet('1A01', '1A01', [stu('Nguyễn Văn An', '01/09/2018')])]));
  const r2 = db.batchImportClassesAndStudents(makePayload([sheet('1A02', '1A02', [stu('Trần Thị Bình', '02/09/2018', 'Nữ')])]));
  assert.equal(r1.summary.studentsAdded, 1);
  assert.equal(r2.summary.studentsAdded, 1);
  assert.equal(classByName('1A01').students.length, 1);
  assert.equal(classByName('1A02').students.length, 1);
});

test('T9 (BUG XXVIII) import #3 liên tiếp vẫn ghi dữ liệu', () => {
  resetDb();
  db.batchImportClassesAndStudents(makePayload([sheet('1A01', '1A01', [stu('A Nguyễn', '01/09/2018')])]));
  db.batchImportClassesAndStudents(makePayload([sheet('1A02', '1A02', [stu('B Trần', '02/09/2018')])]));
  const r3 = db.batchImportClassesAndStudents(makePayload([sheet('1A03', '1A03', [stu('C Lê', '03/09/2018')])]));
  assert.equal(r3.summary.studentsAdded, 1);
  assert.equal(db.getAllClassesWithStudents(YEAR).length, 3);
});

test('T10 rollback: lỗi PK trùng id giữa transaction -> hoàn tác toàn bộ', () => {
  resetDb();
  assert.throws(() => {
    db.batchImportClassesAndStudents(makePayload([sheet('9A9', '9A9', [
      stu('HS Một', '01/09/2010', 'Nam', { id: 'dup_id_x' }),
      stu('HS Hai', '02/09/2010', 'Nam', { id: 'dup_id_x' })
    ])]));
  });
  assert.equal(classByName('9A9'), undefined, 'lớp phải bị rollback, không tồn tại');
});

test('T11 unicode tiếng Việt: dấu được giữ nguyên vẹn', () => {
  resetDb();
  db.batchImportClassesAndStudents(makePayload([sheet('3A01', '3A01', [stu('Nguyễn Thị Ánh Nguyệt', '01/09/2016', 'Nữ')])]));
  const names = classByName('3A01').students.map(s => s.name);
  assert.ok(names.includes('Nguyễn Thị Ánh Nguyệt'));
});

test('T12 dấu nháy đơn (O\'Brien): chèn & đọc lại nguyên vẹn, an toàn SQL', () => {
  resetDb();
  db.batchImportClassesAndStudents(makePayload([sheet('3A02', '3A02', [stu("Nguyễn Văn O'Brien", '01/09/2016')])]));
  const names = classByName('3A02').students.map(s => s.name);
  assert.ok(names.includes("Nguyễn Văn O'Brien"));
});

test('T13 saveOrUpdateClass đổi tên: classId GIỮ NGUYÊN', () => {
  resetDb();
  db.batchImportClassesAndStudents(makePayload([sheet('1A1', '1A1', [stu('Nguyễn Văn An', '01/09/2018')])]));
  const before = classByName('1A1');
  db.saveOrUpdateClass({ id: before.id, name: '1A01', grade: before.grade, subject: before.subject, schoolYear: YEAR });
  const after = db.getAllClassesWithStudents(YEAR).find(c => c.id === before.id);
  assert.ok(after, 'lớp vẫn tồn tại theo id cũ');
  assert.equal(after.id, before.id);
  assert.equal(after.name, '1A01');
  assert.equal(after.students.length, 1, 'học sinh không bị mất khi đổi tên');
});

test('T14 deleteClassById: xóa lớp -> học sinh bị xóa theo (FK CASCADE)', () => {
  resetDb();
  db.batchImportClassesAndStudents(makePayload([sheet('5A01', '5A01', [stu('Nguyễn Văn An', '01/09/2014')])]));
  const cls = classByName('5A01');
  const conn = db.getDatabase();
  const cntBefore = conn.prepare('SELECT COUNT(*) n FROM students WHERE class_id = ?;').get(cls.id).n;
  assert.equal(cntBefore, 1);
  db.deleteClassById(cls.id);
  assert.equal(classByName('5A01'), undefined);
  const cntAfter = conn.prepare('SELECT COUNT(*) n FROM students WHERE class_id = ?;').get(cls.id).n;
  assert.equal(cntAfter, 0, 'FK CASCADE phải xóa học sinh');
});

test('T15 bỏ qua sheet: summary phản ánh sheetsSkipped', () => {
  resetDb();
  const res = db.batchImportClassesAndStudents(makePayload(
    [sheet('1A01', '1A01', [stu('Nguyễn Văn An', '01/09/2018')])],
    { totalWorkbookSheets: 3, sheetsSkipped: 2 }
  ));
  assert.equal(res.summary.sheetsSkipped, 2);
  assert.equal(res.summary.classesProcessed, 1);
  assert.equal(res.sheetsSkipped, 2);
});

test('T16 autoCreateClasses=false + lớp chưa có -> lỗi, không tạo lớp', () => {
  resetDb();
  const res = db.batchImportClassesAndStudents(makePayload(
    [sheet('7A01', '7A01', [stu('Nguyễn Văn An', '01/09/2012')])],
    { autoCreateClasses: false }
  ));
  assert.equal(res.summary.classesCreated, 0);
  assert.equal(classByName('7A01'), undefined);
  assert.ok(res.sheetResults[0].errors.length >= 1);
});

