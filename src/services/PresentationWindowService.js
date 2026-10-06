import { getNativeAdapter } from './DesktopCapabilityService';

export function presentationWindowAction(action, tab) {
  const api = getNativeAdapter()?.presentationWindow;
  return api ? api({ action, ...(tab ? { tab } : {}) }) : Promise.resolve({ ok: false, message: 'Thanh công cụ nổi cần EduICT Desktop bản mới.' });
}

export function onPresentationNavigate(callback) {
  return getNativeAdapter()?.onNavigate?.(callback) || (() => {});
}
