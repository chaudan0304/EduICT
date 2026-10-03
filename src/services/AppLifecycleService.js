// AppLifecycleService — lớp trừu tượng cho vòng đời ứng dụng.
//
// Mục tiêu (Giai đoạn 1): thay việc gọi trực tiếp window.location.reload()
// bằng một API trung gian, để EduMaster Desktop sau này có thể dùng cơ chế
// restart/reload riêng (Electron/Tauri) mà không phải sửa call site.
//
// Phase 10: bổ sung initialize/shutdown/beforeExit/onResume/onSuspend.
//   - WEB mode: chỉ dùng sự kiện chuẩn của trình duyệt (visibilitychange,
//     beforeunload) — KHÔNG giả lập shutdown native, không hack nguy hiểm.
//   - DESKTOP mode (tương lai): Native Layer gọi lại các hook này.
//
// WEB mode (hiện tại): reloadApplication ủy quyền thẳng cho window.location.reload().
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

const listeners = {
  beforeExit: new Set(),
  resume: new Set(),
  suspend: new Set(),
  shutdown: new Set(),
};
let initialized = false;
let detach = null;

function subscribe(set, handler) {
  if (typeof handler !== 'function') return () => {};
  set.add(handler);
  return () => set.delete(handler);
}

function emit(set, payload) {
  for (const handler of Array.from(set)) {
    try {
      handler(payload);
    } catch (err) {
      console.error('[AppLifecycle] handler lỗi:', err?.message || err);
    }
  }
}

// Đăng ký các sự kiện vòng đời. Idempotent; an toàn khi không có window (SSR/test).
function initialize() {
  if (initialized) return;
  initialized = true;
  if (!isBrowser() || typeof window.addEventListener !== 'function') return;

  const onVisibility = () => {
    if (typeof document === 'undefined') return;
    emit(document.visibilityState === 'hidden' ? listeners.suspend : listeners.resume, undefined);
  };
  const onBeforeUnload = () => emit(listeners.beforeExit, undefined);

  document.addEventListener?.('visibilitychange', onVisibility);
  window.addEventListener('beforeunload', onBeforeUnload);
  detach = () => {
    document.removeEventListener?.('visibilitychange', onVisibility);
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}

// Gỡ listener và thông báo shutdown (Web: chỉ dọn dẹp, không đóng cửa sổ).
function shutdown() {
  emit(listeners.shutdown, undefined);
  if (detach) detach();
  detach = null;
  initialized = false;
}

const AppLifecycleService = {
  reloadApplication,
  initialize,
  shutdown,
  beforeExit: (handler) => subscribe(listeners.beforeExit, handler),
  onResume: (handler) => subscribe(listeners.resume, handler),
  onSuspend: (handler) => subscribe(listeners.suspend, handler),
  onShutdown: (handler) => subscribe(listeners.shutdown, handler),
  // Hook để Native Layer tương lai phát sự kiện vào cùng hệ thống listener.
  _emit: (name, payload) => listeners[name] && emit(listeners[name], payload),
};

export default AppLifecycleService;
export { reloadApplication, initialize, shutdown };
