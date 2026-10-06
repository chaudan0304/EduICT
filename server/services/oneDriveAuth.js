import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getSettingsDir } from './pathService.js';
import { microsoftJson, graphJson, oneDriveError } from './oneDriveHttp.js';

const authority = 'https://login.microsoftonline.com/consumers/oauth2/v2.0';
const scope = 'https://graph.microsoft.com/Files.ReadWrite';
const sessions = new Map();
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const configPath = () => path.join(getSettingsDir(), 'onedrive.json');

function releaseSession(id) {
  const session = sessions.get(id);
  if (!session) return;
  clearTimeout(session.timer);
  session.token = null; session.deviceCode = null;
  session.files.clear(); session.links.clear();
  if (session.job) { session.job.cancelled = true; session.job.controller.abort(); }
  sessions.delete(id);
}

function scheduleExpiry(id, session) {
  clearTimeout(session.timer);
  session.timer = setTimeout(() => releaseSession(id), Math.max(1, session.expiresAt - Date.now()));
  session.timer.unref();
}

export function oneDriveRequestContext(req) {
  let host;
  try { host = new URL(`http://${req.headers.host}`).hostname; }
  catch { throw oneDriveError('Địa chỉ ứng dụng không hợp lệ.', 403); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(host);
  let origin = `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
  if (!local) {
    let publicOrigin;
    try { publicOrigin = new URL(process.env.EDUICT_ONEDRIVE_PUBLIC_ORIGIN || ''); } catch { /* unavailable */ }
    if (!publicOrigin || publicOrigin.protocol !== 'https:' || publicOrigin.host !== req.headers.host || publicOrigin.username || publicOrigin.password) throw oneDriveError('OneDrive trên web cần HTTPS và cấu hình origin của máy chủ. Desktop và web localhost có thể dùng ngay sau khi nhập client ID.', 503);
    origin = publicOrigin.origin;
  }
  if (req.headers.origin && req.headers.origin !== origin) throw oneDriveError('OneDrive chỉ nhận yêu cầu từ chính trang EduICT.', 403);
  if (req.method !== 'GET' && (req.headers.origin !== origin || !String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json'))) throw oneDriveError('Yêu cầu OneDrive không hợp lệ.', 403);
  const cookieName = `eduict_od_${crypto.createHash('sha256').update(origin).digest('hex').slice(0, 12)}`;
  const id = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  for (const [key, session] of sessions) {
    if (Date.now() >= session.expiresAt) releaseSession(key);
  }
  return { cookieName, origin, secure: origin.startsWith('https:'), id, session: sessions.get(id) || null };
}

function setCookie(res, ctx, id, maxAge) {
  res.setHeader('Set-Cookie', `${ctx.cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/api/onedrive; Max-Age=${maxAge}${ctx.secure ? '; Secure' : ''}`);
}

export function getOneDriveClientId() {
  const configured = String(process.env.EDUICT_ONEDRIVE_CLIENT_ID || '').trim();
  if (uuid.test(configured)) return configured;
  try {
    const saved = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    return uuid.test(saved.clientId || '') ? saved.clientId : '';
  } catch { return ''; }
}

export function disconnectOneDrive(ctx, res) {
  releaseSession(ctx.id);
  setCookie(res, ctx, '', 0);
}

export function requireOneDrive(ctx) {
  if (!ctx.session?.token || !ctx.session.driveId) throw oneDriveError('Hãy hoàn tất kết nối OneDrive trước.', 401);
  return ctx.session;
}

export async function startOneDriveSignIn(ctx, res, clientId) {
  if (ctx.session?.job?.state === 'running') throw oneDriveError('Hãy chờ đợt nhập hiện tại hoàn tất trước khi đổi kết nối.', 409);
  clientId = String(clientId || getOneDriveClientId()).trim();
  if (!uuid.test(clientId)) throw oneDriveError('Hãy nhập Application (client) ID từ Microsoft Entra. Không nhập client secret.');
  if (sessions.size >= 25 && !ctx.session) throw oneDriveError('Có quá nhiều phiên kết nối. Hãy thử lại sau.', 429);
  const { response, data } = await microsoftJson(`${authority}/devicecode`, {
    method: 'POST', body: new URLSearchParams({ client_id: clientId, scope }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!response.ok) throw oneDriveError('Microsoft chưa chấp nhận cấu hình. Kiểm tra client ID, Personal Microsoft accounts và Allow public client flows = Yes.', 400);
  let verification;
  try { verification = new URL(data.verification_uri); } catch { /* invalid */ }
  if (!verification || verification.protocol !== 'https:' || !['microsoft.com', 'www.microsoft.com', 'login.microsoftonline.com'].includes(verification.hostname) || verification.username || verification.password || verification.port || typeof data.user_code !== 'string' || data.user_code.length > 100 || typeof data.device_code !== 'string' || data.device_code.length > 10000 || !Number.isFinite(data.expires_in) || data.expires_in < 60 || data.expires_in > 3600) throw oneDriveError('Phản hồi đăng nhập Microsoft không hợp lệ.', 502);
  if (ctx.id) releaseSession(ctx.id);
  if (sessions.size >= 25) throw oneDriveError('Có quá nhiều phiên kết nối. Hãy thử lại sau.', 429);
  const id = crypto.randomBytes(32).toString('base64url');
  const interval = Math.max(5, Math.min(Number(data.interval) || 5, 60)) * 1000;
  const session = { clientId, deviceCode: data.device_code, interval, nextPollAt: Date.now() + interval, expiresAt: Date.now() + data.expires_in * 1000, token: null, polling: false, files: new Map(), links: new Map(), job: null };
  sessions.set(id, session);
  scheduleExpiry(id, session);
  try {
    fs.mkdirSync(getSettingsDir(), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify({ clientId }, null, 2));
  } catch { releaseSession(id); throw oneDriveError('Không thể lưu client ID vào thư mục cấu hình. Kiểm tra quyền ghi của EduICT.', 500); }
  setCookie(res, ctx, id, 3600);
  return { userCode: data.user_code, verificationUrl: verification.href, expiresAt: session.expiresAt, pollAfterMs: interval };
}

export async function pollOneDriveSignIn(ctx) {
  const session = ctx.session;
  if (!session) throw oneDriveError('Phiên đăng nhập đã hết hạn. Hãy kết nối lại.', 401);
  if (session.token && session.driveId) return { state: 'connected', driveName: session.driveName };
  if (session.polling || Date.now() < session.nextPollAt) return { state: 'pending', pollAfterMs: Math.max(1000, session.nextPollAt - Date.now()) };
  session.polling = true;
  session.nextPollAt = Date.now() + session.interval;
  try {
    const { response, data } = await microsoftJson(`${authority}/token`, {
      method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: session.clientId, device_code: session.deviceCode }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!response.ok) {
      if (data.error === 'authorization_pending' || data.error === 'slow_down') {
        if (data.error === 'slow_down') session.interval += 5000;
        session.nextPollAt = Date.now() + session.interval;
        return { state: 'pending', pollAfterMs: session.interval };
      }
      releaseSession(ctx.id);
      throw oneDriveError(data.error === 'authorization_declined' ? 'Bạn đã từ chối kết nối OneDrive.' : 'Đăng nhập chưa hoàn tất hoặc cấu hình ứng dụng chưa đúng. Kiểm tra public client flow và thử lại.', 401);
    }
    if (typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 100000 || !Number.isFinite(data.expires_in) || data.expires_in < 60 || String(data.token_type).toLowerCase() !== 'bearer' || !String(data.scope || '').split(' ').some(permission => permission.toLowerCase().replace('https://graph.microsoft.com/', '') === 'files.readwrite')) throw oneDriveError('Microsoft chưa cấp quyền Files.ReadWrite hợp lệ.', 502);
    if (sessions.get(ctx.id) !== session) throw oneDriveError('Phiên đăng nhập đã bị hủy hoặc hết hạn. Hãy kết nối lại.', 401);
    session.token = data.access_token;
    session.expiresAt = Date.now() + Math.min(data.expires_in - 30, 3600) * 1000;
    scheduleExpiry(ctx.id, session);
    try {
      const drive = await graphJson(session, 'me/drive?$select=id,name,driveType');
      if (drive.driveType !== 'personal' || typeof drive.id !== 'string' || !drive.id || drive.id.length > 200) throw oneDriveError('Tính năng tạo Embed tự động chỉ hỗ trợ OneDrive cá nhân.', 400);
      session.driveId = drive.id;
      session.driveName = typeof drive.name === 'string' ? drive.name.slice(0, 200) : 'OneDrive';
    } catch (err) { releaseSession(ctx.id); throw err; }
    session.deviceCode = null;
    return { state: 'connected', driveName: session.driveName };
  } finally { session.polling = false; }
}
