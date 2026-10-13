import { Check, Flag, Map, RotateCcw, Undo2 } from 'lucide-react';
import { lines, studentId, useActivityState } from './activityState';
import { soundEffects } from '../../utils/audio';
import DialogService from '../../services/DialogService';
import ClassStarExtraControls from '../ClassStars/ClassStarExtraControls';

const initial = { tasks: 'Ngồi đúng tư thế, chuẩn bị máy\nNhắc lại kiến thức tiết trước\nHoàn thành nhiệm vụ thực hành\nGiúp một bạn trong nhóm\nLưu bài và thu dọn chỗ học', progress: 0 };
const normalize = value => {
  const tasks = typeof value?.tasks === 'string' ? value.tasks.slice(0, 3000) : initial.tasks;
  return { tasks, progress: Number.isInteger(value?.progress) ? Math.max(0, Math.min(value.progress, lines(tasks).length)) : 0 };
};
export default function TreasureMap({ storageKey, currentClass, participants, soundEnabled }) {
  const [state, setState] = useActivityState(`${storageKey}:treasure`, initial, normalize);
  const tasks = lines(state.tasks);
  const done = tasks.length > 0 && state.progress === tasks.length;
  const advance = () => {
    if (done || !tasks.length || !participants.length) return;
    setState(previous => ({ ...previous, progress: Math.min(previous.progress + 1, tasks.length) }));
    if (soundEnabled) soundEffects.playStarDing();
  };
  const reset = async () => {
    if (!await DialogService.confirmAsync('Bắt đầu bản đồ mới? Tiến độ của hành trình sẽ được xóa; sao đã thưởng vẫn giữ.')) return;
    setState(previous => ({ ...previous, progress: 0 }));
  };
  return <section className="class-activity-game class-activity-treasure">
    <details className="class-activity-editor"><summary>Chuẩn bị các chặng · {tasks.length}/12</summary>
      <label>Mỗi dòng một nhiệm vụ · dùng 12 dòng khác nhau đầu tiên<textarea rows={5} className="input-field" maxLength={3000} disabled={state.progress > 0} value={state.tasks} onChange={event => setState({ tasks: event.target.value, progress: 0 })} /></label>
      <p>{state.progress > 0 ? 'Bắt đầu bản đồ mới để sửa nhiệm vụ.' : 'Thầy cô điều chỉnh nhiệm vụ theo bài học trước khi bắt đầu.'}</p></details>
    <div className="class-activity-stage class-activity-island">
      <span className="class-activity-stage-kicker"><Map size={17} /> Hành trình của cả lớp</span>
      <h3>{done ? 'Đã tìm thấy kho báu!' : 'Cùng nhau đi đến kho báu'}</h3><p>{done ? 'Cảm ơn các nhà thám hiểm đã cùng hoàn thành nhiệm vụ.' : 'Hoàn thành từng chặng. Thầy cô xác nhận để lớp tiến lên.'}</p>
      <div className="class-activity-map" aria-label="Bản đồ các nhiệm vụ">
        {tasks.map((task, index) => <div key={index} className={`class-activity-map-stop${index < state.progress ? ' is-complete' : index === state.progress ? ' is-current' : ''}`} aria-current={index === state.progress ? 'step' : undefined}>
          <span className="class-activity-map-marker">{index < state.progress ? <Check size={25} aria-hidden="true" /> : index + 1}</span>
          <strong>{task}</strong><small>{index < state.progress ? 'Đã hoàn thành' : index === state.progress ? 'Chặng hiện tại' : 'Chặng tiếp theo'}</small></div>)}
        <div className={`class-activity-chest${done ? ' is-unlocked' : ''}`}><span aria-hidden="true">{done ? '🎉' : '🧰'}</span><strong>{done ? 'Kho báu đã mở' : 'Kho báu đang chờ'}</strong></div>
      </div>
      <progress max={Math.max(tasks.length, 1)} value={state.progress} aria-label={`Hoàn thành ${state.progress}/${tasks.length} chặng`} />
      <span className="class-activity-counter">{state.progress}/{tasks.length} chặng · {participants.length} nhà thám hiểm</span>
    </div>
    <div className="class-activity-result" aria-live="polite"><span>{done ? 'Chúc mừng cả lớp!' : 'Nhiệm vụ hiện tại'}</span><strong>{done ? 'Cùng chia sẻ niềm vui chiến thắng' : tasks[state.progress] || 'Thêm nhiệm vụ để tạo bản đồ'}</strong>
      {!done ? <button type="button" className="btn btn-primary" disabled={!tasks.length || !participants.length} onClick={advance}><Flag size={18} /> Xác nhận hoàn thành chặng</button> : <ClassStarExtraControls currentClass={currentClass} initialSelectedStudentIds={participants.map(studentId)} defaultReason="Bản đồ kho báu: hoàn thành hành trình" triggerLabel="Thưởng sao cho các bạn tham gia" />}
      {!participants.length && <p>Chọn học sinh tham gia để bắt đầu hành trình.</p>}
    </div>
    <div className="class-activity-actions"><button type="button" className="btn btn-outline" disabled={!state.progress} onClick={() => setState(previous => ({ ...previous, progress: Math.max(0, previous.progress - 1) }))}><Undo2 size={16} /> Lùi một chặng</button>
      <button type="button" className="btn btn-outline" onClick={reset}><RotateCcw size={16} /> Bản đồ mới</button><span>Lùi chặng không hoàn tác sao đã thưởng.</span></div>
  </section>;
}

