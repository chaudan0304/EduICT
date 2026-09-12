import fs from 'node:fs';
import path from 'node:path';
import { 
  getAllClassesWithStudents, 
  saveOrUpdateClass, 
  deleteClassById, 
  saveStudentsForClass, 
  batchImportClassesAndStudents,
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
  saveQuizResults,
  getClassStats
} from './db.js';
import {
  processPptxUploadPreview,
  commitImportedPptx,
  cancelImportSession,
  deleteLessonPresentationsDir,
  fastImportPptx,
  retrySingleSlideRender,
  ensureLessonThumbnail
} from './pptxService.js';
import { checkDuplicateBatch, scanLibraryDuplicates } from './duplicateDetector.js';

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
  const files = [];
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

      let currentFileName = null;
      if (filenameStarMatch) {
        try {
          currentFileName = decodeURIComponent(filenameStarMatch[1]);
        } catch {
          currentFileName = filenameStarMatch[1];
        }
      } else if (filenameMatch) {
        currentFileName = filenameMatch[1].trim();
      }

      if (currentFileName) {
        fileName = currentFileName;
        fileBuffer = partData;
        files.push({ name: currentFileName, buffer: partData });
      } else if (nameMatch) {
        fields[nameMatch[1]] = partData.toString('utf-8');
      }
    }

    start = nextBoundaryIdx;
  }

  return { fileName, fileBuffer, files, fields };
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

  // 3b. Import hàng loạt nhiều lớp từ Excel (POST /api/classes/batch-import)
  if (pathname === '/api/classes/batch-import' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = batchImportClassesAndStudents(body);
      sendJson(res, 200, result);
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
      const similarity_status = url.searchParams.get('similarity_status');
      const lessons = getAllLessons({ grade, topic, search, similarity_status });
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

  // 11.2.3.1 POST /api/lessons/check-duplicates (Kiểm tra trùng lặp siêu tốc cho 1 hoặc nhiều file PPTX)
  if (pathname === '/api/lessons/check-duplicates' && method === 'POST') {
    try {
      const rawBuffer = await parseRequestBodyBuffer(req);
      const contentType = req.headers['content-type'] || '';
      let filesToCheck = [];

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          sendJson(res, 400, { error: 'Thiếu boundary trong multipart request' });
          return true;
        }
        const parsed = parseMultipart(rawBuffer, boundaryMatch[1].trim());
        if (parsed.files && parsed.files.length > 0) {
          filesToCheck = parsed.files;
        } else if (parsed.fileBuffer) {
          filesToCheck = [{ name: parsed.fileName, buffer: parsed.fileBuffer }];
        }
      } else if (contentType.includes('application/json')) {
        const json = JSON.parse(rawBuffer.toString('utf-8'));
        if (Array.isArray(json.files)) {
          filesToCheck = json.files.map(f => ({
            name: f.name || f.fileName || 'bai_giang.pptx',
            buffer: Buffer.from(f.fileBase64 || f.base64 || '', 'base64')
          }));
        } else if (json.fileBase64) {
          filesToCheck = [{
            name: json.fileName || 'bai_giang.pptx',
            buffer: Buffer.from(json.fileBase64, 'base64')
          }];
        }
      } else {
        const headerFileName = req.headers['x-file-name'];
        let name = 'bai_giang.pptx';
        if (headerFileName) {
          try { name = decodeURIComponent(headerFileName); } catch { name = headerFileName; }
        }
        filesToCheck = [{ name, buffer: rawBuffer }];
      }

      if (filesToCheck.length === 0) {
        sendJson(res, 400, { error: 'Không tìm thấy file để kiểm tra trùng lặp.' });
        return true;
      }

      const existingLessons = getAllLessons();
      const results = checkDuplicateBatch({ files: filesToCheck, existingLessons });
      sendJson(res, 200, { success: true, count: results.length, results });
    } catch (err) {
      console.error('Lỗi kiểm tra trùng lặp:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi kiểm tra bài giảng trùng lặp.' });
    }
    return true;
  }

  // 11.2.3.2 GET /api/lessons/scan-duplicates (Quét tự động toàn bộ thư viện bài giảng)
  if (pathname === '/api/lessons/scan-duplicates' && method === 'GET') {
    try {
      const lessons = getAllLessons();
      const classStats = getClassStats();
      const report = scanLibraryDuplicates(lessons, classStats);
      sendJson(res, 200, { success: true, ...report });
    } catch (err) {
      console.error('Lỗi quét trùng lặp thư viện:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi quét trùng lặp thư viện.' });
    }
    return true;
  }

  // 11.2.3.3 POST /api/lessons/resolve-duplicate (Giáo viên xác nhận giữ lại bài)
  if (pathname === '/api/lessons/resolve-duplicate' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { lessonId } = body;
      if (!lessonId) {
        sendJson(res, 400, { error: 'Thiếu lessonId' });
        return true;
      }
      updateLesson(lessonId, {
        similarity_status: 'unique',
        duplicate_of_id: null
      });
      sendJson(res, 200, { success: true, message: 'Đã xác nhận giữ lại bài giảng' });
    } catch (err) {
      console.error('Lỗi resolve duplicate:', err);
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

      const allowDuplicate = fields.allowDuplicate === true || fields.allowDuplicate === 'true' || fields.allow_duplicate === true || fields.allow_duplicate === 'true';

      const result = await fastImportPptx({
        originalName: fileName,
        buffer: fileBuffer,
        lessonData: {
          title: fields.title,
          grade: fields.grade ? Number(fields.grade) : undefined,
          subject: fields.subject,
          topic: fields.topic,
          durationMinutes: fields.durationMinutes ? Number(fields.durationMinutes) : undefined,
          description: fields.description,
          allowDuplicate,
          similarity_status: fields.similarity_status || fields.similarityStatus,
          similarity_score: fields.similarity_score !== undefined ? Number(fields.similarity_score) : (fields.similarityScore !== undefined ? Number(fields.similarityScore) : undefined),
          duplicate_of_id: fields.duplicate_of_id || fields.duplicateOfId
        }
      });

      if (result.isDuplicate && !allowDuplicate) {
        sendJson(res, 409, result);
        return true;
      }

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
        importStatus: lesson.importStatus || lesson.import_status || 'IMPORTED',
        import_status: lesson.import_status || lesson.importStatus || 'IMPORTED',
        renderStatus: lesson.renderStatus || lesson.render_status || 'ready',
        render_status: lesson.render_status || lesson.renderStatus || 'ready',
        renderProgress: lesson.renderProgress !== undefined ? lesson.renderProgress : (lesson.render_progress || 0),
        render_progress: lesson.render_progress !== undefined ? lesson.render_progress : (lesson.renderProgress || 0),
        totalSlides: lesson.totalSlides !== undefined ? lesson.totalSlides : (lesson.total_slides || lesson.slide_count || (lesson.slides ? lesson.slides.length : 0)),
        total_slides: lesson.total_slides !== undefined ? lesson.total_slides : (lesson.totalSlides || lesson.slide_count || (lesson.slides ? lesson.slides.length : 0)),
        renderedSlides: lesson.renderedSlides !== undefined ? lesson.renderedSlides : (lesson.rendered_slides || 0),
        rendered_slides: lesson.rendered_slides !== undefined ? lesson.rendered_slides : (lesson.renderedSlides || 0),
        failedSlides: lesson.failedSlides !== undefined ? lesson.failedSlides : (lesson.failed_slides || 0),
        failed_slides: lesson.failed_slides !== undefined ? lesson.failed_slides : (lesson.failedSlides || 0),
        slide_count: lesson.slide_count || lesson.total_slides || (lesson.slides ? lesson.slides.length : 0),
        thumbnailUrl: lesson.thumbnailUrl || lesson.thumbnail_url || '',
        thumbnail_url: lesson.thumbnail_url || lesson.thumbnailUrl || '',
        slides: (lesson.slides || []).map(s => ({
          ...s,
          slideNumber: s.slideNumber || s.slide_number || (s.order_index !== undefined ? s.order_index + 1 : 1),
          slide_number: s.slide_number || s.slideNumber || (s.order_index !== undefined ? s.order_index + 1 : 1),
          status: s.status || s.render_status || 'ready',
          render_status: s.render_status || s.status || 'ready',
          imageUrl: s.imageUrl || s.image_url || '',
          image_url: s.image_url || s.imageUrl || '',
          attempts: s.attempts !== undefined ? s.attempts : (s.render_attempts || 0),
          renderedAt: s.renderedAt || s.rendered_at || null,
          rendered_at: s.rendered_at || s.renderedAt || null,
          errorCode: s.errorCode || s.error_code || null,
          error_code: s.error_code || s.errorCode || null,
          errorMessage: s.errorMessage || s.error_message || null,
          error_message: s.error_message || s.errorMessage || null
        }))
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 11.2.6 POST /api/lessons/:lessonId/slides/:slideNumber/retry (Chuẩn theo Requirement 13)
  const slideRetryMatch = pathname.match(/^\/api\/lessons\/([^/]+)\/slides\/(\d+)\/retry$/);
  if (slideRetryMatch && method === 'POST') {
    const lessonId = slideRetryMatch[1];
    const slideNumber = Number(slideRetryMatch[2]);
    try {
      const lesson = getLessonById(lessonId);
      if (!lesson) {
        sendJson(res, 404, { error: 'Không tìm thấy bài học' });
        return true;
      }
      const targetSlide = (lesson.slides || []).find(s => (s.slide_number || s.order_index + 1) === slideNumber);
      const slideId = targetSlide ? targetSlide.id : null;
      const result = await retrySingleSlideRender(lessonId, slideId, slideNumber);
      sendJson(res, result.success ? 200 : 422, result);
    } catch (err) {
      console.error(`Lỗi khi retry slide ${slideNumber} của bài ${lessonId}:`, err);
      sendJson(res, 500, { error: err.message || 'Lỗi xử lý kết xuất lại slide' });
    }
    return true;
  }

  // 11.2.7 POST /api/lessons/:id/generate-thumbnail hoặc /retry-thumbnail (Requirement 2)
  const thumbMatch = pathname.match(/^\/api\/lessons\/([^/]+)\/(generate-thumbnail|retry-thumbnail)$/);
  if (thumbMatch && method === 'POST') {
    const lessonId = thumbMatch[1];
    try {
      const result = await ensureLessonThumbnail(lessonId);
      sendJson(res, 200, result);
    } catch (err) {
      console.error(`Lỗi khi tạo thumbnail cho bài ${lessonId}:`, err);
      sendJson(res, 500, { error: err.message || 'Không thể tạo ảnh xem trước' });
    }
    return true;
  }

  // 11.2.8 POST /api/lessons/retry-slide (Thử lại kết xuất hình ảnh cho một slide đơn lẻ - Tương thích ngược)
  if (pathname === '/api/lessons/retry-slide' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { lessonId, slideId, slideNumber } = body;
      if (!lessonId || (!slideId && !slideNumber)) {
        sendJson(res, 400, { error: 'Thiếu lessonId hoặc thông tin slide (slideId/slideNumber)' });
        return true;
      }
      const result = await retrySingleSlideRender(lessonId, slideId, Number(slideNumber));
      sendJson(res, result.success ? 200 : 422, result);
    } catch (err) {
      console.error('Lỗi khi retry slide:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi xử lý kết xuất lại slide' });
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
