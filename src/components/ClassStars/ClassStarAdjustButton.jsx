import { useContext, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Star, Users, X } from 'lucide-react';
import { ClassStarContext } from './ClassStarContext';
import { adjustClassStars } from '../../utils/starLedger';
import './ClassStars.css';
import ClassStarExtraControls from './ClassStarExtraControls';
import { readPendingStars, savePendingStars, clearPendingStars } from './pendingStarRequests';

// Preserve an uncertain request when switching tabs: retry with the same ID.
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function ClassStarAdjustButton({ currentClass, semester, disabled = false }) {
  const applyResult = useContext(ClassStarContext);
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const requestRef = useRef(null);
  const busyRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(null);
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('1');
  const [selectedSemester, setSelectedSemester] = useState('hk1');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const count = currentClass?.students?.length || 0;
  const validAmount = Number.isInteger(Number(amount)) && Number(amount) >= 1 && Number(amount) <= 100;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (scope && String(currentClass?.id) !== scope.classId && !busyRef.current) setOpen(false);
  }, [currentClass?.id, scope]);

  const showDialog = () => {
    const classId = String(currentClass.id);
    const stored = readPendingStars(classId);
    if (stored && (stored.kind !== 'adjust' || stored.payload.selectedStudentIds)) {
      setStatus('Có lượt nhóm/hoàn tác chưa nhận kết quả. Mở Sao nhóm / Hoàn tác để thử lại trước.');
      return;
    }
    const pending = stored;
    requestRef.current = pending?.payload || null;
    setScope({ classId, name: pending?.className || currentClass.name,
      studentIds: pending?.payload.expectedStudentIds || currentClass.students.map(s => String(s.id)) });
    setMode(pending?.payload.amount < 0 ? 'subtract' : 'add');
    setAmount(String(Math.abs(pending?.payload.amount || 1)));
    const month = new Date().getMonth() + 1;
    setSelectedSemester(pending?.payload.semester || semester || (month >= 2 && month <= 7 ? 'hk2' : 'hk1'));
    setReason(pending?.payload.reason || '');
    setLocked(Boolean(pending));
    setError(pending ? 'Lượt trước chưa nhận được kết quả. Bấm Thử lại để kiểm tra và hoàn tất cùng lượt đó.' : '');
    setStatus('');
    setOpen(true);
  };

  const submit = async event => {
    event.preventDefault();
    if (busyRef.current || !scope || !validAmount) return;
    const payload = requestRef.current || {
      operationId: globalThis.crypto?.randomUUID?.() || `class_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      classId: scope.classId, amount: Number(amount) * (mode === 'add' ? 1 : -1),
      reason: reason.trim(), semester: selectedSemester, date: localDate(),
      expectedStudentIds: scope.studentIds, confirmed: true,
    };
    requestRef.current = payload;
    const existing = readPendingStars(payload.classId);
    if (existing && existing.payload.operationId !== payload.operationId) {
      setError('Có lượt sao khác chưa hoàn tất. Đóng và mở lại để thử cùng lượt.');
      return;
    }
    savePendingStars(payload.classId, { kind: 'adjust', payload, className: scope.name });
    busyRef.current = true;
    setBusy(true);
    setLocked(true);
    setError('');
    try {
      const result = await adjustClassStars(payload);
      applyResult(result);
      clearPendingStars(payload.classId);
      requestRef.current = null;
      setStatus(`${result.amount > 0 ? 'Đã cộng' : 'Đã trừ'} sao lớp ${scope.name}: ${result.changedCount}/${result.studentCount} học sinh thay đổi, tổng ${Math.abs(result.totalChange)} sao.`);
      setOpen(false);
      setLocked(false);
    } catch (err) {
      // A rejected validation never committed. Network/server failures retain
      // the ID because the response may have been lost after a successful save.
      const rejected = err.status >= 400 && err.status < 500;
      if (rejected) {
        clearPendingStars(payload.classId);
        requestRef.current = null;
        setLocked(false);
      }
      setError(`${err.message || 'Không thể lưu sao.'}${rejected ? '' : ' Bấm Thử lại để hoàn tất cùng lượt, tránh cộng/trừ lặp.'}`);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="class-stars-control">
      <button ref={triggerRef} type="button" className="btn btn-outline btn-sm class-stars-trigger"
        disabled={disabled || !applyResult || !count || count > 1000} onClick={showDialog}
        title={count ? `Cộng/trừ sao cho toàn bộ ${count} học sinh lớp ${currentClass.name}` : 'Lớp chưa có học sinh'}>
        <Users size={16} aria-hidden="true" /> Cộng/trừ cả lớp
      </button>
      <ClassStarExtraControls currentClass={currentClass} semester={semester} disabled={disabled || busy || open} />
      {status && <p className="class-stars-status" role="status">{status}</p>}
      <dialog ref={dialogRef} className="class-stars-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
        onCancel={event => { if (busyRef.current) event.preventDefault(); else setOpen(false); }}
        onClose={() => { setOpen(false); triggerRef.current?.focus(); }}>
        <form onSubmit={submit}>
          <header className="class-stars-header">
            <h3 id={titleId}><Star size={22} aria-hidden="true" /> Cộng/trừ sao cả lớp</h3>
            <button type="button" className="btn btn-icon" aria-label="Đóng điều chỉnh sao" disabled={busy} onClick={() => setOpen(false)}><X size={20} /></button>
          </header>
          <p id={descriptionId} className="class-stars-scope"><strong>{scope?.name}</strong> · Toàn bộ {scope?.studentIds.length || 0} học sinh<br />Áp dụng cho cả lớp, kể cả học sinh đang bị ẩn bởi bộ lọc.</p>
          <fieldset className="class-stars-modes" disabled={busy || locked}>
            <legend>Thao tác</legend>
            <label><input type="radio" name={`${fieldId}-mode`} value="add" checked={mode === 'add'} onChange={() => setMode('add')} /> Cộng sao</label>
            <label><input type="radio" name={`${fieldId}-mode`} value="subtract" checked={mode === 'subtract'} onChange={() => setMode('subtract')} /> Trừ sao</label>
          </fieldset>
          <div className="class-stars-fields">
            <label htmlFor={`${fieldId}-amount`}>Số sao mỗi học sinh
              <input id={`${fieldId}-amount`} className="input-field" type="number" min="1" max="100" step="1" required
                value={amount} disabled={busy || locked} onChange={event => setAmount(event.target.value)} />
            </label>
            <label htmlFor={`${fieldId}-semester`}>Ghi nhận học kỳ
              <select id={`${fieldId}-semester`} className="input-field" value={selectedSemester} disabled={busy || locked} onChange={event => setSelectedSemester(event.target.value)}>
                <option value="hk1">Học kỳ 1</option><option value="hk2">Học kỳ 2</option>
              </select>
            </label>
          </div>
          <label className="class-stars-reason" htmlFor={`${fieldId}-reason`}>Lý do (không bắt buộc)
            <input id={`${fieldId}-reason`} className="input-field" maxLength="300" placeholder="Ví dụ: Cả lớp tích cực tham gia bài học"
              value={reason} disabled={busy || locked} onChange={event => setReason(event.target.value)} />
          </label>
          <p className={`class-stars-summary ${mode === 'subtract' ? 'is-subtract' : ''}`}>
            {validAmount ? <><strong>{mode === 'add' ? 'Cộng' : 'Trừ'} {amount} sao / học sinh</strong><br />cho {scope?.studentIds.length || 0} học sinh lớp {scope?.name}.</> : 'Nhập số nguyên từ 1 đến 100.'}
            {mode === 'subtract' && <span>Số sao hiện có luôn giữ tối thiểu 0. Nhật ký ghi số sao thực tế đã trừ.</span>}
          </p>
          {error && <p className="class-stars-error" role="alert">{error}</p>}
          {busy && <p className="class-stars-status" role="status">Đang lưu sao cả lớp…</p>}
          <footer className="class-stars-actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={busy || !validAmount}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Đang lưu…</> : locked ? 'Thử lại cùng lượt' : `Xác nhận ${mode === 'add' ? 'cộng' : 'trừ'} sao`}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
