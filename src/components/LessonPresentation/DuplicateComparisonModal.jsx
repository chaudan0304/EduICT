import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns,
  ShieldCheck,
  Trash2,
  Loader2,
  FileQuestion,
  Info
} from 'lucide-react';
import SlideRenderer from './SlideRenderer';
import { fetchLessonDetailApi } from './lessonStorage';

/**
 * DuplicateComparisonModal.jsx
 * Modal đối chiếu chi tiết bài giảng trùng lặp
 * Cho phép xem side-by-side TOÀN BỘ slide của cả 2 bài giảng, đồng bộ theo số thứ tự slide.
 */
export default function DuplicateComparisonModal({
  isOpen = true,
  data = null, // { lesson, matchedLesson, score, tier, tierBadge, tierLabel, tierColor }
  onClose,
  onKeepLesson,
  onDeleteDuplicateLesson
}) {
  const [lessonSlides, setLessonSlides] = useState([]);
  const [matchedSlides, setMatchedSlides] = useState([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [viewMode, setViewMode] = useState('carousel'); // 'carousel' | 'grid'
  const activeThumbnailRef = useRef(null);

  // Tải dữ liệu slides đầy đủ của cả 2 bài khi modal mở
  useEffect(() => {
    if (!isOpen || !data?.lesson) {
      setLessonSlides([]);
      setMatchedSlides([]);
      setCurrentPairIndex(0);
      return;
    }

    let isMounted = true;
    setCurrentPairIndex(0);

    async function loadSlides() {
      setIsLoadingSlides(true);
      try {
        const [resA, resB] = await Promise.all([
          data.lesson.slides && data.lesson.slides.length > 0
            ? data.lesson
            : fetchLessonDetailApi(data.lesson.id),
          data.matchedLesson?.slides && data.matchedLesson.slides.length > 0
            ? data.matchedLesson
            : (data.matchedLesson?.id ? fetchLessonDetailApi(data.matchedLesson.id) : null)
        ]);

        if (isMounted) {
          const slidesA = resA?.slides || data.lesson.slides || [];
          const slidesB = resB?.slides || data.matchedLesson?.slides || [];
          setLessonSlides(slidesA);
          setMatchedSlides(slidesB);
        }
      } catch (err) {
        console.error('Lỗi khi tải slides bài giảng đối chiếu:', err);
      } finally {
        if (isMounted) {
          setIsLoadingSlides(false);
        }
      }
    }

    loadSlides();

    return () => {
      isMounted = false;
    };
  }, [isOpen, data?.lesson?.id, data?.matchedLesson?.id]);

  // Số lượng cặp slide tối đa
  const maxSlides = Math.max(lessonSlides.length, matchedSlides.length);

  // Tự động cuộn thumbnail phim vào vùng nhìn thấy khi đổi slide
  useEffect(() => {
    if (activeThumbnailRef.current && viewMode === 'carousel') {
      activeThumbnailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [currentPairIndex, viewMode]);

  // Điều hướng bằng bàn phím (ArrowLeft / ArrowRight / Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft') {
        setCurrentPairIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPairIndex((prev) => Math.min(maxSlides - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, maxSlides, onClose]);

  if (!isOpen || !data?.lesson) return null;

  const { lesson, matchedLesson, score, tier, tierBadge, tierLabel, tierColor } = data;
  const isExactHash = lesson.similarity_status === 'exact_duplicate' || tier === 'exact';
  const effectiveScore = score || lesson.similarity_score || (isExactHash ? 100 : 85);
  const effectiveColor = tierColor || (isExactHash ? '#ef4444' : '#d97706');

  // Slide hiện tại của từng bên
  const currentSlideA = lessonSlides[currentPairIndex] || null;
  const currentSlideB = matchedSlides[currentPairIndex] || null;

  // Render một khung slide (hoặc placeholder nếu bên kia không có slide)
  const renderSlideSlot = (slide, lessonObj, index, side) => {
    const isSideA = side === 'A';
    const accentColor = isSideA ? '#0284c7' : '#8b5cf6';
    const totalSlidesSide = isSideA ? lessonSlides.length : matchedSlides.length;

    if (!slide) {
      return (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: 'rgba(15, 23, 42, 0.4)',
            border: '2px dashed var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          <FileQuestion size={36} color="var(--text-muted)" style={{ opacity: 0.6 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Không có Slide {index + 1}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isSideA ? 'Bài giảng này' : 'Bài trong thư viện'} chỉ có tổng cộng {totalSlidesSide} slide.
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#090d16',
          border: `1px solid var(--surface-border)`,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
        }}
      >
        <SlideRenderer
          slide={slide}
          isPresentation={false}
          lessonId={lessonObj?.id}
        />
        {/* Badge thứ tự slide góc trên trái */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            color: accentColor,
            border: `1px solid ${accentColor}55`,
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          Slide {index + 1} / {totalSlidesSide}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 1080,
          maxHeight: '96vh',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================
            1. HEADER MODAL
           ========================================= */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-secondary)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isExactHash ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={17} color={effectiveColor} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Chi Tiết Đối Chiếu Trùng Lặp Bài Giảng
              </h3>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                So sánh song song toàn bộ slide để kiểm tra chính xác nội dung
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-icon"
            style={{ width: 30, height: 30, borderRadius: '50%' }}
            title="Đóng (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        {/* =========================================
            2. BODY MODAL (CUỘN NỘI DUNG)
           ========================================= */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          {/* BANNER TỶ LỆ TRÙNG KHỚP */}
          <div
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              background: isExactHash ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: isExactHash ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: effectiveColor }}>
                {isExactHash ? '🔴 Trùng lặp hoàn toàn (SHA-256 Hash)' : (tierBadge ? `${tierBadge} • ${tierLabel || 'Nội dung gần giống'}` : '🟠 Nội dung gần giống')}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {lesson.source_filename ? `Tệp nguồn: ${lesson.source_filename}` : 'Đã phát hiện đối sánh tương đồng nội dung trong cơ sở dữ liệu'}
              </div>
            </div>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                color: effectiveColor,
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.15rem'
              }}
            >
              <span>{effectiveScore}</span>
              <span style={{ fontSize: '0.85rem' }}>%</span>
            </div>
          </div>

          {/* SO SÁNH TỔNG QUAN HAI BÀI (ẢNH BÌA & METADATA) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {/* Cột Trái: Bài giảng này */}
            <div
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🟦 Bài giảng này
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {lessonSlides.length || lesson.slide_count || 0} slides
                </span>
              </div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0.1rem 0', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lesson.title}>
                {lesson.title}
              </h4>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Khối: <strong>{lesson.grade}</strong> • Chủ đề: <strong>{lesson.topic || 'Chưa phân loại'}</strong>
              </div>
            </div>

            {/* Cột Phải: Bài đã có trong thư viện */}
            <div
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🟪 Bài đã có trong thư viện
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {matchedSlides.length || matchedLesson?.slide_count || 0} slides
                </span>
              </div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0.1rem 0', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={matchedLesson?.title || 'Bài giảng gốc'}>
                {matchedLesson?.title || 'Bài giảng gốc'}
              </h4>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Khối: <strong>{matchedLesson?.grade || lesson.grade}</strong> • Chủ đề: <strong>{matchedLesson?.topic || 'Chưa phân loại'}</strong>
              </div>
            </div>
          </div>

          {/* =========================================
              3. KHU VỰC ĐỐI CHIẾU TOÀN BỘ SLIDE (SIDE-BY-SIDE)
             ========================================= */}
          <div
            style={{
              background: 'var(--surface-secondary)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {/* Header thanh công cụ đối chiếu */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderBottom: '1px solid var(--surface-border)',
                paddingBottom: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.925rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  🔍 Đối Chiếu Từng Slide Đối Ứng
                </span>
                {maxSlides > 0 && (
                  <span
                    style={{
                      background: 'rgba(2, 132, 199, 0.15)',
                      color: '#0284c7',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    {lessonSlides.length !== matchedSlides.length
                      ? `${lessonSlides.length} vs ${matchedSlides.length} slides (${maxSlides} cặp đối chiếu)`
                      : `${maxSlides} cặp slide`}
                  </span>
                )}
              </div>

              {/* Chuyển chế độ xem: Carousel / Grid */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--surface-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.2rem',
                  border: '1px solid var(--surface-border)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('carousel')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'carousel' ? 'var(--color-primary, #0284c7)' : 'transparent',
                    color: viewMode === 'carousel' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Columns size={14} />
                  <span>Từng cặp (Carousel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'grid' ? 'var(--color-primary, #0284c7)' : 'transparent',
                    color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <LayoutGrid size={14} />
                  <span>Tất cả (Cuộn)</span>
                </button>
              </div>
            </div>

            {/* TRẠNG THÁI LOADING SLIDES */}
            {isLoadingSlides ? (
              <div
                style={{
                  padding: '3rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  color: 'var(--text-muted)'
                }}
              >
                <Loader2 size={32} className="animate-spin" color="#0284c7" />
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Đang tải toàn bộ slide của cả 2 bài giảng...
                </div>
              </div>
            ) : maxSlides === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}
              >
                <Info size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.6 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  Chưa có dữ liệu slide để hiển thị
                </div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  Bài giảng có thể chưa hoàn tất quá trình trích xuất slide hoặc chưa có slide.
                </div>
              </div>
            ) : viewMode === 'carousel' ? (
              /* =========================================
                 A. CHẾ ĐỘ CAROUSEL (TỪNG CẶP SLIDE CHI TIẾT)
                 ========================================= */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Thanh điều hướng Carousel */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    background: 'var(--surface-card)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--surface-border)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentPairIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentPairIndex === 0}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      opacity: currentPairIndex === 0 ? 0.4 : 1,
                      cursor: currentPairIndex === 0 ? 'not-allowed' : 'pointer'
                    }}
                    title="Slide trước (Phím ←)"
                  >
                    <ChevronLeft size={16} />
                    <span>Slide trước</span>
                  </button>

                  {/* Dropdown chọn nhanh slide */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Đang so sánh:
                    </span>
                    <select
                      value={currentPairIndex}
                      onChange={(e) => setCurrentPairIndex(Number(e.target.value))}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--surface-secondary)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--surface-border)',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {Array.from({ length: maxSlides }).map((_, idx) => (
                        <option key={idx} value={idx}>
                          Cặp Slide {idx + 1} / {maxSlides}
                          {idx >= lessonSlides.length ? ' (Bài này thiếu)' : ''}
                          {idx >= matchedSlides.length ? ' (Bài gốc thiếu)' : ''}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      (Dùng phím ← / →)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPairIndex((prev) => Math.min(maxSlides - 1, prev + 1))}
                    disabled={currentPairIndex === maxSlides - 1}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      opacity: currentPairIndex === maxSlides - 1 ? 0.4 : 1,
                      cursor: currentPairIndex === maxSlides - 1 ? 'not-allowed' : 'pointer'
                    }}
                    title="Slide sau (Phím →)"
                  >
                    <span>Slide sau</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Khung hiển thị side-by-side của cặp slide hiện tại */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Cột Trái: Slide A */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#0284c7' }}>
                        Slide {currentPairIndex + 1} • {currentSlideA?.title || lesson.title}
                      </span>
                      {currentPairIndex >= lessonSlides.length && (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ Không có</span>
                      )}
                    </div>
                    {renderSlideSlot(currentSlideA, lesson, currentPairIndex, 'A')}
                  </div>

                  {/* Cột Phải: Slide B */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#8b5cf6' }}>
                        Slide {currentPairIndex + 1} • {currentSlideB?.title || matchedLesson?.title || 'Bài gốc'}
                      </span>
                      {currentPairIndex >= matchedSlides.length && (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ Không có</span>
                      )}
                    </div>
                    {renderSlideSlot(currentSlideB, matchedLesson, currentPairIndex, 'B')}
                  </div>
                </div>

                {/* Thanh Filmstrip (Dải cuộn ngang chọn nhanh các cặp slide) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Danh sách các cặp slide (cuộn ngang hoặc bấm để nhảy tới slide):
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      overflowX: 'auto',
                      padding: '0.5rem 0.25rem',
                      scrollBehavior: 'smooth'
                    }}
                  >
                    {Array.from({ length: maxSlides }).map((_, idx) => {
                      const isActive = idx === currentPairIndex;
                      const sA = lessonSlides[idx];
                      const sB = matchedSlides[idx];
                      const hasBoth = !!sA && !!sB;

                      return (
                        <button
                          key={idx}
                          ref={isActive ? activeThumbnailRef : null}
                          type="button"
                          onClick={() => setCurrentPairIndex(idx)}
                          style={{
                            flexShrink: 0,
                            width: 100,
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-md)',
                            border: isActive ? '2px solid #0284c7' : '1px solid var(--surface-border)',
                            background: isActive ? 'rgba(2, 132, 199, 0.15)' : 'var(--surface-card)',
                            boxShadow: isActive ? '0 0 12px rgba(2, 132, 199, 0.35)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: isActive ? '#0284c7' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <span>#{idx + 1}</span>
                            {!hasBoth && <span style={{ color: '#f59e0b', fontSize: '0.65rem' }}>⚠️</span>}
                          </div>

                          {/* Mini side-by-side indicator */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '2px',
                              height: 28,
                              background: '#090d16',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              padding: '1px'
                            }}
                          >
                            {sA?.image_url ? (
                              <img src={sA.image_url} alt="A" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ background: sA ? '#0284c744' : '#ef444433', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: sA ? '#0284c7' : '#ef4444' }}>
                                {sA ? 'A' : '✕'}
                              </div>
                            )}
                            {sB?.image_url ? (
                              <img src={sB.image_url} alt="B" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ background: sB ? '#8b5cf644' : '#ef444433', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: sB ? '#8b5cf6' : '#ef4444' }}>
                                {sB ? 'B' : '✕'}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* =========================================
                 B. CHẾ ĐỘ GRID (CUỘN XEM TOÀN BỘ CÁC CẶP)
                 ========================================= */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  maxHeight: 460,
                  overflowY: 'auto',
                  paddingRight: '0.4rem'
                }}
              >
                {Array.from({ length: maxSlides }).map((_, idx) => {
                  const sA = lessonSlides[idx];
                  const sB = matchedSlides[idx];

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      {/* Tiêu đề dòng cặp */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--surface-border)',
                          paddingBottom: '0.35rem'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: 'var(--text-main)'
                          }}
                        >
                          Cặp đối chiếu: Slide {idx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem' }}>
                          <span style={{ color: '#0284c7', fontWeight: 700 }}>
                            Bài này: {sA ? (sA.title ? sA.title.slice(0, 30) : `Slide ${idx + 1}`) : '⚠️ Thiếu slide'}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>|</span>
                          <span style={{ color: '#8b5cf6', fontWeight: 700 }}>
                            Bài gốc: {sB ? (sB.title ? sB.title.slice(0, 30) : `Slide ${idx + 1}`) : '⚠️ Thiếu slide'}
                          </span>
                        </div>
                      </div>

                      {/* 2 cột slide */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {renderSlideSlot(sA, lesson, idx, 'A')}
                        {renderSlideSlot(sB, matchedLesson, idx, 'B')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* =========================================
            4. FOOTER MODAL (NÚT HÀNH ĐỘNG GIỮ NGUYÊN)
           ========================================= */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: 'var(--surface-secondary)',
            flexShrink: 0
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
          >
            Đóng
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={() => onKeepLesson?.(lesson.id)}
              className="btn btn-secondary"
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                borderColor: '#10b981',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Xác nhận bài học hợp lệ và giữ lại trong thư viện"
            >
              <ShieldCheck size={16} />
              <span>🛡️ Giữ lại bài</span>
            </button>

            <button
              onClick={() => onDeleteDuplicateLesson?.(lesson)}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                background: '#ef4444',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
              }}
              title="Xóa vĩnh viễn bài giảng trùng này khỏi thư viện"
            >
              <Trash2 size={16} />
              <span>Xóa bài trùng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
