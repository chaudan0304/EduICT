import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, CircleHelp } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function PreflightPanel() {
  const sequence = useRef(0); const alive = useRef(true);
  const [lessons, setLessons] = useState([]); const [lessonId, setLessonId] = useState(''); const [checks, setChecks] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    alive.current = true;
    const requestSequence = sequence;
    apiClient.get('/api/lessons').then(value => { if (alive.current) setLessons(value); }).catch(err => { if (alive.current) setError(err.message); });
    return () => { alive.current = false; requestSequence.current++; };
  }, []);
  const check = async () => {
    const requestId = ++sequence.current; setBusy(true); setError(''); setChecks(null);
    try {
      const result = await apiClient.get(`/api/classroom-tools/preflight?lessonId=${encodeURIComponent(lessonId)}`, { timeout: 12000 });
      if (requestId === sequence.current) setChecks(result);
    } catch (err) { if (requestId === sequence.current) setError(err.message); }
    finally { if (requestId === sequence.current) setBusy(false); }
  };
  return <section><h3>Kiểm tra trước giờ dạy</h3><p className="classroom-tools-muted">Kiểm tra nguồn slide và các dịch vụ đang dùng. Mở thử bài online để xác nhận quyền truy cập và hiệu ứng.</p>
    <label className="classroom-tools-label">Bài sẽ dạy<select className="input-field" disabled={busy} value={lessonId} onChange={e => { setLessonId(e.target.value); setChecks(null); }}>
      <option value="">Chưa chọn bài</option>{lessons.map(lesson => <option value={lesson.id} key={lesson.id}>{lesson.title}</option>)}</select></label>
    <button type="button" className="btn btn-primary" disabled={busy} onClick={check}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra trước giờ dạy'}</button>
    {checks && <><p className="classroom-tools-muted">Lúc {new Date(checks.checkedAt).toLocaleString('vi-VN')}</p><ul className="classroom-tools-checklist">{checks.checks.map(item => {
      const Icon = item.state === 'ready' ? CheckCircle2 : item.state === 'unknown' ? CircleHelp : AlertTriangle;
      const label = { ready: 'Sẵn sàng', warning: 'Cần kiểm tra thêm', error: 'Có lỗi', unknown: 'Chưa xác nhận' }[item.state];
      return <li key={item.id} className={`is-${item.state}`}><Icon size={22} aria-hidden="true" /><div><strong>{item.label} · {label}</strong><p>{item.message}</p></div></li>;
    })}</ul></>}
    {error && <p role="alert" className="classroom-tools-error">{error}</p>}
  </section>;
}
