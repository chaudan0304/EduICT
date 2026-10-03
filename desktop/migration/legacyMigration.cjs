'use strict';
// legacyMigration — chuyển dữ liệu EduMaster CŨ (chế độ Web: edumaster.sqlite + uploads/ + backups/ cạnh mã nguồn)
// sang thư mục dữ liệu người dùng của bản Desktop (Phase 12).
//
// Quy trình AN TOÀN (không bao giờ "copy rồi cầu may"):
//   Detect → Safety Backup → Checksum → Verify Backup → Stage (copy ra thư mục tạm) → Verify Stage
//          → Commit (rename/ghi vào data dir, có nhật ký) → Verify DB cuối → Ghi migration marker.
//   Lỗi ở bất kỳ bước nào → ROLLBACK: gỡ đúng những gì migration đã tạo; DỮ LIỆU CŨ KHÔNG BAO GIỜ BỊ SỬA/XÓA.
//
// Bất biến:
//   - Nguồn (legacy) chỉ được ĐỌC. Mọi kiểm tra DB chạy trên BẢN SAO (safety backup / staging).
//   - Không ghi đè dữ liệu đích: đích đã có DB → KHÔNG migrate. File backup trùng tên → giữ cả hai.
//   - Marker `complete` chỉ được ghi SAU KHI verification PASS. Chạy lại: idempotent (SKIP).
//   - original.pptx là nguồn sự thật: copy nguyên vẹn từng byte, đối chiếu SHA-256.
//   - Không đổi schema. Không dùng DB engine khác (node:sqlite).
// KHÔNG require('electron') → test bằng Node thuần. KHÔNG log secret.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DB_NAME = 'edumaster.sqlite';
const STATE_FILE = 'migration-state.json';
const STATE_SCHEMA = 1;

class MigrationError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

