import React, { useState } from 'react';
import { 
  X, 
  Save, 
  FileText, 
  Clock, 
  Layers, 
  AlertCircle 
} from 'lucide-react';
import { updateLessonApi, INFORMATICS_TOPICS } from './lessonStorage';

export default function EditImportedLessonModal({
  isOpen,
  lesson,
  onClose,
  onUpdateSuccess
}) {
  const [title, setTitle] = useState(lesson?.title || '');
  const [grade, setGrade] = useState(lesson?.grade || 3);
  const [topic, setTopic] = useState(lesson?.topic || 'Máy tính & Em');
  const [durationMinutes, setDurationMinutes] = useState(lesson?.duration_minutes || 35);
  const [objectives, setObjectives] = useState(lesson?.objectives || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !lesson) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên bài học!');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const updated = await updateLessonApi(lesson.id, {
        title: title.trim(),
        grade: Number(grade),
        topic,
        duration_minutes: Number(durationMinutes) || 35,
        objectives: objectives.trim()
      });

      if (updated) {
        onUpdateSuccess(updated);
        onClose();
      }
    } catch (err) {
      console.error('Lỗi cập nhật bài học imported:', err);
      setErrorMsg(err.message || 'Không thể lưu thay đổi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-2xl)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        boxShadow: 'var(--shadow-2xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Thông Tin Bài Giảng PowerPoint
              </h2>
              <span style={{
                fontSize: '0.75rem',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                fontWeight: 700,
                padding: '0.1rem 0.5rem',
                borderRadius: '999px'
              }}>
                Imported • Read-only Slides
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-icon"
            style={{ width: 36, height: 36, borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSave} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tóm tắt bài giảng gốc */}
          <div style={{
            background: 'var(--surface-secondary)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1rem',
            border: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              Tệp gốc: <strong style={{ color: 'var(--text-main)' }}>{lesson.source_file_name || 'PowerPoint File'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a855f7', fontWeight: 700 }}>
              <Layers size={14} />
              <span>{lesson.slide_count || lesson.slides_count || (lesson.slides?.length || 0)} slides</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Tên bài học <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-card)',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontWeight: 600,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Khối lớp <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              >
                <option value={1}>Khối 1 (Lớp 1)</option>
                <option value={2}>Khối 2 (Lớp 2)</option>
                <option value={3}>Khối 3 (Lớp 3)</option>
                <option value={4}>Khối 4 (Lớp 4)</option>
                <option value={5}>Khối 5 (Lớp 5)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Thời lượng (phút)
              </label>
              <input
                type="number"
                min={15}
                max={90}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Chủ đề môn Tin học (GDPT 2018)
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-card)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            >
              {INFORMATICS_TOPICS.filter(t => t.id !== 'all').map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Mục tiêu & Mô tả bài giảng
            </label>
            <textarea
              rows={3}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-card)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            padding: '1rem 0 0 0',
            borderTop: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{
                padding: '0.65rem 1.5rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
