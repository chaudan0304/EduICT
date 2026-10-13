import { useContext, useEffect, useId, useRef, useState } from 'react';
import { Users, Undo2, X } from 'lucide-react';
import { ClassStarContext } from './ClassStarContext';
import { adjustClassStars, getLatestClassStarBatch, undoClassStars, readClassStarGroups, saveClassStarGroups } from '../../utils/starLedger';
import { readPendingStars, savePendingStars, clearPendingStars, newStarOperationId } from './pendingStarRequests';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function ClassStarExtraControls({ currentClass, semester, disabled }) {
  const applyResult = useContext(ClassStarContext);
  const dialog = useRef(null); const busyRef = useRef(false); const sequence = useRef(0); const trigger = useRef(null);
  const titleId = useId();
  const [open, setOpen] = useState(false); const [scope, setScope] = useState(null);
  const [selected, setSelected] = useState([]); const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState(''); const [term, setTerm] = useState('hk1');
  const [groups, setGroups] = useState({ version: 0, groups: [] }); const [groupName, setGroupName] = useState('');
  const [chosenGroup, setChosenGroup] = useState('');
  const [latest, setLatest] = useState(null); const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false); const [pending, setPending] = useState(null);
  const [error, setError] = useState(''); const [status, setStatus] = useState('');
  const canApply = selected.length > 0 && Number.isInteger(Number(amount)) && Number(amount) !== 0 && Math.abs(Number(amount)) <= 100;

  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  useEffect(() => () => { sequence.current++; }, []);
  useEffect(() => {
    if (scope && String(currentClass?.id) !== scope.classId && !busyRef.current) { sequence.current++; setOpen(false); }
  }, [currentClass?.id, scope]);

  const show = async event => {
    trigger.current = event.currentTarget;
    const classId = String(currentClass.id); const stored = readPendingStars(classId);
    if (stored && stored.kind === 'adjust' && !stored.payload.selectedStudentIds) { setStatus('Có lượt cả lớp chưa nhận kết quả. Mở Cộng/trừ cả lớp để thử lại.'); return; }
    const snapshot = { classId, name: currentClass.name, students: currentClass.students.map(s => ({ id: String(s.id), name: s.name })) };
    setScope(snapshot); setPending(stored); setSelected(stored?.payload.selectedStudentIds || []);
    setAmount(String(stored?.payload.amount || 1)); setReason(stored?.payload.reason || ''); setGroupName(''); setChosenGroup('');
    const month = new Date().getMonth() + 1;
    setTerm(stored?.payload.semester || semester || (month >= 2 && month <= 7 ? 'hk2' : 'hk1'));
    setLatest(null); setGroups({ version: 0, groups: [] }); setError(''); setStatus(''); setOpen(true); setLoading(true);
    const request = ++sequence.current;
    try {
      const [savedGroups, savedLatest] = await Promise.all([readClassStarGroups(classId), getLatestClassStarBatch(classId)]);
      if (request !== sequence.current) return;
      setGroups(savedGroups); setLatest(savedLatest.batch);
    } catch (err) { if (request === sequence.current) setError(err.message); }
    finally { if (request === sequence.current) setLoading(false); }
  };

  const mutate = async kind => {
    if (busyRef.current || !scope || loading) return;
    if (!pending && kind === 'adjust' && !canApply) return;
    if (!pending && kind === 'undo' && !latest) return;
    const operation = pending || { kind, className: scope.name, payload: kind === 'undo' ? {
      operationId: newStarOperationId(), classId: scope.classId, targetOperationId: latest.operationId, confirmed: true,
    } : { operationId: newStarOperationId(), classId: scope.classId, amount: Number(amount), reason: reason.trim(),
      semester: term, date: today(), expectedStudentIds: scope.students.map(s => s.id), selectedStudentIds: selected, confirmed: true } };
    // One shared pending slot prevents retrying a lost response as a new batch.
    const existing = readPendingStars(scope.classId);
    if (existing && existing.payload.operationId !== operation.payload.operationId) { setError('Có thao tác khác chưa hoàn tất. Đóng và mở lại để thử cùng lượt.'); return; }
    savePendingStars(scope.classId, operation); setPending(operation); busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await (operation.kind === 'undo' ? undoClassStars(operation.payload) : adjustClassStars(operation.payload));
      applyResult(result); clearPendingStars(scope.classId); setPending(null);
      setStatus(`${operation.kind === 'undo' ? 'Đã hoàn tác' : 'Đã điều chỉnh'}: ${result.changedCount}/${result.studentCount} học sinh, tổng ${result.totalChange > 0 ? '+' : ''}${result.totalChange} sao.`);
      setOpen(false);
    } catch (err) {
      const rejected = err.status >= 400 && err.status < 500;
      if (rejected) { clearPendingStars(scope.classId); setPending(null); }
      setError(`${err.message || 'Không lưu được sao.'}${rejected ? '' : ' Thử lại cùng lượt để tránh thay đổi lặp.'}`);
    } finally { busyRef.current = false; setBusy(false); }
  };

  const saveGroup = async () => {
    if (busyRef.current || pending || loading || !groupName.trim() || !selected.length) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const ids = new Set(scope.students.map(s => s.id));
      const cleaned = groups.groups.map(group => ({ ...group, studentIds: group.studentIds.filter(id => ids.has(id)) })).filter(group => group.studentIds.length);
      const same = cleaned.find(group => group.name.toLocaleLowerCase('vi') === groupName.trim().toLocaleLowerCase('vi'));
      const next = same ? cleaned.map(group => group.id === same.id ? { ...group, studentIds: selected } : group)
        : [...cleaned, { id: newStarOperationId(), name: groupName.trim(), studentIds: selected }];
      const result = await saveClassStarGroups({ classId: scope.classId, version: groups.version, groups: next });
      setGroups(result); setStatus(`Đã lưu nhóm ${groupName.trim()} (${selected.length} học sinh).`);
    } catch (err) { setError(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const locked = busy || loading || Boolean(pending);
  return <>
    <button type="button" className="btn btn-outline btn-sm class-stars-trigger" disabled={disabled || !applyResult || !currentClass?.students?.length} onClick={show}>
      <Users size={16} /> Sao nhóm / Hoàn tác
    </button>
    {status && <p className="class-stars-status" role="status">{status}</p>}
    <dialog ref={dialog} className="class-stars-dialog class-stars-group-dialog" aria-labelledby={titleId}
      onCancel={e => { if (busyRef.current) e.preventDefault(); else { sequence.current++; setOpen(false); } }}
      onClose={() => { sequence.current++; setOpen(false); trigger.current?.focus(); }}>
      <header className="class-stars-header"><h3 id={titleId}><Users size={22} /> Sao nhóm / Hoàn tác</h3>
        <button type="button" className="btn btn-icon" disabled={busy} aria-label="Đóng" onClick={() => { sequence.current++; setOpen(false); }}><X size={20} /></button></header>
      <p className="class-stars-scope">Lớp <strong>{scope?.name}</strong> · Chọn học sinh bên dưới để áp dụng cho nhóm.</p>
      {loading && <p role="status">Đang tải nhóm và lượt sao gần nhất…</p>}
      {pending ? <div className="class-stars-summary"><strong>Lượt {pending.kind === 'undo' ? 'hoàn tác' : 'sao nhóm'} chưa nhận kết quả</strong>
        <p>{pending.kind === 'adjust' ? `${pending.payload.amount} sao / học sinh · ${pending.payload.selectedStudentIds?.length} học sinh` : `Mã lượt gốc: ${pending.payload.targetOperationId}`}</p>
        <button type="button" className="btn btn-primary" disabled={busy || loading} onClick={() => mutate(pending.kind)}>Thử lại cùng lượt</button></div> : <>
        <label className="class-stars-reason">Chọn nhóm đã lưu<select className="input-field" disabled={locked} value={chosenGroup} onChange={e => {
          setChosenGroup(e.target.value);
          const group = groups.groups.find(g => g.id === e.target.value);
          if (group) { setSelected(group.studentIds.filter(id => scope.students.some(s => s.id === id))); setGroupName(group.name); }
          else { setSelected([]); setGroupName(''); }
        }}><option value="">Chọn học sinh thủ công</option>{groups.groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.studentIds.length})</option>)}</select></label>
        <fieldset className="class-stars-student-list" disabled={locked}><legend>Đã chọn {selected.length}/{scope?.students.length || 0}</legend>
          {(scope?.students || []).map(student => <label key={student.id}><input type="checkbox" checked={selected.includes(student.id)}
            onChange={e => { const checked = e.target.checked; setSelected(previous => checked ? [...previous, student.id] : previous.filter(id => id !== student.id)); }} />{student.name}</label>)}</fieldset>
        <div className="class-stars-fields"><label>Tên nhóm để lưu<input className="input-field" maxLength="80" value={groupName} disabled={locked} onChange={e => setGroupName(e.target.value)} placeholder="Ví dụ: Tổ 1" /></label>
          <button type="button" className="btn btn-outline" disabled={locked || !groupName.trim() || !selected.length || groups.groups.length >= 50 && !groups.groups.some(g => g.name === groupName.trim())} onClick={saveGroup}>Lưu / cập nhật nhóm</button></div>
        <p className="class-stars-status">Nhóm cùng tên sẽ được cập nhật thành viên. Học sinh đã rời lớp được bỏ khi lưu nhóm.</p>
        <div className="class-stars-fields"><label>Số sao mỗi học sinh (âm để trừ)<input className="input-field" type="number" min="-100" max="100" step="1" value={amount} disabled={locked} onChange={e => setAmount(e.target.value)} /></label>
          <label>Học kỳ<select className="input-field" disabled={locked} value={term} onChange={e => setTerm(e.target.value)}><option value="hk1">Học kỳ 1</option><option value="hk2">Học kỳ 2</option></select></label></div>
        <label className="class-stars-reason">Lý do<input className="input-field" maxLength="300" disabled={locked} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <p className="class-stars-summary">{canApply ? `Áp dụng ${Number(amount) > 0 ? '+' : ''}${amount} sao cho ${selected.length} học sinh đã chọn.` : 'Chọn học sinh và số nguyên khác 0 từ -100 đến 100.'} Số dư luôn tối thiểu 0.</p>
        <button type="button" className="btn btn-primary" disabled={locked || !canApply} onClick={() => mutate('adjust')}>Xác nhận điều chỉnh nhóm</button>
        <section className="class-stars-undo"><h4><Undo2 size={16} /> Hoàn tác lượt sao gần nhất chưa hoàn tác</h4>
          <p className="class-stars-scope">{latest ? `${latest.reason} · ${latest.date} · ${latest.studentCount} học sinh · tổng ${latest.totalChange > 0 ? '+' : ''}${latest.totalChange} sao.` : 'Chưa có lượt sao cả lớp/nhóm để hoàn tác.'}</p>
          <p className="class-stars-status">Ghi bút toán bù và giữ lịch sử. Sao trao sau lượt đó vẫn được giữ. Nếu hoàn tác làm sao âm hoặc thiếu dữ liệu gốc, hệ thống sẽ từ chối toàn bộ lượt.</p>
          <button type="button" className="btn btn-outline" disabled={locked || !latest} onClick={() => mutate('undo')}>Xác nhận hoàn tác lượt này</button></section>
      </>}
      {error && <p className="class-stars-error" role="alert">{error}</p>}
      {busy && <p role="status">Đang lưu…</p>}
    </dialog>
  </>;
}
