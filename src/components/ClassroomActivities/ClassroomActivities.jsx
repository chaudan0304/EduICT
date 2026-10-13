import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gift, Map, TrainFront, Volume2, VolumeX, Users, Maximize2, Minimize2 } from 'lucide-react';
import ActivityRoster from './ActivityRoster';
import GiftBoxes from './GiftBoxes';
import ClassroomTrain from './ClassroomTrain';
import TreasureMap from './TreasureMap';
import { activityKey, stringList, studentId, useActivityState } from './activityState';
import './ClassroomActivities.css';

const games = [
  { id: 'gifts', name: 'Hộp quà bí mật', tagline: 'Mở quà, gọi tên, khám phá', icon: Gift },
  { id: 'train', name: 'Chuyến tàu lớp học', tagline: 'Gọi bạn hoặc chia nhóm', icon: TrainFront },
  { id: 'treasure', name: 'Bản đồ kho báu', tagline: 'Cả lớp cùng hoàn thành nhiệm vụ', icon: Map },
];
const normalize = (value, initial) => ({ selectedIds: Array.isArray(value?.selectedIds) ? stringList(value.selectedIds) : initial.selectedIds,
  game: games.some(game => game.id === value?.game) ? value.game : 'gifts' });

function ActivitiesForClass({ currentClass, soundEnabled = true, embedded = false }) {
  const students = currentClass.students || [];
  const [storageKey] = useState(() => activityKey(currentClass.id));
  const panelId = useId();
  const [state, setState] = useActivityState(`${storageKey}:roster`, { selectedIds: students.map(studentId), game: 'gifts' }, normalize);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playDialog = useRef(null);
  const playTrigger = useRef(null);
  const wasPlaying = useRef(false);
  const [localSound, setLocalSound] = useState(soundEnabled);
  const selectedIds = students.map(studentId).filter(id => state.selectedIds.includes(id));
  const participants = students.filter(student => selectedIds.includes(studentId(student)));
  const gameProps = { storageKey, currentClass, participants, soundEnabled: soundEnabled && localSound, onBusyChange: setBusy };
  useEffect(() => {
    const node = playDialog.current;
    if (playing && node && !node.open) node.showModal();
    if (!playing && wasPlaying.current) playTrigger.current?.focus();
    wasPlaying.current = playing;
    return () => { if (node?.open) node.close(); };
  }, [playing]);
  const content = <div className={`class-activity-hub${playing ? ' is-focused' : ''}`}>
    <header className="class-activity-header"><div><span className="class-activity-eyebrow">CHƠI VUI · HỌC CÙNG NHAU</span><h2>Trò chơi lớp học</h2><p>Một chút bất ngờ, thêm nhiều niềm vui cho tiết học.</p></div>
      <div className="class-activity-header-tools"><span className="class-activity-class"><Users size={17} /> Lớp {currentClass.name}</span>
        <button type="button" ref={playTrigger} className="btn btn-outline" disabled={busy} onClick={() => setPlaying(previous => !previous)}>{playing ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{playing ? 'Về thiết lập' : 'Màn hình chơi'}</button>
        <button type="button" className="btn btn-outline class-activity-sound" disabled={!soundEnabled} aria-label={localSound && soundEnabled ? 'Tắt âm thanh trò chơi' : 'Bật âm thanh trò chơi'} aria-pressed={Boolean(localSound && soundEnabled)} onClick={() => setLocalSound(previous => !previous)} title={!soundEnabled ? 'Âm thanh đang tắt trong cài đặt ứng dụng' : undefined}>{localSound && soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div></header>
    <div className="class-activity-tabs" role="tablist" aria-label="Chọn trò chơi">
      {games.map(({ id, name, tagline, icon: Icon }, index) => <button type="button" key={id} id={`${panelId}-${id}`} role="tab" tabIndex={state.game === id ? 0 : -1} aria-selected={state.game === id} aria-controls={panelId} disabled={busy} className={`class-activity-tab tab-${id}${state.game === id ? ' is-active' : ''}`} onClick={() => setState(previous => ({ ...previous, game: id }))} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || busy) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? games.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + games.length) % games.length;
        setState(previous => ({ ...previous, game: games[next].id }));
        document.getElementById(`${panelId}-${games[next].id}`)?.focus();
      }}>
        <span className="class-activity-tab-icon"><Icon size={24} /></span><span><strong>{name}</strong><small>{tagline}</small></span></button>)}
    </div>
    <ActivityRoster students={students} selectedIds={selectedIds} disabled={busy} onChange={ids => setState(previous => ({ ...previous, selectedIds: ids }))} />
    {!students.length && <p className="class-activity-empty">Lớp chưa có học sinh. Bạn vẫn có thể mở hộp quà nhiệm vụ; thêm học sinh trong phần quản lý lớp để gọi tên và chia nhóm.</p>}
    <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-${state.game}`}>
      {state.game === 'gifts' && <GiftBoxes {...gameProps} />}
      {state.game === 'train' && <ClassroomTrain {...gameProps} />}
      {state.game === 'treasure' && <TreasureMap {...gameProps} />}
    </div>
    <footer className="class-activity-footnote">Tiến độ được giữ tạm theo lớp và ngày trong phiên đang mở. Sao đã xác nhận được lưu vào dữ liệu của lớp.</footer>
  </div>;
  return playing && !embedded ? createPortal(<dialog ref={playDialog} className="class-activity-dialog is-playing" aria-label="Màn hình chơi lớp học" onCancel={event => { event.preventDefault(); setPlaying(false); }}>{content}</dialog>, document.body) : content;
}

export default function ClassroomActivities(props) {
  if (!props.currentClass) return <section className="class-activity-hub class-activity-empty"><Gift size={40} /><h2>Chọn lớp để bắt đầu trò chơi</h2><p>Danh sách người tham gia được lấy từ lớp bạn đang dạy.</p></section>;
  return <ActivitiesForClass key={props.currentClass.id} {...props} />;
}

