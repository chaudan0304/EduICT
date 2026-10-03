'use strict';
// desktopConfig — cấu hình tĩnh của Desktop Shell (Phase 11).
// KHÔNG require('electron') ở đây để test (Node thuần) nạp được module này.
// KHÔNG chứa secret: GEMINI_API_KEY chỉ tồn tại phía Node backend (.env), không bao giờ vào shell.

const path = require('node:path');

// Bảo mật renderer: bắt buộc cách ly. Test (phase11) khóa các giá trị này.
const WEB_PREFERENCES = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  spellcheck: false,
});

const BACKEND_HOST = '127.0.0.1'; // KHÔNG bind 0.0.0.0
const BACKEND_START_TIMEOUT_MS = 30000;
const BACKEND_STOP_TIMEOUT_MS = 8000;

// Thông điệp thân thiện cho người dùng cuối (không stack trace).
const USER_MESSAGES = Object.freeze({
  BACKEND_START_FAILED:
    'Không thể khởi động máy chủ EduMaster.\nVui lòng thử lại hoặc kiểm tra log.',
  BACKEND_CRASHED:
    'Máy chủ EduMaster đã dừng đột ngột.\nDữ liệu của bạn vẫn được giữ nguyên. Vui lòng mở lại ứng dụng.',
  MIGRATION_FAILED:
    'Không thể chuyển dữ liệu cũ sang phiên bản mới.\nDữ liệu cũ của bạn KHÔNG bị thay đổi và đã có bản sao lưu an toàn.\nVui lòng mở lại ứng dụng hoặc liên hệ hỗ trợ (kèm tệp log).',
  UPDATE_BACKUP_FAILED:
    'Không thể tạo bản sao lưu an toàn trước khi nâng cấp dữ liệu.\nDữ liệu của bạn KHÔNG bị thay đổi. Vui lòng kiểm tra dung lượng ổ đĩa rồi mở lại ứng dụng.',
});

// desktop/config → gốc repo/ứng dụng (nơi có server.js, dist/, .env).
function resolveAppRoot(dirname = __dirname) {
  return path.resolve(dirname, '..', '..');
}

// Dữ liệu người dùng nằm NGOÀI thư mục ứng dụng. EDUICT_DATA_DIR (nếu người dùng/dev đặt) được ưu tiên.
// Phase 12: bản đóng gói (production) KHÔNG đọc EDUICT_DATA_DIR từ môi trường máy → main.cjs truyền env rỗng.
function resolveDataDir(userDataPath, env = process.env) {
  const custom = String(env.EDUICT_DATA_DIR || '').trim();
  return custom ? path.resolve(custom) : path.join(userDataPath, 'data');
}

// Thư mục chứa thiết lập người dùng (.env của người dùng, Gemini) — luôn dưới data dir, KHÔNG phải thư mục cài đặt.
function resolveSettingsDir(dataDir) {
  return path.join(dataDir, 'settings');
}

// Môi trường cho tiến trình Node backend. Xây dựng tường minh để:
//  - ép runtime=desktop, host 127.0.0.1, cổng động, dữ liệu trong user data;
//  - bỏ EDUICT_DB_PATH (DB luôn nằm trong data dir) và EDUICT_API_BASE_URL;
//  - Phase 12: EDUICT_ENV=production khi đã đóng gói.
function buildBackendEnv({ appRoot, dataDir, port, baseEnv = process.env, asNode = false, environment = 'development' }) {
  const env = { ...baseEnv };
  delete env.EDUICT_DB_PATH;
  delete env.EDUICT_API_BASE_URL;
  env.EDUICT_ENV = environment === 'production' ? 'production' : 'development';
  env.EDUICT_RUNTIME = 'desktop';
  env.EDUICT_APP_ROOT = appRoot;
  env.EDUICT_DATA_DIR = dataDir;
  env.EDUICT_HOST = BACKEND_HOST;
  env.PORT = String(port);
  if (asNode) env.ELECTRON_RUN_AS_NODE = '1';
  else delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

module.exports = {
  WEB_PREFERENCES,
  BACKEND_HOST,
  BACKEND_START_TIMEOUT_MS,
  BACKEND_STOP_TIMEOUT_MS,
  USER_MESSAGES,
  resolveAppRoot,
  resolveDataDir,
  resolveSettingsDir,
  buildBackendEnv,
};
