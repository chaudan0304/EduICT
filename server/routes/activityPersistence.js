import { parseJsonBody, sendJson } from './helpers.js';
import { readActivities, saveActivities, saveActivityPicture } from '../services/activityPersistence.js';
import { isLocalToolsRequest } from '../services/classroomTools.js';

export async function tryHandleActivityPersistence(req, res, { pathname, method, url }) {
  if (!pathname.startsWith('/api/classroom-activities/')) return false;
  res.setHeader('Cache-Control', 'no-store');
  if (!isLocalToolsRequest(req)) return sendJson(res, 403, { error: 'Đồng bộ trò chơi chỉ dùng trên máy này qua localhost.' });
  try {
    if (pathname === '/api/classroom-activities/state' && method === 'GET') return sendJson(res, 200, readActivities(url.searchParams.get('classId')));
    if (method === 'POST' && ['/api/classroom-activities/state', '/api/classroom-activities/picture'].includes(pathname)) {
      if (!req.headers['content-type']?.startsWith('application/json')) return sendJson(res, 415, { error: 'Cần gửi dữ liệu JSON.' });
      const picture = pathname.endsWith('/picture');
      const body = await parseJsonBody(req, { maxBytes: picture ? 4.3 * 1024 * 1024 : 1.1 * 1024 * 1024 });
      const result = picture ? saveActivityPicture(body) : saveActivities(body);
      return result.conflict ? sendJson(res, 409, { error: 'Dữ liệu đã đổi ở cửa sổ khác. Nạp lại dữ liệu chung trước khi tiếp tục.', current: result.current }) : sendJson(res, 200, result);
    }
    return sendJson(res, 404, { error: 'Không tìm thấy chức năng đồng bộ này.' });
  } catch (error) {
    return sendJson(res, error instanceof SyntaxError ? 400 : error.statusCode || 500, { error: error.statusCode ? error.message : error instanceof SyntaxError ? 'Dữ liệu JSON không hợp lệ.' : 'Chưa lưu được trò chơi. Hãy thử lại.' });
  }
}
