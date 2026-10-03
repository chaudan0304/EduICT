// DesktopCapabilityService — cho React biết MÁY HIỆN TẠI LÀM ĐƯỢC GÌ, mà không
// cần biết nó chạy trên Electron / Tauri / Windows API / COM (Phase 10).
//
// WEB mode (hiện tại): mọi năng lực native = false.
// DESKTOP mode (tương lai, Phase 11): lớp native gọi registerNativeAdapter(adapter)
// một lần lúc khởi động. Adapter chỉ cần cung cấp các hàm theo hợp đồng
// (xem desktopBridgeContract.js) — React/các service khác KHÔNG đổi.

const WEB_CAPABILITIES = Object.freeze({
  isDesktop: false,
  platform: 'web',
  canOpenFile: false,
  canSelectFile: false,
  canSelectFolder: false,
  canOpenPowerPoint: false,
  canControlPowerPoint: false,
  canShowNativeDialog: false,
  canAccessNativeFilesystem: false,
});

let nativeAdapter = null;

// Chỉ Native Layer tương lai gọi hàm này. adapter.getCapabilities() (đồng bộ
// hoặc async) trả về các khóa năng lực; khóa lạ bị bỏ qua.
function registerNativeAdapter(adapter) {
  nativeAdapter = adapter && typeof adapter === 'object' ? adapter : null;
}

function getNativeAdapter() {
  return nativeAdapter;
}

function unregisterNativeAdapter() {
  nativeAdapter = null;
}

async function getCapabilities() {
  const caps = { ...WEB_CAPABILITIES };
  if (nativeAdapter && typeof nativeAdapter.getCapabilities === 'function') {
    try {
      const native = (await nativeAdapter.getCapabilities()) || {};
      for (const key of Object.keys(WEB_CAPABILITIES)) {
        if (key in native) {
          caps[key] = key === 'platform' ? String(native[key]) : Boolean(native[key]);
        }
      }
    } catch {
      // Adapter lỗi → an toàn quay về năng lực web.
      return { ...WEB_CAPABILITIES };
    }
  }
  return caps;
}

async function hasCapability(name) {
  const caps = await getCapabilities();
  return Boolean(caps[name]);
}

const DesktopCapabilityService = {
  getCapabilities,
  hasCapability,
  registerNativeAdapter,
  unregisterNativeAdapter,
  getNativeAdapter,
};

export default DesktopCapabilityService;
export {
  WEB_CAPABILITIES,
  getCapabilities,
  hasCapability,
  registerNativeAdapter,
  unregisterNativeAdapter,
  getNativeAdapter,
};
