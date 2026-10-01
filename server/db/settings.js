import { getDatabase } from './connection.js';
import { compareVietnameseNames } from './classes.js';

// Chuẩn hóa tên năm học (hỗ trợ cả '2026-2027' và '2026 - 2027')
export function normalizeSchoolYear(year) {
  if (!year) return '2026 - 2027';
  const match = String(year).match(/(\d{4})\s*-\s*(\d{4})/);
  if (match) {
    return `${match[1]} - ${match[2]}`;
  }
  return String(year).trim();
}

// Thống kê tổng số học sinh và số lớp theo khối và toàn trường (SQL Aggregate)
export function getStudentStatistics(schoolYear = null) {
  const db = getDatabase();
  let yearParam = null;
  if (schoolYear && schoolYear !== 'all') {
    yearParam = normalizeSchoolYear(schoolYear);
  } else if (!schoolYear) {
    yearParam = getCurrentSchoolYear();
  }

  // 1. Tổng quan toàn trường
  const totalRow = db.prepare(`
    SELECT COUNT(DISTINCT c.id) as totalClasses, COUNT(s.id) as totalStudents
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id
    WHERE (? IS NULL OR c.school_year = ?);
  `).get(yearParam, yearParam);

  // 2. Thống kê theo từng khối
  const gradeRows = db.prepare(`
    SELECT c.grade, COUNT(DISTINCT c.id) as classCount, COUNT(s.id) as studentCount
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id
    WHERE (? IS NULL OR c.school_year = ?)
    GROUP BY c.grade
    ORDER BY c.grade ASC;
  `).all(yearParam, yearParam);

  const gradeMap = new Map();
  gradeRows.forEach(r => {
    const g = Number(r.grade);
    gradeMap.set(g, {
      grade: g,
      classCount: Number(r.classCount || 0),
      studentCount: Number(r.studentCount || 0)
    });
  });

  // Đảm bảo 5 khối tiểu học (Khối 1 -> Khối 5) luôn có mặt
  const grades = [1, 2, 3, 4, 5].map(g => {
    if (gradeMap.has(g)) {
      const item = gradeMap.get(g);
      gradeMap.delete(g);
      return item;
    }
    return { grade: g, classCount: 0, studentCount: 0 };
  });

  // Nếu có khối ngoại lệ khác trong DB
  for (const extra of gradeMap.values()) {
    grades.push(extra);
  }

  // 3. Thống kê số học sinh theo từng lớp
  const classRows = db.prepare(`
    SELECT c.id, c.name, c.grade, c.subject, c.school_year as schoolYear, COUNT(s.id) as studentCount
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id
    WHERE (? IS NULL OR c.school_year = ?)
    GROUP BY c.id
    ORDER BY c.grade ASC, c.name ASC;
  `).all(yearParam, yearParam);

  return {
    totalClasses: Number(totalRow?.totalClasses || 0),
    totalStudents: Number(totalRow?.totalStudents || 0),
    schoolYear: yearParam || 'Tất cả các năm',
    grades,
    classes: classRows.map(c => ({
      id: c.id,
      name: c.name,
      grade: Number(c.grade),
      subject: c.subject,
      schoolYear: c.schoolYear,
      studentCount: Number(c.studentCount || 0)
    }))
  };
}

// Cấu hình ngày bắt đầu năm học (Mặc định: 05/09)
export function getAcademicYearSettings() {
  const db = getDatabase();
  const mRow = db.prepare("SELECT value FROM app_settings WHERE key = 'academic_year_start_month';").get();
  const dRow = db.prepare("SELECT value FROM app_settings WHERE key = 'academic_year_start_day';").get();
  const startMonth = mRow ? parseInt(mRow.value, 10) : 9;
  const startDay = dRow ? parseInt(dRow.value, 10) : 5;
  return {
    startMonth: isNaN(startMonth) || startMonth < 1 || startMonth > 12 ? 9 : startMonth,
    startDay: isNaN(startDay) || startDay < 1 || startDay > 31 ? 5 : startDay
  };
}

