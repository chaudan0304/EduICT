import React from 'react';
import { Users } from 'lucide-react';
import { detectGradeFromName } from '../utils/storage';

const gradeOf = (classroom) => Number(classroom?.grade || detectGradeFromName(classroom?.name) || 3);

export default function ClassContextBar({ classes, currentClass, schoolYear, onSelectClass }) {
  if (!currentClass) return null;
  const grade = gradeOf(currentClass);
  const gradeClasses = classes.filter(classroom => gradeOf(classroom) === grade);
  return (
    <section className="class-context" aria-label="Lớp đang làm việc">
      <div className="class-context-summary">
        <span className="context-year">Năm học {schoolYear}</span>
        <strong>{currentClass.name}</strong>
        <span className="context-students"><Users size={15} aria-hidden="true" /> {currentClass.students?.length || 0} học sinh</span>
      </div>
      <div className="class-context-controls">
        <div className="segmented-control" role="group" aria-label="Chọn khối">
          {[1, 2, 3, 4, 5].map(number => {
            const target = classes.find(classroom => gradeOf(classroom) === number);
            return <button key={number} type="button" aria-pressed={grade === number} disabled={!target}
              onClick={() => { if (grade !== number) onSelectClass(target.id); }}>Khối {number}</button>;
          })}
        </div>
        <label className="context-class-picker" htmlFor="quick-class-switcher">
          <span>Lớp</span>
          <select id="quick-class-switcher" value={currentClass.id} onChange={event => onSelectClass(event.target.value)}>
            {(gradeClasses.length ? gradeClasses : classes).map(classroom => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
