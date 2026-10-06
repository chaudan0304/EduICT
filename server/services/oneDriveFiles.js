import crypto from 'node:crypto';
import { graphJson, oneDriveError } from './oneDriveHttp.js';
import { normalizePowerPointEmbed } from '../../shared/powerPointOnline.js';
import { getDatabase } from '../db/connection.js';
import { savePowerPointOnlineBatch } from './powerPointOnlineBatch.js';

const select = 'id,name,file,folder,size';
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[/\\]/.test(value) && !Array.from(value).some(char => char.charCodeAt(0) <= 32);
const isPowerPoint = item => Boolean(item?.file) && typeof item.name === 'string' && /\.(pptx|ppt|ppsx|pps|pptm|ppsm)$/i.test(item.name);

export async function listOneDriveFolder(session, folderId = '') {
  if (folderId && !validId(folderId)) throw oneDriveError('Thư mục không hợp lệ.');
  const base = folderId ? `me/drive/items/${encodeURIComponent(folderId)}` : 'me/drive/root';
  const parent = await graphJson(session, `${base}?$select=id,name,folder`);
  if (!parent.folder || !validId(parent.id)) throw oneDriveError('Hãy chọn một thư mục OneDrive.');
  let next = `${base}/children?$select=${select}&$top=200`;
  const folders = [];
  const files = [];
  let scanned = 0;
  const seen = new Set();
  while (next && scanned < 5000 && seen.size < 30) {
    if (seen.has(next)) throw oneDriveError('Microsoft trả về trang danh sách bị lặp.', 502);
    seen.add(next);
    const page = await graphJson(session, next);
    if (!Array.isArray(page.value)) throw oneDriveError('Danh sách thư mục Microsoft không hợp lệ.', 502);
    for (const item of page.value) {
      if (++scanned > 5000) break;
      if (!validId(item.id) || typeof item.name !== 'string' || item.name.length > 500) continue;
      if (item.folder) folders.push({ id: item.id, name: item.name });
      else if (isPowerPoint(item)) {
        const file = { id: item.id, name: item.name, title: item.name.replace(/\.(pptx|ppt|ppsx|pps|pptm|ppsm)$/i, '').slice(0, 250), size: Math.max(0, Number(item.size) || 0), newId: session.files.get(item.id)?.newId || crypto.randomUUID() };
        if (session.files.size >= 10000 && !session.files.has(item.id)) throw oneDriveError('Phiên này đã đọc quá nhiều file. Hãy kết nối lại để tiếp tục.', 409);
        session.files.set(item.id, file);
        files.push(file);
      }
    }
    next = typeof page['@odata.nextLink'] === 'string' ? page['@odata.nextLink'] : '';
  }
  const sort = (a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true });
  return { folder: { id: parent.id, name: String(parent.name || 'OneDrive').slice(0, 500) }, driveId: session.driveId, folders: folders.sort(sort), files: files.sort(sort), truncated: Boolean(next) || scanned > 5000 };
}

