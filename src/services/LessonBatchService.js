// Require server success: a cache-only fallback would falsely report deletion.
export async function deleteLessonsBatchApi(ids) {
  const response = await fetch('/api/lessons/batch-delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, confirm: true }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể xóa các bài đã chọn.');
  if (!Array.isArray(result.deletedIds) || result.deleted !== ids.length || ids.some(id => !result.deletedIds.includes(id))) throw new Error('Phản hồi xóa chưa đầy đủ. Hãy tải lại Thư viện trước khi thử lại.');
  return result;
}
