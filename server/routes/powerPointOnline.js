import { parseJsonBody, sendJson } from './helpers.js';
import { savePowerPointOnlineBatch } from '../services/powerPointOnlineBatch.js';

export async function tryHandlePowerPointOnline(req, res, { pathname, method }) {
  if (pathname !== '/api/lessons/powerpoint-online/batch' || method !== 'POST') return false;
  try {
    const result = savePowerPointOnlineBatch(await parseJsonBody(req));
    sendJson(res, 200, result);
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : (err.statusCode || 500);
    sendJson(res, status, { error: status === 500 ? 'Không thể lưu danh sách. Chưa có thay đổi nào trong đợt này được lưu.' : (err instanceof SyntaxError ? 'Dữ liệu JSON không hợp lệ.' : err.message) });
  }
  return true;
}
