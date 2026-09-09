import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Play, 
  Calendar, 
  Clock, 
  Star, 
  BookOpen, 
  Trash2, 
  FileText,
  Search,
  ArrowRight,
  Layers
} from 'lucide-react';

export default function SessionList({
  sessions = [],
  classes = [],
  currentClass,
  _activeSessionId,
  onOpenCreateModal,
  onEnterSession,
  onViewSummary,
  onDeleteSession
}) {
  const [selectedClassFilter, setSelectedClassFilter] = useState(currentClass?.id || 'all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'completed' | 'draft'
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc danh sách sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchClass = selectedClassFilter === 'all' || s.class_id === selectedClassFilter || s.classId === selectedClassFilter;
      const matchSearch = (s.lesson_title || s.lessonTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.class_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const st = s.status || 'DRAFT';
      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = st === 'RUNNING' || st === 'PAUSED';
      else if (statusFilter === 'completed') matchStatus = st === 'COMPLETED';
      else if (statusFilter === 'draft') matchStatus = st === 'DRAFT' || st === 'READY';

      return matchClass && matchSearch && matchStatus;
    });
  }, [sessions, selectedClassFilter, statusFilter, searchQuery]);

  // Tìm session đang chạy
  const runningSession = sessions.find(s => s.status === 'RUNNING' || s.status === 'PAUSED');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RUNNING':
        return { label: 'ĐANG HỌC', bg: '#10b981', color: '#fff', pulse: true };
      case 'PAUSED':
        return { label: 'TẠM DỪNG', bg: '#f59e0b', color: '#fff', pulse: false };
      case 'COMPLETED':
        return { label: 'ĐÃ KẾT THÚC', bg: '#64748b', color: '#fff', pulse: false };
      default:
        return { label: 'SẴN SÀNG', bg: '#0284c7', color: '#fff', pulse: false };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Banner nếu có Session đang chạy */}
      {runningSession && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '2px solid #10b981',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#10b981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.6)'
            }}>
              ⚡
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  background: '#10b981',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {runningSession.status === 'RUNNING' ? 'ĐANG DIỄN RA' : 'TẠM DỪNG'}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Lớp {runningSession.class_name || 'Lớp học'} • {runningSession.session_date}
                </span>
              </div>

              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {runningSession.lesson_title}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onEnterSession(runningSession.id)}
            style={{
              padding: '0.65rem 1.5rem',
              fontWeight: 800,
              fontSize: '0.9375rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Play size={18} />
            <span>Tiếp Tục Tiết Học Ngay</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Header thanh công cụ quản lý Session */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎯 Danh Sách Classroom Sessions (Tiết Học)</span>
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Trung tâm điều khiển và lưu trữ lịch sử bài giảng môn Tin học Tiểu học
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenCreateModal}
          style={{
            padding: '0.6rem 1.25rem',
            fontWeight: 800,
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Plus size={18} />
          <span>Tạo Classroom Session Mới</span>
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 260 }}>
          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Tìm theo tên bài học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          {/* Lọc theo Lớp */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="input-field"
            style={{ width: 170 }}
          >
            <option value="all">Tất cả các lớp</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} (Khối {c.grade || 3})
              </option>
            ))}
          </select>

          {/* Lọc theo Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ width: 150 }}
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang học / Tạm dừng</option>
            <option value="draft">Bản nháp / Sẵn sàng</option>
            <option value="completed">Đã kết thúc</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Hiển thị <strong>{filteredSessions.length}</strong> tiết học
        </div>
      </div>

      {/* Lưới các thẻ Session */}
      {filteredSessions.length === 0 ? (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px dashed var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '3.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <BookOpen size={48} style={{ display: 'block', margin: '0 auto 0.75rem', color: 'var(--text-dim)' }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Chưa có Classroom Session nào phù hợp
          </div>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem' }}>
            Bấm "Tạo Classroom Session Mới" để lên tiến trình và bắt đầu buổi dạy học
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenCreateModal}>
            <Plus size={16} /> Tạo Tiết Học Đầu Tiên
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredSessions.map(session => {
            const badge = getStatusBadge(session.status);
            const isCompleted = session.status === 'COMPLETED';

            return (
              <div
                key={session.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  {/* Top card: Badge & Lớp */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(2, 132, 199, 0.12)',
                      color: '#0284c7'
                    }}>
                      {session.class_name || 'Lớp học'}
                    </span>

                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: badge.bg,
                      color: badge.color
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Tên bài học */}
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    lineHeight: 1.3
                  }}>
                    {session.lesson_title}
                  </h3>

                  {/* Thời gian & Ngày */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} /> {session.session_date}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} /> {session.duration_minutes} phút
                    </span>
                  </div>

                  {/* Thống kê hoạt động & sao */}
                  <div style={{
                    marginTop: '0.85rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px dashed var(--surface-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Layers size={14} color="var(--primary)" />
                      <strong>{session.activity_count || 0}</strong> hoạt động
                    </span>

                    <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      +{session.total_stars_awarded || 0} ⭐
                    </span>
                  </div>
                </div>

                {/* Footer nút hành động */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => onDeleteSession(session.id, session.lesson_title)}
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.3rem 0.55rem' }}
                    title="Xóa tiết học này"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isCompleted && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onViewSummary(session.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <FileText size={14} />
                        <span>Báo Cáo</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onEnterSession(session.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: isCompleted ? 'var(--surface-secondary)' : undefined,
                        color: isCompleted ? 'var(--text-main)' : undefined,
                        borderColor: isCompleted ? 'var(--surface-border)' : undefined
                      }}
                    >
                      <Play size={14} />
                      <span>{isCompleted ? 'Xem Lại' : 'Vào Tiết Học'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
