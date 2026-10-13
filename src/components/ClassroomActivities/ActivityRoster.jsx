import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { studentId } from './activityState';

export default function ActivityRoster({ students, selectedIds, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const matching = students.filter(student => student.name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  return <details className="class-activity-roster">
    <summary><Users size={18} /> Học sinh tham gia <strong>{selectedIds.length}/{students.length}</strong><span>Bỏ chọn em vắng</span></summary>
    <div className="class-activity-roster-body">
      <label className="class-activity-search"><Search size={17} /><input value={query} maxLength={80} onChange={event => setQuery(event.target.value)} placeholder="Tìm học sinh…" aria-label="Tìm học sinh tham gia" /></label>
      <div className="class-activity-actions"><button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onChange(students.map(studentId))}>Chọn cả lớp</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onChange([])}>Bỏ chọn tất cả</button></div>
      <fieldset disabled={disabled}><legend className="sr-only">Chọn học sinh tham gia trò chơi</legend>
        {matching.map(student => <label key={student.id}><input type="checkbox" checked={selectedIds.includes(studentId(student))} onChange={event => onChange(event.target.checked ? [...selectedIds, studentId(student)] : selectedIds.filter(id => id !== studentId(student)))} />{student.name}</label>)}
      </fieldset>
      {!matching.length && <p>Không có học sinh phù hợp.</p>}
    </div>
  </details>;
}

