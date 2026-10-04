/**
 * Phase 12 — EduMaster.exe + Windows Installer.
 *
 * PHÂN LOẠI (trung thực):
 *   - STATIC  : đọc cấu hình/mã nguồn.
 *   - UNIT    : chạy mã thật với dữ liệu TẠM (bridge dùng runner giả — KHÔNG gọi PowerPoint thật).
 *   - ARTIFACT: chỉ chạy khi release/ hoặc desktop/.stage đã được build (bỏ qua có ghi rõ nếu chưa build).
 * Smoke Electron/PowerPoint/Installer THẬT chạy riêng (xem docs/phase-12-desktop-installer-report.md).
 * Mọi test migration dùng thư mục tạm, KHÔNG chạm %APPDATA%\EduMaster hay DB phát triển thật.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'EduMaster-Phase12-'));
const { DatabaseSync } = require('node:sqlite');

const desk = (...p) => require(path.join(REPO, 'desktop', ...p));
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(REPO, ...p), 'utf8'));
const read = (...p) => fs.readFileSync(path.join(REPO, ...p), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let counter = 0;
const tmp = (name) => {
  const d = path.join(TMP, `${name}-${++counter}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
};

// Dữ liệu "cũ" (chế độ Web): edumaster.sqlite + uploads/presentations + backups.
function makeLegacy({ rows = 3, pptx = true, backups = true } = {}) {
  const dir = tmp('legacy');
  const db = new DatabaseSync(path.join(dir, 'edumaster.sqlite'));
  db.exec(`
    CREATE TABLE classes (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE students (id INTEGER PRIMARY KEY, class_id TEXT, name TEXT);
    CREATE TABLE lessons (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO app_settings VALUES ('school_year', '2025 - 2026');
  `);
  for (let i = 0; i < rows; i += 1) {
    db.prepare('INSERT INTO classes VALUES (?, ?)').run(`c${i}`, `Lớp ${i}`);
    db.prepare('INSERT INTO students (class_id, name) VALUES (?, ?)').run(`c${i}`, `HS ${i}`);
    db.prepare('INSERT INTO lessons VALUES (?, ?)').run(`l${i}`, `Bài ${i}`);
  }
  db.close();
  if (pptx) {
    const p = path.join(dir, 'uploads', 'presentations', 'l0');
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, 'original.pptx'), crypto.randomBytes(4096));
    fs.writeFileSync(path.join(p, 'presentation.pdf'), crypto.randomBytes(512));
  }
  if (backups) {
    const b = path.join(dir, 'backups', 'EduMaster-Backup-old');
    fs.mkdirSync(b, { recursive: true });
    fs.writeFileSync(path.join(b, 'manifest.json'), '{"formatVersion":1}');
    fs.writeFileSync(path.join(b, 'database.sqlite'), crypto.randomBytes(256));
  }
  return dir;
}

function treeHash(root) {
  const out = {};
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else out[path.relative(root, f)] = sha(f);
    }
  })(root);
  return out;
}

const quietLogger = { info() {}, warn() {}, error() {} };
function migrateOnce(legacyDir, extra = {}) {
  const userData = extra.userData || tmp('userdata');
  const dataDir = extra.dataDir || path.join(userData, 'data');
  const { runMigration } = desk('migration', 'legacyMigration.cjs');
  const result = runMigration({ userDataDir: userData, dataDir, candidates: [legacyDir], logger: quietLogger, version: '1.0.0', hooks: extra.hooks });
  return { result, userData, dataDir };
}

describe('Phase 12: Desktop Installer', () => {
  after(() => {
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ------------------------------------------------------------------ PACKAGING (STATIC/UNIT)
  test('1. package config tồn tại (STATIC)', () => {
    const cfg = readJson('desktop', 'electron-builder.json');
    assert.equal(typeof cfg, 'object');
    assert.ok(fs.existsSync(path.join(REPO, 'desktop', 'scripts', 'stage.cjs')));
    assert.ok(fs.existsSync(path.join(REPO, 'desktop', 'build', 'EduMaster.ico')) || fs.existsSync(path.join(REPO, 'desktop', 'scripts', 'make-placeholder-icon.cjs')));
  });

  test('2. productName = EduMaster, không dùng tên Electron mặc định (STATIC)', () => {
    const cfg = readJson('desktop', 'electron-builder.json');
    assert.equal(cfg.productName, 'EduMaster');
    assert.ok(!/electron/i.test(cfg.productName));
    assert.ok(!/electron/i.test(cfg.appId));
  });

  test('3. appId ổn định và hợp lệ (STATIC)', () => {
    const cfg = readJson('desktop', 'electron-builder.json');
    assert.match(cfg.appId, /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/);
  });

  test('4. artifactName = EduMaster-Setup.exe; exe = EduMaster.exe (STATIC)', () => {
    const cfg = readJson('desktop', 'electron-builder.json');
    assert.equal(cfg.win.artifactName, 'EduMaster-Setup.exe');
    assert.deepEqual(cfg.win.target.map((t) => t.target), ['nsis']);
    assert.equal(cfg.productName + '.exe', 'EduMaster.exe');
  });

  test('5. Electron/electron-builder chỉ nằm trong desktop/, không vào root (STATIC)', () => {
    const root = readJson('package.json');
    const rootDeps = Object.keys({ ...root.dependencies, ...root.devDependencies, ...root.optionalDependencies });
    assert.deepEqual(rootDeps.filter((d) => /electron|tauri|nsis/i.test(d)), []);
    const d = readJson('desktop', 'package.json');
    assert.ok(d.devDependencies.electron);
    assert.ok(d.devDependencies['electron-builder']);
    assert.ok(!d.dependencies, 'desktop không có runtime dependencies');
    assert.equal(d.main, 'main/main.cjs');
  });

  test('6. Script production rõ ràng, không phá script cũ (STATIC)', () => {
    const s = readJson('package.json').scripts;
    for (const k of ['dev', 'build', 'lint', 'test', 'desktop', 'desktop:smoke', 'desktop:smoke:powerpoint']) assert.ok(s[k], k);
    assert.equal(s.dev, 'vite');
    for (const k of ['desktop:build', 'desktop:dist', 'desktop:installer']) assert.ok(s[k], k);
    assert.match(s['desktop:build'], /npm run build/);
    assert.match(s['desktop:installer'], /desktop:build/);
    const ds = readJson('desktop', 'package.json').scripts;
    assert.ok(ds.dist && ds.installer && ds.stage);
    // Single version source: desktop khớp root, stage đọc từ root.
    assert.equal(readJson('desktop', 'package.json').version, readJson('package.json').version);
    assert.match(read('desktop', 'scripts', 'stage.cjs'), /rootPkg\.version/);
  });

  test('7. Cấu hình installer NSIS an toàn dữ liệu (STATIC)', () => {
    const n = readJson('desktop', 'electron-builder.json').nsis;
    assert.equal(n.oneClick, false);
    assert.equal(n.deleteAppDataOnUninstall, false, 'uninstall KHÔNG xóa dữ liệu người dùng');
    assert.equal(n.createStartMenuShortcut, true);
    assert.equal(n.allowToChangeInstallationDirectory, true);
    assert.equal(n.shortcutName, 'EduMaster');
  });

  test('8. asar hợp lệ: script ngoài được unpack, dữ liệu không nằm trong asar (STATIC)', () => {
    const cfg = readJson('desktop', 'electron-builder.json');
    assert.equal(cfg.asar, true);
    const unpack = cfg.asarUnpack.join('|');
    assert.match(unpack, /\.ps1/);
    assert.match(unpack, /\.py/);
    for (const f of ['desktop/native/powerpoint-bridge.ps1', 'server/pptx-renderer.ps1', 'server/pptx-renderer-fallback.py']) {
      assert.ok(fs.existsSync(path.join(REPO, f)), f);
    }
    const files = cfg.files.join('|');
    for (const x of ['.env', '.sqlite', 'uploads', 'backups', 'settings']) assert.ok(files.includes(x), `files phải loại ${x}`);
  });

  test('9. extraResources/files không chứa dữ liệu người dùng (STATIC)', () => {
    const cfg = readJson('desktop', 'electron-builder.json');
    const extra = JSON.stringify(cfg.extraResources || []);
    assert.doesNotMatch(extra, /sqlite|uploads|backups|\.env|settings/i);
    const stageSrc = read('desktop', 'scripts', 'stage.cjs');
    assert.match(stageSrc, /ALWAYS_EXCLUDE_NAMES/);
    assert.match(stageSrc, /scanDirectory/);
  });

  test('10. User data nằm ngoài Program Files (UNIT)', () => {
    const { resolveDataDir } = desk('config', 'desktopConfig.cjs');
    const ud = 'C:\\Users\\u\\AppData\\Roaming\\EduMaster';
    const data = resolveDataDir(ud, {});
    assert.equal(data, path.join(ud, 'data'));
    assert.ok(!/Program Files/i.test(data));
    const main = stripComments(read('desktop', 'main', 'main.cjs'));
    assert.match(main, /app\.getPath\('userData'\)/);
    assert.match(main, /app\.isPackaged \? \{\} : process\.env/, 'bản đóng gói bỏ qua EDUICT_DATA_DIR của máy');
    assert.doesNotMatch(main, /resourcesPath[\s\S]{0,40}data|execPath[\s\S]{0,40}data/);
  });

  test('11. DB path trỏ vào user data (UNIT)', async () => {
    const { buildBackendEnv } = desk('config', 'desktopConfig.cjs');
    const dataDir = tmp('data');
    const env = buildBackendEnv({ appRoot: 'C:\\Program Files\\EduMaster\\resources\\app.asar', dataDir, port: 1, baseEnv: { EDUICT_DB_PATH: 'D:/x.sqlite' }, environment: 'production' });
    assert.ok(!('EDUICT_DB_PATH' in env));
    assert.equal(env.EDUICT_ENV, 'production');
    assert.equal(env.EDUICT_RUNTIME, 'desktop');
    const ps = await import('../server/services/pathService.js');
    const saved = { ...process.env };
    Object.assign(process.env, { EDUICT_DATA_DIR: dataDir, EDUICT_DB_PATH: '' });
    try {
      assert.equal(ps.getDatabasePath(), path.join(dataDir, 'edumaster.sqlite'));
      assert.ok(!ps.getDatabasePath().includes('Program Files'));
    } finally {
      process.env.EDUICT_DATA_DIR = saved.EDUICT_DATA_DIR || '';
      if (saved.EDUICT_DATA_DIR === undefined) delete process.env.EDUICT_DATA_DIR;
      if (saved.EDUICT_DB_PATH === undefined) delete process.env.EDUICT_DB_PATH; else process.env.EDUICT_DB_PATH = saved.EDUICT_DB_PATH;
    }
  });

  test('12. Backup path nằm trong user data (UNIT)', async () => {
    const ps = await import('../server/services/pathService.js');
    const dataDir = tmp('data');
    const prev = process.env.EDUICT_DATA_DIR;
    process.env.EDUICT_DATA_DIR = dataDir;
    try {
      for (const fn of ['getBackupDir', 'getUploadsDir', 'getPresentationsDir', 'getSettingsDir', 'getLocksDir', 'getLogsDir']) {
        assert.ok(ps[fn]().startsWith(dataDir), fn);
      }
    } finally {
      if (prev === undefined) delete process.env.EDUICT_DATA_DIR; else process.env.EDUICT_DATA_DIR = prev;
    }
  });

  test('13. Log nằm trong user data (STATIC)', () => {
    const main = stripComments(read('desktop', 'main', 'main.cjs'));
    assert.match(main, /createLogger\(path\.join\(dataDir, 'logs'\)\)/);
    assert.match(main, /uncaughtException/);
    assert.match(main, /render-process-gone/);
    const { redact } = desk('main', 'logger.cjs');
    assert.equal(redact('x AIzaSyA1234567890123456789012345678901 y'), 'x [REDACTED] y');
  });

  test('14. .env không được đóng gói; stage (nếu đã build) sạch secret (STATIC+ARTIFACT)', () => {
    const cfg = readJson('desktop', 'electron-builder.json');
    assert.ok(cfg.files.includes('!**/.env'));
    assert.ok(cfg.files.includes('!**/.env.*'));
    const { scanDirectory, loadRealSecretLiterals } = desk('scripts', 'secretScan.cjs');
    const stage = path.join(REPO, 'desktop', '.stage', 'app');
    if (!fs.existsSync(stage)) return; // ARTIFACT chưa build → bỏ qua (ghi trong báo cáo)
    const r = scanDirectory(stage, { literals: loadRealSecretLiterals(REPO) });
    assert.deepEqual(r.findings, []);
    assert.ok(!fs.existsSync(path.join(stage, '.env')));
  });

  test('15. Gemini key không có trong renderer/preload/desktop (STATIC)', () => {
    const { scanDirectory, loadRealSecretLiterals } = desk('scripts', 'secretScan.cjs');
    const literals = loadRealSecretLiterals(REPO);
    for (const sub of ['src', 'dist', path.join('desktop', 'main'), path.join('desktop', 'preload'), path.join('desktop', 'native'), path.join('desktop', 'config'), path.join('desktop', 'migration')]) {
      const dir = path.join(REPO, sub);
      if (!fs.existsSync(dir)) continue;
      assert.deepEqual(scanDirectory(dir, { literals }).findings, [], sub);
    }
    // scanner thật sự phát hiện: tự kiểm bằng khóa giả trong thư mục tạm.
    const probe = tmp('probe');
    fs.writeFileSync(path.join(probe, 'a.js'), `const k='AIza${'B'.repeat(35)}';`);
    fs.writeFileSync(path.join(probe, '.env'), 'GEMINI_API_KEY=x');
    const kinds = scanDirectory(probe).findings.map((f) => f.kind);
    assert.ok(kinds.includes('google-api-key-pattern'));
    assert.ok(kinds.includes('forbidden-file'));
  });

  test('16. node:sqlite được giữ nguyên (không đổi SQLite engine) (STATIC)', () => {
    const root = readJson('package.json');
    const all = Object.keys({ ...root.dependencies, ...root.devDependencies });
    assert.deepEqual(all.filter((d) => /better-sqlite3|^sqlite3$|sql\.js|sqlite$/i.test(d)), []);
    assert.match(read('server', 'db', 'connection.js'), /node:sqlite/);
    const stagePkgTemplate = read('desktop', 'scripts', 'stage.cjs');
    assert.doesNotMatch(stagePkgTemplate, /better-sqlite3/);
  });

  test('17. Embedded Node (ELECTRON_RUN_AS_NODE), không cần Node hệ thống (STATIC+UNIT)', () => {
    const { buildBackendEnv } = desk('config', 'desktopConfig.cjs');
    const env = buildBackendEnv({ appRoot: REPO, dataDir: tmp('d'), port: 9, asNode: true });
    assert.equal(env.ELECTRON_RUN_AS_NODE, '1');
    const main = stripComments(read('desktop', 'main', 'main.cjs'));
    assert.match(main, /execPath:\s*process\.execPath/);
    assert.match(main, /asNode:\s*true/);
    for (const f of ['main.cjs', 'backendProcess.cjs']) {
      const src = stripComments(read('desktop', 'main', f));
      assert.doesNotMatch(src, /['"]node(\.exe)?['"]/, f);
      assert.doesNotMatch(src, /\b(npm|npx)\b/, f);
    }
    const bp = stripComments(read('desktop', 'main', 'backendProcess.cjs'));
    assert.match(bp, /cwd:\s*dataDir/, 'cwd là thư mục thật (appRoot nằm trong asar)');
  });

  test('18. Web Mode không đổi (UNIT)', async () => {
    const rc = await import('../server/services/runtimeConfig.js');
    assert.equal(rc.detectRuntime({}), 'web');
    const ps = await import('../server/services/pathService.js');
    const savedRuntime = process.env.EDUICT_RUNTIME;
    delete process.env.EDUICT_RUNTIME;
    try {
      assert.equal(ps.getEnvPath(), path.join(ps.getAppRoot(), '.env'));
      assert.equal(ps.getRendererScript(), path.join(ps.getServerDir(), 'pptx-renderer.ps1'));
    } finally {
      if (savedRuntime !== undefined) process.env.EDUICT_RUNTIME = savedRuntime;
    }
    assert.equal(ps.toUnpackedPath('C:\\Program Files\\EduMaster\\resources\\app.asar\\server\\pptx-renderer.ps1'),
      'C:\\Program Files\\EduMaster\\resources\\app.asar.unpacked\\server\\pptx-renderer.ps1');
    assert.equal(ps.toUnpackedPath('D:\\x\\server\\a.ps1'), 'D:\\x\\server\\a.ps1');
    assert.equal(readJson('package.json').scripts.dev, 'vite');
    // Web mode không phụ thuộc electron-builder / desktop/.
    const comLock = read('server', 'pptxService.js');
    assert.match(comLock, /EDUICT_RUNTIME[\s\S]{0,80}'desktop'\) return fn\(\)/);
  });

  test('19. Desktop Mode được giữ nguyên các ràng buộc bảo mật Phase 11 (STATIC)', () => {
    const { WEB_PREFERENCES, BACKEND_HOST } = desk('config', 'desktopConfig.cjs');
    assert.equal(WEB_PREFERENCES.contextIsolation, true);
    assert.equal(WEB_PREFERENCES.nodeIntegration, false);
    assert.equal(WEB_PREFERENCES.sandbox, true);
    assert.equal(BACKEND_HOST, '127.0.0.1');
    assert.doesNotMatch(read('desktop', 'main', 'backendProcess.cjs'), /0\.0\.0\.0/);
    assert.match(read('server', 'services', 'pathService.js'), /'settings', '\.env'/, 'desktop đọc .env từ settings người dùng');
    assert.match(read('desktop', 'main', 'main.cjs'), /dir: |lockDir: path\.join\(dataDir, 'locks'\)/);
  });

  test('20. Single instance (STATIC)', () => {
    const main = read('desktop', 'main', 'main.cjs');
    assert.match(main, /requestSingleInstanceLock\(\)/);
    assert.match(main, /second-instance/);
    assert.match(main, /mainWindow\.focus\(\)/);
  });

  test('20b. Font cục bộ, không CDN (STATIC)', () => {
    for (const f of [['index.html'], ['src', 'index.css'], ['src', 'main.jsx']]) assert.doesNotMatch(read(...f), /fonts\.googleapis|fonts\.gstatic/, f.join('/'));
    assert.match(read('src', 'main.jsx'), /@fontsource\/outfit/);
    const dist = path.join(REPO, 'dist');
    if (fs.existsSync(path.join(dist, 'index.html'))) assert.doesNotMatch(fs.readFileSync(path.join(dist, 'index.html'), 'utf8'), /fonts\.googleapis/);
  });

  // ------------------------------------------------------------------ MIGRATION (UNIT, dữ liệu tạm)
  test('21. Không có dữ liệu cũ → không migrate', () => {
    const empty = tmp('nolegacy');
    const { result, userData, dataDir } = migrateOnce(empty);
    assert.equal(result.status, 'no-legacy');
    assert.ok(!fs.existsSync(path.join(userData, 'migration-state.json')));
    assert.ok(!fs.existsSync(path.join(dataDir, 'edumaster.sqlite')));
  });

  test('22. Phát hiện dữ liệu cũ', () => {
    const { detectLegacy } = desk('migration', 'legacyMigration.cjs');
    const legacy = makeLegacy();
    const found = detectLegacy({ candidates: [null, tmp('x'), legacy], dataDir: tmp('target') });
    assert.equal(found.found, true);
    assert.equal(found.legacyDir, path.resolve(legacy));
    assert.equal(detectLegacy({ candidates: [legacy], dataDir: legacy }).found, false, 'chính data dir đích không phải legacy');
  });

  test('23. Safety backup được tạo (định dạng backup Phase 9)', () => {
    const legacy = makeLegacy();
    const { result, userData } = migrateOnce(legacy);
    assert.equal(result.status, 'migrated');
    const dir = result.backupDir;
    assert.ok(dir.startsWith(path.join(userData, 'migration-backups')));
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.formatVersion, 1);
    assert.equal(manifest.appName, 'EduMaster');
    assert.equal(manifest.kind, 'pre-migration');
    assert.ok(fs.existsSync(path.join(dir, 'database.sqlite')));
  });

  test('24. Verify backup thành công (checksum + integrity)', () => {
    const { createSafetyBackup, verifySafetyBackup } = desk('migration', 'legacyMigration.cjs');
    const legacy = makeLegacy();
    const root = tmp('bk');
    const backup = createSafetyBackup({ dbPath: path.join(legacy, 'edumaster.sqlite'), uploadsDir: path.join(legacy, 'uploads') }, root);
    const v = verifySafetyBackup(backup);
    assert.equal(backup.manifest.databaseChecksum, sha(path.join(legacy, 'edumaster.sqlite')));
    assert.equal(v.inspection.ok, true);
    assert.deepEqual(v.inspection.tables.sort(), ['app_settings', 'classes', 'lessons', 'students']);
  });

  test('25. Database được chuyển, số dòng khớp', () => {
    const legacy = makeLegacy({ rows: 5 });
    const { result, dataDir } = migrateOnce(legacy);
    assert.equal(result.status, 'migrated');
    const { inspectDatabase } = desk('migration', 'legacyMigration.cjs');
    const info = inspectDatabase(path.join(dataDir, 'edumaster.sqlite'));
    assert.equal(info.counts.classes, 5);
    assert.equal(info.counts.students, 5);
    assert.equal(info.counts.lessons, 5);
    assert.equal(info.schoolYear, '2025 - 2026');
  });

  test('26. SQLite integrity check thành công sau migration', () => {
    const { result, dataDir } = migrateOnce(makeLegacy());
    assert.equal(result.status, 'migrated');
    const db = new DatabaseSync(path.join(dataDir, 'edumaster.sqlite'));
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    db.close();
  });

  test('27. Migration marker chỉ ghi sau verification', () => {
    const legacy = makeLegacy();
    const { readState } = desk('migration', 'legacyMigration.cjs');
    let markerSeenBeforeVerify = null;
    const userData = tmp('ud');
    const { result } = migrateOnce(legacy, {
      userData,
      hooks: { beforeMarker: () => { markerSeenBeforeVerify = readState(userData); } },
    });
    assert.equal(result.status, 'migrated');
    assert.equal(markerSeenBeforeVerify.status, 'in-progress', 'trước verify chưa được đánh dấu complete');
    const state = readState(userData);
    assert.equal(state.status, 'complete');
    assert.equal(state.verified.integrity, 'ok');
    assert.ok(state.verified.tables >= 4);
  });

  test('28. Chạy lần hai là idempotent', () => {
    const legacy = makeLegacy();
    const first = migrateOnce(legacy);
    assert.equal(first.result.status, 'migrated');
    const dbFile = path.join(first.dataDir, 'edumaster.sqlite');
    // người dùng thêm dữ liệu mới ở bản Desktop
    const db = new DatabaseSync(dbFile);
    db.prepare('INSERT INTO classes VALUES (?, ?)').run('new', 'Lớp mới');
    db.close();
    const before = sha(dbFile);
    const second = migrateOnce(legacy, { userData: first.userData, dataDir: first.dataDir });
    assert.equal(second.result.status, 'skipped');
    assert.equal(second.result.reason, 'already-complete');
    assert.equal(sha(dbFile), before, 'không migrate lại / không ghi đè dữ liệu mới');
  });

  test('29. Migration lỗi → rollback, dữ liệu cũ và đích nguyên vẹn', () => {
    const legacy = makeLegacy();
    const legacyBefore = treeHash(legacy);
    const { readState } = desk('migration', 'legacyMigration.cjs');
    for (const hookName of ['afterDatabaseMoved', 'beforeMarker']) {
      const userData = tmp('ud');
      const { result, dataDir } = migrateOnce(legacy, {
        userData,
        hooks: { [hookName]: () => { throw new Error('inject-fail'); } },
      });
      assert.equal(result.status, 'failed', hookName);
      assert.equal(result.rolledBack, true);
      assert.ok(!fs.existsSync(path.join(dataDir, 'edumaster.sqlite')), `${hookName}: DB đích đã được gỡ`);
      assert.ok(!fs.existsSync(path.join(dataDir, 'uploads')), `${hookName}: uploads đích đã được gỡ`);
      assert.equal(readState(userData).status, 'rolled-back');
      assert.deepEqual(treeHash(legacy), legacyBefore, 'dữ liệu cũ KHÔNG bị thay đổi');
      assert.ok(fs.readdirSync(userData).every((n) => !n.startsWith('.migration-staging')), 'staging đã dọn');
    }
    // Sau lỗi, chạy lại (không lỗi) phải thành công.
    const retry = migrateOnce(legacy);
    assert.equal(retry.result.status, 'migrated');
  });

  test('30. Backup hỏng chặn migration', () => {
    const legacy = makeLegacy();
    const { result, dataDir, userData } = migrateOnce(legacy, {
      hooks: {
        beforeBackupVerify: ({ backupDir }) => {
          fs.appendFileSync(path.join(backupDir, 'database.sqlite'), Buffer.from('corrupt'));
        },
      },
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.code, 'BACKUP_VERIFY_FAILED');
    assert.ok(!fs.existsSync(path.join(dataDir, 'edumaster.sqlite')));
    const state = desk('migration', 'legacyMigration.cjs').readState(userData);
    assert.notEqual(state.status, 'complete');
  });

  test('31. Uploads được chuyển nguyên vẹn (SHA-256)', () => {
    const legacy = makeLegacy();
    const { result, dataDir } = migrateOnce(legacy);
    assert.equal(result.status, 'migrated');
    const src = treeHash(path.join(legacy, 'uploads'));
    const dst = treeHash(path.join(dataDir, 'uploads'));
    assert.deepEqual(dst, src);
    assert.ok(Object.keys(dst).length >= 2);
  });

  test('32. original.pptx giữ nguyên là nguồn sự thật', () => {
    const legacy = makeLegacy();
    const srcPptx = path.join(legacy, 'uploads', 'presentations', 'l0', 'original.pptx');
    const { dataDir } = migrateOnce(legacy);
    const dstPptx = path.join(dataDir, 'uploads', 'presentations', 'l0', 'original.pptx');
    assert.ok(fs.existsSync(dstPptx));
    assert.equal(sha(dstPptx), sha(srcPptx));
    assert.equal(fs.statSync(dstPptx).size, 4096);
    assert.ok(fs.existsSync(srcPptx), 'file gốc cũ không bị xóa');
  });

  test('33. Backup cũ được giữ nguyên, không ghi đè file trùng tên', () => {
    const legacy = makeLegacy();
    const userData = tmp('ud');
    const dataDir = path.join(userData, 'data');
    // File trùng tên nhưng khác nội dung đã có ở đích → phải giữ cả hai.
    const collide = path.join(dataDir, 'backups', 'EduMaster-Backup-old', 'manifest.json');
    fs.mkdirSync(path.dirname(collide), { recursive: true });
    fs.writeFileSync(collide, '{"mine":true}');
    const legacyBefore = treeHash(path.join(legacy, 'backups'));
    const { result } = migrateOnce(legacy, { userData, dataDir });
    assert.equal(result.status, 'migrated');
    assert.equal(fs.readFileSync(collide, 'utf8'), '{"mine":true}', 'file đích không bị ghi đè');
    assert.ok(fs.existsSync(`${collide}.legacy-1`), 'bản cũ được giữ với hậu tố .legacy-N');
    assert.ok(fs.existsSync(path.join(dataDir, 'backups', 'EduMaster-Backup-old', 'database.sqlite')));
    assert.deepEqual(treeHash(path.join(legacy, 'backups')), legacyBefore, 'backup cũ không bị xóa/sửa');
  });

  test('34. Dữ liệu đích nằm ngoài thư mục ứng dụng; đích đã có DB thì không ghi đè', () => {
    const legacy = makeLegacy();
    const userData = tmp('ud');
    const dataDir = path.join(userData, 'data');
    assert.ok(!dataDir.startsWith(REPO));
    assert.ok(!/Program Files/i.test(dataDir));
    // Đích đã có DB → SKIP + không đổi.
    fs.mkdirSync(dataDir, { recursive: true });
    const existing = path.join(dataDir, 'edumaster.sqlite');
    const db = new DatabaseSync(existing);
    db.exec('CREATE TABLE keep (x INTEGER); INSERT INTO keep VALUES (42);');
    db.close();
    const before = sha(existing);
    const { result } = migrateOnce(legacy, { userData, dataDir });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'target-has-data');
    assert.equal(sha(existing), before);
  });

  test('34b. Migration dang dở được phát hiện và khôi phục', () => {
    const legacy = makeLegacy();
    const userData = tmp('ud');
    const dataDir = path.join(userData, 'data');
    // Mô phỏng tiến trình chết giữa chừng: DB đã commit vào đích nhưng state vẫn in-progress.
    fs.mkdirSync(dataDir, { recursive: true });
    const half = path.join(dataDir, 'edumaster.sqlite');
    fs.copyFileSync(path.join(legacy, 'edumaster.sqlite'), half);
    fs.writeFileSync(path.join(userData, 'migration-state.json'), JSON.stringify({
      status: 'in-progress', id: 'x', stagingDir: path.join(userData, '.migration-staging-x'), moved: [{ type: 'file', path: half }],
    }));
    const { result } = migrateOnce(legacy, { userData, dataDir });
    assert.equal(result.status, 'migrated');
    assert.equal(result.recovered, true);
    assert.equal(desk('migration', 'legacyMigration.cjs').readState(userData).status, 'complete');
  });

  test('34c. Update guard: backup khi đổi phiên bản, khôi phục khi backend không lên', () => {
    const { ensureUpdateBackup, restoreDatabaseFromBackup, writeVersionState } = desk('migration', 'updateGuard.cjs');
    const userData = tmp('ud');
    const dataDir = path.join(userData, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    assert.equal(ensureUpdateBackup({ userDataDir: userData, dataDir, version: '1.0.0' }).status, 'first-run');
    const legacy = makeLegacy();
    fs.copyFileSync(path.join(legacy, 'edumaster.sqlite'), path.join(dataDir, 'edumaster.sqlite'));
    writeVersionState(userData, '1.0.0');
    assert.equal(ensureUpdateBackup({ userDataDir: userData, dataDir, version: '1.0.0' }).status, 'same-version');
    const g = ensureUpdateBackup({ userDataDir: userData, dataDir, version: '1.1.0' });
    assert.equal(g.status, 'backed-up');
    assert.equal(g.fromVersion, '1.0.0');
    assert.ok(g.backup.backupId.includes('preupdate-1.0.0-to-1.1.0'));
    // Backend mới làm hỏng DB → khôi phục từ backup.
    const dbFile = path.join(dataDir, 'edumaster.sqlite');
    const good = sha(dbFile);
    fs.writeFileSync(dbFile, 'broken');
    const r = restoreDatabaseFromBackup({ backup: g.backup, dataDir });
    assert.equal(r.ok, true);
    assert.equal(sha(dbFile), good);
    assert.ok(fs.existsSync(r.keptFailedCopy), 'bản lỗi được giữ lại để chẩn đoán');
  });

  // ------------------------------------------------------------------ POWERPOINT (UNIT với runner giả; STATIC)
  const { createPowerPointBridge } = desk('native', 'powerpointBridge.cjs');
  const { BRIDGE_METHODS } = desk('native', 'bridgeMethods.cjs');

  function makePresentations() {
    const uploadsDir = tmp('uploads');
    const f = path.join(uploadsDir, 'presentations', 'les1', 'original.pptx');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, 'pptx');
    return { uploadsDir, file: f };
  }

  test('35. Phát hiện PowerPoint (UNIT, runner giả)', async () => {
    const yes = createPowerPointBridge({ platform: 'win32', runner: async () => ({ ok: true, installed: true }) });
    assert.deepEqual(await yes.probe(), { installed: true });
    const no = createPowerPointBridge({ platform: 'win32', runner: async () => ({ ok: true, installed: false }) });
    assert.deepEqual(await no.probe(), { installed: false });
    const linux = createPowerPointBridge({ platform: 'linux', runner: async () => ({}) });
    assert.deepEqual(await linux.probe(), { installed: false });
  });

  test('36. Thiếu PowerPoint → lỗi có cấu trúc, không crash (UNIT)', async () => {
    const { uploadsDir, file } = makePresentations();
    const b = createPowerPointBridge({ platform: 'win32', uploadsDir, runner: async () => ({ ok: false, code: 'POWERPOINT_NOT_INSTALLED' }) });
    const res = await b.openPowerPoint(file);
    assert.equal(res.ok, false);
    assert.equal(res.code, 'POWERPOINT_NOT_INSTALLED');
    assert.match(res.message, /PowerPoint/);
    const thrower = createPowerPointBridge({ platform: 'win32', uploadsDir, runner: async () => { throw Object.assign(new Error('x'), { code: 'POWERPOINT_UNAVAILABLE' }); } });
    assert.equal((await thrower.openPowerPoint(file)).ok, false);
    const web = createPowerPointBridge({ platform: 'linux', uploadsDir, runner: async () => ({}) });
    assert.equal((await web.getStatus()).code, 'DESKTOP_BRIDGE_UNAVAILABLE');
  });

  test('37. Kiểm tra original.pptx tồn tại (UNIT)', async () => {
    const { uploadsDir, file } = makePresentations();
    const calls = [];
    const b = createPowerPointBridge({ platform: 'win32', uploadsDir, runner: async (a, p) => { calls.push([a, p]); return { ok: true, opened: true }; } });
    const missing = await b.openPowerPoint('/uploads/presentations/nope/original.pptx');
    assert.equal(missing.code, 'PRESENTATION_NOT_FOUND');
    assert.equal((await b.openPowerPoint('/uploads/presentations/../../secret.pptx')).code, 'INVALID_PRESENTATION_PATH');
    assert.equal(calls.length, 0, 'không chạm PowerPoint khi file không hợp lệ');
    assert.equal((await b.openPowerPoint(file)).opened, true);
  });

  test('38. Mở PowerPoint qua bridge (UNIT)', async () => {
    const { uploadsDir, file } = makePresentations();
    const seen = [];
    const b = createPowerPointBridge({ platform: 'win32', uploadsDir, runner: async (a, p) => { seen.push({ a, p }); return { ok: true, opened: true, name: 'original.pptx', slideCount: 3 }; } });
    const res = await b.openPowerPoint(file);
    assert.equal(res.ok !== false && res.opened, true);
    assert.equal(seen[0].a, 'Open');
    assert.equal(fs.realpathSync(seen[0].p.path), fs.realpathSync(file));
  });

  test('39. Mở bài trình chiếu bằng URL /uploads/presentations/<id>/original.pptx (UNIT)', async () => {
    const { uploadsDir } = makePresentations();
    const seen = [];
    const b = createPowerPointBridge({ platform: 'win32', uploadsDir, runner: async (a, p) => { seen.push(p); return { ok: true, opened: true }; } });
    const res = await b.openPowerPoint('/uploads/presentations/les1/original.pptx');
    assert.equal(res.opened, true);
    assert.ok(seen[0].path.endsWith(path.join('presentations', 'les1', 'original.pptx')));
  });

  test('40. Bridge còn nguyên sau đóng gói (STATIC + ARTIFACT)', () => {
    assert.deepEqual(Object.keys(createPowerPointBridge({ platform: 'win32', runner: async () => ({}) })).filter((k) => BRIDGE_METHODS.includes(k)).sort(), [...BRIDGE_METHODS].sort());
    const bridgeSrc = read('desktop', 'native', 'powerpointBridge.cjs');
    assert.match(bridgeSrc, /app\\\.asar\(\?=/, 'script PowerShell phải được ánh xạ sang app.asar.unpacked');
    const unpackedPs1 = path.join(REPO, 'release', 'win-unpacked', 'resources', 'app.asar.unpacked', 'desktop', 'native', 'powerpoint-bridge.ps1');
    if (fs.existsSync(path.join(REPO, 'release', 'win-unpacked'))) assert.ok(fs.existsSync(unpackedPs1), 'ARTIFACT: ps1 nằm ngoài asar');
  });

  test('41. COM lock ngăn thao tác đồng thời (UNIT + liên tiến trình)', async () => {
    const lockMod = require(path.join(REPO, 'server', 'services', 'powerpointLock.cjs'));
    const lockDir = tmp('locks');
    // (a) hai bridge KHÁC NHAU, cùng lockDir → không bao giờ chạy chồng nhau.
    let active = 0; let maxActive = 0;
    const runner = async () => { active += 1; maxActive = Math.max(maxActive, active); await sleep(80); active -= 1; return { ok: true }; };
    const { uploadsDir } = makePresentations();
    const a = createPowerPointBridge({ platform: 'win32', runner, uploadsDir, lockDir });
    const b = createPowerPointBridge({ platform: 'win32', runner, uploadsDir, lockDir });
    await Promise.all([a.getStatus(), b.getStatus(), a.nextSlide(), b.nextSlide(), a.getStatus(), b.getStatus()]);
    assert.equal(maxActive, 1);
    // (b) liên-tiến-trình thật: tiến trình con giữ khóa 700ms.
    const child = spawn(process.execPath, ['-e', `
      const m = require(${JSON.stringify(path.join(REPO, 'server', 'services', 'powerpointLock.cjs'))});
      m.withPowerPointLock(${JSON.stringify(lockDir)}, () => new Promise(r => { console.log('HELD'); setTimeout(r, 700); }));
    `], { stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise((resolve) => child.stdout.once('data', resolve));
    const t0 = Date.now();
    await lockMod.withPowerPointLock(lockDir, async () => {});
    const waited = Date.now() - t0;
    assert.ok(waited >= 400, `phải chờ tiến trình con nhả khóa (chờ ${waited}ms)`);
    if (child.exitCode === null && child.signalCode === null) await new Promise((r) => child.once('exit', r));
    // (c) khóa mồ côi (pid đã chết) được thu hồi.
    fs.writeFileSync(path.join(lockDir, lockMod.LOCK_FILE_NAME), JSON.stringify({ pid: 2147483000, token: 'dead', ts: Date.now() }));
    const stale = await lockMod.acquire(lockDir, { acquireTimeoutMs: 2000 });
    stale.release();
    // (d) khóa đang bị giữ bởi tiến trình sống → quá hạn trả POWERPOINT_BUSY (bridge không treo).
    const held = await lockMod.acquire(lockDir);
    const busy = createPowerPointBridge({ platform: 'win32', runner: async () => ({ ok: true }), uploadsDir, lockDir, lockOptions: { acquireTimeoutMs: 250 } });
    const res = await busy.getStatus();
    assert.equal(res.ok, false);
    assert.equal(res.code, 'POWERPOINT_BUSY');
    held.release();
    assert.ok(!fs.existsSync(path.join(lockDir, lockMod.LOCK_FILE_NAME)), 'khóa được nhả sạch');
    // Renderer (backend) dùng cùng cơ chế ở desktop runtime.
    assert.match(read('server', 'pptxService.js'), /withPowerPointLock\(pathService\.getLocksDir\(\)/);
  });

  test('42. Đóng presentation chỉ trong vùng presentations của EduMaster (UNIT)', async () => {
    const { uploadsDir } = makePresentations();
    const seen = [];
    const b = createPowerPointBridge({ platform: 'win32', uploadsDir, runner: async (a, p) => { seen.push({ a, p }); return { ok: true, closed: true }; } });
    const res = await b.closePowerPoint();
    assert.equal(res.closed, true);
    assert.equal(seen[0].a, 'Close');
    assert.equal(seen[0].p.allowedRoot, path.join(uploadsDir, 'presentations'));
  });

  test('43. PowerPoint thoát sạch khi không còn bài nào (STATIC — smoke thật chạy riêng)', () => {
    const ps1 = read('desktop', 'native', 'powerpoint-bridge.ps1');
    assert.match(ps1, /Presentations\.Count -eq 0\) \{ \$app\.Quit\(\) \}/);
    assert.match(ps1, /StartsWith\(\$root/, 'chỉ đóng file thuộc vùng presentations');
    assert.match(ps1, /Open\(\$full, -1, 0, -1\)/, 'mở READ-ONLY');
  });

  test('44. UI "Mở PowerPoint": chỉ ở Desktop, trạng thái rõ ràng (STATIC)', () => {
    const btn = read('src', 'components', 'LessonPresentation', 'OpenPowerPointButton.jsx');
    assert.match(btn, /!caps \|\| !caps\.isDesktop\) return null/, 'Web mode: không hiển thị');
    assert.match(btn, /canOpenPowerPoint/);
    assert.match(btn, /Chưa cài đặt Microsoft PowerPoint/);
    assert.match(btn, /PresentationService\.openPresentation/);
    assert.doesNotMatch(btn, /child_process|window\.require/);
    assert.match(read('src', 'components', 'LessonPresentation', 'PresentationView.jsx'), /<OpenPowerPointButton sourceFilePath=\{activeLesson\?\.source_file_path\}/);
  });

  test('45. Phase 1–11 tests vẫn còn nguyên', () => {
    const files = fs.readdirSync(path.join(REPO, 'tests'));
    for (let p = 2; p <= 11; p += 1) assert.ok(files.some((f) => f.startsWith(`phase${p}-`)), `thiếu test Phase ${p}`);
    assert.ok(files.includes('smoke.test.js'));
    assert.ok(files.includes('phase11-desktop-native.test.js'));
  });

  test('46. Gitignore chặn artifact/binary/secret (STATIC)', () => {
    const gi = read('.gitignore');
    for (const p of ['release/', 'desktop/.stage/', '*.exe', '*.msi', '.env', '*.sqlite', 'backups/', 'locks/']) assert.ok(gi.includes(p), p);
    assert.ok(!/^\s*desktop\/?\s*$/m.test(gi), 'không ignore nhầm thư mục desktop/ (mã nguồn)');
    assert.ok(!/electron-builder\.json/.test(gi));
  });
});
