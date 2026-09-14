import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Play, 
  Save,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';
import { LESSON_FLOW_PRESETS } from './sessionStorage';
import { fetchLessonsApi, sortLessonsList } from '../LessonPresentation/lessonStorage';
import { getCurrentPeriodStatus, formatTimeCountdown } from '../../utils/timetable';
import TimetableModal from './TimetableModal';

export default function CreateSessionModal({
  isOpen,
  onClose,
  classes = [],
  currentClass,
  initialClassId = null,
  onCreateSession // (sessionData, shouldStartImmediately) => void
}) {
  const [selectedClassId, setSelectedClassId] = useState(() => initialClassId || currentClass?.id || classes[0]?.id || '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [objectives, setObjectives] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('standard_35');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [libraryLessons, setLibraryLessons] = useState([]);
  const [periodStatus, setPeriodStatus] = useState(() => getCurrentPeriodStatus());
  const [showTimetableModal, setShowTimetableModal] = useState(false);

  // Tự động đồng bộ lớp được chọn khi mở modal hoặc khi click từ Thời khóa biểu
  useEffect(() => {
    if (isOpen) {
      const targetId = initialClassId || currentClass?.id;
      if (targetId) {
        setSelectedClassId(targetId);
      }
    }
  }, [isOpen, initialClassId, currentClass?.id]);

  // Cập nhật trạng thái tiết học theo thời gian thực mỗi 1 giây
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setPeriodStatus(getCurrentPeriodStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const chosenClass = classes.find(c => c.id === selectedClassId) || currentClass;
  const grade = chosenClass?.grade || 3;

  // Tự động áp dụng lớp & số phút theo tiết học thực tế từ Thời khóa biểu
  const handleSelectClassFromTimetable = (targetClassName, targetGrade) => {
    if (!targetClassName) return;
    const clean = targetClassName.trim().toLowerCase();
    const matched = classes.find(c => {
      const cName = (c.name || '').trim().toLowerCase();
      return cName === clean || cName === `lớp ${clean}` || `lớp ${cName}` === clean || cName.includes(clean) || clean.includes(cName);
    });
    if (matched) {
      setSelectedClassId(matched.id);
    }
    if (periodStatus.isTeachingNow && periodStatus.remainingMin > 0) {
      setDurationMinutes(periodStatus.remainingMin);
    } else {
      setDurationMinutes(40);
    }
  };

  // Nạp danh sách bài học từ thư viện (luôn sắp xếp đúng thứ tự sư phạm)
  useEffect(() => {
    if (isOpen) {
      fetchLessonsApi({ grade }).then(data => {
        setLibraryLessons(sortLessonsList(data || []));
      }).catch(() => {});
    }
  }, [isOpen, grade]);

  if (!isOpen) return null;

  const sampleLessonsByGrade = {
    1: ['Làm quen với chuột máy tính', 'Tập nhấp đúp và kéo thả chuột', 'Tập vẽ hình khối trong Paint', 'Tô màu bức tranh gia đình'],
    2: ['Nhận biết hàng phím cơ sở (F, J)', 'Gõ chữ tiếng Việt đơn giản', 'Vẽ ngôi nhà mơ ước trong Paint', 'Luyện gõ từ và câu ngắn'],
    3: ['Gõ 10 ngón với phần mềm luyện gõ', 'Tạo thư mục và quản lý tệp', 'Quy tắc gõ tiếng Việt Telex/Vni', 'Bảo quản và vệ sinh máy tính'],
    4: ['Chèn hình ảnh vào văn bản Word', 'Tạo bài thuyết trình sinh động', 'Tìm kiếm thông tin an toàn trên Internet', 'Định dạng bảng biểu trong Word'],
    5: ['Lập trình Scratch: Nhân vật chuyển động', 'Lập trình Scratch: Trò chơi mê cung', 'Lập trình Scratch: Bấm giờ & Tính điểm', 'Sử dụng thư điện tử Email an toàn']
  };

  const suggestions = sampleLessonsByGrade[grade] || sampleLessonsByGrade[3];

  const handleSelectLibraryLesson = (lessonId) => {
    setSelectedLessonId(lessonId);
    if (!lessonId) return;
    const found = libraryLessons.find(l => l.id === lessonId);
    if (found) {
      setLessonTitle(found.title);
      if (found.duration_minutes) setDurationMinutes(found.duration_minutes);
      if (found.objectives) setObjectives(found.objectives);
      if (found.teacher_notes) setTeacherNotes(found.teacher_notes);
    }
  };

  const handleSubmit = (startImmediately) => {
    if (!lessonTitle.trim()) {
      alert('Vui lòng nhập tên bài học!');
      return;
    }

    const preset = LESSON_FLOW_PRESETS.find(p => p.id === selectedPresetId) || LESSON_FLOW_PRESETS[0];

    // Tự động tìm lesson_id từ Thư Viện Bài Học nếu chưa được chọn qua dropdown
    let finalLessonId = selectedLessonId;
    if (!finalLessonId && libraryLessons && libraryLessons.length > 0) {
      const cleanTitle = lessonTitle.trim().toLowerCase();
      // 1. Khớp chính xác tên bài
      let matched = libraryLessons.find(l => (l.title || '').trim().toLowerCase() === cleanTitle);
      // 2. Khớp theo số thứ tự bài: "Bài 2", "Bài 1", ...
      if (!matched) {
        const numMatch = cleanTitle.match(/(?:bài|bai|tiết)\s*(\d+)/i);
        if (numMatch) {
          const num = numMatch[1];
          matched = libraryLessons.find(l => {
            const lNum = (l.title || '').match(/(?:bài|bai|tiết)\s*(\d+)/i);
            return lNum && lNum[1] === num;
          });
        }
      }
      // 3. Khớp tương đối theo từ khóa
      if (!matched) {
        matched = libraryLessons.find(l => 
          (l.title && cleanTitle.includes(l.title.toLowerCase())) ||
          (l.title && l.title.toLowerCase().includes(cleanTitle))
        );
      }
      if (matched) {
        finalLessonId = matched.id;
      }
    }

    const newSessionData = {
      id: `sess_${Date.now()}`,
      class_id: selectedClassId,
      lesson_id: finalLessonId || null,
      lesson_title: lessonTitle.trim(),
      duration_minutes: Number(durationMinutes) || 40,
      session_date: sessionDate,
      objectives: objectives.trim(),
      teacher_notes: teacherNotes.trim(),
      status: startImmediately ? 'RUNNING' : 'READY',
      started_at: startImmediately ? new Date().toISOString() : null,
      activities: preset.activities.map((act, idx) => ({
        id: `act_${Date.now()}_${idx}`,
        order_index: idx,
        type: act.type,
        title: act.title,
        duration_minutes: act.duration,
        status: (startImmediately && idx === 0) ? 'IN_PROGRESS' : 'PENDING',
        description: act.description,
        notes: ''
      }))
    };

    onCreateSession(newSessionData, startImmediately);
    onClose();
  };

  return typeof document !== 'undefined' && createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 640,
          width: '94%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '1.75rem'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎯 Tạo Classroom Session (Tiết Học)</span>
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Thiết lập cấu trúc tiết học và chuẩn bị tiến trình giảng dạy
            </p>
          </div>

          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Banner Thời Gian Thực & Thời Khóa Biểu Cá Nhân */}
        <div style={{
          background: periodStatus.isTeachingNow 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.04))' 
            : periodStatus.status === 'RECESS'
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.04))'
            : 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(99, 102, 241, 0.03))',
          border: `1.5px solid ${periodStatus.isTeachingNow ? '#10b981' : periodStatus.status === 'RECESS' ? '#f59e0b' : 'rgba(2, 132, 199, 0.25)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>
                {periodStatus.isTeachingNow ? '🟢' : periodStatus.status === 'RECESS' ? '☕' : periodStatus.status === 'LUNCH_BREAK' ? '🍱' : '⏱'}
              </span>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {periodStatus.dayName} • {periodStatus.label}
                  {periodStatus.className && (
                    <span style={{ color: 'var(--primary)', marginLeft: '0.35rem' }}>
                      (Lớp {periodStatus.className})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {periodStatus.isTeachingNow
                    ? `Tiết dạy còn lại: ${formatTimeCountdown(periodStatus.remainingSec)} (${periodStatus.remainingMin} phút)`
                    : periodStatus.status === 'RECESS'
                    ? `Giờ ra chơi còn: ${formatTimeCountdown(periodStatus.remainingSec)} (${periodStatus.remainingMin} phút)`
                    : 'Căn cứ thời khóa biểu thực tế của GV Nguyễn Văn Châu Đàn'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTimetableModal(true)}
              className="btn btn-outline btn-sm"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.3rem 0.65rem',
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Calendar size={14} />
              <span>Xem Thời Khóa Biểu</span>
            </button>
          </div>

          {/* Nút bấm nhanh nếu đang trong tiết dạy */}
          {periodStatus.isTeachingNow && periodStatus.className && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-card)',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669' }}>
                ⚡ Khớp lịch dạy: Tiết {periodStatus.period} - Lớp {periodStatus.className} ({periodStatus.remainingMin} phút còn)
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleSelectClassFromTimetable(periodStatus.className, periodStatus.grade)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)'
                }}
              >
                <Zap size={13} fill="#fff" />
                Áp Dụng Lớp Này
              </button>
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Hàng 1: Chọn Lớp & Ngày học */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Lớp học (*)
              </label>
              <select
                className="input-field"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Khối {c.grade || 3}) • {c.students?.length || 0} HS
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Ngày diễn ra (*)
              </label>
              <input
                type="date"
                className="input-field"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Chọn từ Thư viện Bài học (1-Click Selection) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
            border: '1.5px solid rgba(2, 132, 199, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.9rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', fontWeight: 800, color: '#0284c7' }}>
                <BookOpen size={16} />
                <span>CHỌN BÀI HỌC CHO LỚP {chosenClass?.name || ''} (KHỐI {grade}):</span>
              </label>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#0284c7',
                background: 'rgba(2, 132, 199, 0.12)',
                padding: '0.15rem 0.6rem',
                borderRadius: '999px'
              }}>
                {libraryLessons.length} bài có sẵn
              </span>
            </div>

            {/* Danh sách các bài học dạng thẻ bấm nhanh (Chỉ 1 click là chọn xong) */}
            {libraryLessons.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '0.5rem',
                maxHeight: '190px',
                overflowY: 'auto',
                paddingRight: '0.35rem'
              }}>
                {sortLessonsList(libraryLessons).map(l => {
                  const isSelected = selectedLessonId === l.id;
                  return (
                    <div
                      key={l.id}
                      onClick={() => handleSelectLibraryLesson(l.id)}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid #10b981' : '1px solid var(--surface-border)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-card)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none'
                      }}
                      title={`Nhấp để chọn: ${l.title}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{l.type === 'imported' ? '🟣' : '📖'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.8125rem',
                            fontWeight: isSelected ? 800 : 700,
                            color: isSelected ? '#059669' : 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {l.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {l.slides_count ? `${l.slides_count} slides` : 'Slide bài giảng'}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          color: '#059669',
                          background: '#d1fae5',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '999px',
                          flexShrink: 0
                        }}>
                          ✓ ĐÃ CHỌN
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          background: 'var(--surface-secondary)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '999px',
                          flexShrink: 0
                        }}>
                          Chọn
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.35rem 0' }}>
                Đang tải bài giảng Khối {grade}...
              </div>
            )}

            {/* Menu thả xuống bổ sung nếu giáo viên muốn chọn theo danh mục */}
            <select
              value={selectedLessonId}
              onChange={(e) => handleSelectLibraryLesson(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.2rem' }}
            >
              <option value="">-- Hoặc chọn từ danh sách đầy đủ --</option>
              {sortLessonsList(libraryLessons).map(l => {
                const topicSuffix = l.topic && !l.title.includes(l.topic) ? ` (${l.topic})` : '';
                return (
                  <option key={l.id} value={l.id}>
                    {l.type === 'imported' ? '🟣 [PowerPoint] ' : '📖 '} {l.title}{topicSuffix}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Hàng 2: Tên bài học & Thời lượng */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Tên bài học (*)
              </label>
              <input
                type="text"
                placeholder="VD: Bài 3: Gõ 10 ngón & vẽ hình"
                className="input-field"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Thời lượng (phút)
              </label>
              <select
                className="input-field"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                {![20, 25, 30, 35, 40, 45, 70, 80].includes(Number(durationMinutes)) && (
                  <option value={durationMinutes}>{durationMinutes} phút (Theo thời gian thực còn lại)</option>
                )}
                <option value={40}>40 phút (Chuẩn TKB Tin học)</option>
                <option value={35}>35 phút</option>
                <option value={30}>30 phút</option>
                <option value={25}>25 phút</option>
                <option value={20}>20 phút</option>
                <option value={45}>45 phút</option>
                <option value={80}>80 phút (2 tiết liên tiếp)</option>
              </select>
            </div>
          </div>

          {/* Gợi ý bài học nhanh theo Khối */}
          {suggestions && suggestions.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                💡 Gợi ý bài học Khối {grade}:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLessonTitle(sug)}
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-secondary)',
                      fontSize: '0.75rem',
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chọn Mẫu Cấu Trúc Tiến Trình (Lesson Flow Preset) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              📚 Chọn Mẫu Tiến Trình Tiết Học (Lesson Flow):
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {LESSON_FLOW_PRESETS.map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    style={{
                      background: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'var(--surface-secondary)',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {preset.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {preset.description} • {preset.activities.length} hoạt động
                      </div>
                    </div>

                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isSelected ? '5px solid var(--primary)' : '2px solid var(--surface-border)',
                      background: '#fff',
                      flexShrink: 0
                    }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mục tiêu & Ghi chú */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Mục tiêu tiết học
              </label>
              <textarea
                rows={2}
                className="input-field"
                placeholder="VD: Học sinh nắm vững tư thế ngồi, thao tác chuột..."
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Ghi chú giáo viên
              </label>
              <textarea
                rows={2}
                className="input-field"
                placeholder="VD: Nhắc học sinh kiểm tra dây chuột máy số 4..."
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Các nút hành động */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleSubmit(false)}
            >
              <Save size={16} />
              <span>Lưu Bản Nháp</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSubmit(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                padding: '0.6rem 1.4rem',
                fontSize: '0.9375rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Play size={16} fill="#fff" />
              <span>Vào Dạy Lớp {chosenClass?.name || ''} Ngay</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal Lịch Giảng Dạy Chi Tiết */}
      <TimetableModal
        isOpen={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        onSelectClassForSession={(className, classGrade) => {
          handleSelectClassFromTimetable(className, classGrade);
          setShowTimetableModal(false);
        }}
      />
    </div>,
    document.body
  );
}
