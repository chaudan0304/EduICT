import React from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  CheckCircle2, 
  Star, 
  Users, 
  Clock, 
  Flag 
} from 'lucide-react';
import { soundEffects } from '../../utils/audio';

export default function SessionSummaryModal({
  isOpen,
  isConfirmingEnd,
  onCancelEnd,
  onConfirmEnd,
  onClose,
  session,
  currentClass,
  activities = [],
  participationRecords = [],
  soundEnabled
}) {
  // Bắn pháo hoa khi xem báo cáo thành công
  React.useEffect(() => {
    if (!isConfirmingEnd && isOpen) {
      if (soundEnabled) soundEffects.playVictory();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isConfirmingEnd, isOpen, soundEnabled]);

  if (!isOpen) return null;

  const students = currentClass?.students || [];

  // Thống kê người tham gia & sao
  const participantMap = {};
  participationRecords.forEach(p => {
    const sId = p.student_id || p.studentId;
    if (!participantMap[sId]) {
      participantMap[sId] = { count: 0, stars: 0 };
    }
    participantMap[sId].count += 1;
    participantMap[sId].stars += (p.stars_awarded || p.starsAwarded || 0);
  });

  const uniqueParticipantsCount = Object.keys(participantMap).length;
  const totalStarsInSession = participationRecords.reduce((acc, p) => acc + (p.stars_awarded || p.starsAwarded || 0), 0);

  // Top 3 học sinh sôi nổi nhất trong tiết
  const topParticipants = Object.entries(participantMap)
    .map(([sId, data]) => {
      const stu = students.find(s => s.id === sId);
      return {
        id: sId,
        name: stu ? stu.name : sId,
        machineNumber: stu ? stu.machineNumber : null,
        count: data.count,
        stars: data.stars
      };
    })
    .sort((a, b) => (b.stars !== a.stars ? b.stars - a.stars : b.count - a.count))
    .slice(0, 3);

  return typeof document !== 'undefined' && createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isConfirmingEnd ? 460 : 640,
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          position: 'relative'
        }}
      >
        {/* Trường hợp 1: Hộp thoại xác nhận kết thúc */}
        {isConfirmingEnd ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <Flag size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Xác Nhận Kết Thúc Tiết Học?
            </h3>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Thầy/cô có chắc chắn muốn kết thúc tiết học <strong>"{session?.lesson_title || session?.lessonTitle}"</strong>?
              Toàn bộ điểm sao và dữ liệu tương tác sẽ được tổng kết và lưu trữ vĩnh viễn.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onCancelEnd}>
                Hủy Bỏ
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={onConfirmEnd}
                style={{ background: '#ef4444', borderColor: '#dc2626' }}
              >
                🏁 Kết Thúc Tiết Học
              </button>
            </div>
          </div>
        ) : (
          /* Trường hợp 2: Báo cáo Tổng kết Chi tiết (Session Summary) */
          <div>
            {/* Header Tổng kết */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}>
                <Trophy size={30} />
              </div>

              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#10b981',
                marginBottom: '0.2rem'
              }}>
                BÁO CÁO TỔNG KẾT TIẾT HỌC
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                {session?.lesson_title || session?.lessonTitle || 'Tiết học Tin học'}
              </h2>

              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {currentClass?.name} • Năm học {currentClass?.schoolYear || '2025 - 2026'}
              </p>
            </div>

            {/* Thẻ Chỉ số nổi bật */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <Users size={20} color="var(--primary)" style={{ margin: '0 auto 0.25rem' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tham gia</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {uniqueParticipantsCount} / {students.length}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 700 }}>
                  {students.length > 0 ? Math.round((uniqueParticipantsCount / students.length) * 100) : 0}% sĩ số
                </div>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <Star size={20} color="#f59e0b" style={{ margin: '0 auto 0.25rem' }} />
                <div style={{ fontSize: '0.75rem', color: '#d97706' }}>Sao đã thưởng</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f59e0b' }}>
                  +{totalStarsInSession} ⭐
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  {participationRecords.length} lượt ghi nhận
                </div>
              </div>

              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <Clock size={20} color="#06b6d4" style={{ margin: '0 auto 0.25rem' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thời lượng</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {session?.duration_minutes || session?.durationMinutes || 35} phút
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#06b6d4', fontWeight: 700 }}>
                  Hoàn thành trọn vẹn
                </div>
              </div>
            </div>

            {/* Bục vinh quang: Top học sinh sôi nổi */}
            {topParticipants.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🏆 Học Sinh Tích Cực Nhất Tiết Học:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {topParticipants.map((p, idx) => (
                    <div
                      key={p.id}
                      style={{
                        background: idx === 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-secondary)',
                        border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.5rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>
                          {idx === 0 ? '🥇' : (idx === 1 ? '🥈' : '🥉')}
                        </span>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {p.name}
                          </span>
                          {p.machineNumber && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                              (Máy {p.machineNumber})
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.count} lần phát biểu
                        </span>
                        <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.875rem' }}>
                          +{p.stars} ⭐
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tiến trình các hoạt động đã hoàn thành */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                📋 Hoạt Động Bài Giảng:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {activities.map((act, idx) => (
                  <div
                    key={act.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      padding: '0.4rem 0.6rem',
                      background: 'var(--surface-secondary)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {act.title}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {act.duration_minutes || act.durationMinutes || 5} phút
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nút đóng */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button type="button" className="btn btn-primary" onClick={onClose} style={{ minWidth: 120 }}>
                Đóng & Về Danh Sách
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
