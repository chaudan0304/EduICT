// nativeAdapterBootstrap — nối Native Layer (nếu có) vào các service Phase 10 (Phase 11).
//
// Đọc API tối thiểu do Desktop Shell cung cấp tại window.eduMaster.desktop và đăng ký nó như một
// "native adapter" qua DesktopCapabilityService.registerNativeAdapter().
//   - WEB mode: window.eduMaster không tồn tại → KHÔNG làm gì (trả false). Web hoạt động như trước.
//   - DESKTOP mode: capability, file dialog, message dialog, lifecycle và Desktop Bridge được bật.
// React không import/require bất kỳ API native nào; chỉ biết adapter đã đăng ký.

import { registerNativeAdapter } from './DesktopCapabilityService.js';
import AppLifecycleService from './AppLifecycleService.js';
import { implementsDesktopBridge } from './desktopBridgeContract.js';

function isDesktopApi(api) {
  return Boolean(
    api &&
      typeof api.getCapabilities === 'function' &&
      typeof api.openFile === 'function' &&
      typeof api.saveFile === 'function' &&
      typeof api.selectFolder === 'function' &&
      api.dialog &&
      implementsDesktopBridge(api.bridge)
  );
}

function nativeError(result) {
  const err = new Error((result && result.message) || 'Thao tác native thất bại.');
  err.code = (result && result.code) || 'DESKTOP_PERMISSION_DENIED';
  return err;
}

function createNativeAdapter(api) {
  return {
    getCapabilities: () => api.getCapabilities(),

    // Trả về mô tả file {name,size,type,data}; FileDialogService chuyển thành File như bản web.
    async openFile(options = {}) {
      const res = await api.openFile({
        filters: options.filters,
        multiple: Boolean(options.multiple),
        title: options.title,
      });
      if (!res || res.ok === false) throw nativeError(res);
      return res.files || [];
    },

    async saveFile(options = {}) {
      let data = options.data;
      if (typeof Blob !== 'undefined' && data instanceof Blob) data = await data.arrayBuffer();
      const res = await api.saveFile({
        data,
        defaultName: options.defaultName,
        filters: options.filters,
      });
      if (!res || res.ok === false) throw nativeError(res);
      return Boolean(res.saved);
    },

    async selectFolder(options = {}) {
      const res = await api.selectFolder({ title: options.title });
      if (!res || res.ok === false) throw nativeError(res);
      return res.path || null;
    },

    // Hộp thoại native bất đồng bộ. Không có prompt native → DialogService dùng fallback web.
    dialog: {
      alert: async (message) => { await api.dialog.alert(message); },
      confirm: async (message) => Boolean((await api.dialog.confirm(message))?.value),
      error: async (message) => { await api.dialog.error(message); },
    },

    bridge: api.bridge,
  };
}

// Gọi một lần lúc khởi động (main.jsx). Trả true nếu đã đăng ký native adapter.
function installNativeAdapter(win = typeof window !== 'undefined' ? window : undefined) {
  const api = win && win.eduMaster && win.eduMaster.desktop;
  if (!isDesktopApi(api)) return false;

  registerNativeAdapter(createNativeAdapter(api));

  AppLifecycleService.initialize();
  if (typeof api.onLifecycle === 'function') {
    api.onLifecycle((name) => AppLifecycleService._emit(name));
  }
  return true;
}

export default installNativeAdapter;
export { installNativeAdapter, createNativeAdapter, isDesktopApi };
