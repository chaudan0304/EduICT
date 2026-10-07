import React from 'react';
import { CheckSquare, Loader2, Trash2, X } from 'lucide-react';
import './LibrarySelection.css';

export function LibrarySelectionToolbar({ selection, visibleCount, loading }) {
  return <section className="library-selection-toolbar" aria-label="Chọn và xóa nhiều bài học">
    <div className="library-selection-actions">
      <button type="button" className="btn btn-outline btn-sm" disabled={selection.busy || loading} aria-pressed={selection.enabled} onClick={selection.toggleMode}>{selection.enabled ? <X size={16} /> : <CheckSquare size={16} />}{selection.enabled ? 'Thoát chọn' : 'Chọn nhiều bài'}</button>
      {selection.enabled && <>
        <span role="status">Đã chọn {selection.count}/200 bài</span>
        <button type="button" className="btn btn-ghost btn-sm" disabled={selection.busy || loading || !visibleCount} onClick={selection.selectAll}>{visibleCount > 200 ? 'Chọn 200 bài đang hiện' : 'Chọn tất cả đang hiện'}</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={selection.busy || !selection.count} onClick={selection.clear}>Bỏ chọn</button>
        <button type="button" className="btn btn-outline btn-sm library-delete-selected" disabled={selection.busy || loading || !selection.count} onClick={selection.remove}>{selection.busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}{selection.busy ? 'Đang xử lý…' : `Xóa ${selection.count} bài đã chọn`}</button>
      </>}
    </div>
    {selection.enabled && <p>Chọn các bài cần xóa. Đổi khối hoặc bộ lọc sẽ bỏ chọn; chỉ xóa bài đang hiển thị.</p>}
    {selection.notice && <p role="status">{selection.notice}</p>}
    {selection.error && <p role="alert" className="library-selection-error">{selection.error}</p>}
  </section>;
}

export function LibrarySelectableCard({ lesson, selection, children }) {
  return <div className={`library-selectable-card${selection.isSelected(lesson.id) ? ' is-selected' : ''}`}>
    {selection.enabled && <label className="library-card-select"><input type="checkbox" checked={selection.isSelected(lesson.id)} disabled={!selection.canSelect(lesson.id)} onChange={() => selection.toggle(lesson.id)} /><span>Chọn bài: {lesson.title}</span></label>}
    <div className="library-selectable-content" inert={selection.enabled || selection.busy}>{children}</div>
  </div>;
}
