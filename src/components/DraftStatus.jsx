export default function DraftStatus({ status }) {
  if (!status) return null;
  return <p className={`draft-status${status.error ? ' is-error' : ''}`} role={status.error ? 'alert' : 'status'}>{status.error || `${status.restored ? 'Đã khôi phục bản nháp' : 'Đã tự lưu bản nháp'} · ${new Date(status.savedAt).toLocaleTimeString('vi-VN')} · Riêng trình duyệt/app này`}</p>;
}
