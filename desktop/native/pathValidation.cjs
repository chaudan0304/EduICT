'use strict';
// pathValidation — kiểm tra đường dẫn bài trình chiếu TRƯỚC KHI Native Layer mở PowerPoint.
// Frontend KHÔNG được gửi path tùy ý: chỉ chấp nhận
//   (a) URL dạng "/uploads/presentations/<lessonId>/original.pptx" (cách EduMaster lưu file gốc), hoặc
//   (b) đường dẫn tuyệt đối NẰM TRONG <data>/uploads/presentations.
// Chống: path traversal, UNC/device path, ADS, symlink thoát vùng, sai đuôi file, không phải file thường.

const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_EXTENSIONS = Object.freeze(['.pptx', '.ppt']);
const MAX_PATH_LENGTH = 1024;

const MESSAGES = Object.freeze({
  INVALID_PRESENTATION_PATH: 'Đường dẫn bài trình chiếu không hợp lệ.',
  PRESENTATION_NOT_FOUND: 'Không tìm thấy file bài trình chiếu gốc.',
});

function fail(code) {
  return { ok: false, code, message: MESSAGES[code] };
}

function isInside(root, target) {
  const rel = path.relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function safeRealpath(p) {
  try {
    return fs.realpathSync.native ? fs.realpathSync.native(p) : fs.realpathSync(p);
  } catch {
    return null;
  }
}

function validatePresentationPath(input, { uploadsDir }) {
  if (typeof input !== 'string') return fail('INVALID_PRESENTATION_PATH');
  const raw = input.trim();
  if (!raw || raw.length > MAX_PATH_LENGTH || raw.includes('\0')) return fail('INVALID_PRESENTATION_PATH');
  if (raw.includes('?') || raw.includes('#')) return fail('INVALID_PRESENTATION_PATH');
  if (raw.startsWith('\\\\') || raw.startsWith('//')) return fail('INVALID_PRESENTATION_PATH'); // UNC / \\?\ device

  const presentationsRoot = path.resolve(uploadsDir, 'presentations');
  let candidate;

  if (raw.startsWith('/uploads/')) {
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return fail('INVALID_PRESENTATION_PATH');
    }
    if (decoded.includes('\0') || decoded.includes('\\')) return fail('INVALID_PRESENTATION_PATH');
    const segments = decoded.slice('/uploads/'.length).split('/');
    if (segments.some((s) => s === '..' || s === '.' || s === '')) return fail('INVALID_PRESENTATION_PATH');
    candidate = path.resolve(uploadsDir, ...segments);
  } else if (path.isAbsolute(raw)) {
    // ADS (file.pptx:stream) — chỉ cho phép dấu ':' ở ổ đĩa (vị trí 1).
    if (raw.indexOf(':', 2) !== -1) return fail('INVALID_PRESENTATION_PATH');
    candidate = path.resolve(raw);
  } else {
    return fail('INVALID_PRESENTATION_PATH');
  }

  if (!ALLOWED_EXTENSIONS.includes(path.extname(candidate).toLowerCase())) {
    return fail('INVALID_PRESENTATION_PATH');
  }
  if (!isInside(presentationsRoot, candidate)) return fail('INVALID_PRESENTATION_PATH');

  let stat;
  try {
    stat = fs.statSync(candidate);
  } catch {
    return fail('PRESENTATION_NOT_FOUND');
  }
  if (!stat.isFile()) return fail('INVALID_PRESENTATION_PATH');

  // Symlink/junction không được dẫn ra ngoài vùng dữ liệu hợp lệ.
  const realRoot = safeRealpath(presentationsRoot) || presentationsRoot;
  const realFile = safeRealpath(candidate);
  if (!realFile || !isInside(realRoot, realFile)) return fail('INVALID_PRESENTATION_PATH');

  return { ok: true, path: realFile };
}

module.exports = { validatePresentationPath, ALLOWED_EXTENSIONS, MESSAGES };
