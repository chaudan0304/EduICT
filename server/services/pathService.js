// pathService — lớp trừu tượng đường dẫn cho backend EduICT.
//
// Mục tiêu (Giai đoạn 1, Phần 5 & 14):
//   - Gom TẤT CẢ việc suy ra đường dẫn (process.cwd, uploads, db, scripts...)
//     về MỘT nơi duy nhất, để EduMaster Desktop sau này chỉ cần đổi ở đây
//     (app data dir do OS cấp) mà không phải sửa rải rác trong code.
//   - WEB mode (hiện tại): mặc định bám theo process.cwd() → GIỮ NGUYÊN behavior.
//   - Có thể override bằng biến môi trường mà không phá mặc định:
//       EDUICT_APP_ROOT  — thư mục gốc ứng dụng (mặc định: process.cwd())
//       EDUICT_DATA_DIR  — thư mục dữ liệu (mặc định: app root)
//       EDUICT_DB_PATH   — đường dẫn file .sqlite tuyệt đối (ưu tiên cao nhất)
//
// LƯU Ý: module này CHỈ phụ thuộc node:path / node:fs (là leaf module),
// không import envLoader/db → tránh vòng lặp phụ thuộc.

import path from 'node:path';
import fs from 'node:fs';

// Thư mục gốc ứng dụng — NƠI DUY NHẤT còn dùng process.cwd().
function getAppRoot() {
  const custom = (process.env.EDUICT_APP_ROOT || '').trim();
  return custom ? path.resolve(custom) : process.cwd();
}

// Thư mục dữ liệu (db, backup, logs). Mặc định = app root để giữ nguyên WEB mode.
function getAppDataDir() {
  const custom = (process.env.EDUICT_DATA_DIR || '').trim();
  return custom ? path.resolve(custom) : getAppRoot();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Đường dẫn file CSDL SQLite (giữ nguyên logic cũ trong db.js).
function getDatabasePath() {
  const custom = (process.env.EDUICT_DB_PATH || '').trim();
  if (custom) {
    const resolved = path.resolve(custom);
    ensureDir(path.dirname(resolved));
    return resolved;
  }
  return path.join(ensureDir(getAppDataDir()), 'edumaster.sqlite');
}

// --- Thư mục / file cố định theo cấu trúc dự án hiện tại ---
function getServerDir() { return path.join(getAppRoot(), 'server'); }
function getDistDir() { return path.join(getAppRoot(), 'dist'); }

// Phase 12: tiến trình ngoài (powershell.exe, python) KHÔNG đọc được bên trong app.asar.
// File script được đóng gói "asarUnpack" → nằm ở app.asar.unpacked cùng cấu trúc thư mục.
// Ngoài môi trường đóng gói (web / dev) đường dẫn không chứa app.asar nên không đổi.
function toUnpackedPath(p) {
  return String(p).replace(/([\\/])app\.asar(?=[\\/])/i, '$1app.asar.unpacked');
}

// .env:
//  - WEB mode: <app root>/.env (giữ nguyên hành vi cũ).
//  - DESKTOP runtime: <data>/settings/.env (cấu hình người dùng, KHÔNG nằm trong thư mục cài đặt/asar,
//    không bao giờ được đóng gói vào installer).
function getEnvPath() {
  if (String(process.env.EDUICT_RUNTIME || '').trim().toLowerCase() === 'desktop') {
    return path.join(getAppDataDir(), 'settings', '.env');
  }
  return path.join(getAppRoot(), '.env');
}

// Uploads là DỮ LIỆU NGƯỜI DÙNG → nằm dưới data dir (mặc định = app root nên WEB mode không đổi).
function getUploadsDir() { return path.join(getAppDataDir(), 'uploads'); }
function getPresentationsDir() { return path.join(getUploadsDir(), 'presentations'); }
function getTempDir() { return path.join(getUploadsDir(), 'temp'); }
function getCacheDir() { return path.join(getUploadsDir(), 'cache'); }

function getPptMappingPath() { return path.join(getServerDir(), 'data', 'ppct-mapping.json'); }
function getRendererScript() { return toUnpackedPath(path.join(getServerDir(), 'pptx-renderer.ps1')); }
function getFallbackRendererScript() { return toUnpackedPath(path.join(getServerDir(), 'pptx-renderer-fallback.py')); }

// --- Thư mục chuẩn bị cho Desktop (chưa wire vào code hiện tại) ---
function getBackupDir() { return path.join(getAppDataDir(), 'backups'); }
function getLogsDir() { return path.join(getAppDataDir(), 'logs'); }
function getSettingsDir() { return path.join(getAppDataDir(), 'settings'); }
// Khóa liên-tiến-trình (PowerPoint COM lock) — nằm trong data dir, không nằm trong thư mục cài đặt.
function getLocksDir() { return path.join(getAppDataDir(), 'locks'); }

// Tóm tắt đường dẫn dạng RELATIVE so với data dir — an toàn để trả ra API/log
// (không lộ đường dẫn tuyệt đối của máy người dùng).
function getPathsSummary() {
  const rel = (p) => path.relative(getAppDataDir(), p).split(path.sep).join('/') || '.';
  return {
    database: path.basename(getDatabasePath()),
    uploads: rel(getUploadsDir()),
    presentations: rel(getPresentationsDir()),
    backups: rel(getBackupDir()),
    logs: rel(getLogsDir()),
    settings: rel(getSettingsDir()),
  };
}

// Giải một đường dẫn tương đối so với app root
// (giữ nguyên hành vi path.resolve(process.cwd(), rel) cũ).
function resolveFromRoot(rel) {
  const clean = String(rel || '').startsWith('/') ? String(rel).slice(1) : String(rel || '');
  return path.resolve(getAppRoot(), clean);
}

export {
  getAppRoot,
  getAppDataDir,
  ensureDir,
  getDatabasePath,
  getServerDir,
  getDistDir,
  getEnvPath,
  getUploadsDir,
  getPresentationsDir,
  getTempDir,
  getCacheDir,
  getPptMappingPath,
  getRendererScript,
  getFallbackRendererScript,
  getBackupDir,
  getLogsDir,
  getSettingsDir,
  getLocksDir,
  toUnpackedPath,
  getPathsSummary,
  resolveFromRoot,
};

export default {
  getAppRoot,
  getAppDataDir,
  ensureDir,
  getDatabasePath,
  getServerDir,
  getDistDir,
  getEnvPath,
  getUploadsDir,
  getPresentationsDir,
  getTempDir,
  getCacheDir,
  getPptMappingPath,
  getRendererScript,
  getFallbackRendererScript,
  getBackupDir,
  getLogsDir,
  getSettingsDir,
  getLocksDir,
  toUnpackedPath,
  getPathsSummary,
  resolveFromRoot,
};
