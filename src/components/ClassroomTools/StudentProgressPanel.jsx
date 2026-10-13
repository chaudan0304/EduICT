import { useEffect, useRef, useState } from 'react';
import apiClient from '../../services/apiClient';
import { getNativeAdapter } from '../../services/DesktopCapabilityService';

const evaluation = value => ({ T: 'Hoàn thành tốt', H: 'Hoàn thành', C: 'Chưa hoàn thành' }[value] || value || 'Chưa ghi nhận');
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function StudentProgressPanel({ currentClass, onBusyChange }) {
  const sequence = useRef(0); const lock = useRef(false); const alive = useRef(true);
  const [studentId, setStudentId] = useState(''); const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState(null); const [busy, setBusy] = useState(false); const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(''); const [status, setStatus] = useState('');
  useEffect(() => { alive.current = true; const requestSequence = sequence; return () => { alive.current = false; requestSequence.current++; }; }, []);
  const load = async () => {
    if (!studentId || !currentClass || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setReport(null); setStatus(''); const request = ++sequence.current;
    try {
      const query = new URLSearchParams({ classId: String(currentClass.id), studentId, month });
      const value = await apiClient.get(`/api/classroom-tools/student-report?${query}`);
      if (request === sequence.current) setReport(value);
    } catch (err) { if (request === sequence.current) setError(err.message); }
    finally { lock.current = false; if (request === sequence.current) setBusy(false); }
  };
  const exportPdf = async () => {
    if (!report || lock.current) return;
    const payload = { classId: String(currentClass.id), studentId: String(report.student.id), month: report.month };
    const adapter = getNativeAdapter(); setError(''); setStatus('');
    if (!adapter) {
      const popup = window.open(`/api/classroom-tools/student-report-print?${new URLSearchParams(payload)}`, '_blank');
      if (!popup) { setError('Trình duyệt chặn cửa sổ in. Cho phép cửa sổ bật lên cho EduICT và thử lại.'); return; }
      // The page contains only server-escaped text and inline print styling.
      popup.addEventListener('load', () => { try { popup.focus(); popup.print(); } catch { /* The user can use Ctrl+P in the opened report. */ } }, { once: true });
      popup.opener = null;
      setStatus('Báo cáo mở trong cửa sổ in. Chọn Lưu thành PDF, hoặc dùng Ctrl+P trong cửa sổ báo cáo.');
      return;
    }
    lock.current = true; setExporting(true); onBusyChange(true);
    try { const saved = await adapter.exportStudentReportPdf(payload); if (alive.current) setStatus(saved ? 'Đã lưu báo cáo PDF.' : 'Đã hủy lưu PDF.'); }
    catch (err) { if (alive.current) setError(err.message); }
    finally { lock.current = false; if (alive.current) { setExporting(false); onBusyChange(false); } }
  };
  const locked = busy || exporting;
  return <section><h3>Tiến bộ học sinh theo tháng</h3><p className="classroom-tools-muted">Lớp đang chọn: <strong>{currentClass?.name || 'Chưa chọn lớp'}</strong></p>
    <div className="classroom-tools-columns"><label className="classroom-tools-label">Học sinh<select className="input-field" value={studentId} disabled={locked} onChange={e => { setStudentId(e.target.value); setReport(null); }}>
      <option value="">Chọn học sinh</option>{(currentClass?.students || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="classroom-tools-label">Tháng<input className="input-field" type="month" required value={month} disabled={locked} onChange={e => { setMonth(e.target.value); setReport(null); }} /></label></div>
    <button type="button" className="btn btn-primary" disabled={locked || !studentId || !month} onClick={load}>{busy ? 'Đang đọc…' : 'Xem báo cáo'}</button>
    {report && <article className="classroom-tools-report"><h3>{report.student.name}</h3><p>Tháng {report.month} · Năm học {report.schoolYear}</p>
      <div className="classroom-tools-stats"><div><strong>{report.student.stars}</strong><span>Tổng sao hiện tại</span></div><div><strong>+{report.monthly.awarded}</strong><span>Sao cộng trong tháng</span></div><div><strong>-{report.monthly.deducted}</strong><span>Sao trừ trong tháng</span></div></div>
      <h4>Kỹ năng và đánh giá hiện tại</h4><dl className="classroom-tools-skills">{[['Chuột', 'skill_mouse'], ['Bàn phím', 'skill_keyboard'], ['Vẽ / Paint', 'skill_paint'], ['Học kỳ 1', 'eval_hk1'], ['Học kỳ 2', 'eval_hk2']].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{evaluation(report.student[key])}</dd></div>)}</dl>
      <p>Điểm học kỳ 1: {report.student.score_hk1 ?? 'Chưa ghi nhận'} · Điểm cuối năm: {report.student.score_ck ?? 'Chưa ghi nhận'}</p>
      <h4>Nhận xét của giáo viên</h4><p className="classroom-tools-text">{report.student.note || 'Chưa có nhận xét.'}</p>
      <p className="classroom-tools-muted">{report.notice}</p>
      <button type="button" className="btn btn-outline" disabled={locked} onClick={exportPdf}>{exporting ? 'Đang tạo PDF…' : 'Xuất báo cáo PDF'}</button>
    </article>}
    {error && <p className="classroom-tools-error" role="alert">{error}</p>}{status && <p className="classroom-tools-success" role="status">{status}</p>}
  </section>;
}
