import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Star, 
  Clock, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft
} from 'lucide-react';

export default function SessionHeader({
  session,
  currentClass,
  onBackToList,
  participationRecords = [],
  onLaunchPresentation = null
}) {
  const [showNotes, setShowNotes] = useState(false);

  const students = currentClass?.students || [];
  const uniqueParticipants = new Set(participationRecords.map(p => p.student_id || p.studentId)).size;
  const totalStarsInSession = participationRecords.reduce((acc, p) => acc + (p.stars_awarded || p.starsAwarded || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RUNNING':
        return { label: 'ĐANG DIỄN RA', bg: '#10b981', color: '#fff', pulse: true };
      case 'PAUSED':
        return { label: 'ĐANG TẠM DỪNG', bg: '#f59e0b', color: '#fff', pulse: false };
      case 'COMPLETED':
        return { label: 'ĐÃ KẾT THÚC', bg: '#64748b', color: '#fff', pulse: false };
      default:
        return { label: 'SẴN SÀNG', bg: '#0284c7', color: '#fff', pulse: false };
    }
  };

  const badge = getStatusBadge(session.status);

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem 1.5rem',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Hàng 1: Nút quay lại, Tên lớp, Tên bài & Trạng thái */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={onBackToList}
            className="btn btn-outline btn-sm"
            title="Quay lại danh sách các tiết học"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} />
            <span>Danh Sách</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)'
              }}>
                {currentClass?.name || 'Lớp Học'} (Khối {currentClass?.grade || 3})
              </span>

              <h2 style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <BookOpen size={20} color="var(--primary)" />
                {session.lesson_title || session.lessonTitle || 'Tiết học Tin học'}
              </h2>

              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: badge.bg,
                color: badge.color,
                boxShadow: badge.pulse ? `0 0 10px ${badge.bg}` : 'none',
                letterSpacing: '0.05em'
              }}>
                {badge.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} />
                {session.session_date || session.sessionDate || 'Hôm nay'}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={14} />
                {session.duration_minutes || session.durationMinutes || 35} phút
              </span>
              <span>•</span>
              <span>Môn: {currentClass?.subject || 'Tin Học'}</span>
            </div>
          </div>
        </div>

        {/* Thống kê nhanh trong tiết */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--surface-secondary)',
            border: '1px solid var(--surface-border)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Users size={18} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tham gia</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {uniqueParticipants} / {students.length} HS
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Star size={18} color="#f59e0b" />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#d97706' }}>Sao tiết học</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f59e0b' }}>
                +{totalStarsInSession} ⭐
              </div>
            </div>
          </div>

          {onLaunchPresentation && (
            <button
              onClick={onLaunchPresentation}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
              title="Mở trình chiếu toàn màn hình bài giảng"
            >
              <span>📺</span>
              <span>Trình Chiếu Bài Học</span>
            </button>
          )}

          {(session.objectives || session.teacher_notes) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowNotes(prev => !prev)}
              style={{ fontSize: '0.8125rem' }}
            >
              <span>Mục tiêu & Ghi chú</span>
              {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Accordion Mục tiêu & Ghi chú giáo viên */}
      {showNotes && (session.objectives || session.teacher_notes) && (
        <div style={{
          background: 'var(--surface-secondary)',
          border: '1px dashed var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.1rem',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          display: 'grid',
          gridTemplateColumns: session.objectives && session.teacher_notes ? '1fr 1fr' : '1fr',
          gap: '1rem'
        }}>
          {session.objectives && (
            <div>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                🎯 Mục tiêu tiết học:
              </div>
              <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
                {session.objectives}
              </div>
            </div>
          )}

          {session.teacher_notes && (
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>
                📝 Ghi chú giáo viên:
              </div>
              <div style={{ color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
                {session.teacher_notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
