import { getDatabase } from './connection.js';
import { assertManagedPowerPoint } from '../services/linkedPowerPoint.js';
import { normalizeLessonMetadata } from '../services/powerPointOnline.js';

// ========================================================
// LESSONS & SLIDES CRUD
// ========================================================

// Helper: Trích xuất thứ tự số học tự nhiên từ tiêu đề bài học và chủ đề
export function extractLessonSortKey(lessonOrTitle) {
  let title = '';
  let topic = '';
  let grade = 0;
  let orderIndex = 0;

  if (typeof lessonOrTitle === 'string') {
    title = lessonOrTitle.trim();
  } else if (lessonOrTitle && typeof lessonOrTitle === 'object') {
    title = (lessonOrTitle.title || lessonOrTitle.lessonTitle || '').trim();
    topic = (lessonOrTitle.topic || '').trim();
    grade = Number(lessonOrTitle.grade) || 0;
    orderIndex = Number(lessonOrTitle.order_index) || 0;
  }

  // 1. Trích xuất Chương / Chủ đề (VD: "(Chương 6: ...)", "Chương 3", "Chủ đề A", "Chủ đề 2")
  let chapterNum = 0;
  const chapterMatch = (topic + ' ' + title).match(/(?:chương|chuong|chủ đề|chu de)\s*(\d+|[a-zA-Z])/i);
  if (chapterMatch) {
    const rawChapter = chapterMatch[1].toUpperCase();
    if (/^\d+$/.test(rawChapter)) {
      chapterNum = parseInt(rawChapter, 10);
    } else {
      chapterNum = rawChapter.charCodeAt(0) - 64;
    }
  }

  // 2. Trích xuất Số bài học (VD: "Bài 10", "Bài 8A", "Bài 8B", "Tiết 3")
  let lessonNum = 9999;
  let lessonSuffix = '';
  const lessonMatch = title.match(/(?:bài|bai|tiết|tiet|tuần|tuan|lesson|unit)\s*(\d+)\s*([a-zA-Z])?/i);
  if (lessonMatch) {
    lessonNum = parseInt(lessonMatch[1], 10);
    lessonSuffix = (lessonMatch[2] || '').toUpperCase();
  } else {
    const generalMatch = title.match(/(?:^|[_\-\s])(\d+)(?:[_\-\s:]|$)/);
    if (generalMatch) {
      lessonNum = parseInt(generalMatch[1], 10);
    }
  }

  return {
    grade,
    chapterNum,
    lessonNum,
    lessonSuffix,
    orderIndex,
    title
  };
}

export function sortLessonsList(lessons) {
  if (!Array.isArray(lessons)) return [];
  return [...lessons].sort((a, b) => {
    const keyA = extractLessonSortKey(a);
    const keyB = extractLessonSortKey(b);

    if (keyA.grade && keyB.grade && keyA.grade !== keyB.grade) {
      return keyA.grade - keyB.grade;
    }

    // 1. Ưu tiên số thứ tự bài học (VD: Bài 3 < Bài 7 < Bài 8A < Bài 8B < Bài 10 < Bài 16)
    if (keyA.lessonNum !== 9999 && keyB.lessonNum !== 9999) {
      if (keyA.lessonNum !== keyB.lessonNum) {
        return keyA.lessonNum - keyB.lessonNum;
      }
      if (keyA.lessonSuffix !== keyB.lessonSuffix) {
        return keyA.lessonSuffix.localeCompare(keyB.lessonSuffix);
      }
    }

    if (keyA.lessonNum !== 9999 && keyB.lessonNum === 9999) return -1;
    if (keyA.lessonNum === 9999 && keyB.lessonNum !== 9999) return 1;

    // 2. Chương / Chủ đề
    if (keyA.chapterNum !== keyB.chapterNum) {
      return keyA.chapterNum - keyB.chapterNum;
    }

    // 3. order_index nếu có
    if (keyA.orderIndex !== keyB.orderIndex) {
      return keyA.orderIndex - keyB.orderIndex;
    }

    return keyA.title.localeCompare(keyB.title, 'vi', { numeric: true, sensitivity: 'base' });
  });
}

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
  if (filters.type && filters.type !== 'all') {
    if (filters.type === 'native') {
      conditions.push("(l.type = 'native' OR l.type IS NULL)");
    } else if (filters.type === 'imported' || filters.type === 'powerpoint') {
      conditions.push("l.type IN ('imported', 'linked_powerpoint', 'powerpoint_online')");
    } else {
      conditions.push('l.type = ?');
      params.push(filters.type);
    }
  }
  if (filters.similarity_status && filters.similarity_status !== 'all') {
    conditions.push('l.similarity_status = ?');
    params.push(filters.similarity_status);
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
  const rows = db.prepare(sql).all(...params);

  const mapped = rows.map(l => {
    const total = Number(l.total_slides) || Number(l.slide_count) || Number(l.slides_count) || 0;
    const isCompleted = l.render_status === 'ready' || l.render_status === 'COMPLETED' || l.render_status === 'completed';
    const rendered = l.rendered_slides !== null && l.rendered_slides !== undefined ? Number(l.rendered_slides) : (isCompleted ? total : 0);
    const failed = Number(l.failed_slides) || 0;
    const progress = l.render_progress !== null && l.render_progress !== undefined ? Number(l.render_progress) : (total > 0 && rendered === total ? 100 : 0);

    return {
      ...l,
      totalSlides: total,
      renderedSlides: rendered,
      failedSlides: failed,
      renderProgress: progress,
      renderStatus: l.render_status || 'ready',
      importStatus: l.import_status || 'IMPORTED',
      thumbnailUrl: l.thumbnail_url || ''
    };
  });

  return sortLessonsList(mapped);
}

