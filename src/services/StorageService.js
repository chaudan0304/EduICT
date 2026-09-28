// StorageService — lớp trừu tượng cho lưu trữ phía trình duyệt.
//
// Mục tiêu (Giai đoạn 1): loại bỏ việc business logic gọi trực tiếp
// localStorage / sessionStorage, để EduMaster Desktop sau này có thể thay
// bằng file-backed storage mà không phải sửa call site.
//
// NGUYÊN TẮC QUAN TRỌNG:
//   - Đây là pass-through THÔ theo đúng ngữ nghĩa Web Storage: get/set thao
//     tác trên CHUỖI, KHÔNG tự động JSON.stringify/parse. Nhờ vậy dữ liệu
//     hiện có (đang được các module tự JSON.parse) giữ nguyên định dạng,
//     không mất dữ liệu và không đổi behavior.
//   - WEB mode: ủy quyền thẳng cho window.localStorage / sessionStorage.
//   - DESKTOP mode (tương lai): triển khai lại bằng file-backed storage.

function isBrowser() {
  return typeof window !== 'undefined';
}

// Tạo một adapter cho một backend Web Storage cụ thể (local hoặc session).
function createStorage(getBackend) {
  return {
    get(key) {
      if (!isBrowser()) return null;
      return getBackend().getItem(key);
    },
    set(key, value) {
      if (!isBrowser()) return;
      getBackend().setItem(key, value);
    },
    remove(key) {
      if (!isBrowser()) return;
      getBackend().removeItem(key);
    },
    clear() {
      if (!isBrowser()) return;
      getBackend().clear();
    },
  };
}

const local = createStorage(() => window.localStorage);
const session = createStorage(() => window.sessionStorage);

// API mặc định ánh xạ tới localStorage (giữ nguyên hành vi phổ biến nhất).
const StorageService = {
  get: local.get,
  set: local.set,
  remove: local.remove,
  clear: local.clear,
  local,
  session,
};

export default StorageService;
export { local, session };
