import { useEffect, useState } from 'react';
import DialogService from '../../services/DialogService';
import { deleteLessonsBatchApi } from '../../services/LessonBatchService';
import { getLocalLessonsCache, saveLocalLessonsCache } from './lessonStorage';

export default function useLibrarySelection(visibleLessons, scope, onDeleted) {
  const [enabled, setEnabled] = useState(false);
  const [ids, setIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const selected = visibleLessons.filter(lesson => ids.has(lesson.id));

  useEffect(() => { setIds(new Set()); }, [scope]);

  function toggleMode() {
    if (busy) return;
    setEnabled(prev => !prev); setIds(new Set()); setError('');
  }
  function toggle(id) {
    if (busy) return;
    setIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 200) next.add(id);
      return next;
    });
  }
  async function remove() {
    if (busy || !selected.length) return;
    const snapshot = [...selected];
    setBusy(true); setNotice(''); setError('');
    try {
      const names = snapshot.slice(0, 10).map(lesson => `• ${lesson.title}`).join('\n');
      const more = snapshot.length > 10 ? `\n… và ${snapshot.length - 10} bài khác.` : '';
      const message = `Xóa ${snapshot.length} bài đã chọn khỏi Thư viện?\n\n${names}${more}\n\nCác slide lưu trong EduICT của những bài này cũng bị xóa. File PowerPoint liên kết trên máy và trên OneDrive/SharePoint được giữ nguyên. Lịch dạy đã lưu vẫn giữ tên bài.\nThao tác này không thể hoàn tác.`;
      if (!(await DialogService.confirmAsync(message))) return;
      const result = await deleteLessonsBatchApi(snapshot.map(lesson => lesson.id));
      const deleted = new Set(result.deletedIds);
      saveLocalLessonsCache(getLocalLessonsCache().filter(lesson => !deleted.has(lesson.id)));
      onDeleted(result.deletedIds);
      setIds(new Set()); setEnabled(false);
      const warning = result.cleanupWarnings?.length ? ` Có ${result.cleanupWarnings.length} thư mục dữ liệu chưa dọn được; bài đã được xóa khỏi Thư viện.` : '';
      setNotice(`Đã xóa ${result.deleted} bài khỏi Thư viện.${warning}`);
    } catch (err) { setError(`${err.message} Tải lại Thư viện nếu danh sách chưa cập nhật.`); }
    finally { setBusy(false); }
  }

  return {
    enabled, busy, notice, error, count: selected.length, toggleMode, toggle, remove,
    isSelected: id => selected.some(lesson => lesson.id === id),
    canSelect: id => !busy && (ids.has(id) || selected.length < 200),
    selectAll: () => { if (!busy) setIds(new Set(visibleLessons.slice(0, 200).map(lesson => lesson.id))); },
    clear: () => { if (!busy) setIds(new Set()); },
  };
}
