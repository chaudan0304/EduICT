import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  RotateCcw, 
  Award, 
  Star, 
  Sparkles, 
  Check, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

const WHEEL_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#f97316', '#14b8a6', '#e11d48', '#3b82f6',
  '#6366f1', '#0ea5e9', '#84cc16', '#d946ef', '#0284c7'
];

export default function LuckyWheel({ 
  currentClass, 
  onUpdateStudents, 
  soundEnabled 
}) {
  const students = currentClass?.students || [];

  // Danh sách học sinh trong vòng quay
  const [candidates, setCandidates] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [excludeWinners, setExcludeWinners] = useState(true);
  const [calledHistory, setCalledHistory] = useState([]);

  const canvasRef = useRef(null);
  const currentAngleRef = useRef(0);
  const spinSpeedRef = useRef(0);
  const spinDecelRef = useRef(0.985);
  const animationFrameRef = useRef(null);
  const lastSoundTickAngleRef = useRef(0);

  useEffect(() => {
    setCandidates(students);
  }, [students]);

  // Vẽ vòng quay trên Canvas
  const drawWheel = (angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, width, height);

    if (candidates.length === 0) {
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Đã hết học sinh trong danh sách quay!', centerX, centerY);
      return;
    }

    const numSlices = candidates.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    // Vẽ từng nan quạt
    for (let i = 0; i < numSlices; i++) {
      const startA = i * sliceAngle;
      const endA = startA + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startA, endA);
      ctx.closePath();

      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vẽ tên học sinh
      ctx.save();
      ctx.rotate(startA + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = numSlices > 25 ? 'bold 11px Outfit, sans-serif' : 'bold 13px Outfit, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      
      const studentName = candidates[i].name;
      // Cắt gọn tên nếu quá dài
      const displayName = studentName.length > 18 ? studentName.slice(0, 16) + '...' : studentName;
      ctx.fillText(displayName, radius - 15, 4);
      ctx.restore();
    }

    // Tâm vòng quay
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = 'var(--primary)';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUAY', 0, 5);

    ctx.restore();

    // Vẽ kim chỉ ở góc 3 giờ (Bên phải)
    ctx.save();
    ctx.translate(centerX + radius + 5, centerY);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(24, -14);
    ctx.lineTo(24, 14);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [candidates]);

  // Bắt đầu quay
  const startSpin = () => {
    if (isSpinning || candidates.length === 0) return;

    setIsSpinning(true);
    setSelectedWinner(null);

    // Tốc độ quay ngẫu nhiên lớn
    spinSpeedRef.current = 0.35 + Math.random() * 0.25;
    spinDecelRef.current = 0.988 + Math.random() * 0.006; // Hãm phanh dần dần
    lastSoundTickAngleRef.current = currentAngleRef.current;

    const animate = () => {
      currentAngleRef.current += spinSpeedRef.current;
      spinSpeedRef.current *= spinDecelRef.current;

      // Tiếng tick khi qua mỗi nan quạt
      if (soundEnabled && candidates.length > 0) {
        const sliceAngle = (Math.PI * 2) / candidates.length;
        if (Math.abs(currentAngleRef.current - lastSoundTickAngleRef.current) >= sliceAngle) {
          soundEffects.playTick();
          lastSoundTickAngleRef.current = currentAngleRef.current;
        }
      }

      drawWheel(currentAngleRef.current);

      // Khi tốc độ gần dừng hẳn
      if (spinSpeedRef.current < 0.0015) {
        cancelAnimationFrame(animationFrameRef.current);
        setIsSpinning(false);
        determineWinner();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Xác định người trúng kim chỉ (Góc 0 radian - 3 giờ)
  const determineWinner = () => {
    const numSlices = candidates.length;
    const sliceAngle = (Math.PI * 2) / numSlices;
    
    // Chuẩn hóa góc quay về [0, 2PI]
    const normalizedAngle = (Math.PI * 2 - (currentAngleRef.current % (Math.PI * 2))) % (Math.PI * 2);
    const winningIndex = Math.floor(normalizedAngle / sliceAngle) % numSlices;
    const winner = candidates[winningIndex];

    setSelectedWinner(winner);
    setCalledHistory(prev => [winner, ...prev]);

    if (soundEnabled) soundEffects.playVictory();

    // Bắn pháo hoa
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

    // Nếu chọn loại bỏ người đã gọi
    if (excludeWinners) {
      setCandidates(prev => prev.filter(s => s.id !== winner.id));
    }
  };

  const handleResetWheel = () => {
    setCandidates(students);
    setSelectedWinner(null);
    setCalledHistory([]);
    currentAngleRef.current = 0;
    drawWheel(0);
  };

  // Thưởng sao cho người vừa quay trúng
  const handleRewardWinner = (starsToAdd) => {
    if (!selectedWinner) return;
    const updated = students.map(s => {
      if (s.id === selectedWinner.id) {
        return { ...s, stars: (s.stars || 0) + starsToAdd };
      }
      return s;
    });
    onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playStarDing();
    alert(`Đã cộng +${starsToAdd} ⭐ cho ${selectedWinner.name}!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>🎡</span> Vòng Quay May Mắn (Lucky Wheel)
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Quay chọn ngẫu nhiên học sinh kiểm tra bài cũ hoặc trao thưởng bất ngờ
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={excludeWinners}
                onChange={(e) => setExcludeWinners(e.target.checked)}
              />
              Loại bỏ người đã được gọi
            </label>

            <button className="btn btn-outline btn-sm" onClick={handleResetWheel}>
              <RotateCcw size={16} />
              Khôi phục danh sách đầy đủ
            </button>

            <button 
              className="btn btn-primary btn-lg pulse-card"
              onClick={startSpin}
              disabled={isSpinning || candidates.length === 0}
              style={{ fontWeight: 800 }}
            >
              <Play size={20} fill="#fff" />
              {isSpinning ? 'ĐANG QUAY...' : `QUAY NGAY (${candidates.length} HS)`}
            </button>
          </div>
        </div>
      </div>

      {/* Main Wheel Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) 340px',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Canvas Wheel Card */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 520
        }}>
          <canvas
            ref={canvasRef}
            width={520}
            height={520}
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '50%',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)'
            }}
          />
        </div>

        {/* Sidebar: History & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Currently Selected Winner Card */}
          {selectedWinner && (
            <div className="glass-panel pulse-card" style={{ padding: '1.25rem', textAlign: 'center', border: '2px solid var(--accent)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🎉</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                Học sinh được gọi:
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.25rem 0' }}>
                {selectedWinner.name}
              </h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {selectedWinner.machineNumber ? `Máy ${selectedWinner.machineNumber} • ` : (selectedWinner.id && !String(selectedWinner.id).startsWith('hs_') ? `Mã: ${selectedWinner.id} • ` : '')}Hiện có: {selectedWinner.stars || 0} ⭐
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  className="btn btn-amber btn-sm"
                  onClick={() => handleRewardWinner(1)}
                >
                  <Star size={16} fill="#fff" />
                  Thưởng +1 Sao Trả Lời Đúng
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={startSpin}
                  disabled={isSpinning || candidates.length === 0}
                >
                  <Play size={16} />
                  Quay Tiếp Bạn Tiếp Theo
                </button>
              </div>
            </div>
          )}

          {/* Called History */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserCheck size={18} color="var(--primary)" />
              Lịch sử lượt gọi ({calledHistory.length})
            </h4>

            {calledHistory.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Chưa có lượt quay nào trong phiên này.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 280, overflowY: 'auto' }}>
                {calledHistory.map((s, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-secondary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      #{calledHistory.length - idx}. {s.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {s.machineNumber ? `Máy ${s.machineNumber}` : (s.id && !String(s.id).startsWith('hs_') ? s.id : `${s.stars || 0} ⭐`)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
