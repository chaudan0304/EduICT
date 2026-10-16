import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Loader2, Search, Sparkles, X } from 'lucide-react';
import useQuestionGenerator from './useQuestionGenerator';
import QuestionDraftCard from './QuestionDraftCard';
import { lessonDisplayTitle, QUESTION_LEVELS } from './questionDraft';
import './AiQuestionGeneratorModal.css';
import DraftStatus from '../DraftStatus';

export default function AiQuestionGeneratorModal({ isOpen, onClose, lessons = [], preselectedLessonId = null, initialGrade = 'all', onQuestionsAdded }) {
  const generator = useQuestionGenerator({ isOpen, lessons, preselectedLessonId, initialGrade, onQuestionsAdded });
  const [grade, setGrade] = useState(String(initialGrade || 'all'));
  const [search, setSearch] = useState('');
  const [pane, setPane] = useState('setup');
  const [editingIndex, setEditingIndex] = useState(null);
  const dialogRef = useRef(null);
  const id = useId();
  const busy = generator.loading || generator.isSaving;
  const matchingLessons = useMemo(() => lessons.filter(lesson => (grade === 'all' || String(lesson.grade) === grade)
    && String(lesson.title || '').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), [lessons, grade, search]);
  const sourceLabels = { slides: `Nội dung từ ${generator.source?.slideCount} trang đầu có văn bản (tối đa 30 trang)`, objectives: 'Mục tiêu bài học', summary: 'Nội dung tóm tắt', empty: 'Chưa có nội dung để AI đọc' };
  const changed = generator.batch && (String(generator.batch.id) !== generator.lessonId || generator.batch.count !== generator.count
    || generator.batch.difficulty !== generator.difficulty || generator.batch.sourceContent !== generator.sourceContent || generator.batch.instructions !== generator.instructions);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [isOpen]);

  const close = () => {
    if (generator.isSaving) return;
    generator.cancelGeneration(); onClose();
  };
  const generate = async () => {
    setPane('review'); setEditingIndex(null);
    await generator.generate();
  };
  const changeGrade = value => {
    setGrade(value); setSearch('');
    const lesson = lessons.find(item => value === 'all' || String(item.grade) === value);
    generator.setLessonId(lesson ? String(lesson.id) : '');
  };
  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} className="aiq-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="aiq-shell">
        <header className="aiq-header">
          <div className="aiq-header-icon"><Sparkles size={23} /></div>
          <div className="aiq-heading"><h2 id={`${id}-title`}>AI tạo câu hỏi</h2><p id={`${id}-description`}>Tạo bản nháp trắc nghiệm 4 lựa chọn. Bạn duyệt và chỉnh sửa trước khi lưu.</p></div>
          <button type="button" className="btn btn-icon" aria-label="Đóng cửa sổ tạo câu hỏi" disabled={generator.isSaving} onClick={close}><X size={20} /></button>
        </header>
        <DraftStatus status={generator.draftStatus} />
        <nav className="aiq-mobile-tabs" aria-label="Các bước tạo câu hỏi">
          <button type="button" aria-current={pane === 'setup' ? 'step' : undefined} onClick={() => setPane('setup')}>1. Thiết lập</button>
          <button type="button" aria-current={pane === 'review' ? 'step' : undefined} onClick={() => setPane('review')}>2. Duyệt câu hỏi {generator.questions.length ? `(${generator.questions.length})` : ''}</button>
        </nav>
        <div className="aiq-body" data-pane={pane}>
          <aside className="aiq-setup" aria-label="Thiết lập câu hỏi">
            <div className="aiq-setup-scroll">
              <h3><BookOpen size={17} /> Bài học và yêu cầu</h3>
              <div className="aiq-field-row aiq-lesson-filter">
                <label className="aiq-field" htmlFor={`${id}-grade`}>Khối lớp<select id={`${id}-grade`} value={grade} disabled={busy} onChange={event => changeGrade(event.target.value)}><option value="all">Tất cả</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Khối {value}</option>)}</select></label>
                <label className="aiq-field" htmlFor={`${id}-search`}>Tìm bài học<div className="aiq-search"><Search size={16} /><input id={`${id}-search`} type="search" value={search} disabled={busy} placeholder="Nhập tên bài…" onChange={event => setSearch(event.target.value)} /></div></label>
              </div>
              <label className="aiq-field" htmlFor={`${id}-lesson`}>Bài học nguồn <span className="aiq-muted">({matchingLessons.length} bài)</span>
                <select id={`${id}-lesson`} value={generator.lessonId} disabled={busy || !matchingLessons.length} onChange={event => generator.setLessonId(event.target.value)}>
                  {!matchingLessons.some(lesson => String(lesson.id) === generator.lessonId) && <option value={generator.lessonId}>{generator.currentLesson ? lessonDisplayTitle(generator.currentLesson.title) : 'Chọn bài học'}</option>}
                  {matchingLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{grade === 'all' ? `K${lesson.grade} · ` : ''}{lessonDisplayTitle(lesson.title)}</option>)}
                </select>
              </label>
              {!matchingLessons.length && <p className="aiq-hint">Không tìm thấy bài phù hợp. Hãy đổi khối hoặc từ khóa.</p>}
              {generator.currentLesson && <p className="aiq-filename" title={generator.currentLesson.title}>Đang chọn: {generator.currentLesson.title}</p>}
              <div className="aiq-field-row">
                <label className="aiq-field" htmlFor={`${id}-count`}>Số câu<select id={`${id}-count`} value={generator.count} disabled={busy} onChange={event => generator.setCount(Number(event.target.value))}>{[3, 5, 7, 10].map(value => <option key={value} value={value}>{value} câu</option>)}</select></label>
                <label className="aiq-field" htmlFor={`${id}-level`}>Mức độ<select id={`${id}-level`} value={generator.difficulty} disabled={busy} onChange={event => generator.setDifficulty(event.target.value)}><option value="mixed">Hỗn hợp</option>{QUESTION_LEVELS.map(level => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label>
              </div>
              <div className="aiq-source-status" role="status">{generator.sourceLoading ? <><Loader2 size={16} className="animate-spin" /> Đang đọc nội dung bài…</> : <><BookOpen size={16} /> {generator.source ? sourceLabels[generator.source.kind] : 'Nhập kiến thức làm căn cứ'}</>}</div>
              {generator.sourceError && <p className="aiq-hint aiq-warning">{generator.sourceError}</p>}
              {!generator.sourceLoading && !generator.source?.content && <p className="aiq-hint">{generator.currentLesson?.type === 'powerpoint_online' ? 'Bài dùng link Online nên chưa có văn bản.' : 'Bài này chưa có văn bản để AI đọc.'} Nhập kiến thức hoặc mục tiêu bên dưới.</p>}
              {generator.source?.truncated && <p className="aiq-hint">Đã lấy 12.000 ký tự đầu. Bạn có thể thay bằng phần kiến thức cần hỏi.</p>}
              <label className="aiq-field" htmlFor={`${id}-content`}>Kiến thức dùng để tạo câu hỏi<textarea id={`${id}-content`} rows={5} maxLength={12000} value={generator.sourceContent} disabled={busy || generator.sourceLoading} placeholder="Ví dụ: Các bộ phận của máy tính; phân biệt chuột, bàn phím và màn hình…" onChange={event => generator.setSourceContent(event.target.value)} /><span className="aiq-counter">{generator.sourceContent.length.toLocaleString('vi')} / 12.000 ký tự</span></label>
              <label className="aiq-field" htmlFor={`${id}-instructions`}>Yêu cầu thêm <span className="aiq-muted">(không bắt buộc)</span><textarea id={`${id}-instructions`} rows={2} maxLength={800} value={generator.instructions} disabled={busy} placeholder="Ví dụ: câu ngắn, tình huống gần gũi với học sinh lớp 1…" onChange={event => generator.setInstructions(event.target.value)} /></label>
              <p className="aiq-hint">Tên bài, khối và nội dung trên sẽ được gửi đến Gemini khi bạn bấm tạo.</p>
            </div>
            <div className="aiq-setup-action"><button type="button" className="btn btn-primary" onClick={generate} disabled={busy || generator.sourceLoading || generator.source?.lessonId !== generator.lessonId || !generator.currentLesson || !generator.sourceContent.trim()}><Sparkles size={17} /> {generator.loading ? 'Đang tạo câu hỏi…' : generator.questions.length ? 'Tạo bộ câu hỏi mới' : `Tạo ${generator.count} câu hỏi`}</button></div>
          </aside>
          <section className="aiq-review" aria-label="Duyệt câu hỏi" aria-busy={generator.loading}>
            <div className="aiq-review-heading"><div><h3>Duyệt câu hỏi</h3><p>{generator.batch ? `Khối ${generator.batch.grade} · ${lessonDisplayTitle(generator.batch.title)}` : 'Câu hỏi sẽ xuất hiện ở đây để bạn kiểm tra.'}</p></div>{generator.batch?.isCached && <span className="aiq-badge">Kết quả đã tạo trước đó</span>}</div>
            <div className="aiq-review-scroll">
              {generator.error && <div role="alert" className="aiq-message aiq-error"><AlertCircle size={18} /><span>{generator.error}</span></div>}
              {changed && <div className="aiq-message aiq-notice">Thiết lập đã thay đổi. Các câu bên dưới vẫn được lưu vào bài “{lessonDisplayTitle(generator.batch.title)}”. Bấm tạo bộ mới để áp dụng thay đổi.</div>}
              {generator.loading ? <div className="aiq-empty" role="status"><Loader2 size={30} className="animate-spin" /><h4>AI đang soạn câu hỏi…</h4><p>Dựa trên kiến thức bạn đã chọn. Hãy kiểm tra đáp án khi có kết quả.</p><button type="button" className="btn btn-secondary" onClick={generator.cancelGeneration}>Dừng chờ</button></div>
                : generator.questions.length ? <>
                  <div className="aiq-selection"><span>Đã chọn <strong>{generator.selected.size}/{generator.questions.length - generator.saved.size}</strong> câu chưa lưu</span><div><button type="button" disabled={busy} onClick={generator.selectAll}>Chọn tất cả</button><button type="button" disabled={busy} onClick={generator.deselectAll}>Bỏ chọn</button></div></div>
                  {generator.questions.map((question, index) => <QuestionDraftCard key={index} question={question} index={index} selected={generator.selected.has(index)} saved={generator.saved.has(index)} disabled={busy} editing={editingIndex === index} onToggle={() => generator.toggle(index)} onEdit={() => setEditingIndex(editingIndex === index ? null : index)} onChange={patch => generator.update(index, patch)} />)}
                </> : <div className="aiq-empty"><div className="aiq-empty-icon"><Sparkles size={30} /></div><h4>Từ bài học đến bộ câu hỏi</h4><p>Chọn bài và nội dung kiến thức ở bên trái. Sau khi tạo, bạn có thể:</p><ol><li>Đọc câu hỏi và kiểm tra đáp án.</li><li>Chỉnh câu chữ, phương án và giải thích.</li><li>Chọn những câu phù hợp để lưu.</li></ol><span className="aiq-hint">AI có thể nhầm. Giáo viên là người duyệt nội dung cuối cùng.</span></div>}
            </div>
          </section>
        </div>
        <footer className="aiq-footer">
          <div role="status">{generator.report ? <span className="aiq-saved-report"><CheckCircle2 size={17} /> {generator.report}</span> : generator.questions.length ? <span><strong>{generator.selected.size}</strong> câu đang chọn · {generator.saved.size} câu đã lưu</span> : <span>Chỉ lưu những câu bạn đã duyệt.</span>}</div>
          <div className="aiq-footer-actions"><button type="button" className="btn btn-secondary" disabled={generator.isSaving} onClick={close}>{generator.saved.size ? 'Đóng' : 'Hủy'}</button><button type="button" className="btn btn-primary" disabled={busy || !generator.selected.size} onClick={generator.save}>{generator.isSaving && <Loader2 size={16} className="animate-spin" />}{generator.isSaving ? 'Đang lưu…' : `Lưu ${generator.selected.size} câu vào ngân hàng`}</button></div>
        </footer>
      </div>
    </dialog>
  );
}
