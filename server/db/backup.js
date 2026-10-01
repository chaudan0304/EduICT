import { getDatabase } from './connection.js';

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
  sql += `  dob VARCHAR(20) DEFAULT '',\n`;
  sql += `  gender VARCHAR(10) DEFAULT 'Nam',\n`;
  sql += `  machine_number INT,\n`;
  sql += `  stars INT DEFAULT 0,\n`;
  sql += `  attendance VARCHAR(20) DEFAULT 'present',\n`;
  sql += `  skill_mouse VARCHAR(10) DEFAULT 'T',\n`;
  sql += `  skill_keyboard VARCHAR(10) DEFAULT 'H',\n`;
  sql += `  skill_paint VARCHAR(10) DEFAULT 'T',\n`;
  sql += `  eval_regular VARCHAR(10) DEFAULT 'T',\n`;
  sql += `  eval_hk1 VARCHAR(10) DEFAULT 'T',\n`;
  sql += `  eval_hk2 VARCHAR(10) DEFAULT 'T',\n`;
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
      const dobEscaped = (s.dob || '').replace(/'/g, "''");
      const noteEscaped = (s.note || '').replace(/'/g, "''");
      const mNum = s.machine_number ? s.machine_number : 'NULL';
      const hk1 = s.score_hk1 !== null ? s.score_hk1 : 'NULL';
      const ck = s.score_ck !== null ? s.score_ck : 'NULL';
      sql += `INSERT OR REPLACE INTO students (id, class_id, name, dob, gender, machine_number, stars, attendance, skill_mouse, skill_keyboard, skill_paint, eval_regular, eval_hk1, eval_hk2, score_hk1, score_ck, note) VALUES ('${s.id}', '${s.class_id}', '${nameEscaped}', '${dobEscaped}', '${s.gender}', ${mNum}, ${s.stars || 0}, '${s.attendance}', '${s.skill_mouse}', '${s.skill_keyboard}', '${s.skill_paint}', '${s.eval_regular}', '${s.eval_hk1 || 'T'}', '${s.eval_hk2 || 'T'}', ${hk1}, ${ck}, '${noteEscaped}');\n`;
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
      const esc = (v) => String(v == null ? '' : v).replace(/'/g, "''");
      const tEsc = esc(l.title);
      const subEsc = esc(l.subject);
      const topEsc = esc(l.topic);
      const objEsc = esc(l.objectives);
      const keyEsc = esc(l.keywords);
      const noteEsc = esc(l.teacher_notes);
      sql += `INSERT OR REPLACE INTO lessons (id, title, grade, subject, topic, duration_minutes, objectives, keywords, teacher_notes) VALUES ('${esc(l.id)}', '${tEsc}', ${Number(l.grade) || 0}, '${subEsc}', '${topEsc}', ${Number(l.duration_minutes) || 0}, '${objEsc}', '${keyEsc}', '${noteEsc}');\n`;
    }
    sql += `\n`;
  }

  // Dữ liệu bảng lesson_slides
  const slides = db.prepare('SELECT * FROM lesson_slides ORDER BY lesson_id ASC, order_index ASC;').all();
  if (slides.length > 0) {
    sql += `-- 5. BẢNG SLIDES BÀI HỌC (lesson_slides - ${slides.length} slides)\n`;
    sql += `CREATE TABLE IF NOT EXISTS lesson_slides (\n  id VARCHAR(50) PRIMARY KEY,\n  lesson_id VARCHAR(50) NOT NULL,\n  order_index INT NOT NULL DEFAULT 0,\n  type VARCHAR(30) NOT NULL DEFAULT 'CONTENT',\n  title TEXT,\n  content TEXT,\n  layout VARCHAR(30) DEFAULT 'STANDARD',\n  image_url TEXT,\n  video_url TEXT,\n  question_data TEXT,\n  activity_data TEXT,\n  teacher_notes TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE\n);\n\n`;
    for (const s of slides) {
      const esc = (v) => String(v == null ? '' : v).replace(/'/g, "''");
      const tEsc = esc(s.title);
      const cEsc = esc(s.content);
      const imgEsc = esc(s.image_url);
      const vidEsc = esc(s.video_url);
      const qEsc = esc(s.question_data);
      const aEsc = esc(s.activity_data);
      const nEsc = esc(s.teacher_notes);
      sql += `INSERT OR REPLACE INTO lesson_slides (id, lesson_id, order_index, type, title, content, layout, image_url, video_url, question_data, activity_data, teacher_notes) VALUES ('${esc(s.id)}', '${esc(s.lesson_id)}', ${Number(s.order_index) || 0}, '${esc(s.type)}', '${tEsc}', '${cEsc}', '${esc(s.layout)}', '${imgEsc}', '${vidEsc}', '${qEsc}', '${aEsc}', '${nEsc}');\n`;
    }
    sql += `\n`;
  }

  // Dữ liệu bảng question_bank
  const qbQuestions = db.prepare('SELECT * FROM question_bank ORDER BY grade ASC, id ASC;').all();
  if (qbQuestions.length > 0) {
    sql += `-- 6. BẢNG NGÂN HÀNG CÂU HỎI (question_bank - ${qbQuestions.length} câu hỏi)\n`;
    sql += `CREATE TABLE IF NOT EXISTS question_bank (\n  id VARCHAR(50) PRIMARY KEY,\n  question TEXT NOT NULL,\n  grade INT NOT NULL DEFAULT 3,\n  subject VARCHAR(100) NOT NULL DEFAULT 'Tin Học',\n  topic VARCHAR(50) DEFAULT 'TOPIC_A',\n  lesson_id VARCHAR(50),\n  type VARCHAR(30) NOT NULL DEFAULT 'MULTIPLE_CHOICE',\n  difficulty VARCHAR(30) DEFAULT 'NHẬN BIẾT',\n  options TEXT DEFAULT '[]',\n  correct_answer TEXT NOT NULL,\n  correct_index INT NOT NULL DEFAULT 0,\n  explanation TEXT,\n  points INT DEFAULT 1,\n  image_url TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n`;
    const esc = (v) => String(v == null ? '' : v).replace(/'/g, "''");
    for (const q of qbQuestions) {
      const qEsc = esc(q.question);
      const optEsc = esc(q.options);
      const caEsc = esc(q.correct_answer);
      const expEsc = esc(q.explanation);
      const topEsc = esc(q.topic);
      const typeEsc = esc(q.type);
      const diffEsc = esc(q.difficulty);
      const lId = q.lesson_id ? `'${esc(q.lesson_id)}'` : 'NULL';
      sql += `INSERT OR REPLACE INTO question_bank (id, question, grade, subject, topic, lesson_id, type, difficulty, options, correct_answer, correct_index, explanation, points) VALUES ('${esc(q.id)}', '${qEsc}', ${Number(q.grade) || 0}, 'Tin Học', '${topEsc}', ${lId}, '${typeEsc}', '${diffEsc}', '${optEsc}', '${caEsc}', ${Number(q.correct_index) || 0}, '${expEsc}', ${Number(q.points) || 0});\n`;
    }
    sql += `\n`;
  }

  return sql;
}
// Nhập và chạy file kịch bản SQL
/**
 * validateSqlDump — chốt an toàn cho kịch bản SQL nhập từ client (Part 11).
 *
 * KHÔNG đổi hành vi restore hợp lệ: vẫn cho CREATE/INSERT/UPDATE/DELETE/DROP
 * (các dump do app xuất ra dùng CREATE IF NOT EXISTS + INSERT OR REPLACE).
 * CHỈ chặn các lệnh biến "khôi phục dữ liệu" thành "chiếm quyền host":
 * truy cập file/DB khác, nạp extension, ghi file, sửa schema thô.
 */
export function validateSqlDump(sqlString) {
  if (typeof sqlString !== 'string' || !sqlString.trim()) {
    throw new Error('Kịch bản SQL trống hoặc không hợp lệ.');
  }
  if (sqlString.length > 50 * 1024 * 1024) {
    throw new Error('Kịch bản SQL quá lớn (>50MB), từ chối để đảm bảo an toàn.');
  }
  // Chuẩn hóa + GỠ chú thích SQL để blocklist không bị lách bằng comment (vd ATTACH/**/DATABASE hoặc -- )
  const normalized = sqlString
    .toLowerCase()
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
  const forbidden = [
    { re: /\battach\s+database\b/, msg: 'ATTACH DATABASE' },
    { re: /\bdetach\s+database\b/, msg: 'DETACH DATABASE' },
    { re: /\bload_extension\s*\(/, msg: 'load_extension()' },
    { re: /\bvacuum\s+into\b/, msg: 'VACUUM INTO' },
    { re: /\bpragma\s+writable_schema\b/, msg: 'PRAGMA writable_schema' },
    { re: /\bpragma\s+temp_store_directory\b/, msg: 'PRAGMA temp_store_directory' },
  ];
  for (const f of forbidden) {
    if (f.re.test(normalized)) {
      throw new Error(`Kịch bản SQL chứa lệnh bị chặn vì lý do an toàn: ${f.msg}`);
    }
  }
}

export function executeSqlDump(sqlString) {
  validateSqlDump(sqlString);
  const db = getDatabase();
  db.exec(sqlString);
}
