import { getDatabase } from './connection.js';

// ====================================================
// PHÂN HỆ QUICK QUIZ: QUESTION BANK & QUIZ SESSIONS
// ====================================================

// 1. Lấy danh sách câu hỏi trong Ngân hàng câu hỏi (kèm bộ lọc)
export function getAllQuestions(filters = {}) {
  const db = getDatabase();
  let sql = 'SELECT * FROM question_bank WHERE (is_deleted = 0 OR is_deleted IS NULL)';
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
  
  const duplicate = db.prepare(`
    SELECT id FROM question_bank 
    WHERE question = ? 
      AND type = ? 
      AND grade = ?
      AND correct_answer = ?
      AND (is_deleted = 0 OR is_deleted IS NULL)
  `).get(
    qData.question || 'Câu hỏi mới', 
    qData.type || 'MULTIPLE_CHOICE', 
    qData.grade ? Number(qData.grade) : 3, 
    qData.correct_answer || ''
  );

  if (duplicate) {
    const dupErr = new Error('Câu hỏi đã tồn tại trong ngân hàng (trùng lặp nội dung).');
    dupErr.statusCode = 409;
    throw dupErr;
  }
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
    const nf = new Error(`Không tìm thấy câu hỏi với ID ${id}`);
    nf.statusCode = 404;
    throw nf;
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
  const usage = db.prepare('SELECT COUNT(*) as count FROM quiz_questions WHERE question_bank_id = ?').get(id);
  if (usage && usage.count > 0) {
    db.prepare('UPDATE question_bank SET is_deleted = 1 WHERE id = ?;').run(id);
  } else {
    db.prepare('DELETE FROM question_bank WHERE id = ?;').run(id);
  }
  return true;
}

// 6. Nhân bản câu hỏi
export function duplicateQuestion(id) {
  const original = getQuestionById(id);
  if (!original) {
    const nf = new Error(`Không tìm thấy câu hỏi ${id} để nhân bản`);
    nf.statusCode = 404;
    throw nf;
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

  // Nạp phiên để CHẤM ĐIỂM PHÍA SERVER (không tin số liệu đúng/sai & sao do client gửi)
  const session = db.prepare('SELECT id, mode, class_id, star_reward_per_correct FROM quiz_sessions WHERE id = ?;').get(sessionId);
  if (!session) {
    const nf = new Error(`Không tìm thấy phiên đố vui ${sessionId}`);
    nf.statusCode = 404;
    throw nf;
  }
  const starReward = Number(session.star_reward_per_correct) || 0;

  // Map câu hỏi THUỘC phiên này -> correct_index (chuẩn đúng/sai + chống nhiễm chéo phiên)
  const correctIndexByQ = {};
  db.prepare('SELECT id, correct_index FROM quiz_questions WHERE quiz_session_id = ?;').all(sessionId)
    .forEach(q => { correctIndexByQ[q.id] = Number(q.correct_index) || 0; });
  const hasQ = (qid) => Object.prototype.hasOwnProperty.call(correctIndexByQ, qid);

  // Chỉ nhận học sinh thuộc lớp của phiên (nếu phiên gắn class_id)
  let validStudentIds = null;
  if (session.class_id) {
    validStudentIds = new Set(db.prepare('SELECT id FROM students WHERE class_id = ?;').all(session.class_id).map(s => s.id));
  }
  const rawSR = Array.isArray(resultsPayload.student_results) ? resultsPayload.student_results : [];
  const studentResults = rawSR.filter(sr => hasQ(sr.quiz_question_id) && (validStudentIds === null || validStudentIds.has(sr.student_id)));
  let accuracySum = 0, scoredQuestions = 0, studentStarsTotal = 0;

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
      if (!hasQ(r.quiz_question_id)) continue; // chỉ ghi câu hỏi thuộc phiên này
      const correctIdx = correctIndexByQ[r.quiz_question_id];
      let distObj = {};
      try { distObj = typeof r.distribution === 'string' ? JSON.parse(r.distribution) : (r.distribution || {}); } catch { distObj = {}; }
      let correctCount = 0, wrongCount = 0, totalResponses = 0;
      if (session.mode === 'STUDENT') {
        for (const sr of studentResults) {
          if (sr.quiz_question_id !== r.quiz_question_id) continue;
          if (sr.status === 'CORRECT') correctCount++; else if (sr.status === 'WRONG') wrongCount++;
        }
        totalResponses = correctCount + wrongCount;
      } else {
        for (const k of Object.keys(distObj)) {
          const n = Number(distObj[k]) || 0; totalResponses += n;
          if (Number(k) === correctIdx) correctCount += n; else wrongCount += n;
        }
      }
      const accuracyRate = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0;
      accuracySum += accuracyRate; scoredQuestions += 1;
      const rId = r.id || `qr_${sessionId}_${r.quiz_question_id}`;
      const distJson = typeof r.distribution === 'string' ? r.distribution : JSON.stringify(r.distribution || {});
      insertResultStmt.run(rId, sessionId, r.quiz_question_id, distJson, totalResponses, correctCount, wrongCount, accuracyRate);
    }

    // Kết quả từng học sinh — sao do SERVER tính từ status (không tin stars_earned client)
    if (studentResults.length > 0) {
      const insertStudentStmt = db.prepare(`
        INSERT OR REPLACE INTO quiz_student_results (
          id, quiz_session_id, quiz_question_id, student_id, student_name,
          status, selected_option, stars_earned, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
      `);

      for (const sr of studentResults) {
        const starsEarned = sr.status === 'CORRECT' ? starReward : 0;
        studentStarsTotal += starsEarned;
        const srId = sr.id || `qsr_${sessionId}_${sr.quiz_question_id}_${sr.student_id}`;
        insertStudentStmt.run(
          srId,
          sessionId,
          sr.quiz_question_id,
          sr.student_id,
          sr.student_name || '',
          sr.status || 'NOT_ANSWERED',
          sr.selected_option || '',
          starsEarned
        );
      }
    }

    // Tổng kết: accuracy do server tính; sao student-mode do server tính, class-mode giữ số client (thưởng tập thể)
    const serverAvgAccuracy = scoredQuestions > 0 ? Math.round(accuracySum / scoredQuestions) : null;
    const totalStars = session.mode === 'STUDENT'
      ? studentStarsTotal
      : (resultsPayload.total_stars_awarded !== undefined ? Number(resultsPayload.total_stars_awarded) : null);
    if (serverAvgAccuracy !== null || totalStars !== null || resultsPayload.status) {
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
        serverAvgAccuracy,
        totalStars,
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

// Thống kê số lượng lớp học theo khối (GROUP BY 1 query tối ưu)
export function getClassStats() {
  const db = getDatabase();
  const rows = db.prepare('SELECT grade, COUNT(*) as count FROM classes GROUP BY grade;').all();
  const totalClasses = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);
  const classCountByGrade = {};
  for (const r of rows) {
    classCountByGrade[Number(r.grade)] = Number(r.count || 0);
  }
  return { totalClasses, classCountByGrade };
}
