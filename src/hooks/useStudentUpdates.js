import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchClassesFromSqlite, syncStudentsToSqlite } from '../utils/storage';

// Serialize local edits; the server rejects stale rosters from other windows.
export default function useStudentUpdates(classes, setClasses, onError) {
  const live = useRef(classes);
  const queues = useRef(new Map());
  const versions = useRef(new Map());
  const epochs = useRef(new Map());
  const sequence = useRef(new Map());
  const revision = useRef(0);
  const failed = useRef(new Set());
  const metadataPending = useRef(0);
  const [writeStatus, setWriteStatus] = useState({ pending: 0, unsaved: false });
  const getRevision = useCallback(() => revision.current, []);
  const isBlocked = useCallback(() => queues.current.size > 0 || metadataPending.current > 0 || failed.current.size > 0, []);
  const discardUnsaved = useCallback(() => { failed.current.clear(); setWriteStatus(s => ({ ...s, unsaved: false })); }, []);
  const trackMetadata = useCallback(async (classId, operation) => {
    const key = `metadata:${classId}`;
    revision.current++; metadataPending.current++;
    setWriteStatus(s => ({ ...s, pending: s.pending + 1 }));
    try { const result = await operation(); failed.current.delete(key); return result; }
    catch (error) { failed.current.add(key); throw error; }
    finally {
      revision.current++; metadataPending.current--;
      setWriteStatus(s => ({ pending: Math.max(0, s.pending - 1), unsaved: failed.current.size > 0 }));
    }
  }, []);
  useEffect(() => { live.current = classes; }, [classes]);
  const persistStudents = useCallback((classId, students) => {
    const before = live.current.find(c => c.id === classId);
    if (!before) return Promise.resolve(false);
    if (!queues.current.has(classId)) versions.current.set(classId, before.studentsVersion);
    const epoch = epochs.current.get(classId) || 0;
    const seq = (sequence.current.get(classId) || 0) + 1;
    sequence.current.set(classId, seq);
    revision.current++;
    setWriteStatus(s => ({ ...s, pending: s.pending + 1 }));
    live.current = live.current.map(c => c.id === classId ? { ...c, students } : c);
    setClasses(live.current);
    const request = (queues.current.get(classId) || Promise.resolve()).then(async () => {
      if ((epochs.current.get(classId) || 0) !== epoch) return false;
      try {
        const result = await syncStudentsToSqlite(classId, students, versions.current.get(classId));
        failed.current.delete(classId);
        versions.current.set(classId, result.classroom.studentsVersion);
        if (sequence.current.get(classId) === seq) {
          live.current = live.current.map(c => c.id === classId ? result.classroom : c);
          setClasses(live.current);
        }
        return true;
      } catch (error) {
        failed.current.add(classId);
        epochs.current.set(classId, epoch + 1);
        onError(`Chưa lưu thay đổi của lớp: ${error.message}`);
        if (error.status === 409 || error.status === 404) {
          const fresh = await fetchClassesFromSqlite('all');
          if (fresh) {
            const classroom = fresh.find(c => c.id === classId);
            live.current = classroom ? live.current.map(c => c.id === classId ? classroom : c) : live.current.filter(c => c.id !== classId);
            setClasses(live.current);
            failed.current.delete(classId);
          }
        }
        return false;
      }
    });
    queues.current.set(classId, request);
    const finish = () => {
      revision.current++;
      if (queues.current.get(classId) === request) queues.current.delete(classId);
      setWriteStatus(s => ({ pending: Math.max(0, s.pending - 1), unsaved: failed.current.size > 0 }));
    };
    void request.then(finish, finish);
    return request;
  }, [setClasses, onError]);
  return { persistStudents, writeStatus, getRevision, isBlocked, discardUnsaved, trackMetadata };
}
