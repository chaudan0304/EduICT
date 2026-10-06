import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, WifiOff, ExternalLink } from 'lucide-react';
import { normalizePowerPointEmbed } from '../../../shared/powerPointOnline.js';
import './PowerPointOnline.css';

export default function PowerPointOnlineSurface({ embedUrl, title, interactive = true, reloadKey = 0 }) {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const source = useMemo(() => {
    try { return { url: normalizePowerPointEmbed(embedUrl) }; }
    catch (err) { return { error: err.message }; }
  }, [embedUrl]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    setLoaded(false); setSlow(false);
    const timeout = setTimeout(() => setSlow(true), 20000);
    return () => clearTimeout(timeout);
  }, [source.url, attempt, reloadKey]);
  if (source.error) return <div className="online-ppt-fallback" role="alert"><h2>Liên kết Online chưa hợp lệ</h2><p>{source.error} Quay lại thư viện để sửa liên kết bài này.</p></div>;
  return <div className="online-ppt-surface">
    <iframe key={`${attempt}-${reloadKey}`} className="online-ppt-frame" src={source.url} title={`PowerPoint Online: ${title || 'Bài giảng'}`} loading="eager" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" allow="autoplay" referrerPolicy="strict-origin-when-cross-origin" tabIndex={interactive ? 0 : -1} aria-hidden={!interactive} style={{ pointerEvents: interactive ? 'auto' : 'none' }} onLoad={() => { setLoaded(true); setSlow(false); }} onError={() => { setLoaded(false); setSlow(true); }} />
    {(offline || !loaded) && <div className="online-ppt-status" role="status" aria-live="polite">
      {offline ? <WifiOff size={19} /> : <Loader2 size={19} className={slow ? undefined : 'animate-spin'} />}
      <p>{offline ? 'Đang mất kết nối Internet. Bài Online cần mạng để tải và trình chiếu.' : slow ? 'Microsoft đang tải lâu. Bạn có thể tải lại hoặc mở bài trên Microsoft để kiểm tra quyền xem.' : 'Đang kết nối PowerPoint Online…'}</p>
      {(offline || slow) && <><button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttempt(n => n + 1)}><RefreshCw size={15} />Tải lại</button><a className="btn btn-outline btn-sm" href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Mở Microsoft</a></>}
    </div>}
  </div>;
}
