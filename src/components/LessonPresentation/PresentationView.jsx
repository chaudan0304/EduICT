import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Zap,
  AlertCircle,
  Edit3,
  Loader2,
  Layers,
  Sparkles,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import SlideRenderer from './SlideRenderer';
import TeacherNotesDrawer from './TeacherNotesDrawer';
import LuckyWheel from '../LuckyWheel';
import DuckRace from '../DuckRace';
import { soundEffects } from '../../utils/audio';
import CreateQuizModal from '../QuickQuiz/CreateQuizModal';
import QuizPlayer from '../QuickQuiz/QuizPlayer';
import QuizResultModal from '../QuickQuiz/QuizResultModal';
import { fetchLessonDetailApi, fetchLessonRenderStatusApi } from './lessonStorage';
import { getCurrentPeriodStatus, formatTimeCountdown } from '../../utils/timetable';
import TimetableModal from '../ClassroomSession/TimetableModal';

export default function PresentationView({
  lesson: initialLesson = null,
  lessonId = null,
  initialSlideIndex = 0,
  onClose,
  onEditLesson = null,
  currentClass = null,
  onUpdateStudents = null,
  onUpdateGoodScores = null,
  sessionTimerRemainingSec = null,
  soundEnabled = true
}) {
  const [activeLesson, setActiveLesson] = useState(initialLesson);
  const [isLoading, setIsLoading] = useState(() => {
    if (lessonId && !initialLesson) return true;
    if (initialLesson && (!initialLesson.slides || (initialLesson.slides_count > 0 && initialLesson.slides.length === 0))) return true;
    return false;
  });
  const [loadError, setLoadError] = useState(null);

  // Theo dõi thời gian thực của tiết học theo Thời khóa biểu cá nhân
  const [livePeriodStatus, setLivePeriodStatus] = useState(() => getCurrentPeriodStatus());
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setLivePeriodStatus(getCurrentPeriodStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tự động tải bài học và danh sách slide nếu cần
  useEffect(() => {
    let ignore = false;
    const targetId = lessonId || initialLesson?.id;

    if (initialLesson?.slides && initialLesson.slides.length > 0) {
      setActiveLesson(initialLesson);
      setIsLoading(false);
      return;
    }

    if (!targetId) {
      setIsLoading(false);
      setLoadError('Không tìm thấy thông tin bài học để trình chiếu.');
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    fetchLessonDetailApi(targetId)
      .then(data => {
        if (!ignore) {
          if (data) {
            setActiveLesson(data);
          } else {
            setLoadError('Không tìm thấy dữ liệu bài học này.');
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (!ignore) {
          setLoadError(err.message || 'Lỗi nạp bài học');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [lessonId, initialLesson]);

  const slides = activeLesson?.slides || [];
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialSlideIndex >= 0 && initialSlideIndex < slides.length) {
      return initialSlideIndex;
    }
    return 0;
  });

  // Đồng bộ currentIndex khi slides load xong
  useEffect(() => {
    if (initialSlideIndex >= 0 && initialSlideIndex < slides.length) {
      setCurrentIndex(initialSlideIndex);
    } else {
      setCurrentIndex(0);
    }
  }, [slides.length, initialSlideIndex]);

  // Preload thông minh (Smart Preload): Slide trước (currentIndex - 1) và Slide sau (currentIndex + 1)
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const preloadIndices = [currentIndex - 1, currentIndex + 1].filter(idx => idx >= 0 && idx < slides.length);
    preloadIndices.forEach(idx => {
      const s = slides[idx];
      const url = s?.image_url || s?.imageUrl;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [currentIndex, slides, activeLesson?.id]);

  // Tự động polling cập nhật nếu bài học đang ở trạng thái render slide nền
  useEffect(() => {
    if (activeLesson?.render_status !== 'processing' || !activeLesson?.id) return;

    const interval = setInterval(async () => {
      try {
        const statusData = await fetchLessonRenderStatusApi(activeLesson.id);
        if (statusData && statusData.render_status !== 'processing') {
          setActiveLesson(prev => ({
            ...prev,
            render_status: statusData.render_status,
            thumbnail_url: statusData.thumbnail_url,
            slide_count: statusData.slide_count,
            slides: statusData.slides
          }));
        }
      } catch (err) {
        console.warn('Lỗi polling trong PresentationView:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeLesson?.id, activeLesson?.render_status]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [showStarModal, setShowStarModal] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [showDuckRaceModal, setShowDuckRaceModal] = useState(false);
  const [dockedCaller, setDockedCaller] = useState(null); // { student: object, toolType: 'wheel' | 'duck' }
  const [dockedPosition, setDockedPosition] = useState({ x: null, y: null });
  const [isDockedCollapsed, setIsDockedCollapsed] = useState(false);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initX: 0, initY: 0 });
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [activeQuizSession, setActiveQuizSession] = useState(null);
  const [quizSummary, setQuizSummary] = useState(null);
  const [isQuizResultOpen, setIsQuizResultOpen] = useState(false);

  // Kéo thả thanh gọi học sinh tự do trên màn hình
  const handleDragMouseDown = (e) => {
    if (e.button !== 0) return;
    const currentEl = e.currentTarget.closest('.docked-caller-widget');
    const rect = currentEl ? currentEl.getBoundingClientRect() : { left: window.innerWidth - 480, top: 16 };

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top
    };

    const handleMouseMove = (moveEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      const newX = Math.max(12, Math.min(window.innerWidth - 260, dragRef.current.initX + dx));
      const newY = Math.max(12, Math.min(window.innerHeight - 55, dragRef.current.initY + dy));
      setDockedPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    const currentEl = e.currentTarget.closest('.docked-caller-widget');
    const rect = currentEl ? currentEl.getBoundingClientRect() : { left: window.innerWidth - 480, top: 16 };

    dragRef.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      initX: rect.left,
      initY: rect.top
    };

    const handleTouchMove = (moveEvent) => {
      if (!dragRef.current.isDragging) return;
      const t = moveEvent.touches[0];
      if (!t) return;
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      const newX = Math.max(12, Math.min(window.innerWidth - 260, dragRef.current.initX + dx));
      const newY = Math.max(12, Math.min(window.innerHeight - 55, dragRef.current.initY + dy));
      setDockedPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      dragRef.current.isDragging = false;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Xử lý tạm ẩn bộ quay/đua sang góc để chiếu slide cho học sinh trả lời
  const handleMinimizeCaller = (student, toolType) => {
    setDockedCaller({ student, toolType });
    setShowWheelModal(false);
    setShowDuckRaceModal(false);
  };

  // Cộng sao trực tiếp từ thẻ gọi thu nhỏ
  const handleRewardDockedCaller = (starsToAdd) => {
    if (!dockedCaller?.student?.id) return;
    const studentId = dockedCaller.student.id;
    const updated = (currentClass?.students || []).map(s => {
      if (s.id === studentId) {
        return { ...s, stars: (s.stars || 0) + starsToAdd };
      }
      return s;
    });
    if (onUpdateStudents) onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playStarDing();

    setDockedCaller(prev => ({
      ...prev,
      student: {
        ...prev.student,
        stars: (prev.student.stars || 0) + starsToAdd
      }
    }));
  };

  // Mở lại bảng gọi học sinh đầy đủ
  const handleRestoreCallerModal = () => {
    if (dockedCaller?.toolType === 'duck') {
      setShowDuckRaceModal(true);
    } else {
      setShowWheelModal(true);
    }
  };

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
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
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
        studentName: target.name,
        date: new Date().toISOString().slice(0, 10),
        ruleId: 'rule_pos_1',
        type: 'positive',
        points: starCount,
        scoreChange: starCount,
        title: `Phát biểu trong bài: ${activeLesson?.title || 'Slide'}`,
        timestamp: new Date().toISOString()
      };
      const existingMerits = currentClass?.goodScores || [];
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

  // 1. Màn hình Loading
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--surface-ground)', color: 'var(--text-main)',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1.25rem'
      }}>
        <Loader2 size={48} className="animate-spin" color="#0284c7" />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Đang tải nội dung bài giảng & slide...
        </div>
        <button onClick={onClose} className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
          Hủy / Thoát
        </button>
      </div>
    );
  }

  // 2. Màn hình Lỗi (Không tìm thấy bài học)
  if (loadError || !activeLesson) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--surface-ground)', color: 'var(--text-main)',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '2rem'
      }}>
        <div style={{
          background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-2xl)', padding: '3rem 2.5rem',
          maxWidth: 520, width: '100%', textAlign: 'center',
          boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '1.25rem'
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertCircle size={36} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Không Thể Mở Trình Chiếu
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              {loadError || 'Bài học này có thể đã bị xóa hoặc không tồn tại trong hệ thống.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.75rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
            }}
          >
            ← Quay lại Thư viện
          </button>
        </div>
      </div>
    );
  }

  // 2.5 Màn hình Đang Xử Lý Slide Nền (Background Processing - chỉ chặn nếu chưa có slide nào sẵn sàng)
  if (activeLesson?.render_status === 'processing' && (!slides || slides.length === 0 || !slides.some(s => s.render_status === 'ready' && (s.image_url || s.imageUrl)))) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#090d16', color: '#fff',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 'var(--radius-2xl)', padding: '3rem 2.5rem',
          maxWidth: 560, width: '100%', textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '1.25rem'
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Loader2 size={36} className="animate-spin" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Đang Chuẩn Bị Slide Trình Chiếu...
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.5 }}>
              Hệ thống đang trích xuất chất lượng cao cho {activeLesson.slide_count || 14} slides của bài <strong>"{activeLesson.title}"</strong>. Bài trình chiếu sẽ tự động sẵn sàng trong giây lát.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '0.65rem 1.5rem', fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.1)', color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            ← Quay lại Thư viện
          </button>
        </div>
      </div>
    );
  }

  // 3. Màn hình Bài Học Chưa Có Slide (Yêu cầu đặc tả của người dùng)
  if (slides.length === 0) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--surface-ground)', color: 'var(--text-main)',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '2rem'
      }}>
        <div style={{
          background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-2xl)', padding: '3rem 2.5rem',
          maxWidth: 560, width: '100%', textAlign: 'center',
          boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '1.25rem'
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Layers size={36} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Bài học này chưa có slide trình chiếu.
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Bài học "<strong>{activeLesson.title}</strong>" hiện chưa có nội dung slide nào. Hãy mở trình soạn thảo để thêm các slide bài giảng.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
            <button
              onClick={() => {
                if (onEditLesson) {
                  onEditLesson(activeLesson);
                } else {
                  onClose();
                }
              }}
              className="btn btn-primary"
              style={{
                flex: 1, padding: '0.75rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <Edit3 size={18} />
              <span>✏️ Chỉnh sửa bài học</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}
            >
              ← Quay lại Thư viện
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <span style={{ color: '#0284c7' }}>📖 {activeLesson?.title || 'Bài giảng'}</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>Khối {activeLesson?.grade || 3}</span>
            {activeLesson?.type === 'imported' && (
              <span style={{
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>🟣</span>
                <span>PowerPoint</span>
              </span>
            )}
          </div>

          {/* Badge Thời gian Tiết học theo Thời gian thực & TKB */}
          {livePeriodStatus.isTeachingNow ? (
            <button
              type="button"
              onClick={() => setIsTimetableOpen(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.08))',
                border: '1.5px solid #10b981',
                borderRadius: '999px',
                padding: '0.35rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#059669',
                fontSize: '0.875rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
              }}
              title="Nhấp để xem chi tiết Thời khóa biểu cá nhân"
            >
              <Clock size={16} color="#059669" />
              <span>Tiết {livePeriodStatus.period} ({livePeriodStatus.className}) • Còn {formatTimeCountdown(livePeriodStatus.remainingSec)}</span>
              <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#fff', borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 800 }}>TKB</span>
            </button>
          ) : livePeriodStatus.status === 'RECESS' ? (
            <button
              type="button"
              onClick={() => setIsTimetableOpen(true)}
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1.5px solid #f59e0b',
                borderRadius: '999px',
                padding: '0.35rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#d97706',
                fontSize: '0.875rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Nhấp để xem Thời khóa biểu cá nhân"
            >
              <Clock size={16} color="#d97706" />
              <span>Ra chơi • Còn {formatTimeCountdown(livePeriodStatus.remainingSec)}</span>
            </button>
          ) : sessionTimerRemainingSec !== null ? (
            <button
              type="button"
              onClick={() => setIsTimetableOpen(true)}
              style={{
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                borderRadius: '999px',
                padding: '0.35rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#0284c7',
                fontSize: '0.875rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Thời gian tiết học • Nhấp để xem Thời khóa biểu"
            >
              <Clock size={16} />
              <span>{formatTime(sessionTimerRemainingSec)}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>📅 TKB</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsTimetableOpen(true)}
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: '999px',
                padding: '0.35rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Nhấp để xem Lịch giảng dạy & Thời khóa biểu cá nhân"
            >
              <Calendar size={15} color="var(--primary)" />
              <span>Lịch giảng dạy</span>
            </button>
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
      {(() => {
        const isImported = activeLesson?.type === 'imported' || currentSlide?.type === 'IMPORTED_SLIDE';
        return (
          <main style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isImported ? 0 : '2rem 1rem 6rem 1rem',
            boxSizing: 'border-box',
            overflow: 'hidden',
            background: isImported ? '#090d16' : 'transparent'
          }}>
            <div style={{
              width: '100%',
              maxWidth: isImported ? '100%' : '1380px',
              height: '100%',
              maxHeight: isImported ? '100%' : '88vh',
              background: isImported ? '#090d16' : 'var(--surface-card)',
              borderRadius: isImported ? 0 : 'var(--radius-2xl)',
              border: isImported ? 'none' : '1px solid var(--surface-border)',
              boxShadow: isImported ? 'none' : '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
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
                lessonId={activeLesson?.id}
                sourceFilePath={activeLesson?.source_file_path}
                onSlideUpdated={(updatedSlide) => {
                  setActiveLesson(prev => {
                    if (!prev) return prev;
                    const nextSlides = (prev.slides || []).map(s => 
                      (s.id === updatedSlide.id || s.order_index === updatedSlide.order_index) 
                        ? { ...s, ...updatedSlide } 
                        : s
                    );
                    return {
                      ...prev,
                      slides: nextSlides
                    };
                  });
                }}
              />
            </div>
          </main>
        );
      })()}

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

          {/* Badge số slide nổi bật */}
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#fff',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            fontWeight: 800,
            fontSize: '0.95rem',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
          }}>
            <span>{String(currentIndex + 1).padStart(2, '0')}</span>
            <span style={{ opacity: 0.6 }}>/</span>
            <span>{String(totalSlides).padStart(2, '0')}</span>
          </div>

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

          {/* Công cụ sư phạm: Đua vịt gọi trả bài */}
          {currentClass && (
            <button
              onClick={() => setShowDuckRaceModal(true)}
              className="btn"
              style={{
                background: 'rgba(245, 158, 11, 0.22)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                color: '#fbbf24',
                fontSize: '0.875rem',
                fontWeight: 700,
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Mở Đua vịt gọi học sinh trả bài"
            >
              <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>🦆</span>
              <span>Đua Vịt</span>
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
        lesson={activeLesson}
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

      {/* 5b. Thẻ Gọi Học Sinh Thu Gọn Sang Góc (Docked Caller Widget - Siêu Gọn, Kéo Thả Tự Do) */}
      {dockedCaller && (
        <div 
          className="docked-caller-widget"
          style={{
            position: 'fixed',
            top: dockedPosition.y !== null ? dockedPosition.y : '1rem',
            left: dockedPosition.x !== null ? dockedPosition.x : 'auto',
            right: dockedPosition.x !== null ? 'auto' : '4.75rem',
            zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid #f59e0b',
            borderRadius: '999px',
            padding: isDockedCollapsed ? '0.2rem 0.6rem 0.2rem 0.35rem' : '0.2rem 0.65rem 0.2rem 0.35rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 14px rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            userSelect: 'none',
            height: 38,
            boxSizing: 'border-box',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {/* Nút Kéo Thả (Drag Handle) */}
          <div
            onMouseDown={handleDragMouseDown}
            onTouchStart={handleDragTouchStart}
            style={{
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              padding: '0 0.15rem'
            }}
            title="Nhấp & kéo thả để di chuyển vị trí trên màn hình"
          >
            <GripVertical size={16} />
          </div>

          {/* Icon công cụ */}
          <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>
            {dockedCaller.toolType === 'duck' ? '🦆' : '🎡'}
          </span>

          {/* Thông tin học sinh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: 800,
              color: '#ffffff',
              whiteSpace: 'nowrap'
            }}>
              {dockedCaller.student?.name}
            </span>

            {dockedCaller.student?.machineNumber && (
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.15)',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                M{dockedCaller.student.machineNumber}
              </span>
            )}

            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#fbbf24',
              whiteSpace: 'nowrap'
            }}>
              ⭐{dockedCaller.student?.stars || 0}
            </span>
          </div>

          {!isDockedCollapsed && (
            <>
              <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.2)' }} />

              {/* Nút cộng sao nhanh */}
              <button
                className="btn btn-amber btn-sm"
                onClick={() => handleRewardDockedCaller(1)}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
                title="Cộng +1 Sao trả lời đúng"
              >
                <Star size={12} fill="#fff" />
                +1 Sao
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleRewardDockedCaller(2)}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
                title="Cộng +2 Sao xuất sắc"
              >
                <Sparkles size={12} />
                +2 Sao
              </button>

              {/* Mở lại Modal */}
              <button
                className="btn btn-outline btn-sm"
                onClick={handleRestoreCallerModal}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Mở lại bảng đầy đủ"
              >
                <Maximize2 size={12} />
                Mở lại
              </button>
            </>
          )}

          {/* Thu nhỏ / Mở rộng Toggle */}
          <button
            className="btn btn-icon btn-sm"
            onClick={() => setIsDockedCollapsed(prev => !prev)}
            style={{
              padding: '0.15rem',
              color: 'rgba(255, 255, 255, 0.6)',
              width: 24,
              height: 24,
              borderRadius: '50%'
            }}
            title={isDockedCollapsed ? "Mở rộng thao tác" : "Thu nhỏ thanh gọn gàng hơn"}
          >
            {isDockedCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {/* Đóng */}
          <button
            className="btn btn-icon btn-sm"
            onClick={() => setDockedCaller(null)}
            style={{
              padding: '0.15rem',
              color: 'rgba(255, 255, 255, 0.5)',
              width: 24,
              height: 24,
              borderRadius: '50%'
            }}
            title="Đóng thanh gọi này"
          >
            <X size={14} />
          </button>
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
            width: '96vw',
            maxWidth: 1100,
            maxHeight: '94vh',
            overflowY: 'auto',
            padding: '1.75rem',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                onClick={() => {
                  setShowWheelModal(false);
                  if (!dockedCaller) {
                    setDockedCaller({
                      student: { name: 'Vòng Quay May Mắn' },
                      toolType: 'wheel'
                    });
                  }
                }}
                className="btn btn-icon"
                title="Tạm ẩn sang góc để chiếu slide"
              >
                <Minimize2 size={18} />
              </button>
              <button
                onClick={() => setShowWheelModal(false)}
                className="btn btn-icon"
                title="Đóng Vòng Quay"
              >
                <X size={20} />
              </button>
            </div>

            <LuckyWheel
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
              onMinimize={(winner) => handleMinimizeCaller(winner, 'wheel')}
            />
          </div>
        </div>
      )}

      {/* 6b. Modal Đua Vịt Gọi Trả Bài */}
      {showDuckRaceModal && currentClass && (
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
            maxWidth: 1050,
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.75rem',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                onClick={() => {
                  setShowDuckRaceModal(false);
                  if (!dockedCaller) {
                    setDockedCaller({
                      student: { name: 'Đua Vịt Gọi Trả Bài' },
                      toolType: 'duck'
                    });
                  }
                }}
                className="btn btn-icon"
                title="Tạm ẩn sang góc để chiếu slide"
              >
                <Minimize2 size={18} />
              </button>
              <button
                onClick={() => setShowDuckRaceModal(false)}
                className="btn btn-icon"
                title="Đóng Đua Vịt"
              >
                <X size={20} />
              </button>
            </div>

            <DuckRace
              currentClass={currentClass}
              onUpdateStudents={onUpdateStudents}
              soundEnabled={soundEnabled}
              onMinimize={(winner) => handleMinimizeCaller(winner, 'duck')}
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
        preselectedLesson={activeLesson}
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

      {/* Modal Lịch Giảng Dạy Cá Nhân (Thời Khóa Biểu) */}
      <TimetableModal
        isOpen={isTimetableOpen}
        onClose={() => setIsTimetableOpen(false)}
      />
    </div>
  );
}
