import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useActivityState } from '../activityState';
import useRoomMicrophone from './useRoomMicrophone';
import ClassStarExtraControls from '../../ClassStars/ClassStarExtraControls';
import DialogService from '../../../services/DialogService';
import './Arcade.css';

const initial = { mode: 'manual', sensitivity: 50, simulated: 15, threshold: 45, duration: 10, milestones: 0 };
const normalize = value => ({ mode: value?.mode === 'microphone' ? 'microphone' : 'manual',
  sensitivity: Number.isInteger(value?.sensitivity) && value.sensitivity >= 10 && value.sensitivity <= 100 ? value.sensitivity : 50,
  simulated: Number.isInteger(value?.simulated) && value.simulated >= 0 && value.simulated <= 100 ? value.simulated : 15,
  threshold: Number.isInteger(value?.threshold) && value.threshold >= 20 && value.threshold <= 80 ? value.threshold : 45,
  duration: [10, 20, 30, 60].includes(value?.duration) ? value.duration : 10,
  milestones: Number.isSafeInteger(value?.milestones) && value.milestones >= 0 ? value.milestones : 0 });

function DragonIllustration({ awake }) {
  return <svg viewBox="0 0 400 280" className={`dragon-illustration${awake ? ' is-awake' : ''}`} aria-hidden="true"><ellipse cx="196" cy="248" rx="153" ry="18" fill="#c5dace" /><path d="M291 214q93 2 58-90 6 61-70 47" fill="#5da68a" /><path d="m123 125-33-38 59 12m20-21 23-47 15 60m34 12 38-35-12 67" fill="#f4c574" /><ellipse cx="207" cy="177" rx="99" ry="73" fill="#64ad8c" /><ellipse cx="183" cy="195" rx="57" ry="50" fill="#c1df9c" /><path d="m240 143 55-51 1 73-44 22Z" fill="#8bc7b0" stroke="#519b7b" strokeWidth="7" /><path d="M102 133q-38 7-35 46t63 26q44-6 54-40t-27-47Z" fill="#78bd9a" /><ellipse cx="85" cy="175" rx="9" ry="6" fill="#3f7765" /><path d={awake ? 'm119 147 6-6 7 6' : 'm115 146q10 9 20 0'} fill="none" stroke="#315c50" strokeWidth="5" strokeLinecap="round" /><path d="M78 188q18 12 36 0" fill="none" stroke="#315c50" strokeWidth="4" strokeLinecap="round" /><ellipse cx="128" cy="235" rx="36" ry="15" fill="#509b7d" /><ellipse cx="253" cy="235" rx="38" ry="15" fill="#509b7d" /><text x="40" y="80" fill="#5b7e96" fontSize="35" fontWeight="700">{awake ? '♪' : 'Z'}</text><text x="80" y="55" fill="#8ba7b9" fontSize="23" fontWeight="700">{awake ? '♫' : 'z'}</text></svg>;
}

