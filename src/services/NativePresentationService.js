import { getNativeAdapter } from './DesktopCapabilityService';

export function hasNativePresentationHost() {
  return typeof getNativeAdapter()?.presentationHost === 'function';
}

export function nativePresentationAction(action, options = {}) {
  const api = getNativeAdapter()?.presentationHost;
  return api ? api({ ...options, action }) : Promise.resolve({ ok: false, code: 'DESKTOP_BRIDGE_UNAVAILABLE', message: 'Trình chiếu trong khung cần EduICT Desktop mới trên Windows có Microsoft PowerPoint.' });
}
