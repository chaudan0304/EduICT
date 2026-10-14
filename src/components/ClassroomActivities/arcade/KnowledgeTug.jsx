import { Sparkles } from 'lucide-react';
import useArcadeGame from './useArcadeGame';
import { nextTurn } from './arcadeState';
import { TugScene } from './ArcadeArtwork';
import { ArcadeSetup, ChallengeCard, Countdown, RoundControls, Scoreboard, Victory } from './ArcadeWidgets';
import TugField from './TugField';
import TugRaceAnswers from './TugRaceAnswers';
import { currentQuestion } from './arcadeState';
import './Arcade.css';

function pull(round, amount) {
  if (round.finished) return round;
  const position = Math.max(-4, Math.min(4, round.position + (round.turn === 0 ? amount : -amount)));
  const teams = round.teams.map((team, i) => i === round.turn ? { ...team, score: team.score + amount * 10 } : team);
  const turns = round.turns + 1;
  const finished = Math.abs(position) === 4 || turns >= 8;
  const winners = finished ? position > 0 ? [0] : position < 0 ? [1] : [] : [];
  let last = amount ? `${round.teams[round.turn].name} kéo được ${amount} bước!` : `${round.teams[round.turn].name} chưa kéo được bước nào. Lượt tiếp theo vẫn còn cơ hội!`;
  if (finished) last = position === 0 ? 'Hết 8 lượt, hai tổ giữ dây cân bằng. Một trận hòa thật nỗ lực!' : `${teams[winners[0]].name} đưa cờ về phía mình${Math.abs(position) === 4 ? ' đến vạch chiến thắng' : ' sau 8 lượt'}!`;
  return { ...nextTurn(round), turns, position, teams, finished, winners, attempts: [], last };
}

export default function KnowledgeTug(props) {
  const game = useArcadeGame('tug', props);
  const round = game.round;
  const act = amount => game.animate(() => game.change(old => pull(old, amount)));
  const raceAnswer = (team, answer) => {
    if (game.isBusy() || round.finished || round.attempts.includes(team)) return;
    if (answer === currentQuestion(round).correct) {
      game.animate(() => game.change(old => old.finished || old.attempts.includes(team) ? old : pull({ ...old, turn: team }, 1)));
    } else {
      game.change(old => {
        if (old.finished || old.attempts.includes(team)) return old;
        if (old.attempts.length === 1) {
          const next = pull(old, 0);
          return { ...next, last: next.finished ? next.last : 'Hai tổ chưa chọn đúng. Cùng thử sức với câu tiếp theo!' };
        }
        return { ...old, attempts: [...old.attempts, team], last: `${old.teams[team].name} chưa chọn đúng. Tổ còn lại vẫn có cơ hội!` };
      });
    }
  };
  return <div className="arcade arcade-tug">
    {!round ? <ArcadeSetup game={game} title="Kéo co kiến thức" description="Hai biệt đội robot, một sợi dây. Cùng hợp sức đưa lá cờ về phía tổ mình!" onStart={() => game.start()} illustration={<TugScene position={0} />}
      rules={['Thi đua trắc nghiệm: mỗi tổ có một lần chọn, tổ đúng trước kéo 1 bước. Thầy cô bấm đáp án thay tổ hoặc hai bạn cùng chọn trên bảng cảm ứng.', 'Có thể đổi sang hỏi miệng theo lượt hoặc kéo may mắn 1–2 bước.', 'Kéo cờ tới vạch 4 bước để thắng sớm. Sau 8 lượt, tổ đang dẫn thắng; cân bằng là hòa.']} /> : <>
      <Scoreboard round={round} />
      <div className={`arcade-play-layout${round.mode === 'race' ? ' arcade-race-layout' : ''}${round.finished ? ' is-complete' : ''}`}>
      <TugField round={round} busy={game.busy} />
      {!round.finished && (round.mode === 'race' ? <TugRaceAnswers round={round} busy={game.busy} onAnswer={raceAnswer} onSkip={() => act(0)} /> : <aside className="arcade-side-panel">{round.mode === 'questions' ? <ChallengeCard key={`${round.id}:${round.turns}:${round.prompt}`} round={round} busy={game.busy} onCorrect={() => act(1)} onMiss={() => act(0)} onChangeQuestion={() => game.change(old => ({ ...old, prompt: old.prompt + 1 }))} /> : <div className="arcade-cheer"><Sparkles size={38} /><h4>Đồng đội ơi, cùng kéo!</h4><p>Mỗi lượt có thể kéo được 1 hoặc 2 bước. Chỉ có 8 lượt, cùng chờ bất ngờ!</p><button type="button" className="btn btn-primary arcade-luck-pull" disabled={game.busy} onClick={() => { if (!game.isBusy()) act(Math.random() < .5 ? 1 : 2); }}><Sparkles size={20} />Kéo may mắn</button></div>}</aside>)}
      </div><p className="arcade-announcement" role="status">{game.busy ? 'Một, hai… cùng kéo!' : round.last}</p>
      {round.finished && <Victory round={round} {...props} title={round.winners.length ? undefined : 'Hai tổ hòa nhau!'} />}
      <RoundControls game={game} participants={props.participants} />
    </>}
    <Countdown motion={game.motion} />
  </div>;
}
