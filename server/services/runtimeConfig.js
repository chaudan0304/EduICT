// runtimeConfig — cấu hình runtime thống nhất cho backend EduICT (Phase 10).
//
// Phân biệt 2 trục độc lập:
//   environment: 'development' | 'production' | 'test'
//   runtime:     'web' | 'desktop'
//
// Nguyên tắc:
//   - KHÔNG chứa secret (không GEMINI_API_KEY, không biến môi trường thô).
//   - KHÔNG hard-code đường dẫn: mọi đường dẫn lấy từ pathService.
//   - Desktop shell tương lai (Electron/Tauri) chỉ cần đặt EDUICT_RUNTIME=desktop
//     (cùng EDUICT_DATA_DIR / PORT) trước khi khởi động server — không sửa code.
//   - Module chỉ phụ thuộc pathService (leaf) → không vòng lặp phụ thuộc.

import * as pathService from './pathService.js';

const ENVIRONMENTS = ['development', 'production', 'test'];
const RUNTIMES = ['web', 'desktop'];

function detectEnvironment(env = process.env) {
  const explicit = String(env.EDUICT_ENV || '').trim().toLowerCase();
  if (ENVIRONMENTS.includes(explicit)) return explicit;
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  if (ENVIRONMENTS.includes(nodeEnv)) return nodeEnv;
  // node --test đặt NODE_TEST_CONTEXT cho tiến trình con.
  if (env.NODE_TEST_CONTEXT) return 'test';
  return 'development';
}

function detectRuntime(env = process.env) {
  const explicit = String(env.EDUICT_RUNTIME || '').trim().toLowerCase();
  return RUNTIMES.includes(explicit) ? explicit : 'web';
}

// apiBaseUrl: chuỗi rỗng = same-origin (relative URL) — hành vi web hiện tại.
// Desktop shell có thể đặt EDUICT_API_BASE_URL nếu UI được nạp từ origin khác.
function getApiBaseUrl(env = process.env) {
  return String(env.EDUICT_API_BASE_URL || '').trim().replace(/\/+$/, '');
}

function getRuntimeConfig(env = process.env) {
  return {
    environment: detectEnvironment(env),
    runtime: detectRuntime(env),
    apiBaseUrl: getApiBaseUrl(env),
    // Chỉ đường dẫn tương đối / tên file — không lộ đường dẫn tuyệt đối.
    paths: pathService.getPathsSummary(),
  };
}

function isDesktopRuntime(env = process.env) {
  return detectRuntime(env) === 'desktop';
}

export {
  ENVIRONMENTS,
  RUNTIMES,
  detectEnvironment,
  detectRuntime,
  getApiBaseUrl,
  getRuntimeConfig,
  isDesktopRuntime,
};

export default { getRuntimeConfig, detectEnvironment, detectRuntime, getApiBaseUrl, isDesktopRuntime };
