// PresentationService — ranh giới (boundary) mở/trình chiếu bài giảng (Phase 10).
//
// original.pptx là NGUỒN SỰ THẬT. PNG/PDF preview chỉ là bản dẫn xuất để xem
// trên web và KHÔNG thay thế file gốc.
//
// WEB mode (hiện tại): MOCK an toàn — không gọi PowerPoint, không COM,
//   không child_process/PowerShell. Trả kết quả có cấu trúc { ok:false, code }.
// DESKTOP mode (Phase 11): nếu Native Layer đăng ký adapter có `bridge`
//   tuân theo desktopBridgeContract thì service ủy quyền cho bridge đó.

import { getNativeAdapter, hasCapability } from './DesktopCapabilityService.js';
import { implementsDesktopBridge, BRIDGE_UNAVAILABLE } from './desktopBridgeContract.js';

const NOT_AVAILABLE = Object.freeze({ ok: false, code: BRIDGE_UNAVAILABLE });

function getBridge() {
  const bridge = getNativeAdapter()?.bridge;
  return implementsDesktopBridge(bridge) ? bridge : null;
}

async function canControl() {
  return Boolean(getBridge()) && (await hasCapability('canControlPowerPoint'));
}

async function openPresentation(filePath) {
  const bridge = getBridge();
  if (!bridge || !(await hasCapability('canOpenPowerPoint'))) return { ...NOT_AVAILABLE };
  const result = await bridge.openPowerPoint(filePath);
  return { ok: Boolean(result?.opened), ...result };
}

async function closePresentation() {
  const bridge = getBridge();
  if (!bridge) return { ...NOT_AVAILABLE };
  const result = await bridge.closePowerPoint();
  return { ok: Boolean(result?.closed), ...result };
}

async function showPresentation() {
  const bridge = getBridge();
  if (!bridge || !(await canControl())) return { ...NOT_AVAILABLE };
  const result = await bridge.startSlideShow();
  return { ok: Boolean(result?.started), ...result };
}

async function getPresentationStatus() {
  const bridge = getBridge();
  if (!bridge) return { ok: true, available: false, running: false, slideShowActive: false };
  const status = await bridge.getStatus();
  return { ok: true, available: true, ...status };
}

// Điều khiển slide — chỉ ủy quyền cho bridge, có cổng capability canControlPowerPoint.
async function controlSlide(method, ...args) {
  const bridge = getBridge();
  if (!bridge || !(await canControl())) return { ...NOT_AVAILABLE };
  const result = await bridge[method](...args);
  return result && typeof result === 'object' && 'ok' in result ? result : { ok: true, ...result };
}

const nextSlide = () => controlSlide('nextSlide');
const previousSlide = () => controlSlide('previousSlide');
const goToSlide = (index) => controlSlide('goToSlide', index);
const exitSlideShow = () => controlSlide('exitSlideShow');

async function getActivePresentation() {
  const bridge = getBridge();
  if (!bridge) return null;
  return bridge.getActivePresentation();
}

const PresentationService = {
  openPresentation,
  closePresentation,
  showPresentation,
  getPresentationStatus,
  getActivePresentation,
  nextSlide,
  previousSlide,
  goToSlide,
  exitSlideShow,
};

export default PresentationService;
export {
  openPresentation,
  closePresentation,
  showPresentation,
  getPresentationStatus,
  getActivePresentation,
  nextSlide,
  previousSlide,
  goToSlide,
  exitSlideShow,
};
