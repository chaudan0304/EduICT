import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';

// ============================================================
// PHASE 4 — LESSON LIBRARY + LESSON MANAGEMENT + POWERPOINT
// ============================================================
// Cô lập DB: trỏ EDUICT_APP_ROOT/DATA_DIR/DB_PATH sang temp directory
// KHÔNG chạm edumaster.sqlite thật.

const tmpDir = path.join(os.tmpdir(), `eduict_phase4_${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

process.env.EDUICT_APP_ROOT = tmpDir;
process.env.EDUICT_DATA_DIR = tmpDir;
process.env.EDUICT_DB_PATH = path.join(tmpDir, `phase4_test_${Date.now()}.sqlite`);

// Dynamic import sau khi set env
const { initSchema } = await import('../server/db/schema.js');
const { getDatabase, getDatabasePath } = await import('../server/db/connection.js');
const {
  getAllLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  duplicateLesson,
  getLessonByFileHash,
  saveLessonSlides,
  syncLessonOverallRenderStatus,
  extractLessonSortKey,
  sortLessonsList
} = await import('../server/db/lessons.js');

// Khởi tạo schema
const db = getDatabase();
initSchema(db);

// Cleanup sau test
after(() => {
  try {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}
});

// ============================================================
// I. LESSON CRUD
// ============================================================
describe('Phase 4 — Lesson CRUD', () => {
  let testLessonId;

  it('Tạo bài học native mới', () => {
    const lesson = createLesson({
      title: 'Bài 1: Làm quen với máy tính',
      grade: 3,
      subject: 'Tin Học',
      topic: 'Chương 1: Máy tính - Người bạn mới',
      duration_minutes: 35,
      type: 'native',
      objectives: 'Giúp học sinh làm quen với máy tính'
    });
    assert.ok(lesson);
    assert.ok(lesson.id);
    assert.equal(lesson.title, 'Bài 1: Làm quen với máy tính');
    assert.equal(lesson.grade, 3);
    assert.equal(lesson.type, 'native');
    testLessonId = lesson.id;
  });

  it('Đọc bài học theo ID', () => {
    const lesson = getLessonById(testLessonId);
    assert.ok(lesson);
    assert.equal(lesson.id, testLessonId);
    assert.equal(lesson.title, 'Bài 1: Làm quen với máy tính');
    assert.equal(lesson.grade, 3);
  });

  it('Cập nhật bài học', () => {
    const updated = updateLesson(testLessonId, {
      title: 'Bài 1: Làm quen với máy tính (Cập nhật)',
      duration_minutes: 40
    });
    assert.ok(updated);
    assert.equal(updated.title, 'Bài 1: Làm quen với máy tính (Cập nhật)');
    assert.equal(updated.duration_minutes, 40);
  });

  it('Xóa bài học có thông tin tham chiếu session', () => {
    const result = deleteLesson(testLessonId);
    assert.ok(result.success);
    assert.equal(result.id, testLessonId);
    assert.equal(typeof result.referencedSessions, 'number');
    const deleted = getLessonById(testLessonId);
    assert.equal(deleted, null);
  });

  it('Nhân bản bài học', () => {
    const original = createLesson({
      title: 'Bài 2: Bàn phím và chuột',
      grade: 3,
      type: 'native',
      topic: 'Chương 1: Máy tính - Người bạn mới'
    });
    const cloned = duplicateLesson(original.id);
    assert.ok(cloned);
    assert.notEqual(cloned.id, original.id);
    assert.ok(cloned.title.includes('(Bản sao)'));
    assert.equal(cloned.grade, original.grade);
  });
});

// ============================================================
// II. LESSON FILTERING (Grade, Topic, Type)
// ============================================================
describe('Phase 4 — Lesson Filtering', () => {
  before(() => {
    // Tạo bài mẫu cho nhiều khối
    for (let grade = 1; grade <= 5; grade++) {
      createLesson({
        title: `Bài 1: Tin học khối ${grade}`,
        grade,
        type: 'native',
        topic: `Chương 1: Khối ${grade}`
      });
    }
    // Bài imported (PowerPoint)
    createLesson({
      title: 'Bài 3: Tập vẽ tranh (PowerPoint)',
      grade: 3,
      type: 'imported',
      topic: 'Chương 1: Máy tính - Người bạn mới',
      file_hash: 'abc123hash',
      source_file_name: 'Bai_3_Tap_ve_tranh.pptx'
    });
  });

  it('Lọc theo Khối lớp', () => {
    const grade3 = getAllLessons({ grade: 3 });
    assert.ok(grade3.length > 0);
    grade3.forEach(l => assert.equal(l.grade, 3));
  });

  it('Lọc theo loại bài (native)', () => {
    const nativeLessons = getAllLessons({ grade: 3, type: 'native' });
    assert.ok(nativeLessons.length > 0);
    nativeLessons.forEach(l => {
      assert.ok(l.type === 'native' || l.type === null);
    });
  });

  it('Lọc theo loại bài (imported/powerpoint)', () => {
    const imported = getAllLessons({ grade: 3, type: 'imported' });
    assert.ok(imported.length > 0);
    imported.forEach(l => assert.equal(l.type, 'imported'));
  });

  it('Lọc theo loại bài (powerpoint alias)', () => {
    const pptx = getAllLessons({ grade: 3, type: 'powerpoint' });
    assert.ok(pptx.length > 0);
    pptx.forEach(l => assert.equal(l.type, 'imported'));
  });

  it('Lọc theo chủ đề (Topic)', () => {
    const withTopic = getAllLessons({ grade: 3, topic: 'Chương 1: Máy tính - Người bạn mới' });
    assert.ok(withTopic.length > 0);
    withTopic.forEach(l => assert.equal(l.topic, 'Chương 1: Máy tính - Người bạn mới'));
  });

  it('type=all trả về tất cả', () => {
    const all = getAllLessons({ grade: 3, type: 'all' });
    const noFilter = getAllLessons({ grade: 3 });
    assert.equal(all.length, noFilter.length);
  });

  it('Tìm kiếm từ khóa', () => {
    const results = getAllLessons({ search: 'PowerPoint' });
    assert.ok(results.length > 0);
    assert.ok(results.some(l => l.title.includes('PowerPoint') || (l.keywords && l.keywords.includes('PowerPoint'))));
  });
});

// ============================================================
// III. PPTX — HASH, DUPLICATE, METADATA
// ============================================================
describe('Phase 4 — PPTX Hash & Duplicate', () => {
  it('getLessonByFileHash tìm đúng bài theo SHA-256', () => {
    const lesson = createLesson({
      title: 'Bài Hash Test',
      grade: 4,
      type: 'imported',
      file_hash: 'sha256_test_hash_abc123def456',
      source_file_name: 'hash_test.pptx'
    });
    const found = getLessonByFileHash('sha256_test_hash_abc123def456');
    assert.ok(found);
    assert.equal(found.id, lesson.id);
  });

  it('getLessonByFileHash không phân biệt hoa/thường', () => {
    const found = getLessonByFileHash('SHA256_TEST_HASH_ABC123DEF456');
    assert.ok(found);
    assert.equal(found.title, 'Bài Hash Test');
  });

  it('getLessonByFileHash trả null/undefined khi hash không tồn tại', () => {
    const found = getLessonByFileHash('nonexistent_hash_xyz');
    assert.ok(!found, 'Phải trả về falsy khi hash không tồn tại');
  });

  it('getLessonByFileHash trả null khi hash rỗng/null', () => {
    assert.equal(getLessonByFileHash(null), null);
    assert.equal(getLessonByFileHash(''), null);
  });

  it('Bài imported lưu đầy đủ metadata PPTX', () => {
    const lesson = createLesson({
      title: 'Bài PowerPoint đầy đủ',
      grade: 3,
      type: 'imported',
      file_hash: 'full_meta_hash_001',
      source_file_name: 'Bai_PPTX_full.pptx',
      source_file_path: '/uploads/presentations/les_001/original.pptx',
      source_file_size: 2048000,
      slide_count: 14,
      render_status: 'processing',
      content_fingerprint: 'fp_test_001',
      similarity_status: 'unique'
    });

    const detail = getLessonById(lesson.id);
    assert.equal(detail.type, 'imported');
    assert.equal(detail.file_hash, 'full_meta_hash_001');
    assert.ok(detail.source_file_name === 'Bai_PPTX_full.pptx' || detail.source_filename === 'Bai_PPTX_full.pptx');
    assert.equal(detail.source_file_path, '/uploads/presentations/les_001/original.pptx');
    assert.equal(detail.source_file_size, 2048000);
    assert.equal(detail.content_fingerprint, 'fp_test_001');
    assert.equal(detail.similarity_status, 'unique');
  });
});

// ============================================================
// IV. RENDER STATUS
// ============================================================
describe('Phase 4 — Render Status', () => {
  it('Bài mới có render_status mặc định ready', () => {
    const lesson = createLesson({
      title: 'Bài Render Test',
      grade: 3,
      type: 'native'
    });
    assert.equal(lesson.renderStatus, 'ready');
  });

  it('Bài imported processing có trạng thái rõ ràng', () => {
    const lesson = createLesson({
      title: 'Bài Processing',
      grade: 3,
      type: 'imported',
      render_status: 'processing',
      import_status: 'IMPORTED'
    });
    assert.equal(lesson.renderStatus, 'processing');
    assert.equal(lesson.importStatus, 'IMPORTED');
  });

  it('Bài imported thất bại render vẫn giữ import_status IMPORTED', () => {
    const lesson = createLesson({
      title: 'Bài Render Failed',
      grade: 3,
      type: 'imported',
      render_status: 'failed',
      import_status: 'IMPORTED',
      file_hash: 'render_fail_test'
    });
    assert.equal(lesson.renderStatus, 'failed');
    assert.equal(lesson.importStatus, 'IMPORTED');
    // Bài vẫn tồn tại và quản lý được
    const found = getLessonById(lesson.id);
    assert.ok(found);
    assert.equal(found.title, 'Bài Render Failed');
  });

  it('syncLessonOverallRenderStatus tính toán đúng trạng thái partial', () => {
    const lesson = createLesson({
      title: 'Bài Partial Render',
      grade: 3,
      type: 'imported',
      slides: [
        { type: 'IMPORTED_SLIDE', title: 'Slide 1', image_url: '/img/s1.png', render_status: 'ready' },
        { type: 'IMPORTED_SLIDE', title: 'Slide 2', image_url: '', render_status: 'failed' },
        { type: 'IMPORTED_SLIDE', title: 'Slide 3', image_url: '/img/s3.png', render_status: 'ready' }
      ]
    });
    const synced = syncLessonOverallRenderStatus(lesson.id);
    assert.ok(synced);
    assert.equal(synced.overallStatus, 'partial');
    assert.equal(synced.total, 3);
    assert.equal(synced.readyCount, 2);
    assert.equal(synced.failedCount, 1);
  });
});

// ============================================================
// V. TITLE EXTRACTION & SORTING
// ============================================================
describe('Phase 4 — Title & Sorting', () => {
  it('extractLessonSortKey xử lý tiêu đề tiếng Việt đầy đủ', () => {
    const key = extractLessonSortKey('Bài 12: Tổ chức lưu trữ thông tin trong máy tính');
    assert.equal(key.lessonNum, 12);
    assert.equal(key.lessonSuffix, '');
  });

  it('extractLessonSortKey xử lý Bài 8A, Bài 8B', () => {
    const keyA = extractLessonSortKey('Bài 8A: Phần mềm vẽ');
    const keyB = extractLessonSortKey('Bài 8B: Phần mềm trình chiếu');
    assert.equal(keyA.lessonNum, 8);
    assert.equal(keyA.lessonSuffix, 'A');
    assert.equal(keyB.lessonNum, 8);
    assert.equal(keyB.lessonSuffix, 'B');
  });

  it('sortLessonsList sắp xếp đúng thứ tự tự nhiên', () => {
    const lessons = [
      { title: 'Bài 10: Mười', grade: 3 },
      { title: 'Bài 2: Hai', grade: 3 },
      { title: 'Bài 1: Một', grade: 3 },
      { title: 'Bài 8A: Tám A', grade: 3 },
      { title: 'Bài 8B: Tám B', grade: 3 },
    ];
    const sorted = sortLessonsList(lessons);
    assert.equal(sorted[0].title, 'Bài 1: Một');
    assert.equal(sorted[1].title, 'Bài 2: Hai');
    assert.equal(sorted[2].title, 'Bài 8A: Tám A');
    assert.equal(sorted[3].title, 'Bài 8B: Tám B');
    assert.equal(sorted[4].title, 'Bài 10: Mười');
  });

  it('Title dài tiếng Việt được giữ nguyên', () => {
    const lesson = createLesson({
      title: 'Bài 3: Tập vẽ tranh bằng phần mềm Paint — Chủ đề: Ứng dụng Tin học trong đời sống',
      grade: 3,
      type: 'native'
    });
    const detail = getLessonById(lesson.id);
    assert.equal(detail.title, 'Bài 3: Tập vẽ tranh bằng phần mềm Paint — Chủ đề: Ứng dụng Tin học trong đời sống');
  });

  it('Teacher có thể override title', () => {
    const lesson = createLesson({
      title: 'Bài auto-detected',
      grade: 3,
      type: 'imported'
    });
    const updated = updateLesson(lesson.id, {
      title: 'Bài 5: Tên do giáo viên đặt — Tiêu đề đầy đủ chính xác'
    });
    assert.equal(updated.title, 'Bài 5: Tên do giáo viên đặt — Tiêu đề đầy đủ chính xác');
  });
});

// ============================================================
// VI. INTEGRATION — Session ↔ Lesson
// ============================================================
describe('Phase 4 — Session & Lesson Integration', () => {
  it('classroom_sessions có cột lesson_id', () => {
    const info = db.prepare("PRAGMA table_info(classroom_sessions);").all();
    const lessonIdCol = info.find(c => c.name === 'lesson_id');
    assert.ok(lessonIdCol, 'Bảng classroom_sessions phải có cột lesson_id');
  });

  it('Session có thể lưu lesson_id reference', () => {
    const lesson = createLesson({
      title: 'Bài cho Session Test',
      grade: 3,
      type: 'imported'
    });

    // Tạo class để test
    db.prepare("INSERT OR IGNORE INTO classes (id, name, grade) VALUES (?, ?, ?);").run('cls_test_p4', 'Lớp Test P4', 3);

    // Tạo session liên kết lesson
    const sessionId = `sess_test_p4_${Date.now()}`;
    db.prepare(`
      INSERT INTO classroom_sessions (id, class_id, lesson_id, lesson_title, duration_minutes, session_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `).run(sessionId, 'cls_test_p4', lesson.id, lesson.title, 35, '2026-09-29', 'DRAFT');

    const row = db.prepare("SELECT lesson_id, lesson_title FROM classroom_sessions WHERE id = ?;").get(sessionId);
    assert.equal(row.lesson_id, lesson.id);
    assert.equal(row.lesson_title, lesson.title);
  });
});

// ============================================================
// VII. GRADE 1-5 SUPPORT
// ============================================================
describe('Phase 4 — Khối 1-5', () => {
  it('Hỗ trợ Khối 1 đến 5', () => {
    for (let grade = 1; grade <= 5; grade++) {
      const lessons = getAllLessons({ grade });
      const gradeLesson = lessons.find(l => l.title.includes(`khối ${grade}`));
      assert.ok(gradeLesson, `Phải có bài của Khối ${grade}`);
      assert.equal(gradeLesson.grade, grade);
    }
  });

  it('Lọc grade=all trả về tất cả khối', () => {
    const all = getAllLessons({ grade: 'all' });
    const grades = new Set(all.map(l => l.grade));
    assert.ok(grades.size >= 3, 'Phải có ít nhất 3 khối lớp khác nhau');
  });
});

// ============================================================
// VIII. SECURITY — File Extension & Path
// ============================================================
describe('Phase 4 — Security', () => {
  it('SQL tham số hóa — tên có ký tự đặc biệt an toàn', () => {
    const lesson = createLesson({
      title: "Bài O'Brien — Test <script>alert(1)</script>",
      grade: 3,
      type: 'native'
    });
    const detail = getLessonById(lesson.id);
    assert.equal(detail.title, "Bài O'Brien — Test <script>alert(1)</script>");
  });

  it('Lesson ID path traversal safe (deleteLessonPresentationsDir)', async () => {
    // Import pptxService
    const { deleteLessonPresentationsDir } = await import('../server/pptxService.js');
    // Should not throw for safe ID
    deleteLessonPresentationsDir('les_safe_123');
    // Should handle null/empty safely
    deleteLessonPresentationsDir(null);
    deleteLessonPresentationsDir('');
  });
});
