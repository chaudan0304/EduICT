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
