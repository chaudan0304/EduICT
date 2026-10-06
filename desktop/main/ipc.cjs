'use strict';
// ipc — các handler IPC của Native Layer. Electron objects được TIÊM vào (dialog, ...) để test được bằng Node thuần.
//
// Nguyên tắc tối thiểu quyền:
//  - Renderer KHÔNG nhận fs/process/shell. Chỉ có: capability, file dialog, message dialog, 9 phương thức bridge.
//  - Không có API "đọc/ghi path tùy ý": openFile chỉ đọc file do NGƯỜI DÙNG chọn trong hộp thoại native;
//    saveFile chỉ ghi vào nơi NGƯỜI DÙNG chọn.
//  - Mọi kênh kiểm tra sender (đúng origin backend) trước khi chạy.
//  - Lỗi → {ok:false, code, message}; không stack trace.

const fs = require('node:fs');
const path = require('node:path');
const { BRIDGE_METHODS, ERROR_CODES } = require('../native/bridgeMethods.cjs');
const { isTrustedSender, clampText, sanitizeFilters, sanitizeFileName } = require('./security.cjs');
const { noopLogger } = require('./logger.cjs');

const MAX_OPEN_BYTES = 300 * 1024 * 1024;
const MAX_SAVE_BYTES = 300 * 1024 * 1024;

const MIME_BY_EXT = {
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.sqlite': 'application/vnd.sqlite3',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain',
};

function denied(code = 'DESKTOP_PERMISSION_DENIED') {
  return { ok: false, code, message: ERROR_CODES[code] };
}

function platformName(platform) {
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  return 'linux';
}

