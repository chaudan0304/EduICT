import { Check, Play, RotateCcw, TrainFront } from 'lucide-react';
import { shuffle, useActivityState } from '../activityState';
import { TRAIN_LEVELS } from './referenceContent';
import { soundEffects } from '../../../utils/audio';
import ClassStarExtraControls from '../../ClassStars/ClassStarExtraControls';
import DialogService from '../../../services/DialogService';
import './Arcade.css';

const defaultState = { level: 0, title: 'Quy trình của lớp mình', text: '', round: null };
const stepLines = text => text.split('\n').map(line => line.trim()).filter(Boolean);
function validRound(round) {
  if (!round || typeof round.title !== 'string' || !Array.isArray(round.steps) || round.steps.length < 2 || round.steps.length > 8 || !round.steps.every(step => typeof step === 'string' && step.length <= 160)) return false;
  if (!Array.isArray(round.pool) || !Array.isArray(round.placed)) return false;
  const ids = [...round.pool, ...round.placed];
  return ids.length === round.steps.length && new Set(ids).size === ids.length && ids.every(id => Number.isInteger(id) && id >= 0 && id < ids.length) && typeof round.checked === 'boolean' && typeof round.finished === 'boolean';
}
const normalize = value => ({ level: [0, 1, 2, 'custom'].includes(value?.level) ? value.level : 0,
  title: typeof value?.title === 'string' ? value.title.slice(0, 100) : defaultState.title,
  text: typeof value?.text === 'string' ? value.text.slice(0, 1600) : '', round: validRound(value?.round) ? value.round : null });

