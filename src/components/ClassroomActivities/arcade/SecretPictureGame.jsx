import { Eye, Lightbulb, Upload } from 'lucide-react';
import useArcadeGame from './useArcadeGame';
import usePuzzlePhoto from './usePuzzlePhoto';
import { nextTurn, scoreWinners } from './arcadeState';
import { SecretPicture } from './ArcadeArtwork';
import { ArcadeSetup, ChallengeCard, Countdown, RoundControls, Scoreboard, Victory } from './ArcadeWidgets';
import DialogService from '../../../services/DialogService';
import { DEVICE_QUIZ, FOLDER_QUIZ } from './referenceContent';
import './Arcade.css';

const PICTURES = { computer: 'Máy tính để bàn', keyboard: 'Bàn phím', mouse: 'Chuột máy tính', folder: 'Thư mục', custom: 'Ảnh của thầy cô' };

function uncover(round, tile, correct) {
  if (round.finished || round.boxes[tile] !== -1) return round;
  const boxes = round.boxes.map((old, i) => i === tile && correct ? 1 : old);
  const teams = round.teams.map((team, i) => i === round.turn && correct ? { ...team, score: team.score + 10 } : team);
  const finished = boxes.every(status => status === 1);
  const next = correct ? { ...round, turns: round.turns + 1, prompt: round.prompt + 1, pending: null } : nextTurn(round);
  return { ...next, boxes, teams, finished, awaitingGuess: correct && !finished, winners: finished ? scoreWinners(teams) : [],
    last: correct ? `${round.teams[round.turn].name} mở mảnh ${tile + 1} và nhận 10 điểm. Bức ảnh đang dần hiện ra!` : 'Chưa mở được mảnh này. Cùng thử ở lượt tiếp theo nhé!' };
}

