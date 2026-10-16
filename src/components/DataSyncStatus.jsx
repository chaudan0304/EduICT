import { CheckCircle2, AlertCircle, RefreshCw, Play } from 'lucide-react';
import './DataSyncStatus.css';

export default function DataSyncStatus({ status, writeStatus, onRefresh, onTeach, currentClass, hasSession }) {
  const pending = writeStatus.pending > 0;
  const warning = writeStatus.unsaved || (!status.connected && !status.loading);
  const label = pending ? 'Đang lưu thay đổi…' : writeStatus.unsaved ? 'Có thay đổi chưa lưu' : status.loading && !status.lastSyncedAt ? 'Đang kết nối dữ liệu…' : !status.connected ? 'Chưa kết nối dữ liệu' : 'Đã kết nối dữ liệu';
  const Icon = warning ? AlertCircle : CheckCircle2;
  return <section className={`data-sync-status ${warning ? 'has-warning' : ''}`} aria-label="Trạng thái dữ liệu">
    <div className="data-sync-copy"><Icon size={17} aria-hidden="true" /><div><strong role="status">{label}</strong>
      <span aria-live="off">{status.error || (writeStatus.unsaved ? 'Giữ thay đổi trên cửa sổ này. Kiểm tra kết nối trước khi thử lại.' : status.lastSyncedAt ? `${status.changed ? 'Đã nhận thay đổi từ kho chung. ' : ''}Đọc gần nhất ${new Date(status.lastSyncedAt).toLocaleTimeString('vi-VN')} · Tự làm mới khi quay lại cửa sổ và mỗi 10 giây` : 'Đang tải danh sách từ kho dữ liệu dùng chung.')}</span>
    </div></div>
    <div className="data-sync-actions"><button className="btn btn-outline btn-sm" type="button" onClick={onRefresh} disabled={pending || status.loading}><RefreshCw size={15} aria-hidden="true" />Làm mới</button>
      <button className="btn btn-primary btn-sm" type="button" onClick={onTeach} disabled={!currentClass && !hasSession}><Play size={15} aria-hidden="true" />{hasSession ? 'Tiếp tục tiết dạy' : 'Vào tiết dạy'}</button></div>
  </section>;
}
