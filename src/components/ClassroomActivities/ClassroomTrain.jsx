import { useEffect, useRef, useState } from 'react';
import { RotateCcw, TrainFront } from 'lucide-react';
import { shuffle, stringList, studentId, useActivityState } from './activityState';
import { soundEffects } from '../../utils/audio';
import DialogService from '../../services/DialogService';
import ClassStarExtraControls from '../ClassStars/ClassStarExtraControls';

const initial = { mode: 'call', count: 1, groupCount: 4, called: [], cars: [], history: [] };
const normalize = value => ({ ...initial, mode: value?.mode === 'groups' ? 'groups' : 'call',
  count: Number.isInteger(value?.count) && value.count >= 1 && value.count <= 6 ? value.count : 1,
  groupCount: Number.isInteger(value?.groupCount) && value.groupCount >= 2 && value.groupCount <= 8 ? value.groupCount : 4,
  called: stringList(value?.called), cars: Array.isArray(value?.cars) ? value.cars.slice(0, 8).map(stringList) : [],
  history: Array.isArray(value?.history) ? value.history.slice(0, 100).map(stringList) : [] });

export default function ClassroomTrain({ storageKey, currentClass, participants, soundEnabled, onBusyChange }) {
  const [state, setState] = useActivityState(`${storageKey}:train`, initial, normalize);
  const [moving, setMoving] = useState(false);
  const timer = useRef(null); const locked = useRef(false);
  useEffect(() => () => { clearTimeout(timer.current); onBusyChange(false); }, [onBusyChange]);
  const ids = participants.map(studentId);
  const remaining = ids.filter(id => !state.called.includes(id));
  const cars = state.cars.map(car => car.filter(id => ids.includes(id))).filter(car => car.length);
  const depart = () => {
    if (locked.current || !(state.mode === 'groups' ? ids.length >= 2 : remaining.length)) return;
    const ordered = shuffle(state.mode === 'groups' ? ids : remaining).slice(0, state.mode === 'groups' ? ids.length : state.count);
    const groups = state.mode === 'groups' ? Array.from({ length: Math.min(state.groupCount, ids.length) }, () => []) : [ordered];
    if (state.mode === 'groups') ordered.forEach((id, index) => groups[index % groups.length].push(id));
    const mode = state.mode;
    locked.current = true; setMoving(true); onBusyChange(true);
    if (soundEnabled) soundEffects.playClick();
    timer.current = setTimeout(() => {
      setState(previous => ({ ...previous, cars: groups, called: mode === 'call' ? [...previous.called, ...ordered] : previous.called,
        history: [ordered, ...previous.history].slice(0, 100) }));
      setMoving(false); locked.current = false; onBusyChange(false);
      if (soundEnabled) soundEffects.playStarDing();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000);
  };
  const reset = async () => {
    if (locked.current || !await DialogService.confirmAsync('Bắt đầu chuyến tàu mới? Xóa danh sách đã gọi, các nhóm và lịch sử của trò này; sao đã thưởng vẫn giữ.')) return;
    setState(previous => ({ ...previous, called: [], cars: [], history: [] }));
  };
  const name = id => currentClass.students.find(student => studentId(student) === id)?.name || 'Học sinh đã rời lớp';
  return <section className="class-activity-game class-activity-train">
    <div className="class-activity-options">
      <label>Chuyến tàu<select className="input-field" disabled={moving} value={state.mode} onChange={event => setState(previous => ({ ...previous, mode: event.target.value, cars: [] }))}><option value="call">Gọi học sinh, không lặp</option><option value="groups">Chia nhóm ngẫu nhiên</option></select></label>
      <label>{state.mode === 'groups' ? 'Số nhóm' : 'Số bạn mỗi lượt'}<select className="input-field" disabled={moving} value={state.mode === 'groups' ? state.groupCount : state.count} onChange={event => { const count = Number(event.target.value); setState(previous => ({ ...previous, [previous.mode === 'groups' ? 'groupCount' : 'count']: count })); }}>
        {Array.from({ length: state.mode === 'groups' ? 7 : 6 }, (_, index) => index + (state.mode === 'groups' ? 2 : 1)).map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <span className="class-activity-counter">{state.mode === 'groups' ? `${ids.length} bạn tham gia` : `${remaining.length} bạn chưa được gọi`}</span>
    </div>
    <div className={`class-activity-stage class-activity-station${moving ? ' is-moving' : ''}`}>
      <span className="class-activity-stage-kicker"><TrainFront size={17} /> Nhà ga niềm vui</span>
      <h3>{state.mode === 'groups' ? 'Cùng lên toa, cùng hợp tác!' : 'Ai sẽ lên chuyến tàu này?'}</h3>
      <p>{state.mode === 'groups' ? 'Chia đều số bạn giữa các nhóm. Thầy cô có thể phân nhiệm vụ ngay.' : 'Bấm cho tàu chạy để gọi ngẫu nhiên các bạn chưa đến lượt.'}</p>
      <div className="class-activity-tracks" aria-hidden="true"><span>🚂</span><span>🚃</span><span>🚃</span><span>🚃</span></div>
      <button type="button" className="btn btn-primary class-activity-launch" disabled={moving || (state.mode === 'groups' ? ids.length < 2 : !remaining.length)} onClick={depart}><TrainFront size={20} />{moving ? 'Tàu đang đến ga…' : state.mode === 'groups' ? 'Khởi hành & chia nhóm' : 'Cho tàu khởi hành'}</button>
      {!ids.length && <p role="status">Chọn học sinh tham gia trước khi khởi hành.</p>}
      {state.mode === 'groups' && ids.length === 1 && <p role="status">Cần ít nhất 2 bạn để chia nhóm.</p>}
      {state.mode === 'call' && ids.length > 0 && !remaining.length && <p role="status">Các bạn đều đã lên tàu! Bắt đầu vòng mới để gọi tiếp.</p>}
    </div>
    <div className="class-activity-cars" aria-live="polite" aria-busy={moving}>
      {!moving && cars.map((car, index) => <section key={index} className="class-activity-car"><h4>{state.mode === 'groups' ? `Toa ${index + 1} · ${car.length} bạn` : 'Chào mừng các hành khách!'}</h4><ul>{car.map(id => <li key={id}>{name(id)}</li>)}</ul>
        <ClassStarExtraControls currentClass={currentClass} initialSelectedStudentIds={car} defaultReason={`Chuyến tàu lớp học: ${state.mode === 'groups' ? `nhóm ${index + 1}` : 'hoàn thành hoạt động'}`} triggerLabel="Thưởng sao / Hoàn tác" /></section>)}
    </div>
    <div className="class-activity-actions"><button type="button" className="btn btn-outline" disabled={moving} onClick={reset}><RotateCcw size={16} /> Vòng mới</button><span>{state.mode === 'groups' ? 'Chia nhóm lại sẽ thay thế các toa hiện tại.' : 'Nếu lượt cuối ít bạn hơn, gọi tất cả bạn còn lại.'}</span></div>
    <details className="class-activity-history"><summary>Lịch sử chuyến tàu · {state.history.length}</summary><ol>{state.history.map((trip, index) => <li key={index}>{trip.map(name).join(' · ')}</li>)}</ol></details>
  </section>;
}