// 2. Lấy chi tiết bài học kèm tất cả các slide
export function getLessonById(lessonId) {
  const db = getDatabase();
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?;').get(lessonId);
  if (!lesson) return null;

  const slides = db.prepare('SELECT * FROM lesson_slides WHERE lesson_id = ? ORDER BY order_index ASC;').all(lessonId);
  
  const total = Number(lesson.total_slides) || Number(lesson.slide_count) || slides.length;
  const readySlides = slides.filter(s => (s.render_status === 'ready' || s.render_status === 'completed' || s.render_status === 'COMPLETED') && s.image_url && s.image_url.trim() !== '');
  const rendered = lesson.rendered_slides !== null && lesson.rendered_slides !== undefined ? Number(lesson.rendered_slides) : readySlides.length;
  const failed = lesson.failed_slides !== null && lesson.failed_slides !== undefined ? Number(lesson.failed_slides) : slides.filter(s => s.render_status === 'failed' || s.render_status === 'FAILED').length;
  const progress = lesson.render_progress !== null && lesson.render_progress !== undefined ? Number(lesson.render_progress) : (total > 0 ? Math.round((rendered / total) * 100) : 0);

  return {
    ...lesson,
    totalSlides: total,
    renderedSlides: rendered,
    failedSlides: failed,
    renderProgress: progress,
    renderStatus: lesson.render_status || 'ready',
    importStatus: lesson.import_status || 'IMPORTED',
    thumbnailUrl: lesson.thumbnail_url || '',
    slides: slides.map((s, idx) => {
      let parsedQuestion = null;
      let parsedActivity = null;
      try {
        if (s.question_data) parsedQuestion = JSON.parse(s.question_data);
      } catch (e) {}
      try {
        if (s.activity_data) parsedActivity = JSON.parse(s.activity_data);
      } catch (e) {}
      const slideNum = s.slide_number || (s.order_index !== undefined ? s.order_index + 1 : idx + 1);
      return {
        ...s,
        slideNumber: slideNum,
        slide_number: slideNum,
        status: s.render_status,
        imageUrl: s.image_url,
        renderPath: s.render_path || '',
        thumbnailPath: s.thumbnail_path || '',
        attempts: s.attempts !== undefined ? s.attempts : (s.render_attempts || 0),
        renderedAt: s.rendered_at || '',
        errorCode: s.error_code || '',
        errorMessage: s.error_message || '',
        question_parsed: parsedQuestion,
        activity_parsed: parsedActivity
      };
    })
  };
}

// Lấy bài học theo mã băm SHA-256
export function getLessonByFileHash(fileHash) {
  if (!fileHash) return null;
  const db = getDatabase();
  return db.prepare('SELECT * FROM lessons WHERE LOWER(file_hash) = LOWER(?) ORDER BY created_at ASC LIMIT 1;').get(fileHash);
}

