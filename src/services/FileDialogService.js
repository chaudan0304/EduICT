// FileDialogService — chọn/lưu file & thư mục qua một API duy nhất (Phase 10).
//
// WEB mode: dùng <input type="file"> tạm thời (không đổi UX hiện có — các modal
// import hiện tại vẫn dùng input riêng của chúng, service này dành cho code mới).
//   - openFile → trả mảng File (rỗng nếu người dùng hủy).
//   - saveFile → tải xuống bằng thẻ <a download>.
//   - selectFolder → KHÔNG hỗ trợ trên web (trả null).
// DESKTOP mode (tương lai): nếu Native Layer đăng ký adapter có
// openFile/saveFile/selectFolder thì dùng hộp thoại Windows native.

import { getNativeAdapter } from './DesktopCapabilityService.js';

function isBrowser() {
  return typeof document !== 'undefined';
}

function toAccept(filters) {
  if (!Array.isArray(filters)) return '';
  return filters
    .flatMap((f) => (Array.isArray(f?.extensions) ? f.extensions : []))
    .map((ext) => `.${String(ext).replace(/^\./, '')}`)
    .join(',');
}

// Native adapter trả mô tả {name,type,data}; chuyển thành File để call site xử lý giống hệt bản web.
function toFile(item) {
  if (typeof File !== 'undefined' && item instanceof File) return item;
  if (item && item.data !== undefined && typeof File !== 'undefined') {
    return new File([item.data], String(item.name || 'file'), { type: item.type || '' });
  }
  return item;
}

async function openFile(options = {}) {
  const native = getNativeAdapter();
  if (native && typeof native.openFile === 'function') {
    const files = await native.openFile(options);
    return (Array.isArray(files) ? files : []).map(toFile);
  }

  if (!isBrowser()) return [];
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = toAccept(options.filters);
    input.multiple = Boolean(options.multiple);
    input.style.display = 'none';
    input.addEventListener('change', () => resolve(Array.from(input.files || [])));
    input.addEventListener('cancel', () => resolve([]));
    document.body.appendChild(input);
    input.click();
    // Dọn DOM sau khi hộp thoại đóng (change/cancel đã resolve).
    setTimeout(() => input.remove(), 60000);
  });
}

async function saveFile(options = {}) {
  const native = getNativeAdapter();
  if (native && typeof native.saveFile === 'function') return native.saveFile(options);

  if (!isBrowser()) return false;
  const { data, defaultName = 'download', mimeType = 'application/octet-stream' } = options;
  if (data === undefined || data === null) return false;
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

async function selectFolder(options = {}) {
  const native = getNativeAdapter();
  if (native && typeof native.selectFolder === 'function') return native.selectFolder(options);
  return null; // Web: không có khái niệm chọn thư mục native.
}

const FileDialogService = { openFile, saveFile, selectFolder };

export default FileDialogService;
export { openFile, saveFile, selectFolder };
