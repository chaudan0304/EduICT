import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Tag, 
  HelpCircle,
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { analyzeLessonApi } from './aiService';
import { updateLessonApi } from '../LessonPresentation/lessonStorage';

export default function AiLessonAnalysisModal({
  isOpen,
  onClose,
  lesson,
  onOpenQuestionGen
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (isOpen && lesson?.id) {
      handleRunAnalysis();
    } else {
      setAnalysis(null);
      setError(null);
      setApplySuccess(false);
    }
  }, [isOpen, lesson?.id]);

  const handleRunAnalysis = async () => {
    if (!lesson?.id) return;
    setLoading(true);
    setError(null);
    setApplySuccess(false);
    try {
      const res = await analyzeLessonApi(lesson.id);
      setAnalysis(res.data);
      setIsCached(!!res.isCached);
    } catch (err) {
      console.error('[AI Analysis] Lỗi:', err);
      let msg = err.message || 'Không thể phân tích bài giảng.';
      if (err.errorCode === 'AI_NOT_CONFIGURED') {
        msg = 'Trợ giảng AI chưa được cấu hình GEMINI_API_KEY trong file .env.';
      } else if (err.errorCode === 'AI_RATE_LIMIT') {
        msg = 'Gemini đang quá tải hoặc đạt giới hạn lượt gọi (15 req/phút). Vui lòng thử lại sau giây lát.';
      } else if (err.errorCode === 'AI_TIMEOUT') {
        msg = 'AI phản hồi quá lâu (quá 45 giây). Vui lòng thử lại.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToLesson = async () => {
    if (!analysis || !lesson?.id) return;
    setIsApplying(true);
    try {
      const objectivesText = Array.isArray(analysis.objectives) ? analysis.objectives.join('\n• ') : (analysis.objectives || '');
      const keywordsText = Array.isArray(analysis.keywords) ? analysis.keywords.join(', ') : (analysis.keywords || '');
      
      await updateLessonApi(lesson.id, {
        objectives: objectivesText.startsWith('•') ? objectivesText : `• ${objectivesText}`,
        keywords: keywordsText
      });
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 3000);
    } catch (err) {
      alert(`❌ Lỗi cập nhật bài giảng: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen || !lesson) return null;

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
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
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
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
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
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  AI Phân Tích Bài Giảng
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  background: '#0284c7',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 99
                }}>
                  GDPT 2018
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
                    ⚡ Bộ nhớ đệm (Cache)
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)' }}>
                {lesson.title} • Khối {lesson.grade} • {lesson.topic || 'Tin học'}
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

        {/* Body Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Loader2 size={44} className="animate-spin" style={{ color: '#0284c7', margin: '0 auto 1.25rem' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🤖 Trợ Giảng AI đang phân tích nội dung bài giảng...
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #94a3b8)', maxWidth: 460, margin: '0 auto' }}>
                Trích xuất mục tiêu chuẩn kiến thức GDPT 2018, từ khóa trọng tâm và các hoạt động học tập đề xuất từ slide bài học.
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
                  Không thể kết nối Trợ Giảng AI
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
              {/* Thẻ tóm tắt thông số */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.85rem 1.15rem',
                borderRadius: 12,
                border: '1px solid var(--surface-border, #334155)'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Chủ đề GDPT</span>
                  <div style={{ fontWeight: 700, color: '#0284c7' }}>Chủ đề {analysis.topic || lesson.topic || 'Tin học'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Thời lượng đề xuất</span>
                  <div style={{ fontWeight: 700 }}>{analysis.durationMinutes || 35} phút</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Mức độ nội dung</span>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    {analysis.difficulty === 'basic' ? 'Cơ bản (Vừa sức)' : analysis.difficulty === 'intermediate' ? 'Thông hiểu' : 'Vận dụng'}
                  </div>
                </div>
              </div>

              {/* Mục tiêu bài học */}
              <div style={{
                background: 'rgba(2, 132, 199, 0.05)',
                border: '1px solid rgba(2, 132, 199, 0.2)',
                borderRadius: 12,
                padding: '1rem 1.25rem'
              }}>
                <h4 style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#0284c7',
                  margin: '0 0 0.65rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}>
                  <BookOpen size={17} />
                  <span>Mục Tiêu Bài Học (Yêu Cầu Cần Đạt)</span>
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {(Array.isArray(analysis.objectives) ? analysis.objectives : [analysis.objectives]).map((obj, i) => (
                    <li key={i} style={{ marginBottom: '0.35rem' }}>{obj}</li>
                  ))}
                </ul>
              </div>

              {/* Kiến thức trọng tâm & Từ khóa */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem'
                }}>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#6366f1',
                    margin: '0 0 0.65rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <Layers size={17} />
                    <span>Kiến Thức Trọng Tâm</span>
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.55 }}>
                    {(Array.isArray(analysis.keyKnowledge) ? analysis.keyKnowledge : [analysis.keyKnowledge]).map((k, i) => (
                      <li key={i} style={{ marginBottom: '0.3rem' }}>{k}</li>
                    ))}
                  </ul>
                </div>

                <div style={{
                  background: 'rgba(234, 179, 8, 0.05)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem'
                }}>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#eab308',
                    margin: '0 0 0.65rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <Tag size={17} />
                    <span>Từ Khóa Cốt Lõi</span>
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {(Array.isArray(analysis.keywords) ? analysis.keywords : []).map((kw, i) => (
                      <span key={i} style={{
                        background: 'rgba(234, 179, 8, 0.15)',
                        color: '#fef08a',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: 6,
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hoạt động đề xuất */}
              {analysis.suggestedActivities && analysis.suggestedActivities.length > 0 && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 12,
                  padding: '1rem 1.25rem'
                }}>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#10b981',
                    margin: '0 0 0.65rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <Sparkles size={17} />
                    <span>Hoạt Động Dạy Học Đề Xuất (Phòng Máy)</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {analysis.suggestedActivities.map((act, i) => (
                      <div key={i} style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: 8,
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem'
                      }}>
                        {act}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'var(--surface-ground, #0f172a)'
        }}>
          <div>
            {applySuccess && (
              <span style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>✓ Đã lưu mục tiêu vào bài giảng!</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {analysis && onOpenQuestionGen && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQuestionGen(lesson.id);
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderColor: '#0284c7',
                  color: '#0284c7'
                }}
              >
                <HelpCircle size={15} />
                <span>📝 Tạo câu hỏi trắc nghiệm</span>
              </button>
            )}

            {analysis && (
              <button
                type="button"
                onClick={handleApplyToLesson}
                disabled={isApplying}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                title="Lưu mục tiêu và từ khóa này vào thông tin bài giảng"
              >
                {isApplying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Cập nhật vào bài</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary btn-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
