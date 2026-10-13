import { parseJsonBody, sendJson } from './helpers.js';
import { isLocalToolsRequest, readAiConfig, saveAiConfig, checkAiConnection, studentReport, preflight, currentVersion, checkVersion } from '../services/classroomTools.js';
import { studentReportDocument } from '../services/studentReportDocument.js';

export async function tryHandleClassroomTools(req, res, { pathname, method, url }) {
  if (!pathname.startsWith('/api/classroom-tools/')) return false;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const localOnly = isLocalToolsRequest(req);
    if (pathname === '/api/classroom-tools/ai-config' && method === 'GET') return sendJson(res, 200, readAiConfig(localOnly));
    if (pathname === '/api/classroom-tools/ai-config' && method === 'POST') {
      if (!localOnly) return sendJson(res, 403, { error: 'Chỉ sửa khóa trên máy chạy EduICT bằng localhost. Không cho phép sửa từ thiết bị khác.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return sendJson(res, 415, { error: 'Cần gửi cấu hình dạng JSON.' });
      return sendJson(res, 200, saveAiConfig(await parseJsonBody(req, { maxBytes: 4096 })));
    }
    if (pathname === '/api/classroom-tools/ai-check' && method === 'POST') {
      if (!localOnly) return sendJson(res, 403, { error: 'Kiểm tra khóa Gemini từ máy chạy EduICT bằng localhost.' });
      return sendJson(res, 200, await checkAiConnection());
    }
    if (pathname === '/api/classroom-tools/preflight' && method === 'GET') return sendJson(res, 200, await preflight(url.searchParams.get('lessonId')));
    if (pathname === '/api/classroom-tools/student-report' && method === 'GET') return sendJson(res, 200, studentReport(Object.fromEntries(url.searchParams)));
    if (pathname === '/api/classroom-tools/student-report-print' && method === 'GET') {
      const document = studentReportDocument(studentReport(Object.fromEntries(url.searchParams)));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(document); return true;
    }
    if (pathname === '/api/classroom-tools/version' && method === 'GET') return sendJson(res, 200, currentVersion());
    if (pathname === '/api/classroom-tools/version-check' && method === 'POST') return sendJson(res, 200, await checkVersion());
    return sendJson(res, 404, { error: 'Không tìm thấy chức năng này.' });
  } catch (error) {
    // Credential-bearing exceptions are deliberately never logged or echoed.
    const status = error instanceof SyntaxError ? 400 : error.statusCode || 500;
    return sendJson(res, status, { error: error instanceof SyntaxError ? 'JSON không hợp lệ.' : error.statusCode ? error.message : 'Không hoàn tất được yêu cầu. Hãy thử lại.' });
  }
}
