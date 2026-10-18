import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CheckCircle2, Clock, Copy, Edit3, MoreHorizontal, Play, SkipForward, Trash2, X } from 'lucide-react';

const statusLabels = { IN_PROGRESS: 'Đang học', COMPLETED: 'Đã xong', SKIPPED: 'Đã bỏ qua', PENDING: 'Chưa bắt đầu' };

export default function LessonFlowActivityCard({ activity, index, count, isCurrent, typeInfo,
  isEditing, editForm, onEditChange, onSave, onCancelEdit, onStartEdit, saving=false,
  onSetStatus, onMoveUp, onMoveDown, onDuplicate, onDelete }) {
  const [showTools, setShowTools] = useState(false);
  const id = useId();
  const title = activity.title || typeInfo.label;
  // Presets may already include the type emoji. Show one icon without changing stored titles.
  const trimmed = title.trimStart();
  const displayTitle = trimmed.startsWith(typeInfo.icon) ? trimmed.slice(typeInfo.icon.length).trimStart() || typeInfo.label : title;
  const duration = activity.duration_minutes || activity.durationMinutes || 5;
  const status = statusLabels[activity.status] ? activity.status : 'PENDING';
  return <li className={`lesson-flow-step${isCurrent ? ' is-current' : ''} status-${status.toLowerCase()}`} aria-current={isCurrent ? 'step' : undefined}>
    <article aria-labelledby={`${id}-title`}>
      <header className="lesson-flow-step-header">
        <span className="lesson-flow-step-number" aria-label={`Hoạt động ${index + 1}`}>{index + 1}</span>
        <div className="lesson-flow-step-copy">
          <div className="lesson-flow-step-heading"><span aria-hidden="true" className="lesson-flow-type-icon">{typeInfo.icon}</span><h3 id={`${id}-title`}>{displayTitle}</h3></div>
          <div className="lesson-flow-step-meta"><span><Clock size={14} aria-hidden="true" />{duration} phút</span><span>{typeInfo.label}</span>{isCurrent && status !== 'IN_PROGRESS' && <span className="lesson-flow-selected">Đang chọn</span>}</div>
        </div>
      </header>
      <div className="lesson-flow-step-state"><span className={`lesson-flow-status status-${status.toLowerCase()}`}>{status === 'COMPLETED' && <CheckCircle2 size={13} aria-hidden="true" />}{statusLabels[status]}</span></div>
      {isEditing ? <form className="lesson-flow-edit-form" onSubmit={event => { event.preventDefault(); if (editForm.title.trim()) onSave(index); }}>
        <fieldset disabled={saving} style={{display:'contents'}}>
        <label htmlFor={`${id}-edit-title`}>Tên hoạt động<input id={`${id}-edit-title`} className="input-field" required value={editForm.title} onChange={event => onEditChange({ ...editForm, title: event.target.value })} /></label>
        <label htmlFor={`${id}-edit-duration`}>Thời lượng (phút)<input id={`${id}-edit-duration`} className="input-field" type="number" min="1" max="60" step="1" required value={editForm.duration} onChange={event => onEditChange({ ...editForm, duration: event.target.value })} /></label>
        <label className="lesson-flow-edit-description" htmlFor={`${id}-description`}>Ghi chú hoạt động<textarea id={`${id}-description`} className="input-field" rows={2} value={editForm.description} onChange={event => onEditChange({ ...editForm, description: event.target.value })} /></label>
        <div className="lesson-flow-edit-actions"><button type="submit" className="btn btn-primary btn-sm" disabled={!editForm.title.trim()}><Check size={16} />Lưu thay đổi</button><button type="button" className="btn btn-outline btn-sm" onClick={onCancelEdit}><X size={16} />Hủy</button></div>
        </fieldset>
      </form> : <>
        {activity.description && <p className="lesson-flow-step-description">{activity.description}</p>}
        <div className="lesson-flow-step-footer">
          <div className="lesson-flow-teaching-actions" role="group" aria-label={`Điều khiển hoạt động ${index + 1}`}>
            <button type="button" className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-outline'}`} onClick={() => onSetStatus(index, 'IN_PROGRESS')} title="Bắt đầu hoạt động này"><Play size={14} />{status === 'IN_PROGRESS' ? 'Đang học' : 'Bắt đầu'}</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onSetStatus(index, 'COMPLETED')} title="Đánh dấu hoàn thành"><CheckCircle2 size={15} />Xong</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onSetStatus(index, 'SKIPPED')} title="Bỏ qua hoạt động này"><SkipForward size={15} />Bỏ qua</button>
          </div>
          <button type="button" className="btn btn-outline btn-sm lesson-flow-more" aria-label={`Thao tác khác cho hoạt động ${index + 1}`} title="Sửa, đổi thứ tự, nhân bản hoặc xóa" aria-expanded={showTools} aria-controls={`${id}-tools`} onClick={() => setShowTools(previous => !previous)}><MoreHorizontal size={19} /></button>
        </div>
        {showTools && <div id={`${id}-tools`} className="lesson-flow-extra-actions" role="group" aria-label={`Sắp xếp và chỉnh sửa hoạt động ${index + 1}`}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onMoveUp(index)} disabled={index === 0}><ArrowUp size={15} />Lên</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onMoveDown(index)} disabled={index === count - 1}><ArrowDown size={15} />Xuống</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onDuplicate(index)}><Copy size={15} />Nhân bản</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowTools(false); onStartEdit(index); }}><Edit3 size={15} />Sửa</button>
          <button type="button" className="btn btn-outline btn-sm lesson-flow-delete" onClick={() => onDelete(index)}><Trash2 size={15} />Xóa</button>
        </div>}
      </>}
    </article>
  </li>;
}
