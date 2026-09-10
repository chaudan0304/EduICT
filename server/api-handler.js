import fs from 'node:fs';
import path from 'node:path';
import { 
  getAllClassesWithStudents, 
  saveOrUpdateClass, 
  deleteClassById, 
  saveStudentsForClass, 
  getDbBrokenMachines, 
  saveDbBrokenMachines, 
  generateSqlScriptDump, 
  executeSqlDump,
  getDbRules,
  saveDbRules,
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  saveSessionActivities,
  addSessionEvent,
  addStudentParticipation,
  getAllLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  duplicateLesson,
  saveLessonSlides,
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  createQuizSession,
  getQuizSessionById,
  updateQuizSession,
  saveQuizResults
} from './db.js';
import {
  processPptxUploadPreview,
  commitImportedPptx,
  cancelImportSession,
  deleteLessonPresentationsDir,
  fastImportPptx
} from './pptxService.js';

const DB_PATH = path.resolve(process.cwd(), 'edumaster.sqlite');

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function parseRequestBodyBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = 0;
  let fileName = 'presentation.pptx';
  let fileBuffer = null;
  const fields = {};

  while (true) {
    const boundaryIdx = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIdx === -1) break;

    const headerStart = boundaryIdx + boundaryBuffer.length + 2; // skip \r\n
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headersStr = buffer.subarray(headerStart, headerEnd).toString('utf-8');
    const dataStart = headerEnd + 4;
    const nextBoundaryIdx = buffer.indexOf(boundaryBuffer, dataStart);
    if (nextBoundaryIdx === -1) break;

    const dataEnd = nextBoundaryIdx - 2; // skip \r\n
    const partData = buffer.subarray(dataStart, dataEnd);

    const dispositionMatch = headersStr.match(/Content-Disposition:\s*form-data;[^\r\n]*/i);
    if (dispositionMatch) {
      const match = dispositionMatch[0];
      const filenameStarMatch = match.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      const filenameMatch = match.match(/filename="?([^";\r\n]+)"?/i);
      const nameMatch = match.match(/name="?([^";\r\n]+)"?/i);

      if (filenameStarMatch) {
        try {
          fileName = decodeURIComponent(filenameStarMatch[1]);
        } catch {
          fileName = filenameStarMatch[1];
        }
        fileBuffer = partData;
      } else if (filenameMatch) {
        fileName = filenameMatch[1].trim();
        fileBuffer = partData;
      } else if (nameMatch) {
        fields[nameMatch[1]] = partData.toString('utf-8');
      }
    }

    start = nextBoundaryIdx;
  }

  return { fileName, fileBuffer, fields };
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // 1. Kiểm tra trạng thái Backend & File SQLite
  if (pathname === '/api/status' && method === 'GET') {
    const exists = fs.existsSync(DB_PATH);
    const size = exists ? fs.statSync(DB_PATH).size : 0;
    const classes = getAllClassesWithStudents();
    sendJson(res, 200, {
      status: 'ok',
      engine: 'SQLite (Node.js 22 Native)',
      dbFile: 'edumaster.sqlite',
      fileSizeBytes: size,
      fileSizeKb: Math.round(size / 1024),
      totalClasses: classes.length,
      totalStudents: classes.reduce((acc, c) => acc + (c.students?.length || 0), 0)
    });
    return true;
  }

  // 2. Lấy toàn bộ danh sách lớp
  if (pathname === '/api/classes' && method === 'GET') {
    try {
      const classes = getAllClassesWithStudents();
      sendJson(res, 200, classes);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 3. Tạo mới / cập nhật lớp
  if (pathname === '/api/classes' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      saveOrUpdateClass(body);
      sendJson(res, 201, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 4. Xóa lớp học
  if (pathname.startsWith('/api/classes/') && method === 'DELETE') {
    const classId = pathname.replace('/api/classes/', '');
    try {
      deleteClassById(classId);
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 5. Cập nhật học sinh trong lớp (PUT /api/classes/:id/students)
  if (pathname.match(/^\/api\/classes\/[^/]+\/students$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const classId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const studentsList = Array.isArray(body) ? body : (body.students || []);
      saveStudentsForClass(classId, studentsList);
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 6. Danh sách máy hỏng (GET / POST)
  if (pathname === '/api/broken-machines') {
    if (method === 'GET') {
      try {
        const machines = getDbBrokenMachines();
        sendJson(res, 200, machines);
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
    if (method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const machines = Array.isArray(body) ? body : (body.machines || []);
        saveDbBrokenMachines(machines);
        sendJson(res, 200, { success: true });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
  }

  // 7. Quản lý Nội quy phòng máy & Tiêu chí cộng/trừ điểm (GET / POST)
  if (pathname === '/api/rules') {
    if (method === 'GET') {
      try {
        const rules = getDbRules();
        sendJson(res, 200, rules);
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
    if (method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const rules = Array.isArray(body) ? body : (body.rules || []);
        saveDbRules(rules);
        sendJson(res, 200, { success: true });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }
  }

  // 8. Xuất file kịch bản SQL dạng văn bản (.sql script)
  if (pathname === '/api/sql/export-script' && method === 'GET') {
    try {
      const sqlDump = generateSqlScriptDump();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="edumaster_dump_${new Date().toISOString().slice(0, 10)}.sql"`);
      res.end(sqlDump);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 8. Tải trực tiếp file cơ sở dữ liệu SQLite binary (.sqlite)
  if (pathname === '/api/sql/download-db' && method === 'GET') {
    try {
      if (!fs.existsSync(DB_PATH)) {
        sendJson(res, 404, { error: 'File edumaster.sqlite chưa được khởi tạo' });
        return true;
      }
      const stat = fs.statSync(DB_PATH);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', 'attachment; filename="edumaster.sqlite"');
      fs.createReadStream(DB_PATH).pipe(res);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 9. Thực thi kịch bản SQL từ client
  if (pathname === '/api/sql/import-script' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const sql = typeof body === 'string' ? body : body.sql;
      if (!sql) {
        sendJson(res, 400, { error: 'Thiếu nội dung SQL' });
        return true;
      }
      executeSqlDump(sql);
      sendJson(res, 200, { success: true, message: 'Đã thực thi thành công kịch bản SQL' });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10. CLASSROOM SESSIONS API
  // 10.1 GET /api/sessions (Danh sách)
  if (pathname === '/api/sessions' && method === 'GET') {
    try {
      const classId = url.searchParams.get('classId') || null;
      const sessions = getAllSessions(classId);
      sendJson(res, 200, sessions);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.2 POST /api/sessions (Tạo mới)
  if (pathname === '/api/sessions' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const created = createSession(body);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.3 GET /api/sessions/:id (Chi tiết)
  if (pathname.match(/^\/api\/sessions\/[^/]+$/) && method === 'GET') {
    const sessionId = pathname.replace('/api/sessions/', '');
    try {
      const session = getSessionById(sessionId);
      if (!session) {
        sendJson(res, 404, { error: 'Không tìm thấy session' });
        return true;
      }
      sendJson(res, 200, session);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.4 PUT /api/sessions/:id (Cập nhật session)
  if (pathname.match(/^\/api\/sessions\/[^/]+$/) && method === 'PUT') {
    const sessionId = pathname.replace('/api/sessions/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateSession(sessionId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.5 DELETE /api/sessions/:id (Xóa session)
  if (pathname.match(/^\/api\/sessions\/[^/]+$/) && method === 'DELETE') {
    const sessionId = pathname.replace('/api/sessions/', '');
    try {
      deleteSession(sessionId);
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.6 PUT /api/sessions/:id/activities (Cập nhật toàn bộ activities)
  if (pathname.match(/^\/api\/sessions\/[^/]+\/activities$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const sessionId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const activities = Array.isArray(body) ? body : (body.activities || []);
      const saved = saveSessionActivities(sessionId, activities);
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.7 POST /api/sessions/:id/events (Ghi nhận event)
  if (pathname.match(/^\/api\/sessions\/[^/]+\/events$/) && method === 'POST') {
    const parts = pathname.split('/');
    const sessionId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const result = addSessionEvent(sessionId, body);
      sendJson(res, 201, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 10.8 POST /api/sessions/:id/participation (Ghi nhận học sinh tham gia / cộng sao)
  if (pathname.match(/^\/api\/sessions\/[^/]+\/participation$/) && method === 'POST') {
    const parts = pathname.split('/');
    const sessionId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const result = addStudentParticipation(sessionId, body);
      sendJson(res, 201, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // ========================================================
  // 11. MODULE BÀI HỌC (LESSONS & PRESENTATION)
  // ========================================================

  // 11.1 GET /api/lessons (Danh sách bài học kèm bộ lọc)
  if (pathname === '/api/lessons' && method === 'GET') {
    try {
      const grade = url.searchParams.get('grade');
      const topic = url.searchParams.get('topic');
      const search = url.searchParams.get('search');
      const lessons = getAllLessons({ grade, topic, search });
      sendJson(res, 200, lessons);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2 POST /api/lessons (Tạo bài học mới)
  if (pathname === '/api/lessons' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const created = createLesson(body);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2.1 POST /api/lessons/upload-pptx-preview (Upload file PowerPoint và trích xuất slide xem trước)
  if (pathname === '/api/lessons/upload-pptx-preview' && method === 'POST') {
    try {
      const rawBuffer = await parseRequestBodyBuffer(req);
      const contentType = req.headers['content-type'] || '';
      let fileName = 'bai_giang.pptx';
      let fileBuffer = null;

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          sendJson(res, 400, { error: 'Thiếu boundary trong multipart request' });
          return true;
        }
        const parsed = parseMultipart(rawBuffer, boundaryMatch[1].trim());
        fileName = parsed.fileName;
        fileBuffer = parsed.fileBuffer;
      } else if (contentType.includes('application/json')) {
        const json = JSON.parse(rawBuffer.toString('utf-8'));
        fileName = json.fileName || 'bai_giang.pptx';
        fileBuffer = json.fileBase64 ? Buffer.from(json.fileBase64, 'base64') : null;
      } else {
        // Hỗ trợ binary stream trực tiếp kèm header X-File-Name
        const headerFileName = req.headers['x-file-name'];
        if (headerFileName) {
          try {
            fileName = decodeURIComponent(headerFileName);
          } catch {
            fileName = headerFileName;
          }
        }
        fileBuffer = rawBuffer;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        sendJson(res, 400, { error: 'Không tìm thấy dữ liệu file PowerPoint.' });
        return true;
      }

      const previewData = await processPptxUploadPreview({ originalName: fileName, buffer: fileBuffer });
      sendJson(res, 200, { success: true, ...previewData });
    } catch (err) {
      console.error('Lỗi render PPTX preview:', err);
      sendJson(res, 500, { error: err.message || 'Không thể xử lý file PowerPoint.' });
    }
    return true;
  }

  // 11.2.2 POST /api/lessons/confirm-import-pptx (Lưu bài học PowerPoint chính thức vào database)
  if (pathname === '/api/lessons/confirm-import-pptx' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { tempId, title, grade, topic, durationMinutes, description, originalFileName } = body;

      if (!tempId) {
        sendJson(res, 400, { error: 'Mã phiên import tạm thời không hợp lệ.' });
        return true;
      }

      const lessonId = `les_pptx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const commitResult = await commitImportedPptx(tempId, lessonId);

      const slides = commitResult.slides.map((s, idx) => ({
        id: `slide_${lessonId}_${idx + 1}`,
        lesson_id: lessonId,
        order_index: idx,
        type: 'IMPORTED_SLIDE',
        title: s.title,
        layout: 'FULL_IMAGE',
        image_url: s.imageUrl,
        content: '',
        teacher_notes: ''
      }));

      const created = createLesson({
        id: lessonId,
        title: title || 'Bài giảng PowerPoint',
        grade: Number(grade) || 3,
        subject: 'Tin Học',
        topic: topic || 'Chung',
        duration_minutes: Number(durationMinutes) || 35,
        objectives: description || '',
        keywords: `PowerPoint, ${topic || ''}`,
        type: 'imported',
        source_file_name: originalFileName || '',
        source_file_path: commitResult.sourceFilePath,
        thumbnail_url: commitResult.thumbnailUrl,
        slide_count: commitResult.slideCount,
        slides
      });

      sendJson(res, 201, { success: true, lesson: created });
    } catch (err) {
      console.error('Lỗi xác nhận import PPTX:', err);
      sendJson(res, 500, { error: err.message || 'Không thể lưu bài học PowerPoint vào thư viện.' });
    }
    return true;
  }

  // 11.2.3 POST /api/lessons/cancel-import-pptx (Hủy bỏ phiên import tạm thời)
  if (pathname === '/api/lessons/cancel-import-pptx' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (body.tempId) {
        cancelImportSession(body.tempId);
      }
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2.4 POST /api/lessons/import-fast (Import nhanh PPTX < 30ms, trích xuất metadata và render nền)
  if (pathname === '/api/lessons/import-fast' && method === 'POST') {
    try {
      const rawBuffer = await parseRequestBodyBuffer(req);
      const contentType = req.headers['content-type'] || '';
      let fileName = 'bai_giang.pptx';
      let fileBuffer = null;
      let fields = {};

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          sendJson(res, 400, { error: 'Thiếu boundary trong multipart request' });
          return true;
        }
        const parsed = parseMultipart(rawBuffer, boundaryMatch[1].trim());
        fileName = parsed.fileName;
        fileBuffer = parsed.fileBuffer;
        fields = parsed.fields || {};
      } else if (contentType.includes('application/json')) {
        const json = JSON.parse(rawBuffer.toString('utf-8'));
        fileName = json.fileName || 'bai_giang.pptx';
        fileBuffer = json.fileBase64 ? Buffer.from(json.fileBase64, 'base64') : null;
        fields = json;
      } else {
        const headerFileName = req.headers['x-file-name'];
        if (headerFileName) {
          try {
            fileName = decodeURIComponent(headerFileName);
          } catch {
            fileName = headerFileName;
          }
        }
        fileBuffer = rawBuffer;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        sendJson(res, 400, { error: 'Không tìm thấy dữ liệu file PowerPoint.' });
        return true;
      }

      const result = await fastImportPptx({
        originalName: fileName,
        buffer: fileBuffer,
        lessonData: {
          title: fields.title,
          grade: fields.grade ? Number(fields.grade) : undefined,
          subject: fields.subject,
          topic: fields.topic,
          durationMinutes: fields.durationMinutes ? Number(fields.durationMinutes) : undefined,
          description: fields.description
        }
      });

      sendJson(res, 201, result);
    } catch (err) {
      console.error('Lỗi fastImportPptx:', err);
      sendJson(res, 500, { error: err.message || 'Không thể import nhanh file PowerPoint.' });
    }
    return true;
  }

  // 11.2.5 GET /api/lessons/:id/render-status (Kiểm tra trạng thái render slide nền)
  if (pathname.match(/^\/api\/lessons\/[^/]+\/render-status$/) && method === 'GET') {
    const parts = pathname.split('/');
    const lessonId = parts[3];
    try {
      const lesson = getLessonById(lessonId);
      if (!lesson) {
        sendJson(res, 404, { error: 'Không tìm thấy bài học' });
        return true;
      }
      sendJson(res, 200, {
        id: lesson.id,
        title: lesson.title,
        render_status: lesson.render_status || 'ready',
        slide_count: lesson.slide_count || (lesson.slides ? lesson.slides.length : 0),
        thumbnail_url: lesson.thumbnail_url || '',
        slides: lesson.slides || []
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.3 GET /api/lessons/:id (Chi tiết bài học + slides)
  if (pathname.match(/^\/api\/lessons\/[^/]+$/) && method === 'GET') {
    const lessonId = pathname.replace('/api/lessons/', '');
    try {
      const lesson = getLessonById(lessonId);
      if (!lesson) {
        sendJson(res, 404, { error: 'Không tìm thấy bài học' });
        return true;
      }
      sendJson(res, 200, lesson);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.4 PUT /api/lessons/:id (Cập nhật bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+$/) && method === 'PUT') {
    const lessonId = pathname.replace('/api/lessons/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateLesson(lessonId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.5 DELETE /api/lessons/:id (Xóa bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+$/) && method === 'DELETE') {
    const lessonId = pathname.replace('/api/lessons/', '');
    try {
      deleteLesson(lessonId);
      deleteLessonPresentationsDir(lessonId);
      sendJson(res, 200, { success: true, id: lessonId });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.6 POST /api/lessons/:id/duplicate (Nhân bản bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+\/duplicate$/) && method === 'POST') {
    const parts = pathname.split('/');
    const lessonId = parts[3];
    try {
      const duplicated = duplicateLesson(lessonId);
      sendJson(res, 201, duplicated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.7 PUT /api/lessons/:id/slides (Cập nhật toàn bộ slides của bài học)
  if (pathname.match(/^\/api\/lessons\/[^/]+\/slides$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const lessonId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const slides = Array.isArray(body) ? body : (body.slides || []);
      const saved = saveLessonSlides(lessonId, slides);
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // ====================================================
  // 12. PHÂN HỆ NGÂN HÀNG CÂU HỎI (QUESTION BANK)
  // ====================================================

  // 12.1 GET /api/questions (Danh sách câu hỏi kèm lọc)
  if (pathname === '/api/questions' && method === 'GET') {
    try {
      const grade = url.searchParams.get('grade');
      const topic = url.searchParams.get('topic');
      const difficulty = url.searchParams.get('difficulty');
      const type = url.searchParams.get('type');
      const lesson_id = url.searchParams.get('lesson_id') || url.searchParams.get('lessonId');
      const search = url.searchParams.get('search');

      const questions = getAllQuestions({
        grade,
        topic,
        difficulty,
        type,
        lesson_id,
        search
      });
      sendJson(res, 200, questions);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.2 POST /api/questions (Tạo mới câu hỏi)
  if (pathname === '/api/questions' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const created = createQuestion(body);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.3 GET /api/questions/:id (Chi tiết câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+$/) && method === 'GET') {
    const qId = pathname.replace('/api/questions/', '');
    try {
      const q = getQuestionById(qId);
      if (!q) {
        sendJson(res, 404, { error: 'Không tìm thấy câu hỏi' });
        return true;
      }
      sendJson(res, 200, q);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.4 PUT /api/questions/:id (Cập nhật câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+$/) && method === 'PUT') {
    const qId = pathname.replace('/api/questions/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateQuestion(qId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.5 DELETE /api/questions/:id (Xóa câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+$/) && method === 'DELETE') {
    const qId = pathname.replace('/api/questions/', '');
    try {
      deleteQuestion(qId);
      sendJson(res, 200, { success: true, id: qId });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 12.6 POST /api/questions/:id/duplicate (Nhân bản câu hỏi)
  if (pathname.match(/^\/api\/questions\/[^/]+\/duplicate$/) && method === 'POST') {
    const parts = pathname.split('/');
    const qId = parts[3];
    try {
      const duplicated = duplicateQuestion(qId);
      sendJson(res, 201, duplicated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // ====================================================
  // 13. PHÂN HỆ PHIÊN ĐỐ VUI (QUIZ SESSIONS)
  // ====================================================

  // 13.1 POST /api/quiz-sessions (Khởi tạo phiên đố vui)
  if (pathname === '/api/quiz-sessions' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const session = createQuizSession(body);
      sendJson(res, 201, session);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 13.2 GET /api/quiz-sessions/:id (Chi tiết phiên đố vui kèm câu hỏi và kết quả)
  if (pathname.match(/^\/api\/quiz-sessions\/[^/]+$/) && method === 'GET') {
    const sId = pathname.replace('/api/quiz-sessions/', '');
    try {
      const session = getQuizSessionById(sId);
      if (!session) {
        sendJson(res, 404, { error: 'Không tìm thấy phiên đố vui' });
        return true;
      }
      sendJson(res, 200, session);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 13.3 PUT /api/quiz-sessions/:id (Cập nhật trạng thái / tiến độ phiên)
  if (pathname.match(/^\/api\/quiz-sessions\/[^/]+$/) && method === 'PUT') {
    const sId = pathname.replace('/api/quiz-sessions/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateQuizSession(sId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 13.4 POST /api/quiz-sessions/:id/results (Lưu kết quả câu hỏi / tổng kết)
  if (pathname.match(/^\/api\/quiz-sessions\/[^/]+\/results$/) && method === 'POST') {
    const parts = pathname.split('/');
    const sId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const updated = saveQuizResults(sId, body);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // Không phải route API
  return false;
}
