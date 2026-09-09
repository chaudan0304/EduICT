import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  SkipForward, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Trash2, 
  Plus, 
  Edit3, 
  Check, 
  X,
  Layers
} from 'lucide-react';
import { ACTIVITY_TYPES } from './sessionStorage';

export default function LessonFlowList({
  activities = [],
  currentActivityIndex,
  onSelectActivity,
  onUpdateActivities,
  _isSessionRunning
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', duration: 5, type: 'ACTIVITY', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'ACTIVITY',
    title: 'Luyện tập & Thực hành phòng máy',
    duration: 10,
    description: ''
  });

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
  };

  // Xóa hoạt động
  const handleDelete = (index) => {
    if (activities.length <= 1) {
      alert('Tiết học cần có ít nhất 1 hoạt động!');
      return;
    }
    if (window.confirm(`Xóa hoạt động "${activities[index].title}"?`)) {
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

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Header Flow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Layers size={20} color="var(--primary)" />
            <span>Tiến Trình Tiết Học (Lesson Flow)</span>
          </div>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Tổng thời lượng dự kiến: <strong>{totalPlannedMins} phút</strong> • {activities.length} hoạt động
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddForm(prev => !prev)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          {showAddForm ? <X size={15} /> : <Plus size={15} />}
          <span>{showAddForm ? 'Đóng' : 'Thêm Hoạt Động'}</span>
        </button>
      </div>

      {/* Form Thêm Hoạt Động Nhanh */}
      {showAddForm && (
        <form onSubmit={handleAddActivity} style={{
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.6rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Tiêu đề hoạt động (*)
              </label>
              <input
                type="text"
                className="input-field"
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Thời gian (phút)
              </label>
              <input
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

      {/* Danh Sách Các Hoạt Động (Activities List) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '52vh', overflowY: 'auto' }}>
        {activities.map((act, index) => {
          const isCurrent = index === currentActivityIndex;
          const typeInfo = ACTIVITY_TYPES[act.type] || ACTIVITY_TYPES.ACTIVITY;
          const isEditing = editingIndex === index;

          const duration = act.duration_minutes || act.durationMinutes || 5;

          return (
            <div
              key={act.id || index}
              style={{
                background: isCurrent 
                  ? 'rgba(2, 132, 199, 0.08)' 
                  : (act.status === 'COMPLETED' ? 'var(--surface-secondary)' : 'var(--surface-card)'),
                border: isCurrent 
                  ? '2px solid var(--primary)' 
                  : '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                opacity: act.status === 'SKIPPED' ? 0.6 : 1
              }}
            >
              {/* Bên trái: Số thứ tự, Icon & Tiêu đề */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                {/* Thứ tự */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isCurrent ? 'var(--primary)' : 'var(--surface-secondary)',
                  color: isCurrent ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                {/* Nội dung hoạt động */}
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <input
                      type="text"
                      className="input-field"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className="input-field"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                      style={{ width: 70 }}
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEditing(index)}>
                      <Check size={14} />
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingIndex(null)}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.1rem' }}>{typeInfo.icon}</span>
                      <span style={{
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: isCurrent ? 'var(--primary)' : 'var(--text-main)',
                        textDecoration: act.status === 'COMPLETED' ? 'line-through' : 'none'
                      }}>
                        {act.title}
                      </span>

                      {/* Trạng thái tag */}
                      {act.status === 'IN_PROGRESS' && (
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          background: '#10b981',
                          color: '#fff',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          ĐANG HỌC
                        </span>
                      )}
                      {act.status === 'COMPLETED' && (
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 4
                        }}>
                          ✓ Xong
                        </span>
                      )}
                      {act.status === 'SKIPPED' && (
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          background: 'rgba(148, 163, 184, 0.15)',
                          color: '#64748b',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 4
                        }}>
                          Bỏ qua
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      ⏱️ {duration} phút • {typeInfo.label}
                    </div>
                  </div>
                )}
              </div>

              {/* Bên phải: Nút điều khiển hoạt động */}
              {!isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {/* Bắt đầu hoạt động này */}
                  <button
                    type="button"
                    className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleSetStatus(index, 'IN_PROGRESS')}
                    title="Bắt đầu hoạt động này"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                  >
                    <Play size={13} />
                    <span>{isCurrent ? 'Đang chạy' : 'Bắt đầu'}</span>
                  </button>

                  {/* Hoàn thành */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleSetStatus(index, 'COMPLETED')}
                    title="Đánh dấu hoàn thành"
                    style={{
                      padding: '0.25rem 0.5rem',
                      color: act.status === 'COMPLETED' ? '#10b981' : 'var(--text-muted)',
                      borderColor: act.status === 'COMPLETED' ? '#10b981' : 'var(--surface-border)'
                    }}
                  >
                    <CheckCircle2 size={14} />
                  </button>

                  {/* Bỏ qua */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleSetStatus(index, 'SKIPPED')}
                    title="Bỏ qua hoạt động này"
                    style={{ padding: '0.25rem 0.5rem', color: '#64748b' }}
                  >
                    <SkipForward size={14} />
                  </button>

                  {/* Di chuyển lên */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{ padding: '0.25rem 0.4rem', opacity: index === 0 ? 0.3 : 1 }}
                    title="Chuyển lên trên"
                  >
                    <ArrowUp size={13} />
                  </button>

                  {/* Di chuyển xuống */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === activities.length - 1}
                    style={{ padding: '0.25rem 0.4rem', opacity: index === activities.length - 1 ? 0.3 : 1 }}
                    title="Chuyển xuống dưới"
                  >
                    <ArrowDown size={13} />
                  </button>

                  {/* Nhân bản */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDuplicate(index)}
                    title="Nhân bản hoạt động này"
                    style={{ padding: '0.25rem 0.4rem' }}
                  >
                    <Copy size={13} />
                  </button>

                  {/* Sửa */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => startEditing(index)}
                    title="Chỉnh sửa hoạt động"
                    style={{ padding: '0.25rem 0.4rem' }}
                  >
                    <Edit3 size={13} />
                  </button>

                  {/* Xóa */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDelete(index)}
                    title="Xóa hoạt động"
                    style={{ padding: '0.25rem 0.4rem', color: '#ef4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
