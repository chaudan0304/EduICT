import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import ActivitySyncContext from './ActivitySyncContext';

const memory = new Map();
export const studentId = student => String(student.id);
export const lines = text => [...new Set(text.split('\n').map(line => line.trim()).filter(Boolean))].slice(0, 12);
export const shuffle = items => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
export function activityKey(classId) {
  return `eduict_activities_v2:${encodeURIComponent(String(classId))}`;
}
// Persisted by the provider in SQLite; the fallback supports isolated/older consumers.
export function useActivityState(key, initial, normalize) {
  const sync = useContext(ActivitySyncContext);
  const definition = useRef({ initial, normalize });
  useEffect(() => { definition.current = { initial, normalize }; }, [initial, normalize]);
  const prefix = sync ? `${activityKey(sync.classId)}:` : '';
  const slot = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const [state, setState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return normalize(raw ? JSON.parse(raw) : memory.get(key), initial);
    } catch { return normalize(memory.get(key), initial); }
  });
  useEffect(() => {
    if (sync) return;
    memory.set(key, state);
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* Keep the current window usable. */ }
  }, [key, state, sync]);
  const update = sync?.update;
  const setSynced = useCallback(action => update(slot, action, definition.current.initial, definition.current.normalize), [update, slot]);
  return sync ? [normalize(sync.states[slot], initial), setSynced] : [state, setState];
}
export const stringList = value => Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 300) : [];
