import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  RotateCcw, 
  Star, 
  Sparkles, 
  UserCheck, 
  CheckSquare, 
  Square,
  Flame,
  Award,
  Users,
  Minimize2,
  X
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

const getCurrentTimestamp = () => Date.now();

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
  soundEnabled,
  onMinimize = null
}) {
  const students = currentClass?.students || [];
  
  // Danh sách ID học sinh tham gia đua
  const [selectedIds, setSelectedIds] = useState(() => (currentClass?.students || []).map(s => s.id));
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'racing' | 'finished'
  const [selectedWinner, setSelectedWinner] = useState(null); // Học sinh về nhất được gọi trả bài
  const [excludeWinners, setExcludeWinners] = useState(true); // Tự động loại bạn đã gọi
  const [calledHistory, setCalledHistory] = useState([]); // Lịch sử các bạn đã gọi trả bài
  const [boostAnnounce, setBoostAnnounce] = useState(null);

  const canvasRef = useRef(null);
  const ducksRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Cập nhật khi đổi lớp học
  const prevClassIdRef = useRef(currentClass?.id);
  useEffect(() => {
    if (prevClassIdRef.current !== currentClass?.id) {
      prevClassIdRef.current = currentClass?.id;
      if (students.length > 0) {
        setSelectedIds(students.map(s => s.id));
        setCalledHistory([]);
        setSelectedWinner(null);
      }
    }
  }, [currentClass?.id, students]);

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

  const handleResetCandidates = () => {
    setSelectedIds(students.map(s => s.id));
    setSelectedWinner(null);
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

  // Khởi tạo vịt đua bơi tự do trong dòng sông mở
  // Xếp hàng xuất phát so le 3 cột đẹp mắt trong vịnh xuất phát, 100% học sinh nhìn rõ tên không bị đè chữ
  const initDucks = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const selectedStudents = students.filter(s => selectedIds.includes(s.id));
    const total = selectedStudents.length || 1;
    
    // Sông cao 440px: bờ trên y: 22, bờ dưới y: 418. Vùng bơi từ y: 48 đến y: 395 (chiều cao ~347px)
    const numCols = total > 24 ? 3 : 2;
    const ducksPerCol = Math.ceil(total / numCols);
    const rowSpacing = Math.min(36, Math.max(27, 340 / Math.max(1, ducksPerCol)));

    ducksRef.current = selectedStudents.map((s, index) => {
      const color = DUCK_COLORS[index % DUCK_COLORS.length];
      const col = index % numCols;
      const row = Math.floor(index / numCols);
      
      // Xếp các cột ở khu vực xuất phát bên trái vạch START (x: 48, 138, 228)
      const initialX = 48 + col * 90;
      // Độ so le trục Y giữa các cột để tên các bạn tuyệt đối không đè nhau
      const staggerY = (col % 2 === 1) ? (rowSpacing * 0.48) : 0;
      const initialY = 50 + row * rowSpacing + staggerY;

      return {
        id: s.id,
        name: s.name,
        color,
        x: initialX,
        y: initialY,
        startX: initialX,
        startY: initialY,
        targetY: initialY,
        baseSpeed: 1.5 + Math.random() * 0.8,
        speed: 1.5,
        speedPhase: Math.random() * Math.PI * 2,
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
      alert('Vui lòng chọn ít nhất 2 học sinh để bắt đầu cuộc đua gọi trả bài!');
      return;
    }

    setGameState('racing');
    setSelectedWinner(null);
    setBoostAnnounce(null);
    initDucks();

    // Tiếng đàn vịt kêu rộn ràng khi xuất phát cuộc đua: "Quạc! Quạc-quạc! Quạc!"
    if (soundEnabled) {
      soundEffects.playFlockQuack();
    }

    const canvas = canvasRef.current;
    const finishLineX = canvas.width - 95;
    const startLineX = 305;
    let startTime = getCurrentTimestamp();
    let frameCount = 0;

    const animate = () => {
      frameCount++;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ducks = ducksRef.current;
      const now = getCurrentTimestamp();
      let firstFinisher = null;

      // Tìm danh sách dẫn đầu hiện tại để vẽ bảng điểm và vương miện
      const sortedByX = [...ducks].sort((a, b) => b.x - a.x);
      const currentLeader = sortedByX[0];
      const top3Leaders = sortedByX.slice(0, 3);

      // 1. Vẽ dòng sông mở, gợn sóng, lá sen, vạch xuất phát & đích, kèm bảng TOP 3 dẫn đầu
      drawRiver(ctx, canvas, startLineX, finishLineX, frameCount, top3Leaders);

      // Cập nhật vị trí và chuyển động bơi tự do, lộn xộn vượt mặt nhau
      ducks.forEach((duck, idx) => {
        if (!duck.finished) {
          // A. Lượn sóng tốc độ theo nhịp thở của từng chú vịt
          duck.speedPhase += 0.025;
          const waveSpeedMod = Math.sin(duck.speedPhase) * 0.45;

          // B. Cơ chế bứt phá (Boost) ngẫu nhiên
          if (!duck.isBoosting && Math.random() < 0.0075) {
            duck.isBoosting = true;
            duck.boostTimer = 35 + Math.floor(Math.random() * 25);
            duck.speed = 4.1 + Math.random() * 1.8;
            setBoostAnnounce(`🚀 ${duck.name} đang bơi bứt phá thần tốc!`);
            if (soundEnabled) {
              if (Math.random() < 0.4) soundEffects.playBoost();
              else soundEffects.playQuack(330 + Math.random() * 150);
            }
          }

          if (duck.isBoosting) {
            duck.boostTimer--;
            if (duck.boostTimer <= 0) {
              duck.isBoosting = false;
              duck.speed = duck.baseSpeed + waveSpeedMod;
            }
          } else {
            duck.speed = Math.max(0.9, Math.min(3.6, duck.baseSpeed + waveSpeedMod + (Math.random() - 0.5) * 0.16));
          }

          duck.x += duck.speed;
          duck.bobOffset += 0.14;

          // C. Bơi lượn sóng tự do (Vertical roaming) khi đã qua vạch xuất phát
          if (duck.x > startLineX) {
            if (frameCount % 45 === 0 && Math.random() < 0.45) {
              duck.targetY = Math.max(52, Math.min(canvas.height - 52, duck.targetY + (Math.random() - 0.5) * 65));
            }
            duck.y += (duck.targetY - duck.y) * 0.022 + Math.sin(duck.bobOffset * 0.6) * 0.38;
          }

          // D. Lực đẩy nhẹ giữa các chú vịt khi quá gần nhau để tránh che khuất tên
          for (let j = idx + 1; j < ducks.length; j++) {
            const other = ducks[j];
            const dx = Math.abs(duck.x - other.x);
            const dy = Math.abs(duck.y - other.y);
            if (dx < 34 && dy < 22) {
              const nudge = 0.55;
              if (duck.y < other.y) {
                duck.y = Math.max(48, duck.y - nudge);
                other.y = Math.min(canvas.height - 48, other.y + nudge);
              } else {
                duck.y = Math.min(canvas.height - 48, duck.y + nudge);
                other.y = Math.max(48, other.y - nudge);
              }
            }
          }

          // Giữ vịt trong lòng sông an toàn
          duck.y = Math.max(48, Math.min(canvas.height - 48, duck.y));

          // E. Kiểm tra cán đích
          if (duck.x >= finishLineX) {
            duck.finished = true;
            duck.finishTime = now - startTime;
            if (!firstFinisher) {
              firstFinisher = duck;
            }
          }
        }
      });

      // Sắp xếp vẽ theo toạ độ Y để có hiệu ứng chiều sâu 2.5D tự nhiên
      const sortedDucks = [...ducks].sort((a, b) => a.y - b.y);
      sortedDucks.forEach(duck => {
        const isLeader = duck.id === currentLeader?.id && duck.x > startLineX;
        drawDuck(ctx, duck, isLeader);
      });

      // CUỘC ĐUA CHỈ ĐỂ GỌI HỌC SINH TRẢ BÀI:
      // Ngay khi có chú vịt đầu tiên cán đích -> Xác định học sinh được gọi và kết thúc!
      if (firstFinisher) {
        cancelAnimationFrame(animationFrameRef.current);
        const matchedStudent = students.find(s => s.id === firstFinisher.id) || {
          id: firstFinisher.id,
          name: firstFinisher.name
        };
        
        setSelectedWinner(matchedStudent);
        setCalledHistory(prev => [matchedStudent, ...prev]);
        setGameState('finished');

        if (soundEnabled) {
          soundEffects.playVictory();
        }
        triggerConfetti();

        // Tự động loại bạn đã gọi ra khỏi danh sách đua tiếp theo nếu bật loại trừ
        if (excludeWinners) {
          setSelectedIds(prev => prev.filter(id => id !== firstFinisher.id));
        }
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
    }, 350);
  };

  // Vẽ nền dòng sông mở, bờ cỏ, gợn sóng, hoa sen, phao tiêu, vạch xuất phát & vạch đích
  const drawRiver = (ctx, canvas, startLineX = 305, finishLineX, frame = 0, top3Leaders = []) => {
    // 1. Nền nước xanh biếc
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#0369a1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Gợn sóng nước lăn tăn
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    const time = (Date.now() * 0.0025) + frame * 0.02;
    for (let y = 45; y < canvas.height - 35; y += 42) {
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 30) {
        const waveY = y + Math.sin(x * 0.018 + time + y * 0.1) * 3.5;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }

    // 3. Các khóm lá sen / hoa súng trang trí sinh động trên dòng sông
    const lilyPads = [
      { x: 440, y: 75, r: 16 },
      { x: 620, y: 375, r: 20 },
      { x: 790, y: 95, r: 17 },
      { x: 970, y: 365, r: 22 },
      { x: 710, y: 240, r: 15 },
    ];
    lilyPads.forEach(pad => {
      ctx.save();
      // Lá sen tròn xẻ rãnh
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.r, 0.25 * Math.PI, 1.9 * Math.PI);
      ctx.lineTo(pad.x, pad.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hoa sen nhỏ hồng
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(pad.x + 3, pad.y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(pad.x + 3, pad.y - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 4. Bờ sông bờ cỏ phía trên & phía dưới
    // Bờ trên
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, 0, canvas.width, 22);
    ctx.fillStyle = '#22c55e';
    for (let x = 0; x < canvas.width; x += 18) {
      ctx.beginPath();
      ctx.arc(x + 9, 20, 10, 0, Math.PI);
      ctx.fill();
    }

    // Bờ dưới
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, canvas.height - 22, canvas.width, 22);
    ctx.fillStyle = '#22c55e';
    for (let x = 0; x < canvas.width; x += 18) {
      ctx.beginPath();
      ctx.arc(x + 9, canvas.height - 20, 10, Math.PI, 0);
      ctx.fill();
    }

    // 5. Vạch xuất phát (Start Line & Buoys)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(startLineX, 22);
    ctx.lineTo(startLineX, canvas.height - 22);
    ctx.stroke();
    ctx.setLineDash([]);

    // Phao nổi tại vạch xuất phát
    for (let py = 35; py < canvas.height - 25; py += 45) {
      ctx.fillStyle = (Math.floor(py / 45) % 2 === 0) ? '#ef4444' : '#ffffff';
      ctx.beginPath();
      ctx.arc(startLineX, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Chữ START
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('🏁 START', startLineX - 60, 38);

    // 6. Vạch đích (Checkered Finish Line)
    const squareSize = 13;
    for (let y = 22; y < canvas.height - 22; y += squareSize) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = (Math.floor(y / squareSize) + c) % 2 === 0 ? '#ffffff' : '#0f172a';
        ctx.fillRect(finishLineX + c * squareSize, y, squareSize, squareSize);
      }
    }

    // Bảng vạch đích FINISH
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('🏁 ĐÍCH', finishLineX - 10, 38);

    // 7. Bảng Live TOP 3 dẫn đầu (khi cuộc đua đang diễn ra)
    if (top3Leaders && top3Leaders.length > 0 && top3Leaders[0]?.x > startLineX) {
      ctx.save();
      const l1 = top3Leaders[0]?.name || '';
      const l2 = top3Leaders[1]?.name || '';
      const l3 = top3Leaders[2]?.name || '';
      const text = `🏆 DẪN ĐẦU: 🥇 1. ${l1}  ${l2 ? `• 🥈 2. ${l2}` : ''}  ${l3 ? `• 🥉 3. ${l3}` : ''}`;
      ctx.font = 'bold 12px Outfit, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const pillW = textWidth + 24;
      const pillX = canvas.width / 2 - pillW / 2 + 30;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(pillX, 5, pillW, 24, 12);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillText(text, pillX + 12, 21);
      ctx.restore();
    }
  };

  // Vẽ 1 chú vịt cùng nhãn tên và vương miện nếu dẫn đầu
  const drawDuck = (ctx, duck, isLeader = false) => {
    const bob = Math.sin(duck.bobOffset) * 2.5;
    const x = duck.x;
    const y = duck.y + bob;

    ctx.save();

    // 1. Vệt bọt sóng nước rẽ ra phía sau vịt
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x - 13, y + 8, duck.isBoosting ? 18 : 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hiệu ứng tia lửa phản lực khi boost
    if (duck.isBoosting) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(x - 20, y + 5, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(x - 17, y + 5, 3.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Thân vịt (Body)
    ctx.fillStyle = duck.color;
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Cánh vịt nhỏ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x - 2, y + 4, 8, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Đuôi vịt nhỏ
    ctx.beginPath();
    ctx.moveTo(x - 13, y + 3);
    ctx.lineTo(x - 19, y - 3);
    ctx.lineTo(x - 11, y + 7);
    ctx.fillStyle = duck.color;
    ctx.fill();
    ctx.stroke();

    // Đầu vịt (Head)
    ctx.beginPath();
    ctx.arc(x + 10, y - 2, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = duck.color;
    ctx.fill();
    ctx.stroke();

    // Mắt vịt (Eye)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 12, y - 4, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x + 13, y - 4, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Mỏ vịt màu cam (Beak)
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 2);
    ctx.lineTo(x + 25, y + 1);
    ctx.lineTo(x + 16, y + 4);
    ctx.closePath();
    ctx.fill();

    // 4. Vương miện dẫn đầu (Leader Crown)
    if (isLeader) {
      ctx.font = '15px sans-serif';
      ctx.fillText('👑', x - 3, y - 30);
    }

    // 5. Nhãn tên học sinh phía trên chú vịt (Pill badge nhỏ gọn sắc nét)
    const tagText = duck.name;
    ctx.font = 'bold 11px Outfit, sans-serif';
    const textWidth = ctx.measureText(tagText).width;
    const badgeWidth = textWidth + 12;
    const badgeHeight = 17;
    const badgeX = x - badgeWidth / 2 + 5;
    const badgeY = y - 24;

    // Hộp chứa tên học sinh
    ctx.fillStyle = isLeader ? 'rgba(30, 27, 75, 0.92)' : 'rgba(15, 23, 42, 0.86)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
    ctx.fill();

    // Viền bảng tên
    ctx.strokeStyle = duck.isBoosting 
      ? '#fbbf24' 
      : (isLeader ? '#f59e0b' : duck.color);
    ctx.lineWidth = (duck.isBoosting || isLeader) ? 2 : 1.2;
    ctx.stroke();

    // Chữ tên học sinh
    ctx.fillStyle = duck.isBoosting ? '#fef08a' : (isLeader ? '#fef08a' : '#ffffff');
    ctx.fillText(tagText, badgeX + 6, badgeY + 12);

    ctx.restore();
  };

  // Dừng hoặc đặt lại cuộc đua
  const resetRace = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setGameState('idle');
    setSelectedWinner(null);
    setBoostAnnounce(null);
    initDucks();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRiver(ctx, canvas, 305, canvas.width - 95, 0, []);
      const sortedDucks = [...ducksRef.current].sort((a, b) => a.y - b.y);
      sortedDucks.forEach(duck => drawDuck(ctx, duck, false));
    }
  };

  // Vẽ ban đầu khi mount hoặc đổi danh sách chọn
  useEffect(() => {
    initDucks();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawRiver(ctx, canvas, 305, canvas.width - 95, 0, []);
      const sortedDucks = [...ducksRef.current].sort((a, b) => a.y - b.y);
      sortedDucks.forEach(duck => drawDuck(ctx, duck, false));
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedIds]);

  // Thưởng sao cho học sinh được gọi trả bài
  const rewardWinner = (studentId, starsToAdd) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, stars: (s.stars || 0) + starsToAdd };
      }
      return s;
    });
    onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playStarDing();
    alert(`Đã cộng +${starsToAdd} ⭐ cho ${selectedWinner?.name || 'học sinh'}!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner & Control Bar */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <span style={{ fontSize: '1.6rem' }}>🦆</span> Đua Vịt Gọi Trả Bài (Duck Race)
              </h2>
              <span style={{
                fontSize: '0.8125rem',
                fontWeight: 800,
                padding: '0.2rem 0.7rem',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#d97706',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                🏫 Lớp: {currentClass?.name || 'Chưa chọn'}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Cuộc đua bơi vịt hào hứng để bốc thăm ngẫu nhiên học sinh lên bảng trả bài / kiểm tra miệng
            </p>
          </div>

          {/* Preset Buttons & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox"
                checked={excludeWinners}
                onChange={(e) => setExcludeWinners(e.target.checked)}
              />
              Loại bạn đã gọi
            </label>

            <button className="btn btn-outline btn-sm" onClick={handleResetCandidates} title="Khôi phục đầy đủ tất cả học sinh trong lớp">
              <RotateCcw size={14} />
              Cả lớp ({students.length})
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={handleSelectLowScore} title="Chọn các bạn chưa có điểm miệng hoặc điểm dưới 7">
                🎯 Cần gỡ điểm
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleSelectRandom(5)}>
                🎲 Ngẫu nhiên 5
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleSelectRandom(10)}>
                🎲 Ngẫu nhiên 10
              </button>
            </div>

            {/* Start / Stop Buttons */}
            {gameState === 'racing' ? (
              <button className="btn btn-danger" onClick={resetRace} style={{ fontWeight: 700 }}>
                <RotateCcw size={18} />
                <span>Dừng Lại</span>
              </button>
            ) : (
              <button 
                className="btn btn-amber pulse-card" 
                onClick={startRace}
                disabled={selectedIds.length < 2}
                style={{ fontWeight: 800, fontSize: '1rem', padding: '0.6rem 1.3rem' }}
              >
                <Play size={20} fill="#fff" />
                <span>BẮT ĐẦU ĐUA ({selectedIds.length} VỊT)</span>
              </button>
            )}
          </div>
        </div>

        {/* Boost announcer ticker */}
        {boostAnnounce && gameState === 'racing' && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.4rem 1rem',
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.875rem',
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease'
          }}>
            {boostAnnounce}
          </div>
        )}
      </div>

      {/* Main Race Canvas - Sông rộng, cả lớp cùng bơi trong 1 màn hình */}
      <div className="glass-panel" style={{
        padding: '0.65rem',
        background: '#0369a1',
        overflowX: 'auto',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <canvas
          ref={canvasRef}
          width={1200}
          height={450}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxHeight: '460px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
        />
      </div>

      {/* Modal Học Sinh Được Gọi Trả Bài (Khi vịt đầu tiên về đích) */}
      {gameState === 'finished' && selectedWinner && (
        <div className="modal-overlay" onClick={() => setGameState('idle')}>
          <div className="modal-content" style={{ maxWidth: 540, textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            {/* Nút thu nhỏ & đóng góc trên */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', zIndex: 10 }}>
              {onMinimize && (
                <button 
                  className="btn btn-icon btn-sm"
                  onClick={() => onMinimize(selectedWinner, 'duck')}
                  title="Tạm ẩn sang góc để chiếu slide"
                  style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}
                >
                  <Minimize2 size={18} />
                </button>
              )}
              <button 
                className="btn btn-icon btn-sm"
                onClick={() => setGameState('idle')}
                title="Đóng bảng"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '3.5rem', marginBottom: '0.25rem', animation: 'bounce 0.8s infinite' }}>🦆</div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#d97706',
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

            <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {selectedWinner.machineNumber && (
                <span className="badge badge-primary">💻 Máy {selectedWinner.machineNumber}</span>
              )}
              {selectedWinner.id && !String(selectedWinner.id).startsWith('hs_') && (
                <span className="badge badge-secondary">Mã: {selectedWinner.id}</span>
              )}
              <span className="badge badge-amber">⭐ {selectedWinner.stars || 0} Sao</span>
              <span className="badge" style={{ background: 'var(--surface-secondary)' }}>
                Điểm miệng: {selectedWinner.m1 !== null && selectedWinner.m1 !== undefined ? selectedWinner.m1 : 'Chưa có'}
              </span>
            </div>

            {/* Nút cộng sao & điều khiển */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {/* Nút Tạm Ẩn Sang Góc Để Hiện Slide */}
              {onMinimize && (
                <button 
                  className="btn btn-warning" 
                  onClick={() => onMinimize(selectedWinner, 'duck')}
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
                  onClick={() => rewardWinner(selectedWinner.id, 1)}
                  style={{ fontWeight: 700 }}
                >
                  <Star size={18} fill="#fff" />
                  +1 Sao Trả Lời Đúng
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => rewardWinner(selectedWinner.id, 2)}
                  style={{ fontWeight: 700 }}
                >
                  <Sparkles size={18} />
                  +2 Sao Xuất Sắc
                </button>
              </div>

              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setGameState('idle');
                  setTimeout(() => {
                    startRace();
                  }, 150);
                }}
                disabled={selectedIds.length < 2}
                style={{ fontWeight: 700 }}
              >
                <Play size={18} />
                Đua Tiếp Bạn Tiếp Theo ({selectedIds.length} HS còn lại)
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setGameState('idle')}>
                Đóng Bảng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2 Cột: Danh Sách Vịt Đua & Lịch Sử Gọi Trả Bài */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) 340px',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Cột 1: Roster Selection Checklist (Chọn học sinh tham gia) */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Danh sách vịt đua • Lớp {currentClass?.name || '---'} ({selectedIds.length}/{students.length} học sinh)
            </h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Bấm vào tên để chọn hoặc bớt
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '0.5rem',
            maxHeight: 260,
            overflowY: 'auto',
            padding: '0.5rem 0'
          }}>
            {students.map((student) => {
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

        {/* Cột 2: Lịch Sử Gọi Trả Bài */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCheck size={18} color="#f59e0b" />
            Lịch sử gọi trả bài {currentClass?.name ? `• Lớp ${currentClass.name}` : ''} ({calledHistory.length})
          </h4>

          {calledHistory.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Chưa có học sinh nào được gọi trong phiên này.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 260, overflowY: 'auto' }}>
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
  );
}
