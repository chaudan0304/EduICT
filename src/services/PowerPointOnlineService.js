import { normalizePowerPointEmbed } from '../../shared/powerPointOnline.js';

export async function savePowerPointOnline(form, id) {
  const response = await fetch(id ? `/api/lessons/${encodeURIComponent(id)}` : '/api/lessons', {
    method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, ...(!id ? { type: 'powerpoint_online' } : {}), online_embed_url: form.online_embed_url === '' ? '' : normalizePowerPointEmbed(form.online_embed_url) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể lưu PowerPoint Online.');
  return result;
}

export async function fetchPowerPointOnlineCandidates() {
  const response = await fetch('/api/lessons');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể tải danh sách bài.');
  if (!Array.isArray(result)) throw new Error('Danh sách bài không hợp lệ.');
  return result;
}

export async function savePowerPointOnlineBatch(items) {
  const response = await fetch('/api/lessons/powerpoint-online/batch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể lưu danh sách liên kết.');
  return result;
}
