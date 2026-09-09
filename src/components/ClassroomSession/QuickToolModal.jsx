import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, CheckCircle2 } from 'lucide-react';
import LuckyWheel from '../LuckyWheel';
import DuckRace from '../DuckRace';

export default function QuickToolModal({
  toolType, // 'wheel' | 'duckrace' | 'quiz' | null
  onClose,
  currentClass,
  onUpdateStudents,
  soundEnabled
}) {
  if (!toolType) return null;

  return typeof document !== 'undefined' && createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: toolType === 'quiz' ? 580 : 960,
          width: '94%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '1.5rem',
          position: 'relative'
        }}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline btn-sm"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 10,
            padding: '0.3rem 0.6rem'
          }}
        >
          <X size={18} />
        </button>

        {/* 1. Lucky Wheel */}
        {toolType === 'wheel' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                🎡 Vòng Quay May Mắn Trong Tiết Học
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Bốc thăm gọi tên học sinh lên bảng hoặc trả lời câu hỏi mà không làm gián đoạn tiết học
              </p>
            </div>
            <LuckyWheel
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
            />
          </div>
        )}

        {/* 2. Duck Race */}
        {toolType === 'duckrace' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                🦆 Đua Vịt Lớp Học Trong Tiết Học
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Cuộc đua bơi vịt kịch tính chọn bạn trả lời hoặc gỡ điểm miệng
              </p>
            </div>
            <DuckRace
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
            />
          </div>
        )}

        {/* 3. Quick Quiz Placeholder */}
        {toolType === 'quiz' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.1))',
              border: '2px solid #ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#ec4899'
            }}>
              <Zap size={32} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              ⚡ Phân Hệ Quick Quiz (Đố Vui Tin Học)
            </h3>

            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 1.5rem' }}>
              Kiến trúc <strong>Classroom Session</strong> đã được thiết kế sẵn sàng các cổng kết nối dữ liệu (events, participation, score log) để tích hợp module ngân hàng câu hỏi trắc nghiệm Tin học Tiểu học.
            </p>

            <div style={{
              background: 'var(--surface-secondary)',
              border: '1px dashed var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Sẵn sàng kết nối ngân hàng câu hỏi GDPT 2018 (Khối 3, 4, 5)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Hỗ trợ hiển thị câu hỏi toàn màn hình máy chiếu</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Tự động cộng sao thi đua qua hệ thống Star Service hiện có</span>
              </div>
            </div>

            <button type="button" className="btn btn-primary" onClick={onClose}>
              Đã Hiểu, Quay Lại Tiết Học
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
