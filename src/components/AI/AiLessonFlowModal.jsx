import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, BookOpen, CheckCircle2, Clock, Layers, Loader2, Sparkles, X } from 'lucide-react';
import { generateLessonFlowApi } from './aiService';
import LessonFlowDraftCard from './LessonFlowDraftCard';
import { formatFlowActivities, readFlowDraft, reviewFlow } from './lessonFlowDraft';
import './AiLessonFlowModal.css';
import useLocalDraft from '../../hooks/useLocalDraft';
import DraftStatus from '../DraftStatus';

function FlowDialog({ onClose, lesson, lessons, onApplyFlow, currentActivityCount }) {
  const dialog = useRef(null);
  const request = useRef(null);
  const sequence = useRef(0);
  const applyingRef = useRef(false);
  const preparedActivities = useRef(null);
  const id = useId();
  const sources = useMemo(() => {
    const unique = new Map();
    [lesson, ...lessons].filter(item => item?.id != null).forEach(item => {
      if (!unique.has(String(item.id))) unique.set(String(item.id), item);
    });
    return [...unique.values()];
  }, [lesson, lessons]);
  const [selectedLessonId, setSelectedLessonId] = useState(String(lesson?.id ?? sources[0]?.id ?? ''));
  const [duration, setDuration] = useState(35);
  const [draft, setDraft] = useState([]);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const selectedLesson = sources.find(item => String(item.id) === selectedLessonId);
  const localDraft = useLocalDraft(`ai-flow:${lesson?.id || 'picker'}`, true, { selectedLessonId, duration, draft, cached }, data => {
    if (typeof data.selectedLessonId !== 'string' || !Array.isArray(data.draft)) return;
    setSelectedLessonId(data.selectedLessonId); setDuration(Number(data.duration) || 35); setDraft(data.draft); setCached(Boolean(data.cached));
  });
  const review = reviewFlow(draft, duration);
  const locked = loading || applying;
  const discardRequest = useCallback(() => {
    sequence.current++;
    const pending = request.current;
    pending?.controller.abort(); clearTimeout(pending?.timer); request.current = null;
  }, []);

  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node.showModal();
    return () => {
      discardRequest();
      node.close();
      previous?.focus?.();
    };
  }, [discardRequest]);

  useEffect(() => {
    const nextId = String(sources[0]?.id ?? '');
    if (selectedLessonId !== nextId && !sources.some(item => String(item.id) === selectedLessonId)) {
      discardRequest();
      setLoading(false); setSelectedLessonId(nextId); setDraft([]); setError(''); setConfirmed(false);
    }
  }, [sources, selectedLessonId, discardRequest]);

  const resetReview = () => { preparedActivities.current = null; setDraft([]); setConfirmed(false); setCached(false); setError(''); };
  const stopWaiting = () => {
    discardRequest(); setLoading(false);
  };
  const generate = async event => {
    event.preventDefault();
    if (!selectedLesson || request.current || applyingRef.current) return;
    const token = ++sequence.current;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 90000);
    request.current = { controller, timer };
    setLoading(true); setConfirmed(false); setError('');
    try {
      const result = await generateLessonFlowApi({ lessonId: selectedLessonId, durationMinutes: duration, signal: controller.signal });
      if (token !== sequence.current) return;
      const nextDraft = readFlowDraft(result.data);
      preparedActivities.current = null;
      setDraft(nextDraft); setCached(Boolean(result.isCached));
    } catch (err) {
      if (token !== sequence.current) return;
      if (timedOut) setError('AI chưa phản hồi sau 90 giây. Bạn có thể thử lại hoặc đóng để chuẩn bị hoạt động thủ công.');
      else if (err.errorCode === 'AI_NOT_CONFIGURED') setError('Chưa kết nối Gemini. Đóng cửa sổ và mở Công cụ → Gemini để cấu hình, rồi thử lại.');
      else if (err.errorCode === 'AI_RATE_LIMIT') setError('Gemini đang quá tải hoặc đã hết lượt dùng. Vui lòng thử lại sau.');
      else setError(err.message || 'Không nhận được đề xuất. Kiểm tra kết nối Gemini rồi thử lại.');
    } finally {
      clearTimeout(timer);
      if (token === sequence.current) { request.current = null; setLoading(false); }
    }
  };
  const apply = async () => {
    if (applyingRef.current || !draft.length || review.errors.length || !confirmed || !onApplyFlow) return;
    applyingRef.current = true; setApplying(true); setError('');
    try {
      preparedActivities.current ||= formatFlowActivities(draft);
      await onApplyFlow(preparedActivities.current); localDraft.clear(); onClose();
    }
    catch (err) { setError(err.message || 'Chưa lưu được tiến trình. Bản chỉnh sửa vẫn được giữ để thử lại.'); }
    finally { applyingRef.current = false; setApplying(false); }
  };
  const close = () => { if (!applyingRef.current) onClose(); };

  return createPortal(<dialog ref={dialog} className="aiflow-dialog" aria-labelledby={`${id}-heading`} aria-describedby={`${id}-intro`} onCancel={event => { event.preventDefault(); close(); }}>
    <div className="aiflow-shell">
      <header className="aiflow-header"><span className="aiflow-header-icon"><Layers size={23} /></span>
        <div><span className="aiflow-eyebrow">TRỢ GIẢNG AI</span><h2 id={`${id}-heading`}>Thiết kế tiến trình tiết học</h2><p id={`${id}-intro`}>Chọn bài, nhận đề xuất và điều chỉnh theo lớp bạn đang dạy.</p></div>
        <button type="button" className="btn btn-icon aiflow-close" aria-label="Đóng đề xuất tiến trình" disabled={applying} onClick={close}><X size={21} /></button>
      </header>
      <div className="aiflow-body">
        <aside className="aiflow-setup"><DraftStatus status={localDraft.status} />
          <form onSubmit={generate}>
            <h3><BookOpen size={18} />Chuẩn bị đề xuất</h3>
            <label className="aiflow-field" htmlFor={`${id}-lesson`}>Bài học<select id={`${id}-lesson`} value={selectedLessonId} disabled={locked || !sources.length} onChange={event => { setSelectedLessonId(event.target.value); resetReview(); }}>
              {!sources.length && <option value="">Chưa có bài học</option>}
              {sources.map(item => <option key={item.id} value={String(item.id)}>Khối {item.grade || '—'} · {item.title}</option>)}
            </select></label>
            {selectedLesson && <p className="aiflow-chosen">{selectedLesson.title}</p>}
            <label className="aiflow-field" htmlFor={`${id}-duration`}>Thời lượng tiết học<select id={`${id}-duration`} value={duration} disabled={locked} onChange={event => { setDuration(Number(event.target.value)); resetReview(); }}>
              {[35, 40, 45].map(minutes => <option key={minutes} value={minutes}>{minutes} phút</option>)}
            </select></label>
            <p className="aiflow-hint">AI dùng thông tin bài học trong thư viện. Đổi bài hoặc thời lượng sẽ xóa bản đang xem; tạo lại bị lỗi vẫn giữ bản cũ.</p>
            <button type="submit" className="btn btn-primary aiflow-generate" disabled={!selectedLesson || locked}>{loading ? <Loader2 size={17} className="aiflow-spin" /> : <Sparkles size={17} />}{loading ? 'Đang tạo đề xuất…' : draft.length ? 'Tạo đề xuất khác' : 'Tạo đề xuất'}</button>
            {loading && <button type="button" className="btn btn-outline aiflow-stop" onClick={stopWaiting}>Dừng chờ kết quả</button>}
          </form>
          <div className="aiflow-guide"><h4>Gợi ý cấu trúc tiết học</h4><ol><li>Khởi động và ôn bài</li><li>Hình thành kiến thức</li><li>Luyện tập trên máy</li><li>Đố vui và củng cố</li><li>Tổng kết, tuyên dương</li></ol><p>Có thể chỉnh từng hoạt động sau khi AI đề xuất.</p></div>
        </aside>
        <section className="aiflow-review" aria-label="Xem lại tiến trình đề xuất" aria-busy={loading}>
          {error && <div className="aiflow-error" role="alert"><AlertCircle size={19} /><div><strong>{applying ? 'Chưa hoàn tất' : 'Cần kiểm tra lại'}</strong><p>{error}</p></div></div>}
          {loading ? <div className="aiflow-empty" role="status"><Loader2 size={36} className="aiflow-spin" /><h3>Đang sắp xếp các hoạt động</h3><p>AI đang xây dựng tiến trình {duration} phút cho bài đã chọn. Bạn có thể dừng chờ nếu cần.</p><div className="aiflow-skeleton" aria-hidden="true"><span /><span /><span /></div></div>
            : draft.length ? <>
              <div className="aiflow-review-heading"><div><h3>Xem lại đề xuất</h3><p>Chỉnh tên, số phút hoặc cách tổ chức trong từng hoạt động.</p></div>{cached && <span className="aiflow-badge">Đề xuất đã lưu</span>}</div>
              <div className={`aiflow-summary${review.errors.length ? ' needs-review' : ''}`}><Clock size={18} /><strong>{review.total}/{duration} phút</strong><span>{draft.length} hoạt động</span>{review.total === duration && <CheckCircle2 size={18} aria-label="Đủ thời lượng" />}</div>
              <ol className="aiflow-draft-list">{draft.map((activity, index) => <LessonFlowDraftCard key={index} activity={activity} index={index} disabled={locked} onChange={next => { preparedActivities.current = null; setDraft(previous => previous.map((item, i) => i === index ? next : item)); setConfirmed(false); }} />)}</ol>
              {review.errors.length > 0 && <div className="aiflow-validation" role="status"><strong>Trước khi áp dụng</strong><ul>{review.errors.map(message => <li key={message}>{message}</li>)}</ul></div>}
              <label className="aiflow-confirm"><input type="checkbox" checked={confirmed} disabled={locked || review.errors.length > 0} onChange={event => setConfirmed(event.target.checked)} /><span>Tôi đã xem lại và đồng ý thay thế {currentActivityCount ? `toàn bộ ${currentActivityCount} hoạt động hiện tại` : 'tiến trình hiện tại'} bằng bản này.</span></label>
            </> : !loading && <div className="aiflow-empty"><span className="aiflow-empty-icon"><Layers size={38} /></span><h3>{sources.length ? 'Sẵn sàng lên kế hoạch cho tiết học' : 'Cần có bài học để bắt đầu'}</h3><p>{sources.length ? 'Chọn bài và thời lượng, rồi bấm Tạo đề xuất. Các hoạt động sẽ xuất hiện tại đây để thầy cô xem và chỉnh sửa.' : 'Đóng cửa sổ và thêm bài trong Bài học & slide. Sau đó mở lại để AI đề xuất tiến trình.'}</p><span className="aiflow-badge">Bạn quyết định nội dung áp dụng vào tiết học</span></div>}
        </section>
      </div>
      <footer className="aiflow-footer"><p>{applying ? 'Đang lưu tiến trình…' : draft.length ? 'Áp dụng sẽ thay thế tiến trình hiện tại.' : 'Đề xuất chưa được áp dụng vào tiết học.'}</p><div><button type="button" className="btn btn-outline" disabled={applying} onClick={close}>Đóng</button><button type="button" className="btn btn-primary" disabled={locked || !draft.length || review.errors.length > 0 || !confirmed || !onApplyFlow} onClick={apply}>{applying ? <Loader2 size={17} className="aiflow-spin" /> : <CheckCircle2 size={17} />}{applying ? 'Đang áp dụng…' : 'Áp dụng tiến trình'}</button></div></footer>
    </div>
  </dialog>, document.body);
}

export default function AiLessonFlowModal({ isOpen, onClose, lesson = null, lessons = [], onApplyFlow, currentActivityCount = 0 }) {
  if (!isOpen) return null;
  return <FlowDialog key={String(lesson?.id ?? 'picker')} onClose={onClose} lesson={lesson} lessons={lessons} onApplyFlow={onApplyFlow} currentActivityCount={currentActivityCount} />;
}
