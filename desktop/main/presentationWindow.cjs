'use strict';

const path = require('node:path');
const { WEB_PREFERENCES } = require('../config/desktopConfig.cjs');
const { isAllowedNavigation } = require('./security.cjs');
const TOOL_TABS = new Set(['timer', 'goodscores', 'luckywheel']);

// A separate native window is required: DOM z-index cannot cover a PowerPoint window.
function createPresentationWindow({ BrowserWindow, screen, getWindow, origin }) {
  let toolbar = null;
  let loading = null;
  let pinnedMain = null;
  let wasAlwaysOnTop = false;
  let minimizedMain = null;

  function releaseMain() {
    if (pinnedMain && !pinnedMain.isDestroyed()) pinnedMain.setAlwaysOnTop(wasAlwaysOnTop);
    pinnedMain = null;
  }

  function tools(tab) {
    const main = getWindow();
    if (!main || main.isDestroyed()) return;
    if (!pinnedMain) { pinnedMain = main; wasAlwaysOnTop = main.isAlwaysOnTop(); }
    if (main.isMinimized()) main.restore();
    main.setAlwaysOnTop(true, 'pop-up-menu');
    main.show();
    main.focus();
    if (TOOL_TABS.has(tab)) main.webContents.send('edumaster:navigate', tab);
    if (toolbar && !toolbar.isDestroyed()) toolbar.moveTop();
  }

  function stop({ returnToApp = true } = {}) {
    const existed = Boolean(toolbar || pinnedMain || minimizedMain);
    const old = toolbar;
    toolbar = null;
    releaseMain();
    if (old && !old.isDestroyed()) old.destroy();
    const main = getWindow();
    if (returnToApp && existed && main && !main.isDestroyed()) {
      if (main.isMinimized()) main.restore();
      main.show();
      main.focus();
    }
    minimizedMain = null;
  }

  async function show() {
    if (loading) return loading;
    if (toolbar && !toolbar.isDestroyed()) { toolbar.showInactive(); toolbar.moveTop(); return; }
    const main = getWindow();
    const display = main && !main.isDestroyed() ? screen.getDisplayMatching(main.getBounds()) : screen.getPrimaryDisplay();
    const area = display.workArea;
    const width = Math.min(580, area.width);
    const win = new BrowserWindow({
      width, height: 186, x: Math.round(area.x + (area.width - width) / 2), y: area.y + area.height - 206,
      frame: false, resizable: false, maximizable: false, minimizable: false,
      skipTaskbar: true, show: false, backgroundColor: '#10243a', title: 'EduICT · Công cụ trình chiếu',
      webPreferences: { ...WEB_PREFERENCES, preload: path.join(__dirname, '..', 'preload', 'preload.cjs') },
    });
    toolbar = win;
    win.setMenuBarVisibility(false);
    win.setAlwaysOnTop(true, 'screen-saver');
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
      if (!isAllowedNavigation(origin, url)) event.preventDefault();
    });
    win.on('closed', () => {
      if (toolbar === win) { toolbar = null; releaseMain(); }
    });
    loading = win.loadURL(`${origin}/?desktopView=powerpoint-tools`).then(() => {
      if (toolbar === win && !win.isDestroyed()) { win.showInactive(); win.moveTop(); }
    }).catch(err => {
      if (toolbar === win) { stop(); throw err; }
    }).finally(() => { loading = null; });
    return loading;
  }

  async function action({ action: name, tab } = {}) {
    if (name === 'show') { await show(); return { ok: true }; }
    if (!toolbar || toolbar.isDestroyed()) return { ok: false, message: 'Chưa có thanh công cụ trình chiếu.' };
    if (name === 'tools') {
      if (tab !== undefined && !TOOL_TABS.has(tab)) return { ok: false, message: 'Công cụ không hợp lệ.' };
      tools(tab);
    } else if (name === 'slides') {
      releaseMain();
      const main = getWindow();
      if (main && !main.isDestroyed()) { minimizedMain = main; main.minimize(); }
      toolbar.showInactive();
      toolbar.moveTop();
    } else if (name === 'compact' || name === 'expand') {
      const bounds = toolbar.getBounds();
      const area = screen.getDisplayMatching(bounds).workArea;
      const height = name === 'compact' ? 48 : 186;
      toolbar.setBounds({ ...bounds, height, y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)) });
    } else return { ok: false, message: 'Thao tác không hợp lệ.' };
    return { ok: true };
  }

  return { show, stop, action, isActive: () => Boolean(toolbar), dispose: () => stop({ returnToApp: false }) };
}

module.exports = { createPresentationWindow };
