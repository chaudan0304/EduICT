// Metadata requests only; no binary upload or local success fallback.
export async function saveLinkedPowerPoint(lesson, id) {
  const res = await fetch(id ? `/api/lessons/${encodeURIComponent(id)}` : '/api/lessons', {
    method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...lesson, type: 'linked_powerpoint' }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Không thể lưu liên kết PowerPoint.');
  return result;
}

export async function deleteLinkedPowerPoint(id) {
  const res = await fetch(`/api/lessons/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const result = await res.json();
    throw new Error(result.error || 'Không thể xóa liên kết PowerPoint.');
  }
}