function createIpcHandlers({
  dialog,
  getWindow = () => null,
  bridge,
  linkedPresentations,
  presentationWindow,
  presentationHost,
  platform = process.platform,
  logger = noopLogger,
  fsImpl = fs,
} = {}) {
  const win = () => getWindow() || undefined;

  async function getCapabilities() {
    let ppt = { installed: false };
    try {
      ppt = await bridge.probe();
    } catch (err) {
      logger.warn(`[ipc] probe PowerPoint lỗi: ${err.message}`);
    }
    return {
      isDesktop: true,
      platform: platformName(platform),
      canOpenFile: true,
      canSelectFile: true,
      canSelectFolder: true,
      canShowNativeDialog: true,
      // Renderer không có quyền filesystem tùy ý — chỉ qua hộp thoại do người dùng chọn.
      canAccessNativeFilesystem: false,
      canOpenPowerPoint: Boolean(ppt.installed),
      canControlPowerPoint: Boolean(ppt.installed),
    };
  }

  async function openFile(payload = {}) {
    const filters = sanitizeFilters(payload.filters);
    const result = await dialog.showOpenDialog(win(), {
      title: clampText(payload.title, 120) || undefined,
      properties: payload.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: filters.length ? filters : undefined,
    });
    if (result.canceled || !result.filePaths.length) return { ok: true, canceled: true, files: [] };

    const files = [];
    for (const filePath of result.filePaths) {
      const stat = await fsImpl.promises.stat(filePath);
      if (!stat.isFile()) continue;
      if (stat.size > MAX_OPEN_BYTES) return denied('FILE_TOO_LARGE');
      const data = await fsImpl.promises.readFile(filePath);
      const name = path.basename(filePath);
      files.push({
        name,
        size: stat.size,
        type: MIME_BY_EXT[path.extname(name).toLowerCase()] || 'application/octet-stream',
        data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      });
    }
    return { ok: true, canceled: false, files };
  }

  async function saveFile(payload = {}) {
    const raw = payload.data;
    let buffer;
    if (typeof raw === 'string') buffer = Buffer.from(raw, 'utf8');
    else if (raw instanceof ArrayBuffer) buffer = Buffer.from(raw);
    else if (ArrayBuffer.isView(raw)) buffer = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
    else return denied('DESKTOP_PERMISSION_DENIED');
    if (buffer.length > MAX_SAVE_BYTES) return denied('FILE_TOO_LARGE');

    const filters = sanitizeFilters(payload.filters);
    const result = await dialog.showSaveDialog(win(), {
      defaultPath: sanitizeFileName(payload.defaultName),
      filters: filters.length ? filters : undefined,
    });
    if (result.canceled || !result.filePath) return { ok: true, canceled: true, saved: false };
    await fsImpl.promises.writeFile(result.filePath, buffer);
    return { ok: true, canceled: false, saved: true };
  }

  async function selectPresentationFile() {
    if (!linkedPresentations) return denied();
    const result = await dialog.showOpenDialog(win(), {
      title: 'Liên kết PowerPoint trên máy', properties: ['openFile'],
      filters: [{ name: 'PowerPoint', extensions: ['pptx', 'ppt'] }],
    });
    if (result.canceled || !result.filePaths.length) return { ok: true, canceled: true, file: null };
    const file = linkedPresentations.grant(result.filePaths[0]);
    if (!file.ok) return denied(file.code);
    return { ok: true, canceled: false, file: { path: file.path, name: file.name, size: file.size } };
  }

  async function selectFolder(payload = {}) {
    const result = await dialog.showOpenDialog(win(), {
      title: clampText(payload.title, 120) || undefined,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return { ok: true, canceled: true, path: null };
    return { ok: true, canceled: false, path: result.filePaths[0] };
  }

  // Hộp thoại thông báo native. prompt KHÔNG có native thật trong Electron → trả null (frontend dùng fallback web).
  async function messageDialog(payload = {}) {
    const kind = payload.kind;
    const message = clampText(payload.message);
    const title = clampText(payload.title, 120) || 'EduMaster';
    if (kind === 'confirm') {
      const r = await dialog.showMessageBox(win(), {
        type: 'question', title, message, buttons: ['Đồng ý', 'Hủy'], defaultId: 0, cancelId: 1, noLink: true,
      });
      return { ok: true, value: r.response === 0 };
    }
    if (kind === 'alert' || kind === 'error') {
      await dialog.showMessageBox(win(), {
        type: kind === 'error' ? 'error' : 'info', title, message, buttons: ['OK'], noLink: true,
      });
      return { ok: true, value: true };
    }
    return denied();
  }

  async function bridgeCall(payload = {}) {
    const { method, arg } = payload;
    // Whitelist cứng: không có phương thức generic / executeCommand.
    if (typeof method !== 'string' || !BRIDGE_METHODS.includes(method)) return denied();
    if (method === 'openPowerPoint' && typeof arg !== 'string') return denied('INVALID_PRESENTATION_PATH');
    if (method === 'goToSlide' && !Number.isInteger(arg)) return denied('INVALID_SLIDE_INDEX');
    if (presentationHost?.isActive() && ['openPowerPoint', 'closePowerPoint', 'startSlideShow', 'exitSlideShow'].includes(method)) return denied();
    try {
      const result = await bridge[method](arg);
      if (result?.ok !== false && presentationWindow) {
        if (method === 'startSlideShow' && result?.started) await presentationWindow.show();
        if (method === 'exitSlideShow' || method === 'closePowerPoint' ||
          (method === 'getStatus' && result?.slideShowActive === false && presentationWindow.isActive())) presentationWindow.stop();
      }
      return result;
    } catch (err) {
      logger.error(`[ipc] bridge.${method} lỗi: ${err && err.message}`);
      return { ok: false, code: 'POWERPOINT_CONTROL_FAILED', message: ERROR_CODES.POWERPOINT_CONTROL_FAILED };
    }
  }

  async function presentationAction(payload = {}) {
    if (!presentationWindow) return denied();
    if (presentationHost?.isActive()) return denied();
    if (payload.action === 'stop') {
      const exit = await bridge.exitSlideShow();
      if (exit?.ok === false) return exit;
      const close = await bridge.closePowerPoint();
      if (close?.ok === false) return close;
      presentationWindow.stop();
      return { ok: true };
    }
    if (payload.action === 'show') {
      const status = await bridge.getStatus();
      if (!status?.slideShowActive) return { ok: false, message: 'Hãy mở trình chiếu trước.' };
    }
    return presentationWindow.action(payload);
  }

  async function embeddedPresentation(payload = {}, event) {
    if (!presentationHost) return denied();
    if (event?.sender !== getWindow()?.webContents) return denied();
    if (payload.action === 'start') presentationWindow?.dispose();
    return presentationHost.action(payload, event);
  }

  return {
    'edumaster:getCapabilities': getCapabilities,
    'edumaster:openFile': openFile,
    'edumaster:selectPresentationFile': selectPresentationFile,
    'edumaster:saveFile': saveFile,
    'edumaster:selectFolder': selectFolder,
    'edumaster:dialog': messageDialog,
    'edumaster:bridge': bridgeCall,
    'edumaster:presentationWindow': presentationAction,
    'edumaster:presentationHost': embeddedPresentation,
  };
}

// Gắn handler vào ipcMain, kiểm tra sender; handler lỗi → structured error (không throw stack ra renderer).
function registerIpc({ ipcMain, handlers, backendOrigin, logger = noopLogger }) {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (event, payload) => {
      if (!isTrustedSender(event, backendOrigin)) {
        logger.warn(`[ipc] từ chối ${channel}: sender không tin cậy`);
        return denied();
      }
      try {
        return await handler(payload, event);
      } catch (err) {
        logger.error(`[ipc] ${channel} lỗi: ${err && err.message}`);
        return { ok: false, code: 'DESKTOP_PERMISSION_DENIED', message: ERROR_CODES.DESKTOP_PERMISSION_DENIED };
      }
    });
  }
}

module.exports = { createIpcHandlers, registerIpc, MAX_OPEN_BYTES };