// ---------- tiện ích tệp ----------
function sha256File(file) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(1024 * 1024);
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function isNonEmptyFile(file) {
  try {
    const st = fs.statSync(file);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

function listFilesRecursive(root, skip = () => false, rel = '') {
  const out = [];
  if (!fs.existsSync(path.join(root, rel))) return out;
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? path.join(rel, e.name) : e.name;
    if (skip(e.name, childRel, e.isDirectory())) continue;
    if (e.isDirectory()) out.push(...listFilesRecursive(root, skip, childRel));
    else if (e.isFile()) out.push(childRel);
  }
  return out;
}

function copyFileExclusive(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
}

// rename khi cùng ổ đĩa; khác ổ (EXDEV) → copy rồi xóa bản staging.
function moveEntry(src, dst) {
  try {
    fs.renameSync(src, dst);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    fs.cpSync(src, dst, { recursive: true, errorOnExist: true, force: false });
    fs.rmSync(src, { recursive: true, force: true });
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

// ---------- SQLite (node:sqlite) ----------
function inspectDatabase(dbPath, { checkpoint = false } = {}) {
  const { DatabaseSync } = require('node:sqlite');
  let db;
  try {
    db = new DatabaseSync(dbPath);
    if (checkpoint) {
      try {
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      } catch {
        /* DB không ở chế độ WAL */
      }
    }
    const row = db.prepare('PRAGMA integrity_check').get();
    const integrity = row && Object.values(row)[0];
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((r) => r.name);
    const counts = {};
    for (const t of tables) counts[t] = Number(db.prepare(`SELECT COUNT(*) AS c FROM ${quoteIdent(t)}`).get().c);
    let schoolYear = '';
    try {
      const sy = db.prepare("SELECT value FROM app_settings WHERE key = 'school_year'").get();
      schoolYear = sy ? String(sy.value) : '';
    } catch {
      /* chưa có bảng app_settings */
    }
    return { ok: integrity === 'ok', integrity: String(integrity), tables, counts, schoolYear };
  } finally {
    try {
      db && db.close();
    } catch {
      /* đã đóng */
    }
  }
}

function compareInspections(source, migrated) {
  const problems = [];
  if (!migrated.ok) problems.push(`integrity_check: ${migrated.integrity}`);
  for (const t of source.tables) {
    if (!migrated.tables.includes(t)) problems.push(`thiếu bảng ${t}`);
    else if (migrated.counts[t] !== source.counts[t]) {
      problems.push(`bảng ${t}: ${migrated.counts[t]} dòng ≠ nguồn ${source.counts[t]}`);
    }
  }
  return problems;
}

// ---------- phát hiện dữ liệu cũ ----------
function resolveLegacyLayout(dir) {
  const dbPath = path.join(dir, DB_NAME);
  return {
    legacyDir: dir,
    dbPath,
    uploadsDir: path.join(dir, 'uploads'),
    backupsDir: path.join(dir, 'backups'),
  };
}

function detectLegacy({ candidates = [], dataDir } = {}) {
  const target = dataDir ? path.resolve(dataDir) : null;
  const seen = new Set();
  for (const c of candidates) {
    if (!c) continue;
    const dir = path.resolve(String(c));
    const key = dir.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (target && key === target.toLowerCase()) continue; // chính data dir đích không phải "legacy"
    const layout = resolveLegacyLayout(dir);
    if (!isNonEmptyFile(layout.dbPath)) continue;
    return { found: true, ...layout };
  }
  return { found: false };
}

// ---------- safety backup (cùng định dạng backup Phase 9: manifest.json + database.sqlite + files/) ----------
function createSafetyBackup(legacy, backupRoot, { version = '', kind = 'premigration', includeFiles = true } = {}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `EduMaster-Safety-${kind}-${stamp}`;
  const dir = path.join(backupRoot, backupId);
  fs.mkdirSync(dir, { recursive: true });

  const before = sha256File(legacy.dbPath);
  copyFileExclusive(legacy.dbPath, path.join(dir, 'database.sqlite'));
  let walChecksum = null;
  for (const ext of ['-wal']) {
    const src = `${legacy.dbPath}${ext}`;
    if (isNonEmptyFile(src)) {
      copyFileExclusive(src, path.join(dir, `database.sqlite${ext}`));
      walChecksum = sha256File(path.join(dir, `database.sqlite${ext}`));
    }
  }
  const after = sha256File(legacy.dbPath);
  if (before !== after) throw new MigrationError('LEGACY_SOURCE_CHANGED', 'Dữ liệu cũ đang bị thay đổi (ứng dụng cũ còn chạy?).');

  const presSrc = path.join(legacy.uploadsDir, 'presentations');
  let fileCount = 0;
  const files = {};
  for (const rel of includeFiles ? listFilesRecursive(presSrc) : []) {
    copyFileExclusive(path.join(presSrc, rel), path.join(dir, 'files', 'presentations', rel));
    files[rel.split(path.sep).join('/')] = sha256File(path.join(dir, 'files', 'presentations', rel));
    fileCount += 1;
  }

  const manifest = {
    formatVersion: 1,
    appName: 'EduMaster',
    kind: kind === 'premigration' ? 'pre-migration' : kind,
    backupId,
    createdAt: new Date().toISOString(),
    appVersion: version,
    schoolYear: '',
    fileCount,
    databaseChecksum: before,
    walChecksum,
    files,
    stats: {},
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { backupId, dir, manifest };
}

// Xác minh backup: manifest + checksum DB + checksum từng file + integrity_check trên BẢN SAO backup.
function verifySafetyBackup(backup) {
  const manifest = readJson(path.join(backup.dir, 'manifest.json'));
  if (!manifest || manifest.formatVersion !== 1) throw new MigrationError('BACKUP_VERIFY_FAILED', 'manifest.json thiếu/không hợp lệ.');
  const dbFile = path.join(backup.dir, 'database.sqlite');
  if (!fs.existsSync(dbFile)) throw new MigrationError('BACKUP_VERIFY_FAILED', 'Thiếu database.sqlite trong backup.');
  if (sha256File(dbFile) !== manifest.databaseChecksum) throw new MigrationError('BACKUP_VERIFY_FAILED', 'Checksum database không khớp.');
  for (const [rel, sum] of Object.entries(manifest.files || {})) {
    const f = path.join(backup.dir, 'files', 'presentations', ...rel.split('/'));
    if (!fs.existsSync(f) || sha256File(f) !== sum) throw new MigrationError('BACKUP_VERIFY_FAILED', `File backup hỏng: ${rel}`);
  }
  // integrity_check trên một bản sao tạm để không làm đổi backup (mở WAL có thể tạo -shm).
  const probeDir = fs.mkdtempSync(path.join(path.dirname(backup.dir), '.verify-'));
  try {
    const probe = path.join(probeDir, DB_NAME);
    fs.copyFileSync(dbFile, probe);
    const wal = path.join(backup.dir, 'database.sqlite-wal');
    if (fs.existsSync(wal)) fs.copyFileSync(wal, `${probe}-wal`);
    let info;
    try {
      info = inspectDatabase(probe, { checkpoint: true });
    } catch (err) {
      throw new MigrationError('BACKUP_VERIFY_FAILED', `Không mở được database backup: ${err.message}`);
    }
    if (!info.ok) throw new MigrationError('BACKUP_VERIFY_FAILED', `Backup integrity_check: ${info.integrity}`);
    return { manifest, inspection: info };
  } finally {
    fs.rmSync(probeDir, { recursive: true, force: true });
  }
}

// ---------- trạng thái ----------
function readState(userDataDir) {
  return readJson(path.join(userDataDir, STATE_FILE));
}
function writeState(userDataDir, state) {
  writeJsonAtomic(path.join(userDataDir, STATE_FILE), { schema: STATE_SCHEMA, ...state, updatedAt: new Date().toISOString() });
}

// ---------- rollback ----------
function rollbackMoved(state, logger) {
  const moved = (state && state.moved) || [];
  for (let i = moved.length - 1; i >= 0; i -= 1) {
    const item = moved[i];
    try {
      if (item.type === 'file' || item.type === 'dir') fs.rmSync(item.path, { recursive: true, force: true });
    } catch (err) {
      logger.error(`[migration] rollback không gỡ được ${item.path}: ${err.message}`);
    }
  }
}

function cleanupStaging(stagingDir) {
  try {
    if (stagingDir) fs.rmSync(stagingDir, { recursive: true, force: true });
  } catch {
    /* bỏ qua */
  }
}

// ---------- chạy migration ----------
function runMigration({
  userDataDir,
  dataDir,
  candidates = [],
  logger = { info() {}, warn() {}, error() {} },
  hooks = {},
  version = '',
} = {}) {
  if (!userDataDir || !dataDir) throw new MigrationError('MIGRATION_CONFIG_INVALID', 'Thiếu userDataDir/dataDir.');
  const targetDb = path.join(dataDir, DB_NAME);

  // 1) Idempotent: đã hoàn tất → SKIP.
  let state = readState(userDataDir);
  if (state && state.status === 'complete') return { status: 'skipped', reason: 'already-complete' };

  // 2) Phát hiện migration dang dở → khôi phục (rollback phần đã commit) rồi thử lại từ đầu.
  let recovered = false;
  if (state && state.status === 'in-progress') {
    logger.warn('[migration] phát hiện migration dang dở — rollback trước khi thử lại.');
    rollbackMoved(state, logger);
    cleanupStaging(state.stagingDir);
    writeState(userDataDir, { ...state, status: 'rolled-back', moved: [], reason: 'interrupted-recovered' });
    recovered = true;
  }

  // 3) Có dữ liệu cũ không?
  const legacy = detectLegacy({ candidates, dataDir });
  if (!legacy.found) return { status: 'no-legacy', recovered };

  // 4) Đích đã có dữ liệu → KHÔNG ghi đè; đánh dấu hoàn tất để không thử lại.
  if (isNonEmptyFile(targetDb)) {
    writeState(userDataDir, { status: 'complete', reason: 'target-already-initialized', legacyDir: legacy.legacyDir, completedAt: new Date().toISOString(), appVersion: version });
    return { status: 'skipped', reason: 'target-has-data', recovered };
  }

  const id = `mig-${Date.now()}`;
  const stagingDir = path.join(userDataDir, `.migration-staging-${id}`);
  const moved = [];
  state = { status: 'in-progress', id, legacyDir: legacy.legacyDir, startedAt: new Date().toISOString(), appVersion: version, stagingDir, moved };
  writeState(userDataDir, state);
  const track = (item) => {
    moved.push(item);
    writeState(userDataDir, state); // nhật ký cập nhật NGAY để recovery biết đã tạo gì
  };

  try {
    logger.info(`[migration] phát hiện dữ liệu cũ tại ${legacy.legacyDir}`);

    // Nguồn: kiểm tra trên BẢN SAO backup, không mở trực tiếp DB cũ.
    const backupRoot = path.join(userDataDir, 'migration-backups');
    const backup = createSafetyBackup(legacy, backupRoot, { version });
    state.backupId = backup.backupId;
    writeState(userDataDir, state);
    if (hooks.beforeBackupVerify) hooks.beforeBackupVerify({ backupDir: backup.dir, legacy });
    const verified = verifySafetyBackup(backup);
    const source = verified.inspection;
    if (!source.tables.length) {
      // CSDL cũ rỗng (không có bảng) → không có gì để chuyển.
      cleanupStaging(stagingDir);
      writeState(userDataDir, { ...state, status: 'complete', reason: 'legacy-empty', completedAt: new Date().toISOString() });
      return { status: 'no-legacy', reason: 'legacy-empty', recovered };
    }
    logger.info(`[migration] safety backup OK (${backup.backupId}).`);
    if (hooks.afterBackup) hooks.afterBackup({ backup });

    // Stage: copy ra thư mục tạm cùng ổ đĩa.
    const stageDb = path.join(stagingDir, DB_NAME);
    copyFileExclusive(legacy.dbPath, stageDb);
    if (isNonEmptyFile(`${legacy.dbPath}-wal`)) copyFileExclusive(`${legacy.dbPath}-wal`, `${stageDb}-wal`);
    const stageInfo = inspectDatabase(stageDb, { checkpoint: true }); // gộp WAL vào file chính
    for (const ext of ['-wal', '-shm']) fs.rmSync(`${stageDb}${ext}`, { force: true });

    const skipTemp = (name, _rel, isDir) => isDir && name === 'temp';
    const uploadFiles = listFilesRecursive(legacy.uploadsDir, skipTemp);
    const uploadSums = {};
    for (const rel of uploadFiles) {
      copyFileExclusive(path.join(legacy.uploadsDir, rel), path.join(stagingDir, 'uploads', rel));
      uploadSums[rel] = sha256File(path.join(legacy.uploadsDir, rel));
    }
    const backupFiles = listFilesRecursive(legacy.backupsDir);
    const backupSums = {};
    for (const rel of backupFiles) {
      copyFileExclusive(path.join(legacy.backupsDir, rel), path.join(stagingDir, 'backups', rel));
      backupSums[rel] = sha256File(path.join(legacy.backupsDir, rel));
    }

    // Verify stage.
    const problems = compareInspections(source, stageInfo);
    for (const rel of uploadFiles) {
      const f = path.join(stagingDir, 'uploads', rel);
      if (!fs.existsSync(f) || sha256File(f) !== uploadSums[rel]) problems.push(`upload sai/thiếu: ${rel}`);
    }
    for (const rel of backupFiles) {
      const f = path.join(stagingDir, 'backups', rel);
      if (!fs.existsSync(f) || sha256File(f) !== backupSums[rel]) problems.push(`backup cũ sai/thiếu: ${rel}`);
    }
    if (problems.length) throw new MigrationError('STAGING_VERIFY_FAILED', problems.slice(0, 5).join('; '));
    if (hooks.afterStaging) hooks.afterStaging({ stagingDir });

    // Commit.
    fs.mkdirSync(dataDir, { recursive: true });
    moveEntry(stageDb, targetDb);
    track({ type: 'file', path: targetDb });
    if (hooks.afterDatabaseMoved) hooks.afterDatabaseMoved({ targetDb });

    const stageUploads = path.join(stagingDir, 'uploads');
    const targetUploads = path.join(dataDir, 'uploads');
    if (fs.existsSync(stageUploads)) {
      const targetEmpty = !fs.existsSync(targetUploads) || listFilesRecursive(targetUploads).length === 0;
      if (targetEmpty) {
        const existedBefore = fs.existsSync(targetUploads);
        if (existedBefore) fs.rmSync(targetUploads, { recursive: true, force: true }); // thư mục rỗng do app tạo
        moveEntry(stageUploads, targetUploads);
        track({ type: 'dir', path: targetUploads });
      } else {
        for (const rel of uploadFiles) {
          const dst = path.join(targetUploads, rel);
          if (fs.existsSync(dst)) continue; // không ghi đè
          copyFileExclusive(path.join(stageUploads, rel), dst);
          track({ type: 'file', path: dst });
        }
      }
    }

    // Backup cũ: giữ nguyên; trùng tên khác nội dung → đổi tên .legacy-N (không ghi đè).
    const targetBackups = path.join(dataDir, 'backups');
    for (const rel of backupFiles) {
      const src = path.join(stagingDir, 'backups', rel);
      let dst = path.join(targetBackups, rel);
      if (fs.existsSync(dst)) {
        if (sha256File(dst) === backupSums[rel]) continue; // cùng nội dung → đã có
        let n = 1;
        while (fs.existsSync(`${dst}.legacy-${n}`)) n += 1;
        dst = `${dst}.legacy-${n}`;
      }
      copyFileExclusive(src, dst);
      track({ type: 'file', path: dst });
    }

    // Verify cuối trên DB ĐÃ ở vị trí đích.
    const finalInfo = inspectDatabase(targetDb);
    const finalProblems = compareInspections(source, finalInfo);
    for (const rel of uploadFiles) {
      const f = path.join(targetUploads, rel);
      if (!fs.existsSync(f)) finalProblems.push(`upload thiếu sau commit: ${rel}`);
    }
    if (finalProblems.length) throw new MigrationError('FINAL_VERIFY_FAILED', finalProblems.slice(0, 5).join('; '));
    if (hooks.beforeMarker) hooks.beforeMarker({ targetDb });

    // Chỉ SAU KHI verification PASS mới ghi marker complete.
    cleanupStaging(stagingDir);
    writeState(userDataDir, {
      status: 'complete',
      id,
      legacyDir: legacy.legacyDir,
      backupId: backup.backupId,
      startedAt: state.startedAt,
      completedAt: new Date().toISOString(),
      appVersion: version,
      verified: { integrity: finalInfo.integrity, tables: finalInfo.tables.length, rows: finalInfo.counts, uploads: uploadFiles.length, backups: backupFiles.length },
    });
    logger.info(`[migration] hoàn tất (${finalInfo.tables.length} bảng, ${uploadFiles.length} file upload).`);
    return { status: 'migrated', backupId: backup.backupId, backupDir: backup.dir, tables: finalInfo.tables.length, uploads: uploadFiles.length, backups: backupFiles.length, recovered };
  } catch (err) {
    logger.error(`[migration] THẤT BẠI (${err.code || 'ERR'}): ${err.message} — rollback.`);
    rollbackMoved(state, logger);
    cleanupStaging(stagingDir);
    writeState(userDataDir, { ...state, status: 'rolled-back', moved: [], error: { code: err.code || 'MIGRATION_FAILED', message: String(err.message).slice(0, 300) } });
    return { status: 'failed', code: err.code || 'MIGRATION_FAILED', message: err.message, rolledBack: true, backupId: state.backupId, recovered };
  }
}

module.exports = {
  runMigration,
  detectLegacy,
  createSafetyBackup,
  verifySafetyBackup,
  inspectDatabase,
  compareInspections,
  readState,
  sha256File,
  MigrationError,
  DB_NAME,
  STATE_FILE,
};
