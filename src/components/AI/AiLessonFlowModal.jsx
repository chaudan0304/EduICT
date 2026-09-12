import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  RotateCcw,
  Zap,
  BookOpen,
  Laptop,
  CheckSquare
} from 'lucide-react';
import { generateLessonFlowApi } from './aiService';

export default function AiLessonFlowModal({
  isOpen,
  onClose,
  lesson = null,
  lessons = [],
  onApplyFlow
}) {
  const [selectedLessonId, setSelectedLessonId] = useState(lesson?.id || '');
  const [durationMinutes, setDurationMinutes] = useState(35);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (lesson?.id) {
      setSelectedLessonId(lesson.id);
    } else if (lessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [lesson, lessons]);

  useEffect(() => {
    if (isOpen && (lesson?.id || selectedLessonId)) {
      handleGenerateFlow();
    } else if (!isOpen) {
      setFlowData(null);
      setError(null);
    }
  }, [isOpen]);

  const handleGenerateFlow = async () => {
    const lId = selectedLessonId || lesson?.id;
    if (!lId) {
      setError('Vui lòng chọn bài giảng để thiết kế tiến trình.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await generateLessonFlowApi({
        lessonId: Number(lId),
        durationMinutes: Number(durationMinutes) || 35
      });
      setFlowData(res.data);
      setIsCached(!!res.isCached);
    } catch (err) {
      console.error('[AI Lesson Flow] Lỗi:', err);
      let msg = err.message || 'Không thể tạo tiến trình tiết học.';
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

  const handleApply = () => {
    if (!flowData?.activities || flowData.activities.length === 0) return;

    // Chuẩn hóa sang định dạng activities của ClassroomSession
    const formattedActivities = flowData.activities.map((act, idx) => ({
      id: `act_ai_${Date.now()}_${idx}`,
      order_index: idx,
      type: act.type === 'WARMUP' ? 'WARMUP' : act.type === 'QUIZ' ? 'QUIZ' : act.type === 'PRACTICE' ? 'PRACTICE' : 'LESSON',
      title: act.title,
      duration_minutes: Number(act.duration) || 5,
      status: 'PENDING',
      description: act.description || '',
      notes: ''
    }));

    if (onApplyFlow) {
      onApplyFlow(formattedActivities);
    }
    onClose();
  };

  if (!isOpen) return null;

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
        maxWidth: 760,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.25s ease'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
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
              background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
            }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  AI Đề Xuất Tiến Trình Tiết Học (35 Phút)
                </h3>
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
                Tối ưu hóa 5 bước sư phạm phòng máy tin học: Khởi động ➜ Khám phá ➜ Luyện tập ➜ Đố vui ➜ Tổng kết.
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

        {/* Thanh Tùy Biến Bài & Thời Lượng */}
        <div style={{
          padding: '0.85rem 1.75rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {lessons.length > 0 && !lesson && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="input-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>
                    K{l.grade} - {l.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
              Thời lượng tiết học:
            </span>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="input-select"
              style={{ width: 110, fontSize: '0.85rem' }}
            >
              <option value={35}>35 phút (Tiểu học)</option>
              <option value={40}>40 phút</option>
              <option value={45}>45 phút</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerateFlow}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Đề xuất lại</span>
          </button>
        </div>

        {/* Danh Sách Tiến Trình Đề Xuất */}
        <div style={{ padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Loader2 size={44} className="animate-spin" style={{ color: '#0284c7', margin: '0 auto 1.25rem' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🤖 AI đang cân đối thời lượng và phân bổ 5 hoạt động...
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #94a3b8)', maxWidth: 460, margin: '0 auto' }}>
                Đảm bảo đúng chuẩn {durationMinutes} phút với thời gian tối thiểu 10 phút luyện tập thực hành máy tính.
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
                  Không thể tạo tiến trình
                </h4>
                <p style={{ fontSize: '0.875rem', margin: '0 0 0.85rem 0', color: 'var(--text-muted, #94a3b8)' }}>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleGenerateFlow}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RotateCcw size={14} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          )}

          {flowData && !loading && (
            <>
              {/* Tóm tắt thời lượng */}
              <div style={{
                background: 'rgba(2, 132, 199, 0.06)',
                border: '1px solid rgba(2, 132, 199, 0.2)',
                borderRadius: 12,
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="#0284c7" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    Tổng thời lượng: <strong style={{ color: '#0284c7' }}>{flowData.totalDuration || durationMinutes} phút</strong> ({flowData.activities?.length || 0} hoạt động)
                  </span>
                </div>

                {/* Thanh tiến trình màu */}
                <div style={{
                  display: 'flex',
                  width: 240,
                  height: 10,
                  borderRadius: 99,
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.1)'
                }}>
                  {flowData.activities?.map((act, i) => {
                    const colors = ['#f59e0b', '#0284c7', '#10b981', '#ec4899', '#8b5cf6'];
                    const pct = ((act.duration || 5) / (flowData.totalDuration || durationMinutes)) * 100;
                    return (
                      <div
                        key={i}
                        title={`${act.title}: ${act.duration} phút`}
                        style={{
                          width: `${pct}%`,
                          background: colors[i % colors.length],
                          height: '100%'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Danh sách các hoạt động chi tiết */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {flowData.activities?.map((act, idx) => {
                  const badgeColors = {
                    WARMUP: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', icon: '⚡' },
                    LESSON: { bg: 'rgba(2, 132, 199, 0.15)', text: '#0284c7', icon: '📖' },
                    PRACTICE: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', icon: '💻' },
                    QUIZ: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899', icon: '❓' },
                    SUMMARY: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', icon: '🏁' }
                  };
                  const badge = badgeColors[act.type] || badgeColors.LESSON;

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--surface-border, #334155)',
                        borderRadius: 12,
                        padding: '0.85rem 1.15rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.85rem'
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: badge.bg,
                        color: badge.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                            {badge.icon} {act.title}
                          </h4>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: badge.text,
                            background: badge.bg,
                            padding: '0.15rem 0.55rem',
                            borderRadius: 6
                          }}>
                            ⏱️ {act.duration} phút
                          </span>
                        </div>

                        {act.description && (
                          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
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
            className="btn btn-secondary btn-sm"
          >
            Hủy
          </button>

          {flowData && (
            <button
              type="button"
              onClick={handleApply}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Áp dụng vào Lesson Flow</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
