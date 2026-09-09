import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Bell, 
  Volume2, 
  Clock 
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

export default function ClassroomTimer({ soundEnabled }) {
  const [initialSeconds, setInitialSeconds] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  const presets = [
    { label: '10 Giây', seconds: 10 },
    { label: '30 Giây', seconds: 30 },
    { label: '1 Phút', seconds: 60 },
    { label: '2 Phút', seconds: 120 },
    { label: '5 Phút', seconds: 300 },
    { label: '10 Phút', seconds: 600 },
    { label: '15 Phút', seconds: 900 },
  ];

  const handleSelectPreset = (sec) => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    setInitialSeconds(sec);
    setTimeLeft(sec);
  };

  const toggleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(initialSeconds);
    }
    setIsRunning(prev => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    setTimeLeft(initialSeconds);
  };

  const addTime = (sec) => {
    setTimeLeft(prev => prev + sec);
    setInitialSeconds(prev => Math.max(prev, timeLeft + sec));
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);

            if (soundEnabled) {
              soundEffects.playBuzzer();
              setTimeout(() => soundEffects.playVictory(), 500);
            }

            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });

            return 0;
          }

          // Tiếng tick hồi hộp trong 5 giây cuối
          if (prev <= 6 && soundEnabled) {
            soundEffects.playTick();
          }

          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, soundEnabled]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = initialSeconds > 0 ? ((initialSeconds - timeLeft) / initialSeconds) * 100 : 0;
  const isUrgent = timeLeft <= 10 && timeLeft > 0;

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
              <span style={{ fontSize: '1.8rem' }}>⏱️</span> Đồng Hồ Đếm Giờ Lớp Học (Classroom Timer)
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Đếm ngược thời gian thảo luận nhóm, giải bài tập nhanh hoặc bấm giờ làm bài kiểm tra
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button
                key={p.seconds}
                className={`btn btn-sm ${initialSeconds === p.seconds && !isRunning ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleSelectPreset(p.seconds)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Giant Clock Panel */}
      <div className={`glass-panel ${isUrgent ? 'pulse-card' : ''}`} style={{
        padding: '3.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: isUrgent ? 'rgba(239, 68, 68, 0.06)' : 'var(--surface-card)',
        borderColor: isUrgent ? '#ef4444' : 'var(--surface-border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Giant Digit Display */}
        <div style={{
          fontSize: 'clamp(5rem, 16vw, 11rem)',
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: timeLeft === 0 ? '#ef4444' : (isUrgent ? '#ea580c' : 'var(--text-main)'),
          textShadow: isUrgent ? '0 0 20px rgba(239, 68, 68, 0.3)' : 'none',
          marginBottom: '1.5rem',
          transition: 'color 0.2s ease'
        }}>
          {formattedTime}
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          maxWidth: 680,
          height: 12,
          background: 'var(--surface-secondary)',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: '2.5rem'
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: isUrgent ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #4f46e5, #06b6d4)',
            transition: 'width 1s linear'
          }} />
        </div>

        {/* Big Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            className={`btn btn-lg ${isRunning ? 'btn-danger' : 'btn-primary pulse-card'}`}
            style={{ minWidth: 170, fontSize: '1.25rem', fontWeight: 800 }}
            onClick={toggleStart}
          >
            {isRunning ? (
              <>
                <Pause size={24} />
                <span>TẠM DỪNG</span>
              </>
            ) : (
              <>
                <Play size={24} fill="#fff" />
                <span>{timeLeft === 0 ? 'BẮT ĐẦU LẠI' : 'BẮT ĐẦU'}</span>
              </>
            )}
          </button>

          <button className="btn btn-secondary btn-lg" onClick={handleReset}>
            <RotateCcw size={20} />
            <span>Đặt Lại</span>
          </button>

          <button className="btn btn-outline btn-lg" onClick={() => addTime(30)}>
            <Plus size={20} />
            <span>+30 Giây</span>
          </button>
        </div>

        {timeLeft === 0 && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.6rem 1.5rem',
            background: '#fee2e2',
            color: '#b91c1c',
            fontWeight: 800,
            borderRadius: 'var(--radius-full)',
            fontSize: '1.1rem',
            animation: 'scaleUp 0.3s ease'
          }}>
            🔔 HẾT GIỜ! Xin mời các em dừng bút / hoàn thành câu trả lời!
          </div>
        )}
      </div>
    </div>
  );
}
