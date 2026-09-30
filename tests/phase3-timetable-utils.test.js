/**
 * Giai đoạn 3 — Client pure utils (src/utils/timetable.js)
 *
 * Chạy TÁCH BIỆT để GIỮ NGUYÊN baseline `npm test` = 9/9:
 *   node --test tests/phase3-timetable-utils.test.js
 *
 * timetable.js KHÔNG có import tương đối nào (module thuần) nên import trực tiếp
 * bằng .js chạy được trên Node ESM — KHÔNG cần extensionless-loader, KHÔNG chạm DB.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const tt = await import('../src/utils/timetable.js');

// --- abbreviateSubject -------------------------------------------------------

test('A1 abbreviateSubject: bảng viết tắt cố định', () => {
  assert.equal(tt.abbreviateSubject('Tin học'), 'Tin');
  assert.equal(tt.abbreviateSubject('Công nghệ'), 'CN');
  assert.equal(tt.abbreviateSubject('Hoạt động trải nghiệm'), 'HĐTN');
  assert.equal(tt.abbreviateSubject('Giáo dục thể chất'), 'GDTC');
});

test('A2 abbreviateSubject: rỗng/không phải chuỗi -> chuỗi rỗng', () => {
  assert.equal(tt.abbreviateSubject(''), '');
  assert.equal(tt.abbreviateSubject(null), '');
  assert.equal(tt.abbreviateSubject(undefined), '');
  assert.equal(tt.abbreviateSubject(123), '');
});

test('A3 abbreviateSubject: tên ngắn giữ nguyên; tên lạ dài -> viết tắt an toàn', () => {
  assert.equal(tt.abbreviateSubject('Toán'), 'Toán');           // <= 6 ký tự
  const abbr = tt.abbreviateSubject('Khoa học tự nhiên');       // không có trong bảng
  assert.ok(typeof abbr === 'string' && abbr.length > 0 && abbr.length <= 6);
});

// --- flattenTimetable --------------------------------------------------------

test('F1 flattenTimetable: bỏ ô trống & ô nghỉ, giữ ô có lớp', () => {
  const g = {
    1: { morning: { 1: null, 2: { className: '3A2', subject: 'Tin học', grade: 3 } }, afternoon: { 1: { isOff: true, note: 'Nghỉ' } } }
  };
  const list = tt.flattenTimetable(g);
  assert.equal(list.length, 1);
  assert.equal(list[0].className, '3A2');
  assert.equal(list[0].day, 1);
  assert.equal(list[0].session, 'morning');
  assert.equal(list[0].period, 2);
});

test('F2 flattenTimetable: đầu vào không hợp lệ -> mảng rỗng', () => {
  assert.deepEqual(tt.flattenTimetable(null), []);
  assert.deepEqual(tt.flattenTimetable('x'), []);
});

// --- normalizeTimetableGrid --------------------------------------------------

test('N1 normalizeTimetableGrid: dựng đúng hình dạng ngày 1..5 / sáng 1..4 / chiều 1..3', () => {
  const g = tt.normalizeTimetableGrid({ 2: { morning: { 1: { className: '4A4', subject: 'Tin học' } } } });
  assert.ok(g[1] && g[2] && g[3] && g[4] && g[5]);
  assert.equal(Object.keys(g[1].morning).length, 4);
  assert.equal(Object.keys(g[1].afternoon).length, 3);
  assert.equal(g[2].morning[1].className, '4A4');
  assert.equal(g[2].name, 'Thứ Ba');
  assert.equal(g[1].morning[1], null); // ô không khai báo -> null
});

test('N2 normalizeTimetableGrid: ô nghỉ được chuẩn hóa {isOff, note}', () => {
  const g = tt.normalizeTimetableGrid({ 3: { afternoon: { 1: { isOff: true } } } });
  assert.equal(g[3].afternoon[1].isOff, true);
  assert.equal(g[3].afternoon[1].note, 'Nghỉ');
});

test('N3 normalizeTimetableGrid: đầu vào không hợp lệ -> null', () => {
  assert.equal(tt.normalizeTimetableGrid(null), null);
  assert.equal(tt.normalizeTimetableGrid(42), null);
});

// --- detectTimetableConflicts / hasBlockingConflicts -------------------------

test('C1 detectTimetableConflicts: lưới sạch -> 0 xung đột', () => {
  const g = {
    2: { morning: { 1: { className: '4A4' } }, afternoon: {} },
    3: { morning: { 2: { className: '1A1' } }, afternoon: {} }
  };
  assert.equal(tt.detectTimetableConflicts(g).length, 0);
});

test('C2 detectTimetableConflicts: cùng lớp 2 tiết/ngày -> CLASS_SAME_DAY (error, chặn lưu)', () => {
  const g = { 1: { morning: { 1: { className: '5A1' }, 2: { className: '5A1' } }, afternoon: {} } };
  const c = tt.detectTimetableConflicts(g);
  assert.ok(c.some(x => x.type === 'CLASS_SAME_DAY' && x.severity === 'error'));
  assert.equal(tt.hasBlockingConflicts(c), true);
});

test('C3 detectTimetableConflicts: 1 lớp nhiều ngày -> CLASS_MULTI_DAY (warning, KHÔNG chặn)', () => {
  const g = {
    1: { morning: { 1: { className: '5A1' } }, afternoon: {} },
    2: { morning: { 1: { className: '5A1' } }, afternoon: {} }
  };
  const c = tt.detectTimetableConflicts(g);
  const multi = c.filter(x => x.type === 'CLASS_MULTI_DAY');
  assert.equal(multi.length, 1);
  assert.equal(multi[0].severity, 'warning');
  // Chỉ có cảnh báo -> KHÔNG chặn lưu
  assert.equal(tt.hasBlockingConflicts(c), false);
});

test('C4 detectTimetableConflicts: nhận danh sách phẳng (test độc lập)', () => {
  const list = [
    { day: 1, session: 'morning', period: 1, className: '3A2' },
    { day: 1, session: 'morning', period: 1, className: '3A3' }
  ];
  const c = tt.detectTimetableConflicts(list);
  assert.ok(c.some(x => x.type === 'SLOT_COLLISION' && x.severity === 'error'));
});

// --- getDefaultTimetable / active teacher & timetable overrides --------------

test('D1 getDefaultTimetable: trả về BẢN SAO (sửa không ảnh hưởng mặc định gốc)', () => {
  const a = tt.getDefaultTimetable();
  a[1].morning[1] = { className: 'XXX' };
  const b = tt.getDefaultTimetable();
  assert.notEqual(b[1].morning[1] && b[1].morning[1].className, 'XXX');
});

test('D2 setActiveTeacherInfo: hợp nhất lên mặc định; getActiveTeacherInfo phản ánh ngay', () => {
  tt.setActiveTeacherInfo({ name: 'GV Thử', status: 'inactive' });
  const p = tt.getActiveTeacherInfo();
  assert.equal(p.name, 'GV Thử');
  assert.equal(p.status, 'inactive');
  assert.equal(p.subject, 'Tin học'); // trường không set -> giữ mặc định
  // Khôi phục để không ảnh hưởng test khác
  tt.setActiveTeacherInfo(tt.TEACHER_INFO);
});

test('D3 setActiveTimetable: chuẩn hóa & getActiveTimetable phản ánh; getCurrentPeriodStatus đọc từ đó', () => {
  tt.setActiveTimetable({ 2: { morning: { 1: { className: '9Z9', subject: 'Tin học' } } } });
  assert.equal(tt.getActiveTimetable()[2].morning[1].className, '9Z9');
  // Khôi phục mặc định để không rò rỉ trạng thái sang test khác
  tt.setActiveTimetable(tt.getDefaultTimetable());
  assert.notEqual(tt.getActiveTimetable()[2].morning[1] && tt.getActiveTimetable()[2].morning[1].className, '9Z9');
});