function validateImport(session, body) {
  if (body?.confirmEmbed !== true) throw oneDriveError('Cần xác nhận tạo liên kết Embed trên OneDrive.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 200) throw oneDriveError('Chọn từ 1 đến 200 file mỗi đợt.');
  const files = new Set();
  const targets = new Set();
  const db = getDatabase();
  return body.items.map((input, index) => {
    const prefix = `Dòng ${index + 1}: `;
    if (!input || typeof input !== 'object' || !validId(input.file_id)) throw oneDriveError(prefix + 'File không hợp lệ.');
    const file = session.files.get(input.file_id);
    if (!file || files.has(file.id)) throw oneDriveError(prefix + 'File chưa được đọc hoặc bị chọn trùng. Hãy tải lại thư mục.');
    files.add(file.id);
    if (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 5 || typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 250) throw oneDriveError(prefix + 'Hãy nhập tên bài và chọn khối từ 1 đến 5.');
    const item = { file, title: input.title.trim(), grade: input.grade, new_id: file.newId };
    if (input.lesson_id !== undefined) {
      if (!validId(input.lesson_id) || typeof input.expected_url !== 'string' || input.expected_url.length > 8192 || typeof input.expected_updated_at !== 'string' || input.expected_updated_at.length > 100) throw oneDriveError(prefix + 'Bài được chọn không hợp lệ.');
      const current = db.prepare('SELECT * FROM lessons WHERE id = ?').get(input.lesson_id);
      if (!current || (current.online_embed_url || '') !== input.expected_url || (current.updated_at || '') !== input.expected_updated_at) throw oneDriveError(prefix + 'Bài đã thay đổi. Hãy tải lại danh sách trước khi nhập.', 409);
      const sameSource = current.onedrive_drive_id === session.driveId && current.onedrive_item_id === file.id;
      if (current.online_embed_url && !sameSource && input.replace_existing !== true) throw oneDriveError(prefix + 'Cần xác nhận thay liên kết của bài đang có.');
      Object.assign(item, { lesson_id: input.lesson_id, expected_url: input.expected_url, expected_updated_at: input.expected_updated_at, replace_existing: sameSource || input.replace_existing === true });
      delete item.new_id;
    }
    const target = item.lesson_id || `online_${item.new_id}`;
    if (targets.has(target)) throw oneDriveError(prefix + 'Một bài chỉ được chọn một lần.');
    targets.add(target);
    return item;
  });
}

async function embedFile(session, item, job) {
  const current = await graphJson(session, `me/drive/items/${encodeURIComponent(item.file.id)}?$select=${select}`, { signal: job.controller.signal });
  if (current.id !== item.file.id || !isPowerPoint(current)) throw oneDriveError('File đã bị đổi loại hoặc không còn là PowerPoint.');
  if (session.links.has(current.id)) return session.links.get(current.id);
  const permission = await graphJson(session, `me/drive/items/${encodeURIComponent(current.id)}/createLink`, {
    method: 'POST', signal: job.controller.signal, body: JSON.stringify({ type: 'embed', scope: 'anonymous', retainInheritedPermissions: true }),
  });
  if (permission.link?.type !== 'embed') throw oneDriveError('Microsoft chưa trả về liên kết Embed cho file.');
  let url;
  try { url = normalizePowerPointEmbed(permission.link.webHtml || permission.link.webUrl); }
  catch { throw oneDriveError('Microsoft trả về dạng Embed chưa được EduICT hỗ trợ. Hãy lấy mã Embed thủ công cho file này.'); }
  session.links.set(current.id, url);
  return url;
}

export function startOneDriveImport(session, body) {
  if (session.job?.state === 'running') throw oneDriveError('Một đợt nhập đang chạy. Hãy chờ hoàn tất.', 409);
  const items = validateImport(session, body);
  const job = { id: crypto.randomUUID(), state: 'running', total: items.length, completed: 0, errors: [], result: null, cancelled: false, controller: new AbortController() };
  session.job = job;
  // A background job keeps the UI responsive for folders with many files.
  void runImport(session, job, items).catch(() => {
    job.state = 'failed'; job.error = 'Không thể hoàn tất đợt nhập. Hãy kiểm tra kết nối và thử lại.';
  });
  return publicOneDriveJob(job);
}

async function runImport(session, job, items) {
  const urls = new Map();
  let cursor = 0;
  async function worker() {
    while (!job.cancelled && cursor < items.length) {
      const item = items[cursor++];
      try { urls.set(item.file.id, await embedFile(session, item, job)); }
      catch (err) { job.errors.push({ fileId: item.file.id, name: item.file.name, error: err.statusCode ? err.message : 'Không thể tạo link cho file.' }); }
      job.completed++;
    }
  }
  await Promise.all([worker(), worker()]);
  if (job.cancelled) { job.state = 'cancelled'; return; }
  if (job.errors.length) { job.state = 'failed'; job.error = 'Có file chưa tạo được link. Chưa nhập bài nào trong đợt này; thử lại hoặc bỏ các file lỗi.'; return; }
  const sourceRefs = new Map();
  const batchItems = items.map(item => {
    const { file, ...metadata } = item;
    sourceRefs.set(item.lesson_id || `online_${item.new_id}`, { driveId: session.driveId, itemId: file.id });
    return { ...metadata, online_embed_url: urls.get(file.id) };
  });
  try { job.result = savePowerPointOnlineBatch({ items: batchItems }, { sourceRefs }); job.state = 'completed'; }
  catch (err) { job.state = 'failed'; job.error = err.statusCode ? err.message : 'Không thể lưu thư viện. Chưa nhập bài nào trong đợt này; thử lại sau.'; }
}

export function publicOneDriveJob(job) {
  return { id: job.id, state: job.state, total: job.total, completed: job.completed, errors: job.errors, error: job.error || '', result: job.result };
}
