import { useId } from 'react';
import { Clock, Edit3 } from 'lucide-react';
import { ACTIVITY_TYPES } from '../ClassroomSession/sessionStorage';

export default function LessonFlowDraftCard({ activity, index, disabled, onChange }) {
  const id = useId();
  const type = ACTIVITY_TYPES[activity.type];
  return <li className="aiflow-activity">
    <span className="aiflow-activity-number">{index + 1}</span>
    <div className="aiflow-activity-content">
      <div className="aiflow-activity-heading"><h3>{activity.title || 'Hoạt động chưa có tên'}</h3><span className="aiflow-duration-badge"><Clock size={14} />{activity.duration || '—'} phút</span></div>
      <span className="aiflow-type">{type?.icon} {type?.label}</span>
      {activity.description && <p>{activity.description}</p>}
      <details className="aiflow-editor"><summary><Edit3 size={14} />Chỉnh sửa hoạt động</summary>
        <fieldset disabled={disabled}>
          <label htmlFor={`${id}-title`}>Tên hoạt động<input id={`${id}-title`} maxLength={200} value={activity.title} aria-invalid={!activity.title.trim()} onChange={event => onChange({ ...activity, title: event.target.value })} /></label>
          <div className="aiflow-editor-row"><label htmlFor={`${id}-type`}>Loại hoạt động<select id={`${id}-type`} value={activity.type} onChange={event => onChange({ ...activity, type: event.target.value })}>{Object.values(ACTIVITY_TYPES).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label htmlFor={`${id}-duration`}>Số phút<input id={`${id}-duration`} type="number" min="1" max="60" step="1" value={activity.duration} onChange={event => onChange({ ...activity, duration: event.target.value })} /></label></div>
          <label htmlFor={`${id}-description`}>Cách tổ chức<textarea id={`${id}-description`} rows={3} maxLength={3000} value={activity.description} onChange={event => onChange({ ...activity, description: event.target.value })} /></label>
        </fieldset>
      </details>
    </div>
  </li>;
}
