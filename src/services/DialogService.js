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

const DialogService = { confirm, alert, notify };

export default DialogService;
export { confirm, alert, notify };
