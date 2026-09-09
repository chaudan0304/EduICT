import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Star, 
  ArrowRight, 
  Award, 
  X, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

export default function StarExchangeModal({
  isOpen,
  onClose,
  students,
  initialStudentId = null,
  onUpdateStudents,
  soundEnabled
}) {
  if (!isOpen) return null;

  const [selectedStudentId, setSelectedStudentId] = useState(
    initialStudentId || students[0]?.id || ''
  );
  const [targetColumn, setTargetColumn] = useState('m1'); // 'm1' | 'm2' | 'p15_1' | 'p15_2'
  const [pointsToConvert, setPointsToConvert] = useState(1); // 1 = 10 sao, 2 = 20 sao...
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentStudent = students.find(s => s.id === selectedStudentId);
  const availableStars = currentStudent?.stars || 0;
  const maxPossiblePoints = Math.floor(availableStars / 10);

  // Lấy điểm hiện tại của cột được chọn
  const getCurrentScore = () => {
    if (!currentStudent) return null;
    return currentStudent[targetColumn];
  };

  const currentScoreVal = getCurrentScore();
  const currentScoreNum = currentScoreVal !== null && currentScoreVal !== undefined ? currentScoreVal : 0;
  
  // Điểm sau khi cộng (tối đa 10.0)
  const predictedScore = Math.min(10.0, currentScoreNum + pointsToConvert);
  const starsCost = pointsToConvert * 10;
  const remainingStars = Math.max(0, availableStars - starsCost);

  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
    if (maxPossiblePoints < 1) {
      setPointsToConvert(1);
    } else if (pointsToConvert > maxPossiblePoints) {
      setPointsToConvert(Math.max(1, maxPossiblePoints));
    }
  }, [selectedStudentId, maxPossiblePoints]);

  const getColumnName = (col) => {
    switch (col) {
      case 'm1': return 'Điểm Miệng Lần 1';
      case 'm2': return 'Điểm Miệng Lần 2';
      case 'p15_1': return 'Điểm 15 Phút Lần 1';
      case 'p15_2': return 'Điểm 15 Phút Lần 2';
      default: return col;
    }
  };

  const handleConfirmExchange = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentStudent) {
      setErrorMsg('Vui lòng chọn học sinh.');
      return;
    }

    if (availableStars < 10) {
      setErrorMsg(`Học sinh "${currentStudent.name}" hiện có ${availableStars}⭐, chưa đủ 10⭐ để quy đổi tối thiểu 1.0 điểm.`);
      return;
    }

    if (availableStars < starsCost) {
      setErrorMsg(`Cần ${starsCost}⭐ để quy đổi ${pointsToConvert} điểm, nhưng học sinh chỉ có ${availableStars}⭐.`);
      return;
    }

    if (currentScoreNum >= 10) {
      setErrorMsg(`Cột ${getColumnName(targetColumn)} của học sinh đã đạt 10.0 điểm tuyệt đối! Vui lòng chọn cột điểm khác.`);
      return;
    }

    // Thực hiện quy đổi
    const updated = students.map(s => {
      if (s.id === currentStudent.id) {
        return {
          ...s,
          stars: s.stars - starsCost,
          [targetColumn]: Math.min(10, parseFloat(((s[targetColumn] || 0) + pointsToConvert).toFixed(1)))
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setSuccessMsg(`🎉 Quy đổi thành công! Đã trừ ${starsCost}⭐ và cộng +${pointsToConvert}.0 điểm vào ${getColumnName(targetColumn)} cho ${currentStudent.name}.`);

    if (soundEnabled) {
      soundEffects.playVictory();
    }

    // Tự động đóng modal sau 1.5 giây
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: '560px',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative'
        }}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* Tiêu đề Modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Quy Đổi Sao Lấy Điểm Học Tập
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tỷ lệ chính thức: <strong>10 Sao (⭐) = +1.0 Điểm</strong> vào bài Miệng / 15 Phút
            </p>
          </div>
        </div>

        {/* Banner Tỷ Lệ Quy Đổi */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.12) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.875rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>⭐ 10 Sao</span>
            <ArrowRight size={18} color="#d97706" />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>+1.0 Điểm Số</span>
          </div>
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(245, 158, 11, 0.2)',
            color: '#b45309',
            padding: '0.25rem 0.6rem',
            borderRadius: '999px',
            fontWeight: 600
          }}>
            Miệng & 15 Phút
          </span>
        </div>

        {/* Thông báo thành công / lỗi */}
        {successMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#059669',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#dc2626',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleConfirmExchange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Chọn học sinh */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Học Sinh Đổi Điểm:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-ground)',
                color: 'var(--text-main)',
                fontSize: '0.925rem',
                outline: 'none'
              }}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id}) — Hiện có {s.stars || 0}⭐ {s.stars >= 10 ? `(Đổi tối đa ${Math.floor((s.stars || 0)/10)}đ)` : '(Chưa đủ 10⭐)'}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn cột điểm muốn cộng */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Quy Đổi Vào Cột Điểm Nào:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { id: 'm1', label: 'Điểm Miệng 1', val: currentStudent?.m1 },
                { id: 'm2', label: 'Điểm Miệng 2', val: currentStudent?.m2 },
                { id: 'p15_1', label: 'Điểm 15 Phút 1', val: currentStudent?.p15_1 },
                { id: 'p15_2', label: 'Điểm 15 Phút 2', val: currentStudent?.p15_2 },
              ].map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setTargetColumn(item.id)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: targetColumn === item.id 
                      ? '2px solid var(--color-primary)' 
                      : '1px solid var(--surface-border)',
                    background: targetColumn === item.id 
                      ? 'rgba(79, 70, 229, 0.08)' 
                      : 'var(--surface-ground)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: targetColumn === item.id ? 'var(--color-primary)' : 'var(--text-main)' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Điểm hiện tại: <strong style={{ color: item.val !== null && item.val !== undefined ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {item.val !== null && item.val !== undefined ? `${item.val}đ` : 'Chưa có'}
                    </strong>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chọn số điểm muốn đổi */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Số Điểm Muốn Đổi:
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Tối đa có thể đổi: <strong>{maxPossiblePoints} điểm</strong> ({maxPossiblePoints * 10}⭐)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {[1, 2, 3].map(pts => (
                <button
                  type="button"
                  key={pts}
                  disabled={availableStars < pts * 10}
                  onClick={() => setPointsToConvert(pts)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: pointsToConvert === pts 
                      ? '2px solid #f59e0b' 
                      : '1px solid var(--surface-border)',
                    background: pointsToConvert === pts 
                      ? 'rgba(245, 158, 11, 0.12)' 
                      : 'var(--surface-ground)',
                    color: availableStars >= pts * 10 ? 'var(--text-main)' : 'var(--text-muted)',
                    cursor: availableStars >= pts * 10 ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    opacity: availableStars >= pts * 10 ? 1 : 0.45
                  }}
                >
                  +{pts}.0 Điểm ({pts * 10}⭐)
                </button>
              ))}
            </div>
          </div>

          {/* Thẻ xem trước kết quả quy đổi */}
          <div style={{
            background: 'var(--surface-ground)',
            border: '1px dashed var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.875rem 1rem',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sao Sau Khi Đổi</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                {remainingStars} ⭐
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '0.25rem' }}>(-{starsCost})</span>
              </div>
            </div>

            <div style={{ width: 1, height: 32, background: 'var(--surface-border)' }} />

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Điểm Dự Kiến ({getColumnName(targetColumn)})</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <span>{currentScoreNum}đ</span>
                <ArrowRight size={14} />
                <span style={{ fontSize: '1.25rem' }}>{predictedScore}đ</span>
                <TrendingUp size={16} />
              </div>
            </div>
          </div>

          {/* Nút hành động */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={availableStars < 10 || currentScoreNum >= 10}
              className="btn btn-primary"
              style={{ 
                flex: 2,
                background: availableStars >= 10 && currentScoreNum < 10 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                  : undefined,
                opacity: availableStars >= 10 && currentScoreNum < 10 ? 1 : 0.5,
                cursor: availableStars >= 10 && currentScoreNum < 10 ? 'pointer' : 'not-allowed'
              }}
            >
              <Sparkles size={18} />
              Xác Nhận Đổi {starsCost}⭐ Lấy +{pointsToConvert}đ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
