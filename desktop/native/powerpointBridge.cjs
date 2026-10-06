'use strict';
// powerpointBridge — hiện thực Desktop Bridge Contract (src/services/desktopBridgeContract.js) cho PowerPoint.
//
// COM chỉ nằm ở Native Layer: script powerpoint-bridge.ps1 (hành động cố định, args qua mảng, shell:false).
// React/PresentationService KHÔNG chạm COM/PowerShell/child_process.
// Mọi lỗi → { ok:false, code, message } (không stack trace, không throw ra UI); chi tiết đi vào log.
// original.pptx là nguồn sự thật: bridge chỉ MỞ file gốc (read-only), không sinh file thay thế.

const path = require('node:path');
const { spawn } = require('node:child_process');
const { BRIDGE_METHODS, ERROR_CODES } = require('./bridgeMethods.cjs');
const { validatePresentationPath } = require('./pathValidation.cjs');
const { noopLogger } = require('../main/logger.cjs');
const { withPowerPointLock } = require('../../server/services/powerpointLock.cjs');

// powershell.exe không đọc được file trong app.asar → bản đóng gói dùng app.asar.unpacked (asarUnpack).
const DEFAULT_SCRIPT = path.join(__dirname, 'powerpoint-bridge.ps1').replace(/([\\/])app\.asar(?=[\\/])/i, '$1app.asar.unpacked');
const ACTION_TIMEOUT_MS = { Open: 60000, default: 20000 };

function failure(code, message) {
  const known = ERROR_CODES[code] ? code : 'POWERPOINT_CONTROL_FAILED';
  return { ok: false, code: known, message: message || ERROR_CODES[known] };
}

// Runner mặc định: chạy script PowerShell cố định, parse dòng JSON cuối của stdout.
function createPowerShellRunner({ scriptPath = DEFAULT_SCRIPT, spawnImpl = spawn, logger = noopLogger } = {}) {
  return function run(action, params = {}) {
    return new Promise((resolve, reject) => {
      const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', action];
      if (typeof params.path === 'string') args.push('-PptxPath', params.path);
      if (typeof params.allowedRoot === 'string') args.push('-AllowedRoot', params.allowedRoot);
      if (Number.isInteger(params.index)) args.push('-Index', String(params.index));

      let child;
      try {
        child = spawnImpl('powershell.exe', args, { windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err) {
        err.code = err.code || 'POWERPOINT_UNAVAILABLE';
        reject(err);
        return;
      }

      let stdout = '';
      let stderr = '';
      const timeout = ACTION_TIMEOUT_MS[action] || ACTION_TIMEOUT_MS.default;
      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch {
          /* đã thoát */
        }
        reject(Object.assign(new Error(`PowerPoint bridge timeout (${action})`), { code: 'POWERPOINT_BUSY' }));
      }, timeout);

      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr += d; });
      child.once('error', (err) => {
        clearTimeout(timer);
        err.code = 'POWERPOINT_UNAVAILABLE';
        reject(err);
      });
      child.once('close', () => {
        clearTimeout(timer);
        if (stderr.trim()) logger.warn(`[powerpoint] ${stderr.trim().slice(0, 500)}`);
        const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        try {
          resolve(JSON.parse(lines[lines.length - 1]));
        } catch {
          reject(Object.assign(new Error('PowerPoint bridge trả về dữ liệu không hợp lệ'), { code: 'POWERPOINT_CONTROL_FAILED' }));
        }
      });
    });
  };
}

