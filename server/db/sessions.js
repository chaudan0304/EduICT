import { getDatabase } from './connection.js';

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
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
  const existing = sessionData.id && getSessionById(sessionData.id);
  if (existing) {
    const same = existing.class_id === (sessionData.class_id || sessionData.classId)
      && existing.lesson_title === (sessionData.lesson_title || sessionData.lessonTitle || 'Tiết học Tin học')
      && existing.duration_minutes === (Number(sessionData.duration_minutes || sessionData.durationMinutes) || 35)
      && existing.objectives === (sessionData.objectives || '') && existing.teacher_notes === (sessionData.teacher_notes || sessionData.teacherNotes || '')
      && (existing.lesson_id || null) === (sessionData.lesson_id || sessionData.lessonId || null)
      && existing.session_date === (sessionData.session_date || sessionData.sessionDate || new Date().toISOString().slice(0, 10))
      && JSON.stringify(existing.activities.map(a => [a.type,a.title,a.duration_minutes,a.description,a.notes])) === JSON.stringify((sessionData.activities || []).map((a,i) => [a.type || 'ACTIVITY',a.title || `Hoạt động ${i+1}`,Number(a.duration_minutes || a.durationMinutes) || 5,a.description || '',a.notes || '']));
    if (!same) throw Object.assign(new Error('Tiết học đã được tạo với thông tin khác. Hãy kiểm tra danh sách trước khi tạo lại.'), { statusCode: 409 });
    db.exec('COMMIT;');
    return existing;
  }
    const sessionId = sessionData.id || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const stmt = db.prepare(`
      INSERT INTO classroom_sessions (
        id, class_id, lesson_id, lesson_title, duration_minutes, session_date,
        objectives, teacher_notes, status, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);

    stmt.run(
      sessionId,
      sessionData.class_id || sessionData.classId,
      sessionData.lesson_id || sessionData.lessonId || null,
      sessionData.lesson_title || sessionData.lessonTitle || 'Tiết học Tin học',
      Number(sessionData.duration_minutes || sessionData.durationMinutes) || 35,
      sessionData.session_date || sessionData.sessionDate || new Date().toISOString().slice(0, 10),
      sessionData.objectives || '',
      sessionData.teacher_notes || sessionData.teacherNotes || '',
      sessionData.status || 'DRAFT',
      sessionData.started_at || (sessionData.status === 'RUNNING' ? new Date().toISOString() : null)
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
  if (!getSessionById(sessionId)) throw Object.assign(new Error('Tiết học không còn tồn tại. Hãy kiểm tra lại danh sách.'), { statusCode: 404 });
  const allowed = [
    'lesson_id', 'lesson_title', 'duration_minutes', 'session_date', 'objectives', 
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
function insertHistoryOnce(table, record, createdAt) {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const session = db.prepare('SELECT class_id FROM classroom_sessions WHERE id=?').get(record.session_id);
    if (!session) throw Object.assign(new Error('Tiết học không còn tồn tại.'), { statusCode: 404 });
    if (record.student_id && !db.prepare('SELECT 1 FROM students WHERE id=? AND class_id=?').get(record.student_id, session.class_id)) {
      throw Object.assign(new Error('Học sinh không thuộc lớp của tiết học.'), { statusCode: 400 });
    }
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(record.id);
    if (existing) {
      if (Object.keys(record).some(key => existing[key] !== record[key])) throw Object.assign(new Error('Mã nhật ký đã dùng cho nội dung khác.'), { statusCode: 409 });
    } else {
      const keys = Object.keys(record);
      const timestamp = createdAt && Number.isFinite(Date.parse(createdAt)) ? new Date(createdAt).toISOString() : new Date().toISOString();
      db.prepare(`INSERT INTO ${table} (${keys.join(',')},created_at) VALUES (${keys.map(() => '?').join(',')},?)`).run(...keys.map(key => record[key]), timestamp);
    }
    db.exec('COMMIT;');
    return { id: record.id, success: true };
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
}
export function addSessionEvent(sessionId, eventData) {
  return insertHistoryOnce('session_events', {
    id: eventData.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    session_id: sessionId,
    event_type: eventData.event_type || eventData.eventType,
    activity_id: eventData.activity_id || eventData.activityId || null,
    student_id: eventData.student_id || eventData.studentId || null,
    details: typeof eventData.details === 'object' ? JSON.stringify(eventData.details) : (eventData.details || '')
  }, eventData.created_at);
}

// 8. Ghi nhận học sinh tham gia (bản ghi LOG cho tổng kết tiết học)
// LƯU Ý (gộp sổ cái sao — 1b): hàm này KHÔNG còn tự cộng/trừ students.stars.
// Mọi thay đổi sao đi qua sổ cái gamification (awardStar/adjustStars) để tránh
// double-write + race với saveStudentsForClass. Ở đây chỉ lưu lại participation
// (badge, stars_awarded) phục vụ hiển thị & thống kê tổng kết.
export function addStudentParticipation(sessionId, pData) {
  const partId = pData.id || `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const studentId = pData.student_id || pData.studentId;
  const starsAwarded = Number(pData.stars_awarded || pData.starsAwarded) || 0;

  return insertHistoryOnce('student_participation', { id: partId, session_id: sessionId, student_id: studentId,
    activity_id: pData.activity_id || pData.activityId || null, badge_type: pData.badge_type || pData.badgeType || 'PARTICIPATION',
    stars_awarded: starsAwarded, note: pData.note || '' }, pData.created_at);
}
