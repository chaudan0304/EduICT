import { useEffect, useRef, useState } from 'react';
import { FolderOpen, X } from 'lucide-react';
import { getNativeAdapter } from '../../services/DesktopCapabilityService';
import { repairLinkedFiles } from '../../services/LinkedPowerPointService';
import './RelinkPowerPoint.css';

const fileName = lesson => lesson.source_file_name || lesson.source_filename || (lesson.source_file_path || '').split(/[\\/]/).pop();

export default function RelinkPowerPointModal({ lessons, onClose, onSaved }) {
  const dialog = useRef(null);
  const [scan, setScan] = useState(null);
  const [choices, setChoices] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const native = getNativeAdapter();
  useEffect(() => { const element = dialog.current; const opener = document.activeElement; element.showModal(); return () => { element.close(); opener?.focus(); }; }, []);
  const selected = lessons.flatMap(lesson => choices[lesson.id] && choices[lesson.id] !== lesson.source_file_path ? [{ lessonId: lesson.id, expectedPath: lesson.source_file_path, path: choices[lesson.id] }] : []);
  async function chooseFolder() {
    setBusy(true); setError(''); setScan(null); setChoices({});
    try {
      const result = await native.selectPresentationFolder({ names: [...new Set(lessons.map(fileName))] });
      if (result.canceled) return;
      setScan(result);
      setChoices(Object.fromEntries(lessons.map(lesson => {
        const matches = result.files.filter(file => file.name.toLowerCase() === fileName(lesson).toLowerCase());
        return [lesson.id, matches.length === 1 ? matches[0].path : ''];
      })));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function save() {
    if (busy || !scan || !selected.length) return;
    setBusy(true); setError('');
    try {
      await native.approvePresentationFiles({ scanId: scan.scanId, paths: [...new Set(selected.map(item => item.path))] });
      setScan(null);
      const result = await repairLinkedFiles(selected);
      onSaved(result); onClose();
    } catch (err) { setError(`${err.message} Hãy kiểm tra lại thư viện trước khi chọn lại thư mục.`); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="linked-ppt-dialog relink-dialog" aria-labelledby="relink-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <header className="linked-ppt-heading"><div><span className="linked-ppt-eyebrow">SỬA ĐƯỜNG DẪN · FILE TRÊN MÁY</span><h2 id="relink-title">Tìm lại PowerPoint</h2></div><button type="button" className="btn btn-ghost" aria-label="Đóng sửa liên kết" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    <p>Chọn thư mục chứa bài giảng đã chuyển vị trí. EduICT tìm theo tên file; bạn xem và xác nhận từng liên kết trước khi lưu.</p>
    <button type="button" className="btn btn-primary" disabled={busy || !native?.selectPresentationFolder || !lessons.length || lessons.length > 200} onClick={chooseFolder}><FolderOpen size={17} />Chọn thư mục mới</button>
    {!native?.selectPresentationFolder && <p className="linked-ppt-help">Mở EduICT Desktop phiên bản mới để chọn thư mục trên máy. Trên web, bạn vẫn xem được trạng thái các liên kết.</p>}
    {lessons.length > 200 && <p className="linked-ppt-help">Lọc thư viện xuống tối đa 200 bài trước khi sửa theo thư mục.</p>}
    {scan && <><p role="status">Tìm thấy {scan.files.length} file phù hợp. {scan.truncated ? 'Đã chạm giới hạn quét; hãy chọn thư mục nhỏ hơn nếu còn thiếu bài.' : 'Nếu có nhiều file cùng tên, hãy chọn đúng đường dẫn.'}</p>
      <div className="relink-rows">{lessons.map(lesson => {
        const matches = scan.files.filter(file => file.name.toLowerCase() === fileName(lesson).toLowerCase());
        return <label key={lesson.id} className="relink-row"><strong>{lesson.title}</strong><small title={lesson.source_file_path}>Cũ: {lesson.source_file_path}</small>
          <select aria-label={`File mới: ${lesson.title}`} disabled={busy || !matches.length} value={choices[lesson.id] || ''} onChange={e => setChoices(prev => ({ ...prev, [lesson.id]: e.target.value }))}>
            <option value="">{matches.length ? 'Giữ liên kết hiện tại' : 'Không tìm thấy file cùng tên'}</option>{matches.map(file => <option key={file.path} value={file.path}>{file.path}</option>)}
          </select></label>;
      })}</div></>}
    <p className="linked-ppt-help">File đã đổi tên: dùng nút “Chọn lại file” ở từng bài. Thao tác này chỉ sửa đường dẫn, không chép hoặc sửa nội dung PowerPoint.</p>
    {error && <p role="alert" className="linked-ppt-error">{error}</p>}
    <footer className="linked-ppt-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Hủy</button><button type="button" className="btn btn-primary" disabled={busy || !scan || !selected.length} onClick={save}>{busy ? 'Đang xử lý…' : `Xác nhận sửa ${selected.length} liên kết`}</button></footer>
  </dialog>;
}
