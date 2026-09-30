/**
 * Giai đoạn 3 — STEP 7 INTEGRATION: kiểm thử HTTP end-to-end cho
 * /api/teacher-profile và /api/timetable qua handleApiRequest (router thật),
 * KHÔNG mở socket, KHÔNG chạm CSDL thật.
 *
 * Cô lập DB y hệt các test Phase 3 khác: trỏ EDUICT_* sang thư mục tạm TRƯỚC
 * khi import server. Chạy TÁCH BIỆT để giữ nguyên baseline `npm test` = 9/9:
 *   node --test tests/phase3-timetable-http.test.js
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_p3http_'));
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = path.join(TMP_ROOT, 'p3http.sqlite');

const { handleApiRequest } = await import('../server/routes/index.js');
const db = await import('../server/db.js');

function resetSettings() {
  db.getDatabase().exec("DELETE FROM app_settings WHERE key IN ('teacher_profile', 'timetable_data');");
}

// Mock req (Readable phát body JSON) + res (thu statusCode/headers/body)
async function call(method, pathname, body) {
  const req = Readable.from([body === undefined ? '' : JSON.stringify(body)]);
  req.method = method;
  req.url = pathname;
  req.headers = { host: 'localhost' };

  let ended, endedBody = '';
  const done = new Promise((resolve) => { ended = resolve; });
  const res = {
    statusCode: 200,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; },
    end(chunk) { if (chunk) endedBody += chunk; ended(); }
  };

  const handled = await handleApiRequest(req, res);
  await done;
  let json = null;
  try { json = endedBody ? JSON.parse(endedBody) : null; } catch { json = endedBody; }
  return { handled, status: res.statusCode, json };
}

before(() => resetSettings());
after(() => { try { db.getDatabase().close?.(); } catch { /* noop */ } });

function grid(cellsByDay) {
  const out = {};
  for (let d = 1; d <= 5; d++) out[d] = { morning: { 1: null, 2: null, 3: null, 4: null }, afternoon: { 1: null, 2: null, 3: null } };
  for (const [day, mut] of Object.entries(cellsByDay)) mut(out[Number(day)]);
  return out;
}

// --- Hồ sơ giáo viên ---------------------------------------------------------

test('H1 GET /api/teacher-profile: trả 200 + hồ sơ mặc định', async () => {
  resetSettings();
  const r = await call('GET', '/api/teacher-profile');
  assert.equal(r.handled, true);
  assert.equal(r.status, 200);
  assert.equal(r.json.name, 'Nguyễn Văn Châu Đàn');
});

test('H2 POST /api/teacher-profile hợp lệ: 200 {success, profile} + lưu bền', async () => {
  resetSettings();
  const r = await call('POST', '/api/teacher-profile', { name: 'Phạm Thị D', subject: 'Tin học', status: 'inactive' });
  assert.equal(r.status, 200);
  assert.equal(r.json.success, true);
  assert.equal(r.json.profile.name, 'Phạm Thị D');
  // Đọc lại qua HTTP thấy bản đã lưu
  const g = await call('GET', '/api/teacher-profile');
  assert.equal(g.json.name, 'Phạm Thị D');
  assert.equal(g.json.status, 'inactive');
});

test('H3 POST /api/teacher-profile tên rỗng: 400 {error}', async () => {
  resetSettings();
  const r = await call('POST', '/api/teacher-profile', { name: '  ' });
  assert.equal(r.status, 400);
  assert.ok(/Tên giáo viên/.test(r.json.error));
});

// --- Thời khóa biểu ----------------------------------------------------------

test('H4 GET /api/timetable (trống): 200 {timetable:null}', async () => {
  resetSettings();
  const r = await call('GET', '/api/timetable');
  assert.equal(r.status, 200);
  assert.equal(r.json.timetable, null);
});

test('H5 POST /api/timetable {timetable: grid} hợp lệ: 200 + đọc lại đúng', async () => {
  resetSettings();
  const g = grid({ 2: (d) => { d.morning[1] = { subject: 'Tin học', className: '4A4', grade: 4 }; } });
  const r = await call('POST', '/api/timetable', { timetable: g }); // client bọc {timetable}
  assert.equal(r.status, 200);
  assert.equal(r.json.success, true);
  const read = await call('GET', '/api/timetable');
  assert.equal(read.json.timetable[2].morning[1].className, '4A4');
});

test('H6 POST /api/timetable xung đột (1 lớp 2 tiết/ngày): 409 {success:false, conflicts}', async () => {
  resetSettings();
  const g = grid({ 1: (d) => { d.morning[1] = { className: '5A1' }; d.morning[3] = { className: '5A1' }; } });
  const r = await call('POST', '/api/timetable', g); // gửi grid trực tiếp (không bọc)
  assert.equal(r.status, 409);
  assert.equal(r.json.success, false);
  assert.ok(Array.isArray(r.json.conflicts) && r.json.conflicts.length >= 1);
  // Không được ghi khi xung đột
  const read = await call('GET', '/api/timetable');
  assert.equal(read.json.timetable, null);
});
