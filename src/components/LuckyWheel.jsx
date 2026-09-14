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
  AlertCircle,
  Minimize2,
  X
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
  soundEnabled,
  onMinimize = null
}) {
  const students = currentClass?.students || [];

  // Danh sách học sinh trong vòng quay
  const [candidates, setCandidates] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
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
    setSelectedWinner(null);
    setShowWinnerPopup(false);
    setCalledHistory([]);
  }, [currentClass?.id, students]);

  // Vẽ vòng quay Canvas
  const drawWheel = (angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 30; // 290px bán kính cho vòng quay lớn, hùng vĩ

    ctx.clearRect(0, 0, width, height);

    const numSlices = candidates.length;
    if (numSlices === 0) {
      // Vẽ thông báo không có học sinh
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Không có học sinh trong danh sách quay', centerX, centerY);
      return;
    }

    const sliceAngle = (Math.PI * 2) / numSlices;

    // Vẽ từng nan quạt
    for (let i = 0; i < numSlices; i++) {
      const startAngle = angle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Vẽ tên học sinh
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      
      const fontSize = numSlices > 35 ? 12 : numSlices > 25 ? 13 : 14;
      ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 4;
      
      const studentName = candidates[i].name;
      // Bán kính lớn cho phép hiển thị tên dài rõ ràng
      const maxCharLen = numSlices > 32 ? 20 : 24;
      const displayName = studentName.length > maxCharLen ? studentName.substring(0, maxCharLen - 2) + '...' : studentName;
      ctx.fillText(displayName, radius - 22, 4);
      ctx.restore();
    }

    // Vành ngoài kim loại vàng sáng
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 11;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Các đinh tán đèn tròn viền quanh vòng quay
    const numPins = Math.max(16, Math.min(numSlices, 40));
    for (let i = 0; i < numPins; i++) {
      const pinAngle = (Math.PI * 2 / numPins) * i;
      const px = centerX + Math.cos(pinAngle) * (radius + 8);
      const py = centerY + Math.sin(pinAngle) * (radius + 8);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = (i % 2 === 0) ? '#fef08a' : '#ffffff';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Trục giữa vòng quay (Nút quay 3D nổi bật)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
    const hubGrad = ctx.createRadialGradient(centerX - 8, centerY - 8, 4, centerX, centerY, 38);
    hubGrad.addColorStop(0, '#334155');
    hubGrad.addColorStop(0.6, '#0f172a');
    hubGrad.addColorStop(1, '#020617');
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Vòng vàng phản quang bên trong
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(isSpinning ? 'QUAY...' : '🎯 QUAY', centerX, centerY);
    ctx.shadowBlur = 0;

    // Mũi kim chỉ (Pointer) cố định tại góc 0 radian (bên phải - 3 giờ)
    const pointerSize = 22;
    const px = centerX + radius + 10;
    const py = centerY;

    ctx.beginPath();
    ctx.moveTo(px - 14, py);
    ctx.lineTo(px + pointerSize, py - 12);
    ctx.lineTo(px + pointerSize, py + 12);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [candidates, isSpinning]);

  // Bắt đầu quay
  const startSpin = () => {
    if (isSpinning || candidates.length === 0) return;

    setIsSpinning(true);
    setSelectedWinner(null);
    setShowWinnerPopup(false);

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
    setShowWinnerPopup(true);
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
    setShowWinnerPopup(false);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <span style={{ fontSize: '1.8rem' }}>🎡</span> Vòng Quay May Mắn (Lucky Wheel)
              </h2>
              <span style={{
                fontSize: '0.8125rem',
                fontWeight: 800,
                padding: '0.2rem 0.7rem',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                🏫 Lớp: {currentClass?.name || 'Chưa chọn'}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
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
        gridTemplateColumns: 'minmax(420px, 1fr) minmax(280px, 320px)',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Canvas Wheel Card */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>

          <canvas
            ref={canvasRef}
            width={640}
            height={640}
            onClick={startSpin}
            title="Nhấp vào vòng quay để QUAY!"
            style={{
              maxWidth: '100%',
              width: 'min(620px, 100%)',
              height: 'auto',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.22), 0 0 35px rgba(245, 158, 11, 0.2)',
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              transition: 'transform 0.15s ease'
            }}
          />

          <div style={{
            marginTop: '0.85rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            textAlign: 'center'
          }}>
            <span>🎯</span>
            <span>Nhấp trực tiếp vào vòng quay hoặc nút <strong>QUAY NGAY</strong></span>
          </div>
        </div>

        {/* Sidebar: History & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Currently Selected Winner Card */}
          {selectedWinner && (
            <div className="glass-panel pulse-card" style={{ padding: '1.25rem', textAlign: 'center', border: '2px solid var(--accent)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🎉</div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--primary)',
                fontSize: '0.75rem',
                fontWeight: 800,
                marginBottom: '0.5rem'
              }}>
                🏫 LỚP {currentClass?.name || ''}
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                Học sinh được gọi:
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.25rem 0' }}>
                {selectedWinner.name}
              </h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                {selectedWinner.machineNumber ? `Máy ${selectedWinner.machineNumber} • ` : (selectedWinner.id && !String(selectedWinner.id).startsWith('hs_') ? `Mã: ${selectedWinner.id} • ` : '')}Hiện có: {selectedWinner.stars || 0} ⭐
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {onMinimize && (
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => onMinimize(selectedWinner, 'wheel')}
                    style={{
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem'
                    }}
                  >
                    <Minimize2 size={15} />
                    📌 Tạm Ẩn Sang Góc (Chiếu Slide)
                  </button>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <button 
                    className="btn btn-amber btn-sm"
                    onClick={() => handleRewardWinner(1)}
                    style={{ fontWeight: 700 }}
                  >
                    <Star size={15} fill="#fff" />
                    +1 Sao
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleRewardWinner(2)}
                    style={{ fontWeight: 700 }}
                  >
                    <Sparkles size={15} />
                    +2 Sao
                  </button>
                </div>

                <button 
                  className="btn btn-outline btn-sm"
                  onClick={startSpin}
                  disabled={isSpinning || candidates.length === 0}
                  style={{ fontWeight: 700 }}
                >
                  <Play size={15} />
                  Quay Tiếp Bạn Tiếp Theo
                </button>
              </div>
            </div>
          )}

          {/* Called History */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserCheck size={18} color="var(--primary)" />
              Lịch sử lượt gọi {currentClass?.name ? `• Lớp ${currentClass.name}` : ''} ({calledHistory.length})
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

      {/* Modal Pop-up Học Sinh Trúng Thưởng Vòng Quay */}
      {selectedWinner && showWinnerPopup && (
        <div className="modal-overlay" onClick={() => setShowWinnerPopup(false)}>
          <div className="modal-content" style={{ maxWidth: 520, textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            {/* Nút thu nhỏ & đóng góc trên */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', zIndex: 10 }}>
              {onMinimize && (
                <button 
                  className="btn btn-icon btn-sm"
                  onClick={() => {
                    setShowWinnerPopup(false);
                    onMinimize(selectedWinner, 'wheel');
                  }}
                  title="Tạm ẩn sang góc để chiếu slide"
                  style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}
                >
                  <Minimize2 size={18} />
                </button>
              )}
              <button 
                className="btn btn-icon btn-sm"
                onClick={() => setShowWinnerPopup(false)}
                title="Đóng bảng"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '3.5rem', marginBottom: '0.25rem', animation: 'bounce 0.8s infinite' }}>🎡</div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '0.875rem',
              marginBottom: '0.75rem'
            }}>
              🏫 LỚP: {currentClass?.name || 'LỚP HỌC'}
            </div>

            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎯 HỌC SINH ĐƯỢC GỌI TRẢ BÀI
            </div>

            <h3 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', margin: '0.5rem 0' }}>
              {selectedWinner.name}
            </h3>

            <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {selectedWinner.machineNumber && (
                <span className="badge badge-primary">💻 Máy {selectedWinner.machineNumber}</span>
              )}
              {selectedWinner.id && !String(selectedWinner.id).startsWith('hs_') && (
                <span className="badge badge-secondary">Mã: {selectedWinner.id}</span>
              )}
              <span className="badge badge-amber">⭐ {selectedWinner.stars || 0} Sao</span>
            </div>

            {/* Nút Tạm Ẩn Sang Góc & Cộng Sao */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {onMinimize && (
                <button 
                  className="btn btn-warning" 
                  onClick={() => {
                    setShowWinnerPopup(false);
                    onMinimize(selectedWinner, 'wheel');
                  }}
                  style={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    fontSize: '1rem',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  <Minimize2 size={18} />
                  📌 Tạm Ẩn Sang Góc (Để Chiếu Slide Cho HS Trả Lời)
                </button>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button 
                  className="btn btn-amber"
                  onClick={() => handleRewardWinner(1)}
                  style={{ fontWeight: 700 }}
                >
                  <Star size={18} fill="#fff" />
                  +1 Sao Trả Lời Đúng
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleRewardWinner(2)}
                  style={{ fontWeight: 700 }}
                >
                  <Sparkles size={18} />
                  +2 Sao Xuất Sắc
                </button>
              </div>

              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowWinnerPopup(false);
                  setTimeout(() => startSpin(), 150);
                }}
                disabled={isSpinning || candidates.length === 0}
                style={{ fontWeight: 700 }}
              >
                <Play size={18} />
                Quay Tiếp Bạn Tiếp Theo ({candidates.length} HS còn lại)
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowWinnerPopup(false)}>
                Đóng Bảng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
