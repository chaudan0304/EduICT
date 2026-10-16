import { useCallback, useEffect, useState } from 'react';
import { fetchLinkedFileHealth } from '../../services/LinkedPowerPointService';

export default function useLinkedFileHealth(lessons) {
  const [health, setHealth] = useState({ items: {}, error: '', loading: false });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const signature = JSON.stringify(lessons.filter(l => l.type === 'linked_powerpoint').map(l => [l.id, l.source_file_path, l.source_file_size]));
  useEffect(() => {
    if (signature === '[]') { setHealth({ items: {}, error: '', loading: false }); return; }
    let alive = true;
    let controller;
    const load = async () => {
      controller?.abort(); controller = new AbortController();
      const active = controller;
      setHealth(previous => ({ ...previous, loading: true, error: '' }));
      try {
        const result = await fetchLinkedFileHealth(active.signal);
        if (alive && !active.signal.aborted) setHealth({ items: Object.fromEntries(result.items.map(item => [item.id, item])), error: '', loading: false });
      } catch (error) { if (alive && !active.signal.aborted) setHealth(previous => ({ ...previous, loading: false, error: error.message })); }
    };
    void load();
    window.addEventListener('focus', load);
    return () => { alive = false; controller?.abort(); window.removeEventListener('focus', load); };
  }, [signature, revision]);
  return { ...health, refresh };
}
