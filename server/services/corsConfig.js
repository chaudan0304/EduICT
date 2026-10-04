/**
 * corsConfig — cấu hình CORS theo môi trường (Giai đoạn 1 - Part 12)
 *
 * Mặc định không cấp CORS cho origin khác: giao diện web/dev/desktop gọi API
 * cùng origin nên không cần wildcard. Có thể cấu hình allowlist khi cần.
 *
 * Biến môi trường EDUICT_CORS_ORIGIN:
 *   - Không đặt / rỗng         -> không bật CORS cho origin khác
 *   - Một origin cụ thể       -> chỉ cho origin đó
 *   - Danh sách phân tách ','  -> chỉ echo lại Origin nếu nằm trong allowlist
 *
 * Module lá: chỉ đọc process.env, không import module khác (tránh vòng lặp phụ thuộc).
 */

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';

function getConfiguredOrigins() {
  const raw = (process.env.EDUICT_CORS_ORIGIN || '').trim();
  if (!raw || raw === '*') return [];
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
  if (requestOrigin && origins.includes(requestOrigin)) return requestOrigin;
  return null;
}

export function isOriginAllowed(requestOrigin, requestHost) {
  if (!requestOrigin) return true;
  if (resolveCorsOrigin(requestOrigin)) return true;
  try {
    return new URL(requestOrigin).origin === `http://${requestHost}`;
  } catch {
    return false;
  }
}

/**
 * Gắn toàn bộ header CORS vào response, giữ nguyên Methods/Headers như trước.
 * Khi trả về một origin cụ thể (không phải '*') thì thêm 'Vary: Origin'.
 * @param {import('node:http').ServerResponse} res
 * @param {string|undefined} requestOrigin
 */
export function applyCorsHeaders(res, requestOrigin) {
  const allowOrigin = resolveCorsOrigin(requestOrigin);
  if (allowOrigin) res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.setHeader('Vary', 'Origin');
}

export default { resolveCorsOrigin, isOriginAllowed, applyCorsHeaders };
