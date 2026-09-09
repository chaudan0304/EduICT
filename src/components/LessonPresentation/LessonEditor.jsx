import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  Eye, 
  Edit3, 
  BookOpen, 
  HelpCircle, 
  Clock
} from 'lucide-react';
import SlideRenderer from './SlideRenderer';
import { 
  SLIDE_TYPES, 
  SLIDE_LAYOUTS, 
  INFORMATICS_TOPICS, 
  createDefaultSlide,
  saveLessonSlidesApi,
  updateLessonApi,
  createLessonApi
} from './lessonStorage';

export default function LessonEditor({
  initialLesson,
  onBack,
  onSaveSuccess,
  onLaunchPresentation
}) {
  const isNew = !initialLesson?.id;

  // State thông tin chung bài học
  const [lessonData, setLessonData] = useState({
    id: initialLesson?.id || '',
    title: initialLesson?.title || 'Bài Học Tin Học Mới',
    grade: initialLesson?.grade || 4,
    subject: initialLesson?.subject || 'Tin Học 4',
    topic: initialLesson?.topic || 'Mạng máy tính & Internet',
    duration_minutes: initialLesson?.duration_minutes || 35,
    objectives: initialLesson?.objectives || '',
    keywords: initialLesson?.keywords || '',
    teacher_notes: initialLesson?.teacher_notes || ''
  });

  // State danh sách slides
  const [slides, setSlides] = useState(() => {
    if (initialLesson?.slides && initialLesson.slides.length > 0) {
      return initialLesson.slides;
    }
    return [
      createDefaultSlide('TITLE', 0),
      createDefaultSlide('CONTENT', 1),
      createDefaultSlide('QUESTION', 2),
      createDefaultSlide('ACTIVITY', 3),
      createDefaultSlide('SUMMARY', 4)
    ];
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview'
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const currentSlide = slides[activeSlideIndex] || slides[0];

  // Cập nhật thuộc tính của Slide hiện tại
  const updateCurrentSlide = (fields) => {
    setSlides(prev => {
      const next = [...prev];
      if (next[activeSlideIndex]) {
        next[activeSlideIndex] = { ...next[activeSlideIndex], ...fields };
      }
      return next;
    });
  };

  // 1. Thêm slide mới
  const handleAddSlide = (type) => {
    const newSlide = createDefaultSlide(type, slides.length);
    setSlides(prev => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
    setShowAddMenu(false);
  };

  // 2. Nhân bản slide
  const handleDuplicateSlide = (index, e) => {
    e.stopPropagation();
    const source = slides[index];
    const cloned = {
      ...source,
      id: `slide_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `${source.title || ''} (Bản sao)`,
      order_index: index + 1
    };
    const next = [...slides];
    next.splice(index + 1, 0, cloned);
    setSlides(next);
    setActiveSlideIndex(index + 1);
  };

  // 3. Xóa slide
  const handleDeleteSlide = (index, e) => {
    e.stopPropagation();
    if (slides.length <= 1) {
      alert('⚠️ Bài học cần có tối thiểu 1 slide!');
      return;
    }
    if (!window.confirm(`Xóa slide số ${index + 1}?`)) return;

    const next = slides.filter((_, idx) => idx !== index);
    setSlides(next);
    if (activeSlideIndex >= next.length) {
      setActiveSlideIndex(Math.max(0, next.length - 1));
    }
  };

  // 4. Di chuyển slide lên/xuống (Reorder)
  const handleMoveSlide = (index, direction, e) => {
    e.stopPropagation();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    const next = [...slides];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    
    // Cập nhật lại order_index
    next.forEach((s, i) => { s.order_index = i; });
    setSlides(next);
    setActiveSlideIndex(targetIdx);
  };

  // 5. Lưu bài học vào SQLite / LocalStorage
  const handleSaveLesson = async () => {
    if (!lessonData.title.trim()) {
      alert('⚠️ Vui lòng nhập tiêu đề bài học!');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      let savedLesson = null;
      if (isNew) {
        savedLesson = await createLessonApi({
          ...lessonData,
          slides: slides
        });
      } else {
        savedLesson = await updateLessonApi(lessonData.id, lessonData);
        await saveLessonSlidesApi(lessonData.id, slides);
      }

      setSaveSuccessMsg('✅ Đã lưu bài học thành công!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);

      if (onSaveSuccess && savedLesson) {
        onSaveSuccess(savedLesson);
      }
    } catch (err) {
      alert(`❌ Lỗi lưu bài học: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper xử lý câu hỏi trắc nghiệm
  let currentQuestion = null;
  if (currentSlide?.type === 'QUESTION') {
    try {
      currentQuestion = typeof currentSlide.question_data === 'string' && currentSlide.question_data
        ? JSON.parse(currentSlide.question_data)
        : (currentSlide.question_parsed || {
            question: currentSlide.title || '',
            options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
            correct_index: 0,
            explanation: ''
          });
    } catch {
      currentQuestion = { question: '', options: ['A', 'B', 'C', 'D'], correct_index: 0, explanation: '' };
    }
  }

  const updateQuestionField = (field, value) => {
    const updated = { ...currentQuestion, [field]: value };
    updateCurrentSlide({
      question_data: JSON.stringify(updated),
      question_parsed: updated
    });
  };

  const updateQuestionOption = (optIndex, text) => {
    const opts = [...(currentQuestion?.options || ['A', 'B', 'C', 'D'])];
    opts[optIndex] = text;
    updateQuestionField('options', opts);
  };

  // Helper xử lý hoạt động thực hành
  let currentActivity = null;
  if (currentSlide?.type === 'ACTIVITY') {
    try {
      currentActivity = typeof currentSlide.activity_data === 'string' && currentSlide.activity_data
        ? JSON.parse(currentSlide.activity_data)
        : (currentSlide.activity_parsed || {
            format: 'pair',
            duration: 10,
            task: currentSlide.content || ''
          });
    } catch {
      currentActivity = { format: 'pair', duration: 10, task: '' };
    }
  }

  const updateActivityField = (field, value) => {
    const updated = { ...currentActivity, [field]: value };
    updateCurrentSlide({
      activity_data: JSON.stringify(updated),
      activity_parsed: updated
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 75px)',
      background: 'var(--surface-ground)',
      overflow: 'hidden'
    }}>
      {/* 1. Top Navbar Của Editor */}
      <header style={{
        padding: '0.65rem 1.25rem',
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        zIndex: 20
      }}>
        {/* Nút quay lại & Tiêu đề bài */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 280 }}>
          <button
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>Thư Viện</span>
          </button>

          <input
            type="text"
            value={lessonData.title}
            onChange={(e) => setLessonData(prev => ({ ...prev, title: e.target.value }))}
            className="input-field"
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              flex: 1,
              maxWidth: 500,
              background: 'var(--surface-secondary)'
            }}
            placeholder="Nhập tên bài học..."
          />

          <span style={{
            fontSize: '0.75rem',
            background: '#0284c7',
            color: '#fff',
            fontWeight: 800,
            padding: '0.2rem 0.6rem',
            borderRadius: '999px'
          }}>
            Khối {lessonData.grade}
          </span>
        </div>

        {/* Các nút chức năng góc phải */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {saveSuccessMsg && (
            <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>
              {saveSuccessMsg}
            </span>
          )}

          {/* Cài đặt bài học */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="btn btn-secondary"
            title="Cài đặt thông tin bài học & mục tiêu"
          >
            <Settings size={16} />
            <span>Thông Tin</span>
          </button>

          {/* Toggle Chế độ xem */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.2rem',
            border: '1px solid var(--surface-border)'
          }}>
            <button
              onClick={() => setViewMode('editor')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: viewMode === 'editor' ? 'var(--surface-card)' : 'transparent',
                color: viewMode === 'editor' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: viewMode === 'editor' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <Edit3 size={14} />
              <span>Soạn Thảo</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: viewMode === 'preview' ? 'var(--surface-card)' : 'transparent',
                color: viewMode === 'preview' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: viewMode === 'preview' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <Eye size={14} />
              <span>Xem Trước</span>
            </button>
          </div>

          {/* Nút Trình Chiếu */}
          <button
            onClick={() => onLaunchPresentation?.({ ...lessonData, slides }, activeSlideIndex)}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700
            }}
          >
            <Play size={16} fill="#fff" />
            <span>Trình Chiếu</span>
          </button>

          {/* Nút Lưu bài */}
          <button
            onClick={handleSaveLesson}
            disabled={isSaving}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700
            }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Đang Lưu...' : 'Lưu Bài'}</span>
          </button>
        </div>
      </header>

      {/* 2. Thân Chính: Cột Trái (Slide List) • Cột Phải (Canvas & Controls) */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        overflow: 'hidden'
      }}>
        {/* =========================================
            CỘT TRÁI: DANH SÁCH SLIDE (SLIDE NAVIGATOR)
           ========================================= */}
        <aside style={{
          background: 'var(--surface-card)',
          borderRight: '1px solid var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Header danh sách */}
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
              CÁC SLIDE ({slides.length})
            </div>

            {/* Nút bấm mở menu thêm slide */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAddMenu(prev => !prev)}
                className="btn btn-primary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Plus size={14} />
                <span>Thêm</span>
              </button>

              {/* Menu chọn loại slide */}
              {showAddMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.4rem',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  width: 220,
                  zIndex: 100,
                  padding: '0.4rem'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>
                    CHỌN LOẠI SLIDE:
                  </div>
                  {SLIDE_TYPES.map(st => (
                    <button
                      key={st.type}
                      onClick={() => handleAddSlide(st.type)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.65rem',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontSize: '0.8125rem',
                        color: 'var(--text-main)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{st.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{st.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Danh sách cuộn các slide thumbnail */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            {slides.map((s, idx) => {
              const isActive = idx === activeSlideIndex;
              const typeDef = SLIDE_TYPES.find(t => t.type === s.type) || SLIDE_TYPES[1];

              return (
                <div
                  key={s.id || idx}
                  onClick={() => setActiveSlideIndex(idx)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isActive ? '#0284c7' : 'var(--surface-border)'}`,
                    background: isActive ? 'rgba(2, 132, 199, 0.08)' : 'var(--surface-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: isActive ? '#0284c7' : 'var(--text-muted)',
                        minWidth: 22
                      }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: '0.9rem' }}>{typeDef.icon}</span>
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: typeDef.color,
                        background: 'var(--surface-card)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '999px',
                        border: '1px solid var(--surface-border)'
                      }}>
                        {typeDef.label.split('/')[0]}
                      </span>
                    </div>

                    {/* Nút Thao tác mini */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                      <button
                        disabled={idx === 0}
                        onClick={(e) => handleMoveSlide(idx, 'up', e)}
                        className="btn btn-icon"
                        style={{ width: 22, height: 22, padding: 0 }}
                        title="Di chuyển lên"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        disabled={idx === slides.length - 1}
                        onClick={(e) => handleMoveSlide(idx, 'down', e)}
                        className="btn btn-icon"
                        style={{ width: 22, height: 22, padding: 0 }}
                        title="Di chuyển xuống"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDuplicateSlide(idx, e)}
                        className="btn btn-icon"
                        style={{ width: 22, height: 22, padding: 0 }}
                        title="Nhân bản slide"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSlide(idx, e)}
                        className="btn btn-icon"
                        style={{ width: 22, height: 22, padding: 0, color: '#ef4444' }}
                        title="Xóa slide"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {s.title || '(Chưa đặt tiêu đề)'}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* =========================================
            CỘT PHẢI: SLIDE CANVAS & BỘ ĐIỀU KHIỂN
           ========================================= */}
        <main style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: 'var(--surface-ground)'
        }}>
          {viewMode === 'preview' ? (
            // Chế độ xem trước Full Canvas
            <div style={{
              flex: 1,
              padding: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '100%',
                maxWidth: 1080,
                height: '100%',
                maxHeight: '75vh',
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden'
              }}>
                <SlideRenderer slide={currentSlide} isPresentation={false} />
              </div>
            </div>
          ) : (
            // Chế độ soạn thảo 2 tầng: Tầng trên Live Preview Mini • Tầng dưới Form nhập liệu
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateRows: '45% 55%',
              overflow: 'hidden'
            }}>
              {/* Tầng 1: Canvas Preview của Slide đang chọn */}
              <div style={{
                padding: '1.25rem 2rem 0.5rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at center, rgba(2, 132, 199, 0.04) 0%, transparent 80%)',
                borderBottom: '1px solid var(--surface-border)',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: 820,
                  height: '100%',
                  background: 'var(--surface-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--surface-border)',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden'
                }}>
                  <SlideRenderer slide={currentSlide} isPresentation={false} />
                </div>
              </div>

              {/* Tầng 2: Form Chỉnh Sửa Thuộc Tính Slide */}
              <div style={{
                overflowY: 'auto',
                padding: '1.25rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                {/* Dòng 1: Loại Slide & Bố cục */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Loại Slide:
                    </label>
                    <select
                      value={currentSlide.type}
                      onChange={(e) => updateCurrentSlide({ type: e.target.value })}
                      className="input-field"
                      style={{ width: '100%', fontWeight: 700 }}
                    >
                      {SLIDE_TYPES.map(st => (
                        <option key={st.type} value={st.type}>
                          {st.icon} {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Bố Cục (Layout):
                    </label>
                    <select
                      value={currentSlide.layout || 'STANDARD'}
                      onChange={(e) => updateCurrentSlide({ layout: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      {SLIDE_LAYOUTS.map(ly => (
                        <option key={ly.id} value={ly.id}>
                          {ly.icon} {ly.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tiêu đề slide */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Tiêu Đề Slide:
                  </label>
                  <input
                    type="text"
                    value={currentSlide.title || ''}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', fontSize: '1rem', fontWeight: 700 }}
                    placeholder="Nhập tiêu đề cho slide..."
                  />
                </div>

                {/* TÙY CHỌN THEO TỪNG LOẠI SLIDE */}

                {/* A. Nếu là QUESTION */}
                {currentSlide.type === 'QUESTION' && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.06)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <HelpCircle size={16} />
                      CẤU HÌNH CÂU HỎI TRẮC NGHIỆM
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Câu hỏi hiển thị:</label>
                      <input
                        type="text"
                        value={currentQuestion?.question || ''}
                        onChange={(e) => updateQuestionField('question', e.target.value)}
                        className="input-field"
                        style={{ width: '100%', marginTop: '0.2rem' }}
                        placeholder="Nội dung câu hỏi..."
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      {(currentQuestion?.options || ['A', 'B', 'C', 'D']).map((opt, idx) => {
                        const isCorrect = idx === Number(currentQuestion?.correct_index || 0);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input
                              type="radio"
                              name="correct_answer"
                              checked={isCorrect}
                              onChange={() => updateQuestionField('correct_index', idx)}
                              title="Chọn làm đáp án đúng"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateQuestionOption(idx, e.target.value)}
                              className="input-field"
                              style={{
                                flex: 1,
                                borderColor: isCorrect ? '#10b981' : undefined,
                                fontWeight: isCorrect ? 700 : 400
                              }}
                              placeholder={`Phương án ${String.fromCharCode(65 + idx)}...`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Giải thích đáp án đúng (tùy chọn):</label>
                      <input
                        type="text"
                        value={currentQuestion?.explanation || ''}
                        onChange={(e) => updateQuestionField('explanation', e.target.value)}
                        className="input-field"
                        style={{ width: '100%', marginTop: '0.2rem' }}
                        placeholder="Vì sao đáp án này chính xác..."
                      />
                    </div>
                  </div>
                )}

                {/* B. Nếu là ACTIVITY */}
                {currentSlide.type === 'ACTIVITY' && (
                  <div style={{
                    background: 'rgba(236, 72, 153, 0.06)',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} />
                      CẤU HÌNH NHIỆM VỤ THỰC HÀNH
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hình thức thực hành:</label>
                        <select
                          value={currentActivity?.format || 'pair'}
                          onChange={(e) => updateActivityField('format', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', marginTop: '0.2rem' }}
                        >
                          <option value="pair">👥 Ngồi ghép đôi (2 bạn/máy)</option>
                          <option value="individual">👤 Thực hành cá nhân</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Thời gian thực hành (phút):</label>
                        <input
                          type="number"
                          min="1"
                          max="35"
                          value={currentActivity?.duration || 10}
                          onChange={(e) => updateActivityField('duration', Number(e.target.value))}
                          className="input-field"
                          style={{ width: '100%', marginTop: '0.2rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* C. Nếu là IMAGE / VIDEO */}
                {(currentSlide.type === 'IMAGE' || currentSlide.type === 'VIDEO') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                    {currentSlide.type === 'IMAGE' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          Đường Dẫn Hình Ảnh (URL):
                        </label>
                        <input
                          type="text"
                          value={currentSlide.image_url || ''}
                          onChange={(e) => updateCurrentSlide({ image_url: e.target.value })}
                          className="input-field"
                          style={{ width: '100%' }}
                          placeholder="https://... (hoặc đường dẫn ảnh minh họa)"
                        />
                      </div>
                    )}

                    {currentSlide.type === 'VIDEO' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          Đường Dẫn Video (URL):
                        </label>
                        <input
                          type="text"
                          value={currentSlide.video_url || ''}
                          onChange={(e) => updateCurrentSlide({ video_url: e.target.value })}
                          className="input-field"
                          style={{ width: '100%' }}
                          placeholder="https://youtube.com/... hoặc link clip"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Nội dung chính / Gạch đầu dòng */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Nội Dung Chi Tiết (Gạch đầu dòng):
                    </label>
                    <button
                      type="button"
                      onClick={() => updateCurrentSlide({ content: (currentSlide.content || '') + '\n• Ý mới: ' })}
                      className="btn"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--surface-secondary)' }}
                    >
                      + Thêm dòng •
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={currentSlide.content || ''}
                    onChange={(e) => updateCurrentSlide({ content: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', lineHeight: 1.6, fontFamily: 'inherit' }}
                    placeholder="Nhập nội dung hiển thị trên slide..."
                  />
                </div>

                {/* 👨‍🏫 TEACHER NOTES CHO SLIDE */}
                <div style={{
                  background: 'rgba(2, 132, 199, 0.05)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 800, color: '#0284c7', marginBottom: '0.4rem' }}>
                    <BookOpen size={16} />
                    👨‍🏫 GHI CHÚ SƯ PHẠM (CHỈ GIÁO VIÊN THẤY)
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Ghi chú câu hỏi gợi mở, đáp án nhanh hoặc lưu ý phòng máy. Phần này <strong>không bao giờ hiển thị lên máy chiếu</strong>.
                  </p>
                  <textarea
                    rows={3}
                    value={currentSlide.teacher_notes || ''}
                    onChange={(e) => updateCurrentSlide({ teacher_notes: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', lineHeight: 1.5, background: 'var(--surface-card)' }}
                    placeholder="Gợi ý câu hỏi: Em hãy quan sát máy tính và cho thầy biết..."
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Modal Cài Đặt Thông Tin Bài Học (Lesson Metadata Modal) */}
      {isSettingsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 1500,
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
            maxWidth: 600,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={22} color="#0284c7" />
              Thông Tin & Mục Tiêu Bài Dạy
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Tên Bài Học:
                </label>
                <input
                  type="text"
                  value={lessonData.title}
                  onChange={(e) => setLessonData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Khối Lớp:
                  </label>
                  <select
                    value={lessonData.grade}
                    onChange={(e) => setLessonData(prev => ({ ...prev, grade: Number(e.target.value) }))}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    {[1, 2, 3, 4, 5].map(g => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                    Thời Lượng Tiết Học:
                  </label>
                  <input
                    type="number"
                    value={lessonData.duration_minutes}
                    onChange={(e) => setLessonData(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Chủ Đề GDPT 2018:
                </label>
                <select
                  value={lessonData.topic}
                  onChange={(e) => setLessonData(prev => ({ ...prev, topic: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  {INFORMATICS_TOPICS.filter(t => t.id !== 'all').map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Mục Tiêu Bài Dạy (Yêu Cầu Cần Đạt):
                </label>
                <textarea
                  rows={3}
                  value={lessonData.objectives}
                  onChange={(e) => setLessonData(prev => ({ ...prev, objectives: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="Học sinh hiểu được... Nêu được các bước..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Từ Khóa Cốt Lõi (Phân cách bởi dấu phẩy):
                </label>
                <input
                  type="text"
                  value={lessonData.keywords}
                  onChange={(e) => setLessonData(prev => ({ ...prev, keywords: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="Internet, Trình duyệt, Tìm kiếm"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="btn btn-primary"
              >
                Xác Nhận & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
