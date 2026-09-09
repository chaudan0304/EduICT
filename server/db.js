import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'edumaster.sqlite');

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
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

  // Chỉ mục tối ưu cho module Lesson
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_slides_lesson ON lesson_slides(lesson_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade);
    CREATE INDEX IF NOT EXISTS idx_sessions_lesson ON classroom_sessions(lesson_id);
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
}

function seedInitialData(db) {
  const initialClasses = [
    { id: 'class_1a1', name: 'Lớp 1A1', grade: 1, subject: 'Tin Học 1 (Làm quen & Vẽ Paint)' },
    { id: 'class_2a1', name: 'Lớp 2A1', grade: 2, subject: 'Tin Học 2 (Luyện phím & Vẽ hình)' },
    { id: 'class_3a1', name: 'Lớp 3A1', grade: 3, subject: 'Tin Học 3 (Gõ 10 ngón & Paint)' },
    { id: 'class_4a1', name: 'Lớp 4A1', grade: 4, subject: 'Tin Học 4 (Word & PowerPoint)' },
    { id: 'class_5a1', name: 'Lớp 5A1', grade: 5, subject: 'Tin Học 5 (Lập trình Scratch & Internet)' },
  ];

  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, grade, subject, school_year) 
    VALUES (?, ?, ?, ?, '2025 - 2026');
  `);

  const insertStudent = db.prepare(`
    INSERT INTO students (
      id, class_id, name, gender, machine_number, stars, attendance,
      skill_mouse, skill_keyboard, skill_paint, eval_regular, score_hk1, score_ck, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  // Dữ liệu mẫu học sinh 5 khối
  const sampleStudents = {
    class_1a1: [
      { id: 'HS101', name: 'Nguyễn Tuấn Anh', gender: 'Nam', m: 1, s: 15, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Cầm chuột đúng cách, vẽ bông hoa đẹp' },
      { id: 'HS102', name: 'Trần Bảo Châu', gender: 'Nữ', m: 2, s: 22, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Thao tác kéo thả rất nhanh, chăm chỉ' },
      { id: 'HS103', name: 'Lê Minh Đăng', gender: 'Nam', m: 3, s: 10, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Biết click đúp mở phần mềm Paint' },
      { id: 'HS104', name: 'Phạm Quỳnh Giang', gender: 'Nữ', m: 4, s: 18, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Tô màu khéo, không lem ra ngoài' },
      { id: 'HS105', name: 'Vũ Đức Khang', gender: 'Nam', m: 5, s: 8, m_skill: 'H', k_skill: 'C', p_skill: 'H', ev: 'H', note: 'Cần luyện thêm tìm phím Enter và Space' },
      { id: 'HS106', name: 'Đỗ Thảo Linh', gender: 'Nữ', m: 6, s: 14, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Rất ngoan, ngồi đúng tư thế' },
      { id: 'HS107', name: 'Bùi Gia Minh', gender: 'Nam', m: 7, s: 9, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Đã biết di chuyển chuột mượt mà' },
      { id: 'HS108', name: 'Ngô Ngọc Mai', gender: 'Nữ', m: 8, s: 20, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Biết chọn hình tròn, hình vuông trong Paint' },
    ],
    class_2a1: [
      { id: 'HS201', name: 'Trịnh Bảo An', gender: 'Nữ', m: 1, s: 18, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Gõ hàng phím cơ sở tốt' },
      { id: 'HS202', name: 'Lý Quốc Bảo', gender: 'Nam', m: 2, s: 14, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Vẽ ngôi nhà và cây xanh rất sáng tạo' },
      { id: 'HS203', name: 'Dương Khánh Chi', gender: 'Nữ', m: 3, s: 25, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Thao tác gõ chữ tiếng Việt cơ bản nhanh' },
      { id: 'HS204', name: 'Mai Hữu Đạt', gender: 'Nam', m: 4, s: 9, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Cần chú ý đặt đúng ngón tay trên phím F và J' },
      { id: 'HS205', name: 'Cao Diễm Hằng', gender: 'Nữ', m: 5, s: 16, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Biết phóng to thu nhỏ hình vẽ' },
      { id: 'HS206', name: 'Phan Tuấn Kiệt', gender: 'Nam', m: 6, s: 11, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Chăm chỉ hoàn thành bài luyện gõ' },
    ],
    class_3a1: [
      { id: 'HS301', name: 'Nguyễn Thành Long', gender: 'Nam', m: 1, s: 28, hk1: 9.5, ck: 10.0, ev: 'T', note: 'Gõ 10 ngón chuẩn xác, hoàn thành bài sớm' },
      { id: 'HS302', name: 'Lê Thuỳ Trang', gender: 'Nữ', m: 2, s: 24, hk1: 9.0, ck: 9.5, ev: 'T', note: 'Hiểu bài nhanh, hướng dẫn bạn cùng máy' },
      { id: 'HS303', name: 'Trần Quang Huy', gender: 'Nam', m: 3, s: 12, hk1: 7.5, ck: 8.0, ev: 'H', note: 'Thao tác gõ tiếng Việt Telex tiến bộ' },
      { id: 'HS304', name: 'Võ Minh Thư', gender: 'Nữ', m: 4, s: 19, hk1: 8.5, ck: 9.0, ev: 'T', note: 'Vẽ tranh phong cảnh Paint rất khéo' },
      { id: 'HS305', name: 'Phạm Đức Trọng', gender: 'Nam', m: 5, s: 8, hk1: 6.5, ck: 7.0, ev: 'H', note: 'Cần rèn luyện thêm gõ hàng phím trên' },
      { id: 'HS306', name: 'Đỗ Ngọc Bích', gender: 'Nữ', m: 6, s: 26, hk1: 9.5, ck: 9.5, ev: 'T', note: 'Nắm vững quy tắc an toàn phòng máy' },
      { id: 'HS307', name: 'Hoàng Anh Tuấn', gender: 'Nam', m: 7, s: 10, hk1: 7.0, ck: 7.5, ev: 'H', note: 'Có tiến bộ trong thực hành tạo thư mục' },
      { id: 'HS308', name: 'Đặng Mai Chi', gender: 'Nữ', m: 8, s: 17, hk1: 8.5, ck: 9.0, ev: 'T', note: 'Soạn đoạn thơ ngắn đúng dấu' },
    ],
    class_4a1: [
      { id: 'HS401', name: 'Bùi Đức Anh', gender: 'Nam', m: 1, s: 20, hk1: 9.0, ck: 9.5, ev: 'T', note: 'Định dạng phông chữ, cỡ chữ văn bản rất chuẩn' },
      { id: 'HS402', name: 'Nguyễn Hoàng Yến', gender: 'Nữ', m: 2, s: 32, hk1: 10.0, ck: 10.0, ev: 'T', note: 'Chèn ảnh và tạo hiệu ứng trình chiếu đẹp mắt' },
      { id: 'HS403', name: 'Lê Gia Hưng', gender: 'Nam', m: 3, s: 13, hk1: 7.5, ck: 8.0, ev: 'H', note: 'Biết chèn bảng đơn giản trong Word' },
      { id: 'HS404', name: 'Trần Phương Uyên', gender: 'Nữ', m: 4, s: 21, hk1: 9.0, ck: 9.0, ev: 'T', note: 'Tìm kiếm thông tin trên Internet an toàn' },
      { id: 'HS405', name: 'Vũ Quốc Khánh', gender: 'Nam', m: 5, s: 9, hk1: 6.5, ck: 7.0, ev: 'H', note: 'Cần lưu bài đúng vào thư mục cá nhân' },
      { id: 'HS406', name: 'Phạm Hồng Nhung', gender: 'Nữ', m: 6, s: 25, hk1: 9.5, ck: 9.5, ev: 'T', note: 'Thiết kế slide bài thuyết trình rất sinh động' },
    ],
    class_5a1: [
      { id: 'HS501', name: 'Đoàn Nhật Minh', gender: 'Nam', m: 1, s: 35, hk1: 10.0, ck: 10.0, ev: 'T', note: 'Lập trình nhân vật Scratch chuyển động mượt mà' },
      { id: 'HS502', name: 'Võ Khánh Vy', gender: 'Nữ', m: 2, s: 27, hk1: 9.5, ck: 9.5, ev: 'T', note: 'Tạo game mê cung Scratch rất sáng tạo' },
      { id: 'HS503', name: 'Hoàng Trung Kiên', gender: 'Nam', m: 3, s: 22, hk1: 9.0, ck: 9.5, ev: 'T', note: 'Hiểu câu lệnh lặp và rẽ nhánh if-then' },
      { id: 'HS504', name: 'Ngô Thảo Nguyên', gender: 'Nữ', m: 4, s: 15, hk1: 8.0, ck: 8.5, ev: 'H', note: 'Nhập dữ liệu vào bảng tính cẩn thận' },
      { id: 'HS505', name: 'Đinh Trọng Phúc', gender: 'Nam', m: 5, s: 11, hk1: 7.0, ck: 7.5, ev: 'H', note: 'Cần chú ý thêm khối lệnh âm thanh trong Scratch' },
      { id: 'HS506', name: 'Trần Mỹ Dung', gender: 'Nữ', m: 6, s: 30, hk1: 9.5, ck: 10.0, ev: 'T', note: 'Xuất sắc, tư duy logic rất tốt' },
    ]
  };

  for (const c of initialClasses) {
    insertClass.run(c.id, c.name, c.grade, c.subject);
    const stuList = sampleStudents[c.id] || [];
    for (const s of stuList) {
      insertStudent.run(
        s.id,
        c.id,
        s.name,
        s.gender,
        s.m,
        s.s || 0,
        'present',
        s.m_skill || 'T',
        s.k_skill || 'H',
        s.p_skill || 'T',
        s.ev || 'T',
        s.hk1 || null,
        s.ck || null,
        s.note || ''
      );
    }
  }
}

// Nạp dữ liệu bài học mẫu chuẩn GDPT 2018 cho môn Tin học
function seedInitialLessons(db) {
  const sampleLessons = [
    {
      id: 'les_k4_internet',
      title: 'Bài: Internet và Tìm kiếm thông tin',
      grade: 4,
      subject: 'Tin Học 4',
      topic: 'Mạng máy tính & Internet',
      duration_minutes: 35,
      objectives: 'Học sinh hiểu được mạng Internet là gì; Nêu được các lợi ích cơ bản của Internet trong học tập và giải trí; Biết mở trình duyệt Web và tìm kiếm thông tin bằng Google.',
      keywords: 'Internet, Trình duyệt Web, Tìm kiếm thông tin, An toàn mạng',
      teacher_notes: 'Gợi ý khởi động: Đặt câu hỏi xem các em thường dùng Internet để làm gì ở nhà hoặc ở trường.',
      slides: [
        {
          id: 'slide_k4_1',
          type: 'TITLE',
          title: 'Bài: Internet & Tìm kiếm thông tin',
          content: 'Môn Tin học 4 • Thời lượng 35 phút\nGiáo viên giảng dạy: Thầy/Cô bộ môn Tin học',
          layout: 'STANDARD',
          teacher_notes: 'Chào cả lớp, ổn định trật tự và giới thiệu tên bài học.'
        },
        {
          id: 'slide_k4_2',
          type: 'CONTENT',
          title: '1. Internet là gì?',
          content: '• Internet là mạng kết nối các máy tính trên phạm vi toàn thế giới.\n• Người dùng có thể tìm kiếm, chia sẻ thông tin và học tập trực tuyến.\n• Kho tàng thông tin phong phú: bài giảng, video, hình ảnh và tài liệu học tập.',
          layout: 'STANDARD',
          teacher_notes: 'Hỏi học sinh: Ngoài máy tính, thiết bị nào có thể kết nối Internet? (Điện thoại, tivi, máy tính bảng).'
        },
        {
          id: 'slide_k4_3',
          type: 'IMAGE',
          title: 'Mô hình mạng lưới Internet toàn cầu',
          content: 'Hàng triệu máy tính và thiết bị thông minh liên kết trao đổi dữ liệu với nhau không giới hạn khoảng cách địa lý.',
          layout: 'SPLIT_RIGHT',
          image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=60',
          teacher_notes: 'Chỉ vào sơ đồ và giải thích mạng Internet như một mạng lưới tơ nhện khổng lồ.'
        },
        {
          id: 'slide_k4_4',
          type: 'QUESTION',
          title: 'Thử tài Tin học: Nhận biết lợi ích của Internet',
          content: 'Em hãy chọn đáp án đúng nhất cho câu hỏi bên dưới:',
          layout: 'CENTERED',
          question_data: JSON.stringify({
            question: 'Hành vi nào dưới đây KHÔNG NÊN làm khi sử dụng Internet?',
            options: [
              'A. Tìm kiếm hình ảnh và tài liệu phục vụ bài học',
              'B. Chơi trò chơi điện tử suốt đêm không đi ngủ',
              'C. Xem video khoa học khám phá vũ trụ',
              'D. Trao đổi bài tập với thầy cô và bạn bè'
            ],
            correct_index: 1,
            explanation: 'Chơi game thâu đêm gây tổn hại nghiêm trọng cho mắt, sức khỏe và việc học. Cần sử dụng Internet điều độ và có sự đồng ý của cha mẹ.'
          }),
          teacher_notes: 'Dùng Vòng Quay May Mắn để gọi 1 học sinh trả lời, sau đó bấm vào đáp án B để kiểm tra giải thích.'
        },
        {
          id: 'slide_k4_5',
          type: 'ACTIVITY',
          title: 'Hoạt động thực hành: Tìm kiếm thông tin trên Web',
          content: 'Nhiệm vụ: Mở trình duyệt Google Chrome, truy cập trang google.com và tìm kiếm hình ảnh loài hoa em yêu thích. Lưu ảnh vào thư mục cá nhân.',
          layout: 'STANDARD',
          activity_data: JSON.stringify({
            format: 'pair',
            duration: 10,
            task: 'Ngồi ghép đôi 2 bạn/máy: 1 bạn thao tác chuột tìm kiếm, 1 bạn hỗ trợ gõ từ khóa chính xác.'
          }),
          teacher_notes: 'Bấm nút bắt đầu đếm giờ 10 phút, đi quanh các dãy máy quan sát và hỗ trợ học sinh gặp khó khăn.'
        },
        {
          id: 'slide_k4_6',
          type: 'SUMMARY',
          title: 'Ghi nhớ kiến thức cốt lõi',
          content: '1. Internet là mạng máy tính toàn cầu kết nối hàng triệu thiết bị.\n2. Lợi ích: Học tập, tìm kiếm thông tin, giải trí lành mạnh.\n3. An toàn mạng: Tuyệt đối không chia sẻ mật khẩu, địa chỉ nhà hay thông tin cá nhân cho người lạ.',
          layout: 'STANDARD',
          teacher_notes: 'Yêu cầu 1-2 học sinh đọc to phần ghi nhớ trước khi kết thúc bài học.'
        }
      ]
    },
    {
      id: 'les_k3_computer',
      title: 'Bài: Khám phá máy tính và các bộ phận',
      grade: 3,
      subject: 'Tin Học 3',
      topic: 'Máy tính và Em',
      duration_minutes: 35,
      objectives: 'Nhận biết được 4 bộ phận cơ bản của máy tính để bàn: Màn hình, Thân máy, Bàn phím, Chuột. Biết chức năng cơ bản của từng bộ phận.',
      keywords: 'Màn hình, Thân máy, Bàn phím, Chuột máy tính',
      teacher_notes: 'Chỉ trực quan vào máy tính trước mặt học sinh.',
      slides: [
        {
          id: 'slide_k3_1',
          type: 'TITLE',
          title: 'Khám phá máy tính',
          content: 'Môn Tin học 3 • Bài 1: Người bạn mới của em',
          layout: 'STANDARD',
          teacher_notes: 'Khơi gợi sự tò mò: Các em đã thấy máy tính ở những nơi nào?'
        },
        {
          id: 'slide_k3_2',
          type: 'CONTENT',
          title: '4 bộ phận cơ bản của máy tính để bàn',
          content: '1. Màn hình (Monitor): Hiển thị kết quả làm việc của máy tính.\n2. Thân máy (Case): Chứa bộ xử lý trung tâm (CPU) - đầu não của máy tính.\n3. Bàn phím (Keyboard): Có nhiều phím, dùng để nhập chữ và số.\n4. Chuột (Mouse): Giúp điều khiển máy tính nhanh chóng và thuận tiện.',
          layout: 'STANDARD',
          teacher_notes: 'Chỉ vào từng bộ phận trên máy giáo viên và yêu cầu học sinh chỉ vào máy của các em.'
        },
        {
          id: 'slide_k3_3',
          type: 'QUESTION',
          title: 'Thử tài quan sát',
          content: 'Em hãy chọn bộ phận thích hợp:',
          layout: 'CENTERED',
          question_data: JSON.stringify({
            question: 'Bộ phận nào được ví như "Bộ não" điều khiển mọi hoạt động của máy tính?',
            options: [
              'A. Màn hình máy tính',
              'B. Thân máy (chứa bộ xử lý CPU)',
              'C. Bàn phím máy tính',
              'D. Con chuột máy tính'
            ],
            correct_index: 1,
            explanation: 'Thân máy chứa bộ xử lý trung tâm (CPU) đóng vai trò như bộ não xử lý mọi phép tính và mệnh lệnh.'
          }),
          teacher_notes: 'Khen thưởng 1 sao cho học sinh trả lời nhanh và chính xác.'
        },
        {
          id: 'slide_k3_4',
          type: 'ACTIVITY',
          title: 'Thực hành: Cầm chuột đúng cách',
          content: 'Học sinh đặt bàn tay phải lên chuột: Ngón trỏ đặt nhẹ lên nút trái, ngón giữa đặt lên nút phải, các ngón còn lại giữ hai bên thân chuột. Luyện tập di chuyển con trỏ chuột trên màn hình.',
          layout: 'STANDARD',
          activity_data: JSON.stringify({
            format: 'individual',
            duration: 8,
            task: 'Thực hành cá nhân: Cầm chuột đúng cách và nhấp chuột vào biểu tượng trên màn hình Desktop.'
          }),
          teacher_notes: 'Nhắc nhở các em ngồi thẳng lưng, mắt cách màn hình 50-70cm.'
        },
        {
          id: 'slide_k3_5',
          type: 'SUMMARY',
          title: 'Em cần ghi nhớ',
          content: '• Máy tính để bàn gồm 4 bộ phận chính: Màn hình, Thân máy, Bàn phím và Chuột.\n• Ngồi học đúng tư thế giúp bảo vệ mắt và cột sống.\n• Tắt máy đúng quy trình khi kết thúc giờ học.',
          layout: 'STANDARD',
          teacher_notes: 'Nhắc học sinh xếp ghế gọn gàng trước khi ra về.'
        }
      ]
    },
    {
      id: 'les_k5_typing',
      title: 'Bài: Kỹ năng soạn thảo văn bản Tiếng Việt',
      grade: 5,
      subject: 'Tin Học 5',
      topic: 'Ứng dụng Tin học',
      duration_minutes: 35,
      objectives: 'Nắm vững quy tắc gõ chữ Tiếng Việt có dấu theo kiểu gõ Telex; Biết định dạng chữ đậm, nghiêng, chọn cỡ chữ và phông chữ phù hợp.',
      keywords: 'Soạn thảo văn bản, Word, Kiểu gõ Telex, Unikey',
      teacher_notes: 'Nhắc học sinh kiểm tra biểu tượng chữ V màu đỏ của Unikey ở góc phải màn hình.',
      slides: [
        {
          id: 'slide_k5_1',
          type: 'TITLE',
          title: 'Soạn thảo văn bản Tiếng Việt',
          content: 'Tin học 5 • Kỹ năng thực hành văn phòng cơ bản',
          layout: 'STANDARD',
          teacher_notes: 'Kiểm tra phần mềm Unikey và Word trên máy học sinh trước khi dạy.'
        },
        {
          id: 'slide_k5_2',
          type: 'CONTENT',
          title: 'Quy tắc gõ chữ có dấu kiểu Telex',
          content: '• Các chữ có mũ, móc: aa → â, aw → ă, ee → ê, oo → ô, ow → ơ, uw → ư, dd → đ\n• Các dấu thanh: s → Sắc, f → Huyền, r → Hỏi, x → Ngã, j → Nặng\n• Xóa dấu: gõ thêm chữ z ở cuối từ.',
          layout: 'STANDARD',
          teacher_notes: 'Cho học sinh nhẩm thuộc lòng câu thần chú: sắc s, huyền f, hỏi r, ngã x, nặng j.'
        },
        {
          id: 'slide_k5_3',
          type: 'QUESTION',
          title: 'Kiểm tra quy tắc gõ',
          content: 'Em hãy chọn cách gõ đúng cho từ bên dưới:',
          layout: 'CENTERED',
          question_data: JSON.stringify({
            question: 'Để gõ từ "HỌC TẬP" theo kiểu Telex, em gõ như thế nào?',
            options: [
              'A. Hocj taapj',
              'B. Hoocj taapj',
              'C. Hojc taapj',
              'D. Hocj tapj'
            ],
            correct_index: 0,
            explanation: 'Hocj = Học (j là dấu nặng); taapj = Tập (aa thành â, j là dấu nặng).'
          }),
          teacher_notes: 'Giải thích vì sao đáp án B, C, D sai để học sinh tránh nhầm lẫn vị trí gõ dấu.'
        },
        {
          id: 'slide_k5_4',
          type: 'ACTIVITY',
          title: 'Thực hành: Gõ đoạn thơ ngắn',
          content: 'Mở Microsoft Word, gõ khổ thơ 4 câu về mái trường. Định dạng tiêu đề in đậm (Ctrl + B), màu xanh dương, nội dung bài thơ cỡ chữ 14.',
          layout: 'STANDARD',
          activity_data: JSON.stringify({
            format: 'individual',
            duration: 12,
            task: 'Mỗi học sinh tự gõ bài vào file Word và lưu lại với tên của mình.'
          }),
          teacher_notes: 'Bấm giờ thực hành 12 phút, cộng 2 sao cho 3 bạn gõ nhanh và không mắc lỗi chính tả.'
        },
        {
          id: 'slide_k5_5',
          type: 'SUMMARY',
          title: 'Quy tắc vàng khi soạn thảo',
          content: '1. Luôn gõ dấu thanh ở cuối mỗi từ để tránh lỗi font chữ.\n2. Dấu câu (. , : ;) phải đặt sát từ phía trước, sau đó mới bấm dấu cách (Space).\n3. Tập thói quen nhấn Ctrl + S thường xuyên để lưu bài.',
          layout: 'STANDARD',
          teacher_notes: 'Khen ngợi cả lớp đã hoàn thành tốt bài thực hành.'
        }
      ]
    }
  ];

  const insertLesson = db.prepare(`
    INSERT INTO lessons (id, title, grade, subject, topic, duration_minutes, objectives, keywords, teacher_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const insertSlide = db.prepare(`
    INSERT INTO lesson_slides (id, lesson_id, order_index, type, title, content, layout, image_url, video_url, question_data, activity_data, teacher_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const les of sampleLessons) {
    insertLesson.run(
      les.id,
      les.title,
      les.grade,
      les.subject,
      les.topic,
      les.duration_minutes,
      les.objectives,
      les.keywords,
      les.teacher_notes
    );

    les.slides.forEach((sl, idx) => {
      insertSlide.run(
        sl.id,
        les.id,
        idx,
        sl.type,
        sl.title || '',
        sl.content || '',
        sl.layout || 'STANDARD',
        sl.image_url || '',
        sl.video_url || '',
        sl.question_data || '',
        sl.activity_data || '',
        sl.teacher_notes || ''
      );
    });
  }
}

function seedInitialQuestions(db) {
  const insertStmt = db.prepare(`
    INSERT INTO question_bank (
      id, question, grade, subject, topic, lesson_id, type, difficulty,
      options, correct_answer, correct_index, explanation, points
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const sampleQuestions = [
    // Khối 3
    {
      id: 'qb_k3_01',
      question: 'Bộ phận nào của máy tính dùng để gõ chữ và số vào máy?',
      grade: 3,
      topic: 'TOPIC_A',
      lesson_id: 'les_k3_computer',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Bàn phím', 'Màn hình', 'Chuột máy tính', 'Thân máy'],
      correct_answer: 'Bàn phím',
      correct_index: 0,
      explanation: 'Bàn phím gồm nhiều phím chữ và số, dùng để đưa thông tin văn bản vào máy tính.',
      points: 1
    },
    {
      id: 'qb_k3_02',
      question: 'Thao tác "Nhấp đúp chuột" (Double click) là gì?',
      grade: 3,
      topic: 'TOPIC_A',
      lesson_id: 'les_k3_computer',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Nhấn nút trái chuột 1 lần', 'Nhấn nút trái chuột nhanh 2 lần liên tiếp', 'Nhấn giữ nút phải chuột', 'Lăn nút cuộn chuột'],
      correct_answer: 'Nhấn nút trái chuột nhanh 2 lần liên tiếp',
      correct_index: 1,
      explanation: 'Nhấp đúp chuột là thao tác nhấn nhanh nút chuột trái 2 lần liên tiếp để mở phần mềm hoặc tệp tin.',
      points: 1
    },
    {
      id: 'qb_k3_03',
      question: 'Ngồi học máy tính đúng tư thế giúp ích gì cho em?',
      grade: 3,
      topic: 'TOPIC_A',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Bảo vệ mắt và không bị mỏi lưng, vẹo cột sống', 'Gõ phím phát ra tiếng to hơn', 'Máy tính chạy nhanh hơn gấp đôi', 'Không cần dùng bàn phím'],
      correct_answer: 'Bảo vệ mắt và không bị mỏi lưng, vẹo cột sống',
      correct_index: 0,
      explanation: 'Ngồi thẳng lưng, mắt cách màn hình 50-70cm giúp tránh cận thị và bảo vệ cột sống.',
      points: 1
    },
    {
      id: 'qb_k3_04',
      question: 'Biểu tượng của phần mềm vẽ Paint trên máy tính thường có hình gì?',
      grade: 3,
      topic: 'TOPIC_E',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Hộp đựng bút chì màu và bảng màu', 'Một chiếc đồng hồ cát', 'Một quyển sách màu đỏ', 'Một chiếc loa phát thanh'],
      correct_answer: 'Hộp đựng bút chì màu và bảng màu',
      correct_index: 0,
      explanation: 'Phần mềm Paint là công cụ tập vẽ tranh đơn giản có icon bảng vẽ và cọ tô màu.',
      points: 1
    },
    {
      id: 'qb_k3_05',
      question: 'Khi đang trong phòng thực hành Tin học, hành vi nào sau đây là ĐÚNG quy tắc?',
      grade: 3,
      topic: 'TOPIC_D',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'VẬN DỤNG',
      options: ['Mang đồ ăn nước uống vào bàn phím', 'Tự ý cắm rút dây điện phía sau máy', 'Ngồi đúng vị trí máy được phân công và giữ gìn thiết bị', 'Đùa giỡn chạy nhảy trong phòng'],
      correct_answer: 'Ngồi đúng vị trí máy được phân công và giữ gìn thiết bị',
      correct_index: 2,
      explanation: 'Học sinh phải ngồi đúng số máy, không mang đồ ăn thức uống để phòng tránh cháy chập và bảo vệ phòng máy.',
      points: 1
    },
    {
      id: 'qb_k3_06',
      question: 'Trên bàn phím máy tính, hai phím nào trên hàng phím cơ sở có gờ nổi?',
      grade: 3,
      topic: 'TOPIC_A',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Phím F và phím J', 'Phím A và phím L', 'Phím Space và phím Enter', 'Phím Shift và phím Ctrl'],
      correct_answer: 'Phím F và phím J',
      correct_index: 0,
      explanation: 'Phím F và J có gờ nổi làm mốc để đặt 2 ngón trỏ khi luyện gõ 10 ngón.',
      points: 1
    },

    // Khối 4
    {
      id: 'qb_k4_01',
      question: 'Mạng Internet dùng để làm gì trong học tập và đời sống?',
      grade: 4,
      topic: 'TOPIC_B',
      lesson_id: 'les_k4_internet',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Chỉ để chơi trò chơi điện tử', 'Kết nối các máy tính và tìm kiếm, trao đổi thông tin toàn cầu', 'Để tự động in sách vở', 'Tắt máy tính từ xa'],
      correct_answer: 'Kết nối các máy tính và tìm kiếm, trao đổi thông tin toàn cầu',
      correct_index: 1,
      explanation: 'Internet là mạng toàn cầu kết nối hàng triệu máy tính, kho tài liệu khổng lồ phục vụ học tập.',
      points: 1
    },
    {
      id: 'qb_k4_02',
      question: 'Phần mềm nào sau đây là trình duyệt web giúp em xem các trang thông tin trên mạng?',
      grade: 4,
      topic: 'TOPIC_B',
      lesson_id: 'les_k4_internet',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Google Chrome, Cốc Cốc, Microsoft Edge', 'Microsoft Word', 'Paint', 'Máy tính tính toán Calculator'],
      correct_answer: 'Google Chrome, Cốc Cốc, Microsoft Edge',
      correct_index: 0,
      explanation: 'Google Chrome và Microsoft Edge là các trình duyệt web phổ biến để truy cập Internet.',
      points: 1
    },
    {
      id: 'qb_k4_03',
      question: 'Thông tin nào sau đây em TUYỆT ĐỐI KHÔNG nên chia sẻ cho người lạ trên mạng?',
      grade: 4,
      topic: 'TOPIC_D',
      lesson_id: 'les_k4_internet',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'VẬN DỤNG',
      options: ['Mật khẩu tài khoản, địa chỉ nhà riêng và số điện thoại của bố mẹ', 'Tên bài hát em yêu thích', 'Một câu đố vui dân gian', 'Tên môn học em thích ở trường'],
      correct_answer: 'Mật khẩu tài khoản, địa chỉ nhà riêng và số điện thoại của bố mẹ',
      correct_index: 0,
      explanation: 'Mật khẩu và thông tin cá nhân cần được bảo mật để tránh bị kẻ xấu lợi dụng hoặc lừa đảo.',
      points: 1
    },
    {
      id: 'qb_k4_04',
      question: 'Thư mục (Folder) trong máy tính có biểu tượng màu gì và dùng để làm gì?',
      grade: 4,
      topic: 'TOPIC_A',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Màu vàng kẹp tài liệu, dùng để chứa và phân loại các tệp tin gọn gàng', 'Màu xanh lá cây, dùng để nghe nhạc', 'Màu đỏ, dùng để báo máy bị virus', 'Màu đen, dùng để xóa vĩnh viễn tệp tin'],
      correct_answer: 'Màu vàng kẹp tài liệu, dùng để chứa và phân loại các tệp tin gọn gàng',
      correct_index: 0,
      explanation: 'Thư mục hình chiếc kẹp tài liệu màu vàng, đóng vai trò như ngăn kéo để sắp xếp tệp tin khoa học.',
      points: 1
    },
    {
      id: 'qb_k4_05',
      question: 'Trong phần mềm soạn thảo văn bản, để viết hoa toàn bộ một từ ta dùng phím nào?',
      grade: 4,
      topic: 'TOPIC_E',
      lesson_id: 'les_k5_typing',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Phím Caps Lock', 'Phím Tab', 'Phím Esc', 'Phím Space'],
      correct_answer: 'Phím Caps Lock',
      correct_index: 0,
      explanation: 'Bấm phím Caps Lock (đèn sáng) để bật chế độ gõ chữ in hoa liên tục.',
      points: 1
    },
    {
      id: 'qb_k4_06',
      question: 'Khi tìm kiếm thông tin trên Google, nếu muốn kết quả chính xác hơn em nên làm gì?',
      grade: 4,
      topic: 'TOPIC_B',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Nhập từ khóa ngắn gọn, đúng trọng tâm cần tìm', 'Gõ một đoạn văn thật dài không dấu', 'Gõ ngẫu nhiên các chữ cái', 'Chỉ nhấn nút tìm kiếm mà không gõ gì'],
      correct_answer: 'Nhập từ khóa ngắn gọn, đúng trọng tâm cần tìm',
      correct_index: 0,
      explanation: 'Từ khóa rõ ràng, súc tích giúp máy tìm kiếm lọc đúng nội dung em cần.',
      points: 1
    },

    // Khối 5
    {
      id: 'qb_k5_01',
      question: 'Trong phần mềm lập trình trực quan Scratch, nhân vật mặc định ban đầu là gì?',
      grade: 5,
      topic: 'TOPIC_F',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Chú mèo Scratch màu vàng cam', 'Một chú khủng long xanh', 'Một phi thuyền không gian', 'Một quả bóng đá'],
      correct_answer: 'Chú mèo Scratch màu vàng cam',
      correct_index: 0,
      explanation: 'Chú mèo vàng là nhân vật biểu tượng mặc định khi tạo một dự án mới trong Scratch.',
      points: 1
    },
    {
      id: 'qb_k5_02',
      question: 'Tổ hợp phím tắt chuẩn để LƯU (Save) văn bản Word hoặc bài trình chiếu PowerPoint là:',
      grade: 5,
      topic: 'TOPIC_E',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Ctrl + S', 'Ctrl + C', 'Ctrl + V', 'Ctrl + Z'],
      correct_answer: 'Ctrl + S',
      correct_index: 0,
      explanation: 'Ctrl + S (Save) giúp lưu lại kết quả bài làm để tránh mất dữ liệu khi mất điện.',
      points: 1
    },
    {
      id: 'qb_k5_03',
      question: 'Khi sử dụng tranh ảnh, tài liệu lấy từ Internet vào bài thuyết trình của mình, em nên:',
      grade: 5,
      topic: 'TOPIC_D',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Ghi rõ nguồn tác giả hoặc trang web đã lấy tài liệu để tôn trọng bản quyền', 'Nhận đó là tranh do chính mình tự vẽ hoàn toàn', 'Bán tranh đó cho các bạn khác lấy tiền', 'Xóa tên tác giả gốc đi'],
      correct_answer: 'Ghi rõ nguồn tác giả hoặc trang web đã lấy tài liệu để tôn trọng bản quyền',
      correct_index: 0,
      explanation: 'Tôn trọng bản quyền tác giả là một đức tính văn minh khi sử dụng công nghệ số.',
      points: 1
    },
    {
      id: 'qb_k5_04',
      question: 'Cấu trúc của một địa chỉ thư điện tử (Email) hợp lệ gồm có ký hiệu đặc biệt nào?',
      grade: 5,
      topic: 'TOPIC_B',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Ký hiệu @ (A-còng)', 'Ký hiệu # (Thăng)', 'Ký hiệu $ (Đô-la)', 'Ký hiệu & (Và)'],
      correct_answer: 'Ký hiệu @ (A-còng)',
      correct_index: 0,
      explanation: 'Địa chỉ email luôn có dạng tên_người_dùng@tên_nhà_cung_cấp (ví dụ: hocsinh@gmail.com).',
      points: 1
    },
    {
      id: 'qb_k5_05',
      question: 'Trong phần mềm Scratch, khối lệnh màu xanh dương "move 10 steps" có tác dụng gì?',
      grade: 5,
      topic: 'TOPIC_F',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Cho nhân vật di chuyển tiến lên 10 bước', 'Phát ra âm thanh tiếng kêu 10 lần', 'Đổi màu nhân vật thành màu xanh', 'Xóa nhân vật khỏi sân khấu'],
      correct_answer: 'Cho nhân vật di chuyển tiến lên 10 bước',
      correct_index: 0,
      explanation: 'Khối "move 10 steps" thuộc nhóm Motion (Chuyển động), điều khiển nhân vật tiến về phía trước 10 bước.',
      points: 1
    },
    {
      id: 'qb_k5_06',
      question: 'Để sao chép (Copy) và dán (Paste) một đoạn văn bản hoặc hình ảnh, ta dùng tổ hợp phím nào?',
      grade: 5,
      topic: 'TOPIC_E',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Ctrl + C để sao chép, sau đó Ctrl + V để dán', 'Ctrl + X để sao chép, sau đó Ctrl + Z để dán', 'Ctrl + A để sao chép, sau đó Ctrl + B để dán', 'Ctrl + P để sao chép, sau đó Ctrl + S để dán'],
      correct_answer: 'Ctrl + C để sao chép, sau đó Ctrl + V để dán',
      correct_index: 0,
      explanation: 'Ctrl + C (Copy) lưu vào bộ nhớ tạm, và Ctrl + V (Paste) để dán vào vị trí con trỏ.',
      points: 1
    }
  ];

  for (const q of sampleQuestions) {
    insertStmt.run(
      q.id,
      q.question,
      q.grade,
      'Tin Học',
      q.topic,
      q.lesson_id || null,
      q.type,
      q.difficulty,
      JSON.stringify(q.options),
      q.correct_answer,
      q.correct_index,
      q.explanation,
      q.points
    );
  }
}

// Lấy toàn bộ danh sách lớp kèm học sinh
export function getAllClassesWithStudents() {
  const db = getDatabase();
  const classes = db.prepare('SELECT * FROM classes ORDER BY grade ASC, name ASC;').all();
  const students = db.prepare('SELECT * FROM students ORDER BY machine_number ASC, id ASC;').all();

  // Nhóm học sinh theo class_id
  const studentMap = {};
  for (const s of students) {
    if (!studentMap[s.class_id]) {
      studentMap[s.class_id] = [];
    }
    studentMap[s.class_id].push({
      id: s.id,
      name: s.name,
      gender: s.gender,
      machineNumber: s.machine_number,
      stars: s.stars,
      attendance: s.attendance,
      skill_mouse: s.skill_mouse,
      skill_keyboard: s.skill_keyboard,
      skill_paint: s.skill_paint,
      eval_regular: s.eval_regular,
      score_hk1: s.score_hk1,
      score_ck: s.score_ck,
      note: s.note
    });
  }

  return classes.map(c => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    subject: c.subject,
    schoolYear: c.school_year,
    students: studentMap[c.id] || []
  }));
}

// Thêm hoặc cập nhật lớp học
export function saveOrUpdateClass(classData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO classes (id, name, grade, subject, school_year)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      grade = excluded.grade,
      subject = excluded.subject,
      school_year = excluded.school_year;
  `);
  stmt.run(
    classData.id,
    classData.name,
    classData.grade || 3,
    classData.subject || 'Tin Học',
    classData.schoolYear || '2025 - 2026'
  );

  if (Array.isArray(classData.students)) {
    saveStudentsForClass(classData.id, classData.students);
  }
}

// Xóa lớp học
export function deleteClassById(classId) {
  const db = getDatabase();
  db.prepare('DELETE FROM classes WHERE id = ?;').run(classId);
}

// Cập nhật danh sách học sinh của 1 lớp
export function saveStudentsForClass(classId, studentsList) {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    // Xóa danh sách học sinh cũ của lớp
    db.prepare('DELETE FROM students WHERE class_id = ?;').run(classId);

    // Chèn lại danh sách học sinh mới
    const insertStmt = db.prepare(`
      INSERT INTO students (
        id, class_id, name, gender, machine_number, stars, attendance,
        skill_mouse, skill_keyboard, skill_paint, eval_regular, score_hk1, score_ck, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const s of studentsList) {
      insertStmt.run(
        s.id,
        classId,
        s.name,
        s.gender || 'Nam',
        s.machineNumber || null,
        s.stars || 0,
        s.attendance || 'present',
        s.skill_mouse || 'T',
        s.skill_keyboard || 'H',
        s.skill_paint || 'T',
        s.eval_regular || 'T',
        s.score_hk1 !== undefined ? s.score_hk1 : null,
        s.score_ck !== undefined ? s.score_ck : null,
        s.note || ''
      );
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// Lấy danh sách máy hỏng
export function getDbBrokenMachines() {
  const db = getDatabase();
  const rows = db.prepare('SELECT machine_number FROM broken_machines;').all();
  return rows.map(r => r.machine_number);
}

// Lưu danh sách máy hỏng
export function saveDbBrokenMachines(machines) {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM broken_machines;');
    const insertStmt = db.prepare('INSERT INTO broken_machines (machine_number) VALUES (?);');
    for (const m of machines) {
      insertStmt.run(Number(m));
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// Xuất file kịch bản SQL (.sql text script) chứa CREATE TABLE và INSERT INTO
export function generateSqlScriptDump() {
  const db = getDatabase();
  const classes = db.prepare('SELECT * FROM classes;').all();
  const students = db.prepare('SELECT * FROM students;').all();
  const broken = db.prepare('SELECT * FROM broken_machines;').all();

  let sql = `-- ==========================================================\n`;
  sql += `-- EduICT Primary: Kịch bản Cơ Sở Dữ Liệu SQL (Tin Học Tiểu Học)\n`;
  sql += `-- Tạo lúc: ${new Date().toLocaleString('vi-VN')}\n`;
  sql += `-- Hệ quản trị: SQLite 3 / MySQL Compatible\n`;
  sql += `-- ==========================================================\n\n`;

  sql += `PRAGMA foreign_keys = ON;\n\n`;

  sql += `-- 1. BẢNG LỚP HỌC (classes)\n`;
  sql += `CREATE TABLE IF NOT EXISTS classes (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  name VARCHAR(100) NOT NULL,\n`;
  sql += `  grade INT NOT NULL DEFAULT 3,\n`;
  sql += `  subject VARCHAR(100) NOT NULL DEFAULT 'Tin Học',\n`;
  sql += `  school_year VARCHAR(50) DEFAULT '2025 - 2026',\n`;
  sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `);\n\n`;

  sql += `-- 2. BẢNG HỌC SINH (students)\n`;
  sql += `CREATE TABLE IF NOT EXISTS students (\n`;
  sql += `  id VARCHAR(50) NOT NULL,\n`;
  sql += `  class_id VARCHAR(50) NOT NULL,\n`;
  sql += `  name VARCHAR(150) NOT NULL,\n`;
  sql += `  gender VARCHAR(10) DEFAULT 'Nam',\n`;
  sql += `  machine_number INT,\n`;
  sql += `  stars INT DEFAULT 0,\n`;
  sql += `  attendance VARCHAR(20) DEFAULT 'present',\n`;
  sql += `  skill_mouse VARCHAR(10) DEFAULT 'T',\n`;
  sql += `  skill_keyboard VARCHAR(10) DEFAULT 'H',\n`;
  sql += `  skill_paint VARCHAR(10) DEFAULT 'T',\n`;
  sql += `  eval_regular VARCHAR(10) DEFAULT 'T',\n`;
  sql += `  score_hk1 FLOAT,\n`;
  sql += `  score_ck FLOAT,\n`;
  sql += `  note TEXT,\n`;
  sql += `  PRIMARY KEY (id, class_id),\n`;
  sql += `  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE\n`;
  sql += `);\n\n`;

  sql += `-- 3. BẢNG MÁY HỎNG PHÒNG MÁY (broken_machines)\n`;
  sql += `CREATE TABLE IF NOT EXISTS broken_machines (\n`;
  sql += `  machine_number INT PRIMARY KEY,\n`;
  sql += `  issue VARCHAR(255) DEFAULT 'Máy gặp sự cố',\n`;
  sql += `  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `);\n\n`;

  // Chèn dữ liệu classes
  if (classes.length > 0) {
    sql += `-- DỮ LIỆU BẢNG classes (${classes.length} lớp học)\n`;
    for (const c of classes) {
      const nameEscaped = (c.name || '').replace(/'/g, "''");
      const subjEscaped = (c.subject || '').replace(/'/g, "''");
      const yearEscaped = (c.school_year || '').replace(/'/g, "''");
      sql += `INSERT OR REPLACE INTO classes (id, name, grade, subject, school_year) VALUES ('${c.id}', '${nameEscaped}', ${c.grade}, '${subjEscaped}', '${yearEscaped}');\n`;
    }
    sql += `\n`;
  }

  // Chèn dữ liệu students
  if (students.length > 0) {
    sql += `-- DỮ LIỆU BẢNG students (${students.length} học sinh)\n`;
    for (const s of students) {
      const nameEscaped = (s.name || '').replace(/'/g, "''");
      const noteEscaped = (s.note || '').replace(/'/g, "''");
      const mNum = s.machine_number ? s.machine_number : 'NULL';
      const hk1 = s.score_hk1 !== null ? s.score_hk1 : 'NULL';
      const ck = s.score_ck !== null ? s.score_ck : 'NULL';
      sql += `INSERT OR REPLACE INTO students (id, class_id, name, gender, machine_number, stars, attendance, skill_mouse, skill_keyboard, skill_paint, eval_regular, score_hk1, score_ck, note) VALUES ('${s.id}', '${s.class_id}', '${nameEscaped}', '${s.gender}', ${mNum}, ${s.stars || 0}, '${s.attendance}', '${s.skill_mouse}', '${s.skill_keyboard}', '${s.skill_paint}', '${s.eval_regular}', ${hk1}, ${ck}, '${noteEscaped}');\n`;
    }
    sql += `\n`;
  }

  // Chèn dữ liệu broken_machines
  if (broken.length > 0) {
    sql += `-- DỮ LIỆU BẢNG broken_machines (${broken.length} máy hỏng)\n`;
    for (const b of broken) {
      sql += `INSERT OR REPLACE INTO broken_machines (machine_number) VALUES (${b.machine_number});\n`;
    }
    sql += `\n`;
  }

  // Dữ liệu bảng lessons
  const lessons = db.prepare('SELECT * FROM lessons;').all();
  if (lessons.length > 0) {
    sql += `-- 4. BẢNG BÀI HỌC (lessons - ${lessons.length} bài học)\n`;
    sql += `CREATE TABLE IF NOT EXISTS lessons (\n  id VARCHAR(50) PRIMARY KEY,\n  title TEXT NOT NULL,\n  grade INT NOT NULL DEFAULT 3,\n  subject VARCHAR(100) NOT NULL DEFAULT 'Tin Học',\n  topic VARCHAR(100) DEFAULT 'Chung',\n  duration_minutes INT NOT NULL DEFAULT 35,\n  objectives TEXT,\n  keywords TEXT,\n  teacher_notes TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n`;
    for (const l of lessons) {
      const tEsc = (l.title || '').replace(/'/g, "''");
      const subEsc = (l.subject || '').replace(/'/g, "''");
      const topEsc = (l.topic || '').replace(/'/g, "''");
      const objEsc = (l.objectives || '').replace(/'/g, "''");
      const keyEsc = (l.keywords || '').replace(/'/g, "''");
      const noteEsc = (l.teacher_notes || '').replace(/'/g, "''");
      sql += `INSERT OR REPLACE INTO lessons (id, title, grade, subject, topic, duration_minutes, objectives, keywords, teacher_notes) VALUES ('${l.id}', '${tEsc}', ${l.grade}, '${subEsc}', '${topEsc}', ${l.duration_minutes}, '${objEsc}', '${keyEsc}', '${noteEsc}');\n`;
    }
    sql += `\n`;
  }

  // Dữ liệu bảng lesson_slides
  const slides = db.prepare('SELECT * FROM lesson_slides ORDER BY lesson_id ASC, order_index ASC;').all();
  if (slides.length > 0) {
    sql += `-- 5. BẢNG SLIDES BÀI HỌC (lesson_slides - ${slides.length} slides)\n`;
    sql += `CREATE TABLE IF NOT EXISTS lesson_slides (\n  id VARCHAR(50) PRIMARY KEY,\n  lesson_id VARCHAR(50) NOT NULL,\n  order_index INT NOT NULL DEFAULT 0,\n  type VARCHAR(30) NOT NULL DEFAULT 'CONTENT',\n  title TEXT,\n  content TEXT,\n  layout VARCHAR(30) DEFAULT 'STANDARD',\n  image_url TEXT,\n  video_url TEXT,\n  question_data TEXT,\n  activity_data TEXT,\n  teacher_notes TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE\n);\n\n`;
    for (const s of slides) {
      const tEsc = (s.title || '').replace(/'/g, "''");
      const cEsc = (s.content || '').replace(/'/g, "''");
      const imgEsc = (s.image_url || '').replace(/'/g, "''");
      const vidEsc = (s.video_url || '').replace(/'/g, "''");
      const qEsc = (s.question_data || '').replace(/'/g, "''");
      const aEsc = (s.activity_data || '').replace(/'/g, "''");
      const nEsc = (s.teacher_notes || '').replace(/'/g, "''");
      sql += `INSERT OR REPLACE INTO lesson_slides (id, lesson_id, order_index, type, title, content, layout, image_url, video_url, question_data, activity_data, teacher_notes) VALUES ('${s.id}', '${s.lesson_id}', ${s.order_index}, '${s.type}', '${tEsc}', '${cEsc}', '${s.layout}', '${imgEsc}', '${vidEsc}', '${qEsc}', '${aEsc}', '${nEsc}');\n`;
    }
    sql += `\n`;
  }

  // Dữ liệu bảng question_bank
  const qbQuestions = db.prepare('SELECT * FROM question_bank ORDER BY grade ASC, id ASC;').all();
  if (qbQuestions.length > 0) {
    sql += `-- 6. BẢNG NGÂN HÀNG CÂU HỎI (question_bank - ${qbQuestions.length} câu hỏi)\n`;
    sql += `CREATE TABLE IF NOT EXISTS question_bank (\n  id VARCHAR(50) PRIMARY KEY,\n  question TEXT NOT NULL,\n  grade INT NOT NULL DEFAULT 3,\n  subject VARCHAR(100) NOT NULL DEFAULT 'Tin Học',\n  topic VARCHAR(50) DEFAULT 'TOPIC_A',\n  lesson_id VARCHAR(50),\n  type VARCHAR(30) NOT NULL DEFAULT 'MULTIPLE_CHOICE',\n  difficulty VARCHAR(30) DEFAULT 'NHẬN BIẾT',\n  options TEXT DEFAULT '[]',\n  correct_answer TEXT NOT NULL,\n  correct_index INT NOT NULL DEFAULT 0,\n  explanation TEXT,\n  points INT DEFAULT 1,\n  image_url TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n`;
    for (const q of qbQuestions) {
      const qEsc = (q.question || '').replace(/'/g, "''");
      const optEsc = (q.options || '').replace(/'/g, "''");
      const caEsc = (q.correct_answer || '').replace(/'/g, "''");
      const expEsc = (q.explanation || '').replace(/'/g, "''");
      const lId = q.lesson_id ? `'${q.lesson_id}'` : 'NULL';
      sql += `INSERT OR REPLACE INTO question_bank (id, question, grade, subject, topic, lesson_id, type, difficulty, options, correct_answer, correct_index, explanation, points) VALUES ('${q.id}', '${qEsc}', ${q.grade}, 'Tin Học', '${q.topic}', ${lId}, '${q.type}', '${q.difficulty}', '${optEsc}', '${caEsc}', ${q.correct_index}, '${expEsc}', ${q.points});\n`;
    }
    sql += `\n`;
  }

  return sql;
}

// Quản lý Nội quy phòng máy & Tiêu chí cộng/trừ điểm
export const DEFAULT_CLASSROOM_RULES = [
  // Điểm tốt / Khen thưởng (+)
  { id: 'rule_pos_1', type: 'positive', title: 'Phát biểu & Xây dựng bài tích cực', points: 1, icon: '🎯', category: 'Thái độ', description: 'Hăng hái xung phong giơ tay, trả lời đúng câu hỏi bài học' },
  { id: 'rule_pos_2', type: 'positive', title: 'Thực hành xuất sắc / Về đích sớm', points: 2, icon: '💻', category: 'Kỹ năng', description: 'Hoàn thành bài tập gõ phím, vẽ Paint hoặc soạn thảo nhanh và chuẩn xác' },
  { id: 'rule_pos_3', type: 'positive', title: 'Giúp đỡ bạn cùng máy / bạn cùng tiến', points: 1, icon: '🤝', category: 'Tương trợ', description: 'Nhiệt tình hướng dẫn bạn bên cạnh khi gặp khó khăn' },
  { id: 'rule_pos_4', type: 'positive', title: 'Sáng tạo vượt trội trong thực hành', points: 2, icon: '💡', category: 'Sáng tạo', description: 'Vẽ tranh phối màu đẹp, tự tìm tòi hiệu ứng mới' },
  { id: 'rule_pos_5', type: 'positive', title: 'Bảo quản tốt máy tính & an toàn điện', points: 1, icon: '🛡️', category: 'Ý thức', description: 'Tắt máy tính đúng quy trình, xếp gọn chuột và bàn phím' },
  { id: 'rule_pos_6', type: 'positive', title: 'Thành tích nổi bật / Thắng mini-game', points: 3, icon: '🏆', category: 'Khen thưởng', description: 'Đạt giải cao trong Đua Vịt, Vòng Quay hoặc giải đố Tin học' },

  // Điểm trừ / Nhắc nhở vi phạm (-)
  { id: 'rule_neg_1', type: 'negative', title: 'Tự ý chơi game / Mở ứng dụng ngoài', points: 2, icon: '🎮', category: 'Vi phạm', description: 'Mở trò chơi, xem video giải trí khi chưa có hiệu lệnh thực hành' },
  { id: 'rule_neg_2', type: 'negative', title: 'Mang đồ ăn, nước ngọt vào phòng máy', points: 2, icon: '🧃', category: 'An toàn', description: 'Nguy cơ làm đổ nước gây chập điện hoặc hỏng bàn phím máy tính' },
  { id: 'rule_neg_3', type: 'negative', title: 'Tự ý đổi chỗ ngồi / Chạy lung tung', points: 1, icon: '🪑', category: 'Kỷ luật', description: 'Rời vị trí máy tính được phân công, tranh giành chuột với bạn' },
  { id: 'rule_neg_4', type: 'negative', title: 'Làm ồn, la hét gây mất trật tự', points: 1, icon: '📢', category: 'Trật tự', description: 'Nói chuyện to, đùa giỡn làm ảnh hưởng đến các bạn đang làm bài' },
  { id: 'rule_neg_5', type: 'negative', title: 'Tắt máy bằng rút điện / Bấm nút nguồn', points: 2, icon: '🔌', category: 'An toàn thiết bị', description: 'Tắt máy sai quy trình gây lỗi hệ điều hành Windows' },
  { id: 'rule_neg_6', type: 'negative', title: 'Không xếp gọn ghế & bàn phím khi về', points: 1, icon: '🧹', category: 'Vệ sinh', description: 'Hết giờ thực hành ra về không đẩy bàn phím và ghế ngay ngắn' }
];

export function getDbRules() {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('classroom_rules');
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  saveDbRules(DEFAULT_CLASSROOM_RULES);
  return DEFAULT_CLASSROOM_RULES;
}

export function saveDbRules(rules) {
  const db = getDatabase();
  const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
  stmt.run('classroom_rules', JSON.stringify(rules));
}

// Nhập và chạy file kịch bản SQL
export function executeSqlDump(sqlString) {
  const db = getDatabase();
  db.exec(sqlString);
}

// ========================================================
// CLASSROOM SESSIONS CRUD
// ========================================================

// 1. Lấy tất cả sessions (kèm số hoạt động & lớp học)
export function getAllSessions(classId = null) {
  const db = getDatabase();
  let query = `
    SELECT 
      s.*, 
      c.name as class_name, 
      c.grade as class_grade,
      (SELECT COUNT(*) FROM session_activities a WHERE a.session_id = s.id) as activity_count,
      (SELECT COUNT(DISTINCT student_id) FROM student_participation p WHERE p.session_id = s.id) as participant_count,
      (SELECT COALESCE(SUM(stars_awarded), 0) FROM student_participation p WHERE p.session_id = s.id) as total_stars_awarded
    FROM classroom_sessions s
    LEFT JOIN classes c ON s.class_id = c.id
  `;
  const params = [];
  if (classId) {
    query += ' WHERE s.class_id = ? ';
    params.push(classId);
  }
  query += ' ORDER BY s.created_at DESC;';
  return db.prepare(query).all(...params);
}

// 2. Lấy chi tiết 1 session (kèm activities, events, participation)
export function getSessionById(sessionId) {
  const db = getDatabase();
  const session = db.prepare(`
    SELECT s.*, c.name as class_name, c.grade as class_grade
    FROM classroom_sessions s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?;
  `).get(sessionId);

  if (!session) return null;

  const activities = db.prepare(`
    SELECT * FROM session_activities 
    WHERE session_id = ? 
    ORDER BY order_index ASC;
  `).all(sessionId);

  const events = db.prepare(`
    SELECT * FROM session_events 
    WHERE session_id = ? 
    ORDER BY created_at ASC;
  `).all(sessionId);

  const participation = db.prepare(`
    SELECT * FROM student_participation 
    WHERE session_id = ? 
    ORDER BY created_at ASC;
  `).all(sessionId);

  return {
    ...session,
    activities,
    events,
    participation
  };
}

// 3. Tạo mới 1 session (kèm các activities ban đầu nếu có)
export function createSession(sessionData) {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    const sessionId = sessionData.id || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const stmt = db.prepare(`
      INSERT INTO classroom_sessions (
        id, class_id, lesson_title, duration_minutes, session_date,
        objectives, teacher_notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);

    stmt.run(
      sessionId,
      sessionData.class_id || sessionData.classId,
      sessionData.lesson_title || sessionData.lessonTitle || 'Tiết học Tin học',
      Number(sessionData.duration_minutes || sessionData.durationMinutes) || 35,
      sessionData.session_date || sessionData.sessionDate || new Date().toISOString().slice(0, 10),
      sessionData.objectives || '',
      sessionData.teacher_notes || sessionData.teacherNotes || '',
      sessionData.status || 'DRAFT'
    );

    if (Array.isArray(sessionData.activities) && sessionData.activities.length > 0) {
      const actStmt = db.prepare(`
        INSERT INTO session_activities (
          id, session_id, order_index, type, title, duration_minutes, status, description, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      sessionData.activities.forEach((act, idx) => {
        const actId = act.id || `act_${Date.now()}_${idx}`;
        actStmt.run(
          actId,
          sessionId,
          idx,
          act.type || 'ACTIVITY',
          act.title || `Hoạt động ${idx + 1}`,
          Number(act.duration_minutes || act.durationMinutes) || 5,
          act.status || 'PENDING',
          act.description || '',
          act.notes || ''
        );
      });
    }

    db.exec('COMMIT;');
    return getSessionById(sessionId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// 4. Cập nhật session (status, started_at, paused_at, total_paused_seconds, ended_at, notes...)
export function updateSession(sessionId, updateData) {
  const db = getDatabase();
  const allowed = [
    'lesson_title', 'duration_minutes', 'session_date', 'objectives', 
    'teacher_notes', 'status', 'started_at', 'paused_at', 
    'total_paused_seconds', 'ended_at'
  ];

  const setClauses = [];
  const params = [];

  for (const key of allowed) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const val = updateData[key] !== undefined ? updateData[key] : updateData[camelKey];
    if (val !== undefined) {
      setClauses.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (setClauses.length > 0) {
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(sessionId);
    const sql = `UPDATE classroom_sessions SET ${setClauses.join(', ')} WHERE id = ?;`;
    db.prepare(sql).run(...params);
  }

  return getSessionById(sessionId);
}

// 5. Xóa session
export function deleteSession(sessionId) {
  const db = getDatabase();
  db.prepare('DELETE FROM classroom_sessions WHERE id = ?;').run(sessionId);
  return { success: true };
}

// 6. Lưu / Cập nhật lại toàn bộ activities của session
export function saveSessionActivities(sessionId, activities) {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM session_activities WHERE session_id = ?;').run(sessionId);

    const actStmt = db.prepare(`
      INSERT INTO session_activities (
        id, session_id, order_index, type, title, duration_minutes, status, description, notes, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    activities.forEach((act, idx) => {
      const actId = act.id || `act_${Date.now()}_${idx}`;
      actStmt.run(
        actId,
        sessionId,
        idx,
        act.type || 'ACTIVITY',
        act.title || `Hoạt động ${idx + 1}`,
        Number(act.duration_minutes || act.durationMinutes) || 5,
        act.status || 'PENDING',
        act.description || '',
        act.notes || '',
        act.started_at || null,
        act.completed_at || null
      );
    });

    db.exec('COMMIT;');
    return db.prepare('SELECT * FROM session_activities WHERE session_id = ? ORDER BY order_index ASC;').all(sessionId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// 7. Ghi nhận event mới
export function addSessionEvent(sessionId, eventData) {
  const db = getDatabase();
  const eventId = eventData.id || `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const stmt = db.prepare(`
    INSERT INTO session_events (id, session_id, event_type, activity_id, student_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
  `);
  stmt.run(
    eventId,
    sessionId,
    eventData.event_type || eventData.eventType,
    eventData.activity_id || eventData.activityId || null,
    eventData.student_id || eventData.studentId || null,
    typeof eventData.details === 'object' ? JSON.stringify(eventData.details) : (eventData.details || '')
  );
  return { id: eventId, success: true };
}

// 8. Ghi nhận học sinh tham gia / cộng sao
export function addStudentParticipation(sessionId, pData) {
  const db = getDatabase();
  const partId = pData.id || `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const stmt = db.prepare(`
    INSERT INTO student_participation (id, session_id, student_id, activity_id, badge_type, stars_awarded, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
  `);
  stmt.run(
    partId,
    sessionId,
    pData.student_id || pData.studentId,
    pData.activity_id || pData.activityId || null,
    pData.badge_type || pData.badgeType || 'PARTICIPATION',
    Number(pData.stars_awarded || pData.starsAwarded) || 0,
    pData.note || ''
  );
  return { id: partId, success: true };
}

// ========================================================
// LESSONS & SLIDES CRUD
// ========================================================

// 1. Lấy tất cả bài học (kèm số lượng slide và bộ lọc)
export function getAllLessons(filters = {}) {
  const db = getDatabase();
  let sql = `
    SELECT 
      l.*,
      COUNT(s.id) as slides_count
    FROM lessons l
    LEFT JOIN lesson_slides s ON l.id = s.lesson_id
  `;
  const conditions = [];
  const params = [];

  if (filters.grade && filters.grade !== 'all') {
    conditions.push('l.grade = ?');
    params.push(Number(filters.grade));
  }
  if (filters.topic && filters.topic !== 'all') {
    conditions.push('l.topic = ?');
    params.push(filters.topic);
  }
  if (filters.search && filters.search.trim()) {
    conditions.push('(l.title LIKE ? OR l.keywords LIKE ? OR l.objectives LIKE ?)');
    const searchTerm = `%${filters.search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY l.id ORDER BY l.grade ASC, l.updated_at DESC;';
  return db.prepare(sql).all(...params);
}

// 2. Lấy chi tiết bài học kèm tất cả các slide
export function getLessonById(lessonId) {
  const db = getDatabase();
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?;').get(lessonId);
  if (!lesson) return null;

  const slides = db.prepare('SELECT * FROM lesson_slides WHERE lesson_id = ? ORDER BY order_index ASC;').all(lessonId);
  return {
    ...lesson,
    slides: slides.map(s => {
      let parsedQuestion = null;
      let parsedActivity = null;
      try {
        if (s.question_data) parsedQuestion = JSON.parse(s.question_data);
      } catch (e) {}
      try {
        if (s.activity_data) parsedActivity = JSON.parse(s.activity_data);
      } catch (e) {}
      return {
        ...s,
        question_parsed: parsedQuestion,
        activity_parsed: parsedActivity
      };
    })
  };
}

// 3. Tạo bài học mới
export function createLesson(lessonData) {
  const db = getDatabase();
  const lessonId = lessonData.id || `les_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  const stmt = db.prepare(`
    INSERT INTO lessons (id, title, grade, subject, topic, duration_minutes, objectives, keywords, teacher_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `);

  stmt.run(
    lessonId,
    lessonData.title || 'Bài học mới',
    Number(lessonData.grade) || 3,
    lessonData.subject || 'Tin Học',
    lessonData.topic || 'Chung',
    Number(lessonData.duration_minutes || lessonData.durationMinutes) || 35,
    lessonData.objectives || '',
    lessonData.keywords || '',
    lessonData.teacher_notes || lessonData.teacherNotes || ''
  );

  if (Array.isArray(lessonData.slides) && lessonData.slides.length > 0) {
    saveLessonSlides(lessonId, lessonData.slides);
  }

  return getLessonById(lessonId);
}

// 4. Cập nhật bài học
export function updateLesson(lessonId, lessonData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE lessons SET
      title = COALESCE(?, title),
      grade = COALESCE(?, grade),
      subject = COALESCE(?, subject),
      topic = COALESCE(?, topic),
      duration_minutes = COALESCE(?, duration_minutes),
      objectives = COALESCE(?, objectives),
      keywords = COALESCE(?, keywords),
      teacher_notes = COALESCE(?, teacher_notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `);

  stmt.run(
    lessonData.title !== undefined ? lessonData.title : null,
    lessonData.grade !== undefined ? Number(lessonData.grade) : null,
    lessonData.subject !== undefined ? lessonData.subject : null,
    lessonData.topic !== undefined ? lessonData.topic : null,
    lessonData.duration_minutes !== undefined ? Number(lessonData.duration_minutes) : (lessonData.durationMinutes !== undefined ? Number(lessonData.durationMinutes) : null),
    lessonData.objectives !== undefined ? lessonData.objectives : null,
    lessonData.keywords !== undefined ? lessonData.keywords : null,
    lessonData.teacher_notes !== undefined ? lessonData.teacher_notes : (lessonData.teacherNotes !== undefined ? lessonData.teacherNotes : null),
    lessonId
  );

  if (Array.isArray(lessonData.slides)) {
    saveLessonSlides(lessonId, lessonData.slides);
  }

  return getLessonById(lessonId);
}

// 5. Xóa bài học
export function deleteLesson(lessonId) {
  const db = getDatabase();
  db.prepare('DELETE FROM lessons WHERE id = ?;').run(lessonId);
  return { success: true, id: lessonId };
}

// 6. Nhân bản bài học (Duplicate)
export function duplicateLesson(lessonId) {
  const original = getLessonById(lessonId);
  if (!original) throw new Error('Không tìm thấy bài học gốc để nhân bản');

  const newLessonId = `les_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const newTitle = `${original.title} (Bản sao)`;

  const newSlides = (original.slides || []).map((s, idx) => ({
    ...s,
    id: `slide_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 3)}`
  }));

  createLesson({
    ...original,
    id: newLessonId,
    title: newTitle,
    slides: newSlides
  });

  return getLessonById(newLessonId);
}

// 7. Lưu toàn bộ danh sách slide của bài học (Transaction)
export function saveLessonSlides(lessonId, slidesArray) {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM lesson_slides WHERE lesson_id = ?;').run(lessonId);

    const insertStmt = db.prepare(`
      INSERT INTO lesson_slides (
        id, lesson_id, order_index, type, title, content, layout,
        image_url, video_url, question_data, activity_data, teacher_notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);

    slidesArray.forEach((s, idx) => {
      const slideId = s.id && !s.id.startsWith('temp_') ? s.id : `slide_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
      const qData = typeof s.question_data === 'object' ? JSON.stringify(s.question_data) : (typeof s.question_parsed === 'object' && s.question_parsed ? JSON.stringify(s.question_parsed) : (s.question_data || ''));
      const aData = typeof s.activity_data === 'object' ? JSON.stringify(s.activity_data) : (typeof s.activity_parsed === 'object' && s.activity_parsed ? JSON.stringify(s.activity_parsed) : (s.activity_data || ''));

      insertStmt.run(
        slideId,
        lessonId,
        idx,
        s.type || 'CONTENT',
        s.title || '',
        s.content || '',
        s.layout || 'STANDARD',
        s.image_url || s.imageUrl || '',
        s.video_url || s.videoUrl || '',
        qData,
        aData,
        s.teacher_notes || s.teacherNotes || ''
      );
    });

    db.exec('COMMIT;');
    return db.prepare('SELECT * FROM lesson_slides WHERE lesson_id = ? ORDER BY order_index ASC;').all(lessonId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// ====================================================
// PHÂN HỆ QUICK QUIZ: QUESTION BANK & QUIZ SESSIONS
// ====================================================

// 1. Lấy danh sách câu hỏi trong Ngân hàng câu hỏi (kèm bộ lọc)
export function getAllQuestions(filters = {}) {
  const db = getDatabase();
  let sql = 'SELECT * FROM question_bank WHERE 1=1';
  const params = [];

  if (filters.grade && filters.grade !== 'all') {
    sql += ' AND grade = ?';
    params.push(Number(filters.grade));
  }

  if (filters.topic && filters.topic !== 'all') {
    sql += ' AND topic = ?';
    params.push(filters.topic);
  }

  if (filters.difficulty && filters.difficulty !== 'all') {
    sql += ' AND difficulty = ?';
    params.push(filters.difficulty);
  }

  if (filters.type && filters.type !== 'all') {
    sql += ' AND type = ?';
    params.push(filters.type);
  }

  if (filters.lesson_id) {
    sql += ' AND lesson_id = ?';
    params.push(filters.lesson_id);
  }

  if (filters.search) {
    sql += ' AND (question LIKE ? OR explanation LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term);
  }

  sql += ' ORDER BY grade ASC, topic ASC, id ASC;';
  const rows = db.prepare(sql).all(...params);

  return rows.map(r => {
    let options = [];
    try {
      options = typeof r.options === 'string' ? JSON.parse(r.options) : (r.options || []);
    } catch {
      options = [];
    }
    return {
      ...r,
      options
    };
  });
}

// 2. Lấy chi tiết một câu hỏi theo ID
export function getQuestionById(id) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM question_bank WHERE id = ?;').get(id);
  if (!row) return null;

  let options = [];
  try {
    options = typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []);
  } catch {
    options = [];
  }

  return {
    ...row,
    options
  };
}

// 3. Tạo mới câu hỏi
export function createQuestion(qData) {
  const db = getDatabase();
  const id = qData.id || `qb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const optionsJson = typeof qData.options === 'string' ? qData.options : JSON.stringify(qData.options || []);

  const stmt = db.prepare(`
    INSERT INTO question_bank (
      id, question, grade, subject, topic, lesson_id, type, difficulty,
      options, correct_answer, correct_index, explanation, points, image_url,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `);

  stmt.run(
    id,
    qData.question || 'Câu hỏi mới',
    qData.grade ? Number(qData.grade) : 3,
    qData.subject || 'Tin Học',
    qData.topic || 'TOPIC_A',
    qData.lesson_id || null,
    qData.type || 'MULTIPLE_CHOICE',
    qData.difficulty || 'NHẬN BIẾT',
    optionsJson,
    qData.correct_answer || '',
    qData.correct_index !== undefined ? Number(qData.correct_index) : 0,
    qData.explanation || '',
    qData.points ? Number(qData.points) : 1,
    qData.image_url || ''
  );

  return getQuestionById(id);
}

// 4. Cập nhật câu hỏi
export function updateQuestion(id, qData) {
  const db = getDatabase();
  const existing = getQuestionById(id);
  if (!existing) {
    throw new Error(`Không tìm thấy câu hỏi với ID ${id}`);
  }

  const optionsJson = qData.options !== undefined 
    ? (typeof qData.options === 'string' ? qData.options : JSON.stringify(qData.options))
    : JSON.stringify(existing.options);

  const stmt = db.prepare(`
    UPDATE question_bank SET
      question = ?,
      grade = ?,
      subject = ?,
      topic = ?,
      lesson_id = ?,
      type = ?,
      difficulty = ?,
      options = ?,
      correct_answer = ?,
      correct_index = ?,
      explanation = ?,
      points = ?,
      image_url = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `);

  stmt.run(
    qData.question !== undefined ? qData.question : existing.question,
    qData.grade !== undefined ? Number(qData.grade) : existing.grade,
    qData.subject !== undefined ? qData.subject : existing.subject,
    qData.topic !== undefined ? qData.topic : existing.topic,
    qData.lesson_id !== undefined ? qData.lesson_id : existing.lesson_id,
    qData.type !== undefined ? qData.type : existing.type,
    qData.difficulty !== undefined ? qData.difficulty : existing.difficulty,
    optionsJson,
    qData.correct_answer !== undefined ? qData.correct_answer : existing.correct_answer,
    qData.correct_index !== undefined ? Number(qData.correct_index) : existing.correct_index,
    qData.explanation !== undefined ? qData.explanation : existing.explanation,
    qData.points !== undefined ? Number(qData.points) : existing.points,
    qData.image_url !== undefined ? qData.image_url : existing.image_url,
    id
  );

  return getQuestionById(id);
}

// 5. Xóa câu hỏi
export function deleteQuestion(id) {
  const db = getDatabase();
  db.prepare('DELETE FROM question_bank WHERE id = ?;').run(id);
  return true;
}

// 6. Nhân bản câu hỏi
export function duplicateQuestion(id) {
  const original = getQuestionById(id);
  if (!original) {
    throw new Error(`Không tìm thấy câu hỏi ${id} để nhân bản`);
  }

  const newId = `qb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  return createQuestion({
    ...original,
    id: newId,
    question: `${original.question} (Bản sao)`
  });
}

// 7. Tạo mới một phiên đố vui Quick Quiz (kèm danh sách câu hỏi snapshot trong transaction)
export function createQuizSession(sessionData) {
  const db = getDatabase();
  const sessionId = sessionData.id || `quiz_sess_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  db.exec('BEGIN TRANSACTION;');
  try {
    const insertSessionStmt = db.prepare(`
      INSERT INTO quiz_sessions (
        id, classroom_session_id, class_id, lesson_id, title, mode,
        total_questions, time_per_question, is_random_questions, is_random_answers,
        status, current_question_index, star_reward_per_correct, total_stars_awarded,
        average_accuracy, started_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `);

    insertSessionStmt.run(
      sessionId,
      sessionData.classroom_session_id || null,
      sessionData.class_id || null,
      sessionData.lesson_id || null,
      sessionData.title || 'Quick Quiz Tin Học',
      sessionData.mode || 'CLASS',
      sessionData.questions?.length || sessionData.total_questions || 5,
      sessionData.time_per_question !== undefined ? Number(sessionData.time_per_question) : 20,
      sessionData.is_random_questions ? 1 : 0,
      sessionData.is_random_answers ? 1 : 0,
      sessionData.status || 'READY',
      0,
      sessionData.star_reward_per_correct !== undefined ? Number(sessionData.star_reward_per_correct) : 1,
      0,
      0.0,
      sessionData.started_at || new Date().toISOString()
    );

    if (sessionData.questions && Array.isArray(sessionData.questions)) {
      const insertQuestionStmt = db.prepare(`
        INSERT INTO quiz_questions (
          id, quiz_session_id, question_bank_id, order_index, question,
          type, difficulty, options, correct_index, correct_answer, explanation, points, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      sessionData.questions.forEach((q, idx) => {
        const qId = `qq_${sessionId}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
        const optJson = typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []);

        insertQuestionStmt.run(
          qId,
          sessionId,
          q.question_bank_id || q.id || null,
          idx,
          q.question || '',
          q.type || 'MULTIPLE_CHOICE',
          q.difficulty || 'NHẬN BIẾT',
          optJson,
          q.correct_index !== undefined ? Number(q.correct_index) : 0,
          q.correct_answer || '',
          q.explanation || '',
          q.points ? Number(q.points) : 1,
          q.image_url || ''
        );
      });
    }

    db.exec('COMMIT;');
    return getQuizSessionById(sessionId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// 8. Lấy chi tiết một phiên đố vui
export function getQuizSessionById(id) {
  const db = getDatabase();
  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id = ?;').get(id);
  if (!session) return null;

  const rawQuestions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_session_id = ? ORDER BY order_index ASC;').all(id);
  const questions = rawQuestions.map(q => {
    let options = [];
    try {
      options = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
    } catch {
      options = [];
    }
    return { ...q, options };
  });

  const results = db.prepare('SELECT * FROM quiz_results WHERE quiz_session_id = ?;').all(id);
  const studentResults = db.prepare('SELECT * FROM quiz_student_results WHERE quiz_session_id = ?;').all(id);

  return {
    ...session,
    questions,
    results,
    student_results: studentResults
  };
}

// 9. Cập nhật trạng thái hoặc tiến độ phiên đố vui
export function updateQuizSession(id, updateData) {
  const db = getDatabase();
  const existing = getQuizSessionById(id);
  if (!existing) {
    throw new Error(`Không tìm thấy phiên đố vui ${id}`);
  }

  const stmt = db.prepare(`
    UPDATE quiz_sessions SET
      status = ?,
      current_question_index = ?,
      total_stars_awarded = ?,
      average_accuracy = ?,
      completed_at = ?
    WHERE id = ?;
  `);

  stmt.run(
    updateData.status || existing.status,
    updateData.current_question_index !== undefined ? Number(updateData.current_question_index) : existing.current_question_index,
    updateData.total_stars_awarded !== undefined ? Number(updateData.total_stars_awarded) : existing.total_stars_awarded,
    updateData.average_accuracy !== undefined ? Number(updateData.average_accuracy) : existing.average_accuracy,
    updateData.completed_at !== undefined ? updateData.completed_at : existing.completed_at,
    id
  );

  return getQuizSessionById(id);
}

// 10. Ghi nhận kết quả của một câu hỏi hoặc toàn bộ phiên Quiz (Transaction)
export function saveQuizResults(sessionId, resultsPayload) {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    const insertResultStmt = db.prepare(`
      INSERT OR REPLACE INTO quiz_results (
        id, quiz_session_id, quiz_question_id, distribution,
        total_responses, correct_count, wrong_count, accuracy_rate, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `);

    const resultsList = Array.isArray(resultsPayload.results) ? resultsPayload.results : [];
    for (const r of resultsList) {
      const rId = r.id || `qr_${sessionId}_${r.quiz_question_id}`;
      const distJson = typeof r.distribution === 'string' ? r.distribution : JSON.stringify(r.distribution || {});
      insertResultStmt.run(
        rId,
        sessionId,
        r.quiz_question_id,
        distJson,
        r.total_responses || 0,
        r.correct_count || 0,
        r.wrong_count || 0,
        r.accuracy_rate !== undefined ? Number(r.accuracy_rate) : 0.0
      );
    }

    // Nếu có kết quả chi tiết từng học sinh (Student Mode)
    if (resultsPayload.student_results && Array.isArray(resultsPayload.student_results)) {
      const insertStudentStmt = db.prepare(`
        INSERT OR REPLACE INTO quiz_student_results (
          id, quiz_session_id, quiz_question_id, student_id, student_name,
          status, selected_option, stars_earned, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
      `);

      for (const sr of resultsPayload.student_results) {
        const srId = sr.id || `qsr_${sessionId}_${sr.quiz_question_id}_${sr.student_id}`;
        insertStudentStmt.run(
          srId,
          sessionId,
          sr.quiz_question_id,
          sr.student_id,
          sr.student_name || '',
          sr.status || 'NOT_ANSWERED',
          sr.selected_option || '',
          sr.stars_earned || 0
        );
      }
    }

    // Cập nhật tổng kết phiên
    if (resultsPayload.average_accuracy !== undefined || resultsPayload.total_stars_awarded !== undefined || resultsPayload.status) {
      const updateStmt = db.prepare(`
        UPDATE quiz_sessions SET
          status = COALESCE(?, status),
          average_accuracy = COALESCE(?, average_accuracy),
          total_stars_awarded = COALESCE(?, total_stars_awarded),
          completed_at = COALESCE(?, completed_at)
        WHERE id = ?;
      `);
      updateStmt.run(
        resultsPayload.status || null,
        resultsPayload.average_accuracy !== undefined ? Number(resultsPayload.average_accuracy) : null,
        resultsPayload.total_stars_awarded !== undefined ? Number(resultsPayload.total_stars_awarded) : null,
        resultsPayload.completed_at || null,
        sessionId
      );
    }

    db.exec('COMMIT;');
    return getQuizSessionById(sessionId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}


