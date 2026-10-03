'use strict';
// EduMaster Desktop Shell — tiến trình main (Phase 11).
//
// Vòng đời:  START → Native Layer → Node backend (cổng động, 127.0.0.1) → chờ GET /api/health
//            → tạo cửa sổ → nạp EduMaster.   Đóng cửa sổ → thông báo lifecycle → backend tắt êm → thoát.
// Shell chỉ BAO QUANH hệ thống hiện có (React + Node + SQLite); không chứa logic nghiệp vụ, không chứa secret.

const { app, BrowserWindow, dialog, ipcMain, session, shell, powerMonitor } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {
  WEB_PREFERENCES,
  USER_MESSAGES,
  resolveAppRoot,
  resolveDataDir,
  resolveSettingsDir,
} = require('../config/desktopConfig.cjs');
const { createLogger } = require('./logger.cjs');
const { startBackend } = require('./backendProcess.cjs');
const { createIpcHandlers, registerIpc } = require('./ipc.cjs');
const { isAllowedExternalUrl, isAllowedNavigation } = require('./security.cjs');
const { createPowerPointBridge, createPowerShellRunner } = require('../native/powerpointBridge.cjs');
const { runMigration } = require('../migration/legacyMigration.cjs');
const { ensureUpdateBackup, restoreDatabaseFromBackup, writeVersionState } = require('../migration/updateGuard.cjs');

const IS_SMOKE = process.argv.includes('--smoke');
const smokeOutArg = process.argv.find((a) => a.startsWith('--smoke-out='));
const SMOKE_OUT = smokeOutArg ? smokeOutArg.slice('--smoke-out='.length) : null;

app.setName('EduMaster');

// Phase 12: userData xác định = %APPDATA%\EduMaster (không phụ thuộc tên package). Smoke/test truyền
// --user-data-dir để cô lập dữ liệu → khi đó KHÔNG ghi đè.
if (!process.argv.some((a) => a.startsWith('--user-data-dir'))) {
  app.setPath('userData', path.join(app.getPath('appData'), 'EduMaster'));
}

let logger = null;

// Phase 12: ghi log sự cố không mong đợi (logger che khóa Google API nếu lỡ xuất hiện).
process.on('uncaughtException', (err) => {
  try { logger?.error(`[desktop] uncaughtException: ${err && err.stack ? err.stack.split('\n')[0] : err}`); } catch { /* bỏ qua */ }
});
process.on('unhandledRejection', (reason) => {
  try { logger?.error(`[desktop] unhandledRejection: ${reason && reason.message ? reason.message : reason}`); } catch { /* bỏ qua */ }
});
app.on('render-process-gone', (_event, _wc, details) => {
  logger?.error(`[desktop] renderer dừng bất ngờ: ${details && details.reason}`);
});
let backend = null;
let mainWindow = null;
let quitting = false;
let dataDirPath = '';
let exitCode = 0;
const smokeResult = { startedAt: new Date().toISOString() };

function sendLifecycle(name) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('edumaster:lifecycle', name);
}

function createMainWindow(origin) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b1020',
    title: 'EduMaster',
    webPreferences: {
      ...WEB_PREFERENCES,
      preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.setMenuBarVisibility(false);

  // Chặn điều hướng ra ngoài origin backend; link ngoài chỉ mở bằng trình duyệt hệ thống nếu là https.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(origin, url)) event.preventDefault();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadURL(origin);
  return mainWindow;
}

// Smoke test tự động (chỉ khi --smoke): chạy trong renderer thật, ghi kết quả JSON rồi thoát bằng đường tắt êm.
const SMOKE_SCRIPT = `(async () => {
  const out = {};
  const j = async (u, init) => {
    const r = await fetch(u, init);
    let body = null;
    try { body = await r.json(); } catch { body = null; }
    return { status: r.status, body };
  };
  for (let i = 0; i < 60 && !(document.getElementById('root') && document.getElementById('root').children.length); i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  out.rootRendered = !!(document.getElementById('root') && document.getElementById('root').children.length);
  out.bodyTextLength = document.body.innerText.length;
  out.health = await j('/api/health');
  out.classes = await j('/api/classes');
  out.lessons = await j('/api/lessons');
  out.nodeLeak = (typeof window.require !== 'undefined') || (typeof window.process !== 'undefined');
  out.bridgeMethods = Object.keys((window.eduMaster && window.eduMaster.desktop && window.eduMaster.desktop.bridge) || {});
  out.capabilities = await window.eduMaster.desktop.getCapabilities();
  const created = await j('/api/backup/create', { method: 'POST' });
  out.backupCreate = { status: created.status, success: created.body && created.body.success };
  const id = created.body && created.body.backupId;
  if (id) {
    const post = (u) => j(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backupId: id }) });
    out.backupVerify = (await post('/api/backup/verify')).body;
    out.backupList = (await j('/api/backup/list')).body;
    out.backupDelete = (await post('/api/backup/delete')).status;
  }
  return out;
})()`;

