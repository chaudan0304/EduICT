import React, { useEffect, useRef, useState } from 'react';
import { Cloud, ExternalLink, Download, X } from 'lucide-react';
import { savePowerPointOnline } from '../../services/PowerPointOnlineService';
import { getTopicsByGrade } from '../../data/ppctMapping';
import './PowerPointOnline.css';

export default function PowerPointOnlineModal({ isOpen, lesson = null, defaultGrade = 3, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setForm({ title: lesson?.title || '', grade: lesson?.grade || defaultGrade, topic: lesson?.topic || 'Chung', duration_minutes: lesson?.duration_minutes || 35, teacher_notes: lesson?.teacher_notes || '', online_embed_url: lesson?.online_embed_url || '' });
    setError('');
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [isOpen, lesson, defaultGrade]);
  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  async function save(event, remove = false) {
    event?.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await savePowerPointOnline({ ...form, online_embed_url: remove ? '' : form.online_embed_url }, lesson?.id);
      onSaved(result); onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (!isOpen) return null;
  const topics = getTopicsByGrade(Number(form.grade));
  const downloadable = lesson?.source_file_path?.startsWith('/uploads/presentations/');
  return <dialog ref={dialogRef} className="linked-ppt-dialog online-ppt-dialog" aria-labelledby="online-ppt-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={save}>
      <header className="linked-ppt-heading"><div><span className="linked-ppt-eyebrow">POWERPOINT ONLINE</span><h2 id="online-ppt-title">{lesson ? 'Liên kết Online cho bài này' : 'Thêm PowerPoint Online'}</h2></div><button type="button" className="btn btn-ghost" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><X size={20} /></button></header>
      <section className="linked-ppt-source online-ppt-source" aria-label="Hướng dẫn liên kết">
        <Cloud size={30} /><strong>Hiệu ứng trong khung EduICT</strong>
        <ol><li>Tải file PowerPoint lên OneDrive của bạn.</li><li>Mở bài bằng PowerPoint Online → File → Share (Chia sẻ) → Embed (Nhúng) → Copy.</li><li>Dán toàn bộ mã vừa sao chép vào ô bên dưới.</li></ol>
        <div className="online-ppt-links"><a className="btn btn-outline btn-sm" href="https://onedrive.live.com/" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Mở OneDrive</a>{downloadable && <a className="btn btn-outline btn-sm" href={lesson.source_file_path} download={`${lesson.title}.pptx`}><Download size={15} />Tải file gốc</a>}</div>
        <p>Cần Internet. Quyền xem bài do Microsoft quản lý; kiểm tra quyền chia sẻ vì mã Embed có thể cho phép người có liên kết xem bài.</p>
      </section>
      <label className="linked-ppt-field">Mã Embed hoặc URL nhúng<textarea autoFocus required rows={3} maxLength={12000} spellCheck={false} value={form.online_embed_url || ''} onChange={e => change('online_embed_url', e.target.value)} placeholder={'<iframe src="https://onedrive.live.com/embed?..." ...></iframe>'} /><span className="linked-ppt-help">Dùng mã Nhúng của Microsoft. Link “Chia sẻ” thông thường không phải link nhúng.</span></label>
      <label className="linked-ppt-field">Tên bài<input required maxLength={250} value={form.title || ''} onChange={e => change('title', e.target.value)} /></label>
      <div className="linked-ppt-fields"><label className="linked-ppt-field">Khối<select value={form.grade || 3} onChange={e => setForm(prev => ({ ...prev, grade: Number(e.target.value), topic: 'Chung' }))}>{[1, 2, 3, 4, 5].map(grade => <option key={grade} value={grade}>Khối {grade}</option>)}</select></label><label className="linked-ppt-field">Thời lượng (phút)<input type="number" min={1} max={240} required value={form.duration_minutes || ''} onChange={e => change('duration_minutes', Number(e.target.value))} /></label></div>
      <label className="linked-ppt-field">Chủ đề<select value={form.topic || 'Chung'} onChange={e => change('topic', e.target.value)}><option value="Chung">Chung</option>{form.topic !== 'Chung' && !topics.some(t => t.id === form.topic) && <option value={form.topic}>{form.topic}</option>}{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name || topic.title || topic.id}</option>)}</select></label>
      <label className="linked-ppt-field">Ghi chú dạy học<textarea rows={2} maxLength={10000} value={form.teacher_notes || ''} onChange={e => change('teacher_notes', e.target.value)} /></label>
      <p className="linked-ppt-help">EduICT chỉ lưu liên kết và thông tin bài. Hiệu ứng phát theo khả năng PowerPoint Online; trigger bấm vào đối tượng chưa được Microsoft hỗ trợ trên web.</p>
      {error && <p role="alert" className="linked-ppt-error">{error}</p>}
      <footer className="linked-ppt-actions">{lesson?.online_embed_url && lesson.type !== 'powerpoint_online' && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(null, true)}>Gỡ liên kết Online</button>}<button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={busy || !form.online_embed_url?.trim()}>{busy ? 'Đang lưu…' : 'Lưu liên kết'}</button></footer>
    </form>
  </dialog>;
}
