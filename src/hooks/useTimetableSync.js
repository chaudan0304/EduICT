import { useEffect } from 'react';
import { applyTimetableSettings, fetchTimetableSettings, getTimetableGeneration } from '../services/timetableSettings';

export default function useTimetableSync() {
  useEffect(() => {
    let disposed = false, pending = null;
    const refresh = async () => {
      if (disposed || pending || document.visibilityState === 'hidden') return;
      const before = getTimetableGeneration();
      const controller = new AbortController(); pending = controller;
      try {
        const settings = await fetchTimetableSettings({ signal: controller.signal, timeout: 8000 });
        if (!disposed && !controller.signal.aborted && before === getTimetableGeneration()) applyTimetableSettings(settings);
      } catch { /* The editor reports loading failures and keeps any unsaved draft. */ }
      finally { if (pending === controller) pending = null; }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 15000);
    return () => { disposed = true; pending?.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
}
