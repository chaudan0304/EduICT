import { useEffect, useRef, useState } from 'react';
import { Gift, RotateCcw, Sparkles } from 'lucide-react';
import { lines, shuffle, stringList, studentId, useActivityState } from './activityState';
import { soundEffects } from '../../utils/audio';
import DialogService from '../../services/DialogService';
import ClassStarExtraControls from '../ClassStars/ClassStarExtraControls';

const initial = { mode: 'students', tasks: 'Nêu một cách giữ gìn máy tính\nChỉ vào phím Enter\nKể tên một thiết bị máy tính\nLàm mẫu tư thế ngồi đúng\nGửi một lời khen cho bạn', called: [], usedTasks: [], opened: [], history: [] };
const normalize = value => ({ ...initial, mode: value?.mode === 'tasks' ? 'tasks' : 'students',
  tasks: typeof value?.tasks === 'string' ? value.tasks.slice(0, 3000) : initial.tasks,
  called: stringList(value?.called), usedTasks: stringList(value?.usedTasks),
  opened: Array.isArray(value?.opened) ? value.opened.filter(n => Number.isInteger(n) && n >= 0 && n < 6) : [],
  history: Array.isArray(value?.history) ? value.history.filter(h => h && ['students', 'tasks'].includes(h.mode) && typeof h.value === 'string').slice(0, 100) : [] });

export default function GiftBoxes({ storageKey, currentClass, participants, soundEnabled, onBusyChange }) {
  const [state, setState] = useActivityState(`${storageKey}:gifts`, initial, normalize);
  const [busyBox, setBusyBox] = useState(null);
  const timer = useRef(null);
  const locked = useRef(false);
  useEffect(() => () => { clearTimeout(timer.current); onBusyChange(false); }, [onBusyChange]);
  const tasks = lines(state.tasks);
  const pool = state.mode === 'students' ? participants.map(studentId).filter(id => !state.called.includes(id)) : tasks.filter(task => !state.usedTasks.includes(task));
  const result = state.history.find(item => item.mode === state.mode);
  const resultStudent = result?.mode === 'students' ? participants.find(student => studentId(student) === result.value) : null;
  const resultLabel = result?.mode === 'tasks' ? result.value : resultStudent?.name;
  const openGift = box => {
    if (locked.current || state.opened.includes(box) || !pool.length) return;
    locked.current = true; setBusyBox(box); onBusyChange(true);
    if (soundEnabled) soundEffects.playClick();
    const chosen = shuffle(pool)[0];
    const mode = state.mode;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      setState(previous => ({ ...previous, opened: [...previous.opened, box],
        called: mode === 'students' ? [...previous.called, chosen] : previous.called,
        usedTasks: mode === 'tasks' ? [...previous.usedTasks, chosen] : previous.usedTasks,
        history: [{ mode, value: chosen }, ...previous.history].slice(0, 100) }));
      setBusyBox(null); locked.current = false; onBusyChange(false);
      if (soundEnabled) soundEffects.playStarDing();
    }, reduced ? 0 : 850);
  };
  const reset = async () => {
    if (locked.current || !await DialogService.confirmAsync('Bắt đầu vòng quà mới? Danh sách đã gọi và lịch sử của trò này sẽ được xóa; sao đã thưởng vẫn giữ.')) return;
    setState(previous => ({ ...previous, called: [], usedTasks: [], opened: [], history: [] }));
  };
  return <section className="class-activity-game class-activity-gifts">
    <div className="class-activity-options">
      <label>Mở hộp để<select className="input-field" disabled={busyBox !== null} value={state.mode} onChange={event => setState(previous => ({ ...previous, mode: event.target.value, opened: [] }))}>
        <option value="students">Gọi tên học sinh</option><option value="tasks">Khám phá nhiệm vụ</option></select></label>
      <span className="class-activity-counter">{pool.length} {state.mode === 'students' ? 'bạn' : 'nhiệm vụ'} chưa được gọi</span>
    </div>
    {state.mode === 'tasks' && <details className="class-activity-editor"><summary>Soạn nhiệm vụ của bạn · {tasks.length}/12</summary>
      <label>Mỗi dòng một nhiệm vụ · dùng 12 dòng khác nhau đầu tiên<textarea className="input-field" rows={5} maxLength={3000} disabled={busyBox !== null} value={state.tasks} onChange={event => setState(previous => ({ ...previous, tasks: event.target.value }))} /></label></details>}
    <div className="class-activity-stage">
      <span className="class-activity-stage-kicker"><Sparkles size={16} /> Một bất ngờ đang chờ!</span>
      <h3>Em chọn hộp quà nào?</h3><p>Chọn một hộp để mở. {state.mode === 'students' ? 'Mỗi bạn được gọi một lần trong vòng.' : 'Mỗi nhiệm vụ chỉ xuất hiện một lần trong vòng.'}</p>
      <div className="class-activity-gift-grid" aria-busy={busyBox !== null}>
        {Array.from({ length: 6 }, (_, box) => <button type="button" key={box} className={`class-activity-gift gift-${box}${state.opened.includes(box) ? ' is-open' : ''}${busyBox === box ? ' is-opening' : ''}`}
          disabled={busyBox !== null || state.opened.includes(box) || !pool.length} onClick={() => openGift(box)} aria-label={`Mở hộp quà ${box + 1}${state.opened.includes(box) ? ', đã mở' : ''}`}>
          <span className="class-activity-gift-ribbon" aria-hidden="true" /><Gift size={44} aria-hidden="true" /><span>{state.opened.includes(box) ? 'Đã mở' : `Hộp ${box + 1}`}</span>
        </button>)}
      </div>
      {!pool.length && <p role="status">{state.mode === 'tasks' && !tasks.length ? 'Thêm ít nhất một nhiệm vụ để mở quà.' : !participants.length && state.mode === 'students' ? 'Chọn học sinh tham gia trước khi mở quà.' : 'Đã gọi hết vòng! Bắt đầu vòng mới để tiếp tục.'}</p>}
      {state.opened.length === 6 && pool.length > 0 && <button type="button" className="btn btn-primary" onClick={() => setState(previous => ({ ...previous, opened: [] }))}>Bày 6 hộp quà tiếp theo</button>}
    </div>
    <div className="class-activity-result" aria-live="polite" aria-atomic="true">
      <span>{busyBox !== null ? 'Đang mở quà…' : resultLabel ? 'Hộp quà dành cho' : 'Sẵn sàng mở quà'}</span>
      <strong>{busyBox !== null ? 'Bất ngờ sắp xuất hiện!' : resultLabel || 'Mời một bạn chọn hộp trên màn hình'}</strong>
      {resultStudent && busyBox === null && <ClassStarExtraControls currentClass={currentClass} initialSelectedStudentIds={[studentId(resultStudent)]} defaultReason="Hộp quà bí mật: hoàn thành hoạt động" triggerLabel="Thưởng sao / Hoàn tác" />}
    </div>
    <div className="class-activity-actions"><button type="button" className="btn btn-outline" disabled={busyBox !== null} onClick={reset}><RotateCcw size={16} /> Vòng mới</button>
      <span>Sao chỉ được ghi khi thầy cô xác nhận thưởng.</span></div>
    <details className="class-activity-history"><summary>Lịch sử mở quà · {state.history.length}</summary><ol>{state.history.map((h, i) => <li key={i}>{h.mode === 'tasks' ? h.value : currentClass.students.find(student => studentId(student) === h.value)?.name || 'Học sinh đã rời lớp'}</li>)}</ol></details>
  </section>;
}

