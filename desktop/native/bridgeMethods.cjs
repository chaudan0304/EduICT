'use strict';
// bridgeMethods — danh sách phương thức Desktop Bridge (PHẢI khớp src/services/desktopBridgeContract.js;
// test phase11 đối chiếu hai danh sách) + bảng mã lỗi chuẩn.

const BRIDGE_METHODS = Object.freeze([
  'openPowerPoint',
  'closePowerPoint',
  'getStatus',
  'getActivePresentation',
  'nextSlide',
  'previousSlide',
  'goToSlide',
  'startSlideShow',
  'exitSlideShow',
]);

const ERROR_CODES = Object.freeze({
  DESKTOP_BRIDGE_UNAVAILABLE: 'Chức năng PowerPoint chỉ khả dụng trên EduMaster Desktop (Windows).',
  POWERPOINT_NOT_INSTALLED: 'Chưa cài đặt Microsoft PowerPoint trên máy này.',
  POWERPOINT_UNAVAILABLE: 'Không thể kết nối tới PowerPoint trên máy này.',
  POWERPOINT_START_FAILED: 'Không thể mở PowerPoint. Vui lòng thử lại.',
  POWERPOINT_BUSY: 'PowerPoint đang bận. Vui lòng đợi giây lát rồi thử lại.',
  POWERPOINT_NOT_RUNNING: 'PowerPoint chưa được mở.',
  POWERPOINT_CONTROL_FAILED: 'Không thể điều khiển PowerPoint. Vui lòng thử lại.',
  POWERPOINT_EMBED_FAILED: 'Không thể đặt PowerPoint vào khung EduICT trên máy này. Hãy đóng trình chiếu và thử lại.',
  PRESENTATION_NOT_FOUND: 'Không tìm thấy file bài trình chiếu gốc.',
  INVALID_PRESENTATION_PATH: 'Đường dẫn bài trình chiếu không hợp lệ.',
  INVALID_SLIDE_INDEX: 'Số thứ tự slide không hợp lệ.',
  DESKTOP_PERMISSION_DENIED: 'Thao tác không được phép.',
  FILE_TOO_LARGE: 'File quá lớn để nạp.',
});

module.exports = { BRIDGE_METHODS, ERROR_CODES };
