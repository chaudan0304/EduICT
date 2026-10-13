import { useEffect, useRef, useState } from 'react';
import { X, Wrench, History } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { MACHINE_STATUSES, MACHINE_FAULT_CATEGORIES } from '../../../shared/machineFaults';
import { faultDate } from './faultDate';
const eventLabels = { reported: 'Báo lỗi', updated: 'Cập nhật', resolved: 'Đã sửa', imported: 'Dữ liệu cũ' };

export default function MachineFaultDialog({ machine, onSave, onClose, onReload }) {
  const dialog = useRef(null);
  const pending = useRef(null);
  const [status, setStatus] = useState(machine.fault?.status || 'unavailable');
  const [category, setCategory] = useState(machine.fault?.category || 'other');
  const [note, setNote] = useState(machine.fault?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [history, setHistory] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); };
  }, []);
  useEffect(() => {
    let alive = true;
    apiClient.get(`/api/machines/${machine.machineNumber}/history`).then(data => {
      if (alive) { setHistory(data.events); setCursor(data.nextCursor); }
    }).catch(err => { if (alive) setHistoryError(err.message); })
      .finally(() => { if (alive) setHistoryLoading(false); });
    return () => { alive = false; };
  }, [machine.machineNumber]);
  const loadMore = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await apiClient.get(`/api/machines/${machine.machineNumber}/history?before=${cursor || 0}`);
      setHistory(previous => cursor ? [...previous, ...data.events] : data.events);
      setCursor(data.nextCursor);
    } catch (err) { setHistoryError(err.message); }
    finally { setHistoryLoading(false); }
  };
  const submit = async (nextStatus) => {
    if (busy || conflict) return;
    const payload = { status: nextStatus, category, note, expectedRevision: machine.revision };
    const fingerprint = JSON.stringify(payload);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, operationId: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      await onSave(machine.machineNumber, { ...payload, operationId: pending.current.operationId });
      onClose();
    } catch (err) {
      setError(err.message);
      setConflict(err.status === 409);
    } finally { setBusy(false); }
  };
  return <dialog ref={dialog} className="machine-fault-dialog" aria-labelledby="machine-fault-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="machine-fault-heading">
      <h2 id="machine-fault-title"><Wrench size={22} /> Máy {String(machine.machineNumber).padStart(2, '0')}</h2>
      <button type="button" className="btn btn-ghost" disabled={busy} aria-label="Đóng" onClick={onClose}><X size={20} /></button>
    </header>
    <p className="machine-fault-muted">Dùng chung cho các lớp. Báo lỗi không thay đổi chỗ ngồi học sinh.</p>
    {machine.fault && <p className="machine-fault-muted">Báo lỗi: {faultDate(machine.fault.reported_at)}</p>}
    <form onSubmit={event => { event.preventDefault(); submit(status); }}>
      <fieldset disabled={busy || conflict}>
        <label htmlFor="machine-fault-status">Tình trạng sử dụng</label>
        <select id="machine-fault-status" value={status} onChange={event => setStatus(event.target.value)}>
          {Object.entries(MACHINE_STATUSES).filter(([key]) => key !== 'normal').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <label htmlFor="machine-fault-category">Loại lỗi</label>
        <select id="machine-fault-category" value={category} onChange={event => setCategory(event.target.value)}>
          {Object.entries(MACHINE_FAULT_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <label htmlFor="machine-fault-note">Ghi chú <span className="machine-fault-muted">(không bắt buộc)</span></label>
        <textarea id="machine-fault-note" rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: chuột bị nhấp đúp, cần thay chuột" />
      </fieldset>
      {error && <p className="machine-fault-error" role="alert">{error}</p>}
      {conflict && <button type="button" className="btn btn-outline" onClick={async () => { await onReload(); onClose(); }}>Tải lại trạng thái</button>}
      <div className="machine-fault-actions">
        {machine.fault && <button type="button" className="btn btn-outline" disabled={busy || conflict} onClick={() => submit('normal')}>✓ Đã sửa</button>}
        <button type="submit" className="btn btn-primary" disabled={busy || conflict}>{busy ? 'Đang lưu…' : 'Lưu tình trạng'}</button>
      </div>
    </form>
    <section className="machine-fault-history" aria-labelledby="machine-history-title">
      <h3 id="machine-history-title"><History size={18} /> Lịch sử máy</h3>
      {historyLoading && <p role="status">Đang tải lịch sử…</p>}
      {historyError && <p className="machine-fault-error" role="alert">{historyError} <button className="btn btn-outline btn-sm" onClick={loadMore} disabled={historyLoading}>Thử lại</button></p>}
      {!historyLoading && !historyError && !history.length && <p className="machine-fault-muted">Chưa có lỗi được ghi nhận.</p>}
      <ol>{history.map(event => <li key={event.id}>
        <strong>{eventLabels[event.event] || event.event} · {MACHINE_STATUSES[event.status]}</strong>
        <time>{faultDate(event.recorded_at)}</time>
        <span>{MACHINE_FAULT_CATEGORIES[event.category]}{event.note ? ` — ${event.note}` : ''}</span>
      </li>)}</ol>
      {cursor && <button type="button" className="btn btn-outline btn-sm" disabled={historyLoading} onClick={loadMore}>Xem lịch sử cũ hơn</button>}
    </section>
  </dialog>;
}
