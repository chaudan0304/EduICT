import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Monitor, Presentation, Square, Timer, Star, CircleDot, GripHorizontal, ChevronsDown, ChevronsUp } from 'lucide-react';
import PresentationService from '../../services/PresentationService';
import { getNativeAdapter } from '../../services/DesktopCapabilityService';
import { presentationWindowAction } from '../../services/PresentationWindowService';
import './PowerPointToolbar.css';

export default function PowerPointToolbar() {
  const available = Boolean(getNativeAdapter()?.presentationWindow);
  const [compact, setCompact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!available) return;
    let canceled = false;
    let timer;
    async function poll() {
      try {
        const result = await PresentationService.getPresentationStatus();
        if (!canceled && result?.ok !== false) setStatus(result);
      } catch {
        // A temporary COM/IPC failure must not stop subsequent status updates.
      } finally {
        if (!canceled) timer = setTimeout(poll, 4000);
      }
    }
    poll();
    return () => { canceled = true; clearTimeout(timer); };
  }, [available]);

  async function perform(operation) {
    setBusy(true); setError('');
    try {
      const result = await operation();
      if (result?.ok === false) throw new Error(result.message || 'PowerPoint đang bận. Hãy thử lại.');
      if (result?.currentSlide) setStatus(old => ({ ...old, currentSlide: result.currentSlide }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const action = (name, tab) => () => presentationWindowAction(name, tab);
  return <main className={`ppt-toolbar${compact ? ' is-compact' : ''}`} aria-label="Công cụ EduICT trên PowerPoint">
    <header className="ppt-toolbar-drag">
      <GripHorizontal size={16} aria-hidden="true" />
      <strong>EduICT</strong>
      <span className="ppt-toolbar-title" title={status?.name}>{status?.name || 'Công cụ trình chiếu'}</span>
      <button aria-label={compact ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'} disabled={busy || !available} onClick={() => perform(async () => {
        const result = await presentationWindowAction(compact ? 'expand' : 'compact');
        if (result?.ok) setCompact(!compact);
        return result;
      })}>{compact ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}</button>
    </header>
    {!compact && <div className="ppt-toolbar-body">
      <div className="ppt-toolbar-row">
        <button disabled={busy || !available} onClick={() => perform(PresentationService.previousSlide)} title="Bước trước"><ChevronLeft size={18} /><span>Trước</span></button>
        <span className="ppt-toolbar-position" aria-live="polite">{status?.currentSlide || '—'} / {status?.slideCount || '—'}</span>
        <button disabled={busy || !available} onClick={() => perform(PresentationService.nextSlide)} title="Chạy hiệu ứng hoặc slide tiếp theo"><span>Tiếp</span><ChevronRight size={18} /></button>
        <button className="ppt-toolbar-primary" disabled={busy || !available} onClick={() => perform(action('tools'))}><Monitor size={17} />Hiện EduICT</button>
        <button disabled={busy || !available} onClick={() => perform(action('slides'))}><Presentation size={17} />Về slide</button>
      </div>
      <div className="ppt-toolbar-row ppt-toolbar-shortcuts">
        <button disabled={busy || !available} onClick={() => perform(action('tools', 'timer'))}><Timer size={17} />Đếm giờ</button>
        <button disabled={busy || !available} onClick={() => perform(action('tools', 'goodscores'))}><Star size={17} />Điểm tốt</button>
        <button disabled={busy || !available} onClick={() => perform(action('tools', 'luckywheel'))}><CircleDot size={17} />Vòng quay</button>
        <button className="ppt-toolbar-stop" disabled={busy || !available} onClick={() => perform(action('stop'))}><Square size={14} />Dừng</button>
      </div>
      <p className={error ? 'ppt-toolbar-error' : 'ppt-toolbar-hint'} role={error ? 'alert' : undefined}>{error || (!available ? 'Mở bằng EduICT Desktop để dùng thanh công cụ nổi.' : busy ? 'Đang xử lý…' : 'Kéo thanh trên cùng để di chuyển · Bấm Về slide sau khi dùng công cụ')}</p>
    </div>}
  </main>;
}
