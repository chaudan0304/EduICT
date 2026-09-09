import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Flame, 
  Star, 
  Users, 
  Sparkles, 
  Award,
  CheckSquare,
  Square,
  Volume2
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

// Bảng màu đa dạng cho các chú vịt
const DUCK_COLORS = [
  '#f59e0b', // Vàng cam
  '#06b6d4', // Xanh lam
  '#10b981', // Xanh lục
  '#ec4899', // Hồng tươi
  '#8b5cf6', // Tím
  '#f97316', // Cam cháy
  '#14b8a6', // Ngọc bích
  '#e11d48', // Đỏ son
  '#3b82f6', // Xanh dương
  '#84cc16', // Vàng chanh
];

export default function DuckRace({ 
  currentClass, 
  onUpdateStudents, 
  soundEnabled 
}) {
  const students = currentClass?.students || [];
  
  // Danh sách ID học sinh tham gia đua
  const [selectedIds, setSelectedIds] = useState([]);
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'racing' | 'finished'
  const [winners, setWinners] = useState([]); // Top 3
  const [boostAnnounce, setBoostAnnounce] = useState(null);

  const canvasRef = useRef(null);
  const ducksRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Mặc định chọn tất cả học sinh
  useEffect(() => {
    if (students.length > 0 && selectedIds.length === 0) {
      setSelectedIds(students.map(s => s.id));
    }
  }, [students]);

  // Bộ lọc nhanh danh sách đua
  const handleSelectAll = () => {
    setSelectedIds(students.map(s => s.id));
  };

  const handleSelectLowScore = () => {
    // Chọn các bạn có điểm miệng < 7 hoặc chưa có điểm miệng
    const candidates = students.filter(s => {
      return s.m1 === null || s.m1 === undefined || s.m1 < 7;
    });
    if (candidates.length > 0) {
      setSelectedIds(candidates.map(s => s.id));
    } else {
      setSelectedIds(students.slice(0, 10).map(s => s.id));
    }
  };

  const handleSelectRandom = (count) => {
    const shuffled = [...students].sort(() => 0.5 - Math.random());
    setSelectedIds(shuffled.slice(0, Math.min(count, students.length)).map(s => s.id));
  };

  const toggleSelectStudent = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter(i => i !== id));
      } else {
        alert('Cần có ít nhất 2 học sinh để bắt đầu cuộc đua!');
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Khởi tạo vịt đua
  const initDucks = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const selectedStudents = students.filter(s => selectedIds.includes(s.id));
    const laneHeight = Math.max(38, Math.min(65, (canvas.height - 70) / selectedStudents.length));

    ducksRef.current = selectedStudents.map((s, index) => {
      const color = DUCK_COLORS[index % DUCK_COLORS.length];
      return {
        id: s.id,
        name: s.name,
        color,
        x: 40,
        y: 60 + index * laneHeight,
        speed: 1.2 + Math.random() * 0.8,
        laneHeight,
        bobOffset: Math.random() * Math.PI * 2,
        isBoosting: false,
        boostTimer: 0,
        finished: false,
        finishTime: null,
      };
    });
  };

  // Bắt đầu đua
  const startRace = () => {
    if (selectedIds.length < 2) {
      alert('Vui lòng chọn ít nhất 2 học sinh để đua!');
      return;
    }

    setGameState('racing');
    setWinners([]);
    setBoostAnnounce(null);
    initDucks();

    if (soundEnabled) {
      soundEffects.playQuack();
      setTimeout(() => soundEffects.playQuack(), 250);
    }

    const canvas = canvasRef.current;
    const finishLineX = canvas.width - 90;
    const finishedDucks = [];
    let startTime = Date.now();

    const animate = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Vẽ dòng sông & phao tiêu
      drawRiver(ctx, canvas, finishLineX);

      const ducks = ducksRef.current;
      const now = Date.now();

      ducks.forEach(duck => {
        if (!duck.finished) {
          // Ngẫu nhiên tăng tốc (Boost)
          if (!duck.isBoosting && Math.random() < 0.008) {
            duck.isBoosting = true;
            duck.boostTimer = 45; // 45 frames of boost
            duck.speed = 3.8 + Math.random() * 2.2;
            setBoostAnnounce(`🚀 ${duck.name} đang tăng tốc thần tốc!`);
            if (soundEnabled) soundEffects.playBoost();
          }

          if (duck.isBoosting) {
            duck.boostTimer--;
            if (duck.boostTimer <= 0) {
              duck.isBoosting = false;
              duck.speed = 1.2 + Math.random() * 0.9;
            }
          } else {
            // Biến thiên tốc độ nhẹ nhàng theo sóng nước
            duck.speed += (Math.random() - 0.5) * 0.25;
            duck.speed = Math.max(0.8, Math.min(3.0, duck.speed));
          }

          duck.x += duck.speed;
          duck.bobOffset += 0.12;

          // Kiểm tra cán đích
          if (duck.x >= finishLineX) {
            duck.finished = true;
            duck.finishTime = now - startTime;
            finishedDucks.push(duck);

            if (finishedDucks.length === 1 && soundEnabled) {
              soundEffects.playVictory();
            }
          }
        }

        // Vẽ từng chú vịt
        drawDuck(ctx, duck);
      });

      // Kiểm tra kết thúc cuộc đua khi top 3 về đích hoặc tất cả về đích
      if (finishedDucks.length >= Math.min(3, ducks.length)) {
        cancelAnimationFrame(animationFrameRef.current);
        setWinners(finishedDucks.slice(0, 3));
        setGameState('finished');
        triggerConfetti();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Kích hoạt pháo hoa chúc mừng
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);
  };

  // Vẽ nền dòng sông và làn đua
  const drawRiver = (ctx, canvas, finishLineX) => {
    // Nền nước xanh biếc
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gợn sóng nước lăn tăn
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    const time = Date.now() * 0.003;
    for (let y = 30; y < canvas.height; y += 45) {
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 30) {
        const waveY = y + Math.sin(x * 0.02 + time) * 3;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }

    // Vạch xuất phát
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(85, 0);
    ctx.lineTo(85, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Chữ XUẤT PHÁT
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('START', 45, 25);

    // Vạch đích (Checkered Finish Line)
    const squareSize = 12;
    for (let y = 0; y < canvas.height; y += squareSize) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = (Math.floor(y / squareSize) + c) % 2 === 0 ? '#ffffff' : '#0f172a';
        ctx.fillRect(finishLineX + c * squareSize, y, squareSize, squareSize);
      }
    }

    // Bảng vạch đích FINISH
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('🏁 ĐÍCH', finishLineX - 8, 25);
  };

  // Vẽ 1 chú vịt cùng nhãn tên
  const drawDuck = (ctx, duck) => {
    const bob = Math.sin(duck.bobOffset) * 2.5;
    const x = duck.x;
    const y = duck.y + bob;

    ctx.save();

    // Vệt sóng nước phía sau vịt
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x - 14, y + 10, duck.isBoosting ? 18 : 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hiệu ứng tia lửa phản lực khi boost
    if (duck.isBoosting) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(x - 22, y + 6, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(x - 20, y + 6, 3 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Thân vịt (Body)
    ctx.fillStyle = duck.color;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Đuôi vịt nhỏ
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 4);
    ctx.lineTo(x - 20, y - 2);
    ctx.lineTo(x - 12, y + 8);
    ctx.fillStyle = duck.color;
    ctx.fill();

    // Đầu vịt (Head)
    ctx.beginPath();
    ctx.arc(x + 11, y - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mắt vịt (Eye)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 13, y - 4, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x + 14, y - 4, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Mỏ vịt màu cam (Beak)
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(x + 18, y - 2);
    ctx.lineTo(x + 27, y + 1);
    ctx.lineTo(x + 18, y + 4);
    ctx.closePath();
    ctx.fill();

    // Nhãn tên học sinh phía trên chú vịt
    const tagText = duck.name;
    ctx.font = 'bold 12px Outfit, sans-serif';
    const textWidth = ctx.measureText(tagText).width;

    // Hộp chứa tên học sinh
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 + 5, y - 26, textWidth + 14, 18, 5);
    ctx.fill();
    ctx.strokeStyle = duck.isBoosting ? '#fbbf24' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = duck.isBoosting ? 2 : 1;
    ctx.stroke();

    // Tên học sinh
    ctx.fillStyle = duck.isBoosting ? '#fef08a' : '#ffffff';
    ctx.fillText(tagText, x - textWidth / 2 + 12, y - 13);

    ctx.restore();
  };

  // Dừng hoặc đặt lại
  const resetRace = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setGameState('idle');
    setWinners([]);
    setBoostAnnounce(null);
    initDucks();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRiver(ctx, canvas, canvas.width - 90);
      ducksRef.current.forEach(duck => drawDuck(ctx, duck));
    }
  };

  // Vẽ ban đầu khi mount hoặc đổi danh sách chọn
  useEffect(() => {
    initDucks();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawRiver(ctx, canvas, canvas.width - 90);
      ducksRef.current.forEach(duck => drawDuck(ctx, duck));
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedIds]);

  // Thưởng sao cho người chiến thắng
  const rewardWinner = (studentId, starsToAdd) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, stars: (s.stars || 0) + starsToAdd };
      }
      return s;
    });
    onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playStarDing();
    alert(`Đã thưởng +${starsToAdd} ⭐ cho học sinh!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner & Control Bar */}
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
              <span style={{ fontSize: '1.8rem' }}>🦆</span> Đua Vịt Lớp Học (Duck Race)
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Trò chơi bơi đua hồi hộp chọn học sinh trả lời bài hoặc thưởng điểm thi đua
            </p>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Chọn nhanh:</span>
            <button className="btn btn-outline btn-sm" onClick={handleSelectAll}>
              Cả lớp ({students.length})
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleSelectLowScore} title="Chọn các bạn chưa có điểm miệng hoặc điểm dưới 7">
              🎯 Cần gỡ điểm
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleSelectRandom(5)}>
              🎲 Ngẫu nhiên 5 bạn
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleSelectRandom(10)}>
              🎲 Ngẫu nhiên 10 bạn
            </button>
          </div>

          {/* Big Start Button */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {gameState === 'racing' ? (
              <button className="btn btn-danger btn-lg" onClick={resetRace}>
                <RotateCcw size={20} />
                <span>Dừng Lại</span>
              </button>
            ) : (
              <>
                <button 
                  className="btn btn-amber btn-lg pulse-card" 
                  onClick={startRace}
                  disabled={selectedIds.length < 2}
                  style={{ fontWeight: 800, letterSpacing: '0.02em' }}
                >
                  <Play size={22} fill="#fff" />
                  <span>BẮT ĐẦU ĐUA ({selectedIds.length} VỊT)</span>
                </button>
                {gameState === 'finished' && (
                  <button className="btn btn-secondary btn-lg" onClick={resetRace}>
                    <RotateCcw size={20} />
                    <span>Lượt Mới</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Boost announcer ticker */}
        {boostAnnounce && gameState === 'racing' && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1rem',
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9375rem',
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease'
          }}>
            {boostAnnounce}
          </div>
        )}
      </div>

      {/* Main Race Canvas */}
      <div className="glass-panel" style={{
        padding: '1rem',
        background: '#0369a1',
        overflowX: 'auto',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <canvas
          ref={canvasRef}
          width={1240}
          height={Math.max(480, selectedIds.length * 48 + 80)}
          style={{
            display: 'block',
            width: '100%',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
        />
      </div>

      {/* Winners Podium Modal (Bục vinh quang) */}
      {gameState === 'finished' && winners.length > 0 && (
        <div className="modal-overlay" onClick={() => setGameState('idle')}>
          <div className="modal-content" style={{ maxWidth: 640, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              CHÚC MỪNG QUÁN QUÂN ĐUA VỊT!
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Những chú vịt xuất sắc nhất đã về đích thành công!
            </p>

            {/* Podium Display */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '1rem',
              margin: '1rem 0 2rem'
            }}>
              {/* Top 2 */}
              {winners[1] && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🥈</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                    {winners[1].name}
                  </div>
                  <div style={{
                    width: '100%',
                    height: 90,
                    background: 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '1.25rem'
                  }}>
                    TOP 2
                  </div>
                  <button 
                    className="btn btn-amber btn-sm" 
                    style={{ marginTop: '0.5rem', width: '100%' }}
                    onClick={() => rewardWinner(winners[1].id, 1)}
                  >
                    +1 Sao ⭐
                  </button>
                </div>
              )}

              {/* Top 1 */}
              {winners[0] && (
                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>👑</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#d97706' }}>
                    {winners[0].name}
                  </div>
                  <div style={{
                    width: '100%',
                    height: 130,
                    background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    boxShadow: '0 0 25px rgba(245, 158, 11, 0.5)'
                  }}>
                    QUÁN QUÂN
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>TOP 1</span>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm pulse-card" 
                    style={{ marginTop: '0.5rem', width: '100%', fontWeight: 700 }}
                    onClick={() => rewardWinner(winners[0].id, 2)}
                  >
                    +2 Sao ⭐
                  </button>
                </div>
              )}

              {/* Top 3 */}
              {winners[2] && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🥉</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                    {winners[2].name}
                  </div>
                  <div style={{
                    width: '100%',
                    height: 65,
                    background: 'linear-gradient(180deg, #d97706 0%, #78350f 100%)',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '1.1rem'
                  }}>
                    TOP 3
                  </div>
                  <button 
                    className="btn btn-amber btn-sm" 
                    style={{ marginTop: '0.5rem', width: '100%' }}
                    onClick={() => rewardWinner(winners[2].id, 1)}
                  >
                    +1 Sao ⭐
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={startRace}>
                <RotateCcw size={18} />
                Đua Lại Ngay
              </button>
              <button className="btn btn-secondary" onClick={() => setGameState('idle')}>
                Đóng Bảng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Selection Checklist (Chọn học sinh tham gia) */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Danh sách vịt đua ({selectedIds.length}/{students.length} học sinh)
          </h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Bấm vào tên học sinh để thêm hoặc bớt khỏi đường đua
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: '0.5rem',
          maxHeight: 220,
          overflowY: 'auto',
          padding: '0.5rem 0'
        }}>
          {students.map((student, idx) => {
            const isSelected = selectedIds.includes(student.id);
            return (
              <div
                key={student.id}
                onClick={() => toggleSelectStudent(student.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--surface-border)'}`,
                  background: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isSelected ? (
                  <CheckSquare size={16} color="var(--primary)" />
                ) : (
                  <Square size={16} color="var(--text-dim)" />
                )}
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {student.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
