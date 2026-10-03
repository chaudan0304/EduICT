// desktopBridgeContract — HỢP ĐỒNG giữa EduMaster và Desktop Bridge tương lai (Phase 10).
//
// Phase 10 CHỈ định nghĩa interface + mock. KHÔNG gọi PowerPoint thật,
// KHÔNG COM / PowerShell / child_process. Phase 11 sẽ cung cấp implementation
// thật (Electron hoặc Tauri) tuân theo đúng các phương thức dưới đây.
//
// original.pptx luôn là NGUỒN SỰ THẬT; bridge chỉ MỞ/ĐIỀU KHIỂN file gốc,
// không sinh ra file thay thế.

// Các phương thức bắt buộc của Desktop Bridge (tên → mô tả).
export const DESKTOP_BRIDGE_METHODS = Object.freeze({
  openPowerPoint: '(filePath: string) => Promise<{ opened: boolean }>',
  closePowerPoint: '() => Promise<{ closed: boolean }>',
  getStatus: '() => Promise<{ running: boolean, slideShowActive: boolean }>',
  getActivePresentation: '() => Promise<{ name: string, slideCount: number, currentSlide: number } | null>',
  nextSlide: '() => Promise<{ currentSlide: number }>',
  previousSlide: '() => Promise<{ currentSlide: number }>',
  goToSlide: '(index: number) => Promise<{ currentSlide: number }>',
  startSlideShow: '() => Promise<{ started: boolean }>',
  exitSlideShow: '() => Promise<{ exited: boolean }>',
});

export const DESKTOP_BRIDGE_METHOD_NAMES = Object.freeze(Object.keys(DESKTOP_BRIDGE_METHODS));

export const BRIDGE_UNAVAILABLE = 'DESKTOP_BRIDGE_UNAVAILABLE';

// Kiểm tra một đối tượng có đủ các phương thức của hợp đồng không.
export function implementsDesktopBridge(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  return DESKTOP_BRIDGE_METHOD_NAMES.every((name) => typeof candidate[name] === 'function');
}

// Mock/Web implementation: mọi lời gọi trả về lỗi "không khả dụng" có cấu trúc,
// KHÔNG có tác dụng phụ nào.
function unavailable(method) {
  return async () => {
    const err = new Error(`Desktop Bridge không khả dụng trong chế độ Web (${method}).`);
    err.code = BRIDGE_UNAVAILABLE;
    throw err;
  };
}

export const webDesktopBridge = Object.freeze(
  Object.fromEntries(DESKTOP_BRIDGE_METHOD_NAMES.map((name) => [name, unavailable(name)]))
);

export default { DESKTOP_BRIDGE_METHODS, DESKTOP_BRIDGE_METHOD_NAMES, implementsDesktopBridge, webDesktopBridge };
