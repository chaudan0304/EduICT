// AppLifecycleService — lớp trừu tượng cho vòng đời ứng dụng.
//
// Mục tiêu (Giai đoạn 1): thay việc gọi trực tiếp window.location.reload()
// bằng một API trung gian, để EduMaster Desktop sau này có thể dùng cơ chế
// restart/reload riêng (Electron/Tauri) mà không phải sửa call site.
//
// WEB mode (hiện tại): ủy quyền thẳng cho window.location.reload().
// DESKTOP mode (tương lai): thay bằng cơ chế reload của desktop shell.

function isBrowser() {
  return typeof window !== 'undefined';
}

// Tải lại toàn bộ ứng dụng (VD: sau khi phục hồi backup / import SQL).
function reloadApplication() {
  if (isBrowser() && window.location && typeof window.location.reload === 'function') {
    window.location.reload();
  }
}

const AppLifecycleService = { reloadApplication };

export default AppLifecycleService;
export { reloadApplication };
