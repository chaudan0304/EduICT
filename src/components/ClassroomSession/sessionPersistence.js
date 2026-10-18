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
export function queueSessionHistory(sessionId, kind, payload) {
  if (!['events', 'participation'].includes(kind)) throw new Error('Loại nhật ký không hợp lệ.');
  const data = { ...payload, id: payload.id || `history_${crypto.randomUUID()}`, created_at: payload.created_at || new Date().toISOString() };
  const history = { ...entries()[sessionId]?.history, [data.id]: { kind, data } };
  queueSessionWrite(sessionId, { history });
  return data;
}
export const isHistoryPending = (sessionId, id) => Boolean(entries()[sessionId]?.history?.[id]);
export function mergePendingSession(session) {
  if (!session) return session;
  const value = entries()[session.id];
  if (!value) return session;
  const merged = { ...session, ...value.patch, ...(value.activities ? { activities: value.activities } : {}) };
  for (const kind of ['events', 'participation']) {
    const saved = merged[kind] || [];
    merged[kind] = [...Object.values(value.history || {}).filter(record => record.kind === kind && !saved.some(row => row.id === record.data.id)).map(record => ({ ...record.data, syncPending: true })), ...saved];
  }
  return merged;
}
export function clearSessionWrites(id) { delete entries()[id]; changed(); }
export function getSessionWriteStatus(id) {
  const values = Object.entries(entries()).filter(([key]) => !id || key === id).map(([,value]) => value);
  return { pending: values.length, historyPending: values.reduce((total, value) => total + Object.keys(value.history || {}).length, 0), error: values.find(value => value.error)?.error || '', durable };
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
        for (const record of Object.values(snapshot.history || {})) {
          const saved = await apiClient.post(`/api/sessions/${encodeURIComponent(id)}/${record.kind}`, record.data);
          if (saved?.id !== record.data.id || saved.success !== true) throw new Error('Máy chủ chưa xác nhận nhật ký tiết học.');
          if (entries()[id]?.history?.[record.data.id] === record) delete entries()[id].history[record.data.id];
          changed();
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
