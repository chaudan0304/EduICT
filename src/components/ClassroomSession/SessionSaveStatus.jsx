import { useEffect, useState } from 'react';
import { getSessionWriteStatus, retrySessionWrites, SESSION_WRITES_EVENT } from './sessionPersistence';

export default function SessionSaveStatus({ sessionId }) {
  const [status, setStatus] = useState(() => getSessionWriteStatus(sessionId));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const read = () => setStatus(getSessionWriteStatus(sessionId));
    read(); window.addEventListener(SESSION_WRITES_EVENT, read);
    return () => window.removeEventListener(SESSION_WRITES_EVENT, read);
  }, [sessionId]);
  if (!status.pending) return null;
  return <div role="alert" className="session-save-warning"><strong>Chưa lưu vào dữ liệu chung</strong><p>{status.error || 'Đang chờ máy chủ xác nhận thay đổi tiết học.'} {status.durable ? 'Bản nháp được giữ trên thiết bị này để thử lưu lại.' : 'Chỉ giữ được trong cửa sổ này; hãy giữ cửa sổ mở.'}</p><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { await retrySessionWrites(sessionId); } catch { /* The stored status displays the failure. */ } finally { setBusy(false); } }}>{busy ? 'Đang lưu…' : 'Thử lưu lại'}</button></div>;
}
