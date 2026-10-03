'use strict';
// backendProcess — vòng đời tiến trình Node backend (server.js HIỆN TẠI, không đổi kiến trúc).
//
//   cổng động (127.0.0.1) → spawn server.js → chờ GET /api/health → trả {origin, stop}
//
// Trong Electron: execPath = process.execPath + ELECTRON_RUN_AS_NODE=1 → dùng Node nhúng sẵn
// (Node 24, có node:sqlite) nên máy người dùng KHÔNG cần cài Node.
// Tắt êm: gửi {type:'shutdown'} qua kênh IPC (Windows không có SIGTERM êm); quá hạn mới kill.

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { waitForHealth, makeError } = require('./healthCheck.cjs');
const { noopLogger } = require('./logger.cjs');
const {
  BACKEND_HOST,
  BACKEND_START_TIMEOUT_MS,
  BACKEND_STOP_TIMEOUT_MS,
  buildBackendEnv,
} = require('../config/desktopConfig.cjs');

function pickFreePort(host = BACKEND_HOST) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, host, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startBackend({
  appRoot,
  dataDir,
  execPath = process.execPath,
  entry = path.join(appRoot, 'server.js'),
  asNode = false,
  startTimeoutMs = BACKEND_START_TIMEOUT_MS,
  stopTimeoutMs = BACKEND_STOP_TIMEOUT_MS,
  baseEnv = process.env,
  environment = 'development',
  logger = noopLogger,
} = {}) {
  if (!appRoot || !dataDir) throw makeError('BACKEND_CONFIG_INVALID', 'Thiếu appRoot/dataDir.');

  const port = await pickFreePort();
  const origin = `http://${BACKEND_HOST}:${port}`;
  const env = buildBackendEnv({ appRoot, dataDir, port, baseEnv, asNode, environment });
  // cwd phải là thư mục THỰC (bản đóng gói: appRoot nằm trong app.asar → không làm cwd được).
  // Mọi đường dẫn của backend đều lấy từ EDUICT_APP_ROOT/EDUICT_DATA_DIR (pathService), không dùng cwd.
  fs.mkdirSync(dataDir, { recursive: true });

  const child = spawn(execPath, [entry], {
    cwd: dataDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });

  let exited = false;
  let exitInfo = null;
  const output = [];
  const exitPromise = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      exited = true;
      exitInfo = { code, signal };
      resolve(exitInfo);
    });
  });
  child.once('error', (err) => logger.error(`[backend] spawn error: ${err.message}`));

  const onData = (stream) => (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (!line.trim()) continue;
      output.push(line);
      if (output.length > 500) output.shift();
      logger.info(`[backend:${stream}] ${line}`);
    }
  };
  child.stdout.on('data', onData('out'));
  child.stderr.on('data', onData('err'));

  async function forceKill() {
    if (exited) return;
    try {
      child.kill();
    } catch {
      /* đã thoát */
    }
    await Promise.race([exitPromise, new Promise((r) => setTimeout(r, 2000))]);
  }

  // Tắt êm; chỉ kill cưỡng bức khi quá hạn.
  async function stop() {
    if (exited) return { graceful: true, ...exitInfo };
    let requested = false;
    if (child.connected) {
      try {
        child.send({ type: 'shutdown' });
        requested = true;
      } catch {
        /* kênh đã đóng */
      }
    }
    if (!requested) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* đã thoát */
      }
    }
    let timer;
    const timedOut = await Promise.race([
      exitPromise.then(() => false),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(true), stopTimeoutMs);
      }),
    ]);
    clearTimeout(timer);
    if (timedOut) {
      logger.warn('[backend] tắt êm quá hạn, kill cưỡng bức.');
      await forceKill();
      return { graceful: false, ...exitInfo };
    }
    return { graceful: exitInfo.code === 0, ...exitInfo };
  }

  try {
    await waitForHealth({ baseUrl: origin, timeoutMs: startTimeoutMs, isAlive: () => !exited });
  } catch (err) {
    logger.error(`[backend] không sẵn sàng (${err.code || 'ERR'}): ${err.message}`);
    await forceKill();
    throw err;
  }

  return {
    port,
    origin,
    pid: child.pid,
    child,
    stop,
    isRunning: () => !exited,
    getOutput: () => output.slice(),
    exited: exitPromise,
  };
}

module.exports = { startBackend, pickFreePort };