// Lưu cấu hình ngày bắt đầu năm học
export function setAcademicYearSettings(startMonth, startDay) {
  const m = parseInt(startMonth, 10);
  const d = parseInt(startDay, 10);
  if (isNaN(m) || m < 1 || m > 12) {
    throw new Error('Tháng bắt đầu năm học không hợp lệ (phải từ 1 đến 12).');
  }
  if (isNaN(d) || d < 1 || d > 31) {
    throw new Error('Ngày bắt đầu năm học không hợp lệ (phải từ 1 đến 31).');
  }
  const db = getDatabase();
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES ('academic_year_start_month', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `).run(String(m));
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES ('academic_year_start_day', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `).run(String(d));

  return { startMonth: m, startDay: d };
}

// Logic tính toán năm học chung không hard-code (Section IV: Công thức)
export function calculateAcademicYear(date = new Date(), startMonth = 9, startDay = 5) {
  const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date(date);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const currentYear = validDate.getFullYear();
  const currentMonth = validDate.getMonth() + 1;
  const currentDay = validDate.getDate();

  let schoolYearStart;
  if (currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay)) {
    schoolYearStart = currentYear;
  } else {
    schoolYearStart = currentYear - 1;
  }

  return `${schoolYearStart} - ${schoolYearStart + 1}`;
}

// Lấy năm học được tính toán tự động dựa trên ngày hiện tại và thiết lập nhà trường
export function getCurrentAcademicYear(date = new Date()) {
  const settings = getAcademicYearSettings();
  return calculateAcademicYear(date, settings.startMonth, settings.startDay);
}

// Lấy năm học đang được kích hoạt làm việc trong hệ thống
export function getCurrentSchoolYear() {
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'current_school_year';").get();
  if (row && row.value) {
    return normalizeSchoolYear(row.value.trim());
  }
  const latestClass = db.prepare("SELECT school_year FROM classes WHERE school_year IS NOT NULL AND school_year != '' ORDER BY school_year DESC LIMIT 1;").get();
  return normalizeSchoolYear(latestClass?.school_year?.trim() || getCurrentAcademicYear());
}

