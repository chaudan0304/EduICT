'use strict';
// updateGuard — an toàn khi NÂNG CẤP phiên bản (Phase 12).
//
// Khi người dùng cài bản mới đè lên bản cũ, dữ liệu (%APPDATA%\EduMaster\data) được GIỮ NGUYÊN. Trước khi bản mới
// chạm vào CSDL (backend có thể chạy schema migration nội bộ), guard:
//   1. so phiên bản đã chạy lần trước (version-state.json) với phiên bản hiện tại;
//   2. nếu khác và đã có CSDL → tạo SAFETY BACKUP (cùng định dạng backup Phase 9), xác minh checksum + integrity;
//   3. nếu backend không khởi động được sau nâng cấp → KHÔI PHỤC CSDL từ backup đó (rollback dữ liệu);
//   4. chỉ ghi version-state SAU KHI backend khởi động thành công.
// Backup này nằm ngoài data dir (<userData>/migration-backups) nên không bị cleanup backup thường xóa.
// KHÔNG require('electron'); KHÔNG đổi schema.

const fs = require('node:fs');
const path = require('node:path');
const { createSafetyBackup, verifySafetyBackup, DB_NAME } = require('./legacyMigration.cjs');

const VERSION_STATE_FILE = 'version-state.json';

function readVersionState(userDataDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(userDataDir, VERSION_STATE_FILE), 'utf8'));
  } catch {
    return null;
  }
}

function writeVersionState(userDataDir, version) {
  fs.mkdirSync(userDataDir, { recursive: true });
  const file = path.join(userDataDir, VERSION_STATE_FILE);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify({ lastVersion: version, updatedAt: new Date().toISOString() }, null, 2));
  fs.renameSync(tmp, file);
}

function hasDatabase(dataDir) {
  try {
    const st = fs.statSync(path.join(dataDir, DB_NAME));
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

// Trả { status: 'first-run'|'same-version'|'backed-up'|'failed', backup?, fromVersion? }
function ensureUpdateBackup({ userDataDir, dataDir, version, logger = { info() {}, warn() {}, error() {} } } = {}) {
  const previous = readVersionState(userDataDir);
  if (!hasDatabase(dataDir)) return { status: 'first-run' };
  if (previous && previous.lastVersion === version) return { status: 'same-version' };

  const fromVersion = previous ? previous.lastVersion : 'unknown';
  try {
    const layout = {
      dbPath: path.join(dataDir, DB_NAME),
      uploadsDir: path.join(dataDir, 'uploads'),
    };
    const backup = createSafetyBackup(layout, path.join(userDataDir, 'migration-backups'), {
      version,
      includeFiles: false, // nâng cấp không đụng uploads → chỉ backup CSDL
      kind: `preupdate-${String(fromVersion).replace(/[^0-9A-Za-z.]/g, '_')}-to-${String(version).replace(/[^0-9A-Za-z.]/g, '_')}`,
    });
    verifySafetyBackup(backup);
    logger.info(`[update] safety backup OK (${backup.backupId}).`);
    return { status: 'backed-up', backup, fromVersion };
  } catch (err) {
    logger.error(`[update] không tạo/xác minh được backup trước nâng cấp: ${err.message}`);
    return { status: 'failed', code: err.code || 'UPDATE_BACKUP_FAILED', message: err.message, fromVersion };
  }
}

// Khôi phục CSDL từ safety backup (chỉ gọi khi backend KHÔNG chạy). Giữ bản hỏng lại để chẩn đoán, không xóa.
function restoreDatabaseFromBackup({ backup, dataDir, logger = { info() {}, warn() {}, error() {} } } = {}) {
  const src = path.join(backup.dir, 'database.sqlite');
  const dst = path.join(dataDir, DB_NAME);
  if (!fs.existsSync(src)) return { ok: false, code: 'BACKUP_MISSING' };
  const keep = `${dst}.failed-update-${Date.now()}`;
  try {
    if (fs.existsSync(dst)) fs.renameSync(dst, keep);
    for (const ext of ['-wal', '-shm']) {
      if (fs.existsSync(`${dst}${ext}`)) fs.renameSync(`${dst}${ext}`, `${keep}${ext}`);
    }
    fs.copyFileSync(src, dst);
    const wal = path.join(backup.dir, 'database.sqlite-wal');
    if (fs.existsSync(wal)) fs.copyFileSync(wal, `${dst}-wal`);
    logger.warn(`[update] đã khôi phục CSDL từ ${backup.backupId} (bản lỗi giữ tại ${path.basename(keep)}).`);
    return { ok: true, keptFailedCopy: keep };
  } catch (err) {
    logger.error(`[update] khôi phục CSDL thất bại: ${err.message}`);
    return { ok: false, code: 'RESTORE_FAILED', message: err.message };
  }
}

module.exports = { ensureUpdateBackup, restoreDatabaseFromBackup, readVersionState, writeVersionState, VERSION_STATE_FILE };
