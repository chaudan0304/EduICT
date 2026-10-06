import { sendJson, parseJsonBody } from './helpers.js';
import { oneDriveRequestContext, getOneDriveClientId, requireOneDrive, startOneDriveSignIn, pollOneDriveSignIn, disconnectOneDrive } from '../services/oneDriveAuth.js';
import { listOneDriveFolder, startOneDriveImport, publicOneDriveJob } from '../services/oneDriveFiles.js';
import { oneDriveError } from '../services/oneDriveHttp.js';

export async function tryHandleOneDrive(req, res, { pathname, method, url }) {
  const prefix = '/api/onedrive/';
  if (!pathname.startsWith(prefix)) return false;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const ctx = oneDriveRequestContext(req);
    let result;
    if (pathname === prefix + 'status' && method === 'GET') {
      result = { connected: Boolean(ctx.session?.token), clientId: getOneDriveClientId(), driveName: ctx.session?.driveName || '', job: ctx.session?.job?.state === 'running' ? publicOneDriveJob(ctx.session.job) : null };
    } else if (pathname === prefix + 'connect' && method === 'POST') {
      const body = await parseJsonBody(req);
      result = await startOneDriveSignIn(ctx, res, body?.clientId);
    } else if (pathname === prefix + 'poll' && method === 'POST') {
      await parseJsonBody(req);
      result = await pollOneDriveSignIn(ctx);
    } else if (pathname === prefix + 'disconnect' && method === 'POST') {
      await parseJsonBody(req);
      disconnectOneDrive(ctx, res); result = { connected: false };
    } else if (pathname === prefix + 'folder' && method === 'GET') {
      result = await listOneDriveFolder(requireOneDrive(ctx), url.searchParams.get('id') || '');
    } else if (pathname === prefix + 'imports' && method === 'POST') {
      const body = await parseJsonBody(req);
      result = startOneDriveImport(requireOneDrive(ctx), body);
    } else if (pathname.startsWith(prefix + 'imports/') && ['GET', 'POST'].includes(method)) {
      const id = pathname.slice((prefix + 'imports/').length);
      const session = requireOneDrive(ctx);
      if (!session.job || session.job.id !== id) throw oneDriveError('Không tìm thấy đợt nhập trong phiên này.', 404);
      if (method === 'POST') { await parseJsonBody(req); session.job.cancelled = true; session.job.controller.abort(); }
      result = publicOneDriveJob(session.job);
    } else { sendJson(res, 404, { error: 'Không tìm thấy chức năng OneDrive.' }); return true; }
    sendJson(res, 200, result);
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : (err.statusCode || 500);
    sendJson(res, status, { error: status === 500 ? 'Không thể xử lý OneDrive. Hãy thử lại.' : (err instanceof SyntaxError ? 'Dữ liệu JSON không hợp lệ.' : err.message) });
  }
  return true;
}
