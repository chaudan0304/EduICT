import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudCheck, CloudUpload, RefreshCw } from 'lucide-react';
import ActivitySyncContext from './ActivitySyncContext';
import apiClient from '../../services/apiClient';
import DialogService from '../../services/DialogService';

const empty = () => ({ version: null, updatedAt: null, states: {} });
const cacheKey = id => `eduict_activity_cache_v2:${id}`;
function readCache(id) {
  try { const value = JSON.parse(localStorage.getItem(cacheKey(id))); return value?.envelope?.states ? value : null; } catch { return null; }
}
function legacyStates(classId) {
  const found = {};
  try {
    const prefix = `eduict_activities_v1:${classId}:`;
    const keys = Object.keys(sessionStorage).filter(key => key.startsWith(prefix)).sort();
    for (const key of keys) {
      const slot = key.slice(prefix.length).replace(/^\d{4}-\d{1,2}-\d{1,2}:/, '');
      if (['roster','gifts','train','treasure','arcade-v2:gifts','arcade-v2:tug','arcade-v2:puzzle','process-train-v1','sleeping-dragon-v1'].includes(slot)) found[slot] = JSON.parse(sessionStorage.getItem(key));
    }
  } catch { /* Leave older session data untouched. */ }
  return found;
}

export default function ActivitySyncProvider({ classId, children }) {
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState('loading'); const [error, setError] = useState('');
  const live = useRef(empty()); const dirty = useRef(false); const generation = useRef(0);
  const saving = useRef(false); const alive = useRef(true); const timer = useRef(null);
  const conflict = useRef(false); const currentRequest = useRef(0);
  const gameBusy = useRef(false);
  const markBusy = useCallback(value => { gameBusy.current = value; }, []);
  const cache = useCallback(() => {
    try { localStorage.setItem(cacheKey(classId), JSON.stringify({ envelope: live.current, pending: dirty.current })); } catch { /* SQLite remains the primary store. */ }
  }, [classId]);
  const flushRef = useRef(null);
  const flush = useCallback(async () => {
    if (!alive.current || saving.current || !dirty.current || conflict.current) return;
    saving.current = true; setStatus('saving');
    const sent = live.current; const sentGeneration = generation.current;
    try {
      const result = await apiClient.post('/api/classroom-activities/state', { classId, expectedVersion: sent.version, states: sent.states });
      if (!alive.current) return;
      live.current = { ...result, states: live.current.states };
      dirty.current = generation.current !== sentGeneration;
      setSnapshot(live.current); setError(''); setStatus(dirty.current ? 'saving' : 'saved'); cache();
    } catch (err) {
      if (!alive.current) return;
      conflict.current = err.status === 409;
      setStatus(conflict.current ? 'conflict' : 'offline'); setError(err.message); cache();
    } finally {
      saving.current = false;
      if (alive.current && dirty.current && !conflict.current && generation.current !== sentGeneration) timer.current = setTimeout(() => flushRef.current?.(), 500);
    }
  }, [classId, cache]);
  useEffect(() => { flushRef.current = flush; }, [flush]);
  const load = useCallback(async (discard = false) => {
    if (saving.current) return;
    const request = ++currentRequest.current;
    const beforeLoad = generation.current;
    try {
      const remote = await apiClient.get(`/api/classroom-activities/state?classId=${encodeURIComponent(classId)}`);
      if (!alive.current || request !== currentRequest.current || !discard && (generation.current !== beforeLoad || gameBusy.current)) return;
      const cached = discard ? null : readCache(classId);
      const recovered = cached?.pending && JSON.stringify(cached.envelope.states) !== JSON.stringify(remote.states) ? cached.envelope : null;
      const changed = recovered && recovered.version !== remote.version;
      const legacy = !remote.version && !recovered ? legacyStates(classId) : {};
      live.current = recovered || { ...remote, states: { ...legacy, ...remote.states } };
      dirty.current = Boolean(recovered) || Object.keys(legacy).length > 0;
      conflict.current = Boolean(changed); generation.current++;
      setSnapshot(live.current); setStatus(changed ? 'conflict' : dirty.current ? 'saving' : 'saved');
      setError(changed ? 'Có thay đổi chưa lưu trên cửa sổ này và dữ liệu mới ở bản khác. Nạp lại dữ liệu chung để tiếp tục.' : ''); cache();
      if (dirty.current && !changed) timer.current = setTimeout(() => flushRef.current?.(), 100);
    } catch (err) {
      if (!alive.current || request !== currentRequest.current) return;
      const cached = readCache(classId);
      if (!snapshot && cached) { live.current = cached.envelope; dirty.current = Boolean(cached.pending); setSnapshot(cached.envelope); }
      setStatus('offline'); setError(err.message);
    }
  }, [classId, cache, snapshot]);
  const loadRef = useRef(load); useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    alive.current = true; void loadRef.current();
    const refresh = () => { if (gameBusy.current) return; if (!document.hidden && !dirty.current && !saving.current) void loadRef.current(); else if (!document.hidden) void flushRef.current?.(); };
    const hidden = () => { if (document.hidden) void flushRef.current?.(); else refresh(); };
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); document.addEventListener('visibilitychange', hidden);
    const poll = setInterval(refresh, 6000);
    const closing = () => {
      cache();
      if (dirty.current && !saving.current && !conflict.current) {
        const body = JSON.stringify({ classId, expectedVersion: live.current.version, states: live.current.states });
        if (new Blob([body]).size < 60000) navigator.sendBeacon?.('/api/classroom-activities/state', new Blob([body], { type: 'application/json' }));
      }
    };
    window.addEventListener('pagehide', closing);
    const finish = () => { if (dirty.current) void flushRef.current?.(); alive.current = false; currentRequest.current++; clearTimeout(timer.current); cache(); };
    return () => { finish(); clearInterval(poll); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', closing); };
  }, [cache, classId]);
  const update = useCallback((slot, action, initial, normalize) => {
    if (conflict.current) return;
    const before = normalize(live.current.states[slot], initial);
    const next = typeof action === 'function' ? action(before) : action;
    live.current = { ...live.current, states: { ...live.current.states, [slot]: next } };
    generation.current++; dirty.current = true; setSnapshot(live.current); setStatus('saving'); cache();
    clearTimeout(timer.current); timer.current = setTimeout(() => flushRef.current?.(), 400);
  }, [cache]);
  const reload = async () => {
    if (dirty.current && !await DialogService.confirmAsync('Nạp dữ liệu chung và bỏ thay đổi chưa lưu trong trò chơi ở cửa sổ này? Dữ liệu điểm/sao đã ghi vẫn giữ nguyên.')) return;
    clearTimeout(timer.current); conflict.current = false; dirty.current = false; cache(); await loadRef.current(true);
  };
  return <ActivitySyncContext.Provider value={{ states: snapshot?.states || {}, update, classId, markBusy }}>
    <div className={`activity-sync-status sync-${status}`} role="status">{status === 'saved' ? <CloudCheck size={16} /> : <CloudUpload size={16} />}<span>{status === 'saved' ? 'Đã lưu trên máy · Web và desktop dùng chung' : status === 'saving' ? 'Đang lưu thiết lập trò chơi…' : status === 'loading' ? 'Đang nạp dữ liệu trò chơi…' : error || 'Chưa kết nối được kho dữ liệu.'}</span>
      {status === 'offline' && <button type="button" className="btn btn-outline btn-sm" onClick={() => dirty.current ? flush() : loadRef.current()}>Thử lại</button>}
      {status !== 'loading' && <button type="button" className="btn btn-outline btn-sm" disabled={status === 'saving'} onClick={reload}><RefreshCw size={14} />Nạp dữ liệu chung</button>}
    </div>
    {snapshot && status !== 'conflict' ? children : status === 'conflict' ? <p className="class-activity-empty">Tiến độ chưa lưu được giữ tạm trong cửa sổ này. Cần nạp lại dữ liệu chung để tránh ghi đè bản khác.</p> : null}
  </ActivitySyncContext.Provider>;
}
