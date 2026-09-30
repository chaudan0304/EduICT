/**
 * Giai đoạn 2 — Client Excel parse tests (src/utils/excelImport.js)
 *
 * Chạy tách biệt để GIỮ NGUYÊN baseline `npm test` = 9/9:
 *   node --test tests/phase2-parse.test.js
 *
 * excelImport.parseExcelWorkbook dùng FileReader (API trình duyệt). Ở Node ta
 * polyfill FileReader tối thiểu (readAsArrayBuffer) + dựng workbook trong bộ nhớ
 * bằng chính thư viện xlsx đã có sẵn (KHÔNG thêm dependency, KHÔNG chạm DB).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

// Polyfill FileReader tối thiểu cho môi trường Node
globalThis.FileReader = class {
  readAsArrayBuffer(file) {
    queueMicrotask(() => {
      try {
        this.onload({ target: { result: file.__data.buffer } });
      } catch (e) {
        this.onerror?.(e);
      }
    });
  }
};

const { parseExcelWorkbook, parseExcelDate, normalizeGender } = await import('../src/utils/excelImport.js');

// Dựng 1 "file" Excel giả từ danh sách sheet [{ name, aoa }]
function makeFile(sheetsSpec, fileName = 'test.xlsx') {
  const wb = XLSX.utils.book_new();
  for (const s of sheetsSpec) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.aoa), s.name);
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const u8 = out instanceof Uint8Array ? out : new Uint8Array(out);
  return { name: fileName, size: u8.byteLength, __data: u8 };
}

const HEADER = ['STT', 'Họ và tên', 'Ngày sinh', 'Giới tính'];

test('P1 đa sheet: mỗi sheet là 1 lớp', async () => {
  const file = makeFile([
    { name: '1A01', aoa: [HEADER, [1, 'Nguyễn Văn An', '01/09/2018', 'Nam']] },
    { name: '1A02', aoa: [HEADER, [1, 'Trần Thị Bình', '02/09/2018', 'Nữ']] }
  ]);
  const res = await parseExcelWorkbook(file, []);
  assert.equal(res.totalSheets, 2);
  assert.deepEqual(res.sheets.map(s => s.sheetName).sort(), ['1A01', '1A02']);
});

test('P2 bỏ qua sheet HUONG_DAN / template', async () => {
  const file = makeFile([
    { name: 'HUONG_DAN', aoa: [['Hướng dẫn sử dụng file mẫu']] },
    { name: 'Template', aoa: [HEADER] },
    { name: '1A01', aoa: [HEADER, [1, 'Nguyễn Văn An', '01/09/2018', 'Nam']] }
  ]);
  const res = await parseExcelWorkbook(file, []);
  const names = res.sheets.map(s => s.sheetName);
  assert.ok(!names.includes('HUONG_DAN'));
  assert.ok(!names.includes('Template'));
  assert.ok(names.includes('1A01'));
});

test('P3 tự dò header khi có dòng rác phía trên', async () => {
  const file = makeFile([{ name: '1A01', aoa: [
    ['TRƯỜNG TIỂU HỌC ABC'],
    ['DANH SÁCH LỚP 1A01 - NĂM HỌC 2026-2027'],
    [],
    HEADER,
    [1, 'Nguyễn Văn An', '01/09/2018', 'Nam']
  ] }]);
  const res = await parseExcelWorkbook(file, []);
  assert.equal(res.sheets[0].validRows, 1);
  assert.equal(res.sheets[0].students[0].name, 'Nguyễn Văn An');
});

test('P4 bỏ dòng chữ ký / chân trang (GVCN, Hiệu trưởng)', async () => {
  const file = makeFile([{ name: '1A01', aoa: [
    HEADER,
    [1, 'Nguyễn Văn An', '01/09/2018', 'Nam'],
    [],
    ['', 'Giáo viên chủ nhiệm', '', ''],
    ['', 'Hiệu trưởng', '', '']
  ] }]);
  const res = await parseExcelWorkbook(file, []);
  assert.equal(res.sheets[0].validRows, 1, 'chỉ 1 HS hợp lệ, bỏ dòng chữ ký');
});

test('P5 giới tính không hợp lệ -> đánh dấu lỗi', async () => {
  const file = makeFile([{ name: '1A01', aoa: [
    HEADER,
    [1, 'Nguyễn Văn An', '01/09/2018', 'Nam'],
    [2, 'Lỗi Giới Tính', '02/09/2018', 'XYZ']
  ] }]);
  const res = await parseExcelWorkbook(file, []);
  assert.equal(res.sheets[0].errorRows, 1);
  const bad = res.sheets[0].students.find(s => s.name === 'Lỗi Giới Tính');
  assert.equal(bad.status, 'error');
});

test('P6 thiếu ngày sinh -> cảnh báo (không phải lỗi chặn)', async () => {
  const file = makeFile([{ name: '1A01', aoa: [
    HEADER,
    [1, 'Nguyễn Văn An', '', 'Nam']
  ] }]);
  const res = await parseExcelWorkbook(file, []);
  const s = res.sheets[0].students[0];
  assert.equal(s.dob, '');
  assert.ok(s.warning, 'phải có cảnh báo thiếu ngày sinh');
  assert.notEqual(s.status, 'error');
});

test('P7 cùng tên khác ngày sinh: cả 2 hợp lệ; trùng hệt trong sheet -> existing', async () => {
  const file = makeFile([{ name: '1A01', aoa: [
    HEADER,
    [1, 'Nguyễn Văn An', '01/09/2018', 'Nam'],
    [2, 'Nguyễn Văn An', '15/03/2018', 'Nam'],
    [3, 'Nguyễn Văn An', '01/09/2018', 'Nam']
  ] }]);
  const res = await parseExcelWorkbook(file, []);
  assert.equal(res.sheets[0].validRows, 2, 'hai bạn cùng tên khác ngày sinh đều hợp lệ');
  assert.equal(res.sheets[0].existingRows, 1, 'dòng trùng hệt bị đánh existing');
});

test('P8 parseExcelDate: serial / dd-mm-yyyy / yyyy-mm-dd, không lệch timezone', () => {
  assert.equal(parseExcelDate('01/09/2018'), '01/09/2018');
  assert.equal(parseExcelDate('1/9/2018'), '01/09/2018');
  assert.equal(parseExcelDate('01-09-2018'), '01/09/2018');
  assert.equal(parseExcelDate('2018-09-01'), '01/09/2018');
  // Excel serial 43748 = 10/10/2019 (UTC-safe, không lệch -1 ngày)
  assert.equal(parseExcelDate(43748), '10/10/2019');
  assert.equal(parseExcelDate(''), '');
});

test('P9 normalizeGender: Nam/Nữ/M/F/Male/Female + giá trị lạ', () => {
  assert.deepEqual(normalizeGender('Nam'), { value: 'Nam', isValid: true });
  assert.deepEqual(normalizeGender('nữ'), { value: 'Nữ', isValid: true });
  assert.equal(normalizeGender('M').value, 'Nam');
  assert.equal(normalizeGender('M').isValid, true);
  assert.equal(normalizeGender('F').value, 'Nữ');
  assert.equal(normalizeGender('male').value, 'Nam');
  assert.equal(normalizeGender('female').value, 'Nữ');
  assert.equal(normalizeGender('XYZ').isValid, false);
});

test('P10 lớp đã tồn tại + HS trùng (tên+ngày sinh) -> existing', async () => {
  const existingClasses = [{
    id: 'class_existing_1', name: '1A01',
    students: [{ name: 'Nguyễn Văn An', dob: '01/09/2018' }]
  }];
  const file = makeFile([{ name: '1A01', aoa: [
    HEADER,
    [1, 'Nguyễn Văn An', '01/09/2018', 'Nam'],
    [2, 'Trần Thị Mới', '02/09/2018', 'Nữ']
  ] }]);
  const res = await parseExcelWorkbook(file, existingClasses);
  const sheet = res.sheets[0];
  assert.equal(sheet.classExists, true);
  assert.equal(sheet.targetClassId, 'class_existing_1');
  assert.equal(sheet.existingRows, 1);
  assert.equal(sheet.validRows, 1);
});

