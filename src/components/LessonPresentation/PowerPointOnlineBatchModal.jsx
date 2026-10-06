import React, { useEffect, useRef, useState } from 'react';
import { Cloud, ExternalLink, FileText, ListPlus, Trash2, X } from 'lucide-react';
import { normalizePowerPointEmbed } from '../../../shared/powerPointOnline.js';
import { MAX_ONLINE_BATCH_TEXT, parsePowerPointOnlineBatch } from '../../../shared/powerPointOnlineBatch.js';
import { fetchPowerPointOnlineCandidates, savePowerPointOnlineBatch } from '../../services/PowerPointOnlineService';
import './PowerPointOnline.css';

function reviewRows(rows, lessons) {
  const ids = new Set();
  const urls = new Set();
  return rows.map(row => {
    const lesson = lessons.find(item => item.id === row.lessonId);
    let error = '';
    let url = '';
    try { url = normalizePowerPointEmbed(row.embed); }
    catch (err) { error = err.message; }
    if (url && urls.has(url)) error = 'Liên kết trùng với dòng phía trên.';
    if (url) urls.add(url);
    if (row.lessonId && !lesson) error = 'Bài đã chọn không còn trong danh sách.';
    if (row.lessonId && ids.has(row.lessonId)) error = 'Bài này đã được chọn ở dòng phía trên.';
    if (row.lessonId) ids.add(row.lessonId);
    if (!row.lessonId && (!row.title.trim() || row.title.trim().length > 250)) error = 'Nhập tên cho bài mới hoặc chọn một bài đã có.';
    const replacing = Boolean(lesson?.online_embed_url && lesson.online_embed_url !== url);
    if (replacing && !row.replaceExisting && !error) error = 'Cần xác nhận thay liên kết hiện tại.';
    return { ...row, lesson, url, error, replacing };
  });
}

