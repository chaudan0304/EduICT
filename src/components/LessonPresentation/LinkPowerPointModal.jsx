import React, { useEffect, useRef, useState } from 'react';
import { FileSliders, FolderOpen, X } from 'lucide-react';
import FileDialogService from '../../services/FileDialogService';
import { saveLinkedPowerPoint } from '../../services/LinkedPowerPointService';
import { getTopicsByGrade } from '../../data/ppctMapping';

export default function LinkPowerPointModal({ isOpen, onClose, onImportSuccess, defaultGrade = 3, lesson = null }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setForm({ title: lesson?.title || '', grade: lesson?.grade || defaultGrade, topic: lesson?.topic || 'Chung', duration_minutes: lesson?.duration_minutes || 35, teacher_notes: lesson?.teacher_notes || '', source_file_path: lesson?.source_file_path || '', source_file_size: lesson?.source_file_size || 0 });
    setError('');
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [isOpen, lesson, defaultGrade]);
  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  async function chooseFile() {
    setBusy(true); setError('');
    try {
      const file = await FileDialogService.selectPresentationFile();
      if (file) setForm(prev => ({ ...prev, source_file_path: file.path, source_file_size: file.size, title: prev.title || file.name.replace(/\.pptx?$/i, '') }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      if (!form.source_file_path) throw new Error('Hãy chọn file PowerPoint trước khi lưu.');
      const result = await saveLinkedPowerPoint(form, lesson?.id);
      onImportSuccess(result); onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (!isOpen) return null;
  const topics = getTopicsByGrade(Number(form.grade));
  return <dialog ref={dialogRef} className="linked-ppt-dialog" aria-labelledby="link-ppt-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={save}>
      <header className="linked-ppt-heading"><div><span className="linked-ppt-eyebrow">POWERPOINT TRÊN MÁY</span><h2 id="link-ppt-title">{lesson ? 'Thông tin & liên kết file' : 'Liên kết PowerPoint'}</h2></div><button type="button" className="btn btn-ghost" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><X size={20} /></button></header>
      <div className="linked-ppt-source"><FileSliders size={32} /><strong>Giữ bài giảng ở nơi bạn đã lưu</strong><p>EduICT lưu đường dẫn. Hiệu ứng, chuyển cảnh và media được phát bằng PowerPoint Desktop.</p><button type="button" className="btn btn-outline" disabled={busy} onClick={chooseFile}><FolderOpen size={17} />{form.source_file_path ? 'Chọn lại file' : 'Chọn file trên máy'}</button>{form.source_file_path && <div className="linked-ppt-path" title={form.source_file_path}>{form.source_file_path}</div>}</div>
      <label className="linked-ppt-field">Tên bài<input required maxLength={250} value={form.title || ''} onChange={e => change('title', e.target.value)} /></label>
      <div className="linked-ppt-fields"><label className="linked-ppt-field">Khối<select value={form.grade || 3} onChange={e => setForm(prev => ({ ...prev, grade: Number(e.target.value), topic: 'Chung' }))}>{[1, 2, 3, 4, 5].map(grade => <option key={grade} value={grade}>Khối {grade}</option>)}</select></label><label className="linked-ppt-field">Thời lượng (phút)<input type="number" min={1} max={240} required value={form.duration_minutes || ''} onChange={e => change('duration_minutes', Number(e.target.value))} /></label></div>
      <label className="linked-ppt-field">Chủ đề<select value={form.topic || 'Chung'} onChange={e => change('topic', e.target.value)}><option value="Chung">Chung</option>{!topics.some(t => t.id === form.topic) && form.topic !== 'Chung' && <option value={form.topic}>{form.topic}</option>}{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name || topic.title || topic.id}</option>)}</select></label>
      <label className="linked-ppt-field">Ghi chú dạy học<textarea rows={3} maxLength={10000} value={form.teacher_notes || ''} onChange={e => change('teacher_notes', e.target.value)} /></label>
      <p className="linked-ppt-help">Không sao chép file hoặc tạo ảnh slide. Bản sao lưu EduICT chỉ chứa liên kết; khi chuyển máy, hãy mang file gốc theo.</p>
      {error && <p role="alert" className="linked-ppt-error">{error}</p>}
      <footer className="linked-ppt-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={busy || !form.source_file_path}>{busy ? 'Đang xử lý…' : 'Lưu liên kết'}</button></footer>
    </form>
  </dialog>;
}
