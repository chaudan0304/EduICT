import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Flag, 
  Zap
} from 'lucide-react';

export default function SessionControlBar({
  status,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
  onPrevActivity,
  onNextActivity,
  canPrev,
  canNext,
  currentActivityTitle,
  onOpenQuickTool, // (toolName) => void: 'wheel' | 'quiz' | 'duckrace' | 'timer'
  onQuickAddMinutes,
  onLaunchPresentation = null
}) {
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';
  const isDraftOrReady = status === 'DRAFT' || status === 'READY';

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 90,
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--surface-border)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(16px)',
      padding: '0.75rem 1.25rem'
    }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Nhóm 1: Điều hướng Hoạt động (Trước / Tiếp) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onPrevActivity}
            disabled={!canPrev}
            style={{ opacity: canPrev ? 1 : 0.4, padding: '0.4rem 0.75rem' }}
            title="Quay lại hoạt động trước"
          >
            <ChevronLeft size={16} />
            <span>Trước</span>
          </button>

          {/* Nút Play / Pause / Start trung tâm */}
          {isDraftOrReady && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onStartSession}
              style={{
                padding: '0.5rem 1.25rem',
                fontWeight: 800,
                fontSize: '0.9375rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Play size={18} />
              <span>BẮT ĐẦU TIẾT HỌC</span>
            </button>
          )}

          {isRunning && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onPauseSession}
              style={{
                padding: '0.5rem 1.25rem',
                fontWeight: 800,
                fontSize: '0.9375rem',
                background: '#f59e0b',
                color: '#fff',
                borderColor: '#d97706'
              }}
              title="Tạm dừng tiết học và dừng đồng hồ"
            >
              <Pause size={18} />
              <span>TẠM DỪNG</span>
            </button>
          )}

          {isPaused && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onResumeSession}
              style={{
                padding: '0.5rem 1.25rem',
                fontWeight: 800,
                fontSize: '0.9375rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
              }}
              title="Tiếp tục tiết học"
            >
              <Play size={18} />
              <span>TIẾP TỤC</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onNextActivity}
            disabled={!canNext}
            style={{ opacity: canNext ? 1 : 0.4, padding: '0.4rem 0.75rem' }}
            title="Chuyển sang hoạt động tiếp theo"
          >
            <span>Tiếp</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Nhóm 2: Tên hoạt động đang chạy */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          maxWidth: 320,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Đang học:</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{currentActivityTitle}</span>
        </div>

        {/* Nhóm 3: Các công cụ trợ giảng nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Menu chỉnh thời gian nhanh */}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onQuickAddMinutes?.(1)}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
            title="Cộng thêm 1 phút cho tiết học"
          >
            <Clock size={14} />
            <span>+1p</span>
          </button>

          {/* Mở Trình Chiếu Bài Học */}
          {onLaunchPresentation && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onLaunchPresentation}
              style={{
                borderColor: 'rgba(2, 132, 199, 0.4)',
                background: 'rgba(2, 132, 199, 0.08)',
                color: '#0284c7',
                fontWeight: 700,
                fontSize: '0.8125rem'
              }}
              title="Mở trình chiếu bài học toàn màn hình (Presentation Mode)"
            >
              <span>📺 Slide</span>
            </button>
          )}

          {/* Vòng quay may mắn gọi học sinh */}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onOpenQuickTool('wheel')}
            style={{
              borderColor: 'rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.08)',
              color: '#6366f1',
              fontWeight: 700,
              fontSize: '0.8125rem'
            }}
            title="Mở nhanh Vòng quay may mắn gọi tên học sinh"
          >
            <span>🎡 Vòng Quay</span>
          </button>

          {/* Quick Quiz (Kiến trúc sẵn sàng) */}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onOpenQuickTool('quiz')}
            style={{
              borderColor: 'rgba(236, 72, 153, 0.4)',
              background: 'rgba(236, 72, 153, 0.08)',
              color: '#ec4899',
              fontWeight: 700,
              fontSize: '0.8125rem'
            }}
            title="Mở module trắc nghiệm nhanh / Đố vui"
          >
            <Zap size={14} />
            <span>Quick Quiz</span>
          </button>

          {/* Đua vịt nhanh */}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onOpenQuickTool('duckrace')}
            style={{
              borderColor: 'rgba(245, 158, 11, 0.4)',
              background: 'rgba(245, 158, 11, 0.08)',
              color: '#f59e0b',
              fontWeight: 700,
              fontSize: '0.8125rem'
            }}
            title="Mở mini-game Đua Vịt"
          >
            <span>🦆 Đua Vịt</span>
          </button>

          {/* Nút Kết thúc tiết học */}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onEndSession}
            style={{
              borderColor: 'rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              fontWeight: 800,
              fontSize: '0.8125rem',
              marginLeft: '0.4rem'
            }}
            title="Kết thúc tiết học và tạo báo cáo tổng kết"
          >
            <Flag size={15} />
            <span>Kết Thúc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
