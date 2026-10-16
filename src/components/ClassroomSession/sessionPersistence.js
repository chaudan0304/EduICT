import StorageService from '../../services/StorageService';
import apiClient from '../../services/apiClient';

const KEY = 'eduict_pending_session_writes_v1';
export const SESSION_WRITES_EVENT = 'eduict-session-writes';
let pending;
let durable = true;
const running = new Map();
function entries() {
  if (!pending) {
    try { pending = JSON.parse(StorageService.get(KEY) || '{}'); if (!pending || typeof pending !== 'object' || Array.isArray(pending)) pending = {}; }
    catch { pending = {}; }
  }
  return pending;
}
function changed() {
  try { StorageService.set(KEY, JSON.stringify(entries())); durable = true; } catch { durable = false; }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(SESSION_WRITES_EVENT));
}
export function queueSessionWrite(id, change) {
  const previous = entries()[id] || {};
  entries()[id] = { ...previous, ...change, patch: { ...previous.patch, ...change.patch }, revision: (previous.revision || 0) + 1, error: '' };
  changed();
}
export function mergePendingSession(session) {
  if (!session) return session;
  const value = entries()[session.id];
  return value ? { ...session, ...value.patch, ...(value.activities ? { activities: value.activities } : {}) } : session;
}
export function clearSessionWrites(id) { delete entries()[id]; changed(); }
export function getSessionWriteStatus(id) {
  const values = Object.entries(entries()).filter(([key]) => !id || key === id).map(([,value]) => value);
  return { pending: values.length, error: values.find(value => value.error)?.error || '', durable };
}
export async function retrySessionWrites(id) {
  if (!id) { for (const key of Object.keys(entries())) await retrySessionWrites(key); return; }
  if (running.has(id)) return running.get(id);
  const operation = (async () => {
    let result;
    while (entries()[id]) {
      const snapshot = entries()[id];
      try {
        if (Object.keys(snapshot.patch || {}).length) {
          result = await apiClient.put(`/api/sessions/${encodeURIComponent(id)}`, snapshot.patch);
          if (!result || result.id !== id) throw new Error('Máy chủ chưa xác nhận tiết học. Hãy thử lưu lại.');
        }
        if (snapshot.activities) {
          const saved = await apiClient.put(`/api/sessions/${encodeURIComponent(id)}/activities`, { activities: snapshot.activities });
          if (!Array.isArray(saved)) throw new Error('Máy chủ chưa xác nhận tiến trình.');
        }
        if (entries()[id]?.revision === snapshot.revision) delete entries()[id];
        changed();
      } catch (error) {
        if (entries()[id]) entries()[id].error = error.message;
        changed(); throw error;
      }
    }
    return result;
  })();
  running.set(id, operation);
  try { return await operation; } finally { running.delete(id); }
}
