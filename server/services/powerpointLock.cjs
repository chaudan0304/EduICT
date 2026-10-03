'use strict';
// powerpointLock — khóa LIÊN-TIẾN-TRÌNH cho mọi thao tác PowerPoint COM (Phase 12).
//
// Vấn đề (Phase 11): PPTX renderer (chạy trong tiến trình backend Node) và Desktop Bridge (chạy trong tiến
// trình Electron main) cùng điều khiển PowerPoint.Application. Hai hàng đợi in-process KHÔNG thấy nhau.
//
// Giải pháp: khóa tệp độc quyền (open flag 'wx' là nguyên tử trên NTFS) trong <data>/locks/.
//   acquire → ghi {pid, token, ts} → chạy COM → release (chỉ xóa nếu token khớp).
//   Khóa mồ côi (tiến trình giữ khóa đã chết, hoặc quá staleMs) bị thu hồi an toàn.
// File .cjs để cả backend (ESM) lẫn Electron main (CJS) dùng CHUNG một hiện thực.
// KHÔNG chứa secret, KHÔNG phụ thuộc Electron.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LOCK_FILE_NAME = 'powerpoint-com.lock';
const DEFAULTS = Object.freeze({ acquireTimeoutMs: 45000, staleMs: 150000, pollMs: 60 });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM'; // tồn tại nhưng không có quyền → coi là còn sống
  }
}

function readHolder(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function lockError(message, code) {
  return Object.assign(new Error(message), { code });
}

// Thu hồi khóa mồ côi: rename sang tên duy nhất trước khi xóa để hai tiến trình không xóa nhầm khóa mới.
function reclaimIfStale(file, staleMs, isAlive) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return true; // đã biến mất
  }
  const holder = readHolder(file);
  const age = Date.now() - stat.mtimeMs;
  const dead = holder ? !isAlive(holder.pid) : age > 2000; // file rỗng/hỏng quá 2s → mồ côi
  if (!(dead || age > staleMs)) return false;
  const trash = `${file}.stale-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  try {
    fs.renameSync(file, trash);
    fs.rmSync(trash, { force: true });
    return true;
  } catch {
    return false; // tiến trình khác đã thu hồi/giành trước
  }
}

async function acquire(lockDir, options = {}) {
  const { acquireTimeoutMs, staleMs, pollMs } = { ...DEFAULTS, ...options };
  const isAlive = options.isProcessAlive || isProcessAlive;
  if (!lockDir) throw lockError('Thiếu thư mục khóa.', 'LOCK_CONFIG_INVALID');
  fs.mkdirSync(lockDir, { recursive: true });
  const file = path.join(lockDir, LOCK_FILE_NAME);
  const token = crypto.randomBytes(8).toString('hex');
  const deadline = Date.now() + acquireTimeoutMs;

  for (;;) {
    try {
      const fd = fs.openSync(file, 'wx');
      try {
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, token, ts: Date.now(), owner: options.owner || '' }));
      } finally {
        fs.closeSync(fd);
      }
      return {
        file,
        token,
        release() {
          const holder = readHolder(file);
          if (holder && holder.token === token) {
            try {
              fs.rmSync(file, { force: true });
            } catch {
              /* bỏ qua */
            }
          }
        },
      };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    if (reclaimIfStale(file, staleMs, isAlive)) continue;
    if (Date.now() >= deadline) throw lockError('PowerPoint đang bận (khóa COM).', 'POWERPOINT_BUSY');
    await sleep(pollMs);
  }
}

async function withPowerPointLock(lockDir, fn, options = {}) {
  const handle = await acquire(lockDir, options);
  try {
    return await fn();
  } finally {
    handle.release();
  }
}

module.exports = { acquire, withPowerPointLock, isProcessAlive, LOCK_FILE_NAME, DEFAULTS };
