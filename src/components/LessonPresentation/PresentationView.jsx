import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  X, 
  BookOpen, 
  Star, 
  RotateCcw, 
  Clock,
  Zap
} from 'lucide-react';
import SlideRenderer from './SlideRenderer';
import TeacherNotesDrawer from './TeacherNotesDrawer';
import LuckyWheel from '../LuckyWheel';
import { soundEffects } from '../../utils/audio';
import CreateQuizModal from '../QuickQuiz/CreateQuizModal';
import QuizPlayer from '../QuickQuiz/QuizPlayer';
import QuizResultModal from '../QuickQuiz/QuizResultModal';

export default function PresentationView({
  lesson,
  initialSlideIndex = 0,
  onClose,
  currentClass = null,
  onUpdateStudents = null,
  onUpdateGoodScores = null,
  sessionTimerRemainingSec = null,
  soundEnabled = true
}) {
  const slides = lesson?.slides || [];
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialSlideIndex >= 0 && initialSlideIndex < slides.length) {
      return initialSlideIndex;
    }
    return 0;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [showStarModal, setShowStarModal] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [activeQuizSession, setActiveQuizSession] = useState(null);
  const [quizSummary, setQuizSummary] = useState(null);
  const [isQuizResultOpen, setIsQuizResultOpen] = useState(false);

  const currentSlide = slides[currentIndex] || slides[0];
  const totalSlides = slides.length;

  // Điều hướng Slide
  const handleNext = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(prev => prev + 1);
      if (soundEnabled) soundEffects.playClick();
    }
  }, [currentIndex, totalSlides, soundEnabled]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (soundEnabled) soundEffects.playClick();
    }
  }, [currentIndex, soundEnabled]);

  const handleGoToSlide = (idx) => {
    if (idx >= 0 && idx < totalSlides) {
      setCurrentIndex(idx);
      if (soundEnabled) soundEffects.playClick();
    }
  };

  // Toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Phím tắt bàn phím: ←, →, Space, Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Nếu đang mở modal thì không bắt phím điều hướng slide
      if (showStarModal || showWheelModal) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ': // Spacebar
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          handlePrev();
          break;
        case 'Escape':
          e.preventDefault();
          if (isNotesOpen) {
            setIsNotesOpen(false);
          } else {
            onClose();
          }
          break;
        case 'Home':
          e.preventDefault();
          setCurrentIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentIndex(totalSlides - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose, totalSlides, isNotesOpen, showStarModal, showWheelModal]);

  // Tự động ẩn thanh công cụ khi không rê chuột (Auto-hide dock)
  useEffect(() => {
    let timeoutId = null;
    const handleMouseMove = () => {
      setIsControlsVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsControlsVisible(false);
      }, 4000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  // Xử lý cộng sao nhanh cho học sinh
  const handleAwardStarToStudent = (studentId, starCount = 1) => {
    if (!currentClass || !onUpdateStudents) return;
    const students = currentClass.students || [];
    const target = students.find(s => s.id === studentId);
    if (!target) return;

    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, stars: (s.stars || 0) + starCount };
      }
      return s;
    });

    onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playStarDing();

    // Thêm vào goodScores nếu có hàm
    if (onUpdateGoodScores) {
      const merit = {
        id: `gs_${Date.now()}`,
        studentId: target.id,
        ruleId: 'rule_pos_1',
        type: 'positive',
        points: starCount,
        title: `Phát biểu trong bài: ${lesson?.title || 'Slide'}`,
        timestamp: new Date().toISOString()
      };
      const existingMerits = currentClass.goodScores || [];
      onUpdateGoodScores([merit, ...existingMerits]);
    }

    setShowStarModal(false);
  };

  // Định dạng thời gian
  const formatTime = (totalSec) => {
    if (totalSec === null || totalSec === undefined) return null;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--surface-ground)',
      color: 'var(--text-main)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflow: 'hidden'
    }}>
      {/* 1. Header Nhẹ Nhàng: Tiêu đề bài & Thông số góc trên */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        opacity: isControlsVisible ? 1 : 0.25,
        transition: 'opacity 0.3s ease',
        pointerEvents: isControlsVisible ? 'auto' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '0.875rem',
            fontWeight: 700
          }}>
            <span style={{ color: '#0284c7' }}>📖 {lesson?.title || 'Bài giảng'}</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>Khối {lesson?.grade || 3}</span>
          </div>

          {sessionTimerRemainingSec !== null && (
            <div style={{
              background: 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              borderRadius: '999px',
              padding: '0.35rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#0284c7',
              fontSize: '0.875rem',
              fontWeight: 800
            }}>
              <Clock size={16} />
              <span>{formatTime(sessionTimerRemainingSec)}</span>
            </div>
          )}
        </div>

        {/* Nút thoát góc trên */}
        <button
          onClick={onClose}
          className="btn btn-icon"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            boxShadow: 'var(--shadow-sm)',
            width: 40,
            height: 40,
            borderRadius: '50%'
          }}
          title="Thoát trình chiếu (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      {/* 2. Slide Canvas Chính (Fullscreen / 16:9 responsive) */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem 6rem 1rem',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1380px',
          height: '100%',
          maxHeight: '88vh',
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--surface-border)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <SlideRenderer 
            slide={currentSlide} 
            isProjector={true} 
            isPresentation={true}
            onAwardStar={() => setShowStarModal(true)}
          />
        </div>
      </main>

      {/* 3. Thanh Điều Khiển Cố Định Dưới (Floating Dock) */}
      <div style={{
        position: 'absolute',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        opacity: isControlsVisible ? 1 : 0.15,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isControlsVisible ? 'auto' : 'none'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '999px',
          padding: '0.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
          color: '#fff'
        }}>
          {/* Nút lùi */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="btn btn-icon"
            style={{
              background: currentIndex === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.12)',
              color: currentIndex === 0 ? 'rgba(255, 255, 255, 0.3)' : '#fff',
              width: 38,
              height: 38,
              borderRadius: '50%'
            }}
            title="Slide trước (← hoặc PageUp)"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Chọn nhanh slide */}
          <select
            value={currentIndex}
            onChange={(e) => handleGoToSlide(Number(e.target.value))}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: 'pointer',
              outline: 'none',
              padding: '0 0.25rem'
            }}
          >
            {slides.map((s, idx) => (
              <option key={s.id || idx} value={idx} style={{ background: '#1e293b', color: '#fff' }}>
                Slide {String(idx + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}: {s.title ? s.title.slice(0, 25) : s.type}
              </option>
            ))}
          </select>

          {/* Nút tiến */}
          <button
            onClick={handleNext}
            disabled={currentIndex === totalSlides - 1}
            className="btn btn-icon"
            style={{
              background: currentIndex === totalSlides - 1 ? 'transparent' : 'rgba(255, 255, 255, 0.12)',
              color: currentIndex === totalSlides - 1 ? 'rgba(255, 255, 255, 0.3)' : '#fff',
              width: 38,
              height: 38,
              borderRadius: '50%'
            }}
            title="Slide tiếp (→, Space hoặc PageDown)"
          >
            <ChevronRight size={22} />
          </button>

          <div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Công cụ sư phạm: Thưởng sao */}
          {currentClass && onUpdateStudents && (
            <button
              onClick={() => setShowStarModal(true)}
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 700,
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Thưởng sao nhanh cho học sinh"
            >
              <Star size={16} fill="#fff" />
              <span>Thưởng ⭐</span>
            </button>
          )}

          {/* Công cụ sư phạm: Vòng quay bốc thăm */}
          {currentClass && (
            <button
              onClick={() => setShowWheelModal(true)}
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 700,
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Mở Vòng quay may mắn gọi học sinh"
            >
              <RotateCcw size={16} />
              <span>Vòng Quay</span>
            </button>
          )}

          {/* Quick Quiz củng cố */}
          <button
            onClick={() => setShowQuizModal(true)}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 700,
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Mở Quick Quiz đố vui củng cố kiến thức"
          >
            <Zap size={16} fill="#fff" />
            <span>Quick Quiz</span>
          </button>

          {/* Ghi chú sư phạm (Teacher Notes) */}
          <button
            onClick={() => setIsNotesOpen(prev => !prev)}
            className="btn"
            style={{
              background: isNotesOpen ? '#0284c7' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 700,
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Xem ghi chú sư phạm slide này"
          >
            <BookOpen size={16} />
            <span>Ghi Chú</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="btn btn-icon"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              width: 38,
              height: 38,
              borderRadius: '50%'
            }}
            title="Toàn màn hình máy chiếu (F11)"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* 4. Ngăn Kéo Ghi Chú Sư Phạm (Teacher Notes) */}
      <TeacherNotesDrawer
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        slide={currentSlide}
        lesson={lesson}
        currentSlideIndex={currentIndex}
        totalSlides={totalSlides}
      />

      {/* 5. Modal Thưởng Sao Nhanh Cho Học Sinh */}
      {showStarModal && currentClass && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 480,
            padding: '1.5rem',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⭐</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Thưởng Sao Học Sinh</h3>
              </div>
              <button onClick={() => setShowStarModal(false)} className="btn btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                Chọn học sinh lớp {currentClass.name}:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '1rem', padding: '0.65rem' }}
              >
                <option value="">-- Bấm chọn học sinh --</option>
                {(currentClass.students || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.machineNumber ? `(Máy ${s.machineNumber})` : ''} - Hiện có {s.stars || 0}⭐
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                disabled={!selectedStudentId}
                onClick={() => handleAwardStarToStudent(selectedStudentId, 1)}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}
              >
                +1 ⭐
              </button>
              <button
                disabled={!selectedStudentId}
                onClick={() => handleAwardStarToStudent(selectedStudentId, 2)}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                +2 ⭐⭐
              </button>
              <button
                disabled={!selectedStudentId}
                onClick={() => handleAwardStarToStudent(selectedStudentId, 3)}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}
              >
                +3 🏆
              </button>
            </div>

            <button
              onClick={() => setShowStarModal(false)}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Hủy Bỏ
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal Vòng Quay May Mắn */}
      {showWheelModal && currentClass && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-2xl)',
            width: '100%',
            maxWidth: 720,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowWheelModal(false)}
              className="btn btn-icon"
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10 }}
            >
              <X size={20} />
            </button>

            <LuckyWheel
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
            />
          </div>
        </div>
      )}

      {/* Modal Cấu Hình Tạo Đề Quick Quiz */}
      <CreateQuizModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onStartQuiz={(session) => {
          setShowQuizModal(false);
          setActiveQuizSession(session);
        }}
        currentClass={currentClass}
        preselectedLesson={lesson}
      />

      {/* Màn Hình Phát Quick Quiz Toàn Màn Hình */}
      {activeQuizSession && (
        <QuizPlayer
          quizSession={activeQuizSession}
          students={currentClass?.students || []}
          onClose={() => setActiveQuizSession(null)}
          onCompleteQuiz={(summary) => {
            setActiveQuizSession(null);
            setQuizSummary(summary);
            setIsQuizResultOpen(true);
          }}
          onAwardStars={(starsMap) => {
            if (onUpdateStudents && currentClass?.students) {
              const updated = currentClass.students.map(s => {
                const add = starsMap[s.id] || 0;
                return add > 0 ? { ...s, stars: (s.stars || 0) + add } : s;
              });
              onUpdateStudents(updated);
            }
          }}
        />
      )}

      {/* Modal Báo Cáo Kết Quả Quick Quiz */}
      <QuizResultModal
        isOpen={isQuizResultOpen}
        onClose={() => {
          setIsQuizResultOpen(false);
          setQuizSummary(null);
        }}
        summaryData={quizSummary}
      />
    </div>
  );
}