// Cập nhật năm học hiện tại
export function setCurrentSchoolYear(schoolYear) {
  if (!schoolYear) return;
  const db = getDatabase();
  const normalized = normalizeSchoolYear(schoolYear);
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES ('current_school_year', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `).run(normalized);
}

// Tự động nhận diện và tạo năm học mới trên database (Section VI & VII)
// Tách bạch: Tự động TẠO NĂM HỌC ≠ CHUYỂN LỚP (Section VIII - Mục 11)
export function checkAndInitializeSchoolYear(date = new Date()) {
  const db = getDatabase();
  const settings = getAcademicYearSettings();
  const calculatedYear = calculateAcademicYear(date, settings.startMonth, settings.startDay);

  const row = db.prepare("SELECT * FROM school_years WHERE year_name = ?;").get(calculatedYear);
  const classCountInCalculated = db.prepare("SELECT COUNT(*) as count FROM classes WHERE school_year = ?;").get(calculatedYear).count;
  const totalClassesInSystem = db.prepare("SELECT COUNT(*) as count FROM classes;").get().count;

  let isNewYearDetected = false;
  let promotionCompleted = false;

  if (!row) {
    // Tự động tạo năm học mới (UNIQUE, không tạo lớp hay chuyển học sinh)
    const initialPromotion = classCountInCalculated > 0 ? 1 : 0;
    db.prepare(`
      INSERT OR IGNORE INTO school_years (year_name, is_active, promotion_completed)
      VALUES (?, 1, ?);
    `).run(calculatedYear, initialPromotion);
    
    // Chỉ báo có năm mới cần chuyển lớp nếu năm này chưa có lớp VÀ hệ thống có dữ liệu lớp năm trước
    if (classCountInCalculated === 0 && totalClassesInSystem > 0) {
      isNewYearDetected = true;
    }
    promotionCompleted = initialPromotion === 1;
  } else {
    promotionCompleted = Boolean(row.promotion_completed);
    if (!promotionCompleted && classCountInCalculated === 0 && totalClassesInSystem > 0) {
      isNewYearDetected = true;
    }
  }

  const currentYear = getCurrentSchoolYear();

  return {
    isNewYearDetected,
    newYear: calculatedYear,
    previousYear: currentYear,
    promotionCompleted,
    settings
  };
}

// Danh sách các năm học có trong hệ thống và lịch sử chuyển năm
export function getAvailableSchoolYears() {
  const db = getDatabase();
  const classRows = db.prepare("SELECT DISTINCT school_year FROM classes WHERE school_year IS NOT NULL AND school_year != '';").all();
  const yearRows = db.prepare("SELECT year_name FROM school_years;").all();

  const set = new Set();
  for (const r of classRows) {
    const y = normalizeSchoolYear(r.school_year);
    if (y) set.add(y);
  }
  for (const r of yearRows) {
    const y = normalizeSchoolYear(r.year_name);
    if (y) set.add(y);
  }

  const currentYear = getCurrentSchoolYear();
  if (currentYear) set.add(currentYear);

  const years = Array.from(set).sort();

  const historyRow = db.prepare("SELECT value FROM app_settings WHERE key = 'school_year_transitions';").get();
  let transitions = [];
  if (historyRow && historyRow.value) {
    try {
      transitions = JSON.parse(historyRow.value);
    } catch {
      transitions = [];
    }
  }

  const settings = getAcademicYearSettings();

  return {
    currentYear,
    availableYears: years,
    transitions,
    settings
  };
}

// Tự động tính năm học tiếp theo (VD: '2025 - 2026' -> '2026 - 2027')
export function calculateNextSchoolYear(yearStr) {
  const match = (yearStr || '').match(/(\d{4})\s*-\s*(\d{4})/);
  if (match) {
    const y1 = parseInt(match[1], 10);
    const y2 = parseInt(match[2], 10);
    return `${y1 + 1} - ${y2 + 1}`;
  }
  const currentYearNum = new Date().getFullYear();
  return `${currentYearNum} - ${currentYearNum + 1}`;
}

// Tự động chuyển đổi tên lớp khi lên khối (VD: '1A1' -> '2A1', 'Lớp 4B' -> 'Lớp 5B')
export function promoteClassName(oldName, oldGrade) {
  const nextGrade = oldGrade + 1;
  const name = (oldName || '').trim();

  // Trường hợp 1: Tên bắt đầu bằng số khối cũ (1A1 -> 2A1, 1/1 -> 2/1, 1B -> 2B)
  if (name.startsWith(String(oldGrade))) {
    return `${nextGrade}${name.slice(String(oldGrade).length)}`;
  }

  // Trường hợp 2: Có tiền tố 'Lớp ' hoặc 'Lớp' (Lớp 1A1 -> Lớp 2A1)
  const lopPrefixRegex = new RegExp(`^(Lớp\\s*)${oldGrade}`, 'i');
  if (lopPrefixRegex.test(name)) {
    return name.replace(lopPrefixRegex, `$1${nextGrade}`);
  }

  // Trường hợp 3: Khớp ranh giới từ hoặc số khối cũ (Khối 1A -> Khối 2A)
  const regex = new RegExp(`\\b${oldGrade}\\b`);
  if (regex.test(name)) {
    return name.replace(regex, String(nextGrade));
  }

  // Fallback: thay thế số khối cũ đầu tiên
  const firstOldGrade = name.indexOf(String(oldGrade));
  if (firstOldGrade !== -1) {
    return name.substring(0, firstOldGrade) + nextGrade + name.substring(firstOldGrade + String(oldGrade).length);
  }

  return `${name} (K${nextGrade})`;
}

// Tự động chuyển năm học và chuyển lớp (nguyên tử trong 1 transaction)
export function transitionSchoolYear(fromYear, toYear) {
  const db = getDatabase();
  const from = (fromYear || '').trim();
  const to = (toYear || '').trim();

  if (!from || !to) {
    throw new Error('Cần cung cấp đầy đủ năm học nguồn (fromYear) và năm học đích (toYear).');
  }
  if (from === to) {
    throw new Error('Năm học đích phải khác năm học nguồn.');
  }

  // 1. Kiểm tra năm học nguồn có dữ liệu lớp không
  const fromClasses = db.prepare('SELECT * FROM classes WHERE school_year = ? ORDER BY grade ASC, name ASC;').all(from);
  if (fromClasses.length === 0) {
    throw new Error(`Không tìm thấy lớp học nào thuộc năm học ${from}.`);
  }

  // 2. Chặn chuyển lặp lại (Idempotent): kiểm tra trạng thái bảng school_years và số lớp
  const yearRecord = db.prepare('SELECT promotion_completed FROM school_years WHERE year_name = ?;').get(to);
  if (yearRecord && yearRecord.promotion_completed === 1) {
    throw new Error(`Năm học ${to} đã được thực hiện chuyển lớp trước đó. Không thể chuyển lại!`);
  }
  const existingInToYear = db.prepare('SELECT COUNT(*) as count FROM classes WHERE school_year = ?;').get(to).count;
  if (existingInToYear > 0) {
    throw new Error(`Năm học ${to} đã được khởi tạo (${existingInToYear} lớp). Không thể thực hiện chuyển lớp lặp lại!`);
  }

  const resultSummary = {
    fromYear: from,
    toYear: to,
    classesPromoted: 0,
    grade5Finished: 0,
    grade1Created: 0,
    studentsTransferred: 0,
    newGrade1ClassNames: [],
    details: []
  };

  db.exec('BEGIN TRANSACTION;');
  try {
    const insertClassStmt = db.prepare(`
      INSERT INTO classes (id, name, grade, subject, school_year)
      VALUES (?, ?, ?, ?, ?);
    `);

    const insertStudentStmt = db.prepare(`
      INSERT INTO students (
        id, class_id, name, dob, gender, machine_number, stars, attendance,
        skill_mouse, skill_keyboard, skill_paint, eval_regular, eval_hk1, eval_hk2, score_hk1, score_ck, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    // Danh sách lớp Khối 1 năm cũ để làm cơ sở tạo lớp Khối 1 năm mới
    const oldGrade1Classes = fromClasses.filter(c => Number(c.grade) === 1);

    for (const oldClass of fromClasses) {
      const currentGrade = Number(oldClass.grade);

      // YÊU CẦU 5: LỚP 5 KẾT THÚC
      // Các lớp 5 năm cũ KHÔNG được chuyển sang năm học mới
      if (currentGrade === 5) {
        resultSummary.grade5Finished += 1;
        resultSummary.details.push({
          oldClass: oldClass.name,
          oldGrade: 5,
          action: 'GRADUATED',
          message: `Lớp ${oldClass.name} hoàn thành bậc tiểu học, bảo toàn trong lịch sử năm ${from}`
        });
        continue;
      }

      // Khối 1..4: Chuyển lên khối tiếp theo (1->2, 2->3, 3->4, 4->5)
      const nextGrade = currentGrade + 1;
      const newClassName = promoteClassName(oldClass.name, currentGrade);
      const newClassId = `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newSubject = `Tin Học ${nextGrade}`;

      insertClassStmt.run(newClassId, newClassName, nextGrade, newSubject, to);
      resultSummary.classesPromoted += 1;

      // Chuyển toàn bộ học sinh của lớp cũ sang lớp mới (sắp xếp A-Z chuẩn tiếng Việt)
      const oldStudents = db.prepare('SELECT * FROM students WHERE class_id = ?;').all(oldClass.id);
      oldStudents.sort(compareVietnameseNames);

      for (const s of oldStudents) {
        insertStudentStmt.run(
          s.id,
          newClassId,
          s.name,
          s.dob || '',
          s.gender || 'Nam',
          s.machine_number || null,
          0, // Khởi đầu năm học mới: 0 sao
          'present',
          s.skill_mouse || 'T',
          s.skill_keyboard || 'H',
          s.skill_paint || 'T',
          'T',
          'T',
          'T',
          null, // Điểm thi đầu năm reset
          null,
          s.note || ''
        );
        resultSummary.studentsTransferred += 1;
      }

      resultSummary.details.push({
        oldClass: oldClass.name,
        oldGrade: currentGrade,
        newClass: newClassName,
        newGrade: nextGrade,
        studentsCount: oldStudents.length,
        action: 'PROMOTED'
      });
    }

    // YÊU CẦU 6 & 10: TẠO CÁC LỚP 1 MỚI CHO NĂM HỌC MỚI (0 HỌC SINH)
    // Dựa trên danh sách lớp 1 của năm cũ (hoặc mặc định nếu chưa có)
    const baseGrade1Names = oldGrade1Classes.length > 0 
      ? oldGrade1Classes.map(c => c.name.trim())
      : ['1A1', '1A2', '1A3', '1A4'];

    // Loại bỏ tên trùng nếu có
    const uniqueGrade1Names = [...new Set(baseGrade1Names)];

    for (const g1Name of uniqueGrade1Names) {
      const g1ClassId = `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      insertClassStmt.run(g1ClassId, g1Name, 1, 'Tin Học 1', to);
      resultSummary.grade1Created += 1;
      resultSummary.newGrade1ClassNames.push(g1Name);
    }

    // Cập nhật current_school_year
    db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES ('current_school_year', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `).run(to);

    // Lưu nhật ký chuyển năm học vào app_settings
    const historyRow = db.prepare("SELECT value FROM app_settings WHERE key = 'school_year_transitions';").get();
    let history = [];
    if (historyRow && historyRow.value) {
      try { history = JSON.parse(historyRow.value); } catch {}
    }
    history.push({
      fromYear: from,
      toYear: to,
      transitionedAt: new Date().toISOString(),
      classesPromoted: resultSummary.classesPromoted,
      grade5Finished: resultSummary.grade5Finished,
      grade1Created: resultSummary.grade1Created,
      studentsTransferred: resultSummary.studentsTransferred
    });

    db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES ('school_year_transitions', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `).run(JSON.stringify(history));

    // Đánh dấu năm học đích đã hoàn thành chuyển lớp (chống chuyển trùng)
    db.prepare(`
      INSERT INTO school_years (year_name, is_active, promotion_completed)
      VALUES (?, 1, 1)
      ON CONFLICT(year_name) DO UPDATE SET promotion_completed = 1, is_active = 1;
    `).run(to);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return resultSummary;
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

// ============================================================================
// GIAI ĐOẠN 3 — Hồ sơ giáo viên (1 GV, sửa được) & Thời khóa biểu (sửa + lưu)
// Lưu dưới dạng JSON trong bảng app_settings (KHÔNG tạo bảng mới).
// ============================================================================

// Hồ sơ giáo viên mặc định (đồng bộ với TEACHER_INFO ở src/utils/timetable.js)
export const DEFAULT_TEACHER_PROFILE = {
  name: 'Nguyễn Văn Châu Đàn',
  shortName: 'Châu Đàn',
  subject: 'Tin học',
  role: 'Giáo viên bộ môn',
  effectiveDate: '05/09/2026',
  schoolYear: '2026 - 2027',
  status: 'active'
};

// Lấy hồ sơ giáo viên (trả về mặc định nếu chưa lưu — KHÔNG tự ghi khi đọc)
export function getDbTeacherProfile() {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('teacher_profile');
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...DEFAULT_TEACHER_PROFILE, ...parsed };
      }
    } catch (e) {}
  }
  return { ...DEFAULT_TEACHER_PROFILE };
}

