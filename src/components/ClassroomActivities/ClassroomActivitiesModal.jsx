import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ClassroomActivities from './ClassroomActivities';

export default function ClassroomActivitiesModal({ isOpen, onClose, currentClass, soundEnabled }) {
  const dialog = useRef(null);
  const previousFocus = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (isOpen && !node.open) { previousFocus.current = document.activeElement; node.showModal(); }
    if (!isOpen && node.open) node.close();
    return () => { if (node.open) node.close(); previousFocus.current?.focus?.(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return createPortal(<dialog ref={dialog} className="class-activity-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="class-activity-dialog-header"><span id={titleId}>Trò chơi trong tiết học</span><button type="button" className="btn btn-outline btn-icon" aria-label="Đóng trò chơi và trở về bài học" onClick={onClose}><X size={20} /></button></div>
    <ClassroomActivities currentClass={currentClass} soundEnabled={soundEnabled} embedded />
  </dialog>, document.body);
}

