import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchClassesFromSqlite } from '../utils/storage';

// Refresh only between writes. A response started before a local edit must
// never replace the edited roster, even when the HTTP response arrives later.
export default function useClassDataSync({ classes, schoolYear, enabled, setClasses, setClassId, isBlocked, getRevision, discardUnsaved }) {
  const [status, setStatus] = useState({ connected: false, loading: true, lastSyncedAt: null, error: '', changed: false });
  const request = useRef(null);
  const mounted = useRef(false);
  const fingerprint = useRef(null);
  const liveClasses = useRef(classes);
  useEffect(() => { liveClasses.current = classes; }, [classes]);
  const refresh = useCallback(async ({ year = schoolYear, discard = false } = {}) => {
    if (isBlocked() && !discard) return false;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const revision = getRevision();
    const before = JSON.stringify(liveClasses.current);
    setStatus(s => ({ ...s, loading: true }));
    try {
      const fresh = await fetchClassesFromSqlite(year, { strict: true, signal: controller.signal });
      if (!mounted.current || controller.signal.aborted || getRevision() !== revision || JSON.stringify(liveClasses.current) !== before || (isBlocked() && !discard)) return false;
      const nextFingerprint = JSON.stringify(fresh);
      const changed = fingerprint.current !== null && fingerprint.current !== nextFingerprint;
      fingerprint.current = nextFingerprint;
      setClasses(previous => JSON.stringify(previous) === nextFingerprint ? previous : fresh);
      setClassId(id => fresh.some(c => c.id === id) ? id : fresh[0]?.id || '');
      if (discard) discardUnsaved();
      setStatus({ connected: true, loading: false, lastSyncedAt: Date.now(), error: '', changed });
      return true;
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) setStatus(s => ({ ...s, connected: false, error: error.message }));
      return false;
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setStatus(s => ({ ...s, loading: false }));
      }
    }
  }, [schoolYear, setClasses, setClassId, isBlocked, getRevision, discardUnsaved]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const editing = document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]');
      if (document.visibilityState !== 'hidden' && !editing && !request.current) void refresh();
    };
    check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, 10000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      request.current?.abort();
    };
  }, [enabled, refresh]);
  return { status, refresh };
}
