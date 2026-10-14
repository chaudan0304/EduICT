import { Flag } from 'lucide-react';
import { TugScene } from './ArcadeArtwork';

export default function TugField({ round, busy }) {
  return <section className="arcade-tug-stage"><div className="arcade-stage-heading"><span className="arcade-eyebrow"><Flag size={14} />ĐẤU TRƯỜNG HỢP SỨC</span><h3>{round.finished ? 'Một trận đấu thật tuyệt vời!' : round.mode === 'race' ? 'Hai tổ ơi, cùng tranh tài!' : `Sẵn sàng kéo nào, ${round.teams[round.turn].name}!`}</h3><p>Lượt {Math.min(round.turns + 1, 8)}/8 · Chạm vạch 4 bước để thắng sớm</p></div>
    <div className="arcade-tug-labels"><strong>{round.teams[0].name}</strong><span>CỜ CHIẾN THẮNG</span><strong>{round.teams[1].name}</strong></div>
    <TugScene position={round.position} moving={busy} />
    <div className="arcade-tug-meter" aria-label={`Vị trí dây: ${round.position}`}><span>← Tổ xanh</span>{Array.from({ length: 9 }, (_, i) => <i key={i} className={i === 4 - round.position ? 'is-marker' : ''}>{i === 4 - round.position ? '⚑' : '·'}</i>)}<span>Tổ đỏ →</span></div>
  </section>;
}
