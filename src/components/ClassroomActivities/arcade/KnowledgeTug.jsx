import { Flag, Sparkles } from 'lucide-react';
import useArcadeGame from './useArcadeGame';
import { nextTurn } from './arcadeState';
import { TugScene } from './ArcadeArtwork';
import { ArcadeSetup, ChallengeCard, Countdown, RoundControls, Scoreboard, Victory } from './ArcadeWidgets';
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
  return { ...nextTurn(round), turns, position, teams, finished, winners, last };
}

export default function KnowledgeTug(props) {
  const game = useArcadeGame('tug', props);
  const round = game.round;
  const act = amount => game.animate(() => game.change(old => pull(old, amount)));
  return <div className="arcade arcade-tug">
    {!round ? <ArcadeSetup game={game} title="Kéo co kiến thức" description="Hai biệt đội robot, một sợi dây. Cùng hợp sức đưa lá cờ về phía tổ mình!" onStart={() => game.start()} illustration={<TugScene position={0} />}
      rules={['Hai tổ thay phiên nhau. Trả lời đúng kéo được 1 bước.', 'Chơi may mắn: mỗi lượt kéo ngẫu nhiên 1 hoặc 2 bước.', 'Kéo cờ tới vạch 4 bước để thắng sớm. Sau 8 lượt, tổ đang dẫn thắng; cân bằng là hòa.']} /> : <>
      <Scoreboard round={round} />
      <div className={`arcade-play-layout${round.finished ? ' is-complete' : ''}`}>
      <section className="arcade-tug-stage"><div className="arcade-stage-heading"><span className="arcade-eyebrow"><Flag size={14} />ĐẤU TRƯỜNG HỢP SỨC</span><h3>{round.finished ? 'Một trận đấu thật tuyệt vời!' : `Sẵn sàng kéo nào, ${round.teams[round.turn].name}!`}</h3><p>Lượt {Math.min(round.turns + 1, 8)}/8 · Chạm vạch 4 bước để thắng sớm</p></div>
        <div className="arcade-tug-labels"><strong>{round.teams[0].name}</strong><span>CỜ CHIẾN THẮNG</span><strong>{round.teams[1].name}</strong></div>
        <TugScene position={round.position} moving={game.busy} />
        <div className="arcade-tug-meter" aria-label={`Vị trí dây: ${round.position}`}><span>← Tổ xanh</span>{Array.from({ length: 9 }, (_, i) => <i key={i} className={i === 4 - round.position ? 'is-marker' : ''}>{i === 4 - round.position ? '⚑' : '·'}</i>)}<span>Tổ đỏ →</span></div>
      </section>
      {!round.finished && <aside className="arcade-side-panel">{round.mode === 'questions' ? <ChallengeCard key={`${round.id}:${round.turns}:${round.prompt}`} round={round} busy={game.busy} onCorrect={() => act(1)} onMiss={() => act(0)} onChangeQuestion={() => game.change(old => ({ ...old, prompt: old.prompt + 1 }))} /> : <div className="arcade-cheer"><Sparkles size={38} /><h4>Đồng đội ơi, cùng kéo!</h4><p>Mỗi lượt có thể kéo được 1 hoặc 2 bước. Chỉ có 8 lượt, cùng chờ bất ngờ!</p><button type="button" className="btn btn-primary arcade-luck-pull" disabled={game.busy} onClick={() => { if (!game.isBusy()) act(Math.random() < .5 ? 1 : 2); }}><Sparkles size={20} />Kéo may mắn</button></div>}</aside>}
      </div><p className="arcade-announcement" role="status">{game.busy ? 'Một, hai… cùng kéo!' : round.last}</p>
      {round.finished && <Victory round={round} {...props} title={round.winners.length ? undefined : 'Hai tổ hòa nhau!'} />}
      <RoundControls game={game} participants={props.participants} />
    </>}
    <Countdown motion={game.motion} />
  </div>;
}
