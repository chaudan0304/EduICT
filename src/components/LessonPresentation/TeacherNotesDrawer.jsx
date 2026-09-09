import React from 'react';
import { X, BookOpen, Key, EyeOff } from 'lucide-react';

export default function TeacherNotesDrawer({
  isOpen,
  onClose,
  slide,
  lesson,
  currentSlideIndex,
  totalSlides
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '380px',
      maxWidth: '90vw',
      background: 'var(--surface-card)',
      borderLeft: '2px solid var(--surface-border)',
      boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.25)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Ghi Chú Sư Phạm
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Slide {currentSlideIndex + 1} / {totalSlides}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn btn-icon"
          style={{ width: 32, height: 32 }}
          title="Đóng ghi chú"
        >
          <X size={18} />
        </button>
      </div>

      {/* Cảnh báo an toàn trình chiếu */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.75rem',
        color: '#d97706',
        fontWeight: 600
      }}>
        <EyeOff size={16} />
        <span>Khung này chỉ giáo viên thấy trên máy tính điều khiển</span>
      </div>

      {/* Nội dung ghi chú */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* 1. Ghi chú riêng cho Slide hiện tại */}
        <div style={{
          background: 'var(--surface-secondary)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0284c7', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            💡 Hướng Dẫn Giảng Dạy Slide Này
          </div>
          <div style={{
            fontSize: '0.925rem',
            lineHeight: 1.65,
            color: 'var(--text-main)',
            whiteSpace: 'pre-wrap'
          }}>
            {slide?.teacher_notes || slide?.teacherNotes ? (
              slide.teacher_notes || slide.teacherNotes
            ) : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Chưa có ghi chú riêng cho slide này. Giáo viên có thể thêm ghi chú khi chỉnh sửa bài học.
              </span>
            )}
          </div>
        </div>

        {/* 2. Mục tiêu bài học */}
        {lesson?.objectives && (
          <div style={{
            background: 'var(--surface-secondary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              🎯 Mục Tiêu Bài Dạy
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
              {lesson.objectives}
            </div>
          </div>
        )}

        {/* 3. Từ khóa trọng tâm */}
        {lesson?.keywords && (
          <div style={{
            background: 'var(--surface-secondary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              <Key size={14} />
              <span>Từ Khóa Cốt Lõi</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {lesson.keywords.split(',').map((kw, idx) => (
                <span key={idx} style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#8b5cf6',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  #{kw.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. Mẹo sư phạm phòng máy */}
        <div style={{
          background: 'rgba(2, 132, 199, 0.05)',
          border: '1px dashed rgba(2, 132, 199, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            🌟 Mẹo sư phạm:
          </div>
          • Sử dụng phím <strong>Space</strong> hoặc mũi tên <strong>→</strong> trên bàn phím để chuyển slide.<br />
          • Nhấn vào nút <strong>⭐ Thưởng sao</strong> ở thanh công cụ dưới để khen ngợi học sinh ngay lập tức.<br />
          • Bấm phím <strong>F11</strong> để vào chế độ toàn màn hình máy chiếu.
        </div>
      </div>
    </div>
  );
}
