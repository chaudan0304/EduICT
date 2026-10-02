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
  db.exec('BEGIN TRANSACTION;');
  try {
    const sessionId = sessionData.id || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const stmt = db.prepare(`
      INSERT INTO classroom_sessions (
        id, class_id, lesson_id, lesson_title, duration_minutes, session_date,
        objectives, teacher_notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
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

// 8. Ghi nhận học sinh tham gia (bản ghi LOG cho tổng kết tiết học)
// LƯU Ý (gộp sổ cái sao — 1b): hàm này KHÔNG còn tự cộng/trừ students.stars.
// Mọi thay đổi sao đi qua sổ cái gamification (awardStar/adjustStars) để tránh
// double-write + race với saveStudentsForClass. Ở đây chỉ lưu lại participation
// (badge, stars_awarded) phục vụ hiển thị & thống kê tổng kết.
export function addStudentParticipation(sessionId, pData) {
  const db = getDatabase();
  const partId = pData.id || `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const studentId = pData.student_id || pData.studentId;
  const starsAwarded = Number(pData.stars_awarded || pData.starsAwarded) || 0;

  const stmt = db.prepare(`
    INSERT INTO student_participation (id, session_id, student_id, activity_id, badge_type, stars_awarded, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
  `);
  stmt.run(
    partId,
    sessionId,
    studentId,
    pData.activity_id || pData.activityId || null,
    pData.badge_type || pData.badgeType || 'PARTICIPATION',
    starsAwarded,
    pData.note || ''
  );

  return { id: partId, success: true };
}
