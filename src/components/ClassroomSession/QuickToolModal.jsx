import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, CheckCircle2 } from 'lucide-react';
import LuckyWheel from '../LuckyWheel';
import DuckRace from '../DuckRace';
import SeatingChart from '../SeatingChart';

export default function QuickToolModal({
  toolType, // 'wheel' | 'duckrace' | 'quiz' | 'seating' | null
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
          maxWidth: toolType === 'quiz' ? 580 : 1100,
          width: '96vw',
          maxHeight: '94vh',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  🎡 Vòng Quay May Mắn Trong Tiết Học
                </h3>
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: 'var(--primary)'
                }}>
                  🏫 Lớp: {currentClass?.name || 'Chưa chọn'}
                </span>
              </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  🦆 Đua Vịt Gọi Trả Bài Trong Tiết Học
                </h3>
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#d97706'
                }}>
                  🏫 Lớp: {currentClass?.name || 'Chưa chọn'}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Cuộc đua bơi vịt kịch tính bốc thăm chọn học sinh lên bảng trả bài hoặc kiểm tra miệng
              </p>
            </div>
            <DuckRace
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
            />
          </div>
        )}

        {/* 3. Practice Room (Sơ đồ phòng máy) */}
        {toolType === 'seating' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  🖥️ Sơ Đồ Phòng Máy Trong Tiết Học
                </h3>
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#059669'
                }}>
                  🏫 Lớp: {currentClass?.name || 'Chưa chọn'}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Phân công máy cho học sinh, đánh dấu máy hỏng, sơ đồ 31 máy phòng Tin học
              </p>
            </div>
            <SeatingChart
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
            />
          </div>
        )}

        {/* 4. Quick Quiz — Phân Hệ Đố Vui Tin Học */}
        {toolType === 'quiz' && (
          <div>
            <QuickQuizManager
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
              initialLaunchCreator={true}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