// Lưu hồ sơ giáo viên (validate + chuẩn hóa; trả về hồ sơ đã lưu)
export function saveDbTeacherProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('Hồ sơ giáo viên không hợp lệ.');
  }
  const name = String(profile.name || '').trim();
  if (!name) {
    throw new Error('Tên giáo viên không được để trống.');
  }
  const merged = {
    ...DEFAULT_TEACHER_PROFILE,
    ...profile,
    name,
    shortName: String(profile.shortName || '').trim() || name,
    subject: String(profile.subject || DEFAULT_TEACHER_PROFILE.subject).trim() || DEFAULT_TEACHER_PROFILE.subject,
    role: String(profile.role || DEFAULT_TEACHER_PROFILE.role).trim() || DEFAULT_TEACHER_PROFILE.role,
    effectiveDate: String(profile.effectiveDate || DEFAULT_TEACHER_PROFILE.effectiveDate).trim(),
    schoolYear: String(profile.schoolYear || DEFAULT_TEACHER_PROFILE.schoolYear).trim(),
    status: profile.status === 'inactive' ? 'inactive' : 'active'
  };
  const db = getDatabase();
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
    .run('teacher_profile', JSON.stringify(merged));
  return merged;
}

// --- Thời khóa biểu (grid) ---------------------------------------------------
// Chỉ lưu phần lưới có thể chỉnh sửa. Trả về grid đã lưu hoặc null (client fallback
// về TIMETABLE_DATA cứng của nó khi null — tránh nhân đôi dữ liệu mặc định lớn ở backend).

