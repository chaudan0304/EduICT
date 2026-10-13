import { useEffect, useRef, useState } from 'react';
import apiClient from '../../services/apiClient';

export default function VersionPanel() {
  const alive = useRef(true); const lock = useRef(false);
  const [version, setVersion] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    alive.current = true;
    apiClient.get('/api/classroom-tools/version').then(value => { if (alive.current) setVersion(value); }).catch(err => { if (alive.current) setError(err.message); });
    return () => { alive.current = false; };
  }, []);
  const check = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { const value = await apiClient.post('/api/classroom-tools/version-check', {}, { timeout: 12000 }); if (alive.current) setVersion(value); }
    catch (err) { if (alive.current) setError(err.message); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const releaseUrl = version?.releaseUrl?.startsWith('https://github.com/chaudan0304/EduICT/releases/tag/') ? version.releaseUrl : null;
  return <section><h3>Phiên bản EduICT</h3>{version ? <div className="classroom-tools-version"><strong>{version.currentVersion}</strong><span>{version.runtime === 'desktop' ? 'Ứng dụng desktop đang chạy' : 'Bản web đang chạy'}</span></div> : <p>Đang đọc phiên bản…</p>}
    <p className="classroom-tools-muted">Thông báo bản mới dùng GitHub Releases có bộ cài. Sao lưu dữ liệu trước khi cài cập nhật.</p>
    <button type="button" className="btn btn-primary" disabled={busy} onClick={check}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra phiên bản mới'}</button>
    {version?.message && <p role="status" className={version.updateAvailable ? 'classroom-tools-success' : 'classroom-tools-muted'}>{version.message}</p>}
    {version?.latestVersion && <p>Bản công khai: <strong>{version.latestVersion}</strong></p>}
    {version?.updateAvailable && releaseUrl && <a className="btn btn-outline" href={releaseUrl} target="_blank" rel="noopener noreferrer">Mở bản phát hành trên GitHub</a>}
    {error && <p className="classroom-tools-error" role="alert">{error}</p>}
  </section>;
}