export default function SecretPictureGame(props) {
  const game = useArcadeGame('puzzle', props);
  const photo = usePuzzlePhoto(props.storageKey);
  const round = game.round;
  const customReady = photo.photo && (!round || photo.photo.fingerprint === round.photoFingerprint);
  const pictureReady = !round || round.picture !== 'custom' || customReady;
  const revealTile = (tile, correct = true) => game.animate(() => game.change(old => uncover(old, tile, correct)));
  const choose = tile => {
    if (game.isBusy() || !pictureReady || round.finished || round.awaitingGuess || round.pending !== null || round.boxes[tile] !== -1) return;
    if (round.mode !== 'luck') game.change(old => old.pending === null ? { ...old, pending: tile } : old);
    else revealTile(tile);
  };
  const guess = () => {
    if (game.isBusy()) return;
    game.animate(() => game.change(old => {
      if (old.finished) return old;
      const bonus = 20 + old.boxes.filter(status => status === -1).length * 5;
      return { ...old, teams: old.teams.map((team, i) => i === old.turn ? { ...team, score: team.score + bonus } : team),
        finished: true, pending: null, winners: [old.turn], last: `${old.teams[old.turn].name} đoán đúng “${old.secret}” và nhận ${bonus} điểm thưởng!` };
    }));
  };
  const showPicture = async () => {
    if (game.isBusy() || !await DialogService.confirmAsync('Mở toàn bộ ảnh và kết thúc ván này? Thao tác này không chọn tổ thắng và không cộng điểm.')) return;
    game.change(old => ({ ...old, finished: true, pending: null, winners: [], last: `Đáp án là “${old.secret}”. Cảm ơn cả lớp đã cùng khám phá!` }));
  };
  const fileInput = expected => <label className="arcade-file-input"><Upload size={17} />{photo.loading ? 'Đang đọc ảnh…' : 'Chọn ảnh trên máy'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={photo.loading || game.busy} onChange={event => { const file = event.target.files[0]; event.target.value = ''; photo.load(file, expected); }} /></label>;
  return <div className="arcade arcade-puzzle">
    {!round ? <ArcadeSetup game={{ ...game, startDisabled: photo.loading || game.config.picture === 'custom' && (!photo.photo || !game.config.answer.trim()) }} title="Lật ảnh bí mật" description="Trả lời, mở mảnh ghép và khám phá bức tranh. Tổ nào đoán ra sớm nhất?" illustration={<SecretPicture kind="computer" />}
      onStart={() => game.start({ picture: game.config.picture, secret: game.config.picture === 'custom' ? game.config.answer.trim() : PICTURES[game.config.picture], photoName: game.config.picture === 'custom' ? photo.photo.name : '', photoFingerprint: game.config.picture === 'custom' ? photo.photo.fingerprint : '', awaitingGuess: false })}
      rules={['Chọn mảnh để mở; chế độ câu hỏi cần trả lời đúng trước.', 'Mở một mảnh nhận 10 điểm, rồi được đoán ảnh hoặc nhường lượt.', 'Đoán đúng: thắng ván, thưởng 20 điểm và 5 điểm mỗi mảnh còn che. Mở hết ảnh: tổ nhiều điểm nhất thắng.']}>
      <label>Ảnh cần đoán<select value={game.config.picture} onChange={event => game.setConfig({ ...game.config, picture: event.target.value })}>{Object.entries(PICTURES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      <label>Số mảnh ghép<select value={game.config.pieces} onChange={event => game.setConfig({ ...game.config, pieces: Number(event.target.value) })}><option value={4}>4 mảnh · Chơi nhanh</option><option value={12}>12 mảnh · Nhiều manh mối</option></select></label>
      {game.config.mode === 'quiz' && <button type="button" className="btn btn-outline btn-sm" onClick={() => game.setConfig({ ...game.config, quizQuestions: game.config.picture === 'folder' ? FOLDER_QUIZ : DEVICE_QUIZ })}>Dùng câu hỏi mẫu theo tranh</button>}
      {game.config.picture === 'custom' && <>{fileInput('')}{photo.photo && <p className="arcade-small">Đã chọn: {photo.photo.name}</p>}<label>Đáp án ảnh bí mật<input maxLength={100} value={game.config.answer} onChange={event => game.setConfig({ ...game.config, answer: event.target.value })} placeholder="Ví dụ: Một vườn hoa" /></label><p className="arcade-small">Ảnh tối đa 3 MB, chỉ giữ trong cửa sổ đang mở. Sau khi tải lại trang, cần chọn đúng ảnh để tiếp tục.</p></>}
      {photo.error && <p className="arcade-error" role="alert">{photo.error}</p>}
    </ArcadeSetup> : <>
      <Scoreboard round={round} />
      {!pictureReady ? <section className="arcade-missing-picture"><h3>Chọn lại ảnh để tiếp tục ván</h3><p>Ảnh “{round.photoName}” chỉ được giữ trong bộ nhớ cửa sổ. Điểm và các mảnh đã mở vẫn còn.</p>{fileInput(round.photoFingerprint)}{photo.error && <p className="arcade-error" role="alert">{photo.error}</p>}</section> : <>
        <div className={`arcade-play-layout${round.finished ? ' is-complete' : ''}`}><section className="arcade-picture-stage"><div className="arcade-stage-heading"><span className="arcade-eyebrow"><Lightbulb size={14} />BÍ MẬT SAU NHỮNG MẢNH GHÉP</span><h3>{round.finished ? round.secret : 'Em có nhận ra bức ảnh không?'}</h3><p>{round.boxes.filter(status => status === 1).length}/{round.boxes.length} mảnh đã mở{!round.finished && ` · Đến lượt ${round.teams[round.turn].name}`}</p></div>
          <div className="arcade-picture-board"><SecretPicture kind={round.picture} src={customReady ? photo.photo.src : undefined} /><div className={`arcade-picture-tiles${round.boxes.length === 4 ? ' has-four' : ''}`}>{round.boxes.map((status, index) => <button type="button" key={index} className={`arcade-picture-tile tile-color-${index % 4}${status === 1 || round.finished ? ' is-uncovered' : ''}${round.pending === index ? ' is-chosen' : ''}`} disabled={game.busy || round.finished || round.awaitingGuess || status === 1 || round.pending !== null} aria-label={`Mở mảnh ghép ${index + 1}${status === 1 ? ', đã mở' : ''}`} onClick={() => choose(index)}><span>{String(index + 1).padStart(2, '0')}</span><i aria-hidden="true">?</i></button>)}</div></div>
        </section>
        {!round.finished && <aside className="arcade-side-panel">{round.pending !== null && <ChallengeCard key={`${round.id}:${round.turns}:${round.prompt}`} round={round} busy={game.busy} onCorrect={() => revealTile(round.pending)} onMiss={() => revealTile(round.pending, false)} onChangeQuestion={() => game.change(old => ({ ...old, prompt: old.prompt + 1 }))} />}
          {round.pending === null && <div className="arcade-guess"><Lightbulb size={25} /><h4>Đã nhận ra bí mật?</h4><p>{round.awaitingGuess ? 'Tổ vừa mở mảnh được đoán trước! Xác nhận đúng hoặc nhường lượt.' : 'Nghe câu trả lời của tổ đang chơi rồi xác nhận.'}</p><button type="button" className="btn btn-primary" disabled={game.busy} onClick={guess}>Tổ đã đoán đúng!</button><button type="button" className="btn btn-outline" disabled={game.busy} onClick={() => game.change(old => ({ ...(old.awaitingGuess ? { ...old, turn: (old.turn + 1) % old.teams.length } : nextTurn(old)), awaitingGuess: false, last: 'Đổi lượt đoán. Cùng tìm thêm manh mối nào!' }))}>Chưa đoán đúng · Đổi lượt</button><button type="button" className="arcade-text-button" disabled={game.busy} onClick={showPicture}><Eye size={15} />Mở ảnh và kết thúc</button></div>}
        </aside>}
        </div><p className="arcade-announcement" role="status">{game.busy ? 'Một mảnh ghép đang hé mở…' : round.last}</p>
      </>}
      {round.finished && <Victory round={round} {...props} />}
      <RoundControls game={game} participants={props.participants} />
    </>}
    <Countdown motion={game.motion} />
  </div>;
}
