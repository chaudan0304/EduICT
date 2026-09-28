import { getDatabase } from './connection.js';

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