function createPowerPointBridge({
  platform = process.platform,
  runner,
  uploadsDir,
  linkedPresentations,
  lockDir = null,
  lockOptions = {},
  logger = noopLogger,
} = {}) {
  const presentationsRoot = uploadsDir ? path.join(uploadsDir, 'presentations') : null;
  let queue = Promise.resolve();
  let probeCache = null;
  let activePath = null;
  let openedByApp = false;

  // COM không an toàn khi chạy song song → tuần tự hóa mọi lời gọi bridge.
  function serialize(fn) {
    const run = queue.then(fn);
    queue = run.catch(() => undefined);
    return run;
  }

  function call(action, params) {
    if (platform !== 'win32') return Promise.resolve(failure('DESKTOP_BRIDGE_UNAVAILABLE'));
    if (typeof runner !== 'function') return Promise.resolve(failure('POWERPOINT_UNAVAILABLE'));
    return serialize(async () => {
      try {
        // Phase 12: cùng khóa liên-tiến-trình với PPTX renderer (backend). Không có lockDir → chỉ hàng đợi in-process.
        if (action !== 'Probe' && action !== 'Open' && !activePath) {
          if (action === 'Close') return { ok: true, closed: true, closedCount: 0 };
          if (action === 'Active') return { ok: true, presentation: null };
          if (action === 'Status') return { ok: true, running: false, slideShowActive: false };
          return failure('POWERPOINT_NOT_RUNNING');
        }
        if (action === 'Close' && !openedByApp) return { ok: true, closed: true, closedCount: 0 };
        const invokeRunner = () => runner(action, action === 'Probe' || action === 'Open' ? params : { ...params, path: activePath });
        const res = lockDir && action !== 'Probe' // Probe chỉ đọc registry, không đụng COM
          ? await withPowerPointLock(lockDir, invokeRunner, { owner: 'bridge', ...lockOptions })
          : await invokeRunner();
        if (!res || typeof res !== 'object') return failure('POWERPOINT_CONTROL_FAILED');
        if (res.ok === false) return failure(res.code);
        if (action === 'Open' && res.opened) {
          openedByApp = activePath === params.path ? openedByApp || Boolean(res.openedByApp) : Boolean(res.openedByApp);
          activePath = params.path;
        }
        if (action === 'Close') { activePath = null; openedByApp = false; }
        return res;
      } catch (err) {
        logger.error(`[powerpoint] ${action} thất bại: ${err && err.message}`);
        return failure(err && ERROR_CODES[err.code] ? err.code : 'POWERPOINT_UNAVAILABLE');
      }
    });
  }

  async function probe() {
    if (probeCache) return probeCache;
    if (platform !== 'win32') return { installed: false };
    const res = await call('Probe');
    const result = { installed: Boolean(res && res.ok !== false && res.installed) };
    // Chỉ cache kết quả khẳng định; lỗi tạm thời cho phép thử lại.
    if (result.installed || (res && res.ok !== false)) probeCache = result;
    return result;
  }

  const bridge = {
    async openPowerPoint(filePath) {
      if (!presentationsRoot) return failure('INVALID_PRESENTATION_PATH');
      const linked = linkedPresentations?.validate(filePath);
      const v = linked?.ok || linked?.code === 'PRESENTATION_NOT_FOUND' ? linked : validatePresentationPath(filePath, { uploadsDir });
      if (!v.ok) return failure(v.code, v.message);
      return call('Open', { path: v.path });
    },
    closePowerPoint() {
      if (!presentationsRoot) return Promise.resolve(failure('INVALID_PRESENTATION_PATH'));
      return call('Close', { allowedRoot: presentationsRoot });
    },
    getStatus: () => call('Status'),
    async getActivePresentation() {
      const res = await call('Active');
      if (res && res.ok === false) return res;
      return res.presentation || null;
    },
    nextSlide: () => call('Next'),
    previousSlide: () => call('Previous'),
    async goToSlide(index) {
      if (!Number.isInteger(index) || index < 1 || index > 10000) return failure('INVALID_SLIDE_INDEX');
      return call('GoTo', { index });
    },
    startSlideShow: () => call('StartShow'),
    exitSlideShow: () => call('ExitShow'),
  };

  // Chỉ expose đúng các phương thức của contract + probe (nội bộ native layer).
  for (const name of BRIDGE_METHODS) {
    if (typeof bridge[name] !== 'function') throw new Error(`Bridge thiếu phương thức contract: ${name}`);
  }
  return Object.freeze({ ...bridge, probe });
}

module.exports = { createPowerPointBridge, createPowerShellRunner, failure, DEFAULT_SCRIPT };