// 3. Tạo bài học mới
export function createLesson(lessonData) {
  lessonData = normalizeLessonMetadata(lessonData);
  const db = getDatabase();
  const lessonId = lessonData.id || `les_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  const stmt = db.prepare(`
    INSERT INTO lessons (
      id, title, grade, subject, topic, duration_minutes, 
      objectives, keywords, teacher_notes, type, 
      source_file_name, source_filename, source_file_path, thumbnail_url, slide_count,
      render_status, file_hash, source_file_size, similarity_status, similarity_score,
      duplicate_of_id, content_fingerprint,
      import_status, render_progress, thumbnail_path, total_slides, rendered_slides, failed_slides,
      online_embed_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `);

  const slideCount = Array.isArray(lessonData.slides) ? lessonData.slides.length : (Number(lessonData.slide_count) || 0);
  const fileName = lessonData.source_file_name || lessonData.sourceFileName || lessonData.source_filename || '';

  stmt.run(
    lessonId,
    lessonData.title || 'Bài học mới',
    Number(lessonData.grade) || 3,
    lessonData.subject || 'Tin Học',
    lessonData.topic || 'Chung',
    Number(lessonData.duration_minutes || lessonData.durationMinutes) || 35,
    lessonData.objectives || '',
    lessonData.keywords || '',
    lessonData.teacher_notes || lessonData.teacherNotes || '',
    lessonData.type || 'native',
    fileName,
    fileName,
    lessonData.source_file_path || lessonData.sourceFilePath || '',
    lessonData.thumbnail_url || lessonData.thumbnailUrl || '',
    slideCount,
    lessonData.render_status || lessonData.renderStatus || 'ready',
    lessonData.file_hash || lessonData.fileHash || null,
    Number(lessonData.source_file_size || lessonData.sourceFileSize) || 0,
    lessonData.similarity_status || lessonData.similarityStatus || 'unique',
    Number(lessonData.similarity_score || lessonData.similarityScore) || 0,
    lessonData.duplicate_of_id || lessonData.duplicateOfId || null,
    lessonData.content_fingerprint || lessonData.contentFingerprint || '',
    lessonData.import_status || lessonData.importStatus || 'IMPORTED',
    Number(lessonData.render_progress || lessonData.renderProgress) || 0,
    lessonData.thumbnail_path || lessonData.thumbnailPath || '',
    Number(lessonData.total_slides || lessonData.totalSlides || slideCount) || 0,
    Number(lessonData.rendered_slides || lessonData.renderedSlides) || 0,
    Number(lessonData.failed_slides || lessonData.failedSlides) || 0,
    lessonData.online_embed_url || ''
  );

  if (Array.isArray(lessonData.slides) && lessonData.slides.length > 0) {
    saveLessonSlides(lessonId, lessonData.slides);
  }

  return getLessonById(lessonId);
}

// 4. Cập nhật bài học
export function updateLesson(lessonId, lessonData) {
  const db = getDatabase();
  lessonData = normalizeLessonMetadata(lessonData, db.prepare('SELECT * FROM lessons WHERE id = ?;').get(lessonId));
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
      type = COALESCE(?, type),
      source_file_name = COALESCE(?, source_file_name),
      source_filename = COALESCE(?, source_filename),
      source_file_path = COALESCE(?, source_file_path),
      thumbnail_url = COALESCE(?, thumbnail_url),
      slide_count = COALESCE(?, slide_count),
      render_status = COALESCE(?, render_status),
      file_hash = COALESCE(?, file_hash),
      source_file_size = COALESCE(?, source_file_size),
      similarity_status = COALESCE(?, similarity_status),
      similarity_score = COALESCE(?, similarity_score),
      duplicate_of_id = COALESCE(?, duplicate_of_id),
      content_fingerprint = COALESCE(?, content_fingerprint),
      import_status = COALESCE(?, import_status),
      render_progress = COALESCE(?, render_progress),
      thumbnail_path = COALESCE(?, thumbnail_path),
      total_slides = COALESCE(?, total_slides),
      rendered_slides = COALESCE(?, rendered_slides),
      failed_slides = COALESCE(?, failed_slides),
      online_embed_url = COALESCE(?, online_embed_url),
      onedrive_drive_id = CASE WHEN COALESCE(?, online_embed_url, '') != COALESCE(online_embed_url, '') THEN '' ELSE onedrive_drive_id END,
      onedrive_item_id = CASE WHEN COALESCE(?, online_embed_url, '') != COALESCE(online_embed_url, '') THEN '' ELSE onedrive_item_id END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `);

  const slideCount = Array.isArray(lessonData.slides) ? lessonData.slides.length : (lessonData.slide_count !== undefined ? Number(lessonData.slide_count) : null);
  const fileName = lessonData.source_file_name !== undefined ? lessonData.source_file_name : (lessonData.sourceFileName !== undefined ? lessonData.sourceFileName : (lessonData.source_filename !== undefined ? lessonData.source_filename : null));

  stmt.run(
    lessonData.title !== undefined ? lessonData.title : null,
    lessonData.grade !== undefined ? Number(lessonData.grade) : null,
    lessonData.subject !== undefined ? lessonData.subject : null,
    lessonData.topic !== undefined ? lessonData.topic : null,
    lessonData.duration_minutes !== undefined ? Number(lessonData.duration_minutes) : (lessonData.durationMinutes !== undefined ? Number(lessonData.durationMinutes) : null),
    lessonData.objectives !== undefined ? lessonData.objectives : null,
    lessonData.keywords !== undefined ? lessonData.keywords : null,
    lessonData.teacher_notes !== undefined ? lessonData.teacher_notes : (lessonData.teacherNotes !== undefined ? lessonData.teacherNotes : null),
    lessonData.type !== undefined ? lessonData.type : null,
    fileName,
    fileName,
    lessonData.source_file_path !== undefined ? lessonData.source_file_path : (lessonData.sourceFilePath !== undefined ? lessonData.sourceFilePath : null),
    lessonData.thumbnail_url !== undefined ? lessonData.thumbnail_url : (lessonData.thumbnailUrl !== undefined ? lessonData.thumbnailUrl : null),
    slideCount,
    lessonData.render_status !== undefined ? lessonData.render_status : (lessonData.renderStatus !== undefined ? lessonData.renderStatus : null),
    lessonData.file_hash !== undefined ? lessonData.file_hash : (lessonData.fileHash !== undefined ? lessonData.fileHash : null),
    lessonData.source_file_size !== undefined ? Number(lessonData.source_file_size) : (lessonData.sourceFileSize !== undefined ? Number(lessonData.sourceFileSize) : null),
    lessonData.similarity_status !== undefined ? lessonData.similarity_status : (lessonData.similarityStatus !== undefined ? lessonData.similarityStatus : null),
    lessonData.similarity_score !== undefined ? Number(lessonData.similarity_score) : (lessonData.similarityScore !== undefined ? Number(lessonData.similarityScore) : null),
    lessonData.duplicate_of_id !== undefined ? lessonData.duplicate_of_id : (lessonData.duplicateOfId !== undefined ? lessonData.duplicateOfId : null),
    lessonData.content_fingerprint !== undefined ? lessonData.content_fingerprint : (lessonData.contentFingerprint !== undefined ? lessonData.contentFingerprint : null),
    lessonData.import_status !== undefined ? lessonData.import_status : (lessonData.importStatus !== undefined ? lessonData.importStatus : null),
    lessonData.render_progress !== undefined ? Number(lessonData.render_progress) : (lessonData.renderProgress !== undefined ? Number(lessonData.renderProgress) : null),
    lessonData.thumbnail_path !== undefined ? lessonData.thumbnail_path : (lessonData.thumbnailPath !== undefined ? lessonData.thumbnailPath : null),
    lessonData.total_slides !== undefined ? Number(lessonData.total_slides) : (lessonData.totalSlides !== undefined ? Number(lessonData.totalSlides) : null),
    lessonData.rendered_slides !== undefined ? Number(lessonData.rendered_slides) : (lessonData.renderedSlides !== undefined ? Number(lessonData.renderedSlides) : null),
    lessonData.failed_slides !== undefined ? Number(lessonData.failed_slides) : (lessonData.failedSlides !== undefined ? Number(lessonData.failedSlides) : null),
    lessonData.online_embed_url !== undefined ? lessonData.online_embed_url : null,
    lessonData.online_embed_url !== undefined ? lessonData.online_embed_url : null,
    lessonData.online_embed_url !== undefined ? lessonData.online_embed_url : null,
    lessonId
  );

  if (Array.isArray(lessonData.slides)) {
    saveLessonSlides(lessonId, lessonData.slides);
  }

  return getLessonById(lessonId);
}