async function runSmoke() {
  try {
    const result = await mainWindow.webContents.executeJavaScript(SMOKE_SCRIPT, true);
    smokeResult.renderer = result;
  } catch (err) {
    smokeResult.error = String(err && err.message);
    exitCode = 1;
  }
  smokeResult.backendPid = backend ? backend.pid : null;
  smokeResult.dataDirExists = Boolean(dataDirPath) && fs.existsSync(path.join(dataDirPath, 'edumaster.sqlite'));
  if (SMOKE_OUT) fs.writeFileSync(SMOKE_OUT, JSON.stringify(smokeResult, null, 2));
  app.quit();
}

async function boot() {
  const appRoot = resolveAppRoot(__dirname);
  const userDataDir = app.getPath('userData');
  // Production (đã đóng gói): dữ liệu LUÔN ở userData\data, bỏ qua EDUICT_DATA_DIR của máy; dev/smoke: cho phép override.
  const dataDir = resolveDataDir(userDataDir, app.isPackaged ? {} : process.env);
  dataDirPath = dataDir;
  fs.mkdirSync(dataDir, { recursive: true });
  logger = createLogger(path.join(dataDir, 'logs'));
  logger.info(`[desktop] khởi động EduMaster v${app.getVersion()} (packaged=${app.isPackaged}, smoke=${IS_SMOKE})`);

  // Thiết lập người dùng (Gemini): <data>/settings/.env — tạo mẫu KHÔNG chứa khóa nếu chưa có.
  try {
    const settingsDir = resolveSettingsDir(dataDir);
    fs.mkdirSync(settingsDir, { recursive: true });
    const envFile = path.join(settingsDir, '.env');
    if (!fs.existsSync(envFile)) {
      fs.copyFileSync(path.join(__dirname, '..', 'config', 'settings.env.template'), envFile);
    }
  } catch (err) {
    logger.warn(`[desktop] không tạo được settings/.env: ${err.message}`);
  }

  // Chuyển dữ liệu cũ (nếu có) TRƯỚC khi backend mở SQLite. Thất bại → rollback, dữ liệu cũ nguyên vẹn, không khởi động.
  if (process.env.EDUICT_SKIP_MIGRATION !== '1') {
    const legacyArg = process.argv.find((a) => a.startsWith('--legacy-dir='));
    const migration = runMigration({
      userDataDir,
      dataDir,
      candidates: [
        legacyArg ? legacyArg.slice('--legacy-dir='.length) : null,
        process.env.EDUICT_LEGACY_DATA_DIR,
        path.join(userDataDir, 'import'), // thư mục thả dữ liệu cũ (edumaster.sqlite + uploads/ + backups/)
      ],
      logger,
      version: app.getVersion(),
    });
    smokeResult.migration = { status: migration.status, reason: migration.reason, code: migration.code };
    if (migration.status === 'failed') {
      if (SMOKE_OUT) fs.writeFileSync(SMOKE_OUT, JSON.stringify(smokeResult, null, 2));
      if (!IS_SMOKE) dialog.showErrorBox('EduMaster', USER_MESSAGES.MIGRATION_FAILED);
      app.exit(1);
      return;
    }
  }

  // Nâng cấp phiên bản: backup CSDL TRƯỚC khi backend mới chạm vào dữ liệu hiện có.
  const updateGuard = ensureUpdateBackup({ userDataDir, dataDir, version: app.getVersion(), logger });
  smokeResult.updateGuard = { status: updateGuard.status, fromVersion: updateGuard.fromVersion };
  if (updateGuard.status === 'failed') {
    if (SMOKE_OUT) fs.writeFileSync(SMOKE_OUT, JSON.stringify(smokeResult, null, 2));
    if (!IS_SMOKE) dialog.showErrorBox('EduMaster', USER_MESSAGES.UPDATE_BACKUP_FAILED);
    app.exit(1);
    return;
  }

  const bridge = createPowerPointBridge({
    runner: createPowerShellRunner({ logger }),
    uploadsDir: path.join(dataDir, 'uploads'),
    lockDir: path.join(dataDir, 'locks'), // cùng khóa COM với PPTX renderer (backend)
    logger,
  });

  try {
    backend = await startBackend({
      appRoot,
      dataDir,
      execPath: process.execPath,
      asNode: true,
      environment: app.isPackaged ? 'production' : 'development',
      logger,
    });
  } catch (err) {
    logger.error(`[desktop] backend không khởi động được: ${err.code || ''} ${err.message}`);
    if (updateGuard.status === 'backed-up') {
      // Sau nâng cấp mà backend không lên → trả CSDL về trạng thái an toàn trước nâng cấp.
      smokeResult.updateRestore = restoreDatabaseFromBackup({ backup: updateGuard.backup, dataDir, logger });
    }
    smokeResult.error = `backend: ${err.code || err.message}`;
    if (SMOKE_OUT) fs.writeFileSync(SMOKE_OUT, JSON.stringify(smokeResult, null, 2));
    if (!IS_SMOKE) dialog.showErrorBox('EduMaster', USER_MESSAGES.BACKEND_START_FAILED);
    app.exit(1);
    return;
  }
  logger.info(`[desktop] backend sẵn sàng (pid ${backend.pid}).`);
  try { writeVersionState(userDataDir, app.getVersion()); } catch (err) { logger.warn(`[desktop] không ghi được version-state: ${err.message}`); }

  // Backend chết bất ngờ khi đang chạy → ghi log + thông báo thân thiện (không treo UI vô hạn).
  backend.exited.then((info) => {
    if (quitting) return;
    logger.error(`[desktop] backend dừng bất ngờ (code=${info.code}, signal=${info.signal}).`);
    if (!IS_SMOKE) dialog.showErrorBox('EduMaster', USER_MESSAGES.BACKEND_CRASHED);
    app.quit();
  });

  const handlers = createIpcHandlers({ dialog, getWindow: () => mainWindow, bridge, logger });
  registerIpc({ ipcMain, handlers, backendOrigin: backend.origin, logger });

  // Từ chối mọi yêu cầu quyền trình duyệt trừ nhóm an toàn tối thiểu.
  const ALLOWED_PERMISSIONS = new Set(['fullscreen', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(ALLOWED_PERMISSIONS.has(permission)));

  powerMonitor.on('suspend', () => sendLifecycle('suspend'));
  powerMonitor.on('resume', () => sendLifecycle('resume'));

  createMainWindow(backend.origin);
  if (IS_SMOKE) {
    mainWindow.webContents.once('did-finish-load', () => { runSmoke(); });
  }
}

// Đóng ứng dụng: phát lifecycle → tắt backend êm (SQLite đóng, không "database locked") → thoát.
app.on('before-quit', (event) => {
  if (quitting) return;
  quitting = true;
  event.preventDefault();
  (async () => {
    try {
      sendLifecycle('beforeExit');
      sendLifecycle('shutdown');
      if (backend) {
        const res = await backend.stop();
        logger?.info(`[desktop] backend đã dừng (graceful=${res.graceful}, code=${res.code}).`);
        smokeResult.backendStop = res;
        if (IS_SMOKE && SMOKE_OUT) fs.writeFileSync(SMOKE_OUT, JSON.stringify(smokeResult, null, 2));
      }
    } catch (err) {
      logger?.error(`[desktop] lỗi khi tắt: ${err.message}`);
    } finally {
      app.exit(exitCode);
    }
  })();
});

app.on('window-all-closed', () => app.quit());

if (!app.requestSingleInstanceLock() && !IS_SMOKE) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(boot).catch((err) => {
    console.error('[desktop] lỗi khởi động:', err);
    app.exit(1);
  });
}
