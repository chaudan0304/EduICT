const memory = new Map();
const key = classId => `eduict_pending_stars_v1:${classId}`;

export function readPendingStars(classId) {
  try {
    const raw = sessionStorage.getItem(key(classId));
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved?.payload?.classId === classId && ['adjust', 'undo'].includes(saved.kind)) return saved;
    }
  } catch { /* Memory still supports tab changes when storage is unavailable. */ }
  return memory.get(classId) || null;
}
export function savePendingStars(classId, value) {
  memory.set(classId, value);
  try { sessionStorage.setItem(key(classId), JSON.stringify(value)); } catch { /* private browsing */ }
}
export function clearPendingStars(classId) {
  memory.delete(classId);
  try { sessionStorage.removeItem(key(classId)); } catch { /* private browsing */ }
}
export const newStarOperationId = () => globalThis.crypto?.randomUUID?.() || `stars_${Date.now()}_${Math.random().toString(36).slice(2)}`;
