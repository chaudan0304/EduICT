'use strict';
// preload — cầu nối TỐI THIỂU giữa renderer và Native Layer (contextIsolation: true, sandbox: true).
//
// Renderer chỉ thấy  window.eduMaster.desktop = { getCapabilities, openFile, saveFile, selectFolder,
//   dialog:{alert,confirm,error}, bridge:{9 phương thức contract}, onLifecycle }.
// KHÔNG expose require / process / ipcRenderer / fs / shell / lệnh tùy ý.
// (Preload sandbox không require được file cục bộ → danh sách phương thức được lặp lại ở đây;
//  test phase11 đối chiếu với desktopBridgeContract.js.)

const { contextBridge, ipcRenderer } = require('electron');

const BRIDGE_METHODS = [
  'openPowerPoint',
  'closePowerPoint',
  'getStatus',
  'getActivePresentation',
  'nextSlide',
  'previousSlide',
  'goToSlide',
  'startSlideShow',
  'exitSlideShow',
];
const LIFECYCLE_EVENTS = ['beforeExit', 'shutdown', 'resume', 'suspend'];

const bridge = {};
for (const method of BRIDGE_METHODS) {
  bridge[method] = (arg) => ipcRenderer.invoke('edumaster:bridge', { method, arg });
}

const desktop = {
  getCapabilities: () => ipcRenderer.invoke('edumaster:getCapabilities'),
  openFile: (options) => ipcRenderer.invoke('edumaster:openFile', options),
  selectPresentationFile: () => ipcRenderer.invoke('edumaster:selectPresentationFile'),
  saveFile: (options) => ipcRenderer.invoke('edumaster:saveFile', options),
  selectFolder: (options) => ipcRenderer.invoke('edumaster:selectFolder', options),
  dialog: {
    alert: (message) => ipcRenderer.invoke('edumaster:dialog', { kind: 'alert', message }),
    confirm: (message) => ipcRenderer.invoke('edumaster:dialog', { kind: 'confirm', message }),
    error: (message) => ipcRenderer.invoke('edumaster:dialog', { kind: 'error', message }),
  },
  bridge,
  presentationWindow: (options) => ipcRenderer.invoke('edumaster:presentationWindow', options),
  onNavigate: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, tab) => { if (['timer', 'goodscores', 'luckywheel'].includes(tab)) callback(tab); };
    ipcRenderer.on('edumaster:navigate', handler);
    return () => ipcRenderer.removeListener('edumaster:navigate', handler);
  },
  // Đăng ký nhận sự kiện vòng đời do Native Layer phát; trả hàm hủy đăng ký.
  onLifecycle: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, name) => {
      if (LIFECYCLE_EVENTS.includes(name)) callback(name);
    };
    ipcRenderer.on('edumaster:lifecycle', handler);
    return () => ipcRenderer.removeListener('edumaster:lifecycle', handler);
  },
};

contextBridge.exposeInMainWorld('eduMaster', Object.freeze({ desktop: Object.freeze(desktop) }));
