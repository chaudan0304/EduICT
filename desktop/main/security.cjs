'use strict';
// security — các hàm thuần (không phụ thuộc electron) để chặn: IPC từ nguồn lạ, điều hướng lạ,
// mở URL ngoài nguy hiểm, tùy chọn dialog bất thường. Có test riêng (phase11).

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Chỉ trang EduMaster (origin backend 127.0.0.1:<port>) mới được gọi IPC.
function isTrustedSender(event, backendOrigin) {
  const url = (event && event.senderFrame && event.senderFrame.url) || '';
  const origin = originOf(url);
  return Boolean(origin) && origin === backendOrigin;
}

function isAllowedNavigation(backendOrigin, url) {
  return originOf(url) === backendOrigin;
}

// Chỉ https:// được mở bằng trình duyệt hệ thống (không file:, javascript:, ms-*: ...).
function isAllowedExternalUrl(url) {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function clampText(value, max = 2000) {
  return String(value === undefined || value === null ? '' : value).slice(0, max);
}

// Chỉ nhận {name, extensions[]} với extension chữ-số (hoặc '*'); tối đa 10 bộ lọc.
function sanitizeFilters(filters) {
  if (!Array.isArray(filters)) return [];
  const out = [];
  for (const f of filters.slice(0, 10)) {
    if (!f || typeof f !== 'object') continue;
    const extensions = (Array.isArray(f.extensions) ? f.extensions : [])
      .map((e) => String(e).replace(/^\./, ''))
      .filter((e) => /^[A-Za-z0-9]{1,10}$/.test(e) || e === '*')
      .slice(0, 20);
    if (!extensions.length) continue;
    out.push({ name: clampText(f.name || 'Files', 60), extensions });
  }
  return out;
}

// Tên file mặc định chỉ lấy basename, bỏ ký tự cấm trên Windows.
function sanitizeFileName(name) {
  const base = String(name || 'download').split(/[\\/]/).pop();
  const cleaned = Array.from(base)
    .map((ch) => (ch.charCodeAt(0) < 32 || '<>:"|?*'.includes(ch) ? '_' : ch))
    .join('')
    .trim();
  return (cleaned || 'download').slice(0, 150);
}

module.exports = {
  isTrustedSender,
  isAllowedNavigation,
  isAllowedExternalUrl,
  clampText,
  sanitizeFilters,
  sanitizeFileName,
};
