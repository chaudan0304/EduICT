import { Gift, Sparkles } from 'lucide-react';
import useArcadeGame from './useArcadeGame';
import { nextTurn, scoreWinners, TEAM_COLORS } from './arcadeState';
import { GiftArtwork, RobotAvatar } from './ArcadeArtwork';
import { ArcadeSetup, ChallengeCard, Countdown, RoundControls, Scoreboard, Victory } from './ArcadeWidgets';
import './Arcade.css';
import { useState } from 'react';

const COLORS = ['#ec7896', '#63a6df', '#e6b755', '#8d94d6', '#65b7a5', '#e98b66'];
const LOOT = [10, 20, 30, 10, 20, 30, 20, 40, 10, 'together', 'double', 'double'];
const lootLabel = index => LOOT[index] === 'together' ? 'Quà chung' : LOOT[index] === 'double' ? 'Vé ×2' : `+${LOOT[index]}`;

function resolveGift(round, box, correct) {
  if (round.finished || round.boxes[box] !== -1) return round;
  const boxes = round.boxes.map((old, i) => i === box ? correct ? 1 : 0 : old);
  const loot = LOOT[round.deck[box]];
  const team = round.teams[round.turn];
  let teams = round.teams;
  let last = `${team.name} đã thử sức. Hộp này khép lại, cơ hội vẫn còn ở lượt sau!`;
  if (correct && loot === 'together') {
    teams = teams.map(item => ({ ...item, score: item.score + 10 }));
    last = 'Món quà sẻ chia! Tất cả các tổ cùng nhận 10 điểm ván.';
  } else if (correct) {
    const points = (loot === 'double' ? 10 : loot) * (team.boost ? 2 : 1);
    teams = teams.map((item, i) => i === round.turn ? { ...item, score: item.score + points, boost: loot === 'double' } : item);
    last = loot === 'double' ? `${team.name} nhận ${points} điểm và vé nhân đôi hộp điểm cá nhân tiếp theo!` : `${team.name} nhận ${points} điểm${team.boost ? ' nhờ vé nhân đôi' : ''}! Cùng cổ vũ nào!`;
  }
  const finished = boxes.every(status => status !== -1);
  return { ...nextTurn(round), boxes, teams, finished, winners: finished ? scoreWinners(teams) : [], last };
}

export default function MagicGifts(props) {
  const game = useArcadeGame('gifts', props);
  const [opening, setOpening] = useState(null);
  const round = game.round;
  const reveal = (box, correct = true) => {
    if (game.isBusy()) return;
    setOpening(box);
    game.animate(() => { game.change(old => resolveGift(old, box, correct)); setOpening(null); });
  };
  const choose = box => {
    if (game.isBusy() || round.finished || round.pending !== null || round.boxes[box] !== -1) return;
    if (round.mode === 'questions') game.change(old => old.pending === null ? { ...old, pending: box, last: `Hộp ${box + 1} đang chờ ${old.teams[old.turn].name} hoàn thành thử thách.` } : old);
    else reveal(box);
  };
  return <div className="arcade arcade-gifts">
    {!round ? <ArcadeSetup game={game} title="Hộp quà kỳ diệu" description="Một sân khấu, mười hai hộp quà. Ai sẽ tìm thấy món quà bất ngờ nhất?" onStart={() => game.start()}
      illustration={<div className="arcade-gift-preview"><GiftArtwork color="#63a6df" /><GiftArtwork color="#ec7896" opened /><GiftArtwork color="#e6b755" /></div>}
      rules={['Lần lượt chọn hộp. Mỗi tổ có số lượt bằng nhau trong 12 hộp.', 'Hộp điểm, quà sẻ chia và vé nhân đôi tạo bất ngờ đến phút cuối.', 'Chế độ câu hỏi: trả lời đúng rồi mới được nhận quà.']} /> : <>
      <Scoreboard round={round} />
      <div className={`arcade-play-layout${round.finished ? ' is-complete' : ''}`}>
      <section className="arcade-gift-stage"><div className="arcade-stage-heading"><span className="arcade-eyebrow"><Sparkles size={14} />LỄ HỘI NHỮNG ĐIỀU BẤT NGỜ</span><h3>{round.finished ? 'Mười hai món quà, thật nhiều niềm vui!' : `${round.teams[round.turn].name} ơi, chọn một hộp quà!`}</h3><p>{round.turns}/12 hộp đã mở · {round.mode === 'questions' ? 'Hoàn thành thử thách để nhận quà' : 'Cùng chờ xem điều kỳ diệu nào'}</p></div>
        <div className="arcade-gift-board">{round.boxes.map((status, index) => <button type="button" key={index} className={`arcade-gift-box${opening === index ? ' is-opening' : ''}${round.pending === index ? ' is-chosen' : ''}${status !== -1 ? ' is-revealed' : ''}`}
          disabled={game.busy || round.finished || status !== -1 || round.pending !== null} onClick={() => choose(index)} aria-label={`Hộp quà ${index + 1}${status === 1 ? `, ${lootLabel(round.deck[index])}` : status === 0 ? ', đã khép lại' : ''}`}>
          <GiftArtwork color={COLORS[index % COLORS.length]} opened={status !== -1} missed={status === 0} /><span>{status === 1 ? lootLabel(round.deck[index]) : status === 0 ? 'Hẹn lượt sau' : `Hộp ${String(index + 1).padStart(2, '0')}`}</span>
        </button>)}</div>
      </section>
      {!round.finished && <aside className="arcade-side-panel">{round.pending !== null ? <ChallengeCard key={`${round.id}:${round.prompt}:${round.pending}`} round={round} busy={game.busy} onCorrect={() => reveal(round.pending)} onMiss={() => reveal(round.pending, false)} onChangeQuestion={() => game.change(old => ({ ...old, prompt: old.prompt + 1 }))} /> : <div className="arcade-cheer"><RobotAvatar color={TEAM_COLORS[round.turn]} happy /><h4>Cổ vũ {round.teams[round.turn].name}!</h4><p>Một lựa chọn, một điều bất ngờ.</p><ul><li>Quà điểm: từ 10 đến 40</li><li>Quà chung: tất cả tổ +10</li><li>Vé ×2: +10, nhân đôi hộp điểm cá nhân tiếp theo</li></ul></div>}</aside>}
      </div>
      <p className="arcade-announcement" role="status"><Gift size={18} />{opening !== null ? 'Ánh sáng lóe lên… Món quà sắp xuất hiện!' : round.last}</p>
      {round.finished && <Victory round={round} {...props} />}
      <RoundControls game={game} participants={props.participants} />
    </>}
    <Countdown motion={game.motion} />
  </div>;
}
