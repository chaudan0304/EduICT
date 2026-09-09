import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Play, 
  Save,
  BookOpen
} from 'lucide-react';
import { LESSON_FLOW_PRESETS } from './sessionStorage';
import { fetchLessonsApi } from '../LessonPresentation/lessonStorage';

export default function CreateSessionModal({
  isOpen,
  onClose,
  classes = [],
  currentClass,
  onCreateSession // (sessionData, shouldStartImmediately) => void
}) {
  const [selectedClassId, setSelectedClassId] = useState(currentClass?.id || classes[0]?.id || '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(35);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [objectives, setObjectives] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('standard_35');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [libraryLessons, setLibraryLessons] = useState([]);

  const chosenClass = classes.find(c => c.id === selectedClassId) || currentClass;
  const grade = chosenClass?.grade || 3;

  // Nạp danh sách bài học từ thư viện
  useEffect(() => {
    if (isOpen) {
      fetchLessonsApi({ grade }).then(data => {
        setLibraryLessons(data || []);
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

    const newSessionData = {
      id: `sess_${Date.now()}`,
      class_id: selectedClassId,
      lesson_id: selectedLessonId || null,
      lesson_title: lessonTitle.trim(),
      duration_minutes: Number(durationMinutes) || 35,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
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

          {/* Chọn từ Thư viện Bài học */}
          {libraryLessons.length > 0 && (
            <div style={{
              background: 'rgba(2, 132, 199, 0.05)',
              border: '1px dashed rgba(2, 132, 199, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700, color: '#0284c7' }}>
                <BookOpen size={15} />
                <span>Hoặc chọn bài giảng từ Thư Viện Bài Học:</span>
              </label>
              <select
                value={selectedLessonId}
                onChange={(e) => handleSelectLibraryLesson(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.875rem', fontWeight: 600 }}
              >
                <option value="">-- Tự soạn tên bài mới --</option>
                {libraryLessons.map(l => (
                  <option key={l.id} value={l.id}>
                    📖 {l.title} ({l.topic || 'Chung'})
                  </option>
                ))}
              </select>
            </div>
          )}

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
                <option value={30}>30 phút</option>
                <option value={35}>35 phút (Chuẩn)</option>
                <option value={40}>40 phút</option>
                <option value={45}>45 phút</option>
                <option value={70}>70 phút (2 tiết)</option>
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
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Play size={16} />
              <span>Tạo & Bắt Đầu Ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
