import { getDatabase } from './connection.js';
import { getCurrentSchoolYear, normalizeSchoolYear } from './settings.js';

// ==========================================================
// THUẬT TOÁN SẮP XẾP DANH SÁCH HỌC SINH THEO THỨ TỰ A - Z
// Chuẩn quy định của Bộ Giáo Dục & Đào Tạo:
// 1. So sánh Tên (từ cuối cùng) theo bảng chữ cái Tiếng Việt
// 2. Nếu trùng Tên -> So sánh Họ và tên đệm
// 3. Nếu trùng cả Họ tên -> So sánh ngày sinh / id
// ==========================================================
export function compareVietnameseNames(a, b) {
  const nameA = (typeof a === 'string' ? a : (a?.name || '')).trim();
  const nameB = (typeof b === 'string' ? b : (b?.name || '')).trim();
  if (!nameA && !nameB) return 0;
  if (!nameA) return 1;
  if (!nameB) return -1;

  const partsA = nameA.split(/\s+/);
  const partsB = nameB.split(/\s+/);

  const firstNameA = partsA[partsA.length - 1];
  const firstNameB = partsB[partsB.length - 1];

  // 1. So sánh Tên chính theo bảng chữ cái tiếng Việt
  const cmpFirst = firstNameA.localeCompare(firstNameB, 'vi', { numeric: true, sensitivity: 'accent' });
  if (cmpFirst !== 0) return cmpFirst;

  // 2. Cùng Tên -> So sánh Họ và tên đệm
  const restA = partsA.slice(0, -1).join(' ');
  const restB = partsB.slice(0, -1).join(' ');
  const cmpRest = restA.localeCompare(restB, 'vi', { numeric: true, sensitivity: 'accent' });
  if (cmpRest !== 0) return cmpRest;

  // 3. Nếu họ tên giống nhau -> So sánh ngày sinh
  const dobA = typeof a === 'object' && a?.dob ? String(a.dob).trim() : '';
  const dobB = typeof b === 'object' && b?.dob ? String(b.dob).trim() : '';
  if (dobA && dobB && dobA !== dobB) {
    return dobA.localeCompare(dobB);
  }

  // 4. Phân định cuối cùng theo id nếu là đối tượng
  const idA = typeof a === 'object' && a?.id ? String(a.id) : '';
  const idB = typeof b === 'object' && b?.id ? String(b.id) : '';
  return idA.localeCompare(idB);
}

