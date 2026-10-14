import { currentQuestion, TEAM_COLORS } from './arcadeState';
import { QuizAnswers } from './ArcadeWidgets';

export default function TugRaceAnswers({ round, busy, onAnswer, onSkip }) {
  const question = currentQuestion(round);
  return <section className="arcade-tug-race" aria-label="Hai bảng trả lời kéo co">
    <div className="arcade-race-question"><span>CÂU {round.prompt + 1} · CÙNG TRẢ LỜI</span><h4>{question.question}</h4><p>Tổ trả lời đúng trước kéo được một bước. Mỗi tổ có một lần chọn trong câu này.</p></div>
    <div className="arcade-race-panels">{round.teams.map((team, index) => <section key={index} style={{ '--team-color': TEAM_COLORS[index] }} aria-label={`Bảng trả lời ${team.name}`}><h4>{team.name}</h4><QuizAnswers question={question} disabled={busy || round.finished || round.attempts.includes(index)} onChoose={answer => onAnswer(index, answer)} />{round.attempts.includes(index) && <p role="status">Chưa đúng · Chờ câu tiếp theo</p>}</section>)}</div>
    <button type="button" className="arcade-text-button" disabled={busy || round.finished} onClick={onSkip}>Bỏ qua câu này · Không cộng điểm</button>
  </section>;
}