export default function SleepingDragon({ storageKey, currentClass, participants }) {
  const [state, setState] = useActivityState(`${storageKey}:sleeping-dragon-v1`, initial, normalize);
  const microphone = useRoomMicrophone(state.sensitivity);
  const [running, setRunning] = useState(false); const [progress, setProgress] = useState(0);
  const elapsed = useRef(0); const previousTime = useRef(0); const latest = useRef(null);
  const volume = state.mode === 'microphone' ? microphone.level : state.simulated;
  const ready = state.mode === 'manual' || microphone.status === 'on';
  const quiet = volume < state.threshold;
  const loud = volume >= Math.min(95, state.threshold + 25);
  useEffect(() => { latest.current = { running, ready, quiet, duration: state.duration }; }, [running, ready, quiet, state.duration]);
  useEffect(() => {
    const pause = () => { if (document.hidden) { elapsed.current = 0; previousTime.current = 0; setRunning(false); setProgress(0); } };
    document.addEventListener('visibilitychange', pause);
    const timer = setInterval(() => {
      const now = performance.now(); const info = latest.current;
      const gap = previousTime.current ? now - previousTime.current : 0; previousTime.current = now;
      if (!info?.running || !info.ready || !info.quiet || document.hidden || gap > 1500) { elapsed.current = 0; setProgress(0); return; }
      elapsed.current += gap;
      if (elapsed.current >= info.duration * 1000) {
        elapsed.current = 0;
        setState(previous => ({ ...previous, milestones: previous.milestones + 1 }));
      }
      setProgress(Math.floor(elapsed.current / 1000));
    }, 250);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pause); };
  }, [setState]);
  const pause = () => { setRunning(false); elapsed.current = 0; setProgress(0); };
  const stopMic = () => { pause(); microphone.stop(); };
  const set = (key, value) => { pause(); setState(previous => ({ ...previous, [key]: value })); };
  const reset = async () => {
    if (!await DialogService.confirmAsync('Đặt lại các mốc yên tĩnh của hoạt động này? Sao học sinh đã xác nhận vẫn giữ nguyên.')) return;
    pause(); setState(previous => ({ ...previous, milestones: 0 }));
  };
  return <div className="arcade arcade-dragon"><div className="dragon-layout">
    <section className={`dragon-stage${loud && ready ? ' is-noisy' : ''}`}><span className="arcade-eyebrow">NÓI NHỎ THÔI · CÙNG GIỮ RỒNG NGỦ</span><h3>{!ready ? 'Kết nối micro để bắt đầu' : quiet ? 'Rồng đang ngủ ngon…' : loud ? 'Rồng thức rồi, cùng nói nhỏ nhé!' : 'Rồng đang cựa mình…'}</h3><DragonIllustration awake={!quiet && ready} /><p>Thảo luận nhẹ nhàng, cùng giúp rồng nghỉ ngơi.</p>
      <div className="dragon-meter-label"><span>{state.mode === 'manual' ? 'Mức thầy cô điều khiển' : 'Mức âm thanh tương đối'}</span><strong>{ready ? volume : '—'}/100</strong></div><meter min="0" max="100" value={ready ? volume : 0} low={state.threshold} high={Math.min(95, state.threshold + 25)} optimum={0} aria-label="Mức âm thanh tương đối" />
      <div className="dragon-progress"><span>{running && ready ? `${progress}/${state.duration} giây yên tĩnh liên tục` : 'Đang tạm dừng tính mốc'}</span><progress max={state.duration} value={progress} aria-label="Tiến độ yên tĩnh" /></div>
      <div className="dragon-milestones" role="status"><Sparkles size={21} /><strong>{state.milestones}</strong> mốc yên tĩnh</div>
    </section>
    <section className="arcade-settings dragon-settings" aria-label="Điều khiển rồng ngủ"><h3>Nhịp hoạt động của lớp</h3><label>Cách điều khiển<select value={state.mode} onChange={event => { stopMic(); set('mode', event.target.value); }}><option value="manual">Thầy cô điều khiển · Không cần micro</option><option value="microphone">Đo bằng micro</option></select></label>
      {state.mode === 'manual' ? <label>Mức âm thanh: {state.simulated}<input type="range" min="0" max="100" value={state.simulated} onChange={event => setState(previous => ({ ...previous, simulated: Number(event.target.value) }))} /></label> : <><p className="arcade-small">Chỉ đo khi bật micro. Không ghi âm, lưu hoặc gửi âm thanh. Tắt micro khi rời trò chơi hoặc ẩn trang.</p><button type="button" className="btn btn-outline" onClick={microphone.status === 'off' ? () => { pause(); microphone.start(); } : stopMic}>{microphone.status === 'off' ? <Mic size={17} /> : <MicOff size={17} />}{microphone.status === 'on' ? 'Tắt micro' : microphone.status === 'asking' ? 'Hủy kết nối micro' : 'Bật micro'}</button><label>Độ nhạy: {state.sensitivity}<input type="range" min="10" max="100" value={state.sensitivity} onChange={event => set('sensitivity', Number(event.target.value))} /></label>{microphone.error && <p className="arcade-error" role="alert">{microphone.error}</p>}</>}
      <label>Ngưỡng ngủ yên: dưới {state.threshold}<input type="range" min="20" max="80" value={state.threshold} onChange={event => set('threshold', Number(event.target.value))} /></label><label>Thời gian cho một mốc<select value={state.duration} onChange={event => set('duration', Number(event.target.value))}>{[10, 20, 30, 60].map(seconds => <option key={seconds} value={seconds}>{seconds} giây liên tục</option>)}</select></label>
      <button type="button" className="btn btn-primary arcade-start" disabled={!ready} onClick={() => { if (running) pause(); else { previousTime.current = performance.now(); setRunning(true); } }}>{running ? <Pause size={18} /> : <Play size={18} />}{running ? 'Tạm dừng hoạt động' : 'Bắt đầu tính mốc'}</button><button type="button" className="arcade-text-button" onClick={reset}><RotateCcw size={15} />Đặt lại mốc</button>
      {state.milestones > 0 && participants.length > 0 && <ClassStarExtraControls currentClass={currentClass} initialSelectedStudentIds={participants.map(student => String(student.id))} defaultReason="Cả lớp phối hợp giữ trật tự" triggerLabel="Thưởng sao cho lớp" />}
      <p className="arcade-small">Mốc hoạt động không phải sao học sinh. Mức âm thanh là chỉ báo tương đối, không phải số đo dB. Cần yên tĩnh liên tục; quá ngưỡng hoặc tạm dừng sẽ tính lại từ đầu.</p>
    </section></div>
  </div>;
}
