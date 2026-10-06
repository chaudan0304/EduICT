import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { FileSliders, Play, Loader2, AlertCircle } from 'lucide-react';
import { hasNativePresentationHost, nativePresentationAction } from '../../services/NativePresentationService';
import PresentationService from '../../services/PresentationService';
import './NativePowerPointSurface.css';

const NativePowerPointSurface = forwardRef(function NativePowerPointSurface({ filePath, visible = true, initialSlideIndex = 0, onStatusChange }, ref) {
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const hiddenRef = useRef(false);
  const lastLayoutRef = useRef('');
  const [status, setStatus] = useState({ active: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const available = hasNativePresentationHost();

  function bounds() {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : null;
  }
  function overlays() {
    const root = canvasRef.current?.closest('.presentation-native');
    return Array.from(root?.querySelectorAll('[data-native-overlay]') || []).slice(0, 12).flatMap(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width < 1 || rect.height < 1 || style.display === 'none' || style.visibility === 'hidden') return [];
      const radius = Math.min(parseFloat(style.borderTopLeftRadius) || 0, rect.width / 2, rect.height / 2);
      return [{ x: rect.left, y: rect.top, width: rect.width, height: rect.height, radius }];
    });
  }
  async function layout(show = visible && !hiddenRef.current) {
    const id = sessionRef.current;
    const rect = bounds();
    if (!id || !rect || rect.width < 1 || rect.height < 1) return;
    const payload = { sessionId: id, bounds: rect, overlays: overlays(), visible: show };
    const signature = JSON.stringify(payload);
    if (signature === lastLayoutRef.current) return { ok: true };
    const result = await nativePresentationAction('layout', payload);
    if (result?.ok !== false && sessionRef.current === id) lastLayoutRef.current = signature;
    if (result?.ok === false && mountedRef.current && sessionRef.current === id) setError(result.message || 'Chưa thể cập nhật khung PowerPoint.');
    return result;
  }
  async function stop() {
    const id = sessionRef.current;
    if (!id) return;
    sessionRef.current = null;
    lastLayoutRef.current = '';
    const result = await nativePresentationAction('stop', { sessionId: id });
    if (mountedRef.current) {
      setStatus({ active: false });
      if (result?.ok === false) setError(result.message || 'Không thể đóng PowerPoint.');
    }
    return result;
  }
  async function control(operation) {
    if (busyRef.current || !sessionRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await operation();
      if (result?.ok === false) throw new Error(result.message || 'PowerPoint đang bận. Hãy thử lại.');
      if (mountedRef.current && result?.currentSlide) setStatus(old => ({ ...old, currentSlide: result.currentSlide }));
    } catch (err) { if (mountedRef.current) setError(err.message); }
    finally { busyRef.current = false; if (mountedRef.current) setBusy(false); }
  }
  async function start() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await nativePresentationAction('start', { filePath, bounds: bounds(), overlays: overlays(), visible });
      if (result?.ok === false) throw new Error(result.message || 'Không thể mở PowerPoint trong khung EduICT.');
      if (!mountedRef.current) { await nativePresentationAction('stop', { sessionId: result.sessionId }); return; }
      sessionRef.current = result.sessionId;
      setStatus(result);
      if (initialSlideIndex > 0 && initialSlideIndex < result.slideCount) {
        const selected = await PresentationService.goToSlide(initialSlideIndex + 1);
        if (selected?.ok === false) throw new Error(selected.message);
        if (mountedRef.current) setStatus(old => ({ ...old, currentSlide: selected.currentSlide }));
      }
    } catch (err) { if (mountedRef.current) setError(err.message); }
    finally { busyRef.current = false; if (mountedRef.current) setBusy(false); }
  }

  useImperativeHandle(ref, () => ({
    next: () => control(PresentationService.nextSlide),
    previous: () => control(PresentationService.previousSlide),
    goTo: index => control(() => PresentationService.goToSlide(index + 1)),
    hide: async () => { hiddenRef.current = true; return layout(false); },
    stop,
  }));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const id = sessionRef.current; sessionRef.current = null;
      if (id) nativePresentationAction('stop', { sessionId: id }).catch(() => {});
    };
  }, []);
  useEffect(() => { onStatusChange?.({ ...status, busy }); }, [status, busy, onStatusChange]);
  useLayoutEffect(() => {
    hiddenRef.current = !visible;
    layout(visible).catch(() => {});
    // Visibility changes restore the same native session after closing a tool.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, status.active]);
  useEffect(() => {
    if (!status.active) return;
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => layout().catch(() => {}));
    };
    const observer = new ResizeObserver(update);
    const root = canvasRef.current?.closest('.presentation-native');
    const observeOverlays = () => {
      observer.disconnect();
      if (canvasRef.current) observer.observe(canvasRef.current);
      root?.querySelectorAll('[data-native-overlay]').forEach(element => observer.observe(element));
      update();
    };
    const mutations = new MutationObserver(observeOverlays);
    if (root) mutations.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    observeOverlays();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    document.addEventListener('fullscreenchange', update);
    update();
    return () => {
      mutations.disconnect(); observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true);
      document.removeEventListener('fullscreenchange', update);
    };
    // Layout reads current canvas bounds and visibility from this render.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [status.active, visible]);
  useEffect(() => {
    if (!status.active) return;
    let canceled = false;
    let timer;
    async function poll() {
      const id = sessionRef.current;
      if (!id) return;
      try {
        const result = await nativePresentationAction('status', { sessionId: id });
        if (canceled || sessionRef.current !== id) return;
        if (result?.ok !== false) {
          if (!result.active) sessionRef.current = null;
          setStatus(result);
        }
      } catch { /* Retry after temporary IPC failure. */ }
      finally { if (!canceled && sessionRef.current) timer = setTimeout(poll, 4000); }
    }
    timer = setTimeout(poll, 4000);
    return () => { canceled = true; clearTimeout(timer); };
  }, [status.active]);

  return <section className="native-ppt-surface" aria-label="PowerPoint gốc trong EduICT">
    {(error || busy) && <div className="native-ppt-statusbar" data-native-overlay>
      <span><FileSliders size={16} />{error ? <span role="alert" className="native-ppt-error" title={error}>{error}</span> : 'Đang kết nối PowerPoint…'}</span>
    </div>}
    <div className="native-ppt-canvas" ref={canvasRef}>
      {(!status.active || !visible) && <div className="native-ppt-placeholder">
        {busy ? <Loader2 size={44} className="animate-spin" /> : !available ? <AlertCircle size={44} /> : <FileSliders size={48} />}
        <h2>{status.active ? 'Slide đang tạm ẩn để dùng công cụ' : 'Trình chiếu ngay trong EduICT'}</h2>
        <p>{status.active ? 'Đóng công cụ để trở lại PowerPoint.' : available ? 'Các nút Thưởng sao, Vòng quay, Đua vịt và Quick Quiz vẫn dùng như bản web.' : 'Cần EduICT Desktop mới trên Windows và Microsoft PowerPoint. File trên máy chỉ được lưu dưới dạng liên kết.'}</p>
        {!status.active && <>
          <p className="native-ppt-path" title={filePath}>{filePath}</p>
          <button className="btn btn-primary" disabled={busy || !available} onClick={start}><Play size={18} />{busy ? 'Đang mở bài…' : 'Trình chiếu trong EduICT'}</button>
        </>}
      </div>}
    </div>
  </section>;
});
export default NativePowerPointSurface;
