'use strict';
// logger — log kỹ thuật của Native Layer vào <data>/logs/desktop.log (KHÔNG hiển thị cho người dùng cuối).
// Che mẫu Google API key nếu lỡ xuất hiện; không log biến môi trường.

const fs = require('node:fs');
const path = require('node:path');

const MAX_LOG_BYTES = 5 * 1024 * 1024;

function redact(text) {
  return String(text).replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]');
}

function createLogger(logsDir, { echo = true } = {}) {
  let filePath = null;
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    filePath = path.join(logsDir, 'desktop.log');
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > MAX_LOG_BYTES) {
      fs.renameSync(filePath, `${filePath}.old`);
    }
  } catch {
    filePath = null; // log lỗi không được làm hỏng ứng dụng
  }

  function write(level, message) {
    const line = `${new Date().toISOString()} [${level}] ${redact(message)}`;
    if (echo) (level === 'error' ? console.error : console.log)(line);
    if (filePath) {
      try {
        fs.appendFileSync(filePath, `${line}\n`);
      } catch {
        /* bỏ qua */
      }
    }
  }

  return {
    info: (m) => write('info', m),
    warn: (m) => write('warn', m),
    error: (m) => write('error', m),
    filePath,
  };
}

const noopLogger = { info() {}, warn() {}, error() {}, filePath: null };

module.exports = { createLogger, noopLogger, redact };