// 5. Xóa bài học (kiểm tra tham chiếu Classroom Session trước khi xóa)
export function deleteLesson(lessonId) {
  const db = getDatabase();

  // Kiểm tra xem có Classroom Session nào đang tham chiếu bài học này không
  let referencedSessionCount = 0;
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM classroom_sessions WHERE lesson_id = ?;').get(lessonId);
    referencedSessionCount = row ? row.count : 0;
  } catch (e) {
    // Cột lesson_id có thể chưa tồn tại trong DB cũ — bỏ qua an toàn
  }

  // Xóa bài học (CASCADE sẽ xóa lesson_slides liên quan)
  db.prepare('DELETE FROM lessons WHERE id = ?;').run(lessonId);

  // Không xóa session reference — session giữ lesson_id cũ nhưng bài đã xóa
  // (session vẫn hoạt động với lesson_title đã lưu)
  return { success: true, id: lessonId, referencedSessions: referencedSessionCount };
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
  assertManagedPowerPoint(db.prepare('SELECT type FROM lessons WHERE id = ?;').get(lessonId));
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM lesson_slides WHERE lesson_id = ?;').run(lessonId);

    const insertStmt = db.prepare(`
      INSERT INTO lesson_slides (
        id, lesson_id, order_index, type, title, content, layout,
        image_url, video_url, question_data, activity_data, teacher_notes,
        render_status, error_code, error_message, render_attempts,
        slide_number, render_path, thumbnail_path, attempts, rendered_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);

    slidesArray.forEach((s, idx) => {
      const slideId = s.id && !s.id.startsWith('temp_') ? s.id : `slide_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
      const qData = typeof s.question_data === 'object' ? JSON.stringify(s.question_data) : (typeof s.question_parsed === 'object' && s.question_parsed ? JSON.stringify(s.question_parsed) : (s.question_data || ''));
      const aData = typeof s.activity_data === 'object' ? JSON.stringify(s.activity_data) : (typeof s.activity_parsed === 'object' && s.activity_parsed ? JSON.stringify(s.activity_parsed) : (s.activity_data || ''));
      const imgUrl = s.image_url || s.imageUrl || '';
      const slideNum = s.slide_number !== undefined ? Number(s.slide_number) : (s.order_index !== undefined ? Number(s.order_index) + 1 : idx + 1);

      // Slide status: nếu có ảnh hợp lệ thì ready, nếu chưa có thì pending/processing
      let slideStatus = s.render_status || s.status || s.renderStatus;
      if (!slideStatus) {
        slideStatus = imgUrl ? 'ready' : 'pending';
      }

      insertStmt.run(
        slideId,
        lessonId,
        idx,
        s.type || 'CONTENT',
        s.title || `Slide ${slideNum}`,
        s.content || '',
        s.layout || 'STANDARD',
        imgUrl,
        s.video_url || s.videoUrl || '',
        qData,
        aData,
        s.teacher_notes || s.teacherNotes || '',
        slideStatus,
        s.error_code || s.errorCode || '',
        s.error_message || s.errorMessage || '',
        Number(s.attempts || s.render_attempts || s.renderAttempts) || 0,
        slideNum,
        s.render_path || s.renderPath || '',
        s.thumbnail_path || s.thumbnailPath || '',
        Number(s.attempts || s.render_attempts || s.renderAttempts) || 0,
        s.rendered_at || s.renderedAt || ''
      );
    });

    db.exec('COMMIT;');

    // Đồng bộ ngay trạng thái tổng của lesson
    syncLessonOverallRenderStatus(lessonId);

    return db.prepare('SELECT * FROM lesson_slides WHERE lesson_id = ? ORDER BY order_index ASC;').all(lessonId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// 8. Cập nhật trạng thái render của một slide đơn lẻ
export function updateSlideRenderStatus(slideId, updateData = {}) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE lesson_slides SET
      render_status = COALESCE(?, render_status),
      image_url = COALESCE(?, image_url),
      error_code = COALESCE(?, error_code),
      error_message = COALESCE(?, error_message),
      render_attempts = COALESCE(?, render_attempts),
      attempts = COALESCE(?, attempts),
      slide_number = COALESCE(?, slide_number),
      render_path = COALESCE(?, render_path),
      thumbnail_path = COALESCE(?, thumbnail_path),
      rendered_at = COALESCE(?, rendered_at),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `);

  const attemptsNum = updateData.attempts !== undefined ? Number(updateData.attempts) : (updateData.render_attempts !== undefined ? Number(updateData.render_attempts) : (updateData.renderAttempts !== undefined ? Number(updateData.renderAttempts) : null));

  stmt.run(
    updateData.render_status || updateData.renderStatus || updateData.status || null,
    updateData.image_url !== undefined ? updateData.image_url : (updateData.imageUrl !== undefined ? updateData.imageUrl : null),
    updateData.error_code !== undefined ? updateData.error_code : (updateData.errorCode !== undefined ? updateData.errorCode : null),
    updateData.error_message !== undefined ? updateData.error_message : (updateData.errorMessage !== undefined ? updateData.errorMessage : null),
    attemptsNum,
    attemptsNum,
    updateData.slide_number !== undefined ? Number(updateData.slide_number) : (updateData.slideNumber !== undefined ? Number(updateData.slideNumber) : null),
    updateData.render_path !== undefined ? updateData.render_path : (updateData.renderPath !== undefined ? updateData.renderPath : null),
    updateData.thumbnail_path !== undefined ? updateData.thumbnail_path : (updateData.thumbnailPath !== undefined ? updateData.thumbnailPath : null),
    updateData.rendered_at !== undefined ? updateData.rendered_at : (updateData.renderedAt !== undefined ? updateData.renderedAt : null),
    slideId
  );

  // Tự động kiểm tra và đồng bộ render_status của lesson cha
  const slide = db.prepare('SELECT lesson_id FROM lesson_slides WHERE id = ?;').get(slideId);
  if (slide && slide.lesson_id) {
    syncLessonOverallRenderStatus(slide.lesson_id);
  }

  return db.prepare('SELECT * FROM lesson_slides WHERE id = ?;').get(slideId);
}

// 9. Đồng bộ hóa trạng thái render_status tổng của bài học dựa trên các slide con
export function syncLessonOverallRenderStatus(lessonId) {
  const db = getDatabase();
  const slides = db.prepare('SELECT * FROM lesson_slides WHERE lesson_id = ? ORDER BY order_index ASC;').all(lessonId);
  if (!slides || slides.length === 0) return;

  const total = slides.length;
  const readyCount = slides.filter(s => (s.render_status === 'ready' || s.render_status === 'completed' || s.render_status === 'COMPLETED') && s.image_url && s.image_url.trim() !== '').length;
  const failedCount = slides.filter(s => s.render_status === 'failed' || s.render_status === 'FAILED').length;
  const processingCount = slides.filter(s => s.render_status === 'processing' || s.render_status === 'PROCESSING' || s.render_status === 'pending' || s.render_status === 'PENDING' || s.render_status === 'retrying' || s.render_status === 'RETRYING').length;

  let newStatus = 'ready';
  if (processingCount > 0) {
    newStatus = 'processing';
  } else if (failedCount === total && total > 0) {
    newStatus = 'failed';
  } else if (failedCount > 0 && readyCount > 0) {
    newStatus = 'partial';
  } else if (readyCount === total && total > 0) {
    newStatus = 'ready';
  } else if (readyCount > 0) {
    newStatus = 'partial';
  }

  const progress = total > 0 ? Math.round((readyCount / total) * 100) : 0;

  // Tự động kiểm tra và cập nhật thumbnail từ slide 1 nếu lesson chưa có thumbnail_url
  const currentLesson = db.prepare('SELECT thumbnail_url, thumbnail_path FROM lessons WHERE id = ?;').get(lessonId);
  let newThumbUrl = currentLesson?.thumbnail_url || '';
  let newThumbPath = currentLesson?.thumbnail_path || '';

  const slide1 = slides.find(s => s.order_index === 0);
  if ((!newThumbUrl || newThumbUrl.trim() === '') && slide1 && slide1.image_url && slide1.image_url.trim() !== '') {
    newThumbUrl = slide1.image_url;
    newThumbPath = slide1.render_path || '';
  }

  db.prepare(`
    UPDATE lessons SET
      render_status = ?,
      total_slides = ?,
      rendered_slides = ?,
      failed_slides = ?,
      render_progress = ?,
      thumbnail_url = ?,
      thumbnail_path = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
  `).run(
    newStatus,
    total,
    readyCount,
    failedCount,
    progress,
    newThumbUrl,
    newThumbPath,
    lessonId
  );

  return {
    overallStatus: newStatus,
    total,
    readyCount,
    failedCount,
    progress,
    thumbnailUrl: newThumbUrl
  };
}
