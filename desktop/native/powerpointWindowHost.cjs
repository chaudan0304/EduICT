'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');
const { noopLogger } = require('../main/logger.cjs');
const SCRIPT = path.join(__dirname, 'powerpoint-window-host.ps1').replace(/([\\/])app\.asar(?=[\\/])/i, '$1app.asar.unpacked');

function createPowerPointWindowHost({ ownerHandle, ownerProcessId = process.pid, logger = noopLogger }) {
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT,
    '-OwnerHandle', ownerHandle, '-OwnerProcessId', String(ownerProcessId)], { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
  let nextId = 0;
  let ended = false;
  let buffer = '';
  const pending = new Map();
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const readyTimer = setTimeout(() => fail(new Error('Native PowerPoint host timeout')), 15000);

  function fail(err) {
    ended = true;
    clearTimeout(readyTimer);
    rejectReady(err);
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(err); }
    pending.clear();
    try { child.kill(); } catch { /* already stopped */ }
  }
  child.once('error', fail);
  child.stdin.on('error', fail);
  child.once('exit', () => fail(new Error('Native PowerPoint host stopped')));
  child.stderr.on('data', bytes => logger.warn(`[powerpoint-host] ${String(bytes).trim().slice(0, 300)}`));
  child.stdout.on('data', bytes => {
    buffer += bytes.toString('utf8');
    if (buffer.length > 65536) { fail(new Error('Native host output too large')); child.kill(); return; }
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
      let result;
      try { result = JSON.parse(line); } catch { continue; }
      if ('ready' in result) {
        clearTimeout(readyTimer);
        if (result.ready) resolveReady(); else fail(new Error('Cannot initialize native PowerPoint host'));
        continue;
      }
      const request = pending.get(result.id);
      if (!request) continue;
      pending.delete(result.id); clearTimeout(request.timer); request.resolve(result);
    }
  });

  async function command(action, payload = {}) {
    if (!['attach', 'layout', 'detach', 'quit'].includes(action)) throw new Error('Invalid native host command');
    await ready;
    if (ended) throw new Error('Native host is unavailable');
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Native host command timeout')); }, 5000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ ...payload, id, action }) + '\n', err => {
        if (!err) return;
        clearTimeout(timer); pending.delete(id); reject(err);
      });
    });
  }

  async function dispose() {
    if (!ended) {
      try { await command('quit'); } catch { /* worker may have already stopped */ }
      child.stdin.end();
      const timer = setTimeout(() => { if (!ended) child.kill(); }, 1500);
      timer.unref();
    }
  }
  return { ready, command, dispose };
}

module.exports = { createPowerPointWindowHost };
