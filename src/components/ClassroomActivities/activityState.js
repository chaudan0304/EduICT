import { useEffect, useState } from 'react';

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
  const d = new Date();
  return `eduict_activities_v1:${classId}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
// IDs and teacher-entered tasks only. This temporary state is not a database backup.
export function useActivityState(key, initial, normalize) {
  const [state, setState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return normalize(raw ? JSON.parse(raw) : memory.get(key), initial);
    } catch { return normalize(memory.get(key), initial); }
  });
  useEffect(() => {
    memory.set(key, state);
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* Keep the current window usable. */ }
  }, [key, state]);
  return [state, setState];
}
export const stringList = value => Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 300) : [];
