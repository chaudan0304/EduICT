import { Monitor, AlertTriangle, CheckCircle2, Wrench, RefreshCw } from 'lucide-react';
import { MACHINE_STATUSES, MACHINE_FAULT_CATEGORIES } from '../../../shared/machineFaults';
import { faultDate } from './faultDate';
import './machineFaults.css';

export default function MachineFaultPanel({ machines, loading, error, onReload, onSelect, onSeating }) {
  const active = machines.filter(machine => machine.fault);
  const limited = active.filter(machine => machine.fault.status === 'limited').length;
  const unavailable = active.length - limited;
  return <section className="glass-panel machine-fault-panel" aria-labelledby="machine-panel-title" aria-busy={loading}>
    <header className="machine-fault-heading">
      <div><h2 id="machine-panel-title"><Monitor size={26} /> Phòng máy</h2>
        <p className="machine-fault-muted">Chọn máy để báo lỗi, ghi chú hoặc đánh dấu đã sửa. Không cần xếp chỗ học sinh.</p></div>
      <div className="machine-fault-actions">
        <button type="button" className="btn btn-outline btn-sm" disabled={loading} onClick={onReload}><RefreshCw size={16} /> Cập nhật</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={loading || Boolean(error)} onClick={onSeating}>Mở công cụ chỗ ngồi</button>
      </div>
    </header>
    {loading && <p role="status">Đang tải tình trạng máy…</p>}
    {error && <p className="machine-fault-error" role="alert">Không tải được tình trạng máy: {error}. Bấm “Cập nhật” để thử lại.</p>}
    {!error && machines.length > 0 && <>
      <div className="machine-fault-totals">
        <span><CheckCircle2 size={18} /> {machines.length - active.length} bình thường</span>
        <span><AlertTriangle size={18} /> {limited} có lỗi, vẫn dùng được</span>
        <span><Wrench size={18} /> {unavailable} không dùng được</span>
      </div>
      <div className="machine-fault-grid">{machines.map(machine => <button type="button" key={machine.machineNumber}
        className={`machine-fault-card machine-fault-${machine.fault?.status || 'normal'}`} disabled={loading}
        onClick={() => onSelect(machine)}>
        <span className="machine-fault-number"><Monitor size={22} /> Máy {String(machine.machineNumber).padStart(2, '0')}</span>
        <strong>{MACHINE_STATUSES[machine.fault?.status || 'normal']}</strong>
        <span className="machine-fault-card-note">{machine.fault ? `${MACHINE_FAULT_CATEGORIES[machine.fault.category]}${machine.fault.note ? ` · ${machine.fault.note}` : ''}` : 'Báo lỗi / xem lịch sử'}</span>
      </button>)}</div>
      <section className="machine-fault-waiting">
        <h3>Máy cần xử lý ({active.length})</h3>
        {!active.length && <p className="machine-fault-muted">Chưa có máy đang báo lỗi.</p>}
        <ul>{active.map(machine => <li key={machine.machineNumber}>
          <button type="button" className="btn btn-outline btn-sm" disabled={loading} onClick={() => onSelect(machine)}>Máy {String(machine.machineNumber).padStart(2, '0')}</button>
          <div><strong>{MACHINE_STATUSES[machine.fault.status]} · {MACHINE_FAULT_CATEGORIES[machine.fault.category]}</strong>
            {machine.fault.note && <p>{machine.fault.note}</p>}
            <small className="machine-fault-muted">Báo lỗi: {faultDate(machine.fault.reported_at)}</small></div>
        </li>)}</ul>
      </section>
    </>}
  </section>;
}
