// Fixed Microsoft endpoints only. Never forward tokens to file/download URLs.
import { setTimeout as delay } from 'node:timers/promises';
export function oneDriveError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export async function microsoftJson(url, options = {}) {
  let response;
  try { response = await fetch(url, { ...options, redirect: 'error', signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }); }
  catch { throw oneDriveError('Không thể kết nối Microsoft. Kiểm tra mạng rồi thử lại.', 502); }
  let bytes = 0;
  const chunks = [];
  if (response.body) {
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 2 * 1024 * 1024) {
        await response.body.cancel().catch(() => {});
        throw oneDriveError('Phản hồi Microsoft quá lớn. Hãy chọn thư mục nhỏ hơn.', 502);
      }
      chunks.push(Buffer.from(chunk));
    }
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw oneDriveError('Microsoft trả về dữ liệu không hợp lệ.', 502); }
  return { response, data };
}

export async function graphJson(session, route, options = {}) {
  if (!session.token || Date.now() >= session.expiresAt) throw oneDriveError('Phiên OneDrive đã hết hạn. Hãy kết nối lại.', 401);
  const url = new URL(route, 'https://graph.microsoft.com/v1.0/');
  if (url.origin !== 'https://graph.microsoft.com' || !/^\/v1\.0\/me\/drive(?:\/|$)/.test(url.pathname) || url.username || url.password || url.port) throw oneDriveError('Đường dẫn Microsoft Graph không hợp lệ.', 502);
  let response;
  let data;
  for (let attempt = 0; attempt < 3; attempt++) {
    ({ response, data } = await microsoftJson(url.href, {
      ...options, headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
    }));
    const retryAfter = Number(response.headers.get('retry-after'));
    if (response.status !== 429 || attempt === 2 || !Number.isFinite(retryAfter) || retryAfter > 30) break;
    await delay(Math.max(1, retryAfter) * 1000, undefined, { signal: options.signal });
  }
  if (!response.ok) {
    const messages = {
      401: 'Phiên OneDrive đã hết hạn. Hãy kết nối lại.',
      403: 'Microsoft từ chối quyền truy cập. Kiểm tra quyền Files.ReadWrite và tài khoản sở hữu file.',
      404: 'File hoặc thư mục không còn trên OneDrive. Hãy tải lại danh sách.',
      429: 'Microsoft đang giới hạn yêu cầu. Chờ một lúc rồi thử lại các file chưa nhập.',
    };
    throw oneDriveError(messages[response.status] || 'Microsoft không xử lý được yêu cầu. Hãy thử lại.', response.status === 429 ? 429 : (response.status === 401 ? 401 : 502));
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw oneDriveError('Dữ liệu OneDrive không hợp lệ.', 502);
  return data;
}
