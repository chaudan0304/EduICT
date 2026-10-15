import { useEffect, useRef } from 'react';
import { fetchClassesFromSqlite, syncStudentsToSqlite } from '../utils/storage';

// Serialize local edits; the server rejects stale rosters from other windows.
export default function useStudentUpdates(classes, setClasses, onError) {
  const live = useRef(classes);
  const queues = useRef(new Map());
  const versions = useRef(new Map());
  const epochs = useRef(new Map());
  const sequence = useRef(new Map());
  useEffect(() => { live.current = classes; }, [classes]);
  return (classId, students) => {
    const before = live.current.find(c => c.id === classId);
    if (!before) return Promise.resolve(false);
    if (!queues.current.has(classId)) versions.current.set(classId, before.studentsVersion);
    const epoch = epochs.current.get(classId) || 0;
    const seq = (sequence.current.get(classId) || 0) + 1;
    sequence.current.set(classId, seq);
    live.current = live.current.map(c => c.id === classId ? { ...c, students } : c);
    setClasses(live.current);
    const request = (queues.current.get(classId) || Promise.resolve()).then(async () => {
      if ((epochs.current.get(classId) || 0) !== epoch) return false;
      try {
        const result = await syncStudentsToSqlite(classId, students, versions.current.get(classId));
        versions.current.set(classId, result.classroom.studentsVersion);
        if (sequence.current.get(classId) === seq) {
          live.current = live.current.map(c => c.id === classId ? result.classroom : c);
          setClasses(live.current);
        }
        return true;
      } catch (error) {
        epochs.current.set(classId, epoch + 1);
        onError(`Chưa lưu thay đổi của lớp: ${error.message}`);
        if (error.status === 409 || error.status === 404) {
          const fresh = await fetchClassesFromSqlite('all');
          if (fresh) {
            const classroom = fresh.find(c => c.id === classId);
            live.current = classroom ? live.current.map(c => c.id === classId ? classroom : c) : live.current.filter(c => c.id !== classId);
            setClasses(live.current);
          }
        }
        return false;
      }
    });
    queues.current.set(classId, request);
    void request.finally(() => { if (queues.current.get(classId) === request) queues.current.delete(classId); });
    return request;
  };
}
