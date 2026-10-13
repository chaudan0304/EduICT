import { sendJson, parseJsonBody } from './helpers.js';
import { getMachineFaults, getMachineFaultHistory, saveMachineFault } from '../services/machineFaults.js';

export async function tryHandleMachineFaults(req, res, { pathname, method, url }) {
  if (!pathname.startsWith('/api/machines/')) return false;
  try {
    if (pathname === '/api/machines/faults' && method === 'GET') return sendJson(res, 200, getMachineFaults());
    const match = pathname.match(/^\/api\/machines\/(\d+)\/(fault|history)$/);
    if (match?.[2] === 'history' && method === 'GET') return sendJson(res, 200, getMachineFaultHistory(Number(match[1]), Number(url.searchParams.get('before') || 0)));
    if (match?.[2] === 'fault' && method === 'PUT') return sendJson(res, 200, saveMachineFault(Number(match[1]), await parseJsonBody(req, { maxBytes: 8192 })));
    return sendJson(res, 404, { error: 'Không tìm thấy thao tác quản lý máy.' });
  } catch (error) { return sendJson(res, error.statusCode || 500, { error: error.message }); }
}
