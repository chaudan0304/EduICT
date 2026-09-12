import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldCheck
} from 'lucide-react';
import { analyzeClassApi } from './aiService';

export default function AiClassAnalysisModal({
  isOpen,
  onClose,
  currentClass
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (isOpen && currentClass?.id) {
      handleRunAnalysis();
    } else if (!isOpen) {
      setAnalysis(null);
      setError(null);
    }
  }, [isOpen, currentClass?.id]);

  const handleRunAnalysis = async () => {
    if (!currentClass?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeClassApi(currentClass.id);
      setAnalysis(res.data);
      setIsCached(!!res.isCached);
    } catch (err) {
      console.error('[AI Class Analysis] Lỗi:', err);
      let msg = err.message || 'Không thể phân tích lớp học.';
      if (err.errorCode === 'AI_NOT_CONFIGURED') {
        msg = 'Trợ giảng AI chưa được cấu hình GEMINI_API_KEY trong file .env.';
      } else if (err.errorCode === 'AI_RATE_LIMIT') {
        msg = 'Gemini đang quá tải hoặc đạt giới hạn gọi. Vui lòng thử lại sau.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currentClass) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2200,
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'var(--surface-card, #1e293b)',
        color: 'var(--text-main, #f8fafc)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--surface-border, #334155)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: 780,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.25s ease'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
          borderBottom: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  AI Phân Tích Sư Phạm Lớp Học
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  background: '#2563eb',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 99
                }}>
                  Thông tư 27/BGDĐT
                </span>
                {isCached && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 99
                  }}>
                    ⚡ Cache
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)' }}>
                {currentClass.name} • Khối {currentClass.grade || 3} • Sĩ số: {currentClass.students?.length || 0} học sinh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-icon"
            style={{ color: 'var(--text-muted, #94a3b8)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Thân Modal */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Loader2 size={44} className="animate-spin" style={{ color: '#2563eb', margin: '0 auto 1.25rem' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🤖 AI đang tổng hợp dữ liệu học tập và kỹ năng thực hành...
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #94a3b8)', maxWidth: 480, margin: '0 auto' }}>
                Đánh giá theo các tiêu chí Chuột, Bàn phím, Phần mềm đồ họa và sự tích cực trên lớp. Bảo mật: Không gửi thông tin định danh cá nhân nhạy cảm.
              </p>
            </div>
          )}

          {error && !loading && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertCircle size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444', margin: '0 0 0.35rem 0' }}>
                  Không thể phân tích lớp học
                </h4>
                <p style={{ fontSize: '0.875rem', margin: '0 0 0.85rem 0', color: 'var(--text-muted, #94a3b8)' }}>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RotateCcw size={14} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Tóm tắt chung */}
              <div style={{
                background: 'rgba(37, 99, 235, 0.06)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 12,
                padding: '1rem 1.25rem'
              }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#60a5fa', margin: '0 0 0.45rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <TrendingUp size={17} />
                  <span>Tổng Quan Năng Lực Học Tập Của Lớp</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {analysis.summary}
                </p>
              </div>

              {/* Điểm mạnh & Điểm cần lưu ý */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981', margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <CheckCircle2 size={17} />
                    <span>Điểm Mạnh & Nổi Trội</span>
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.55 }}>
                    {(analysis.strengths || []).map((st, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{st}</li>
                    ))}
                  </ul>
                </div>

                <div style={{
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b', margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <AlertTriangle size={17} />
                    <span>Hạn Chế Cần Khắc Phục</span>
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.55 }}>
                    {(analysis.weaknesses || []).map((wk, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{wk}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Nhóm học sinh cần hỗ trợ */}
              {analysis.studentsNeedingSupport && analysis.studentsNeedingSupport.length > 0 && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ef4444', margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Users size={17} />
                    <span>Học Sinh Cần Giáo Viên Quan Tâm & Kèm Cặp Thêm</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {analysis.studentsNeedingSupport.map((item, i) => (
                      <div key={i} style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 8,
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <strong style={{ color: '#f87171' }}>{item.studentRef}</strong>
                          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted, #94a3b8)' }}>{item.issue}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                          💡 <em>Gợi ý can thiệp:</em> {item.suggestedAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Khuyến nghị sư phạm */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div style={{
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#c084fc', margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Lightbulb size={17} />
                    <span>Đề Xuất Biện Pháp Sư Phạm Cho Tiết Học Tới</span>
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.55 }}>
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lưu ý sư phạm & Quyền kiểm soát của giáo viên */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--surface-border, #334155)',
                borderRadius: 8,
                padding: '0.65rem 1rem',
                fontSize: '0.775rem',
                color: 'var(--text-muted, #94a3b8)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Nguyên tắc Trợ Giảng AI:</strong> AI chỉ đóng vai trò trợ lý gợi ý sư phạm. Toàn bộ điểm số, đánh giá TT27 và xếp loại học sinh hoàn toàn do thầy/cô quyết định.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: 'var(--surface-ground, #0f172a)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 800 }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
