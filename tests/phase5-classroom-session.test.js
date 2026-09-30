// Phase 5 — Classroom Session Core Tests
// ═══════════════════════════════════════════════════════
// Tests cho các chức năng core của Classroom Session:
// - Session CRUD + trạng thái (RUNNING, PAUSED, COMPLETED, CANCELLED)
// - Participation & Stars
// - Activities lifecycle
// - Session Events & Logging
// ═══════════════════════════════════════════════════════

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Cô lập DB test riêng
const tmpDir = path.join(os.tmpdir(), `eduict_phase5_${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

process.env.EDUICT_APP_ROOT = tmpDir;
process.env.EDUICT_DATA_DIR = tmpDir;
process.env.EDUICT_DB_PATH = path.join(tmpDir, `phase5_test_${Date.now()}.sqlite`);

// Dynamic import sau khi set env
const { initSchema } = await import('../server/db/schema.js');
const { getDatabase } = await import('../server/db/connection.js');
const { saveOrUpdateClass, saveStudentsForClass } = await import('../server/db/classes.js');
const {
  createSession,
  getSessionById,
  updateSession,
  deleteSession,
  getAllSessions,
  saveSessionActivities,
  addSessionEvent,
  addStudentParticipation
} = await import('../server/db/sessions.js');

// Khởi tạo schema
const db = getDatabase();
initSchema(db);

const classId = `cls_test_${Date.now()}`;
const studentIds = [
  `stu_test_an_${Date.now()}`,
  `stu_test_binh_${Date.now()}`,
  `stu_test_cuong_${Date.now()}`
];

before(() => {
  // Tạo lớp test
  saveOrUpdateClass({
    id: classId,
    name: 'Lớp 3A1',
    grade: 3,
    subject: 'Tin Học',
    schoolYear: '2025-2026'
  });

  // Tạo 3 học sinh test
  saveStudentsForClass(classId, [
    { id: studentIds[0], name: 'Nguyễn Văn An', stars: 0 },
    { id: studentIds[1], name: 'Trần Thị Bình', stars: 0 },
    { id: studentIds[2], name: 'Lê Hoàng Cường', stars: 0 }
  ]);
});

after(() => {
  try {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) { /* ok */ }
});

// ╔═══════════════════════════════════════════════════════╗
// ║  Suite 1: Session CRUD & Status Transitions          ║
// ╚═══════════════════════════════════════════════════════╝
describe('Phase 5 — Session CRUD & Status', () => {
  let sessionId;

  it('Tạo session mới', () => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Bài 1: Làm quen máy tính',
      session_date: '2025-12-15',
      duration_minutes: 35,
      objectives: 'Nhận biết các bộ phận máy tính',
      teacher_notes: 'Cần chuẩn bị phòng máy trước'
    });
    sessionId = s.id;
    assert.ok(sessionId, 'Session ID phải tồn tại');
    assert.equal(s.lesson_title, 'Bài 1: Làm quen máy tính');
    assert.equal(s.duration_minutes, 35);
    assert.equal(s.class_id, classId);
  });

  it('Đọc session theo ID', () => {
    const s = getSessionById(sessionId);
    assert.ok(s, 'Phải tìm thấy session');
    assert.equal(s.lesson_title, 'Bài 1: Làm quen máy tính');
    assert.equal(s.objectives, 'Nhận biết các bộ phận máy tính');
    // Session trả kèm activities, events, participation arrays
    assert.ok(Array.isArray(s.activities), 'Phải có mảng activities');
    assert.ok(Array.isArray(s.events), 'Phải có mảng events');
    assert.ok(Array.isArray(s.participation), 'Phải có mảng participation');
  });

  it('Cập nhật session: DRAFT → RUNNING', () => {
    const nowIso = new Date().toISOString();
    updateSession(sessionId, { status: 'RUNNING', started_at: nowIso });
    const s = getSessionById(sessionId);
    assert.equal(s.status, 'RUNNING');
    assert.ok(s.started_at, 'started_at phải có giá trị');
  });

  it('Cập nhật session: RUNNING → PAUSED', () => {
    updateSession(sessionId, { status: 'PAUSED', paused_at: new Date().toISOString() });
    const s = getSessionById(sessionId);
    assert.equal(s.status, 'PAUSED');
    assert.ok(s.paused_at, 'paused_at phải có giá trị');
  });

  it('Cập nhật session: PAUSED → RUNNING (resume)', () => {
    updateSession(sessionId, {
      status: 'RUNNING',
      paused_at: null,
      total_paused_seconds: 30
    });
    const s = getSessionById(sessionId);
    assert.equal(s.status, 'RUNNING');
    assert.equal(s.paused_at, null);
    assert.equal(s.total_paused_seconds, 30);
  });

  it('Cập nhật session: RUNNING → COMPLETED', () => {
    updateSession(sessionId, { status: 'COMPLETED', ended_at: new Date().toISOString() });
    const s = getSessionById(sessionId);
    assert.equal(s.status, 'COMPLETED');
    assert.ok(s.ended_at, 'ended_at phải có giá trị');
  });

  it('Trạng thái CANCELLED (phân biệt hủy vs kết thúc)', () => {
    const s2 = createSession({
      class_id: classId,
      lesson_title: 'Bài sẽ bị hủy',
      session_date: '2025-12-16',
      duration_minutes: 40
    });
    updateSession(s2.id, { status: 'RUNNING', started_at: new Date().toISOString() });
    updateSession(s2.id, { status: 'CANCELLED', ended_at: new Date().toISOString() });

    const cancelled = getSessionById(s2.id);
    assert.equal(cancelled.status, 'CANCELLED', 'Phải là CANCELLED, không phải COMPLETED');
  });

  it('Liệt kê sessions theo class_id', () => {
    const list = getAllSessions(classId);
    assert.ok(list.length >= 2, 'Phải có ít nhất 2 sessions đã tạo');
    list.forEach(s => {
      assert.equal(s.class_id, classId, 'Mỗi session phải thuộc classId');
    });
  });

  it('Xóa session', () => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Bài test xóa',
      session_date: '2025-12-17',
      duration_minutes: 35
    });
    deleteSession(s.id);
    const deleted = getSessionById(s.id);
    assert.ok(!deleted || deleted === null, 'Session đã xóa không tìm thấy');
  });
});

// ╔═══════════════════════════════════════════════════════╗
// ║  Suite 2: Session Activities (Lesson Flow)           ║
// ╚═══════════════════════════════════════════════════════╝
describe('Phase 5 — Session Activities', () => {
  let sessionId;

  before(() => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Bài có Activities',
      session_date: '2025-12-18',
      duration_minutes: 40
    });
    sessionId = s.id;
  });

  it('Lưu activities cho session', () => {
    const activities = [
      { id: 'act_1', type: 'WARM_UP', title: 'Khởi động', duration_minutes: 5, order_index: 0, status: 'PENDING' },
      { id: 'act_2', type: 'LESSON', title: 'Bài giảng', duration_minutes: 15, order_index: 1, status: 'PENDING' },
      { id: 'act_3', type: 'PRACTICE', title: 'Thực hành', duration_minutes: 15, order_index: 2, status: 'PENDING' },
      { id: 'act_4', type: 'REVIEW', title: 'Nhận xét', duration_minutes: 5, order_index: 3, status: 'PENDING' }
    ];
    const saved = saveSessionActivities(sessionId, activities);
    assert.equal(saved.length, 4, 'Phải lưu đủ 4 activities');
    assert.equal(saved[0].title, 'Khởi động');
    assert.equal(saved[3].title, 'Nhận xét');
  });

  it('Cập nhật activities (idempotent replace)', () => {
    const updated = [
      { id: 'act_1', type: 'WARM_UP', title: 'Khởi động nhanh', duration_minutes: 3, order_index: 0, status: 'COMPLETED' },
      { id: 'act_2', type: 'LESSON', title: 'Bài giảng', duration_minutes: 20, order_index: 1, status: 'IN_PROGRESS' },
      { id: 'act_3', type: 'PRACTICE', title: 'Thực hành', duration_minutes: 12, order_index: 2, status: 'PENDING' },
      { id: 'act_4', type: 'REVIEW', title: 'Nhận xét', duration_minutes: 5, order_index: 3, status: 'PENDING' }
    ];
    const saved = saveSessionActivities(sessionId, updated);
    assert.equal(saved.length, 4);
    assert.equal(saved[0].title, 'Khởi động nhanh', 'Title phải được update');
    assert.equal(saved[0].duration_minutes, 3, 'Duration phải được update');
    assert.equal(saved[0].status, 'COMPLETED');
    assert.equal(saved[1].status, 'IN_PROGRESS');
  });

  it('Session detail bao gồm activities', () => {
    const session = getSessionById(sessionId);
    assert.equal(session.activities.length, 4);
    assert.equal(session.activities[0].title, 'Khởi động nhanh');
  });
});

// ╔═══════════════════════════════════════════════════════╗
// ║  Suite 3: Session Events (Logging)                   ║
// ╚═══════════════════════════════════════════════════════╝
describe('Phase 5 — Session Events', () => {
  let sessionId;

  before(() => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Bài test Events',
      session_date: '2025-12-19',
      duration_minutes: 35
    });
    sessionId = s.id;
  });

  it('Ghi nhận event SESSION_STARTED', () => {
    addSessionEvent(sessionId, {
      eventType: 'SESSION_STARTED',
      details: 'Tiết học bắt đầu'
    });
    const session = getSessionById(sessionId);
    assert.equal(session.events.length, 1);
    assert.equal(session.events[0].event_type, 'SESSION_STARTED');
  });

  it('Ghi nhận nhiều events liên tiếp', () => {
    addSessionEvent(sessionId, {
      eventType: 'ACTIVITY_STARTED',
      activityId: 'act_1',
      details: 'Bắt đầu khởi động'
    });
    addSessionEvent(sessionId, {
      eventType: 'SESSION_PAUSED',
      details: 'GV tạm dừng'
    });
    addSessionEvent(sessionId, {
      eventType: 'SESSION_RESUMED',
      details: 'Tiếp tục'
    });

    const session = getSessionById(sessionId);
    assert.equal(session.events.length, 4, 'Phải có 4 events');
    const types = session.events.map(e => e.event_type);
    assert.ok(types.includes('SESSION_STARTED'));
    assert.ok(types.includes('SESSION_PAUSED'));
    assert.ok(types.includes('SESSION_RESUMED'));
  });

  it('Ghi nhận event CANCELLED', () => {
    addSessionEvent(sessionId, {
      eventType: 'SESSION_CANCELLED',
      details: 'Tiết học đã bị hủy'
    });
    const session = getSessionById(sessionId);
    const cancelEvent = session.events.find(e => e.event_type === 'SESSION_CANCELLED');
    assert.ok(cancelEvent, 'Phải có event CANCELLED');
  });
});

// ╔═══════════════════════════════════════════════════════╗
// ║  Suite 4: Student Participation & Stars              ║
// ╚═══════════════════════════════════════════════════════╝
describe('Phase 5 — Participation & Stars', () => {
  let sessionId;

  before(() => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Bài test Participation',
      session_date: '2025-12-20',
      duration_minutes: 35
    });
    sessionId = s.id;
  });

  it('Ghi nhận học sinh tham gia & cộng sao', () => {
    addStudentParticipation(sessionId, {
      student_id: studentIds[0],
      activity_id: 'act_1',
      badge_type: 'PARTICIPATION',
      stars_awarded: 2,
      note: 'Trả lời tốt'
    });

    const session = getSessionById(sessionId);
    assert.equal(session.participation.length, 1);
    assert.equal(String(session.participation[0].student_id), String(studentIds[0]));
    assert.equal(session.participation[0].stars_awarded, 2);
    assert.equal(session.participation[0].badge_type, 'PARTICIPATION');
  });

  it('Ghi nhận nhiều lần tham gia cho cùng 1 học sinh', () => {
    addStudentParticipation(sessionId, {
      student_id: studentIds[0],
      activity_id: 'act_2',
      badge_type: 'CORRECT',
      stars_awarded: 3,
      note: 'Giải bài tập đúng'
    });

    const session = getSessionById(sessionId);
    const studentRecords = session.participation.filter(
      r => String(r.student_id) === String(studentIds[0])
    );
    assert.equal(studentRecords.length, 2, 'Phải có 2 bản ghi cho cùng 1 HS');
    const totalStars = studentRecords.reduce((sum, r) => sum + r.stars_awarded, 0);
    assert.equal(totalStars, 5, 'Tổng sao phải là 2 + 3 = 5');
  });

  it('Ghi nhận tham gia cho nhiều học sinh khác nhau', () => {
    addStudentParticipation(sessionId, {
      student_id: studentIds[1],
      activity_id: 'act_1',
      badge_type: 'HELPING',
      stars_awarded: 1,
      note: 'Giúp bạn'
    });
    addStudentParticipation(sessionId, {
      student_id: studentIds[2],
      activity_id: 'act_2',
      badge_type: 'CREATIVE',
      stars_awarded: 2,
      note: 'Sáng tạo'
    });

    const session = getSessionById(sessionId);
    const uniqueStudents = new Set(session.participation.map(r => String(r.student_id)));
    assert.equal(uniqueStudents.size, 3, 'Phải có 3 HS khác nhau tham gia');
  });

  it('Sao thi đua đồng bộ vào bảng students', () => {
    // Kiểm tra trực tiếp DB: HS đầu tiên phải có ≥ 5 sao (2 + 3)
    const student = db.prepare('SELECT stars FROM students WHERE id = ?').get(String(studentIds[0]));
    assert.ok(student, 'Phải tìm thấy học sinh');
    assert.ok(student.stars >= 5, `Sao của HS[0] phải >= 5, thực tế: ${student.stars}`);
  });

  it('Ghi nhận tham gia với 0 sao (chỉ phát biểu)', () => {
    addStudentParticipation(sessionId, {
      student_id: studentIds[1],
      activity_id: 'act_3',
      badge_type: 'PARTICIPATION',
      stars_awarded: 0,
      note: 'Phát biểu nhưng chưa đúng'
    });

    const session = getSessionById(sessionId);
    const student1Records = session.participation.filter(
      r => String(r.student_id) === String(studentIds[1])
    );
    assert.equal(student1Records.length, 2, 'HS[1] phải có 2 bản ghi');
    const zeroStarRecord = student1Records.find(r => r.stars_awarded === 0);
    assert.ok(zeroStarRecord, 'Phải có bản ghi với 0 sao');
  });
});

// ╔═══════════════════════════════════════════════════════╗
// ║  Suite 5: Full Session Lifecycle                     ║
// ╚═══════════════════════════════════════════════════════╝
describe('Phase 5 — Full Session Lifecycle', () => {
  it('Vòng đời đầy đủ: CREATE → START → PAUSE → RESUME → END', () => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Bài kiểm tra Full Lifecycle',
      session_date: '2025-12-21',
      duration_minutes: 35
    });

    // Start
    updateSession(s.id, { status: 'RUNNING', started_at: new Date().toISOString() });
    addSessionEvent(s.id, { eventType: 'SESSION_STARTED', details: 'Start' });

    // Save activities
    saveSessionActivities(s.id, [
      { id: 'lc_1', type: 'WARM_UP', title: 'Khởi động', duration_minutes: 5, order_index: 0, status: 'IN_PROGRESS' }
    ]);

    // Add participation
    addStudentParticipation(s.id, {
      student_id: studentIds[0],
      activity_id: 'lc_1',
      badge_type: 'STAR',
      stars_awarded: 1,
      note: 'Test lifecycle'
    });

    // Pause
    updateSession(s.id, { status: 'PAUSED', paused_at: new Date().toISOString() });
    addSessionEvent(s.id, { eventType: 'SESSION_PAUSED', details: 'Pause' });

    // Resume
    updateSession(s.id, { status: 'RUNNING', paused_at: null, total_paused_seconds: 15 });
    addSessionEvent(s.id, { eventType: 'SESSION_RESUMED', details: 'Resume' });

    // End
    updateSession(s.id, { status: 'COMPLETED', ended_at: new Date().toISOString() });
    addSessionEvent(s.id, { eventType: 'SESSION_COMPLETED', details: 'End' });

    // Verify final state
    const final = getSessionById(s.id);
    assert.equal(final.status, 'COMPLETED');
    assert.ok(final.started_at);
    assert.ok(final.ended_at);
    assert.equal(final.total_paused_seconds, 15);
    assert.equal(final.events.length, 4, 'Phải có 4 events');
    assert.equal(final.activities.length, 1);
    assert.equal(final.participation.length, 1);
    assert.equal(final.participation[0].stars_awarded, 1);
  });
});

// ╔═══════════════════════════════════════════════════════╗
// ║  Suite 6: Security & Edge Cases                      ║
// ╚═══════════════════════════════════════════════════════╝
describe('Phase 5 — Security & Edge Cases', () => {
  it('Session ID không tồn tại trả về null', () => {
    const s = getSessionById('nonexistent_id_12345');
    assert.ok(!s || s === null, 'Phải trả null/undefined');
  });

  it('SQL injection an toàn qua parameterized queries', () => {
    const s = createSession({
      class_id: classId,
      lesson_title: "Bài ' OR 1=1 --",
      session_date: '2025-12-22',
      duration_minutes: 35
    });
    const found = getSessionById(s.id);
    assert.equal(found.lesson_title, "Bài ' OR 1=1 --", 'Ký tự đặc biệt phải được escape an toàn');
    deleteSession(s.id);
  });

  it('Duration 0 vẫn tạo session (không crash)', () => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Duration zero',
      session_date: '2025-12-22',
      duration_minutes: 0
    });
    assert.ok(s.id);
    deleteSession(s.id);
  });

  it('Session kèm activities ban đầu tạo đúng', () => {
    const s = createSession({
      class_id: classId,
      lesson_title: 'Bài có activities ngay từ đầu',
      session_date: '2025-12-23',
      duration_minutes: 40,
      activities: [
        { id: 'ia_1', type: 'WARM_UP', title: 'Khởi động', duration_minutes: 5 },
        { id: 'ia_2', type: 'LESSON', title: 'Bài giảng', duration_minutes: 20 }
      ]
    });
    assert.ok(s.id);
    assert.equal(s.activities.length, 2, 'Phải có 2 activities');
    assert.equal(s.activities[0].title, 'Khởi động');
    deleteSession(s.id);
  });
});
