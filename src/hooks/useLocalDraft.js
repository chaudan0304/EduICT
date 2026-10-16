import { useCallback, useEffect, useRef, useState } from 'react';
import { readLocalDraft, saveLocalDraft, clearLocalDraft } from '../services/localDrafts';

export default function useLocalDraft(scope, enabled, value, restore) {
  const [ready, setReady] = useState(null);
  const [status, setStatus] = useState(null);
  const restoreRef = useRef(restore);
  const signature = JSON.stringify(value);
  const last = useRef('');
  const current = useRef(signature);
  useEffect(() => { restoreRef.current = restore; current.current = signature; }, [restore, signature]);
  useEffect(() => {
    if (!enabled) { setReady(null); return; }
    const saved = readLocalDraft(scope);
    last.current = saved ? JSON.stringify(saved.data) : current.current;
    if (saved) { restoreRef.current(saved.data); setStatus({ restored: true, savedAt: saved.savedAt }); }
    else setStatus(null);
    setReady(scope);
  }, [scope, enabled]);
  useEffect(() => {
    if (!enabled || ready !== scope || signature === last.current) return;
    const result = saveLocalDraft(scope, JSON.parse(signature));
    if (result.ok) last.current = signature;
    setStatus(result);
  }, [scope, enabled, ready, signature]);
  const clear = useCallback(() => {
    const cleared = clearLocalDraft(scope);
    last.current = current.current;
    setStatus(cleared ? null : { ok: false, error: 'Nội dung đã lưu, nhưng chưa xóa được bản nháp cũ trên trình duyệt này.' });
  }, [scope]);
  return { status, clear };
}
