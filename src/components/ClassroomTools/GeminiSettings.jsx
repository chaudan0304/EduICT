import { useEffect, useId, useRef, useState } from 'react';
import apiClient from '../../services/apiClient';

export default function GeminiSettings({ onAiStatusChange, onBusyChange }) {
  const fields = useId(); const alive = useRef(true); const lock = useRef(false);
  const [config, setConfig] = useState(null); const [model, setModel] = useState('gemini-3.5-flash-lite');
  const [enabled, setEnabled] = useState(true); const [apiKey, setApiKey] = useState(''); const [removeKey, setRemoveKey] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    alive.current = true;
    apiClient.get('/api/classroom-tools/ai-config', { timeout: 8000 }).then(value => {
      if (!alive.current) return;
      setConfig(value); setModel(value.model); setEnabled(value.enabled);
    }).catch(err => { if (alive.current) setError(err.message); });
    return () => { alive.current = false; };
  }, []);

  const request = async action => {
    if (lock.current || !config?.localOnly) return;
    lock.current = true; setBusy(true); onBusyChange(true); setError(''); setMessage('');
    try {
      if (action === 'save') {
        const value = await apiClient.post('/api/classroom-tools/ai-config', { model, enabled, apiKey, removeKey });
        if (!alive.current) return;
        setConfig(value); setApiKey(''); setRemoveKey(false); setMessage('Đã lưu cấu hình Gemini.');
        onAiStatusChange?.({ ...value, available: true });
      } else {
        const result = await apiClient.post('/api/classroom-tools/ai-check', {}, { timeout: 15000 });
        if (!alive.current) return;
        if (result.ok) setMessage(result.message); else setError(result.message);
      }
    } catch (err) { if (alive.current) setError(err.message); }
    finally { lock.current = false; if (alive.current) { setBusy(false); onBusyChange(false); } }
  };
  return <section><h3>Cấu hình Gemini</h3>
    <p className="classroom-tools-muted">Khóa chỉ lưu ở cấu hình riêng của máy chạy EduICT. Giao diện không đọc lại khóa đã lưu và không đưa khóa vào sao lưu lớp học.</p>
    {!config && !error && <p role="status">Đang đọc cấu hình…</p>}
    {config?.localOnly === false && <p className="classroom-tools-warning">Mở EduICT bằng localhost trên máy chạy phần mềm để sửa cấu hình. Trang này chỉ hiển thị trạng thái.</p>}
    {config && <form onSubmit={e => { e.preventDefault(); request('save'); }}>
      <fieldset disabled={busy || !config.localOnly} className="classroom-tools-fields">
        <label className="classroom-tools-check"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Bật trợ giảng Gemini</label>
        <label htmlFor={`${fields}-model`}>Model<input id={`${fields}-model`} className="input-field" value={model} required maxLength="107" pattern="gemini-[a-zA-Z0-9._-]+" onChange={e => setModel(e.target.value)} /></label>
        <label htmlFor={`${fields}-key`}>Khóa API mới<input id={`${fields}-key`} className="input-field" type="password" value={apiKey} maxLength="200" autoComplete="off" spellCheck={false}
          placeholder={config.configured ? 'Để trống để giữ khóa đã lưu' : 'Dán khóa Gemini của bạn'} disabled={removeKey} onChange={e => setApiKey(e.target.value.trim())} /></label>
        <p className="classroom-tools-muted">{config.configured ? 'Đã có khóa được lưu trên máy.' : 'Chưa có khóa hợp lệ.'} Lưu thay đổi trước khi kiểm tra kết nối.</p>
        <label className="classroom-tools-check"><input type="checkbox" checked={removeKey} onChange={e => { setRemoveKey(e.target.checked); if (e.target.checked) setApiKey(''); }} /> Xác nhận xóa khóa đã lưu</label>
      </fieldset>
      <div className="classroom-tools-actions"><button type="submit" className="btn btn-primary" disabled={busy || !config.localOnly}>Lưu cấu hình</button>
        <button type="button" className="btn btn-outline" disabled={busy || !config.localOnly || !config.configured || !config.enabled} onClick={() => request('check')}>Kiểm tra kết nối đã lưu</button></div>
    </form>}
    {busy && <p role="status">Đang xử lý…</p>}{error && <p className="classroom-tools-error" role="alert">{error}</p>}{message && <p className="classroom-tools-success" role="status">{message}</p>}
  </section>;
}
