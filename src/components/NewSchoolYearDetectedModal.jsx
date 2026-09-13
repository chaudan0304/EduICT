import React from 'react';
import { GraduationCap, ArrowRight, Clock, Sparkles, X } from 'lucide-react';

export default function NewSchoolYearDetectedModal({
  isOpen,
  onClose,
  newYear,
  previousYear,
  onConfirmTransition
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--surface-card, #ffffff)',
        border: '2px solid rgba(2, 132, 199, 0.3)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        animation: 'scaleUp 0.25s ease-out'
      }}>
        {/* Banner Top */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
          color: '#fff',
          padding: '1.75rem 2rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          <div style={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(4px)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)'
          }}>
            <GraduationCap size={32} color="#fff" />
          </div>

          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.02em' }}>
            🎓 ĐÃ BẮT ĐẦU NĂM HỌC MỚI
          </h2>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>
            Hệ thống nhận diện đã đến thời điểm năm học mới
          </div>
        </div>

        {/* Nội dung thông báo */}
        <div style={{ padding: '1.75rem 2rem' }}>
          <div style={{
            background: 'var(--surface-secondary, #f8fafc)',
            border: '1px solid var(--surface-border, #e2e8f0)',
            borderRadius: '14px',
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Năm học mới:
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              {newYear || '2027 - 2028'}
            </div>
            {previousYear && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                (Năm trước đó: <span style={{ fontWeight: 600 }}>{previousYear}</span>)
              </div>
            )}
          </div>

          <div style={{
            fontSize: '0.9rem',
            color: 'var(--text-main, #334155)',
            lineHeight: 1.6,
            marginBottom: '1.5rem'
          }}>
            <p style={{ margin: '0 0 0.6rem 0' }}>
              • Hệ thống đã tự động tạo năm học mới <b>{newYear}</b> trong cơ sở dữ liệu.
            </p>
            <p style={{ margin: '0 0 0.6rem 0', color: '#b45309', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
              ⚠ <b>Các lớp của năm học trước chưa được chuyển sang năm học mới.</b>
            </p>
            <p style={{ margin: 0, fontWeight: 600 }}>
              Bạn có muốn thực hiện chuyển lớp ngay bây giờ không?
            </p>
          </div>

          {/* Các nút hành động */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '0.5rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Clock size={16} />
              <span>Để sau</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onConfirmTransition?.();
              }}
              className="btn btn-primary"
              style={{
                flex: 1.3,
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <span>Chuyển lớp ngay</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
