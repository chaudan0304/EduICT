import React, { useEffect, useState } from 'react';
import { FileSliders, Play, ChevronLeft, ChevronRight, X, Square, FolderOpen } from 'lucide-react';
import PresentationService from '../../services/PresentationService';
import { getCapabilities } from '../../services/DesktopCapabilityService';
import LinkPowerPointModal from './LinkPowerPointModal';
import { presentationWindowAction } from '../../services/PresentationWindowService';

const messages = {
  PRESENTATION_NOT_FOUND: 'Không tìm thấy file. File có thể đã được đổi tên, di chuyển hoặc ổ đĩa chưa kết nối. Hãy chọn lại file.',
  INVALID_PRESENTATION_PATH: 'Liên kết cần được cấp quyền trên máy này. Hãy chọn lại file bằng hộp thoại Desktop.',
  DESKTOP_BRIDGE_UNAVAILABLE: 'Hãy dùng EduICT Desktop trên Windows có Microsoft PowerPoint để trình chiếu file trên máy.',
  POWERPOINT_NOT_INSTALLED: 'Máy chưa cài Microsoft PowerPoint.',
  POWERPOINT_NOT_RUNNING: 'Bài PowerPoint đã đóng. Hãy mở trình chiếu lại.',
};

export default function LinkedPowerPointPresentation({ lesson, onClose }) {
  const [current, setCurrent] = useState(lesson);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState(false);
  async function perform(operation) {
    setBusy(true); setError('');
    try {
      const result = await operation();
      if (result?.ok === false) throw new Error(messages[result.code] || result.message || 'PowerPoint chưa sẵn sàng. Hãy thử mở lại bài.');
      const info = await PresentationService.getActivePresentation();
      setActive(info?.ok === false ? null : info);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function start() {
    await perform(async () => {
      const caps = await getCapabilities();
      if (caps.isDesktop && caps.platform === 'windows' && !caps.canOpenPowerPoint) return { ok: false, code: 'POWERPOINT_NOT_INSTALLED' };
      const result = await PresentationService.openPresentation(current.source_file_path);
      if (!result?.ok) return result;
      setOpened(true);
      return PresentationService.showPresentation();
    });
  }
  useEffect(() => {
    if (!opened) return;
    let canceled = false;
    const timer = setInterval(async () => {
      const info = await PresentationService.getActivePresentation().catch(() => null);
      if (!canceled) { setActive(info?.ok === false ? null : info); if (!info || info.ok === false) setOpened(false); }
    }, 6000);
    return () => { canceled = true; clearInterval(timer); };
  }, [opened]);
  return <aside className="linked-ppt-companion" aria-label="Điều khiển PowerPoint">
    <header className="linked-ppt-heading"><div><span className="linked-ppt-eyebrow">BẢNG ĐIỀU KHIỂN</span><h2>PowerPoint gốc</h2></div><button className="btn btn-ghost" aria-label="Ẩn bảng điều khiển" onClick={onClose} disabled={busy}><X size={20} /></button></header>
    <div className="linked-ppt-source"><FileSliders size={36} /><h3>{current.title}</h3><p>Khối {current.grade} · {current.duration_minutes || 35} phút</p><div className="linked-ppt-path">{current.source_file_path}</div></div>
    <button className="btn btn-primary" disabled={busy} onClick={start}><Play size={18} />{busy ? 'Đang xử lý…' : 'Trình chiếu PowerPoint'}</button>
    <p className="linked-ppt-help">PowerPoint phát hiệu ứng từ file gốc. Thanh EduICT nổi trên slide: bấm “Hiện EduICT” để dùng công cụ, rồi “Về slide” để tiếp tục chiếu.</p>
    <button className="btn btn-outline" disabled={busy || !opened} onClick={() => perform(() => presentationWindowAction('show'))}>Hiện lại thanh công cụ nổi</button>
    <div className="linked-ppt-controls"><button className="btn btn-outline" disabled={busy || !opened} onClick={() => perform(PresentationService.previousSlide)}><ChevronLeft size={18} />Trước</button><span aria-live="polite">{active ? `${active.currentSlide || '—'} / ${active.slideCount}` : 'Chưa mở bài'}</span><button className="btn btn-outline" disabled={busy || !opened} onClick={() => perform(PresentationService.nextSlide)}>Tiếp<ChevronRight size={18} /></button></div>
    <p className="linked-ppt-help">“Tiếp” chạy bước tiếp theo của slideshow, bao gồm hiệu ứng. Các trigger tương tác được bấm trực tiếp trong PowerPoint.</p>
    {current.teacher_notes && <div className="linked-ppt-notes"><strong>Ghi chú dạy học</strong><p>{current.teacher_notes}</p></div>}
    {error && <p role="alert" className="linked-ppt-error">{error}</p>}
    <button className="btn btn-outline" disabled={busy || opened} onClick={() => setEditing(true)}><FolderOpen size={17} />Chọn lại file / sửa thông tin</button>
    <button className="btn btn-outline" disabled={busy || !opened} onClick={() => perform(async () => {
      const exit = await PresentationService.exitSlideShow();
      if (exit?.ok === false) return exit;
      const close = await PresentationService.closePresentation();
      if (close?.ok !== false) { setOpened(false); setActive(null); }
      return close;
    })}><Square size={16} />Dừng trình chiếu</button>
    <p className="linked-ppt-help">Ẩn bảng điều khiển để dùng công cụ khác. Dừng trình chiếu chỉ đóng bài do EduICT mở; bài đã mở sẵn trong PowerPoint được giữ lại.</p>
    <LinkPowerPointModal isOpen={editing} lesson={current} onClose={() => setEditing(false)} onImportSuccess={saved => { setCurrent(saved); setError(''); }} />
  </aside>;
}
