import React, { useId } from 'react';
import { CheckCircle2, Pencil } from 'lucide-react';
import { QUESTION_LEVELS, validateQuestion } from './questionDraft';

export default function QuestionDraftCard({ question, index, selected, saved, disabled, editing, onToggle, onEdit, onChange }) {
  const id = useId();
  const level = QUESTION_LEVELS.find(item => item.id === question.difficulty);
  const problem = validateQuestion(question);
  return (
    <article className={`aiq-question ${selected ? 'is-selected' : ''} ${saved ? 'is-saved' : ''}`}>
      <div className="aiq-question-heading">
        <label className="aiq-question-check"><input type="checkbox" checked={selected} disabled={disabled || saved} onChange={onToggle} /><strong>Câu {index + 1}</strong></label>
        <span className="aiq-badge">{level?.label}</span>
        {saved ? <span className="aiq-saved-label"><CheckCircle2 size={15} /> Đã lưu</span> : <button type="button" className="aiq-edit" disabled={disabled} aria-expanded={editing} onClick={onEdit}><Pencil size={14} />{editing ? 'Xong' : 'Sửa câu'}</button>}
      </div>
      {editing && !saved ? <fieldset disabled={disabled} className="aiq-editor">
        <legend className="aiq-sr-only">Chỉnh sửa câu {index + 1}</legend>
        <label className="aiq-field" htmlFor={`${id}-question`}>Nội dung câu hỏi<textarea id={`${id}-question`} rows={3} value={question.questionText} onChange={event => onChange({ questionText: event.target.value })} /></label>
        <div className="aiq-hint">Chọn nút tròn cạnh phương án đúng.</div>
        {question.options.map((option, optionIndex) => <div className="aiq-option-editor" key={optionIndex}>
          <input type="radio" name={`${id}-answer`} aria-label={`Đáp án đúng ${String.fromCharCode(65 + optionIndex)} cho câu ${index + 1}`} checked={question.correctIndex === optionIndex} onChange={() => onChange({ correctIndex: optionIndex })} />
          <label htmlFor={`${id}-option-${optionIndex}`}>{String.fromCharCode(65 + optionIndex)}</label>
          <input id={`${id}-option-${optionIndex}`} aria-label={`Phương án ${String.fromCharCode(65 + optionIndex)} câu ${index + 1}`} value={option} onChange={event => onChange({ options: question.options.map((value, i) => i === optionIndex ? event.target.value : value) })} />
        </div>)}
        <label className="aiq-field" htmlFor={`${id}-level`}>Mức độ<select id={`${id}-level`} value={question.difficulty} onChange={event => onChange({ difficulty: event.target.value })}>{QUESTION_LEVELS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="aiq-field" htmlFor={`${id}-explanation`}>Giải thích<textarea id={`${id}-explanation`} rows={2} value={question.explanation} onChange={event => onChange({ explanation: event.target.value })} /></label>
      </fieldset> : <>
        <p className="aiq-question-text">{question.questionText}</p>
        <div className="aiq-options">{question.options.map((option, optionIndex) => <div key={optionIndex} className={`aiq-option ${question.correctIndex === optionIndex ? 'is-correct' : ''}`}><strong>{String.fromCharCode(65 + optionIndex)}.</strong><span>{option}</span>{question.correctIndex === optionIndex && <small>✓ Đáp án đúng</small>}</div>)}</div>
        {question.explanation && <details className="aiq-explanation"><summary>Xem giải thích</summary><p>{question.explanation}</p></details>}
      </>}
      {!saved && problem && <p className="aiq-validation">{problem}</p>}
    </article>
  );
}
