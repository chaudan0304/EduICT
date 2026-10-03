// DialogService — lớp trừu tượng cho hộp thoại (confirm/alert/notify).
//
// Mục tiêu (Giai đoạn 1): loại bỏ việc business logic gọi trực tiếp
// window.confirm / window.alert, để sau này chuyển sang EduMaster Desktop
// có thể thay bằng native dialog mà KHÔNG phải sửa từng call site.
//
// WEB mode (hiện tại): ủy quyền thẳng cho window.confirm / window.alert.
//   - confirm() trả về boolean ĐỒNG BỘ để tương thích drop-in với các
//     call site dạng `if (DialogService.confirm(...))`.
// DESKTOP mode (tương lai): triển khai lại bằng native dialog.

import { getNativeAdapter } from './DesktopCapabilityService.js';

function isBrowser() {
  return typeof window !== 'undefined';
}

// Trả về true/false đồng bộ, giữ nguyên hành vi window.confirm hiện tại.
function confirm(message, _options = {}) {
  if (isBrowser() && typeof window.confirm === 'function') {
    return window.confirm(message);
  }
  // Môi trường không có window (SSR/test): mặc định không xác nhận.
  return false;
}

function alert(message, _options = {}) {
  if (isBrowser() && typeof window.alert === 'function') {
    window.alert(message);
  }
}

// notify: thông báo nhẹ (toast). Giai đoạn 1 chưa thay đổi UX nên tạm
// ánh xạ về alert để giữ nguyên hành vi hiển thị; Desktop sẽ dùng native.
function notify(message, type = 'info') {
  if (type === 'error') {
    console.error(`[notify] ${message}`);
  } else {
    console.log(`[notify:${type}] ${message}`);
  }
  alert(message);
}

// error: hiển thị lỗi cho người dùng (Phase 10). Web = alert + log console.
function error(message, _options = {}) {
  console.error(`[dialog:error] ${message}`);
  alert(message);
}

// prompt: nhập chuỗi đồng bộ (Phase 10). Trả null nếu hủy / không có window.
function prompt(message, defaultValue = '', _options = {}) {
  if (isBrowser() && typeof window.prompt === 'function') {
    return window.prompt(message, defaultValue);
  }
  return null;
}

const DialogService = { confirm, alert, notify, error, prompt };

// Phase 11 — biến thể BẤT ĐỒNG BỘ: dùng hộp thoại native khi có native adapter,
// ngược lại dùng bản web đồng bộ ở trên. prompt không có native → luôn fallback web.
async function confirmAsync(message, options = {}) {
  const native = getNativeAdapter();
  if (native?.dialog?.confirm) return native.dialog.confirm(message);
  return confirm(message, options);
}
async function alertAsync(message, options = {}) {
  const native = getNativeAdapter();
  if (native?.dialog?.alert) return native.dialog.alert(message);
  return alert(message, options);
}
async function errorAsync(message, options = {}) {
  const native = getNativeAdapter();
  if (native?.dialog?.error) {
    console.error(`[dialog:error] ${message}`);
    return native.dialog.error(message);
  }
  return error(message, options);
}
async function promptAsync(message, defaultValue = '', options = {}) {
  return prompt(message, defaultValue, options);
}

Object.assign(DialogService, { confirmAsync, alertAsync, errorAsync, promptAsync });

export default DialogService;
export { confirm, alert, notify, error, prompt, confirmAsync, alertAsync, errorAsync, promptAsync };
