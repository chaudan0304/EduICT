import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db/connection.js';
import { getGeminiConfig, loadEnv } from '../ai/envLoader.js';
import { getAppRoot, getEnvPath, getPresentationsDir } from './pathService.js';

function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }

// Both Host and the actual socket must be local. CORS allowlists cannot grant
// remote clients the ability to replace credentials on a teacher's machine.
export function isLocalToolsRequest(req) {
  const address = req.socket?.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false;
  try {
    const host = new URL(`http://${req.headers.host}`).hostname;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return false;
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return false;
    return true;
  } catch { return false; }
}

export function readAiConfig(localOnly) {
  const { enabled, configured, model } = getGeminiConfig();
  return { enabled, configured, model, localOnly };
}

export function saveAiConfig(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Cấu hình không hợp lệ.');
  if (typeof body.enabled !== 'boolean') fail('Chọn trạng thái bật/tắt Gemini.');
  if (typeof body.model !== 'string' || !/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(body.model)) fail('Tên model Gemini không hợp lệ.');
  if (body.removeKey !== undefined && typeof body.removeKey !== 'boolean') fail('Yêu cầu xóa khóa không hợp lệ.');
  if (body.apiKey !== undefined && (typeof body.apiKey !== 'string' || !/^[a-zA-Z0-9_-]{10,200}$/.test(body.apiKey) && body.apiKey !== '')) fail('Khóa API không hợp lệ. Không nhập khoảng trắng hoặc xuống dòng.');
  if (body.removeKey && body.apiKey) fail('Chọn thay khóa hoặc xóa khóa trong một lượt.');
  const configPath = getEnvPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const original = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const values = { GEMINI_MODEL: body.model, GEMINI_ENABLED: String(body.enabled) };
  if (body.removeKey) values.GEMINI_API_KEY = '';
  else if (body.apiKey) values.GEMINI_API_KEY = body.apiKey;
  const entries = Object.entries(values);
  const names = new Set(entries.map(([name]) => name));
  const kept = original.split(/\r?\n/).filter(line => !names.has(line.trim().split('=')[0].trim()));
  const content = [...kept, ...entries.map(([name, value]) => `${name}=${value}`), ''].join('\n');
  const temporary = `${configPath}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, configPath);
    loadEnv(true);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return readAiConfig(true);
}

export async function checkAiConnection() {
  const { apiKey, model, enabled, configured } = getGeminiConfig();
  if (!enabled) return { ok: false, model, message: 'Gemini đang tắt. Bật và lưu trước khi kiểm tra.' };
  if (!configured) return { ok: false, model, message: 'Chưa có khóa Gemini hợp lệ.' };
  if (!/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(model)) return { ok: false, model, message: 'Tên model không hợp lệ.' };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
      headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403 ? 'Khóa API bị từ chối hoặc thiếu quyền truy cập model.'
        : response.status === 404 ? 'Không tìm thấy model đã chọn.'
          : response.status === 429 ? 'Gemini đang giới hạn lượt truy cập. Hãy thử lại sau.' : 'Gemini chưa phản hồi thành công. Hãy thử lại sau.';
      return { ok: false, model, message };
    }
    const metadata = await response.json();
    const ok = metadata.supportedGenerationMethods?.includes('generateContent') === true;
    return { ok, model, message: ok ? 'Đã truy cập được model bằng khóa đã lưu. Chưa gửi nội dung học sinh hay tạo nội dung; hạn mức tạo nội dung có thể khác.' : 'Model chưa hỗ trợ tạo nội dung bằng API này.' };
  } catch { return { ok: false, model, message: 'Không kết nối được Gemini trong 10 giây. Kiểm tra mạng hoặc proxy.' }; }
}

export function studentReport({ classId, studentId, month }) {
  if (typeof classId !== 'string' || !classId || typeof studentId !== 'string' || !studentId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) fail('Chọn lớp, học sinh và tháng hợp lệ.');
  const db = getDatabase();
  const classroom = db.prepare('SELECT name, school_year FROM classes WHERE id = ?').get(classId);
  const student = db.prepare(`SELECT id, name, stars, skill_mouse, skill_keyboard, skill_paint,
    eval_hk1, eval_hk2, score_hk1, score_ck, note FROM students WHERE class_id = ? AND id = ?`).get(classId, studentId);
  if (!classroom || !student) fail('Không tìm thấy học sinh trong lớp này.', 404);
  // CURRENT_TIMESTAMP is UTC. Convert to the Vietnamese teaching day before
  // selecting a calendar month; ISO strings from imports are supported too.
  const history = db.prepare(`SELECT datetime(created_at, '+7 hours') AS date, amount, reason, source
    FROM star_transactions WHERE class_id = ? AND student_id = ?
    AND strftime('%Y-%m', created_at, '+7 hours') = ? ORDER BY created_at DESC, rowid DESC`).all(classId, studentId, month);
  const monthly = { awarded: 0, deducted: 0, net: 0, transactionCount: history.length };
  for (const record of history) {
    if (record.amount > 0) monthly.awarded += record.amount;
    else monthly.deducted -= record.amount;
    monthly.net += record.amount;
  }
  return { month, className: classroom.name, schoolYear: classroom.school_year, student, monthly, history,
    notice: 'Sao tháng lấy từ nhật ký đã lưu (giờ Việt Nam), bao gồm điều chỉnh và hoàn tác. Tổng sao, kỹ năng, điểm và nhận xét là trạng thái hiện tại; dữ liệu cũ chưa có nhật ký không được tính thành tiến bộ tháng.' };
}

function slideCheck(lessonId) {
  if (!lessonId) return { id: 'slide', label: 'Bài trình chiếu', state: 'unknown', message: 'Chọn bài để kiểm tra nguồn slide.' };
  const db = getDatabase();
  const lesson = db.prepare('SELECT id, type, online_embed_url, source_file_path, render_status FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return { id: 'slide', label: 'Bài trình chiếu', state: 'error', message: 'Bài đã bị xóa hoặc không còn trong thư viện.' };
  if (lesson.type === 'powerpoint_online') {
    let valid = false;
    try { const url = new URL(lesson.online_embed_url); valid = url.protocol === 'https:' && /(^|\.)(live\.com|1drv\.ms|office\.com|officeapps\.live\.com)$/.test(url.hostname); } catch { /* no link */ }
    return { id: 'slide', label: 'PowerPoint Online', state: valid ? 'warning' : 'error', message: valid ? 'Đã lưu liên kết Microsoft. Hãy mở thử bài để kiểm tra quyền chia sẻ, tải slide và hiệu ứng; hệ thống chưa xác minh nội dung iframe.' : 'Liên kết PowerPoint Online chưa hợp lệ.' };
  }
  if (lesson.type === 'linked_powerpoint') {
    const exists = lesson.source_file_path && fs.existsSync(lesson.source_file_path);
    return { id: 'slide', label: 'PowerPoint trên máy', state: exists ? 'warning' : 'error', message: exists ? 'File còn tồn tại. Hãy mở trình chiếu để xác nhận PowerPoint và khả năng đặt trong khung EduICT.' : 'Không tìm thấy file PowerPoint đã liên kết trên máy này.' };
  }
  const slides = db.prepare('SELECT image_url, render_status FROM lesson_slides WHERE lesson_id = ?').all(lessonId);
  const broken = slides.some(slide => slide.render_status === 'failed' || slide.render_status === 'error'
    || slide.image_url?.startsWith('/uploads/presentations/') && !fs.existsSync(path.join(getPresentationsDir(), slide.image_url.slice('/uploads/presentations/'.length))));
  return { id: 'slide', label: 'Bài trình chiếu', state: !slides.length || broken ? 'error' : 'ready', message: !slides.length ? 'Bài chưa có slide.' : broken ? 'Có slide chưa kết xuất hoặc thiếu ảnh trên máy.' : `Có ${slides.length} slide đã lưu. Hiệu ứng gốc chỉ phát bằng PowerPoint phù hợp.` };
}

export async function preflight(lessonId) {
  const checks = [];
  try { getDatabase().prepare('SELECT 1').get(); checks.push({ id: 'database', label: 'Dữ liệu lớp học', state: 'ready', message: 'Backend kết nối được SQLite.' }); }
  catch { checks.push({ id: 'database', label: 'Dữ liệu lớp học', state: 'error', message: 'Không truy cập được dữ liệu lớp.' }); }
  try {
    const response = await fetch('https://www.microsoft.com/', { method: 'HEAD', signal: AbortSignal.timeout(5000), redirect: 'manual' });
    checks.push({ id: 'internet', label: 'Kết nối Internet', state: response.ok || response.status >= 300 && response.status < 400 ? 'ready' : 'warning', message: response.ok || response.status >= 300 && response.status < 400 ? 'Máy chủ truy cập được Microsoft. Quyền mở từng bài OneDrive cần kiểm tra riêng.' : 'Microsoft chưa phản hồi thành công; kiểm tra lại trước khi dùng slide online.' });
  } catch { checks.push({ id: 'internet', label: 'Kết nối Internet', state: 'warning', message: 'Không xác nhận được kết nối Microsoft trong 5 giây. Slide cục bộ vẫn có thể dùng.' }); }
  try { checks.push(slideCheck(lessonId)); } catch { checks.push({ id: 'slide', label: 'Bài trình chiếu', state: 'error', message: 'Không đọc được nguồn slide.' }); }
  const ai = readAiConfig(false);
  checks.push({ id: 'ai', label: 'Trợ giảng Gemini', state: ai.enabled && ai.configured ? 'warning' : 'unknown', message: ai.enabled && ai.configured ? 'Đã bật và lưu khóa. Dùng Kiểm tra kết nối trong Cấu hình Gemini để kiểm tra quyền model.' : 'AI chưa bật hoặc chưa có khóa. Các công cụ dạy học khác vẫn dùng được.' });
  return { checkedAt: new Date().toISOString(), checks };
}

export function currentVersion() {
  const { version } = JSON.parse(fs.readFileSync(path.join(getAppRoot(), 'package.json'), 'utf8'));
  return { currentVersion: version, runtime: process.env.EDUICT_RUNTIME === 'desktop' ? 'desktop' : 'web', updateAvailable: false, checked: false };
}

let versionCache = null;
let versionRequest = null;
export async function checkVersion() {
  const base = currentVersion();
  if (versionCache && Date.now() - versionCache.time < 60000) return { ...base, ...versionCache.result };
  if (versionRequest) return versionRequest;
  versionRequest = (async () => {
    let result = { latestVersion: null, releaseUrl: null, updateAvailable: false, checked: false, message: '' };
    try {
      const response = await fetch('https://api.github.com/repos/chaudan0304/EduICT/releases/latest', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'EduICT-Update-Check', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(8000), redirect: 'error',
      });
      if (response.status === 404) result.message = 'Chưa có bản phát hành công khai trên GitHub hoặc kho đang riêng tư. Bạn đang dùng phiên bản hiển thị ở trên.';
      else if (!response.ok) result.message = 'GitHub chưa cho phép kiểm tra phiên bản. Hãy thử lại sau.';
      else {
        const release = await response.json();
        const latest = /^v?(\d+\.\d+\.\d+)$/.exec(release.tag_name || '')?.[1];
        const installer = release.assets?.some(asset => typeof asset.name === 'string' && /^EduMaster-Setup-.*\.exe$/i.test(asset.name) && asset.state === 'uploaded');
        if (!latest || release.draft || release.prerelease || !installer) result.message = 'Bản phát hành mới nhất chưa có bộ cài EduMaster chính thức phù hợp.';
        else {
          const a = latest.split('.').map(Number); const b = base.currentVersion.split('.').map(Number);
          const first = a.findIndex((value, index) => value !== b[index]);
          result = { ...result, latestVersion: latest, checked: true, updateAvailable: first !== -1 && a[first] > b[first],
            releaseUrl: `https://github.com/chaudan0304/EduICT/releases/tag/${encodeURIComponent(release.tag_name)}`,
            message: first !== -1 && a[first] > b[first] ? 'Có bộ cài mới trên GitHub. Sao lưu dữ liệu trước khi cài.' : 'Bạn đang dùng phiên bản hiện tại hoặc mới hơn bản công khai.' };
        }
      }
    } catch { result.message = 'Không kết nối được GitHub trong 8 giây. Chưa thể kết luận về phiên bản mới.'; }
    versionCache = { time: Date.now(), result };
    return { ...base, ...result };
  })();
  try { return await versionRequest; } finally { versionRequest = null; }
}
