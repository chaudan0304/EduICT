import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Calendar, 
  FileSpreadsheet, 
  Layers, 
  Users, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { transitionSchoolYearInSqlite, calculateNextSchoolYear } from '../utils/storage';

export default function SchoolYearTransitionModal({
  isOpen,
  onClose,
  currentSchoolYear = '2026 - 2027',
  classes = [],
  onTransitionSuccess,
  onOpenImportExcel
}) {
  const [targetYear, setTargetYear] = useState(() => calculateNextSchoolYear(currentSchoolYear));
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transitionResult, setTransitionResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTargetYear(calculateNextSchoolYear(currentSchoolYear));
      setTransitionResult(null);
      setError(null);
    }
  }, [isOpen, currentSchoolYear]);

  if (!isOpen) return null;

  // Tính sơ bộ số lượng lớp và học sinh hiện có của năm cũ
  const classesGrade1 = classes.filter(c => Number(c.grade) === 1);
  const classesGrade2 = classes.filter(c => Number(c.grade) === 2);
  const classesGrade3 = classes.filter(c => Number(c.grade) === 3);
  const classesGrade4 = classes.filter(c => Number(c.grade) === 4);
  const classesGrade5 = classes.filter(c => Number(c.grade) === 5);

  const countStudents = (arr) => arr.reduce((sum, c) => sum + (c.students?.length || 0), 0);

  const handleExecuteTransition = async () => {
    const toYearClean = (targetYear || '').trim();
    if (!toYearClean) {
      setError('Vui lòng nhập tên năm học mới');
      return;
    }
    if (toYearClean === currentSchoolYear) {
      setError('Năm học mới phải khác năm học hiện tại');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await transitionSchoolYearInSqlite(currentSchoolYear, toYearClean);
      setTransitionResult(res);
      if (onTransitionSuccess) {
        onTransitionSuccess(toYearClean, res);
      }
    } catch (err) {
      setError(err.message || 'Chuyển năm học thất bại. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToImportExcel = () => {
    const target = transitionResult?.toYear || targetYear;
    onClose();
    if (onOpenImportExcel) {
      onOpenImportExcel(target);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        style={{ maxWidth: 680, width: '95%', maxHeight: '90vh', overflowY: 'auto' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Tự Động Chuyển Năm Học & Lên Lớp
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Quy trình tự động lên khối, bảo toàn lịch sử và chuẩn bị năm học mới
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-outline" 
            style={{ padding: '0.2rem 0.5rem' }}
            onClick={onClose}
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        {/* BƯỚC 2: KẾT QUẢ THÀNH CÔNG (YÊU CẦU 7 & 17) */}
        {transitionResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(2, 132, 199, 0.08) 100%)',
              border: '1.5px solid #10b981',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.35rem' }}>🎓</div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', margin: '0 0 0.5rem 0' }}>
                CHUYỂN NĂM HỌC THÀNH CÔNG!
              </h4>
              <div style={{ fontSize: '0.925rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Hệ thống đã khởi tạo hoàn tất dữ liệu cho năm học{' '}
                <span style={{ color: '#0284c7', fontWeight: 800 }}>{transitionResult.toYear}</span>
              </div>
            </div>

            {/* Chi tiết thống kê */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem'
            }}>
              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Năm cũ</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {transitionResult.fromYear}
                </div>
              </div>

              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Năm mới</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {transitionResult.toYear}
                </div>
              </div>

              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã chuyển</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669' }}>
                  {transitionResult.classesPromoted} lớp
                </div>
              </div>

              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lớp 5 kết thúc</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#d97706' }}>
                  {transitionResult.grade5Finished} lớp
                </div>
              </div>

              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lớp 1 mới</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0284c7' }}>
                  {transitionResult.grade1Created} lớp
                </div>
              </div>

              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Học sinh chuyển</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981' }}>
                  {transitionResult.studentsTransferred} HS
                </div>
              </div>
            </div>

            {/* HỘP CẢNH BÁO BẮT BUỘC: YÊU CẦU 7 & 8 */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1.5px solid #f59e0b',
              borderRadius: 'var(--radius-lg)',
              padding: '1.15rem 1.35rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.975rem', fontWeight: 800, color: '#b45309', marginBottom: '0.35rem' }}>
                    ⚠️ LƯU Ý: CẦN BỔ SUNG DANH SÁCH HỌC SINH LỚP 1 ({transitionResult.grade1Created} lớp)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.55 }}>
                    Năm học <strong>{transitionResult.toYear}</strong> đã được bổ sung các lớp 1 mới ({transitionResult.newGrade1ClassNames?.join(', ') || '1A1, 1A2...'}) nhưng <strong>chưa có danh sách học sinh</strong> (0 học sinh).
                    <br />
                    Vui lòng sử dụng chức năng <strong>"Import Excel"</strong> để nạp danh sách học sinh cho Khối 1.
                  </div>
                </div>
              </div>
            </div>

            {/* Các nút hành động */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}
              >
                Đóng
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGoToImportExcel}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  padding: '0.6rem 1.5rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                }}
              >
                <FileSpreadsheet size={17} />
                <span>📥 Import Danh Sách Lớp 1</span>
              </button>
            </div>
          </div>
        ) : (
          /* BƯỚC 1: XÁC NHẬN CHUYỂN NĂM HỌC */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Lựa chọn Năm Học */}
            <div style={{
              background: 'var(--surface-secondary)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.15rem 1.35rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Năm học hiện tại
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    {currentSchoolYear}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: 800 }}>
                  <ArrowRight size={24} />
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Năm học mới tiếp theo (*)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    placeholder="VD: 2026 - 2027"
                    style={{ fontWeight: 800, fontSize: '1.05rem', borderColor: 'var(--primary)' }}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Bảng tóm tắt quy trình tự động chuyển */}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={16} color="var(--primary)" />
                <span>Quy trình chuyển lớp tự động sẽ thực hiện:</span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <strong>Khối 1 → Khối 2:</strong> {classesGrade1.length} lớp ({countStudents(classesGrade1)} HS)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VD: 1A1 → 2A1</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <strong>Khối 2 → Khối 3:</strong> {classesGrade2.length} lớp ({countStudents(classesGrade2)} HS)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VD: 2A1 → 3A1</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <strong>Khối 3 → Khối 4:</strong> {classesGrade3.length} lớp ({countStudents(classesGrade3)} HS)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VD: 3A1 → 4A1</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <strong>Khối 4 → Khối 5:</strong> {classesGrade4.length} lớp ({countStudents(classesGrade4)} HS)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VD: 4A1 → 5A1</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '0.35rem', borderTop: '1px dashed var(--surface-border)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#d97706' }}>
                    <span style={{ fontWeight: 800 }}>🎓</span>
                    <strong>Khối 5 kết thúc ra trường:</strong> {classesGrade5.length} lớp ({countStudents(classesGrade5)} HS)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Không chuyển sang năm mới, lưu lịch sử</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0284c7' }}>
                    <Sparkles size={16} color="#0284c7" />
                    <strong>Bổ sung Khối 1 mới:</strong> {classesGrade1.length || 4} lớp mới
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>0 học sinh (chờ nạp Excel)</span>
                </div>
              </div>
            </div>

            {/* Cam kết an toàn dữ liệu */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.8rem',
              color: '#059669'
            }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Bảo toàn dữ liệu 100%:</strong> Dữ liệu năm học {currentSchoolYear} được giữ nguyên vẹn trong CSDL SQLite để phục vụ tra cứu, báo cáo và thống kê lịch sử.
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.8125rem',
                color: '#ef4444'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Các nút bấm */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={isProcessing}
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteTransition}
                disabled={isProcessing}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  padding: '0.6rem 1.5rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                }}
              >
                <GraduationCap size={18} />
                <span>{isProcessing ? 'Đang Chuyển Lớp...' : '🚀 Bắt Đầu Chuyển Năm Học'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
