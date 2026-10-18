import StorageService from '../../services/StorageService';
import apiClient from '../../services/apiClient';
import { saveLocalDraft } from '../../services/localDrafts';

const KEY = 'eduict_pending_session_writes_v1';
export const SESSION_WRITES_EVENT = 'eduict-session-writes';
let pending;
let durable = true;
const running = new Map();
const confirmed = new Map();
export const SESSION_RESOLVED_EVENT = 'eduict-session-resolved';
export function recordSessionSnapshot(session) {
  if (!session?.id) return;
  const previous = confirmed.get(session.id) || {};
  confirmed.set(session.id, { ...previous, ...(session.revision ? { revision: session.revision } : {}), ...(session.activities_revision ? { activities_revision: session.activities_revision } : {}) });
}
export const getConfirmedSessionRevisions = id => confirmed.get(id) || {};
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
  if (change.patch) entries()[id].expectedRevision = previous.expectedRevision || confirmed.get(id)?.revision || change.expectedRevision;
  if (change.activities) entries()[id].activitiesExpectedRevision = previous.activitiesExpectedRevision || confirmed.get(id)?.activities_revision || change.activitiesExpectedRevision;
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
  const conflictedId = Object.keys(entries()).find(key => (!id || key === id) && entries()[key].conflict);
  return { pending: values.length, historyPending: values.reduce((total, value) => total + Object.keys(value.history || {}).length, 0), conflictedId, error: values.find(value => value.error)?.error || '', durable };
}
export async function readSessionConflict(id) {
  const server = await apiClient.get(`/api/sessions/${encodeURIComponent(id)}`);
  return { server, local: mergePendingSession(server) };
}
export async function resolveSessionConflict(id, server, keepLocal) {
  if (running.has(id)) throw new Error('Đang gửi dữ liệu. Hãy chờ trước khi chọn bản.');
  const entry = entries()[id];
  if (!entry) return;
  if (!server.revision || !server.activities_revision) throw new Error('Hãy cập nhật ứng dụng để đọc được phiên bản tiết học.');
  if (!keepLocal) {
    const backup = saveLocalDraft(`session-conflict:${id}:${Date.now()}`, { sessionId: id, patch: entry.patch, activities: entry.activities });
    if (!backup.ok) throw new Error('Chưa giữ được bản đang sửa thành bản nháp, nên chưa bỏ nội dung.');
    delete entry.patch; delete entry.activities;
  }
  recordSessionSnapshot(server);
  entry.expectedRevision = server.revision; entry.activitiesExpectedRevision = server.activities_revision;
  entry.conflict = false; entry.error = ''; entry.revision++;
  changed();
  await retrySessionWrites(id);
  const saved = await apiClient.get(`/api/sessions/${encodeURIComponent(id)}`);
  recordSessionSnapshot(saved);
  window.dispatchEvent(new CustomEvent(SESSION_RESOLVED_EVENT, { detail: saved }));
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
          if (!snapshot.expectedRevision) throw Object.assign(new Error('Bản đang sửa thiếu phiên bản gốc. Hãy đối chiếu với bản chung trước khi lưu.'), { status: 428 });
          result = await apiClient.put(`/api/sessions/${encodeURIComponent(id)}`, { ...snapshot.patch, expectedRevision: snapshot.expectedRevision });
          if (!result || result.id !== id || !result.revision) throw new Error('Máy chủ chưa xác nhận phiên bản tiết học. Hãy cập nhật ứng dụng và thử lưu lại.');
          recordSessionSnapshot(result);
          if (entries()[id]) entries()[id].expectedRevision = result.revision;
        }
        if (snapshot.activities) {
          if (!snapshot.activitiesExpectedRevision) throw Object.assign(new Error('Tiến trình đang sửa thiếu phiên bản gốc. Hãy đối chiếu bản chung trước khi lưu.'), { status: 428 });
          const saved = await apiClient.put(`/api/sessions/${encodeURIComponent(id)}/activities`, { activities: snapshot.activities, expectedRevision: snapshot.activitiesExpectedRevision, withRevision: true });
          if (!Array.isArray(saved?.activities) || !saved.revision) throw new Error('Máy chủ chưa xác nhận phiên bản tiến trình.');
          recordSessionSnapshot({ id, activities_revision: saved.revision });
          if (entries()[id]) entries()[id].activitiesExpectedRevision = saved.revision;
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
        if (entries()[id]) { entries()[id].error = error.message; entries()[id].conflict = [404, 409, 428].includes(error.status); }
        changed(); throw error;
      }
    }
    return result;
  })();
  running.set(id, operation);
  try { return await operation; } finally { running.delete(id); }
}
