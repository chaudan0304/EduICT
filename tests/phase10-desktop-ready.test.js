/**
 * Phase 10 — Desktop-ready architecture.
 * Kiểm tra các ranh giới (boundary) mà KHÔNG cài Electron/Tauri và KHÔNG gọi PowerPoint thật.
 * Cô lập DB/thư mục sang thư mục tạm TRƯỚC khi import server.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_phase10_'));
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = path.join(TMP_ROOT, 'phase10.sqlite');
delete process.env.EDUICT_RUNTIME;
delete process.env.EDUICT_API_BASE_URL;

const svc = (name) => import(pathToFileURL(path.join(REPO, 'src', 'services', name)).href);

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

async function call(handleApiRequest, method, pathname) {
  const req = Readable.from(['']);
  req.method = method;
  req.url = pathname;
  req.headers = { host: 'localhost' };
  let ended;
  let body = '';
  const done = new Promise((r) => { ended = r; });
  const res = {
    statusCode: 200,
    _h: {},
    setHeader(k, v) { this._h[k] = v; },
    end(chunk) { if (chunk) body += chunk; ended(); },
  };
  const handled = await handleApiRequest(req, res);
  await done;
  return { handled, status: res.statusCode, json: body ? JSON.parse(body) : null, raw: body };
}

describe('Phase 10: Desktop-ready architecture', () => {
  after(async () => {
    try {
      (await import('../server/db/connection.js')).closeConnection();
    } catch { /* chưa mở */ }
    try { fs.rmSync(TMP_ROOT, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  test('1. RuntimeConfig hoạt động và không chứa secret', async () => {
    const rc = await import('../server/services/runtimeConfig.js');
    const cfg = rc.getRuntimeConfig();
    for (const k of ['environment', 'runtime', 'apiBaseUrl', 'paths']) assert.ok(k in cfg, k);
    assert.ok(rc.ENVIRONMENTS.includes(cfg.environment));
    assert.equal(rc.detectEnvironment({ EDUICT_ENV: 'production' }), 'production');
    assert.equal(rc.detectEnvironment({ NODE_ENV: 'test' }), 'test');
    assert.equal(rc.detectEnvironment({}), 'development');
    const serialized = JSON.stringify(cfg);
    assert.ok(!serialized.includes(TMP_ROOT), 'không lộ đường dẫn tuyệt đối');
    assert.ok(!/api[_-]?key/i.test(serialized));
  });

  test('2. Web runtime được detect đúng; desktop chỉ khi khai báo', async () => {
    const rc = await import('../server/services/runtimeConfig.js');
    assert.equal(rc.detectRuntime({}), 'web');
    assert.equal(rc.detectRuntime({ EDUICT_RUNTIME: 'nonsense' }), 'web');
    assert.equal(rc.detectRuntime({ EDUICT_RUNTIME: 'desktop' }), 'desktop');
    assert.equal(rc.getRuntimeConfig().runtime, 'web');
    assert.equal(rc.getApiBaseUrl({ EDUICT_API_BASE_URL: 'http://x/' }), 'http://x');
  });

  test('3. Desktop capability mặc định đều false', async () => {
    const { default: D } = await svc('DesktopCapabilityService.js');
    const caps = await D.getCapabilities();
    assert.equal(caps.isDesktop, false);
    assert.equal(caps.platform, 'web');
    for (const k of ['canOpenFile', 'canSelectFile', 'canSelectFolder', 'canOpenPowerPoint',
      'canControlPowerPoint', 'canShowNativeDialog', 'canAccessNativeFilesystem']) {
      assert.equal(caps[k], false, k);
    }
    // Adapter tương lai có thể bật năng lực; adapter lỗi → quay về web.
    D.registerNativeAdapter({ getCapabilities: () => ({ isDesktop: true, platform: 'windows', canOpenFile: true, bogus: true }) });
    const native = await D.getCapabilities();
    assert.equal(native.isDesktop, true);
    assert.equal(native.platform, 'windows');
    assert.equal(native.canOpenFile, true);
    assert.ok(!('bogus' in native));
    D.registerNativeAdapter({ getCapabilities: () => { throw new Error('x'); } });
    assert.equal((await D.getCapabilities()).isDesktop, false);
    D.unregisterNativeAdapter();
  });

  test('4. Không có Electron/Tauri/native dependency bắt buộc', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    const all = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies });
    const banned = /electron|tauri|neutralino|nw\.js|webview2|node-ffi|winax|edge-js/i;
    assert.deepEqual(all.filter((d) => banned.test(d)), []);
  });

  test('5. PathService trả về đường dẫn hợp lệ, user data nằm trong data dir', async () => {
    const ps = await import('../server/services/pathService.js');
    for (const fn of ['getAppDataDir', 'getDatabasePath', 'getUploadsDir', 'getPresentationsDir',
      'getBackupDir', 'getTempDir', 'getLogsDir', 'getSettingsDir']) {
      assert.equal(typeof ps[fn], 'function', fn);
      assert.ok(path.isAbsolute(ps[fn]()), fn);
    }
    const data = ps.getAppDataDir();
    for (const fn of ['getUploadsDir', 'getPresentationsDir', 'getBackupDir', 'getTempDir', 'getLogsDir', 'getSettingsDir']) {
      assert.ok(ps[fn]().startsWith(data), `${fn} phải nằm trong data dir`);
    }
    const summary = ps.getPathsSummary();
    assert.equal(summary.uploads, 'uploads');
    assert.ok(!JSON.stringify(summary).includes(TMP_ROOT));
  });

  test('6. Database path không nằm trong frontend/source/dist', async () => {
    const { getDatabasePath } = await import('../server/services/pathService.js');
    const dbPath = path.resolve(getDatabasePath());
    for (const dir of ['src', 'server', 'dist', 'public']) {
      assert.ok(!dbPath.startsWith(path.join(REPO, dir) + path.sep), `DB không được nằm trong ${dir}/`);
    }
  });

  test('7. Gemini key không xuất hiện trong frontend (src + dist)', () => {
    const files = [...walk(path.join(REPO, 'src'), ['.js', '.jsx']), ...walk(path.join(REPO, 'dist'), ['.js', '.html', '.css'])];
    const secrets = [process.env.GEMINI_API_KEY, process.env.EDUICT_TEST_SECRET].filter((s) => s && s.length > 8);
    const envFile = path.join(REPO, '.env');
    if (fs.existsSync(envFile)) {
      const m = fs.readFileSync(envFile, 'utf8').match(/^GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/m);
      if (m && m[1].length > 8 && m[1] !== 'YOUR_GEMINI_API_KEY_HERE') secrets.push(m[1]);
    }
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      assert.ok(!/AIza[0-9A-Za-z_-]{30,}/.test(text), `Mẫu Google API key trong ${path.relative(REPO, f)}`);
      for (const s of secrets) assert.ok(!text.includes(s), `Secret lọt vào ${path.relative(REPO, f)}`);
    }
    // Frontend không import SDK Gemini.
    for (const f of walk(path.join(REPO, 'src'), ['.js', '.jsx'])) {
      assert.ok(!/@google\/genai/.test(fs.readFileSync(f, 'utf8')), `${path.relative(REPO, f)} import @google/genai`);
    }
  });

  test('8. Module service Phase 10 không hard-code localhost / native API / dialog thô', () => {
    const names = ['DesktopCapabilityService.js', 'FileDialogService.js', 'PresentationService.js',
      'desktopBridgeContract.js', 'AppLifecycleService.js', 'StorageService.js', 'apiClient.js'];
    for (const n of names) {
      const code = fs.readFileSync(path.join(REPO, 'src', 'services', n), 'utf8')
        .replace(/\/\/.*$/gm, '');
      assert.ok(!/localhost|127\.0\.0\.1|https?:\/\//.test(code), `${n} hard-code URL`);
      assert.ok(!/child_process|powershell|PowerPoint\.Application|ActiveXObject|window\.require|from ['"]node:/i.test(code), `${n} gọi native API`);
      assert.ok(!/electron|tauri/i.test(code), `${n} biết Electron/Tauri`);
    }
  });

  test('9. Backup API/service vẫn hoạt động và dùng PathService', async () => {
    const connection = await import('../server/db/connection.js');
    const ps = await import('../server/services/pathService.js');
    connection.getDatabase();
    fs.mkdirSync(path.join(ps.getPresentationsDir(), 'l1'), { recursive: true });
    fs.writeFileSync(path.join(ps.getPresentationsDir(), 'l1', 'original.pptx'), 'dummy');
    const { handleApiRequest } = await import('../server/routes/index.js');

    const list0 = await call(handleApiRequest, 'GET', '/api/backup/list');
    assert.equal(list0.status, 200);

    const { createBackup, verifyBackup, deleteBackup } = await import('../server/services/backupService.js');
    const created = await createBackup();
    assert.ok(created.success);
    assert.ok(fs.existsSync(path.join(ps.getBackupDir(), created.backupId, 'manifest.json')));
    assert.ok(fs.existsSync(path.join(ps.getBackupDir(), created.backupId, 'database.sqlite')));
    assert.ok(fs.existsSync(path.join(ps.getBackupDir(), created.backupId, 'files', 'presentations', 'l1', 'original.pptx')));
    assert.ok((await verifyBackup(created.backupId)).success);

    const list1 = await call(handleApiRequest, 'GET', '/api/backup/list');
    assert.ok(list1.json.data.some((b) => b.id === created.backupId));
    assert.throws(() => deleteBackup('..\\..\\x'), /INVALID_BACKUP_PATH/);
    deleteBackup(created.backupId);
  });

  test('10. GET /api/health hoạt động và không lộ secret/đường dẫn', async () => {
    process.env.GEMINI_API_KEY = 'phase10-secret-should-not-leak-123456';
    const { handleApiRequest } = await import('../server/routes/index.js');
    const r = await call(handleApiRequest, 'GET', '/api/health');
    assert.equal(r.handled, true);
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.app, 'EduMaster');
    assert.equal(r.json.runtime, 'web');
    assert.equal(r.json.database, 'ok');
    assert.ok(!r.raw.includes('phase10-secret'));
    assert.ok(!r.raw.includes(TMP_ROOT));
    const s = await call(handleApiRequest, 'GET', '/api/status');
    assert.ok(!('dbPath' in s.json), '/api/status không lộ đường dẫn tuyệt đối');
    delete process.env.GEMINI_API_KEY;
  });

  test('11. PresentationService mock không gọi PowerPoint thật', async () => {
    const { default: P } = await svc('PresentationService.js');
    for (const m of ['openPresentation', 'closePresentation', 'showPresentation', 'getPresentationStatus']) {
      assert.equal(typeof P[m], 'function', m);
    }
    const opened = await P.openPresentation('C:/x/original.pptx');
    assert.equal(opened.ok, false);
    assert.equal(opened.code, 'DESKTOP_BRIDGE_UNAVAILABLE');
    assert.equal((await P.showPresentation()).ok, false);
    const st = await P.getPresentationStatus();
    assert.equal(st.available, false);
    assert.equal(st.running, false);
    const code = fs.readFileSync(path.join(REPO, 'src', 'services', 'PresentationService.js'), 'utf8').replace(/\/\/.*$/gm, '');
    assert.ok(!/child_process|spawn|exec\(|powershell|PowerPoint\.Application/i.test(code));
  });

  test('12. Desktop Bridge contract tồn tại và mock web an toàn', async () => {
    const c = await svc('desktopBridgeContract.js');
    assert.deepEqual([...c.DESKTOP_BRIDGE_METHOD_NAMES].sort(), [
      'closePowerPoint', 'exitSlideShow', 'getActivePresentation', 'getStatus', 'goToSlide',
      'nextSlide', 'openPowerPoint', 'previousSlide', 'startSlideShow',
    ]);
    assert.equal(c.implementsDesktopBridge(c.webDesktopBridge), true);
    assert.equal(c.implementsDesktopBridge({}), false);
    await assert.rejects(c.webDesktopBridge.nextSlide(), (e) => e.code === c.BRIDGE_UNAVAILABLE);
    assert.ok(fs.existsSync(path.join(REPO, 'docs', 'phase-10-desktop-ready-architecture.md')));
  });

  test('13. Security regression: gitignore, traversal, secret trong runtime config', async () => {
    const gi = fs.readFileSync(path.join(REPO, '.gitignore'), 'utf8');
    for (const p of ['.env', 'dist', '*.sqlite', 'uploads/**', 'backups']) {
      assert.ok(gi.includes(p), `.gitignore thiếu ${p}`);
    }
    const { deleteBackup, verifyBackup } = await import('../server/services/backupService.js');
    assert.throws(() => deleteBackup('../../Windows'), /INVALID_BACKUP_PATH/);
    await assert.rejects(verifyBackup('a/b'), /INVALID_BACKUP_PATH/);
    const { handleUploadsRequest } = await import('../server/static-file-handler.js');
    let status = 0;
    const res = { setHeader() {}, end() {}, set statusCode(v) { status = v; }, get statusCode() { return status; } };
    handleUploadsRequest({ url: '/uploads/..%2f..%2fsecret.txt', headers: { host: 'x' } }, res);
    assert.ok([403, 404].includes(status));
    assert.ok(!/(^|[\\/])\.env($|\s)/.test(JSON.stringify(
      (await import('../server/services/runtimeConfig.js')).getRuntimeConfig())));
  });

  test('14. DialogService/FileDialog/Lifecycle an toàn khi không có window', async () => {
    const { default: Dialog } = await svc('DialogService.js');
    assert.equal(Dialog.confirm('x'), false);
    assert.equal(Dialog.prompt('x'), null);
    for (const m of ['alert', 'confirm', 'prompt', 'error', 'notify']) assert.equal(typeof Dialog[m], 'function', m);
    const { default: FD } = await svc('FileDialogService.js');
    assert.deepEqual(await FD.openFile({ filters: [{ name: 'PPT', extensions: ['pptx'] }] }), []);
    assert.equal(await FD.selectFolder(), null);
    const { default: L } = await svc('AppLifecycleService.js');
    L.initialize();
    let n = 0;
    const off = L.onResume(() => { n += 1; });
    L._emit('resume');
    off();
    L._emit('resume');
    assert.equal(n, 1);
    L.shutdown();
    assert.equal(typeof L.reloadApplication, 'function');
  });
});

// Phase 1–9 regression được bảo vệ bởi chính các file tests/*.test.js còn lại
// (chạy chung trong `npm test`); test này chỉ xác nhận chúng vẫn tồn tại.
test('15. Các test Phase 1–9 vẫn còn nguyên', () => {
  const files = fs.readdirSync(path.join(REPO, 'tests'));
  for (let p = 2; p <= 9; p += 1) {
    assert.ok(files.some((f) => f.startsWith(`phase${p}-`)), `thiếu test Phase ${p}`);
  }
  assert.ok(files.includes('smoke.test.js'));
});
