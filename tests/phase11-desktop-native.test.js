/**
 * Phase 11 — Desktop Native Layer + Desktop Bridge.
 * Test bằng Node thuần: KHÔNG mở cửa sổ Electron, KHÔNG gọi PowerPoint thật
 * (smoke Electron/PowerPoint thật chạy riêng: desktop/smoke/*).
 * Backend thật được khởi động bằng đúng backendProcess.cjs mà Desktop Shell dùng, với DỮ LIỆU TẠM.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_phase11_'));
const DATA_DIR = path.join(TMP, 'userdata');

const svc = (name) => import(pathToFileURL(path.join(REPO, 'src', 'services', name)).href);
const desk = (...p) => require(path.join(REPO, 'desktop', ...p));

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// Backend dùng chung cho test 15–18 (chạy tuần tự).
let backend = null;
const backendLog = [];

describe('Phase 11: Desktop Native Layer + Desktop Bridge', () => {
  after(async () => {
    try { if (backend && backend.isRunning()) await backend.stop(); } catch { /* ignore */ }
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  test('1. Cấu hình Desktop framework hợp lệ (Electron cô lập trong desktop/)', () => {
    const dpkg = JSON.parse(fs.readFileSync(path.join(REPO, 'desktop', 'package.json'), 'utf8'));
    assert.equal(dpkg.main, 'main/main.cjs');
    assert.ok(fs.existsSync(path.join(REPO, 'desktop', dpkg.main)));
    assert.ok(dpkg.devDependencies.electron);
    assert.ok(!dpkg.dependencies, 'Electron chỉ là devDependency');
    const { WEB_PREFERENCES } = desk('config', 'desktopConfig.cjs');
    assert.equal(WEB_PREFERENCES.contextIsolation, true);
    assert.equal(WEB_PREFERENCES.nodeIntegration, false);
    assert.equal(WEB_PREFERENCES.sandbox, true);
    assert.equal(WEB_PREFERENCES.webSecurity, true);
    assert.equal(WEB_PREFERENCES.webviewTag, false);
    const main = fs.readFileSync(path.join(REPO, 'desktop', 'main', 'main.cjs'), 'utf8');
    assert.match(main, /\.\.WEB_PREFERENCES/);
    assert.match(main, /preload\.cjs/);
    assert.doesNotMatch(main, /nodeIntegration:\s*true|contextIsolation:\s*false|sandbox:\s*false/);
  });

  test('2. Web runtime không yêu cầu native framework', async () => {
    const root = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    const all = Object.keys({ ...root.dependencies, ...root.devDependencies });
    assert.ok(!all.some((d) => /electron|tauri/i.test(d)));
    const { installNativeAdapter } = await svc('nativeAdapterBootstrap.js');
    assert.equal(installNativeAdapter({}), false); // không có window.eduMaster
    assert.equal(installNativeAdapter(undefined), false);
    const { default: D } = await svc('DesktopCapabilityService.js');
    assert.equal((await D.getCapabilities()).isDesktop, false);
    const rc = await import('../server/services/runtimeConfig.js');
    assert.equal(rc.detectRuntime({}), 'web');
    // Mã nguồn web (src/, server/) không tham chiếu thư mục desktop/.
    for (const f of [...walk(path.join(REPO, 'src'), ['.js', '.jsx']), ...walk(path.join(REPO, 'server'), ['.js'])]) {
      assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /desktop\/(main|native|preload)/, f);
    }
  });

  test('3. Desktop runtime configuration', async () => {
    const { buildBackendEnv, resolveDataDir, BACKEND_HOST } = desk('config', 'desktopConfig.cjs');
    const env = buildBackendEnv({
      appRoot: REPO, dataDir: DATA_DIR, port: 4321, asNode: true,
      baseEnv: { EDUICT_DB_PATH: 'D:/private/x.sqlite', EDUICT_API_BASE_URL: 'http://evil', PATH: 'p' },
    });
    assert.equal(env.EDUICT_RUNTIME, 'desktop');
    assert.equal(env.EDUICT_DATA_DIR, DATA_DIR);
    assert.equal(env.EDUICT_APP_ROOT, REPO);
    assert.equal(env.EDUICT_HOST, '127.0.0.1');
    assert.equal(BACKEND_HOST, '127.0.0.1');
    assert.equal(env.PORT, '4321');
    assert.equal(env.ELECTRON_RUN_AS_NODE, '1');
    assert.ok(!('EDUICT_DB_PATH' in env));
    assert.ok(!('EDUICT_API_BASE_URL' in env));
    assert.equal(resolveDataDir('C:/Users/u/AppData/Roaming/EduMaster', {}), path.join('C:/Users/u/AppData/Roaming/EduMaster', 'data'));
    assert.equal(resolveDataDir('x', { EDUICT_DATA_DIR: DATA_DIR }), DATA_DIR);
    const rc = await import('../server/services/runtimeConfig.js');
    assert.equal(rc.detectRuntime(env), 'desktop');
  });

  test('4. DesktopCapabilityService đăng ký native adapter qua bootstrap', async () => {
    const { installNativeAdapter } = await svc('nativeAdapterBootstrap.js');
    const { default: D } = await svc('DesktopCapabilityService.js');
    const { webDesktopBridge } = await svc('desktopBridgeContract.js');
    const api = {
      getCapabilities: async () => ({ isDesktop: true, platform: 'windows', canOpenFile: true, canOpenPowerPoint: true, canControlPowerPoint: true }),
      openFile: async () => ({ ok: true, files: [] }),
      saveFile: async () => ({ ok: true, saved: true }),
      selectFolder: async () => ({ ok: true, path: null }),
      dialog: { alert: async () => ({}), confirm: async () => ({ value: true }), error: async () => ({}) },
      bridge: { ...webDesktopBridge },
    };
    assert.equal(installNativeAdapter({ eduMaster: { desktop: { ...api, bridge: {} } } }), false, 'bridge thiếu → không đăng ký');
    assert.equal(installNativeAdapter({ eduMaster: { desktop: api } }), true);
    const caps = await D.getCapabilities();
    assert.equal(caps.isDesktop, true);
    assert.equal(caps.platform, 'windows');
    assert.equal(caps.canControlPowerPoint, true);
    assert.equal(caps.canSelectFolder, false, 'khóa không khai báo giữ mặc định false');
    D.unregisterNativeAdapter();
    assert.equal((await D.getCapabilities()).isDesktop, false);
  });

  // Dựng desktop API giả để kiểm tra adapter (test 5–7, 11).
  async function installFakeDesktop(overrides = {}) {
    const calls = [];
    const { webDesktopBridge, DESKTOP_BRIDGE_METHOD_NAMES } = await svc('desktopBridgeContract.js');
    const bridge = {};
    for (const m of DESKTOP_BRIDGE_METHOD_NAMES) {
      bridge[m] = async (arg) => { calls.push([m, arg]); return { ok: true, opened: true, closed: true, started: true, exited: true, running: true, currentSlide: 3 }; };
    }
    let lifecycleCb = null;
    const api = {
      getCapabilities: async () => ({ isDesktop: true, platform: 'windows', canOpenPowerPoint: true, canControlPowerPoint: true }),
      openFile: async (o) => { calls.push(['openFile', o]); return { ok: true, files: [{ name: 'a.pptx', size: 3, type: 'x/y', data: new Uint8Array([1, 2, 3]) }] }; },
      saveFile: async (o) => { calls.push(['saveFile', o]); return { ok: true, saved: true }; },
      selectFolder: async () => { calls.push(['selectFolder']); return { ok: true, path: 'C:/out' }; },
      dialog: {
        alert: async (m) => { calls.push(['alert', m]); return { ok: true }; },
        confirm: async (m) => { calls.push(['confirm', m]); return { ok: true, value: true }; },
        error: async (m) => { calls.push(['error', m]); return { ok: true }; },
      },
      bridge: { ...webDesktopBridge, ...bridge },
      onLifecycle: (cb) => { lifecycleCb = cb; return () => { lifecycleCb = null; }; },
      ...overrides,
    };
    const { installNativeAdapter } = await svc('nativeAdapterBootstrap.js');
    assert.equal(installNativeAdapter({ eduMaster: { desktop: api } }), true);
    return { calls, emit: (n) => lifecycleCb && lifecycleCb(n) };
  }

  test('5. FileDialogService native adapter hoạt động (File như bản web)', async () => {
    const { calls } = await installFakeDesktop();
    const { default: FD } = await svc('FileDialogService.js');
    const { default: D } = await svc('DesktopCapabilityService.js');
    const files = await FD.openFile({ filters: [{ name: 'PPT', extensions: ['pptx'] }], multiple: false });
    assert.equal(files.length, 1);
    assert.ok(files[0] instanceof File);
    assert.equal(files[0].name, 'a.pptx');
    assert.equal(files[0].size, 3);
    assert.equal(await FD.selectFolder(), 'C:/out');
    assert.equal(await FD.saveFile({ data: 'hello', defaultName: 'x.txt' }), true);
    assert.deepEqual(calls.filter((c) => c[0] === 'openFile')[0][1].filters, [{ name: 'PPT', extensions: ['pptx'] }]);
    D.unregisterNativeAdapter();
    assert.deepEqual(await FD.openFile(), [], 'web fallback không đổi');
  });

  test('6. DialogService native adapter hoạt động; web giữ nguyên', async () => {
    const { calls } = await installFakeDesktop();
    const { default: Dlg } = await svc('DialogService.js');
    const { default: D } = await svc('DesktopCapabilityService.js');
    assert.equal(await Dlg.confirmAsync('ok?'), true);
    await Dlg.alertAsync('hi');
    await Dlg.errorAsync('boom');
    assert.equal(await Dlg.promptAsync('p'), null, 'prompt không có native → fallback web');
    assert.deepEqual(calls.filter((c) => ['confirm', 'alert', 'error'].includes(c[0])).map((c) => c[0]), ['confirm', 'alert', 'error']);
    D.unregisterNativeAdapter();
    assert.equal(await Dlg.confirmAsync('x'), false, 'web: không có window → false');
    assert.equal(Dlg.confirm('x'), false);
  });

  test('7. Lifecycle native adapter hoạt động', async () => {
    const { emit } = await installFakeDesktop();
    const { default: L } = await svc('AppLifecycleService.js');
    const { default: D } = await svc('DesktopCapabilityService.js');
    const seen = [];
    const offs = [
      L.onResume(() => seen.push('resume')),
      L.onSuspend(() => seen.push('suspend')),
      L.beforeExit(() => seen.push('beforeExit')),
      L.onShutdown(() => seen.push('shutdown')),
    ];
    for (const n of ['suspend', 'resume', 'beforeExit', 'shutdown']) emit(n);
    emit('bogus');
    assert.deepEqual(seen, ['suspend', 'resume', 'beforeExit', 'shutdown']);
    offs.forEach((o) => o());
    L.shutdown();
    D.unregisterNativeAdapter();
  });

  test('8. Desktop Bridge contract hợp lệ (preload = bridgeMethods = contract)', async () => {
    const c = await svc('desktopBridgeContract.js');
    const { BRIDGE_METHODS } = desk('native', 'bridgeMethods.cjs');
    assert.deepEqual([...BRIDGE_METHODS].sort(), [...c.DESKTOP_BRIDGE_METHOD_NAMES].sort());
    const preload = fs.readFileSync(path.join(REPO, 'desktop', 'preload', 'preload.cjs'), 'utf8');
    const block = preload.match(/const BRIDGE_METHODS = \[([\s\S]*?)\];/)[1];
    const names = [...block.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
    assert.deepEqual(names.sort(), [...c.DESKTOP_BRIDGE_METHOD_NAMES].sort());
    const { createPowerPointBridge } = desk('native', 'powerpointBridge.cjs');
    const bridge = createPowerPointBridge({ platform: 'win32', runner: async () => ({ ok: true }), uploadsDir: TMP });
    assert.equal(c.implementsDesktopBridge(bridge), true);
  });

  test('9. PowerPoint path validation', async () => {
    const { validatePresentationPath } = desk('native', 'pathValidation.cjs');
    const uploads = path.join(TMP, 'uploads');
    const lessonDir = path.join(uploads, 'presentations', 'les1');
    fs.mkdirSync(lessonDir, { recursive: true });
    const good = path.join(lessonDir, 'original.pptx');
    fs.writeFileSync(good, 'x');
    fs.writeFileSync(path.join(lessonDir, 'note.txt'), 'x');
    fs.mkdirSync(path.join(lessonDir, 'dir.pptx'));
    fs.writeFileSync(path.join(TMP, 'outside.pptx'), 'x');
    const opts = { uploadsDir: uploads };

    assert.equal(validatePresentationPath('/uploads/presentations/les1/original.pptx', opts).ok, true);
    assert.equal(validatePresentationPath(good, opts).ok, true);
    const bad = (v) => assert.equal(validatePresentationPath(v, opts).ok, false, String(v));
    bad(undefined); bad(''); bad(123); bad('original.pptx');
    bad('/uploads/presentations/../../outside.pptx');
    bad('/uploads/presentations/les1/%2e%2e/%2e%2e/outside.pptx');
    bad('/uploads/presentations/les1/..\\..\\outside.pptx');
    bad(path.join(TMP, 'outside.pptx'));
    bad(path.join(lessonDir, '..', '..', '..', 'outside.pptx'));
    bad('\\\\server\\share\\a.pptx');
    bad('//server/share/a.pptx');
    bad(`${good}:evil`);
    bad(path.join(lessonDir, 'note.txt'));
    bad('/uploads/presentations/les1/original.exe');
    bad(path.join(lessonDir, 'dir.pptx'));
    bad('/uploads/presentations/les1/original.pptx?x=1');
    bad(`${good}\0.txt`);
    assert.equal(validatePresentationPath('/uploads/presentations/les1/missing.pptx', opts).code, 'PRESENTATION_NOT_FOUND');
    assert.equal(validatePresentationPath('/uploads/presentations/../x.pptx', opts).code, 'INVALID_PRESENTATION_PATH');
  });

  test('10. PowerPoint unavailable không crash (structured error)', async () => {
    const { createPowerPointBridge } = desk('native', 'powerpointBridge.cjs');
    const uploads = path.join(TMP, 'uploads');
    fs.mkdirSync(path.join(uploads, 'presentations', 'les1'), { recursive: true });
    fs.writeFileSync(path.join(uploads, 'presentations', 'les1', 'original.pptx'), 'x');
    const p = '/uploads/presentations/les1/original.pptx';

    const web = createPowerPointBridge({ platform: 'linux', runner: async () => { throw new Error('không được gọi'); }, uploadsDir: uploads });
    assert.equal((await web.openPowerPoint(p)).code, 'DESKTOP_BRIDGE_UNAVAILABLE');
    assert.equal((await web.nextSlide()).code, 'DESKTOP_BRIDGE_UNAVAILABLE');
    assert.deepEqual(await web.probe(), { installed: false });

    const throwing = createPowerPointBridge({ platform: 'win32', runner: async () => { throw Object.assign(new Error('stack secret C:\\x'), { code: 'POWERPOINT_UNAVAILABLE' }); }, uploadsDir: uploads });
    const r = await throwing.openPowerPoint(p);
    assert.equal(r.ok, false);
    assert.equal(r.code, 'POWERPOINT_UNAVAILABLE');
    assert.ok(!/stack secret|C:\\x/.test(JSON.stringify(r)), 'không lộ chi tiết kỹ thuật');

    const garbage = createPowerPointBridge({ platform: 'win32', runner: async () => 'rác', uploadsDir: uploads });
    assert.equal((await garbage.getStatus()).code, 'POWERPOINT_CONTROL_FAILED');
    const notInstalled = createPowerPointBridge({ platform: 'win32', runner: async () => ({ ok: false, code: 'POWERPOINT_NOT_INSTALLED' }), uploadsDir: uploads });
    assert.equal((await notInstalled.openPowerPoint(p)).code, 'POWERPOINT_NOT_INSTALLED');
    const unknown = createPowerPointBridge({ platform: 'win32', runner: async () => ({ ok: false, code: 'WEIRD' }), uploadsDir: uploads });
    assert.equal((await unknown.getStatus()).code, 'POWERPOINT_CONTROL_FAILED');
    assert.equal((await notInstalled.goToSlide(0)).code, 'INVALID_SLIDE_INDEX');
    assert.equal((await notInstalled.goToSlide('1')).code, 'INVALID_SLIDE_INDEX');
    assert.equal((await notInstalled.openPowerPoint('C:/Windows/notepad.exe')).code, 'INVALID_PRESENTATION_PATH');

    // Runner thật với spawn lỗi (không có powershell) → structured, không throw.
    const { createPowerShellRunner } = desk('native', 'powerpointBridge.cjs');
    const realRunnerBridge = createPowerPointBridge({
      platform: 'win32',
      runner: createPowerShellRunner({ spawnImpl: () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); } }),
      uploadsDir: uploads,
    });
    assert.equal((await realRunnerBridge.getStatus()).ok, false);
  });

  test('11. PresentationService gọi bridge đúng contract', async () => {
    const { calls } = await installFakeDesktop();
    const { default: P } = await svc('PresentationService.js');
    const { default: D } = await svc('DesktopCapabilityService.js');
    assert.equal((await P.openPresentation('/uploads/presentations/l/original.pptx')).ok, true);
    assert.equal((await P.showPresentation()).ok, true);
    assert.equal((await P.nextSlide()).currentSlide, 3);
    await P.previousSlide();
    await P.goToSlide(4);
    await P.exitSlideShow();
    assert.equal((await P.getPresentationStatus()).running, true);
    await P.getActivePresentation();
    assert.equal((await P.closePresentation()).ok, true);
    assert.deepEqual(calls.filter((c) => c[0] !== 'getCapabilities').map((c) => c[0]), [
      'openPowerPoint', 'startSlideShow', 'nextSlide', 'previousSlide', 'goToSlide', 'exitSlideShow',
      'getStatus', 'getActivePresentation', 'closePowerPoint',
    ]);
    assert.deepEqual(calls.find((c) => c[0] === 'openPowerPoint'), ['openPowerPoint', '/uploads/presentations/l/original.pptx']);
    assert.deepEqual(calls.find((c) => c[0] === 'goToSlide'), ['goToSlide', 4]);

    // Không có capability điều khiển → không gọi bridge điều khiển.
    D.unregisterNativeAdapter();
    const { calls: calls2 } = await installFakeDesktop({ getCapabilities: async () => ({ isDesktop: true, platform: 'windows' }) });
    assert.equal((await P.nextSlide()).code, 'DESKTOP_BRIDGE_UNAVAILABLE');
    assert.equal((await P.openPresentation('/x')).code, 'DESKTOP_BRIDGE_UNAVAILABLE');
    assert.equal(calls2.length, 0);
    D.unregisterNativeAdapter();
    assert.equal((await P.nextSlide()).code, 'DESKTOP_BRIDGE_UNAVAILABLE');
  });

  test('12. Không có direct native API trong React/frontend', () => {
    const banned = /\brequire\s*\(|window\.require|ipcRenderer|from ['"]electron|child_process|process\.versions|from ['"]node:(fs|child_process|os|path)|ActiveXObject|PowerPoint\.Application|powershell/i;
    const files = walk(path.join(REPO, 'src'), ['.js', '.jsx']);
    assert.ok(files.length > 20);
    for (const f of files) {
      assert.doesNotMatch(stripComments(fs.readFileSync(f, 'utf8')), banned, path.relative(REPO, f));
    }
    // Frontend chỉ biết window.eduMaster.desktop (abstraction), không biết tên framework.
    for (const f of files) {
      assert.doesNotMatch(stripComments(fs.readFileSync(f, 'utf8')), /electron|tauri/i, path.relative(REPO, f));
    }
  });

  test('13. Không có arbitrary shell execution từ frontend / preload / IPC', async () => {
    for (const f of walk(path.join(REPO, 'src'), ['.js', '.jsx'])) {
      assert.doesNotMatch(stripComments(fs.readFileSync(f, 'utf8')), /\b(spawn|exec|execSync|execFile|fork)\s*\(/, path.relative(REPO, f));
    }
    const preload = stripComments(fs.readFileSync(path.join(REPO, 'desktop', 'preload', 'preload.cjs'), 'utf8'));
    assert.doesNotMatch(preload, /child_process|shell|exec|spawn|process\.|require\((?!'electron')/);
    assert.doesNotMatch(preload, /executeCommand|runCommand|eval\(/);
    assert.doesNotMatch(preload, /exposeInMainWorld\('[^']*',\s*(ipcRenderer|require)/);

    const nativeSrc = stripComments(fs.readFileSync(path.join(REPO, 'desktop', 'native', 'powerpointBridge.cjs'), 'utf8'));
    assert.doesNotMatch(nativeSrc, /shell:\s*true|\bexec(Sync)?\(|-Command|-EncodedCommand|Invoke-Expression/);
    assert.match(nativeSrc, /shell:\s*false/);
    const ps1 = fs.readFileSync(path.join(REPO, 'desktop', 'native', 'powerpoint-bridge.ps1'), 'utf8');
    assert.match(ps1, /ValidateSet\('Probe', 'Open', 'Close'/);
    assert.doesNotMatch(ps1, /Invoke-Expression|\biex\b|Start-Process|Add-Type/i);

    // IPC: whitelist cứng, từ chối phương thức lạ & sender lạ.
    const { createIpcHandlers, registerIpc } = desk('main', 'ipc.cjs');
    const calls = [];
    const bridge = new Proxy({}, { get: (_t, name) => (name === 'probe' ? async () => ({ installed: true }) : async () => { calls.push(name); return { ok: true }; }) });
    const h = createIpcHandlers({ dialog: {}, bridge });
    assert.equal((await h['edumaster:bridge']({ method: 'executeCommand', arg: 'calc.exe' })).code, 'DESKTOP_PERMISSION_DENIED');
    assert.equal((await h['edumaster:bridge']({ method: 'constructor' })).ok, false);
    assert.equal((await h['edumaster:bridge']({ method: 'openPowerPoint', arg: { a: 1 } })).code, 'INVALID_PRESENTATION_PATH');
    assert.equal((await h['edumaster:bridge']({ method: 'goToSlide', arg: '2' })).code, 'INVALID_SLIDE_INDEX');
    assert.equal((await h['edumaster:bridge']({ method: 'nextSlide' })).ok, true);
    assert.deepEqual(calls, ['nextSlide']);
    assert.equal((await h['edumaster:dialog']({ kind: 'powershell', message: 'x' })).ok, false);

    const registered = {};
    registerIpc({ ipcMain: { handle: (ch, fn) => { registered[ch] = fn; } }, handlers: h, backendOrigin: 'http://127.0.0.1:5000' });
    const evil = await registered['edumaster:bridge']({ senderFrame: { url: 'https://evil.example/' } }, { method: 'nextSlide' });
    assert.equal(evil.code, 'DESKTOP_PERMISSION_DENIED');
    const ok = await registered['edumaster:bridge']({ senderFrame: { url: 'http://127.0.0.1:5000/' } }, { method: 'nextSlide' });
    assert.equal(ok.ok, true);
    assert.equal(calls.length, 2);
  });

  test('14. Gemini key không xuất hiện ở frontend / preload / desktop shell', () => {
    const secrets = [process.env.GEMINI_API_KEY].filter((s) => s && s.length > 8);
    const envFile = path.join(REPO, '.env');
    if (fs.existsSync(envFile)) {
      const m = fs.readFileSync(envFile, 'utf8').match(/^GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/m);
      if (m && m[1].length > 8 && m[1] !== 'YOUR_GEMINI_API_KEY_HERE') secrets.push(m[1]);
    }
    const files = [
      ...walk(path.join(REPO, 'src'), ['.js', '.jsx']),
      ...walk(path.join(REPO, 'dist'), ['.js', '.html', '.css']),
      ...walk(path.join(REPO, 'desktop'), ['.cjs', '.js', '.json', '.ps1']),
    ];
    for (const f of files) {
      const t = fs.readFileSync(f, 'utf8');
      assert.doesNotMatch(t, /AIza[0-9A-Za-z_-]{30,}/, path.relative(REPO, f));
      for (const s of secrets) assert.ok(!t.includes(s), `secret trong ${path.relative(REPO, f)}`);
    }
    for (const f of walk(path.join(REPO, 'desktop'), ['.cjs'])) {
      assert.doesNotMatch(stripComments(fs.readFileSync(f, 'utf8')), /GEMINI_API_KEY/, path.relative(REPO, f));
    }
    const { redact } = desk('main', 'logger.cjs');
    assert.equal(redact('k=AIzaSyA1234567890123456789012345678901'), 'k=[REDACTED]');
  });

  test('15. Backend desktop khởi động qua /api/health với runtime=desktop (dữ liệu tạm)', async () => {
    const { startBackend } = desk('main', 'backendProcess.cjs');
    backend = await startBackend({
      appRoot: REPO,
      dataDir: DATA_DIR,
      startTimeoutMs: 30000,
      logger: { info: (m) => backendLog.push(m), warn() {}, error: (m) => backendLog.push(m) },
    });
    assert.match(backend.origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    const res = await fetch(`${backend.origin}/api/health`);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.app, 'EduMaster');
    assert.equal(body.runtime, 'desktop');
    assert.equal(body.database, 'ok');
    assert.doesNotMatch(JSON.stringify(body), /AIza|api[_-]?key/i);
  });

  test('16. Health check: timeout rõ ràng khi backend không lên, và tiến trình bị dọn', async () => {
    const { startBackend } = desk('main', 'backendProcess.cjs');
    const sleeper = path.join(TMP, 'sleeper.cjs');
    fs.writeFileSync(sleeper, 'setInterval(() => {}, 1000);');
    const started = Date.now();
    await assert.rejects(
      startBackend({ appRoot: REPO, dataDir: path.join(TMP, 'd2'), entry: sleeper, startTimeoutMs: 1200 }),
      (e) => e.code === 'BACKEND_START_TIMEOUT'
    );
    assert.ok(Date.now() - started < 10000, 'không treo vô hạn');
    const crasher = path.join(TMP, 'crasher.cjs');
    fs.writeFileSync(crasher, 'process.exit(3);');
    await assert.rejects(
      startBackend({ appRoot: REPO, dataDir: path.join(TMP, 'd3'), entry: crasher, startTimeoutMs: 8000 }),
      (e) => e.code === 'BACKEND_EXITED'
    );
    assert.match(desk('config', 'desktopConfig.cjs').USER_MESSAGES.BACKEND_START_FAILED, /Không thể khởi động máy chủ EduMaster/);
  });

  test('17. Database & dữ liệu dùng user data directory (không phải app dir)', () => {
    const dbFile = path.join(DATA_DIR, 'edumaster.sqlite');
    assert.ok(fs.existsSync(dbFile), 'DB nằm trong user data');
    assert.ok(fs.statSync(dbFile).size > 0);
    for (const dir of ['src', 'server', 'dist', 'desktop']) {
      assert.ok(!dbFile.startsWith(path.join(REPO, dir) + path.sep));
    }
    assert.ok(!path.resolve(dbFile).startsWith(REPO + path.sep) || DATA_DIR.startsWith(REPO));
  });

  test('18. Backup (create/list/verify/delete) hoạt động trong desktop runtime, đúng user data', async () => {
    const post = async (u, b) => {
      const r = await fetch(`${backend.origin}${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) });
      return { status: r.status, body: await r.json() };
    };
    const created = await post('/api/backup/create');
    assert.equal(created.status, 200);
    const id = created.body.backupId;
    assert.ok(fs.existsSync(path.join(DATA_DIR, 'backups', id, 'manifest.json')), 'backup nằm trong user data');
    assert.ok(!fs.existsSync(path.join(REPO, 'backups', id)), 'không nằm trong app dir');
    const list = await (await fetch(`${backend.origin}/api/backup/list`)).json();
    assert.ok(list.data.some((b) => b.id === id));
    assert.equal((await post('/api/backup/verify', { backupId: id })).body.success, true);
    assert.equal((await post('/api/backup/delete', { backupId: id })).status, 200);
    assert.ok(!fs.existsSync(path.join(DATA_DIR, 'backups', id)));
    assert.notEqual((await post('/api/backup/delete', { backupId: '..\\..\\x' })).status, 200);
    // Gemini offline/không cấu hình: backend vẫn sống.
    const ai = await fetch(`${backend.origin}/api/ai/status`);
    assert.ok(ai.status < 500);
    assert.equal((await fetch(`${backend.origin}/api/health`)).status, 200);
  });

  test('19. Graceful shutdown: IPC shutdown → SQLite đóng → exit 0, không orphan', async () => {
    const pid = backend.pid;
    const res = await backend.stop();
    assert.equal(res.graceful, true);
    assert.equal(res.code, 0);
    assert.ok(backendLog.some((l) => /đang tắt/.test(l) && /IPC/.test(l)), 'handler tắt êm đã chạy');
    assert.throws(() => process.kill(pid, 0), 'tiến trình backend không còn');
    await assert.rejects(fetch(`${backend.origin}/api/health`));
    // DB mở lại được ngay (không "database is locked").
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(path.join(DATA_DIR, 'edumaster.sqlite'));
    db.exec('BEGIN IMMEDIATE; COMMIT;');
    db.close();
  });

  test('20. Security regression Phase 11', () => {
    const sec = desk('main', 'security.cjs');
    const origin = 'http://127.0.0.1:5000';
    assert.equal(sec.isAllowedNavigation(origin, 'http://127.0.0.1:5000/lessons'), true);
    assert.equal(sec.isAllowedNavigation(origin, 'http://127.0.0.1:5001/'), false);
    assert.equal(sec.isAllowedNavigation(origin, 'https://evil.example/'), false);
    assert.equal(sec.isAllowedNavigation(origin, 'file:///C:/Windows/System32/cmd.exe'), false);
    assert.equal(sec.isAllowedExternalUrl('https://example.com'), true);
    for (const u of ['http://example.com', 'file:///c:/x', 'javascript:alert(1)', 'ms-excel:ofe|u|x', 'not a url']) {
      assert.equal(sec.isAllowedExternalUrl(u), false, u);
    }
    assert.equal(sec.isTrustedSender({ senderFrame: { url: `${origin}/` } }, origin), true);
    assert.equal(sec.isTrustedSender({ senderFrame: { url: 'https://evil/' } }, origin), false);
    assert.equal(sec.isTrustedSender({}, origin), false);
    assert.deepEqual(sec.sanitizeFilters([{ name: 'a', extensions: ['pptx', '.ppt', 'e x', '../x'] }, null, { extensions: [] }]), [{ name: 'a', extensions: ['pptx', 'ppt'] }]);
    assert.equal(sec.sanitizeFileName('..\\..\\evil:name?.pptx'), 'evil_name_.pptx');
    const gi = fs.readFileSync(path.join(REPO, '.gitignore'), 'utf8');
    for (const p of ['.env', 'node_modules', '*.sqlite', 'backups/']) assert.ok(gi.includes(p), p);
    const main = fs.readFileSync(path.join(REPO, 'desktop', 'main', 'main.cjs'), 'utf8');
    assert.match(main, /setWindowOpenHandler/);
    assert.match(main, /will-navigate/);
    assert.match(main, /setPermissionRequestHandler/);
    assert.match(main, /isTrustedSender|registerIpc/);
  });

  test('21. envLoader không cho .env ghi đè biến hạ tầng của launcher (desktop)', async () => {
    const root = path.join(TMP, 'envroot');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, '.env'), 'EDUICT_DB_PATH=D:/PRIVATE/real.sqlite\nGEMINI_MODEL=m-test\n');
    const { spawnSync } = await import('node:child_process');
    const code = `import('${pathToFileURL(path.join(REPO, 'server', 'ai', 'envLoader.js')).href}').then(m=>{m.loadEnv(true);console.log(JSON.stringify({db:process.env.EDUICT_DB_PATH||null,model:process.env.GEMINI_MODEL}))})`;
    const run = (extra) => JSON.parse(spawnSync(process.execPath, ['-e', code], {
      env: { ...process.env, EDUICT_APP_ROOT: root, EDUICT_DB_PATH: '', ...extra }, encoding: 'utf8',
    }).stdout.trim().split('\n').pop());
    // Phase 12: desktop đọc .env từ <data>/settings/.env (không đọc từ thư mục ứng dụng).
    fs.mkdirSync(path.join(root, 'data', 'settings'), { recursive: true });
    fs.copyFileSync(path.join(root, '.env'), path.join(root, 'data', 'settings', '.env'));
    const desktop = run({ EDUICT_RUNTIME: 'desktop', EDUICT_DATA_DIR: path.join(root, 'data') });
    assert.equal(desktop.db, null, 'desktop: .env không được đặt EDUICT_DB_PATH');
    assert.equal(desktop.model, 'm-test', 'khóa Gemini vẫn nạp bình thường');
    const web = run({});
    assert.equal(web.db, 'D:/PRIVATE/real.sqlite', 'web: hành vi cũ giữ nguyên');
    const preset = run({ EDUICT_DB_PATH: path.join(TMP, 'preset.sqlite') });
    assert.equal(preset.db, path.join(TMP, 'preset.sqlite'), 'biến đã đặt sẵn không bị .env ghi đè');
  });

  test('22. Phase 1–10 tests vẫn còn nguyên', () => {
    const files = fs.readdirSync(path.join(REPO, 'tests'));
    for (let p = 2; p <= 10; p += 1) assert.ok(files.some((f) => f.startsWith(`phase${p}-`)), `thiếu test Phase ${p}`);
    assert.ok(files.includes('smoke.test.js'));
    assert.ok(files.includes('phase10-desktop-ready.test.js'));
  });
});
