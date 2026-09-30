import { seedInitialData, seedInitialLessons, seedInitialQuestions } from './seed.js';
import { sortAllStudentsInDatabase } from './classes.js';

export function initSchema(db) {
  // Bật Foreign Keys & WAL mode
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // Bảng Lớp học
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL DEFAULT 3,
      subject TEXT NOT NULL DEFAULT 'Tin Học',
      school_year TEXT DEFAULT '2025 - 2026',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Bảng Học sinh
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dob TEXT DEFAULT '',
      gender TEXT DEFAULT 'Nam',
      machine_number INTEGER,
      stars INTEGER DEFAULT 0,
      attendance TEXT DEFAULT 'present',
      skill_mouse TEXT DEFAULT 'T',
      skill_keyboard TEXT DEFAULT 'H',
      skill_paint TEXT DEFAULT 'T',
      eval_regular TEXT DEFAULT 'T',
      score_hk1 REAL,
      score_ck REAL,
      note TEXT DEFAULT '',
      PRIMARY KEY (id, class_id),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );
  `);

  // Bảng Máy hỏng phòng máy (dùng chung cho toàn bộ 23 lớp)
  db.exec(`
    CREATE TABLE IF NOT EXISTS broken_machines (
      machine_number INTEGER PRIMARY KEY,
      issue TEXT DEFAULT 'Máy gặp sự cố',
      reported_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Bảng Cài đặt hệ thống
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Bảng Quản lý các Năm học (UNIQUE năm học, chống tạo trùng)
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_years (
      year_name TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1,
      promotion_completed INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Bảng 1: Tiết Học (classroom_sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS classroom_sessions (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      lesson_title TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 35,
      session_date TEXT NOT NULL,
      objectives TEXT DEFAULT '',
      teacher_notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      started_at TEXT,
      paused_at TEXT,
      total_paused_seconds INTEGER DEFAULT 0,
      ended_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );
  `);

  // Bảng 2: Hoạt Động Trong Tiết (session_activities)
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_activities (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'PENDING',
      description TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (session_id) REFERENCES classroom_sessions(id) ON DELETE CASCADE
    );
  `);

  // Bảng 3: Nhật Ký Sự Kiện Tiết Học (session_events)
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      activity_id TEXT,
      student_id TEXT,
      details TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES classroom_sessions(id) ON DELETE CASCADE
    );
  `);

  // Bảng 4: Ghi Nhận Tham Gia & Thưởng Sao Tiết Học (student_participation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_participation (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      activity_id TEXT,
      badge_type TEXT NOT NULL,
      stars_awarded INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES classroom_sessions(id) ON DELETE CASCADE
    );
  `);

  // Chỉ mục tối ưu
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_class ON classroom_sessions(class_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON classroom_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_activities_session ON session_activities(session_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_participation_session ON student_participation(session_id);
  `);

  // Bảng Bài Học Lý Thuyết & Thực Hành (lessons)
  db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      grade INTEGER NOT NULL DEFAULT 3,
      subject TEXT NOT NULL DEFAULT 'Tin Học',
      topic TEXT DEFAULT 'Chung',
      duration_minutes INTEGER NOT NULL DEFAULT 35,
      objectives TEXT DEFAULT '',
      keywords TEXT DEFAULT '',
      teacher_notes TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'native',
      source_file_name TEXT,
      source_file_path TEXT,
      thumbnail_url TEXT,
      slide_count INTEGER DEFAULT 0,
      render_status TEXT DEFAULT 'ready',
      file_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Bảng Slide Bài Học (lesson_slides)
  db.exec(`
    CREATE TABLE IF NOT EXISTS lesson_slides (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'CONTENT',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      layout TEXT DEFAULT 'STANDARD',
      image_url TEXT DEFAULT '',
      video_url TEXT DEFAULT '',
      question_data TEXT DEFAULT '',
      activity_data TEXT DEFAULT '',
      teacher_notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );
  `);

  // Bổ sung cột liên kết lesson_id vào classroom_sessions nếu chưa có
  try {
    db.exec(`ALTER TABLE classroom_sessions ADD COLUMN lesson_id TEXT;`);
  } catch (e) {
    // Cột lesson_id đã tồn tại
  }

  // Bổ sung các cột cho tính năng Import PowerPoint (.pptx) nếu chưa có
  try { db.exec(`ALTER TABLE lessons ADD COLUMN type TEXT DEFAULT 'native';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN source_file_name TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN source_file_path TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN thumbnail_url TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN slide_count INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN render_status TEXT DEFAULT 'ready';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN file_hash TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN source_file_size INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN source_filename TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN similarity_status TEXT DEFAULT 'unique';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN similarity_score REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN duplicate_of_id TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN content_fingerprint TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE students ADD COLUMN dob TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE classes ADD COLUMN good_scores TEXT DEFAULT '[]';`); } catch (e) {}

  // Bổ sung các cột theo dõi trạng thái kết xuất slide chi tiết (per-slide render status)
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN render_status TEXT DEFAULT 'ready';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN error_code TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN error_message TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN render_attempts INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN slide_number INTEGER;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN render_path TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN thumbnail_path TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN attempts INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lesson_slides ADD COLUMN rendered_at TEXT DEFAULT '';`); } catch (e) {}

  // Bổ sung các cột phân tầng Import và Render cho bảng lessons
  try { db.exec(`ALTER TABLE lessons ADD COLUMN import_status TEXT DEFAULT 'IMPORTED';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN render_progress REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN thumbnail_path TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN total_slides INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN rendered_slides INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE lessons ADD COLUMN failed_slides INTEGER DEFAULT 0;`); } catch (e) {}

  // Chỉ mục tối ưu cho module Lesson
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_slides_lesson ON lesson_slides(lesson_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade);
    CREATE INDEX IF NOT EXISTS idx_sessions_lesson ON classroom_sessions(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_file_hash ON lessons(file_hash);
    CREATE INDEX IF NOT EXISTS idx_lessons_similarity_status ON lessons(similarity_status);
  `);

  // Bảng 1 Phân Hệ Quick Quiz: Ngân hàng câu hỏi (question_bank)
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_bank (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      grade INTEGER NOT NULL DEFAULT 3,
      subject TEXT NOT NULL DEFAULT 'Tin Học',
      topic TEXT NOT NULL DEFAULT 'TOPIC_A',
      lesson_id TEXT,
      type TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
      difficulty TEXT NOT NULL DEFAULT 'NHẬN BIẾT',
      options TEXT DEFAULT '[]',
      correct_answer TEXT NOT NULL,
      correct_index INTEGER NOT NULL DEFAULT 0,
      explanation TEXT DEFAULT '',
      points INTEGER DEFAULT 1,
      image_url TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
    );
  `);

  // Bảng 2 Phân Hệ Quick Quiz: Phiên đố vui (quiz_sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id TEXT PRIMARY KEY,
      classroom_session_id TEXT,
      class_id TEXT,
      lesson_id TEXT,
      title TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'CLASS',
      total_questions INTEGER NOT NULL DEFAULT 5,
      time_per_question INTEGER NOT NULL DEFAULT 20,
      is_random_questions INTEGER NOT NULL DEFAULT 0,
      is_random_answers INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'READY',
      current_question_index INTEGER NOT NULL DEFAULT 0,
      star_reward_per_correct INTEGER DEFAULT 1,
      total_stars_awarded INTEGER DEFAULT 0,
      average_accuracy REAL DEFAULT 0.0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (classroom_session_id) REFERENCES classroom_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
    );
  `);

  // Bảng 3 Phân Hệ Quick Quiz: Câu hỏi trong phiên (quiz_questions - snapshot xáo trộn)
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      quiz_session_id TEXT NOT NULL,
      question_bank_id TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      question TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
      difficulty TEXT,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT DEFAULT '',
      points INTEGER DEFAULT 1,
      image_url TEXT DEFAULT '',
      FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_bank_id) REFERENCES question_bank(id) ON DELETE SET NULL
    );
  `);

  // Bảng 4 Phân Hệ Quick Quiz: Kết quả thống kê theo câu (quiz_results)
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_results (
      id TEXT PRIMARY KEY,
      quiz_session_id TEXT NOT NULL,
      quiz_question_id TEXT NOT NULL,
      distribution TEXT DEFAULT '{}',
      total_responses INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      accuracy_rate REAL DEFAULT 0.0,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (quiz_question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
    );
  `);

  // Bảng 5 Phân Hệ Quick Quiz: Kết quả chi tiết từng học sinh (quiz_student_results)
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_student_results (
      id TEXT PRIMARY KEY,
      quiz_session_id TEXT NOT NULL,
      quiz_question_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_ANSWERED',
      selected_option TEXT DEFAULT '',
      stars_earned INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (quiz_question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
    );
  `);

  // Chỉ mục tối ưu cho Quick Quiz
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_qb_grade_topic ON question_bank(grade, topic);
    CREATE INDEX IF NOT EXISTS idx_qb_lesson ON question_bank(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_qq_session ON quiz_questions(quiz_session_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_qr_session ON quiz_results(quiz_session_id);
    CREATE INDEX IF NOT EXISTS idx_qsr_session ON quiz_student_results(quiz_session_id, student_id);
  `);

  // Bảng Cache & Audit Phân Hệ Trợ Giảng AI (ai_generations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_generations (
      id TEXT PRIMARY KEY,
      feature TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      model TEXT,
      input_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      result_json TEXT,
      error_code TEXT,
      prompt_version TEXT DEFAULT 'v1',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ai_cache ON ai_generations(feature, input_hash);
    CREATE INDEX IF NOT EXISTS idx_ai_entity ON ai_generations(feature, entity_id);
  `);

  // Migration: Bổ sung cột source cho question_bank nếu chưa có
  try { db.exec(`ALTER TABLE question_bank ADD COLUMN source TEXT DEFAULT 'MANUAL';`); } catch (e) {}
  try { db.exec(`ALTER TABLE question_bank ADD COLUMN is_deleted INTEGER DEFAULT 0;`); } catch (e) {}

  // Kiểm tra nếu chưa có dữ liệu thì nạp dữ liệu mẫu 5 khối lớp
  const countRow = db.prepare('SELECT COUNT(*) as count FROM classes;').get();
  if (countRow.count === 0) {
    seedInitialData(db);
  }

  // Kiểm tra nếu chưa có bài học thì nạp bài học mẫu
  const countLessons = db.prepare('SELECT COUNT(*) as count FROM lessons;').get();
  if (countLessons.count === 0) {
    seedInitialLessons(db);
  }

  // Kiểm tra nếu chưa có câu hỏi trong ngân hàng thì nạp câu hỏi mẫu
  const countQB = db.prepare('SELECT COUNT(*) as count FROM question_bank;').get();
  if (countQB.count === 0) {
    seedInitialQuestions(db);
  }

  // Đảm bảo toàn bộ học sinh trong cơ sở dữ liệu được sắp xếp theo thứ tự A-Z chuẩn tiếng Việt
  sortAllStudentsInDatabase(db);
}
