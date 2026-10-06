'use strict';
const { randomUUID } = require('node:crypto');
const { createPowerPointWindowHost } = require('../native/powerpointWindowHost.cjs');
const { ERROR_CODES } = require('../native/bridgeMethods.cjs');
const { noopLogger } = require('./logger.cjs');

function createPresentationHost({ getWindow, screen, bridge, logger = noopLogger }) {
  let session = null;
  let worker = null;
  let opened = false;
  let queue = Promise.resolve();
  let layoutTimer = null;
  let removeListeners = () => {};
  const failure = message => ({ ok: false, code: 'POWERPOINT_EMBED_FAILED', message: message || ERROR_CODES.POWERPOINT_EMBED_FAILED });

  function serial(fn) {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  }
  function validBounds(bounds) {
    return bounds && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key]) && Math.abs(bounds[key]) <= 16384) && bounds.width >= 1 && bounds.height >= 1;
  }
  function metadata() {
    if (!session) return { active: false };
    return { active: true, sessionId: session.id, name: session.name, slideCount: session.slideCount, currentSlide: session.currentSlide, aspectRatio: session.aspectRatio };
  }
  async function publishLayout() {
    const main = getWindow();
    const current = session;
    const host = worker;
    if (!current || !host || !main || main.isDestroyed()) return { ok: true, active: false };
    const content = main.getContentBounds();
    const zoom = main.webContents.getZoomFactor();
    const raw = current.bounds;
    const x = Math.max(0, Math.min(content.width - 1, raw.x * zoom));
    const y = Math.max(0, Math.min(content.height - 1, raw.y * zoom));
    const rect = {
      x: Math.round(content.x + x), y: Math.round(content.y + y),
      width: Math.max(1, Math.round(Math.min(raw.width * zoom, content.width - x))),
      height: Math.max(1, Math.round(Math.min(raw.height * zoom, content.height - y))),
    };
    const physical = screen.dipToScreenRect(main, rect);
    return host.command('layout', { ...physical, visible: current.visible && main.isVisible() && !main.isMinimized() });
  }
  function scheduleLayout() {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => publishLayout().catch(err => logger.warn(`[presentation-host] layout: ${err.message}`)), 35);
  }
  function bindWindow(main) {
    const contents = main.webContents;
    const events = ['move', 'resize', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen', 'show', 'hide', 'minimize', 'restore'];
    for (const event of events) main.on(event, scheduleLayout);
    screen.on('display-metrics-changed', scheduleLayout);
    const reset = () => stop().catch(err => logger.warn(`[presentation-host] reset: ${err.message}`));
    const navigate = (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame) reset(); };
    contents.on('did-start-navigation', navigate);
    contents.on('render-process-gone', reset);
    removeListeners = () => {
      for (const event of events) main.removeListener(event, scheduleLayout);
      screen.removeListener('display-metrics-changed', scheduleLayout);
      contents.removeListener('did-start-navigation', navigate);
      contents.removeListener('render-process-gone', reset);
    };
  }

  async function finish({ returnToApp = true } = {}) {
    const hadPresentation = Boolean(session || opened);
    clearTimeout(layoutTimer);
    removeListeners(); removeListeners = () => {};
    session = null;
    const host = worker; worker = null;
    if (host) {
      try { await host.command('detach'); } catch (err) { logger.warn(`[presentation-host] detach: ${err.message}`); }
      await host.dispose();
    }
    if (!opened) return { ok: true, active: false };
    opened = false;
    const exit = await bridge.exitSlideShow();
    const close = await bridge.closePowerPoint();
    const main = getWindow();
    if (returnToApp && hadPresentation && main && !main.isDestroyed() && main.isVisible() && !main.isMinimized()) main.focus();
    return exit?.ok === false && exit.code !== 'POWERPOINT_NOT_RUNNING' ? exit : close;
  }

  async function start(payload) {
    if (typeof payload.filePath !== 'string' || !validBounds(payload.bounds) || typeof payload.visible !== 'boolean') return failure('Thông tin khung trình chiếu không hợp lệ.');
    const main = getWindow();
    if (!main || main.isDestroyed()) return failure();
    if (worker || session) await finish();
    const bytes = main.getNativeWindowHandle();
    const ownerHandle = (bytes.length >= 8 ? bytes.readBigUInt64LE() : BigInt(bytes.readUInt32LE())).toString();
    worker = createPowerPointWindowHost({ ownerHandle, logger });
    try {
      await worker.ready;
      const resultOpen = await bridge.openPowerPoint(payload.filePath);
      if (resultOpen?.ok === false) { await worker.dispose(); worker = null; return resultOpen; }
      opened = true;
      const show = await bridge.startWindowedSlideShow();
      if (show?.ok === false) { await finish(); return show; }
      const attached = await worker.command('attach', { windowHandle: show.windowHandle });
      if (attached?.ok === false) { await finish(); return failure(); }
      session = { id: randomUUID(), bounds: { ...payload.bounds }, visible: payload.visible, name: show.name,
        slideCount: show.slideCount, currentSlide: show.currentSlide, aspectRatio: show.aspectRatio };
      bindWindow(main);
      if (main.isMinimized()) main.restore();
      main.show(); main.focus();
      const result = await publishLayout();
      if (result?.ok === false || !result?.alive) { await finish(); return failure(); }
      return { ok: true, ...metadata() };
    } catch (err) {
      logger.error(`[presentation-host] start: ${err.message}`);
      await finish();
      return failure();
    }
  }

  function stop(id, options) {
    return serial(async () => {
      if (id && session?.id !== id) return { ok: true, active: false };
      if (!worker && !session) return { ok: true, active: false };
      const result = await finish(options);
      return { ...result, active: false };
    });
  }
  async function action(payload = {}, event) {
    const main = getWindow();
    if (!main || main.isDestroyed() || event?.sender !== main.webContents) return { ok: false, code: 'DESKTOP_PERMISSION_DENIED', message: ERROR_CODES.DESKTOP_PERMISSION_DENIED };
    if (payload.action === 'start') return serial(() => start(payload));
    if (payload.action === 'stop') return stop(payload.sessionId);
    if (!session || session.id !== payload.sessionId) return { ok: false, code: 'POWERPOINT_NOT_RUNNING', message: ERROR_CODES.POWERPOINT_NOT_RUNNING };
    if (payload.action === 'layout') {
      if (!validBounds(payload.bounds) || typeof payload.visible !== 'boolean') return failure('Thông tin khung trình chiếu không hợp lệ.');
      session.bounds = { ...payload.bounds }; session.visible = payload.visible;
      try { return await publishLayout(); } catch { return failure(); }
    }
    if (payload.action === 'status') return serial(async () => {
      if (!session || session.id !== payload.sessionId) return { ok: true, active: false };
      const status = await bridge.getStatus();
      if (status?.ok === false) return status;
      if (!status.slideShowActive) { await finish(); return { ok: true, active: false }; }
      session.currentSlide = status.currentSlide; session.slideCount = status.slideCount;
      return { ok: true, ...metadata() };
    });
    return { ok: false, code: 'DESKTOP_PERMISSION_DENIED', message: ERROR_CODES.DESKTOP_PERMISSION_DENIED };
  }

  return { action, stop, isActive: () => Boolean(session || worker), dispose: () => stop(undefined, { returnToApp: false }) };
}
module.exports = { createPresentationHost };