export default function PowerPointOnlineBatchModal({ defaultGrade = 3, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [grade, setGrade] = useState(Number(defaultGrade));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reviewed = reviewRows(rows, lessons);
  const invalid = reviewed.filter(row => row.error).length;
  const newCount = reviewed.filter(row => !row.lessonId).length;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    let cancelled = false;
    fetchPowerPointOnlineCandidates().then(result => {
      if (!cancelled) setLessons(result);
    }).catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; dialog.close(); };
  }, []);

  async function refreshLessons() {
    setLoading(true); setError('');
    try {
      setLessons(await fetchPowerPointOnlineCandidates());
      setRows(prev => prev.map(row => ({ ...row, replaceExisting: false })));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function preview(event) {
    event.preventDefault(); setError('');
    try {
      setRows(parsePowerPointOnlineBatch(text).map(entry => ({
        key: crypto.randomUUID(), title: entry.title, embed: entry.embed,
        line: entry.line, grade, lessonId: '', replaceExisting: false,
      })));
    } catch (err) { setError(err.message); }
  }

  async function readTextFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (file.size > MAX_ONLINE_BATCH_TEXT) { setError('File TXT quá lớn. Hãy chia danh sách thành các đợt tối đa 200 bài.'); return; }
    setBusy(true);
    try { setText((await file.text()).replace(/^\uFEFF/, '')); }
    catch { setError('Không thể đọc file TXT. Hãy dán danh sách trực tiếp.'); }
    finally { setBusy(false); }
  }

  function changeRow(key, changes) {
    setError('');
    setRows(prev => prev.map(row => row.key === key ? { ...row, ...changes } : row));
  }

  async function save(event) {
    event.preventDefault();
    if (!reviewed.length || invalid || loading || busy) return;
    setBusy(true); setError('');
    try {
      const items = reviewed.map(row => row.lessonId ? {
        lesson_id: row.lessonId, online_embed_url: row.url,
        expected_url: row.lesson.online_embed_url || '', expected_updated_at: row.lesson.updated_at || '',
        replace_existing: row.replaceExisting,
      } : { new_id: row.key, title: row.title.trim(), grade: row.grade, online_embed_url: row.url });
      const result = await savePowerPointOnlineBatch(items);
      onSaved(result); onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialogRef} className="linked-ppt-dialog online-ppt-batch-dialog" aria-labelledby="online-batch-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="linked-ppt-heading">
      <div><span className="linked-ppt-eyebrow">POWERPOINT ONLINE</span><h2 id="online-batch-title">Gắn nhiều bài cùng lúc</h2></div>
      <button type="button" className="btn btn-ghost" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><X size={20} /></button>
    </header>
    {!rows.length ? <form onSubmit={preview}>
      <section className="linked-ppt-source online-ppt-source" aria-label="Hướng dẫn gắn hàng loạt">
        <Cloud size={28} /><strong>Tải nhiều file lên OneDrive, gắn liên kết vào EduICT</strong>
        <ol><li>Trên OneDrive, chọn tải nhiều file hoặc cả thư mục.</li><li>Mở từng bài bằng PowerPoint Online → File → Share → Embed → Copy.</li><li>Dán mỗi mã Embed vào một dòng. Chọn bài tương ứng ở bước tiếp theo.</li></ol>
        <a className="btn btn-outline btn-sm" href="https://onedrive.live.com/" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Mở OneDrive</a>
        <p>Cần mã Embed riêng cho từng bài. EduICT chỉ lưu liên kết; file vẫn nằm trên Microsoft. Cần Internet và quyền xem bài.</p>
      </section>
      <label className="linked-ppt-field">Danh sách mã Embed hoặc URL nhúng
        <textarea required autoFocus rows={8} maxLength={MAX_ONLINE_BATCH_TEXT} spellCheck={false} value={text} onChange={event => setText(event.target.value)} placeholder={'Bài 1: Làm quen với máy tính | <iframe src="…"></iframe>\nBài 2: Thông tin quanh em | <iframe src="…"></iframe>'} />
        <span className="linked-ppt-help">Tối đa 200 bài mỗi đợt. Có thể viết “Tên bài | Mã Embed” để điền sẵn tên. Mã iframe xuống nhiều dòng vẫn được hỗ trợ.</span>
      </label>
      <div className="online-batch-input-options">
        <label className="linked-ppt-field">Khối mặc định<select value={grade} onChange={event => setGrade(Number(event.target.value))}>{[1, 2, 3, 4, 5].map(item => <option key={item} value={item}>Khối {item}</option>)}</select></label>
        <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={readTextFile} />
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => fileRef.current.click()}><FileText size={17} />Nhập file TXT</button>
      </div>
      {error && <p role="alert" className="linked-ppt-error">{error}</p>}
      <footer className="linked-ppt-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={busy || !text.trim()}><ListPlus size={17} />Xem danh sách</button></footer>
    </form> : <form onSubmit={save}>
      <div className="online-batch-summary" role="status"><strong>{rows.length} liên kết</strong><span>{newCount} bài mới · {rows.length - newCount} bài đã có</span><span>{invalid ? `${invalid} dòng cần sửa` : 'Danh sách hợp lệ'}</span></div>
      <p className="linked-ppt-help">Chọn bài đã có để giữ lịch dạy và ghi chú. Bài mới dùng thời lượng 35 phút, chủ đề Chung; có thể chỉnh sau khi lưu.</p>
      <div className="online-batch-list">
        {reviewed.map((row, index) => <section key={row.key} className={`online-batch-row${row.error ? ' has-error' : ''}`} aria-label={`Liên kết ${index + 1}`}>
          <header><strong>{index + 1}. {row.lesson?.title || row.title || 'Chưa đặt tên bài'}</strong><button type="button" className="btn btn-ghost btn-sm" disabled={busy} aria-label={`Bỏ liên kết ${index + 1}`} onClick={() => setRows(prev => prev.filter(item => item.key !== row.key))}><Trash2 size={16} /></button></header>
          <div className="online-batch-row-fields">
            <label className="linked-ppt-field">Khối<select disabled={busy} value={row.grade} onChange={event => changeRow(row.key, { grade: Number(event.target.value), lessonId: '', replaceExisting: false })}>{[1, 2, 3, 4, 5].map(item => <option key={item} value={item}>Khối {item}</option>)}</select></label>
            <label className="linked-ppt-field">Gắn vào bài<select disabled={busy || loading} value={row.lessonId} onChange={event => changeRow(row.key, { lessonId: event.target.value, replaceExisting: false })}><option value="">Tạo bài Online mới</option>{lessons.filter(item => Number(item.grade) === row.grade).map(item => <option key={item.id} value={item.id}>{item.title}{item.online_embed_url ? ' · đã có Online' : ''}</option>)}</select></label>
          </div>
          {!row.lessonId && <label className="linked-ppt-field">Tên bài mới<input required maxLength={250} disabled={busy} value={row.title} onChange={event => changeRow(row.key, { title: event.target.value })} /></label>}
          <label className="linked-ppt-field">Mã Embed hoặc URL nhúng<textarea rows={2} maxLength={12000} spellCheck={false} disabled={busy} value={row.embed} onChange={event => changeRow(row.key, { embed: event.target.value, replaceExisting: false })} /></label>
          {row.replacing && <label className="online-batch-replace"><input type="checkbox" disabled={busy} checked={row.replaceExisting} onChange={event => changeRow(row.key, { replaceExisting: event.target.checked })} />Thay liên kết Online đang có của bài này</label>}
          {row.error && <p className="linked-ppt-error">{row.error}</p>}
        </section>)}
      </div>
      {error && <p role="alert" className="linked-ppt-error">{error}</p>}
      <footer className="linked-ppt-actions online-batch-actions">
        <button type="button" className="btn btn-ghost" disabled={busy || loading} onClick={refreshLessons}>{loading ? 'Đang tải bài…' : 'Tải lại danh sách bài'}</button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => { setRows([]); setError(''); }}>Sửa danh sách đầu vào</button>
        <button className="btn btn-primary" disabled={busy || loading || invalid > 0}>{busy ? 'Đang lưu…' : `Lưu ${rows.length} liên kết`}</button>
      </footer>
    </form>}
  </dialog>;
}
