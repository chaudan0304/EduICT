import React, { useId, useState } from 'react';
import DialogService from '../../services/DialogService';
import {
  Plus, 
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { ACTIVITY_TYPES } from './sessionStorage';
import { fetchLessonsApi } from '../LessonPresentation/lessonStorage';
import AiLessonFlowModal from '../AI/AiLessonFlowModal';
import LessonFlowActivityCard from './LessonFlowActivityCard';
import './LessonFlowList.css';
import useLocalDraft from '../../hooks/useLocalDraft';
import DraftStatus from '../DraftStatus';
import {DRAFT_OPEN,requestedDraft,consumeDraft} from '../../services/sharedDrafts';

export default function LessonFlowList({
  activities = [],
  currentActivityIndex,
  onSelectActivity,
  onUpdateActivities,
  _isSessionRunning,
  lessonId = null,
  sessionId = null
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', duration: 5, type: 'ACTIVITY', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const addFormId = useId();
  const [newActivity, setNewActivity] = useState({
    type: 'ACTIVITY',
    title: 'Luyện tập & Thực hành phòng máy',
    duration: 10,
    description: ''
  });

  // State Trợ Giảng AI Flow
  const [isAiFlowOpen, setIsAiFlowOpen] = useState(false);
  const [lessonsList, setLessonsList] = useState([]);
  const [lessonsReady,setLessonsReady]=useState(false);
  const [resumeLesson,setResumeLesson]=useState(undefined),[resumeError,setResumeError]=useState('');
  React.useEffect(()=>{
    const resume=()=>{const request=requestedDraft();if(!request?.scope.startsWith('ai-flow:')||request.targetSessionId!==sessionId||!lessonsReady)return;
      const id=request.scope.slice('ai-flow:'.length);
      if(id!=='picker'&&!lessonsList.some(lesson=>String(lesson.id)===id)){setResumeError('Bài nguồn không còn tồn tại. Bản đề xuất vẫn được giữ trong danh sách Bản nháp.');consumeDraft(request);return;}
      setResumeLesson(id==='picker'?null:id);setIsAiFlowOpen(true);consumeDraft(request);
    };
    resume();window.addEventListener(DRAFT_OPEN,resume);return()=>window.removeEventListener(DRAFT_OPEN,resume);
  },[sessionId,lessonsList,lessonsReady]);
  const localDraft = useLocalDraft(`flow-editor:${sessionId || lessonId || 'local'}`, true,
    { editForm, editingActivityId: activities[editingIndex]?.id || null, newActivity, showAddForm }, data => {
      if (data.newActivity && typeof data.newActivity.title === 'string') setNewActivity(data.newActivity);
      setShowAddForm(Boolean(data.showAddForm));
      const index = activities.findIndex(activity => activity.id === data.editingActivityId);
      if (index >= 0 && typeof data.editForm?.title === 'string') { setEditingIndex(index); setEditForm(data.editForm); }
    });

  React.useEffect(() => {
    fetchLessonsApi({ grade: 'all' })
      .then(data => setLessonsList(data || []))
      .then(()=>setLessonsReady(true))
      .catch(err => console.warn('Lỗi tải bài học cho AI Lesson Flow:', err));
  }, []);

  // Chọn loại hoạt động khi tạo mới
  const handleTypeSelect = (typeKey) => {
    const t = ACTIVITY_TYPES[typeKey] || ACTIVITY_TYPES.ACTIVITY;
    setNewActivity(prev => ({
      ...prev,
      type: typeKey,
      title: `${t.icon} ${t.label}`,
      duration: t.defaultDuration
    }));
  };

  // Thêm hoạt động mới
  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!newActivity.title.trim()) return;

    const actToAdd = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      order_index: activities.length,
      type: newActivity.type,
      title: newActivity.title.trim(),
      duration_minutes: Number(newActivity.duration) || 5,
      status: 'PENDING',
      description: newActivity.description || '',
      notes: ''
    };

    onUpdateActivities([...activities, actToAdd]);
    localDraft.clear();
    setShowAddForm(false);
    setNewActivity({
      type: 'ACTIVITY',
      title: 'Luyện tập & Thực hành phòng máy',
      duration: 10,
      description: ''
    });
  };

  // Bắt đầu chỉnh sửa hoạt động
  const startEditing = (index) => {
    const target = activities[index];
    setEditingIndex(index);
    setEditForm({
      title: target.title,
      duration: target.duration_minutes || target.durationMinutes || 5,
      type: target.type || 'ACTIVITY',
      description: target.description || ''
    });
  };

  // Lưu chỉnh sửa
  const saveEditing = (index) => {
    const updated = activities.map((act, idx) => {
      if (idx === index) {
        return {
          ...act,
          title: editForm.title.trim(),
          duration_minutes: Number(editForm.duration) || 5,
          type: editForm.type,
          description: editForm.description || ''
        };
      }
      return act;
    });
    onUpdateActivities(updated);
    setEditingIndex(null);
    localDraft.clear();
  };

  // Xóa hoạt động
  const handleDelete = (index) => {
    if (activities.length <= 1) {
      alert('Tiết học cần có ít nhất 1 hoạt động!');
      return;
    }
    if (DialogService.confirm(`Xóa hoạt động "${activities[index].title}"?`)) {
      const updated = activities.filter((_, idx) => idx !== index).map((act, idx) => ({
        ...act,
        order_index: idx
      }));
      onUpdateActivities(updated);
      if (currentActivityIndex >= updated.length) {
        onSelectActivity(Math.max(0, updated.length - 1));
      }
    }
  };

  // Nhân bản hoạt động
  const handleDuplicate = (index) => {
    const target = activities[index];
    const duplicated = {
      ...target,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `${target.title} (Bản sao)`,
      status: 'PENDING'
    };
    const updated = [...activities];
    updated.splice(index + 1, 0, duplicated);
    const reordered = updated.map((act, idx) => ({ ...act, order_index: idx }));
    onUpdateActivities(reordered);
  };

  // Đổi thứ tự: Di chuyển lên
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...activities];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((act, idx) => ({ ...act, order_index: idx }));
    onUpdateActivities(reordered);
    if (currentActivityIndex === index) {
      onSelectActivity(index - 1);
    } else if (currentActivityIndex === index - 1) {
      onSelectActivity(index);
    }
  };

  // Đổi thứ tự: Di chuyển xuống
  const handleMoveDown = (index) => {
    if (index === activities.length - 1) return;
    const updated = [...activities];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((act, idx) => ({ ...act, order_index: idx }));
    onUpdateActivities(reordered);
    if (currentActivityIndex === index) {
      onSelectActivity(index + 1);
    } else if (currentActivityIndex === index + 1) {
      onSelectActivity(index);
    }
  };

  // Đổi trạng thái hoạt động (Start / Complete / Skip)
  const handleSetStatus = (index, newStatus) => {
    const updated = activities.map((act, idx) => {
      if (idx === index) {
        return {
          ...act,
          status: newStatus,
          started_at: newStatus === 'IN_PROGRESS' ? new Date().toISOString() : act.started_at,
          completed_at: (newStatus === 'COMPLETED' || newStatus === 'SKIPPED') ? new Date().toISOString() : act.completed_at
        };
      }
      return act;
    });
    onUpdateActivities(updated);
    if (newStatus === 'IN_PROGRESS') {
      onSelectActivity(index);
    }
  };

  const totalPlannedMins = activities.reduce((acc, a) => acc + (Number(a.duration_minutes || a.durationMinutes) || 0), 0);
  const completedCount = activities.filter(activity => activity.status === 'COMPLETED').length;

  return (
    <section className="lesson-flow" aria-label="Tiến trình tiết học">
      <header className="lesson-flow-header">
        <div className="lesson-flow-header-copy">
          <h2><Layers size={20} aria-hidden="true" />Tiến trình tiết học</h2>
          <p><strong>{totalPlannedMins} phút</strong> dự kiến · {activities.length} hoạt động</p>
        </div>
        <div className="lesson-flow-header-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAiFlowOpen(true)} title="AI đề xuất tiến trình tiết học"><Sparkles size={15} />AI đề xuất</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddForm(prev => !prev)} aria-expanded={showAddForm} aria-controls={addFormId}>
            {showAddForm ? <X size={15} /> : <Plus size={15} />}{showAddForm ? 'Đóng' : 'Thêm hoạt động'}
          </button>
        </div>
      </header>
      <div className="lesson-flow-progress">
        <progress value={completedCount} max={Math.max(activities.length, 1)} aria-label={`Đã hoàn thành ${completedCount}/${activities.length} hoạt động`} />
        <span>{completedCount}/{activities.length} đã xong</span>
      </div>
      <DraftStatus status={localDraft.status} />

      {/* Form Thêm Hoạt Động Nhanh */}
      {showAddForm && (
        <form id={addFormId} onSubmit={handleAddActivity} style={{
          background: 'var(--surface-secondary)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>
            ➕ Chọn Loại Hoạt Động & Thời Lượng:
          </div>

          {/* Grid chọn loại hoạt động */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.4rem' }}>
            {Object.entries(ACTIVITY_TYPES).map(([key, t]) => {
              const isSelected = newActivity.type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTypeSelect(key)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? `2px solid ${t.color}` : '1px solid var(--surface-border)',
                    background: isSelected ? t.bg : 'var(--surface-card)',
                    color: isSelected ? t.color : 'var(--text-main)',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{t.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="lesson-flow-new-fields">
            <div>
              <label htmlFor={`${addFormId}-title`} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Tiêu đề hoạt động (*)
              </label>
              <input
                id={`${addFormId}-title`}
                type="text"
                className="input-field"
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor={`${addFormId}-duration`} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Thời gian (phút)
              </label>
              <input
                id={`${addFormId}-duration`}
                type="number"
                min="1"
                max="60"
                className="input-field"
                value={newActivity.duration}
                onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Thêm Vào Tiến Trình
            </button>
          </div>
        </form>
      )}

      <ol className="lesson-flow-list">
        {activities.map((activity, index) => <LessonFlowActivityCard
          key={activity.id || index} activity={activity} index={index} count={activities.length}
          isCurrent={index === currentActivityIndex}
          typeInfo={ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.ACTIVITY}
          isEditing={editingIndex === index} editForm={editForm} onEditChange={setEditForm}
          onSave={saveEditing} onCancelEdit={() => setEditingIndex(null)} onStartEdit={startEditing}
          onSetStatus={handleSetStatus} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown}
          onDuplicate={handleDuplicate} onDelete={handleDelete}
        />)}
      </ol>
      {!activities.length && <p className="lesson-flow-empty">Chưa có hoạt động. Thêm hoạt động hoặc dùng AI để chuẩn bị tiến trình.</p>}
      {resumeError&&<p role="alert" className="session-save-warning">{resumeError}</p>}

      {/* Modal AI Đề Xuất Tiến Trình */}
      {isAiFlowOpen && (
        <AiLessonFlowModal
          isOpen={isAiFlowOpen}
          onClose={() => {setIsAiFlowOpen(false);setResumeLesson(undefined);}}
          lesson={lessonsList.find(l => String(l.id) === String(resumeLesson===undefined?lessonId:resumeLesson)) || null}
          lessons={lessonsList}
          currentActivityCount={activities.length}
          onApplyFlow={async (newActs) => {
            await onUpdateActivities(newActs, { resetSelection: true });
          }}
        />
      )}
    </section>
  );
}
