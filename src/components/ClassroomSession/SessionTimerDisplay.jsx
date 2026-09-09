import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  RotateCcw, 
  Plus, 
  Clock 
} from 'lucide-react';
import { soundEffects } from '../../utils/audio';

export default function SessionTimerDisplay({
  sessionDurationSec,
  sessionRemainingSec,
  currentActivity,
  activityRemainingSec,
  isRunning,
  isPaused,
  soundEnabled,
  onAdjustTime, // (sec) => void
  onResetActivityTimer,
  _onTogglePlayPause
}) {
  // Master Session Time formatted
  const formatTime = (totalSec) => {
    const s = Math.max(0, Math.floor(totalSec));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const sessionElapsedSec = Math.max(0, sessionDurationSec - sessionRemainingSec);
  const sessionPercent = sessionDurationSec > 0 
    ? Math.min(100, Math.max(0, ((sessionDurationSec - sessionRemainingSec) / sessionDurationSec) * 100))
    : 0;

  const actDurationSec = (currentActivity?.duration_minutes || currentActivity?.durationMinutes || 5) * 60;
  const actPercent = actDurationSec > 0 
    ? Math.min(100, Math.max(0, ((actDurationSec - activityRemainingSec) / actDurationSec) * 100))
    : 0;

  const isUrgent = sessionRemainingSec <= 60 && sessionRemainingSec > 0;
  const isLast10Sec = sessionRemainingSec <= 10 && sessionRemainingSec > 0;

  // Âm thanh tick trong 10 giây cuối
  useEffect(() => {
    if (isRunning && !isPaused && isLast10Sec && soundEnabled) {
      soundEffects.playTick();
    }
  }, [sessionRemainingSec, isRunning, isPaused, isLast10Sec, soundEnabled]);

  // Hết giờ
  useEffect(() => {
    if (isRunning && sessionRemainingSec === 0) {
      if (soundEnabled) {
        soundEffects.playBuzzer();
        setTimeout(() => soundEffects.playVictory(), 600);
      }
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [sessionRemainingSec, isRunning, soundEnabled]);

  return (
    <div style={{
      background: isUrgent 
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.06) 100%)'
        : 'var(--surface-card)',
      border: isUrgent ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--surface-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem 1.5rem',
      boxShadow: isUrgent ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'var(--shadow-sm)',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: '1.5rem',
      alignItems: 'center',
      transition: 'all 0.3s ease'
    }}>
      {/* Cột 1: Đồng hồ đếm ngược Tiết học Tổng (Master Timer) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <div style={{
            fontSize: '0.8125rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: isUrgent ? '#ef4444' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={16} />
            <span>Thời Gian Tiết Học</span>
            {isUrgent && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.6875rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 4
              }}>
                SẮP HẾT GIỜ
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Đã học: <strong>{formatTime(sessionElapsedSec)}</strong> / {formatTime(sessionDurationSec)}
          </div>
        </div>

        {/* Số đếm ngược khổng lồ */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <div style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            fontFamily: 'monospace',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: isUrgent ? '#ef4444' : (isPaused ? '#f59e0b' : 'var(--text-main)')
          }}>
            {formatTime(sessionRemainingSec)}
          </div>

          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            còn lại
          </span>

          {isPaused && (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              background: '#f59e0b',
              color: '#fff',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)'
            }}>
              TẠM DỪNG
            </span>
          )}
        </div>

        {/* Thanh tiến trình Master */}
        <div style={{
          width: '100%',
          height: 8,
          background: 'var(--surface-secondary)',
          borderRadius: 999,
          overflow: 'hidden',
          marginTop: '0.65rem',
          border: '1px solid var(--surface-border)'
        }}>
          <div style={{
            width: `${sessionPercent}%`,
            height: '100%',
            background: isUrgent 
              ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
              : 'linear-gradient(90deg, #0284c7, #2563eb)',
            borderRadius: 999,
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Cột 2: Đồng hồ Hoạt Động Đang Chọn & Phím Điều Chỉnh Thời Gian Nhanh */}
      <div style={{
        background: 'var(--surface-secondary)',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--surface-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Hoạt động hiện tại:
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
            {formatTime(activityRemainingSec)} / {formatTime(actDurationSec)}
          </span>
        </div>

        <div style={{
          fontSize: '1.05rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '0.5rem'
        }}>
          {currentActivity?.title || 'Chưa chọn hoạt động'}
        </div>

        {/* Mini progress bar cho hoạt động */}
        <div style={{
          width: '100%',
          height: 5,
          background: 'var(--surface-card)',
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: '0.75rem'
        }}>
          <div style={{
            width: `${actPercent}%`,
            height: '100%',
            background: '#10b981',
            borderRadius: 999,
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Nút cộng nhanh thời gian */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onAdjustTime(30)}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}
            title="Cộng thêm 30 giây cho hoạt động"
          >
            <Plus size={13} /> 30s
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onAdjustTime(60)}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}
            title="Cộng thêm 1 phút cho hoạt động"
          >
            <Plus size={13} /> 1p
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onAdjustTime(120)}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}
            title="Cộng thêm 2 phút cho hoạt động"
          >
            <Plus size={13} /> 2p
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onResetActivityTimer}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', marginLeft: 'auto' }}
            title="Đặt lại thời gian hoạt động về ban đầu"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}
