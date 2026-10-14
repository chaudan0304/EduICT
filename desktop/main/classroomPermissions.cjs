'use strict';
const { isAllowedNavigation } = require('./security.cjs');

// Audio capture is a one-request grant for EduICT's main frame only.
// Embedded PowerPoint/other frames and video capture remain denied.
function installClassroomPermissions({ session, dialog, getWindow, origin }) {
  const safe = new Set(['fullscreen', 'clipboard-sanitized-write']);
  let asking = false;
  const trusted = (contents, details) => {
    const win = getWindow();
    return win && !win.isDestroyed() && contents && !contents.isDestroyed()
      && contents === win.webContents && details.isMainFrame === true
      && isAllowedNavigation(origin, contents.getURL())
      && isAllowedNavigation(origin, details.requestingUrl);
  };
  session.setPermissionCheckHandler((_contents, permission) => safe.has(permission));
  session.setPermissionRequestHandler(async (contents, permission, callback, details = {}) => {
    if (safe.has(permission)) { callback(true); return; }
    if (permission !== 'media' || asking || !trusted(contents, details)
      || !Array.isArray(details.mediaTypes) || details.mediaTypes.length !== 1 || details.mediaTypes[0] !== 'audio') {
      callback(false); return;
    }
    asking = true;
    try {
      const result = await dialog.showMessageBox(getWindow(), {
        type: 'question', title: 'EduICT · Quyền sử dụng micro',
        message: 'Cho phép EduICT dùng micro cho hoạt động lớp học?',
        detail: 'Chỉ phân tích mức âm thanh trên máy. Không ghi âm, lưu hoặc gửi âm thanh. Bạn có thể tắt micro trong trò chơi; khi rời trò chơi micro sẽ tắt.',
        buttons: ['Không cho phép', 'Cho phép lần này'], defaultId: 0, cancelId: 0, noLink: true,
      });
      callback(result.response === 1 && Boolean(trusted(contents, details)));
    } catch { callback(false); }
    finally { asking = false; }
  });
}

module.exports = { installClassroomPermissions };
