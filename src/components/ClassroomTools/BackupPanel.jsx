import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Download, Upload, ShieldCheck, RotateCcw, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';
import AppLifecycleService from '../../services/AppLifecycleService';
import { downloadDatabaseFile } from '../../services/FullDataExportService';
import BackupDestination from './BackupDestination';

const kindLabel = kind => ({ automatic: 'Tự động', safety: 'Trước phục hồi', imported: 'Đã nhập' }[kind] || 'Thủ công');
const sizeLabel = size => size == null ? 'Chưa có thông tin dung lượng' : `${(size / 1024 ** 2).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;

export default function BackupPanel({ onBusyChange }) {
  const [data, setData] = useState({ data: [], automatic: null });
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState('');
  const lock = useRef(false);
  const mounted = useRef(false);
  const selected = data.data.find(b => b.id === selectedId);
  const load = useCallback(async preferred => {
    const result = await apiClient.get('/api/backup/list');
    if (!mounted.current) return;
    setData(result);
    setSelectedId(previous => result.data.some(b => b.id === (preferred || previous)) ? (preferred || previous) : result.data[0]?.id || '');
  }, []);
  useEffect(() => {
    mounted.current = true;
    load().catch(e => { if (mounted.current) setError(e.message); });
    return () => { mounted.current = false; };
  }, [load]);
  const run = async operation => {
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusyChange?.(true); setError(''); setMessage('');
    try { await operation(); }
    catch (e) { if (mounted.current) setError(e.message); }
    finally { lock.current = false; if (mounted.current) setBusy(false); onBusyChange?.(false); }
  };
  const create = () => run(async () => {
    const result = await apiClient.post('/api/backup/create', {}, { timeout: 300000 });
    await load(result.backupId); setMessage(result.mirror?.ok === false ? `Đã tạo bản trong ứng dụng. Chưa chép được dự phòng: ${result.mirror.error}` : result.mirror && !result.mirror.skipped ? 'Đã tạo, kiểm tra và chép thêm gói dự phòng.' : 'Đã tạo và kiểm tra bản sao lưu đầy đủ.');
  });
  const restore = () => run(async () => {
    await apiClient.post('/api/backup/restore', { backupId: confirmId }, { timeout: 300000 });
    AppLifecycleService.reloadApplication();
  });
  const importFile = event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    void run(async () => {
      if (file.size > 4 * 1024 ** 3) throw new Error('Gói vượt 4 GB. Hãy giảm tài nguyên trước khi nhập.');
      const response = await fetch('/api/backup/import-package', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không nhập được gói sao lưu.');
      await load(result.backupId); setConfirmId(''); setMessage('Đã kiểm tra và thêm gói vào danh sách. Dữ liệu đang dùng chưa thay đổi; chọn Phục hồi nếu muốn áp dụng.');
    });
  };
  return <section className="backup-panel" aria-busy={busy}>
    <div className="backup-intro"><Archive size={25} aria-hidden="true" /><div><h3>Sao lưu & phục hồi</h3><p>Giữ một bản an toàn cho lớp học của bạn.</p></div></div>
    <div className="backup-auto"><strong>Sao lưu hằng ngày đang bật</strong><p>Khi web hoặc desktop đang chạy, hệ thống tạo một bản mỗi ngày và giữ 7 bản tự động gần nhất. Bản thủ công được giữ riêng.</p>
      <small>{data.automatic?.latest ? `Lần gần nhất: ${new Date(data.automatic.latest.createdAt).toLocaleString('vi-VN')}` : 'Bản đầu tiên được tạo sau khi ứng dụng khởi động.'}</small>
      {data.automatic?.lastError && <p className="classroom-tools-error">Lần tự động gần nhất chưa thành công: {data.automatic.lastError}</p>}</div>
    <p className="classroom-tools-muted">Gói EduICT gồm dữ liệu lớp học, ảnh và tệp trong kho ứng dụng. PowerPoint liên kết trên máy/OneDrive chỉ lưu đường dẫn. Khóa API không được đưa vào gói.</p>
    <div className="classroom-tools-actions"><button type="button" className="btn btn-primary" onClick={create} disabled={busy}><Archive size={16} />Tạo bản sao lưu</button>
      <label className={`btn btn-outline ${busy ? 'is-disabled' : ''}`}><Upload size={16} />Nhập gói EduICT<input type="file" accept=".eduict" onChange={importFile} disabled={busy} className="backup-file-input" /></label>
      <button type="button" className="btn btn-outline" onClick={() => run(() => load())} disabled={busy} aria-label="Làm mới danh sách sao lưu"><RefreshCw size={16} /></button></div>
    <label className="backup-picker">Bản sao lưu đã có<select className="input-field" disabled={busy || !data.data.length} value={selectedId} onChange={e => { setSelectedId(e.target.value); setConfirmId(''); setMessage(''); }}>
      {!data.data.length && <option value="">Chưa có bản sao lưu</option>}
      {data.data.map(b => <option key={b.id} value={b.id}>{new Date(b.createdAt).toLocaleString('vi-VN')} · {kindLabel(b.kind)}</option>)}
    </select></label>
    {selected && <div className="backup-detail"><div className="backup-facts"><span><strong>{selected.stats?.classes ?? '—'}</strong> lớp</span><span><strong>{selected.stats?.students ?? '—'}</strong> học sinh</span><span><strong>{selected.stats?.lessons ?? '—'}</strong> bài học</span><span>{sizeLabel(selected.sizeBytes)}</span></div>
      <p className="classroom-tools-muted">{selected.uploadsComplete ? `Có ${selected.fileCount || 0} tệp tài nguyên trong kho.` : 'Bản cũ chưa xác nhận đầy đủ tài nguyên. Nên tạo một bản mới trước khi chuyển máy.'}</p>
      {selected.newBytes != null && <p className="classroom-tools-muted">Ghi mới {sizeLabel(selected.newBytes)} · Tái sử dụng {sizeLabel(selected.reusedBytes)}. Các bản lưu giữ riêng dữ liệu; xóa một bản không làm mất bản khác.</p>}
      {selected.excludedTemporaryBytes > 0 && <p className="classroom-tools-muted">Không đưa {sizeLabel(selected.excludedTemporaryBytes)} tệp tạm/đệm không được dữ liệu tham chiếu vào bản lưu. Tệp gốc trên máy vẫn giữ nguyên.</p>}
      <div className="classroom-tools-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(async () => { await apiClient.post('/api/backup/verify', { backupId: selectedId }, { timeout: 300000 }); setMessage('Bản sao lưu toàn vẹn: database và mã kiểm tra tệp đều đạt.'); })}><ShieldCheck size={16} />Kiểm tra</button>
        <button type="button" className="btn btn-outline" disabled={busy || !selected.uploadsComplete} onClick={() => run(() => downloadDatabaseFile(`/api/backup/package?backupId=${encodeURIComponent(selectedId)}`, `${selectedId}.eduict`))}><Download size={16} />Tải gói đầy đủ</button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setConfirmId(selectedId)}><RotateCcw size={16} />Phục hồi</button></div></div>}
    {confirmId && <div className="backup-confirm" role="group" aria-label="Xác nhận phục hồi"><strong>Thay dữ liệu đang dùng bằng bản đã chọn?</strong><p>Đóng bản web hoặc desktop còn lại trước khi tiếp tục. Hệ thống kiểm tra gói và giữ bản an toàn trước khi thay dữ liệu.</p><div className="classroom-tools-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={restore}>Xác nhận phục hồi</button><button type="button" className="btn btn-outline" disabled={busy} onClick={() => setConfirmId('')}>Hủy</button></div></div>}
    <BackupDestination mirror={data.mirror} busy={busy} selectedId={selectedId} onSave={folder=>run(async()=>{await apiClient.post('/api/backup/mirror',{folder});await load();setMessage(folder?'Đã bật nơi dự phòng. Bấm Tạo bản sao lưu hoặc Chép bản đang chọn để lưu ngay.':'Đã ngừng chép dự phòng. Các gói đã có vẫn được giữ.');})} onCopy={backupId=>run(async()=>{const result=await apiClient.post('/api/backup/mirror-copy',{backupId},{timeout:300000});await load();if(!result.ok)throw new Error(result.error);setMessage('Đã chép và kiểm tra gói dự phòng.');})}/>
    {busy && <p role="status">Đang xử lý sao lưu, vui lòng giữ cửa sổ này…</p>}
    {message && <p className="classroom-tools-success" role="status">{message}</p>}
    {error && <p className="classroom-tools-error" role="alert">{error}</p>}
  </section>;
}
