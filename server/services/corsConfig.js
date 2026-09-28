/**
 * corsConfig — cấu hình CORS theo môi trường (Giai đoạn 1 - Part 12)
 *
 * Mục tiêu: chuyển CORS từ hardcode 'Access-Control-Allow-Origin: *'
 * sang đọc từ cấu hình, NHƯNG giữ nguyên hành vi mặc định (WEB mode).
 *
 * Biến môi trường EDUICT_CORS_ORIGIN:
 *   - Không đặt / rỗng / '*'  -> trả '*' (hành vi hiện tại, mặc định)
 *   - Một origin cụ thể       -> chỉ cho origin đó
 *   - Danh sách phân tách ','  -> echo lại Origin của request nếu nằm trong allowlist,
 *                                  ngược lại trả về origin đầu tiên (thắt chặt)
 *
 * Module lá: chỉ đọc process.env, không import module khác (tránh vòng lặp phụ thuộc).
 */

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';

function getConfiguredOrigins() {
  const raw = (process.env.EDUICT_CORS_ORIGIN || '').trim();
  if (!raw || raw === '*') return null; // null => wildcard (mặc định)
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Quyết định giá trị cho Access-Control-Allow-Origin.
 * @param {string|undefined} requestOrigin - header Origin của request
 * @returns {string} origin được phép ('*' theo mặc định)
 */
export function resolveCorsOrigin(requestOrigin) {
  const origins = getConfiguredOrigins();
  if (!origins) return '*';
  if (requestOrigin && origins.includes(requestOrigin)) return requestOrigin;
  return origins[0];
}

/**
 * Gắn toàn bộ header CORS vào response, giữ nguyên Methods/Headers như trước.
 * Khi trả về một origin cụ thể (không phải '*') thì thêm 'Vary: Origin'.
 * @param {import('node:http').ServerResponse} res
 * @param {string|undefined} requestOrigin
 */
export function applyCorsHeaders(res, requestOrigin) {
  const allowOrigin = resolveCorsOrigin(requestOrigin);
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  if (allowOrigin !== '*') {
    res.setHeader('Vary', 'Origin');
  }
}

export default { resolveCorsOrigin, applyCorsHeaders };