export default function ProcessTrain({ storageKey, currentClass, participants, soundEnabled }) {
  const [state, setState] = useActivityState(`${storageKey}:process-train-v1`, defaultState, normalize);
  const round = state.round;
  const level = state.level === 'custom' ? { title: state.title.trim(), steps: stepLines(state.text) } : TRAIN_LEVELS[state.level];
  const invalid = !level.title || level.steps.length < 2 || level.steps.length > 8 || level.steps.some(step => step.length > 160);
  const start = (next = level) => {
    if (soundEnabled) soundEffects.playClick();
    const pool = shuffle(next.steps.map((_, index) => index));
    // Avoid presenting the solved order at the beginning of a short activity.
    if (pool.every((id, index) => id === index)) pool.push(pool.shift());
    setState(previous => ({ ...previous, round: { title: next.title, steps: [...next.steps], pool, placed: [], checked: false, finished: false } }));
  };
  const move = (id, remove) => {
    if (round.finished) return;
    if (soundEnabled) soundEffects.playClick();
    setState(previous => {
      const old = previous.round;
      if (!old || old.finished || !(remove ? old.placed : old.pool).includes(id)) return previous;
      return { ...previous, round: { ...old, pool: remove ? [...old.pool, id] : old.pool.filter(item => item !== id), placed: remove ? old.placed.filter(item => item !== id) : [...old.placed, id], checked: false } };
    });
  };
  const check = () => {
    if (round.finished || round.pool.length) return;
    const finished = round.placed.every((id, index) => id === index);
    setState(previous => ({ ...previous, round: { ...previous.round, checked: true, finished } }));
    if (soundEnabled) { if (finished) soundEffects.playVictory(); else soundEffects.playClick(); }
  };
  const reset = async () => {
    if (!round.finished && !await DialogService.confirmAsync('Về thiết lập để xếp lại đoàn tàu? Tiến độ chặng hiện tại sẽ được đặt lại.')) return;
    setState(previous => ({ ...previous, round: null }));
  };
  const next = async () => {
    if (!round.finished && !await DialogService.confirmAsync('Chuyển chặng và bỏ tiến độ xếp hiện tại?')) return;
    const nextIndex = state.level === 'custom' ? 0 : (state.level + 1) % TRAIN_LEVELS.length;
    setState(previous => ({ ...previous, level: nextIndex })); start(TRAIN_LEVELS[nextIndex]);
  };
  return <div className="arcade arcade-process">
    {!round ? <div className="arcade-preparation"><section className="arcade-setup-copy"><span className="arcade-eyebrow">LẮP ĐÚNG TOA · NHỚ ĐÚNG BƯỚC</span><h3>Đoàn tàu quy trình</h3><div className="process-train-preview" aria-hidden="true">🚂<span>1</span><span>2</span><span>3</span></div><p>Cả lớp cùng đưa những thẻ thao tác về đúng thứ tự. Mỗi toa là một bước nhỏ để hoàn thành công việc.</p><ol><li>Bấm thẻ để lắp vào toa trống tiếp theo.</li><li>Bấm toa đã lắp để gỡ thẻ; các toa sau tự dồn lại.</li><li>Lắp đủ thẻ rồi kiểm tra để đoàn tàu xuất phát.</li></ol></section>
      <section className="arcade-settings"><label>Chọn chặng<select value={state.level} onChange={event => setState(previous => ({ ...previous, level: event.target.value === 'custom' ? 'custom' : Number(event.target.value) }))}>{TRAIN_LEVELS.map((item, i) => <option key={i} value={i}>{i + 1}. {item.title}</option>)}<option value="custom">Tự soạn quy trình</option></select></label>
        {state.level === 'custom' ? <><label>Tên nhiệm vụ<input maxLength={100} value={state.title} onChange={event => setState(previous => ({ ...previous, title: event.target.value }))} /></label><label>Các bước theo thứ tự đúng<textarea rows={6} maxLength={1600} value={state.text} onChange={event => setState(previous => ({ ...previous, text: event.target.value }))} placeholder={'Mỗi dòng là một bước\nTừ 2 đến 8 bước'} /></label><p className="arcade-small">Mỗi bước tối đa 160 ký tự. Hệ thống sẽ xáo thẻ khi bắt đầu.</p></> : <ol className="process-step-preview">{level.steps.map(step => <li key={step}>{step}</li>)}</ol>}
        <button type="button" className="btn btn-primary arcade-start" disabled={invalid} onClick={() => start()}><Play size={18} />Bắt đầu xếp tàu</button></section></div> : <>
      <section className={`process-stage${round.finished ? ' is-departing' : ''}`}><div className="arcade-stage-heading"><span className="arcade-eyebrow"><TrainFront size={15} />ĐOÀN TÀU QUY TRÌNH</span><h3>{round.title}</h3><p>{round.placed.length}/{round.steps.length} toa đã lắp · Cả lớp cùng chơi</p></div>
        <div className="process-track"><span className="process-engine" aria-hidden="true">🚂</span><div className="process-carriages">{round.steps.map((_, index) => {
          const id = round.placed[index]; const filled = id !== undefined; const correct = round.checked && id === index;
          return <button type="button" key={index} className={`process-carriage${filled ? ' is-filled' : ''}${round.checked ? correct ? ' is-correct' : ' is-wrong' : ''}`} disabled={!filled || round.finished} aria-label={`Toa ${index + 1}${filled ? `: ${round.steps[id]}, bấm để gỡ` : ', chưa có thẻ'}`} onClick={() => move(id, true)}><small>TOA {index + 1}</small><strong>{filled ? round.steps[id] : 'Chọn thẻ để lắp'}</strong>{round.checked && <span>{correct ? '✓ Đúng vị trí' : '↔ Cần sắp xếp lại'}</span>}</button>;
        })}</div></div>
        {!round.finished && <div className="process-pool" aria-label="Thẻ chưa lắp">{round.pool.map(id => <button type="button" key={id} onClick={() => move(id, false)}>{round.steps[id]}</button>)}{!round.pool.length && <p>Đã lắp đủ thẻ. Cùng kiểm tra đoàn tàu nhé!</p>}</div>}
      </section>
      <p className="arcade-announcement" role="status">{round.finished ? 'Xuất sắc! Đoàn tàu đã đúng thứ tự và sẵn sàng lăn bánh!' : round.checked ? 'Có toa chưa đúng thứ tự. Bấm toa để gỡ thẻ và thử lại nhé!' : 'Chọn thẻ để lắp, bấm toa để gỡ. Cùng thảo luận trước khi kiểm tra.'}</p>
      <div className="process-controls"><button type="button" className="btn btn-primary" disabled={round.pool.length > 0 || round.finished} onClick={check}><Check size={17} />Kiểm tra đoàn tàu</button><button type="button" className="btn btn-outline" onClick={reset}><RotateCcw size={16} />Xếp lại / Thiết lập</button><button type="button" className="btn btn-outline" onClick={next}>Chặng tiếp theo →</button>
        {round.finished && participants.length > 0 && <ClassStarExtraControls currentClass={currentClass} initialSelectedStudentIds={participants.map(student => String(student.id))} defaultReason="Hoàn thành đoàn tàu quy trình" triggerLabel="Thưởng sao cho lớp" />}</div>
      {round.finished && <p className="arcade-small">Chỉ ghi sao học sinh khi thầy cô mở và xác nhận phần thưởng.</p>}
    </>}
  </div>;
}
