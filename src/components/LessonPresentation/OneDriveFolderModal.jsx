import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Cloud, FolderOpen, Loader2, RefreshCw, X } from 'lucide-react';
import OneDriveConnectionPanel from './OneDriveConnectionPanel';
import { oneDriveStatus, connectOneDrive, pollOneDrive, disconnectOneDrive, fetchOneDriveFolder, importOneDriveFiles, fetchOneDriveImport, cancelOneDriveImport } from '../../services/OneDriveService';
import { fetchPowerPointOnlineCandidates } from '../../services/PowerPointOnlineService';
import './PowerPointOnline.css';

const titleKey = title => String(title || '').normalize('NFKC').toLocaleLowerCase('vi').replace(/[_\s]+/g, ' ').trim();

export default function OneDriveFolderModal({ defaultGrade = 3, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const handledJob = useRef('');
  const [phase, setPhase] = useState('connect');
  const [clientId, setClientId] = useState('');
  const [auth, setAuth] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [folder, setFolder] = useState(null);
  const [trail, setTrail] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [drafts, setDrafts] = useState({});
  const [lessons, setLessons] = useState([]);
  const [grade, setGrade] = useState(Number(defaultGrade));
  const [confirmEmbed, setConfirmEmbed] = useState(false);
  const [job, setJob] = useState(null);
  const [query, setQuery] = useState('');
  const running = job?.state === 'running';
  const rows = (folder?.files || []).filter(file => selected.has(file.id)).map(file => {
    const draft = drafts[file.id] || { title: file.title, grade, lessonId: '', replaceExisting: false };
    const lesson = lessons.find(item => item.id === draft.lessonId);
    const sameSource = lesson?.onedrive_drive_id === folder.driveId && lesson?.onedrive_item_id === file.id;
    return { file, ...draft, lesson, replacing: Boolean(lesson?.online_embed_url && !sameSource) };
  });
  const targetIds = rows.filter(row => row.lessonId).map(row => row.lessonId);
  const invalid = rows.some(row => !row.title.trim() || row.title.length > 250 || (row.lessonId && !row.lesson) || (row.replacing && !row.replaceExisting)) || new Set(targetIds).size !== targetIds.length;

  async function openFolder(id = '', nextTrail = []) {
    setBusy(true); setError('');
    try {
      const result = await fetchOneDriveFolder(id);
      setFolder(result); setTrail(nextTrail); setSelected(new Set()); setQuery('');
      setDrafts(prev => {
        const next = { ...prev };
        for (const file of result.files) {
          if (next[file.id]) continue;
          const matches = lessons.filter(lesson => lesson.onedrive_drive_id === result.driveId && lesson.onedrive_item_id === file.id);
          const matched = matches.length === 1 ? matches[0] : null;
          next[file.id] = { title: file.title, grade: matched ? Number(matched.grade) : grade, lessonId: matched?.id || '', replaceExisting: false };
        }
        return next;
      });
      setPhase('folders');
    } catch (err) { setError(err.message); if (err.statusCode === 401) setPhase('connect'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    let cancelled = false;
    async function load() {
      try {
        const [status, candidates] = await Promise.all([oneDriveStatus(), fetchPowerPointOnlineCandidates()]);
        if (cancelled) return;
        setClientId(status.clientId); setLessons(candidates);
        if (status.job) { setJob(status.job); setPhase('import'); }
        else if (status.connected) {
          const listing = await fetchOneDriveFolder();
          if (cancelled) return;
          setFolder(listing); setPhase('folders');
          setDrafts(Object.fromEntries(listing.files.map(file => {
            const matches = candidates.filter(lesson => lesson.onedrive_drive_id === listing.driveId && lesson.onedrive_item_id === file.id);
            const matched = matches.length === 1 ? matches[0] : null;
            return [file.id, { title: file.title, grade: matched ? Number(matched.grade) : Number(defaultGrade), lessonId: matched?.id || '', replaceExisting: false }];
          })));
        }
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setBusy(false); }
    }
    void load();
    return () => { cancelled = true; dialog.close(); };
  }, [defaultGrade]);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    let timer;
    async function poll() {
      try {
        const result = await pollOneDrive();
        if (cancelled) return;
        if (result.state === 'connected') { setAuth(null); await openFolder(); }
        else timer = setTimeout(poll, Math.max(1000, result.pollAfterMs));
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        if (err.statusCode === 401 || Date.now() > auth.expiresAt) setAuth(null);
        else timer = setTimeout(poll, 10000);
      }
    }
    timer = setTimeout(poll, auth.pollAfterMs);
    return () => { cancelled = true; clearTimeout(timer); };
    // Connection effect uses the current default grade and loaded library.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let timer;
    async function poll() {
      try {
        const result = await fetchOneDriveImport(job.id);
        if (cancelled) return;
        setJob(result);
        if (result.state === 'running') timer = setTimeout(poll, 1500);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        if (err.statusCode === 401 || err.statusCode === 404) setJob(prev => ({ ...prev, state: 'unavailable', error: 'Không đọc được trạng thái đợt nhập. Tải lại thư viện trước khi nhập lại.' }));
        else timer = setTimeout(poll, 5000);
      }
    }
    timer = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [running, job?.id]);

  useEffect(() => {
    if (job?.state !== 'completed' || !job.result || handledJob.current === job.id) return;
    handledJob.current = job.id;
    onSaved(job.result); onClose();
  }, [job, onSaved, onClose]);

  async function connect() {
    setBusy(true); setError('');
    try { setAuth(await connectOneDrive(clientId)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function disconnect(close = false) {
    setBusy(true); setError('');
    try { await disconnectOneDrive(); setAuth(null); setPhase('connect'); setFolder(null); setJob(null); if (close) onClose(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function close() { if (busy || running) return; if (auth) void disconnect(true); else onClose(); }
  function change(id, changes) { setConfirmEmbed(false); setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...changes } })); }
  function toggle(id) { setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else if (next.size < 200) next.add(id); return next; }); }
  function applyGrade(value) {
    setGrade(value); setConfirmEmbed(false);
    setDrafts(prev => Object.fromEntries(Object.entries(prev).map(([id, draft]) => [id, selected.has(id) ? { ...draft, grade: value, lessonId: '', replaceExisting: false } : draft])));
  }
  function matchTitles() {
    setConfirmEmbed(false);
    setDrafts(prev => {
      const next = { ...prev };
      const used = new Set(rows.filter(row => row.lessonId).map(row => row.lessonId));
      for (const row of rows) {
        if (row.lessonId) continue;
        const matches = lessons.filter(lesson => Number(lesson.grade) === row.grade && titleKey(lesson.title) === titleKey(row.title));
        if (matches.length === 1 && !used.has(matches[0].id)) { next[row.file.id] = { ...next[row.file.id], lessonId: matches[0].id, replaceExisting: false }; used.add(matches[0].id); }
      }
      return next;
    });
  }
  async function refreshLessons() {
    setBusy(true); setError('');
    try { setLessons(await fetchPowerPointOnlineCandidates()); setConfirmEmbed(false); setDrafts(prev => Object.fromEntries(Object.entries(prev).map(([id, draft]) => [id, { ...draft, replaceExisting: false }]))); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function startImport(event) {
    event.preventDefault();
    if (busy || invalid || !confirmEmbed || !rows.length) return;
    setBusy(true); setError('');
    try {
      const items = rows.map(row => ({ file_id: row.file.id, title: row.title, grade: row.grade, ...(row.lessonId ? { lesson_id: row.lessonId, expected_url: row.lesson.online_embed_url || '', expected_updated_at: row.lesson.updated_at || '', replace_existing: row.replaceExisting } : {}) }));
      setJob(await importOneDriveFiles(items)); setPhase('import');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function cancelImport() {
    setBusy(true); setError('');
    try { setJob(await cancelOneDriveImport(job.id)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const visibleFiles = (folder?.files || []).filter(file => titleKey(file.name).includes(titleKey(query)));
  return <dialog ref={dialogRef} className="linked-ppt-dialog online-ppt-batch-dialog" aria-labelledby="onedrive-folder-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header className="linked-ppt-heading"><div><span className="linked-ppt-eyebrow">ONEDRIVE CÁ NHÂN</span><h2 id="onedrive-folder-title">Chọn thư mục OneDrive</h2></div><button type="button" className="btn btn-ghost" aria-label="Đóng hộp thoại" disabled={busy || running} onClick={close}><X size={20} /></button></header>
    {phase === 'connect' && <OneDriveConnectionPanel clientId={clientId} onClientId={setClientId} busy={busy} auth={auth} onConnect={connect} onCancel={() => disconnect()} />}
    {phase === 'folders' && folder && <>
      <div className="onedrive-folder-heading"><div><Cloud size={18} /><strong>{folder.folder.name}</strong></div><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => disconnect()}>Ngắt kết nối</button></div>
      <nav className="onedrive-breadcrumb" aria-label="Đường dẫn thư mục"><button type="button" disabled={busy} onClick={() => openFolder()}>OneDrive</button>{trail.map((item, index) => <React.Fragment key={item.id}><span>/</span><button type="button" disabled={busy} onClick={() => openFolder(item.id, trail.slice(0, index + 1))}>{item.name}</button></React.Fragment>)}</nav>
      <p className="linked-ppt-help">Chỉ lấy PowerPoint trực tiếp trong thư mục đang mở. Mở thư mục con để chọn bài bên trong. Không tải file về EduICT.</p>
      {folder.truncated && <p role="alert" className="linked-ppt-error">Danh sách bị giới hạn ở 5.000 mục hoặc 30 trang. Chọn thư mục con nhỏ hơn để lấy đầy đủ.</p>}
      <div className="onedrive-folder-grid">{folder.folders.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => openFolder(item.id, [...trail, item])}><FolderOpen size={21} /><span>{item.name}</span></button>)}</div>
      <label className="linked-ppt-field">Tìm file PowerPoint<input value={query} disabled={busy} onChange={event => setQuery(event.target.value)} placeholder="Nhập tên bài hoặc tên file" /></label>
      <div className="onedrive-file-tools"><span role="status">{folder.files.length} file · đã chọn {selected.size}/200</span><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setSelected(new Set(visibleFiles.slice(0, 200).map(file => file.id)))}>Chọn danh sách đang hiện</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setSelected(new Set())}>Bỏ chọn</button></div>
      <div className="onedrive-file-list">{visibleFiles.map(file => <label key={file.id}><input type="checkbox" disabled={busy || (!selected.has(file.id) && selected.size >= 200)} checked={selected.has(file.id)} onChange={() => toggle(file.id)} /><span>{file.name}</span><small>{(file.size / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB</small></label>)}{!visibleFiles.length && <p>Không có file PowerPoint phù hợp trong thư mục này.</p>}</div>
      <footer className="linked-ppt-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => openFolder(folder.folder.id, trail)}><RefreshCw size={16} />Tải lại thư mục</button><button type="button" className="btn btn-primary" disabled={busy || !selected.size} onClick={() => { setConfirmEmbed(false); setPhase('review'); }}>Xem {selected.size} bài đã chọn</button></footer>
    </>}
    {phase === 'review' && <form onSubmit={startImport}>
      <div className="online-batch-summary"><strong>{rows.length} file</strong><span>{rows.filter(row => !row.lessonId).length} bài mới · {rows.filter(row => row.lessonId).length} bài đã có</span></div>
      <div className="onedrive-file-tools"><label>Khối cho bài đã chọn <select disabled={busy} value={grade} onChange={event => applyGrade(Number(event.target.value))}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Khối {value}</option>)}</select></label><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={matchTitles}>Ghép bài trùng tên trong khối</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={refreshLessons}>Tải lại bài đã có</button></div>
      <p className="linked-ppt-help">Tên bài lấy từ tên file. Chọn bài đã có để giữ lịch dạy, ghi chú và nội dung hiện tại. Chỉ ghép tên khi bạn chọn nút ghép; file đã nhập từ OneDrive được nhận diện bằng mã file.</p>
      <div className="online-batch-list">{rows.map((row, index) => <section key={row.file.id} className="online-batch-row">
        <header><strong>{index + 1}. {row.file.name}</strong><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { toggle(row.file.id); setConfirmEmbed(false); }}>Bỏ file</button></header>
        <div className="online-batch-row-fields"><label className="linked-ppt-field">Khối<select disabled={busy} value={row.grade} onChange={event => change(row.file.id, { grade: Number(event.target.value), lessonId: '', replaceExisting: false })}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Khối {value}</option>)}</select></label><label className="linked-ppt-field">Gắn vào bài<select disabled={busy} value={row.lessonId} onChange={event => change(row.file.id, { lessonId: event.target.value, replaceExisting: false })}><option value="">Tạo bài Online mới</option>{lessons.filter(lesson => Number(lesson.grade) === row.grade).map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}{lesson.online_embed_url ? ' · đã có Online' : ''}</option>)}</select></label></div>
        <label className="linked-ppt-field">{row.lessonId ? 'Tên bài hiện tại (giữ nguyên)' : 'Tên bài mới'}<input required maxLength={250} disabled={busy || Boolean(row.lessonId)} value={row.lesson?.title || row.title} onChange={event => change(row.file.id, { title: event.target.value })} /></label>
        {row.replacing && <label className="online-batch-replace"><input type="checkbox" disabled={busy} checked={row.replaceExisting} onChange={event => change(row.file.id, { replaceExisting: event.target.checked })} />Thay liên kết Online của bài này bằng file đã chọn</label>}
      </section>)}</div>
      <label className="onedrive-sharing-confirm"><input type="checkbox" disabled={busy} checked={confirmEmbed} onChange={event => setConfirmEmbed(event.target.checked)} /><span>Tôi xác nhận tạo liên kết Embed cho {rows.length} file đã chọn. Người có liên kết có thể xem bài mà không đăng nhập. Quyền chia sẻ hiện tại được giữ lại.</span></label>
      <p className="linked-ppt-help">Bài mới dùng thời lượng 35 phút, chủ đề Chung. Nếu có lỗi, đợt nhập chưa lưu bài nào; link đã tạo trên OneDrive có thể vẫn tồn tại.</p>
      {invalid && <p role="alert" className="linked-ppt-error">Kiểm tra tên bài, bài bị chọn trùng và xác nhận thay link trước khi nhập.</p>}
      <footer className="linked-ppt-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => setPhase('folders')}><ArrowLeft size={16} />Chọn lại file</button><button className="btn btn-primary" disabled={busy || invalid || !confirmEmbed || !rows.length}>{busy ? 'Đang chuẩn bị…' : `Tạo link và nhập ${rows.length} bài`}</button></footer>
    </form>}
    {phase === 'import' && job && <section className="onedrive-import-status" aria-live="polite"><Cloud size={32} /><h3>{running ? 'Đang tạo liên kết và nhập bài…' : job.state === 'cancelled' ? 'Đã dừng đợt nhập' : 'Đợt nhập chưa hoàn tất'}</h3><progress max={job.total} value={job.completed} aria-label="Tiến độ xử lý file" /><p>{job.completed}/{job.total} file đã xử lý</p>{job.error && <p className="linked-ppt-error">{job.error}</p>}<ul>{job.errors?.map(item => <li key={item.fileId}><strong>{item.name}</strong>: {item.error}</li>)}</ul><p className="linked-ppt-help">Link đã tạo trên OneDrive có thể vẫn tồn tại nếu đợt nhập bị dừng hoặc lỗi.</p>{running ? <button type="button" className="btn btn-outline" disabled={busy || job.cancelled} onClick={cancelImport}>{job.cancelled ? 'Đang dừng…' : 'Dừng đợt nhập'}</button> : <button type="button" className="btn btn-outline" disabled={busy} onClick={() => { setConfirmEmbed(false); setJob(null); if (folder) setPhase('review'); else setPhase('connect'); }}>Quay lại để chỉnh</button>}</section>}
    {busy && <p className="onedrive-loading" role="status"><Loader2 size={16} className="animate-spin" />Đang xử lý…</p>}
    {error && <p role="alert" className="linked-ppt-error">{error}</p>}
  </dialog>;
}
