import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Clock, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  BookOpen, 
  Coffee, 
  Sun, 
  Moon,
  ChevronRight
} from 'lucide-react';
import { 
  TEACHER_INFO, 
  PERIOD_SLOTS, 
  TIMETABLE_DATA, 
  getCurrentPeriodStatus, 
  formatTimeCountdown 
} from '../../utils/timetable';

export default function TimetableModal({
  isOpen,
  onClose,
  onSelectClassForSession = null // (className, grade) => void
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [periodStatus, setPeriodStatus] = useState(() => getCurrentPeriodStatus(new Date()));

  // Cập nhật đồng hồ thời gian thực mỗi 1 giây
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setPeriodStatus(getCurrentPeriodStatus(now));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDay = currentTime.getDay(); // 1..5

  const days = [
    { day: 1, name: 'THỨ HAI' },
    { day: 2, name: 'THỨ BA' },
    { day: 3, name: 'THỨ TƯ' },
    { day: 4, name: 'THỨ NĂM' },
    { day: 5, name: 'THỨ SÁU' }
  ];

  const morningSlots = PERIOD_SLOTS.filter(s => s.session === 'morning' && !s.isRecess);
  const afternoonSlots = PERIOD_SLOTS.filter(s => s.session === 'afternoon' && !s.isRecess);

  return typeof document !== 'undefined' && createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 1080,
          width: '96%',
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: '1.75rem',
          position: 'relative'
        }}
      >
        {/* Nút đóng góc trên */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline btn-sm"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 10,
            padding: '0.35rem 0.65rem'
          }}
        >
          <X size={18} />
        </button>

        {/* Tiêu đề Thời khóa biểu */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.25rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(2, 132, 199, 0.1)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            color: '#0284c7',
            fontSize: '0.8125rem',
            fontWeight: 800,
            marginBottom: '0.4rem'
          }}>
            <Calendar size={15} />
            <span>NĂM HỌC {TEACHER_INFO.schoolYear} • ÁP DỤNG TỪ {TEACHER_INFO.effectiveDate}</span>
          </div>

          <h2 style={{
            margin: 0,
            fontSize: '1.65rem',
            fontWeight: 900,
            letterSpacing: '0.02em',
            color: 'var(--text-main)'
          }}>
            LỊCH GIẢNG DẠY CÁ NHÂN
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Giáo viên: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{TEACHER_INFO.name} ({TEACHER_INFO.shortName})</span> • Môn {TEACHER_INFO.subject}
          </p>
        </div>

        {/* Banner Trạng Thái Thời Gian Thực (Live Real-time Period Tracker) */}
        <div style={{
          background: periodStatus.isTeachingNow 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))'
            : periodStatus.status === 'RECESS'
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(79, 70, 229, 0.03))',
          border: `1.5px solid ${
            periodStatus.isTeachingNow ? '#10b981' : periodStatus.status === 'RECESS' ? '#f59e0b' : 'rgba(99, 102, 241, 0.25)'
          }`,
          borderRadius: 'var(--radius-xl)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: periodStatus.isTeachingNow ? 'rgba(16, 185, 129, 0.2)' : periodStatus.status === 'RECESS' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              color: periodStatus.isTeachingNow ? '#10b981' : periodStatus.status === 'RECESS' ? '#d97706' : '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0
            }}>
              {periodStatus.isTeachingNow ? '🏫' : periodStatus.status === 'RECESS' ? '☕' : periodStatus.status === 'LUNCH_BREAK' ? '🍱' : '⏱'}
            </div>

            <div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: periodStatus.isTeachingNow ? '#059669' : periodStatus.status === 'RECESS' ? '#d97706' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {periodStatus.isTeachingNow 
                  ? '🟢 ĐANG TRONG TIẾT DẠY (THỜI GIAN THỰC)' 
                  : periodStatus.status === 'RECESS'
                  ? '☕ GIỜ RA CHƠI'
                  : periodStatus.status === 'LUNCH_BREAK'
                  ? '🍱 NGHỈ TRƯA BÁN TRÚ'
                  : '📅 THEO DÕI TIẾT DẠY'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                {periodStatus.dayName} • {periodStatus.label}
                {periodStatus.className && (
                  <span style={{ color: 'var(--primary)', marginLeft: '0.4rem' }}>
                    ({periodStatus.className})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Đồng hồ đếm ngược số phút còn lại */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--surface-card)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--surface-border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {periodStatus.isTeachingNow ? 'TIẾT HỌC CÒN' : 'THỜI GIAN'}
              </div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                color: periodStatus.isTeachingNow ? '#10b981' : periodStatus.status === 'RECESS' ? '#d97706' : 'var(--primary)',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {periodStatus.isTeachingNow || periodStatus.status === 'RECESS'
                  ? formatTimeCountdown(periodStatus.remainingSec)
                  : currentTime.toLocaleTimeString('vi-VN')}
              </div>
            </div>

            {periodStatus.isTeachingNow && onSelectClassForSession && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onSelectClassForSession(periodStatus.className, periodStatus.grade, periodStatus.slot);
                  onClose();
                }}
                style={{
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  padding: '0.45rem 0.85rem'
                }}
              >
                <Play size={14} fill="#fff" />
                Vào Dạy Ngay
              </button>
            )}
          </div>
        </div>

        {/* Bảng Thời Khóa Biểu Chuẩn */}
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            <thead>
              <tr style={{ background: 'var(--surface-secondary)', borderBottom: '2px solid var(--surface-border)' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 800, width: 65 }}>Buổi</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 800, width: 50 }}>Tiết</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, width: 120 }}>Thời gian</th>
                {days.map(d => {
                  const isToday = d.day === currentDay;
                  return (
                    <th 
                      key={d.day}
                      style={{
                        padding: '0.75rem 0.5rem',
                        fontWeight: 800,
                        background: isToday ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                        color: isToday ? '#0284c7' : 'var(--text-main)',
                        borderLeft: '1px solid var(--surface-border)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>{d.name}</span>
                        {isToday && (
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            color: '#0284c7',
                            background: 'rgba(2, 132, 199, 0.15)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            marginTop: '0.15rem'
                          }}>
                            Hôm nay
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* --- 1. BUỔI SÁNG --- */}
              {morningSlots.map((slot, idx) => {
                return (
                  <tr 
                    key={slot.id}
                    style={{
                      borderBottom: '1px solid var(--surface-border)',
                      background: idx % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-secondary)'
                    }}
                  >
                    {idx === 0 && (
                      <td 
                        rowSpan={4} 
                        style={{
                          fontWeight: 900,
                          fontSize: '1rem',
                          background: 'rgba(245, 158, 11, 0.08)',
                          color: '#d97706',
                          borderRight: '1px solid var(--surface-border)',
                          verticalAlign: 'middle'
                        }}
                      >
                        SÁNG
                      </td>
                    )}
                    <td style={{ fontWeight: 800, borderRight: '1px solid var(--surface-border)' }}>
                      {slot.period}
                    </td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', borderRight: '1px solid var(--surface-border)' }}>
                      {slot.startTime} - {slot.endTime}
                    </td>
                    {days.map(d => {
                      const daySched = TIMETABLE_DATA[d.day];
                      const cell = daySched?.morning?.[slot.period];
                      const isNow = d.day === currentDay && periodStatus.session === 'morning' && periodStatus.period === slot.period;

                      return (
                        <td 
                          key={d.day}
                          style={{
                            padding: '0.6rem 0.4rem',
                            borderLeft: '1px solid var(--surface-border)',
                            background: isNow 
                              ? 'rgba(16, 185, 129, 0.15)' 
                              : d.day === currentDay 
                              ? 'rgba(2, 132, 199, 0.04)' 
                              : 'transparent',
                            outline: isNow ? '2px solid #10b981' : 'none',
                            outlineOffset: -2
                          }}
                        >
                          {cell && !cell.isOff ? (
                            <div 
                              onClick={() => {
                                if (onSelectClassForSession) {
                                  onSelectClassForSession(cell.className, cell.grade, slot);
                                  onClose();
                                }
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)';
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.background = 'transparent';
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.2rem',
                                cursor: 'pointer',
                                padding: '0.35rem 0.25rem',
                                borderRadius: '8px',
                                transition: 'all 0.15s ease'
                              }}
                              title={`👉 Nhấp để tự động chọn Lớp ${cell.className} & mở danh sách bài học ngay`}
                            >
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {cell.subject}
                              </span>
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                color: '#1e40af',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1.5px solid rgba(59, 130, 246, 0.35)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px'
                              }}>
                                Lớp {cell.className}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* --- NGHỈ TRƯA BÁN TRÚ --- */}
              <tr style={{ background: 'rgba(99, 102, 241, 0.05)', borderBottom: '2px solid var(--surface-border)' }}>
                <td colSpan={8} style={{ padding: '0.6rem', fontWeight: 800, color: '#6366f1', fontSize: '0.8125rem' }}>
                  🍱 NGHỈ TRƯA BÁN TRÚ (10:15 / 10:30 - 14:00)
                </td>
              </tr>

              {/* --- 2. BUỔI CHIỀU --- */}
              {afternoonSlots.map((slot, idx) => {
                return (
                  <tr 
                    key={slot.id}
                    style={{
                      borderBottom: '1px solid var(--surface-border)',
                      background: idx % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-secondary)'
                    }}
                  >
                    {idx === 0 && (
                      <td 
                        rowSpan={3} 
                        style={{
                          fontWeight: 900,
                          fontSize: '1rem',
                          background: 'rgba(99, 102, 241, 0.08)',
                          color: '#4f46e5',
                          borderRight: '1px solid var(--surface-border)',
                          verticalAlign: 'middle'
                        }}
                      >
                        CHIỀU
                      </td>
                    )}
                    <td style={{ fontWeight: 800, borderRight: '1px solid var(--surface-border)' }}>
                      {slot.period}
                    </td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', borderRight: '1px solid var(--surface-border)' }}>
                      {slot.startTime} - {slot.endTime}
                    </td>
                    {days.map(d => {
                      const daySched = TIMETABLE_DATA[d.day];
                      const cell = daySched?.afternoon?.[slot.period];
                      const isNow = d.day === currentDay && periodStatus.session === 'afternoon' && periodStatus.period === slot.period;

                      return (
                        <td 
                          key={d.day}
                          style={{
                            padding: '0.6rem 0.4rem',
                            borderLeft: '1px solid var(--surface-border)',
                            background: isNow 
                              ? 'rgba(16, 185, 129, 0.15)' 
                              : d.day === currentDay 
                              ? 'rgba(2, 132, 199, 0.04)' 
                              : 'transparent',
                            outline: isNow ? '2px solid #10b981' : 'none',
                            outlineOffset: -2
                          }}
                        >
                          {cell && !cell.isOff ? (
                            <div 
                              onClick={() => {
                                if (onSelectClassForSession) {
                                  onSelectClassForSession(cell.className, cell.grade, slot);
                                  onClose();
                                }
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)';
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.background = 'transparent';
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.2rem',
                                cursor: 'pointer',
                                padding: '0.35rem 0.25rem',
                                borderRadius: '8px',
                                transition: 'all 0.15s ease'
                              }}
                              title={`👉 Nhấp để tự động chọn Lớp ${cell.className} & mở danh sách bài học ngay`}
                            >
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {cell.subject}
                              </span>
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                color: '#1e40af',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1.5px solid rgba(59, 130, 246, 0.35)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px'
                              }}>
                                Lớp {cell.className}
                              </span>
                            </div>
                          ) : cell?.isOff ? (
                            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                              {cell.note || 'Nghỉ'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Ghi chú & Nút đóng */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--surface-border)',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            💡 <em>Mẹo: Hệ thống tự động căn cứ thời gian thực để đếm ngược số phút còn lại của mỗi tiết học.</em>
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Đóng Bảng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
