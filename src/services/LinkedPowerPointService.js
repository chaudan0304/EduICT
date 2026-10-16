// Metadata requests only; no binary upload or local success fallback.
import apiClient from './apiClient';

export async function saveLinkedPowerPoint(lesson, id, expectedPath) {
  const res = await fetch(id ? `/api/lessons/${encodeURIComponent(id)}` : '/api/lessons', {
    method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...lesson, type: 'linked_powerpoint', ...(expectedPath === undefined ? {} : { expected_source_file_path: expectedPath }) }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Không thể lưu liên kết PowerPoint.');
  return result;
}

export const fetchLinkedFileHealth = signal => apiClient.get('/api/lessons/linked-files/status', { signal, timeout: 15000 });
export const repairLinkedFiles = items => apiClient.post('/api/lessons/linked-files/relink', { items });

export async function deleteLinkedPowerPoint(id) {
  const res = await fetch(`/api/lessons/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const result = await res.json();
    throw new Error(result.error || 'Không thể xóa liên kết PowerPoint.');
  }
}