// Sắp xếp lại học sinh của tất cả các lớp (hoặc các lớp được chỉ định) trong CSDL SQLite theo thứ tự A-Z
export function sortAllStudentsInDatabase(customDb = null, inTransaction = false, targetClassIds = null) {
  const db = customDb || getDatabase();
  const classes = targetClassIds && Array.isArray(targetClassIds) && targetClassIds.length > 0
    ? db.prepare(`SELECT id, name FROM classes WHERE id IN (${targetClassIds.map(() => '?').join(',')});`).all(...targetClassIds)
    : db.prepare('SELECT id, name FROM classes;').all();

  const getStudentsStmt = db.prepare('SELECT * FROM students WHERE class_id = ?;');
  const deleteStmt = db.prepare('DELETE FROM students WHERE class_id = ?;');
  const insertStmt = db.prepare(`
    INSERT INTO students (
      id, class_id, name, dob, gender, machine_number, stars, attendance,
      skill_mouse, skill_keyboard, skill_paint, eval_regular, eval_hk1, eval_hk2, score_hk1, score_ck, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  if (!inTransaction) {
    db.exec('BEGIN TRANSACTION;');
  }
  let totalReorderedClasses = 0;
  let totalStudentsAffected = 0;

  try {
    for (const c of classes) {
      const students = getStudentsStmt.all(c.id);
      if (students.length <= 1) continue;

      const sorted = [...students].sort(compareVietnameseNames);

      let changed = false;
      for (let i = 0; i < students.length; i++) {
        if (students[i].id !== sorted[i].id) {
          changed = true;
          break;
        }
      }

      if (changed) {
        deleteStmt.run(c.id);
        for (const s of sorted) {
          insertStmt.run(
            s.id,
            s.class_id,
            s.name,
            s.dob || '',
            s.gender || 'Nam',
            s.machine_number,
            s.stars || 0,
            s.attendance || 'present',
            s.skill_mouse || 'T',
            s.skill_keyboard || 'H',
            s.skill_paint || 'T',
            s.eval_regular || 'T',
            s.eval_hk1 || 'T',
            s.eval_hk2 || 'T',
            s.score_hk1,
            s.score_ck,
            s.note || ''
          );
        }
        totalReorderedClasses++;
        totalStudentsAffected += sorted.length;
      }
    }
    if (!inTransaction) {
      db.exec('COMMIT;');
    }
    if (totalReorderedClasses > 0) {
      console.log(`[Database] Đã sắp xếp A-Z danh sách học sinh: ${totalReorderedClasses} lớp (${totalStudentsAffected} học sinh).`);
    }
  } catch (err) {
    if (!inTransaction) {
      try {
        db.exec('ROLLBACK;');
      } catch (rbErr) {
        console.warn('[Database] Rollback sort students failed:', rbErr.message);
      }
    }
    console.error('[Database] Lỗi khi sắp xếp lại học sinh trong CSDL:', err);
    throw err;
  }

  return { totalReorderedClasses, totalStudentsAffected };
}

// Lấy toàn bộ danh sách lớp kèm học sinh (hỗ trợ lọc theo năm học hoặc mặc định năm hiện tại)
// Học sinh trong mỗi lớp luôn được sắp xếp theo thứ tự A - Z chuẩn tiếng Việt
export function getAllClassesWithStudents(schoolYear = null) {
  const db = getDatabase();
  let yearParam = null;
  if (schoolYear && schoolYear !== 'all') {
    yearParam = normalizeSchoolYear(schoolYear);
  } else if (!schoolYear) {
    yearParam = getCurrentSchoolYear();
  }

  let classes;
  if (yearParam) {
    classes = db.prepare('SELECT * FROM classes WHERE school_year = ? ORDER BY grade ASC, name ASC;').all(yearParam);
  } else {
    classes = db.prepare('SELECT * FROM classes ORDER BY grade ASC, name ASC;').all();
  }

  const students = db.prepare('SELECT * FROM students ORDER BY rowid ASC;').all();

  // Nhóm học sinh theo class_id
  const studentMap = {};
  for (const s of students) {
    if (!studentMap[s.class_id]) {
      studentMap[s.class_id] = [];
    }
    studentMap[s.class_id].push({
      id: s.id,
      name: s.name,
      dob: s.dob || '',
      gender: s.gender,
      machineNumber: s.machine_number,
      stars: s.stars,
      attendance: s.attendance,
      skill_mouse: s.skill_mouse,
      skill_keyboard: s.skill_keyboard,
      skill_paint: s.skill_paint,
      eval_regular: s.eval_regular,
      eval_hk1: s.eval_hk1,
      eval_hk2: s.eval_hk2,
      score_hk1: s.score_hk1,
      score_ck: s.score_ck,
      note: s.note
    });
  }

  return classes.map(c => {
    const classStudents = studentMap[c.id] || [];
    classStudents.sort(compareVietnameseNames);
    let goodScores = [];
    try {
      if (c.good_scores) {
        goodScores = typeof c.good_scores === 'string' ? JSON.parse(c.good_scores) : c.good_scores;
      }
    } catch (e) {
      goodScores = [];
    }
    return {
      id: c.id,
      name: c.name,
      grade: c.grade,
      subject: c.subject,
      schoolYear: c.school_year,
      goodScores: Array.isArray(goodScores) ? goodScores : [],
      students: classStudents
    };
  });
}

// Thêm hoặc cập nhật lớp học
export function saveOrUpdateClass(classData) {
  const db = getDatabase();
  const goodScoresJson = classData.goodScores !== undefined
    ? JSON.stringify(classData.goodScores || [])
    : null;

  const stmt = db.prepare(`
    INSERT INTO classes (id, name, grade, subject, school_year, good_scores)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, '[]'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      grade = excluded.grade,
      subject = excluded.subject,
      school_year = excluded.school_year,
      good_scores = CASE WHEN ? IS NOT NULL THEN ? ELSE classes.good_scores END;
  `);
  stmt.run(
    classData.id,
    classData.name,
    classData.grade || 3,
    classData.subject || 'Tin Học',
    classData.schoolYear ? normalizeSchoolYear(classData.schoolYear) : getCurrentSchoolYear(),
    goodScoresJson,
    goodScoresJson,
    goodScoresJson
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

// Cập nhật danh sách học sinh của 1 lớp (tự động sắp xếp A - Z chuẩn tiếng Việt)
export function saveStudentsForClass(classId, studentsList) {
  const db = getDatabase();
  const sortedList = Array.isArray(studentsList) ? [...studentsList].sort(compareVietnameseNames) : [];
  db.exec('BEGIN TRANSACTION;');
  try {
    // Xóa danh sách học sinh cũ của lớp
    db.prepare('DELETE FROM students WHERE class_id = ?;').run(classId);

    // Chèn lại danh sách học sinh mới đã sắp xếp A - Z
    const insertStmt = db.prepare(`
      INSERT INTO students (
        id, class_id, name, dob, gender, machine_number, stars, attendance,
        skill_mouse, skill_keyboard, skill_paint, eval_regular, eval_hk1, eval_hk2, score_hk1, score_ck, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const s of sortedList) {
      insertStmt.run(
        s.id,
        classId,
        s.name,
        s.dob || '',
        s.gender || 'Nam',
        s.machineNumber !== undefined ? s.machineNumber : (s.machine_number || null),
        Number(s.stars) || 0,
        s.attendance || 'present',
        s.skill_mouse || 'T',
        s.skill_keyboard || 'H',
        s.skill_paint || 'T',
        s.eval_regular || 'T',
        s.eval_hk1 || 'T',
        s.eval_hk2 || 'T',
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

// Nhận diện khối lớp từ tên lớp (VD: '1A' -> 1, 'Lớp 3A2' -> 3)
export function detectGradeFromName(className) {
  if (!className) return 3;
  const match = className.match(/([1-5])/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 3;
}

// Import hàng loạt nhiều Sheet = nhiều Lớp trong 1 Transaction duy nhất
export function batchImportClassesAndStudents(payload) {
  const db = getDatabase();
  const { 
    autoCreateClasses = true, 
    defaultSchoolYear = getCurrentSchoolYear(), 
    sheets = [],
    totalWorkbookSheets = sheets.length,
    sheetsSkipped = 0
  } = payload;

  const resultSummary = {
    totalWorkbookSheets: totalWorkbookSheets,
    totalSheets: sheets.length,
    sheetsSelected: sheets.length,
    sheetsSkipped: sheetsSkipped,
    classesProcessed: 0,
    classesCreated: 0,
    studentsAdded: 0,
    studentsExisting: 0,
    rowsError: 0
  };
  const sheetResults = [];

  const norm = (s) => (s || '').toLowerCase().trim().replace(/^lớp\s+/i, '').replace(/\s+/g, '');
  const normName = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normDob = (s) => (s || '').trim().replace(/[-.]/g, '/');

  db.exec('BEGIN TRANSACTION;');
  try {
    const existingClasses = db.prepare('SELECT * FROM classes;').all();

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

    for (const sheet of sheets) {
      const sheetName = (sheet.sheetName || sheet.className || '').trim();
      const targetClassName = (sheet.className ? sheet.className.trim() : sheetName);
      if (!targetClassName) continue;

      const sheetRes = {
        sheetName: sheetName,
        className: targetClassName,
        classId: null,
        createdClass: false,
        total: 0,
        added: 0,
        existing: 0,
        errors: []
      };

      const targetSchoolYear = normalizeSchoolYear(sheet.schoolYear || defaultSchoolYear || getCurrentSchoolYear());

      // Đối soát lớp trong DB theo targetClassName và cùng school_year:
      // 1. Tên trùng nhau (không phân biệt hoa thường) và cùng năm học
      // 2. Tên sau khi chuẩn hóa và cùng năm học
      let matchedClass = existingClasses.find(c => 
        (c.school_year === targetSchoolYear) && (
          c.name.trim().toLowerCase() === targetClassName.toLowerCase() ||
          norm(c.name) === norm(targetClassName)
        )
      );

      let classId = matchedClass ? matchedClass.id : null;

      if (!matchedClass) {
        if (!autoCreateClasses) {
          sheetRes.errors.push({
            row: 0,
            name: '',
            reason: `Lớp "${targetClassName}" (năm ${targetSchoolYear}) chưa tồn tại trong hệ thống (chưa bật tạo lớp tự động)`
          });
          resultSummary.rowsError += 1;
          sheetResults.push(sheetRes);
          continue;
        }

        // Tự động tạo lớp mới với targetClassName
        const detectedGrade = sheet.grade || detectGradeFromName(targetClassName);
        classId = `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const subject = sheet.subject || `Tin Học ${detectedGrade}`;
        const schoolYear = targetSchoolYear;

        insertClassStmt.run(classId, targetClassName, detectedGrade, subject, schoolYear);

        matchedClass = {
          id: classId,
          name: targetClassName,
          grade: detectedGrade,
          subject: subject,
          school_year: schoolYear
        };
        existingClasses.push(matchedClass);

        sheetRes.createdClass = true;
        resultSummary.classesCreated += 1;
      }

      sheetRes.classId = classId;
      sheetRes.className = matchedClass.name;
      resultSummary.classesProcessed += 1;

      // Lấy danh sách học sinh hiện có của lớp
      const currentStudents = db.prepare('SELECT id, name, dob, gender, machine_number FROM students WHERE class_id = ?;').all(classId);

      const existingStudentMap = new Map();
      currentStudents.forEach(cs => {
        const key = `${normName(cs.name)}|${normDob(cs.dob)}`;
        existingStudentMap.set(key, cs);
      });

      const studentRows = Array.isArray(sheet.students) ? sheet.students : [];
      sheetRes.total = studentRows.length;

      const usedMachineNumbers = new Set(
        currentStudents.map(s => s.machine_number).filter(n => n !== null && n !== undefined)
      );

      let nextAutoIdIndex = currentStudents.length + 1;

      for (let rIdx = 0; rIdx < studentRows.length; rIdx++) {
        const row = studentRows[rIdx];
        const rowNum = row.rowNumber || (rIdx + 1);
        const name = (row.name || '').trim();
        const dob = (row.dob || '').trim();
        const gender = (row.gender || 'Nam').trim();

        // 1. Validate Họ tên
        if (!name) {
          sheetRes.errors.push({
            row: rowNum,
            name: '(Trống)',
            reason: 'Họ tên không được để trống'
          });
          resultSummary.rowsError += 1;
          continue;
        }

        // 2. Validate Giới tính
        let normalizedGender = 'Nam';
        const gLow = gender.toLowerCase();
        if (gLow === 'nam') {
          normalizedGender = 'Nam';
        } else if (gLow === 'nữ' || gLow === 'nu') {
          normalizedGender = 'Nữ';
        } else if (gender) {
          sheetRes.errors.push({
            row: rowNum,
            name: name,
            reason: `Giới tính "${gender}" không hợp lệ (chỉ chấp nhận Nam hoặc Nữ)`
          });
          resultSummary.rowsError += 1;
          continue;
        }

        // 3. Kiểm tra trùng lặp: Họ tên + Ngày sinh
        const keyWithDob = `${normName(name)}|${normDob(dob)}`;
        if (dob && existingStudentMap.has(keyWithDob)) {
          sheetRes.existing += 1;
          resultSummary.studentsExisting += 1;
          continue;
        }

        // Nếu thiếu ngày sinh và trong lớp đã có học sinh cùng tên -> Cảnh báo
        if (!dob) {
          const hasSameName = currentStudents.some(cs => normName(cs.name) === normName(name));
          if (hasSameName) {
            sheetRes.errors.push({
              row: rowNum,
              name: name,
              reason: 'Trùng họ tên với học sinh trong lớp nhưng thiếu Ngày sinh để phân biệt'
            });
            resultSummary.rowsError += 1;
            continue;
          }
        }

        // 4. Tìm số máy phòng máy thực hành (1..31)
        let machineNumber = null;
        if (row.machineNumber !== undefined && row.machineNumber !== null && row.machineNumber !== '') {
          const m = parseInt(row.machineNumber, 10);
          if (!isNaN(m) && m >= 1 && m <= 31) {
            machineNumber = m;
          }
        }
        if (machineNumber === null) {
          for (let m = 1; m <= 31; m++) {
            if (!usedMachineNumbers.has(m)) {
              machineNumber = m;
              break;
            }
          }
        }
        if (machineNumber !== null) {
          usedMachineNumbers.add(machineNumber);
        }

        // 5. Sinh Student ID
        const studentId = row.id && String(row.id).trim()
          ? String(row.id).trim()
          : `hs_${classId.replace(/[^a-zA-Z0-9]/g, '')}_${nextAutoIdIndex++}`;

        insertStudentStmt.run(
          studentId,
          classId,
          name,
          dob,
          normalizedGender,
          machineNumber,
          row.stars ? parseInt(row.stars, 10) : 0,
          row.attendance || 'present',
          row.skill_mouse || 'T',
          row.skill_keyboard || 'H',
          row.skill_paint || 'T',
          row.eval_regular || 'T',
          row.eval_hk1 || 'T',
          row.eval_hk2 || 'T',
          row.score_hk1 !== undefined && row.score_hk1 !== null ? Number(row.score_hk1) : null,
          row.score_ck !== undefined && row.score_ck !== null ? Number(row.score_ck) : null,
          row.note || ''
        );

        existingStudentMap.set(keyWithDob, { id: studentId, name, dob });
        sheetRes.added += 1;
        resultSummary.studentsAdded += 1;
      }

      sheetResults.push(sheetRes);
    }

    // Sắp xếp lại học sinh các lớp vừa import theo chuẩn A-Z (tận dụng transaction đang mở)
    const affectedClassIds = sheetResults.map(r => r.classId).filter(Boolean);
    sortAllStudentsInDatabase(db, true, affectedClassIds);

    db.exec('COMMIT;');
    return {
      success: true,
      summary: resultSummary,
      sheetResults: sheetResults,
      totalWorkbookSheets: payload.totalWorkbookSheets !== undefined ? payload.totalWorkbookSheets : sheets.length,
      sheetsSkipped: payload.sheetsSkipped !== undefined ? payload.sheetsSkipped : 0
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch (rbErr) {
      console.warn('[Database] Rollback transaction batch import failed:', rbErr.message);
    }
    throw err;
  }
}
