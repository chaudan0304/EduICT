import { useEffect, useRef, useState } from 'react';
import { Check, HelpCircle, Play, RotateCcw, Sparkles, Trophy, Undo2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import ClassStarExtraControls from '../../ClassStars/ClassStarExtraControls';
import { soundEffects } from '../../../utils/audio';
import { currentQuestion, TEAM_COLORS } from './arcadeState';
import { isQuiz, readQuiz } from './referenceContent';

export function ArcadeSetup({ game, title, description, rules, children, onStart, illustration }) {
  const config = game.config;
  const quiz = isQuiz(config.mode) ? readQuiz(config.quizQuestions) : null;
  return <div className="arcade-preparation">
    <section className="arcade-setup-copy"><span className="arcade-eyebrow">SẴN SÀNG CHƠI CÙNG LỚP</span><h3>{title}</h3><p>{description}</p>{illustration && <div className="arcade-setup-art">{illustration}</div>}<ol>{rules.map(rule => <li key={rule}>{rule}</li>)}</ol><p className="arcade-small">Tự chia đều học sinh tham gia vào các tổ khi bắt đầu. Thầy cô có thể tổ chức trả lời ngay tại chỗ.</p></section>
    <section className="arcade-settings" aria-label="Thiết lập ván chơi"><fieldset disabled={game.busy}>
      <div className="arcade-setting-row"><label>Cách chơi<select value={config.mode} onChange={event => game.setConfig({ ...config, mode: event.target.value })}><option value="luck">Chơi nhanh · May mắn</option><option value="questions">Hỏi miệng · Thầy cô xác nhận</option>{game.kind === 'puzzle' && <option value="quiz">Trắc nghiệm · Chọn đáp án</option>}{game.kind === 'tug' && <option value="race">Thi đua · Hai bảng đáp án</option>}</select></label>
        <label>Số tổ<select value={config.teamCount} disabled={game.kind === 'tug'} onChange={event => game.setConfig({ ...config, teamCount: Number(event.target.value) })}>{(game.kind === 'tug' ? [2] : game.kind === 'puzzle' ? [1, 2, 3, 4] : [2, 3, 4]).map(n => <option key={n} value={n}>{n === 1 ? 'Cả lớp cùng chơi' : `${n} tổ`}</option>)}</select></label></div>
      <div className="arcade-team-fields">{config.names.slice(0, config.teamCount).map((name, i) => <label key={i}>Tên tổ {i + 1}<input maxLength={32} value={name} onChange={event => game.setConfig({ ...config, names: config.names.map((old, index) => index === i ? event.target.value : old) })} /></label>)}</div>
      {children}
      {config.mode === 'questions' && <details className="arcade-question-editor"><summary>Soạn câu hỏi và gợi ý trả lời</summary><label>Mỗi dòng: Câu hỏi | Gợi ý đáp án<textarea rows={5} maxLength={12000} value={config.questions} onChange={event => game.setConfig({ ...config, questions: event.target.value })} /></label><p>Đọc tối đa 24 dòng đầu. Để trống nếu thầy cô muốn hỏi miệng.</p></details>}
      {quiz && <details className="arcade-question-editor"><summary>Bộ trắc nghiệm · {quiz.questions.length} câu</summary><label>Mỗi dòng: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | B<textarea rows={6} maxLength={20000} value={config.quizQuestions} onChange={event => game.setConfig({ ...config, quizQuestions: event.target.value })} /></label><p>2–4 lựa chọn; chữ cái cuối dòng là đáp án đúng. Tối đa 24 câu. Thầy cô có thể sửa ngay tại đây.</p></details>}
      {quiz?.errors.length > 0 && <p className="arcade-error" role="alert">{quiz.errors[0]}</p>}
    </fieldset><button type="button" className="btn btn-primary arcade-start" disabled={game.busy || game.startDisabled || Boolean(quiz?.errors.length)} onClick={onStart}><Play size={19} />{game.busy ? 'Chuẩn bị xuất phát…' : 'Bắt đầu ván chơi'}</button></section>
  </div>;
}

export function Countdown({ motion }) {
  if (typeof motion !== 'number') return null;
  return <div className="arcade-countdown" role="status"><span>Chuẩn bị nào!</span><strong key={motion}>{motion}</strong><span>Cùng cổ vũ cho các tổ</span></div>;
}

export function Scoreboard({ round }) {
  return <div className="arcade-scoreboard" aria-label="Điểm trong ván chơi">{round.teams.map((team, i) => <div key={i} className={`arcade-team-score${(round.mode === 'race' || round.turn === i) && !round.finished ? ' is-turn' : ''}`} style={{ '--team-color': TEAM_COLORS[i] }}>
    <span className="arcade-team-dot" /><div><strong>{team.name}</strong><small>{round.finished ? round.winners.includes(i) ? 'Về đích!' : 'Cảm ơn các bạn' : round.mode === 'race' ? 'Cùng tranh tài' : round.turn === i ? 'Đến lượt tổ mình' : `${team.ids.length} học sinh`}{team.boost ? ' · Hộp tiếp ×2' : ''}</small></div><b>{team.score}<small>điểm</small></b></div>)}</div>;
}

export function ChallengeCard({ round, busy, onCorrect, onMiss, onChangeQuestion }) {
  const [answerShown, setAnswerShown] = useState(false);
  const question = currentQuestion(round);
  return <section className="arcade-challenge" aria-label="Câu hỏi của lượt này"><div className="arcade-challenge-heading"><span><HelpCircle size={16} />Thử thách của {round.teams[round.turn].name}</span><span>Câu {round.prompt + 1}</span></div>
    <h4>{question.question}</h4>
    {question.options ? <QuizAnswers question={question} disabled={busy} onChoose={index => index === question.correct ? onCorrect() : onMiss()} /> : <>
      {question.answer && <><button type="button" className="arcade-text-button" disabled={busy} onClick={() => setAnswerShown(previous => !previous)}>{answerShown ? 'Ẩn gợi ý đáp án' : 'Hiện gợi ý đáp án'}</button>{answerShown && <p className="arcade-answer">{question.answer}</p>}</>}
      <div className="arcade-challenge-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={onCorrect}><Check size={17} />Đúng · Tiếp tục</button><button type="button" className="btn btn-outline" disabled={busy} onClick={onMiss}><X size={17} />Chưa đúng · Đổi lượt</button></div></>}
    <button type="button" className="arcade-text-button" disabled={busy} onClick={onChangeQuestion}>Đổi câu hỏi</button>
  </section>;
}

export function QuizAnswers({ question, disabled, onChoose }) {
  return <div className="arcade-quiz-answers">{question.options.map((option, index) => <button type="button" key={index} disabled={disabled} onClick={() => onChoose(index)}><b>{'ABCD'[index]}</b><span>{option}</span></button>)}</div>;
}

export function RoundControls({ game, participants = [] }) {
  const names = new Map(participants.map(student => [String(student.id), student.name]));
  return <><div className="arcade-round-controls"><button type="button" className="btn btn-outline btn-sm" disabled={game.busy || !game.history.length} onClick={game.undo}><Undo2 size={16} />Hoàn tác lượt</button><button type="button" className="btn btn-outline btn-sm" disabled={game.busy} onClick={game.reset}><RotateCcw size={16} />Ván mới</button><span>Hoàn tác chỉ thay đổi điểm ván, không hoàn tác sao đã thưởng.</span></div>
    <details className="arcade-team-roster"><summary>Thành viên từng tổ</summary><p>Các tổ được chia ngẫu nhiên từ học sinh tham gia lúc bắt đầu ván. Các em có thể trả lời ngay tại chỗ.</p><div>{game.round.teams.map((team, index) => <section key={index}><h4>{team.name}</h4><p>{team.ids.map(id => names.get(id)).filter(Boolean).join(' · ') || 'Chơi bằng điểm tổ, chưa có học sinh trong tổ.'}</p></section>)}</div></details></>;
}

export function Victory({ round, currentClass, participants, soundEnabled, title }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (soundEnabled) soundEffects.playVictory();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fire = confetti.create(canvas.current, { resize: true, useWorker: false });
    fire({ particleCount: 65, spread: 85, origin: { y: .7 }, colors: ['#ffc759', '#39b7b1', '#58a6f4', '#f47b8e'] });
    return () => fire.reset();
  }, [soundEnabled]);
  const eligible = new Set(participants.map(student => String(student.id)));
  return <section className="arcade-victory" aria-label="Kết quả ván chơi"><canvas ref={canvas} className="arcade-confetti" aria-hidden="true" /><Trophy size={32} /><div><span>VÁN CHƠI ĐÃ HOÀN THÀNH</span><h3>{title || (round.winners.length === 1 ? `${round.teams[round.winners[0]].name} chiến thắng!` : round.winners.length > 1 ? 'Các tổ cùng tỏa sáng!' : 'Cảm ơn cả lớp đã cùng chơi!')}</h3><p>{round.last}</p></div>
    <div className="arcade-awards">{round.winners.map(index => {
      const team = round.teams[index]; const ids = team.ids.filter(id => eligible.has(id));
      return ids.length > 0 && <ClassStarExtraControls key={index} currentClass={currentClass} initialSelectedStudentIds={ids} triggerLabel={`Thưởng sao cho ${team.name}`} defaultReason="Hoàn thành trò chơi lớp học" />;
    })}</div><small><Sparkles size={13} />Điểm ván không phải sao học sinh. Chỉ ghi sao khi thầy cô xác nhận trong cửa sổ thưởng.</small>
  </section>;
}
