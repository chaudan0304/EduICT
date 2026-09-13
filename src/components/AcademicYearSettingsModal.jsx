import React, { useState, useEffect } from 'react';
import { Calendar, Save, X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { saveAcademicYearSettings, calculateAcademicYear } from '../utils/storage';

export default function AcademicYearSettingsModal({
  isOpen,
  onClose,
  initialSettings = { startMonth: 9, startDay: 5 },
  onSaveSuccess
}) {
  const [startDay, setStartDay] = useState(initialSettings?.startDay || 5);
  const [startMonth, setStartMonth] = useState(initialSettings?.startMonth || 9);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartDay(initialSettings?.startDay || 5);
      setStartMonth(initialSettings?.startMonth || 9);
      setError(null);
      setShowConfirmWarning(false);
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  
  const currentCalcYear = calculateAcademicYear(today, initialSettings?.startMonth || 9, initialSettings?.startDay || 5);
  const newCalcYear = calculateAcademicYear(today, Number(startMonth), Number(startDay));
  const willChangeCurrentYear = currentCalcYear !== newCalcYear;

  const handleAttemptSave = () => {
    setError(null);
    const d = parseInt(startDay, 10);
    const m = parseInt(startMonth, 10);

    if (isNaN(d) || d < 1 || d > 31) {
      setError('Ngày bắt đầu không hợp lệ (1 - 31)');
      return;
    }
    if (isNaN(m) || m < 1 || m > 12) {
      setError('Tháng bắt đầu không hợp lệ (1 - 12)');
      return;
    }

    // Yêu cầu Mục 36: Cảnh báo nếu thay đổi mốc làm thay đổi năm học hiện tại
    if (willChangeCurrentYear) {
      setShowConfirmWarning(true);
      return;
    }

    doExecuteSave(m, d);
  };

  const doExecuteSave = async (m, d) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await saveAcademicYearSettings(m, d);
      setShowConfirmWarning(false);
      onSaveSuccess?.(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể lưu cài đặt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--surface-card, #ffffff)',
        border: '1px solid var(--surface-border, #e2e8f0)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'scaleUp 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--surface-border, #e2e8f0)',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Cài Đặt Năm Học
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                Thiết lập mốc bắt đầu năm học của nhà trường
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '0.35rem',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nội dung cài đặt */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '0.75rem' }}>
            Ngày bắt đầu năm học
          </label>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: 'var(--surface-secondary, #f8fafc)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--surface-border, #e2e8f0)',
            marginBottom: '1rem'
          }}>
            {/* Input Ngày */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Ngày
              </div>
              <input
                type="number"
                min="1"
                max="31"
                value={startDay}
                onChange={(e) => setStartDay(e.target.value)}
                style={{
                  width: '72px',
                  height: '46px',
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  borderRadius: '10px',
                  border: '2px solid var(--primary, #0284c7)',
                  background: 'var(--surface-card, #fff)',
                  color: 'var(--text-main, #0f172a)'
                }}
              />
            </div>

            <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-muted, #94a3b8)', marginTop: '1.2rem' }}>/</span>

            {/* Input Tháng */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Tháng
              </div>
              <input
                type="number"
                min="1"
                max="12"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                style={{
                  width: '72px',
                  height: '46px',
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  borderRadius: '10px',
                  border: '2px solid var(--primary, #0284c7)',
                  background: 'var(--surface-card, #fff)',
                  color: 'var(--text-main, #0f172a)'
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--primary, #0284c7)', marginBottom: '0.2rem' }}>
              Mặc định: 05/09
            </div>
            Ngày này được dùng để xác định thời điểm bắt đầu năm học mới. Khi ngày hiện tại đạt hoặc vượt mốc này, hệ thống sẽ tự động xác định niên khóa mới tương ứng.
          </div>

          <div style={{
            background: 'rgba(2, 132, 199, 0.06)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: 'var(--text-main, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Năm học theo mốc hiện tại:</span>
            <span style={{ fontWeight: 800, color: 'var(--primary, #0284c7)' }}>
              {newCalcYear}
            </span>
          </div>

          {/* Modal Cảnh báo xác nhận đổi mốc thời gian */}
          {showConfirmWarning && (
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#b45309',
              fontSize: '0.825rem',
              lineHeight: 1.5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                <ShieldAlert size={16} color="#d97706" />
                <span>⚠ Cảnh báo thay đổi ngày bắt đầu năm học</span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                Ngày hiện tại là <b>{todayStr}</b>. Thay đổi mốc này sẽ làm năm học hiện tại thay đổi từ <b>{currentCalcYear}</b> thành <b>{newCalcYear}</b>.
              </div>
              <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                Bạn có chắc chắn muốn thay đổi thiết lập này?
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmWarning(false)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => doExecuteSave(parseInt(startMonth, 10), parseInt(startDay, 10))}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', background: '#d97706', borderColor: '#d97706', color: '#fff' }}
                >
                  Xác nhận thay đổi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showConfirmWarning && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--surface-border, #e2e8f0)',
            background: 'var(--surface-secondary, #f8fafc)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isSaving}
              style={{ fontSize: '0.875rem' }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAttemptSave}
              className="btn btn-primary"
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.875rem',
                fontWeight: 700
              }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
