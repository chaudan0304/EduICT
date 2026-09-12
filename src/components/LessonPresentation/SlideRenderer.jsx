import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock, 
  Users, 
  User, 
  Sparkles, 
  ExternalLink,
  Play,
  Lightbulb,
  AlertTriangle,
  RotateCw,
  FileText,
  Loader2
} from 'lucide-react';
import { retrySlideRenderApi } from './lessonStorage';

export default function SlideRenderer({ 
  slide, 
  isProjector: _isProjector = false,
  isPresentation = false,
  onAwardStar = null,
  lessonId = null,
  sourceFilePath = null,
  onSlideUpdated = null
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [localSlide, setLocalSlide] = useState(slide);

  useEffect(() => {
    setLocalSlide(slide);
    setImageError(false);
    setRetryError(null);
  }, [slide?.id, slide?.order_index, slide?.image_url, slide?.render_status]);

  if (!slide) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)'
      }}>
        Chưa chọn slide để hiển thị
      </div>
    );
  }

  // Parse câu hỏi và hoạt động nếu đang là chuỗi JSON
  let questionData = slide.question_parsed;
  if (!questionData && slide.question_data) {
    try {
      questionData = typeof slide.question_data === 'string' ? JSON.parse(slide.question_data) : slide.question_data;
    } catch {}
  }

  let activityData = slide.activity_parsed;
  if (!activityData && slide.activity_data) {
    try {
      activityData = typeof slide.activity_data === 'string' ? JSON.parse(slide.activity_data) : slide.activity_data;
    } catch {}
  }

  // Cỡ chữ linh hoạt: trong Presentation Mode thì chữ to gấp đôi để chiếu xa
  const titleSize = isPresentation ? '2.75rem' : '1.75rem';
  const bodySize = isPresentation ? '1.45rem' : '1.05rem';
  const headingWeight = 800;

  // Render từng dòng gạch đầu dòng
  const renderFormattedContent = (contentStr, fontSize = bodySize) => {
    if (!contentStr) return null;
    const lines = contentStr.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isPresentation ? '1rem' : '0.65rem' }}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} style={{ height: '0.5rem' }} />;

          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || /^\d+\./.test(trimmed);
          return (
            <div 
              key={idx} 
              style={{ 
                fontSize, 
                lineHeight: 1.65, 
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                fontWeight: isBullet ? 500 : 400
              }}
            >
              {isBullet ? (
                <span>{trimmed}</span>
              ) : (
                <span>{trimmed}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 0. SLIDE: IMPORTED_SLIDE (Slide trích xuất nguyên bản từ PowerPoint)
  const activeSlide = localSlide || slide;
  if (activeSlide.type === 'IMPORTED_SLIDE' || activeSlide.type === 'PPTX_SLIDE' || (activeSlide.image_url && activeSlide.layout === 'FULL_IMAGE')) {
    const slideNum = activeSlide.order_index !== undefined ? activeSlide.order_index + 1 : (parseInt(activeSlide.title?.replace(/\D/g, ''), 10) || 1);
    const effectiveLessonId = lessonId || activeSlide.lesson_id;
    const effectiveSourcePath = sourceFilePath || activeSlide.source_file_path;

    const statusNormalized = (activeSlide.render_status || activeSlide.status || '').toLowerCase();
    const isProcessing = ['processing', 'pending', 'retrying'].includes(statusNormalized) && !activeSlide.image_url;

    // A. Slide đang xử lý trong nền (Requirement 11)
    if (isProcessing && !isRetrying) {
      return (
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#fff',
          gap: '1rem',
          padding: '2rem'
        }}>
          <Loader2 size={42} className="animate-spin" color="#a855f7" />
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
            Đang xử lý slide...
          </h3>
          <div style={{
            display: 'inline-block',
            background: 'rgba(168, 85, 247, 0.18)',
            color: '#c084fc',
            fontSize: '0.925rem',
            fontWeight: 800,
            padding: '0.2rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid rgba(168, 85, 247, 0.35)'
          }}>
            Slide {slideNum}
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
            Hình ảnh sẽ tự động hiển thị ngay khi hoàn tất.
          </p>
        </div>
      );
    }

    // B. Nếu slide bị lỗi render hoặc ảnh lỗi (onError) hoặc không có image_url
    const isFailed = ['failed'].includes(statusNormalized) || imageError || (!activeSlide.image_url && !isProcessing);
    if (isFailed) {
      return (
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.08) 0%, #090d16 75%)',
          padding: '2rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'rgba(18, 24, 38, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '1.25rem',
            padding: isPresentation ? '2.75rem 2.5rem' : '2rem',
            maxWidth: 580,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 158, 11, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.2)'
            }}>
              <AlertTriangle size={38} />
            </div>

            <div>
              <h3 style={{
                fontSize: isPresentation ? '1.75rem' : '1.35rem',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '0.4rem',
                letterSpacing: '-0.02em'
              }}>
                ⚠ Slide không thể kết xuất hình ảnh
              </h3>
              <div style={{
                display: 'inline-block',
                background: 'rgba(245, 158, 11, 0.18)',
                color: '#fbbf24',
                fontSize: '0.925rem',
                fontWeight: 800,
                padding: '0.2rem 0.85rem',
                borderRadius: '999px',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                marginBottom: '0.75rem'
              }}>
                Slide {slideNum}
              </div>
              <p style={{
                fontSize: isPresentation ? '1.05rem' : '0.9rem',
                color: 'rgba(255, 255, 255, 0.72)',
                lineHeight: 1.6,
                margin: 0
              }}>
                Slide này tạm thời chưa kết xuất được hình ảnh. Các slide khác trong bài vẫn hoạt động bình thường.
              </p>
              {activeSlide.error_message && (
                <div style={{
                  fontSize: '0.775rem',
                  color: '#fbbf24',
                  marginTop: '0.65rem',
                  fontFamily: 'monospace',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  wordBreak: 'break-word'
                }}>
                  {activeSlide.error_code || 'CONVERSION_FAILED'}: {activeSlide.error_message}
                </div>
              )}
              {retryError && (
                <div style={{
                  fontSize: '0.825rem',
                  color: '#ef4444',
                  marginTop: '0.5rem',
                  fontWeight: 600
                }}>
                  ❌ {retryError}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.85rem',
              justifyContent: 'center',
              width: '100%',
              marginTop: '0.35rem'
            }}>
              <button
                type="button"
                onClick={async () => {
                  if (!effectiveLessonId || isRetrying) return;
                  setIsRetrying(true);
                  setRetryError(null);
                  try {
                    const res = await retrySlideRenderApi(effectiveLessonId, activeSlide.id, slideNum);
                    if (res.success && res.slide) {
                      setLocalSlide(res.slide);
                      setImageError(false);
                      setRetryError(null);
                      if (onSlideUpdated) {
                        try {
                          onSlideUpdated(res.slide);
                        } catch (parentErr) {
                          console.warn('Lỗi callback onSlideUpdated:', parentErr);
                        }
                      }
                    } else {
                      setRetryError(res.error || 'Thử lại chưa thành công.');
                    }
                  } catch (err) {
                    setRetryError(err.message || 'Lỗi khi gọi API thử lại.');
                  } finally {
                    setIsRetrying(false);
                  }
                }}
                disabled={isRetrying}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: isPresentation ? '1rem' : '0.9rem',
                  border: 'none',
                  cursor: isRetrying ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {isRetrying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang kết xuất lại...</span>
                  </>
                ) : (
                  <>
                    <RotateCw size={18} />
                    <span>Thử kết xuất lại</span>
                  </>
                )}
              </button>

              {effectiveSourcePath && (
                <a
                  href={effectiveSourcePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.3rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: isPresentation ? '1rem' : '0.9rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <FileText size={18} />
                  <span>Mở file PowerPoint</span>
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    // C. Slide bình thường
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <img 
          src={activeSlide.image_url} 
          alt={activeSlide.title || `Slide ${slideNum}`} 
          onError={() => setImageError(true)}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            aspectRatio: '16/9',
            display: 'block',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
          }}
        />
      </div>
    );
  }

  // 1. SLIDE: TITLE (Trang bìa bài học)
  if (slide.type === 'TITLE') {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: isPresentation ? '3rem 4rem' : '2rem',
        background: 'radial-gradient(circle at center, rgba(2, 132, 199, 0.08) 0%, transparent 70%)',
        position: 'relative'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1.25rem',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
          color: '#fff',
          fontSize: isPresentation ? '1.15rem' : '0.85rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
        }}>
          <span>🖥️</span>
          <span>MÔN TIN HỌC TIỂU HỌC</span>
        </div>

        <h1 style={{
          fontSize: isPresentation ? '3.5rem' : '2.25rem',
          fontWeight: 900,
          color: 'var(--text-main)',
          lineHeight: 1.25,
          marginBottom: '1.5rem',
          maxWidth: 900,
          background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {slide.title || 'Tiêu Đề Bài Học'}
        </h1>

        <div style={{ maxWidth: 800, color: 'var(--text-muted)' }}>
          {renderFormattedContent(slide.content, isPresentation ? '1.5rem' : '1.1rem')}
        </div>
      </div>
    );
  }

  // 2. SLIDE: QUESTION (Câu hỏi trắc nghiệm tương tác)
  if (slide.type === 'QUESTION') {
    const qText = questionData?.question || slide.title || 'Câu hỏi trắc nghiệm:';
    const options = questionData?.options || ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'];
    const correctIdx = Number(questionData?.correct_index ?? questionData?.correctIndex ?? 0);
    const explanation = questionData?.explanation || '';

    const handleSelectOption = (idx) => {
      setSelectedOption(idx);
      setIsAnswerRevealed(true);
    };

    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isPresentation ? '2.5rem 3.5rem' : '1.5rem',
        boxSizing: 'border-box'
      }}>
        {/* Header câu hỏi */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              fontSize: isPresentation ? '1rem' : '0.8rem',
              fontWeight: 800,
              padding: '0.2rem 0.75rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <HelpCircle size={isPresentation ? 18 : 14} />
              THỬ TÀI TIN HỌC
            </span>
          </div>

          <h2 style={{
            fontSize: isPresentation ? '2.25rem' : '1.5rem',
            fontWeight: headingWeight,
            color: 'var(--text-main)',
            lineHeight: 1.35,
            marginBottom: '1.5rem'
          }}>
            {qText}
          </h2>
        </div>

        {/* Lưới 4 phương án lựa chọn */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isPresentation ? '1fr 1fr' : '1fr',
          gap: isPresentation ? '1.25rem' : '0.75rem',
          margin: 'auto 0'
        }}>
          {options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === correctIdx;
            
            let bg = 'var(--surface-secondary)';
            let borderColor = 'var(--surface-border)';
            let textColor = 'var(--text-main)';
            let icon = null;

            if (isAnswerRevealed) {
              if (isCorrect) {
                bg = 'rgba(16, 185, 129, 0.15)';
                borderColor = '#10b981';
                textColor = '#059669';
                icon = <CheckCircle2 size={isPresentation ? 28 : 20} color="#10b981" />;
              } else if (isSelected && !isCorrect) {
                bg = 'rgba(239, 68, 68, 0.15)';
                borderColor = '#ef4444';
                textColor = '#dc2626';
                icon = <XCircle size={isPresentation ? 28 : 20} color="#ef4444" />;
              }
            } else if (isSelected) {
              bg = 'rgba(2, 132, 199, 0.15)';
              borderColor = '#0284c7';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isPresentation ? '1.25rem 1.75rem' : '0.9rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  background: bg,
                  border: `2px solid ${borderColor}`,
                  color: textColor,
                  fontSize: isPresentation ? '1.45rem' : '1.05rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.2)' : 'var(--shadow-sm)'
                }}
              >
                <span>{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Khung giải thích & nút mở đáp án */}
        <div style={{
          marginTop: '1rem',
          padding: isPresentation ? '1.25rem' : '0.85rem',
          borderRadius: 'var(--radius-md)',
          background: isAnswerRevealed ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-secondary)',
          border: `1px solid ${isAnswerRevealed ? 'rgba(16, 185, 129, 0.3)' : 'var(--surface-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <Lightbulb size={isPresentation ? 24 : 18} color={isAnswerRevealed ? '#10b981' : '#f59e0b'} />
            <div style={{ fontSize: isPresentation ? '1.15rem' : '0.9rem', color: 'var(--text-muted)' }}>
              {isAnswerRevealed ? (
                <span><strong>Đáp án:</strong> {options[correctIdx]}. {explanation && `(${explanation})`}</span>
              ) : (
                <span>Bấm vào một phương án để kiểm tra câu trả lời, hoặc bấm <strong>Xem Đáp Án</strong>.</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsAnswerRevealed(prev => !prev)}
            className="btn btn-secondary"
            style={{ fontSize: isPresentation ? '1rem' : '0.85rem' }}
          >
            {isAnswerRevealed ? 'Ẩn Đáp Án' : 'Xem Đáp Án'}
          </button>
        </div>
      </div>
    );
  }

  // 3. SLIDE: ACTIVITY (Hoạt động thực hành trên máy tính)
  if (slide.type === 'ACTIVITY') {
    const actTask = activityData?.task || slide.content || 'Nhiệm vụ thực hành trên máy tính.';
    const actFormat = activityData?.format || 'pair';
    const actDuration = activityData?.duration || 10;

    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isPresentation ? '2.5rem 3.5rem' : '1.5rem',
        boxSizing: 'border-box'
      }}>
        {/* Header hoạt động */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              color: '#fff',
              fontSize: isPresentation ? '1rem' : '0.8rem',
              fontWeight: 800,
              padding: '0.2rem 0.75rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <span>💻</span>
              HOẠT ĐỘNG THỰC HÀNH
            </span>

            <span style={{
              background: 'rgba(236, 72, 153, 0.12)',
              color: '#ec4899',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              fontSize: isPresentation ? '0.95rem' : '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Clock size={isPresentation ? 16 : 12} />
              Thời gian: {actDuration} phút
            </span>

            <span style={{
              background: 'rgba(2, 132, 199, 0.12)',
              color: '#0284c7',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              fontSize: isPresentation ? '0.95rem' : '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              {actFormat === 'pair' ? <Users size={isPresentation ? 16 : 12} /> : <User size={isPresentation ? 16 : 12} />}
              {actFormat === 'pair' ? 'Ngồi ghép đôi 2 bạn/máy' : 'Làm việc cá nhân'}
            </span>
          </div>

          <h2 style={{
            fontSize: titleSize,
            fontWeight: headingWeight,
            color: 'var(--text-main)',
            lineHeight: 1.3,
            marginBottom: '1rem'
          }}>
            {slide.title || 'Nhiệm Vụ Thực Hành'}
          </h2>
        </div>

        {/* Thẻ nhiệm vụ nổi bật */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(2, 132, 199, 0.05) 100%)',
          border: '2px dashed rgba(236, 72, 153, 0.4)',
          borderRadius: 'var(--radius-xl)',
          padding: isPresentation ? '2.5rem' : '1.5rem',
          margin: 'auto 0',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            fontSize: isPresentation ? '1.65rem' : '1.15rem',
            lineHeight: 1.7,
            color: 'var(--text-main)'
          }}>
            {renderFormattedContent(actTask, isPresentation ? '1.6rem' : '1.15rem')}
          </div>
        </div>

        {/* Hướng dẫn an toàn & quy định */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-secondary)',
          padding: isPresentation ? '1rem 1.5rem' : '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: isPresentation ? '1.15rem' : '0.875rem',
          color: 'var(--text-muted)'
        }}>
          <span>🛡️ <strong>Lưu ý an toàn:</strong> Không giật dây điện, không mở ứng dụng ngoài khi chưa có hiệu lệnh.</span>
          {onAwardStar && (
            <button 
              onClick={onAwardStar} 
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '0.4rem 0.85rem' }}
            >
              ⭐ Thưởng Sao Nhanh
            </button>
          )}
        </div>
      </div>
    );
  }

  // 4. SLIDE: SUMMARY (Ghi nhớ cốt lõi)
  if (slide.type === 'SUMMARY') {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isPresentation ? '3rem 4rem' : '2rem',
        boxSizing: 'border-box',
        background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.06) 0%, transparent 70%)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 1rem',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          fontSize: isPresentation ? '1.1rem' : '0.85rem',
          fontWeight: 800,
          marginBottom: '1.25rem',
          alignSelf: 'flex-start'
        }}>
          <Sparkles size={isPresentation ? 20 : 16} />
          EM CẦN GHI NHỚ
        </div>

        <h2 style={{
          fontSize: titleSize,
          fontWeight: headingWeight,
          color: 'var(--text-main)',
          marginBottom: '2rem'
        }}>
          {slide.title || 'Ghi Nhớ Cốt Lõi Bài Học'}
        </h2>

        <div style={{
          background: 'var(--surface-card)',
          border: '2px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--radius-xl)',
          padding: isPresentation ? '2.5rem' : '1.75rem',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)'
        }}>
          {renderFormattedContent(slide.content, isPresentation ? '1.65rem' : '1.15rem')}
        </div>
      </div>
    );
  }

  // 5. SLIDE: IMAGE (Hình ảnh minh họa)
  if (slide.type === 'IMAGE') {
    const isSplitRight = slide.layout === 'SPLIT_RIGHT';
    const isSplitLeft = slide.layout === 'SPLIT_LEFT';

    const imageEl = (
      <div style={{
        flex: 1,
        height: '100%',
        minHeight: 250,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--surface-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--surface-border)'
      }}>
        {slide.image_url ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <img 
              src={slide.image_url} 
              alt={slide.title || 'Minh họa'} 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.parentElement?.querySelector('.img-error-fallback');
                if (fb) fb.style.display = 'flex';
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: isPresentation ? '65vh' : '45vh' }}
            />
            <div 
              className="img-error-fallback" 
              style={{ 
                display: 'none', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--text-muted)', 
                padding: '2rem', 
                textAlign: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '3rem' }}>🖼️</span>
              <p style={{ fontWeight: 700, color: 'var(--text-main)', margin: 0, fontSize: isPresentation ? '1.25rem' : '1rem' }}>
                Không thể tải hình ảnh minh họa
              </p>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                Vui lòng kiểm tra lại đường dẫn ảnh trong trình soạn thảo bài học
              </span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>🖼️</span>
            <p>Chưa có liên kết hình ảnh</p>
          </div>
        )}
      </div>
    );

    const textEl = (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{
          fontSize: titleSize,
          fontWeight: headingWeight,
          color: 'var(--text-main)',
          marginBottom: '1rem',
          lineHeight: 1.3
        }}>
          {slide.title || 'Quan sát hình ảnh'}
        </h2>
        {renderFormattedContent(slide.content, bodySize)}
      </div>
    );

    return (
      <div style={{
        height: '100%',
        width: '100%',
        padding: isPresentation ? '2.5rem 3.5rem' : '1.5rem',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: isSplitRight ? 'row' : (isSplitLeft ? 'row-reverse' : 'column'),
        gap: '2rem',
        alignItems: 'stretch'
      }}>
        {isSplitRight ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : isSplitLeft ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : (
          <>
            <div>
              <h2 style={{ fontSize: titleSize, fontWeight: headingWeight, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                {slide.title || 'Hình ảnh minh họa'}
              </h2>
            </div>
            {imageEl}
            {slide.content && (
              <div style={{ marginTop: '0.75rem' }}>
                {renderFormattedContent(slide.content, bodySize)}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // 6. SLIDE: VIDEO (Video thực hành)
  if (slide.type === 'VIDEO') {
    const rawUrl = slide.video_url?.trim() || '';
    let ytEmbed = null;
    const ytMatch = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      ytEmbed = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    return (
      <div style={{
        height: '100%',
        width: '100%',
        padding: isPresentation ? '2.5rem 3.5rem' : '1.5rem',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: '#fff',
              fontSize: isPresentation ? '1rem' : '0.8rem',
              fontWeight: 800,
              padding: '0.2rem 0.75rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Play size={14} fill="#fff" />
              VIDEO HƯỚNG DẪN THAO TÁC
            </span>
          </div>

          <h2 style={{ fontSize: titleSize, fontWeight: headingWeight, color: 'var(--text-main)', marginBottom: '1rem' }}>
            {slide.title || 'Xem clip hướng dẫn thực hành'}
          </h2>
        </div>

        {/* Khung video (Hỗ trợ nhúng YouTube hoặc player) */}
        <div style={{
          flex: 1,
          margin: '0.75rem 0',
          borderRadius: 'var(--radius-xl)',
          background: '#0f172a',
          border: '2px solid rgba(139, 92, 246, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: 280
        }}>
          {ytEmbed ? (
            <iframe
              src={ytEmbed}
              title={slide.title || 'Video bài giảng'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none', minHeight: 320 }}
            />
          ) : rawUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', color: '#fff' }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.45)'
              }}>
                <Play size={36} fill="#fff" />
              </div>

              <h3 style={{ fontSize: isPresentation ? '1.5rem' : '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Sẵn sàng phát video bài giảng
              </h3>

              <a 
                href={rawUrl} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#38bdf8',
                  fontSize: isPresentation ? '1.2rem' : '0.9rem',
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                  background: 'rgba(56, 189, 248, 0.15)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}
              >
                <span>Mở liên kết video trong tab mới</span>
                <ExternalLink size={16} />
              </a>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', padding: '2rem' }}>
              <Play size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: isPresentation ? '1.2rem' : '0.95rem' }}>Chưa nhập đường dẫn video cho slide này</p>
            </div>
          )}
        </div>

        {slide.content && (
          <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            {renderFormattedContent(slide.content, bodySize)}
          </div>
        )}
      </div>
    );
  }

  // 7. SLIDE: CONTENT (Mặc định: Nội dung kiến thức mới)
  return (
    <div style={{
      height: '100%',
      width: '100%',
      padding: isPresentation ? '3rem 4rem' : '1.75rem',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{
          fontSize: titleSize,
          fontWeight: headingWeight,
          color: 'var(--text-main)',
          lineHeight: 1.3,
          borderBottom: '3px solid #0284c7',
          paddingBottom: '0.75rem',
          display: 'inline-block'
        }}>
          {slide.title || 'Nội dung bài học'}
        </h2>
      </div>

      <div style={{ flex: 1 }}>
        {renderFormattedContent(slide.content, bodySize)}
      </div>
    </div>
  );
}