// Xác thực xung đột phía server (ĐỘC LẬP với client — defense-in-depth, test được).
// Trả về mảng lỗi NGHIÊM TRỌNG (chỉ severity 'error': SLOT_COLLISION + CLASS_SAME_DAY).
export function validateTimetableConflicts(grid) {
  const errors = [];
  if (!grid || typeof grid !== 'object') return errors;

  const slotMap = new Map();   // ngày|buổi|tiết -> [lớp]
  const classDayMap = new Map(); // lớp|ngày -> [phân công]

  for (let day = 1; day <= 5; day++) {
    const d = grid[day] || grid[String(day)];
    if (!d || typeof d !== 'object') continue;
    for (const session of ['morning', 'afternoon']) {
      const s = d[session];
      if (!s || typeof s !== 'object') continue;
      for (const periodKey of Object.keys(s)) {
        const cell = s[periodKey];
        if (!cell || cell.isOff) continue;
        const className = typeof cell.className === 'string' ? cell.className.trim() : '';
        if (!className) continue;

        const slotKey = `${day}|${session}|${periodKey}`;
        if (!slotMap.has(slotKey)) slotMap.set(slotKey, []);
        slotMap.get(slotKey).push(className);

        const cdKey = `${className}|${day}`;
        if (!classDayMap.has(cdKey)) classDayMap.set(cdKey, []);
        classDayMap.get(cdKey).push({ session, period: periodKey });
      }
    }
  }

  for (const [slotKey, list] of slotMap) {
    if (list.length > 1) {
      errors.push({ type: 'SLOT_COLLISION', slotKey, classes: list, message: `Trùng tiết tại ${slotKey}: ${list.join(', ')}.` });
    }
  }
  for (const [cdKey, list] of classDayMap) {
    if (list.length > 1) {
      const className = cdKey.split('|')[0];
      errors.push({ type: 'CLASS_SAME_DAY', className, count: list.length, message: `Lớp ${className} bị xếp ${list.length} tiết cùng một ngày.` });
    }
  }
  return errors;
}

// Lấy TKB đã lưu (hoặc null nếu chưa có)
export function getDbTimetable() {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('timetable_data');
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return null;
}

// Lưu TKB — re-validate xung đột phía server; NÉM lỗi nếu có xung đột nghiêm trọng.
export function saveDbTimetable(grid) {
  if (!grid || typeof grid !== 'object' || Array.isArray(grid)) {
    throw new Error('Dữ liệu thời khóa biểu không hợp lệ.');
  }
  const conflicts = validateTimetableConflicts(grid);
  if (conflicts.length > 0) {
    const err = new Error('Thời khóa biểu có xung đột, không thể lưu.');
    err.conflicts = conflicts;
    err.code = 'TIMETABLE_CONFLICT';
    throw err;
  }
  const db = getDatabase();
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
    .run('timetable_data', JSON.stringify(grid));
  return grid;
}
