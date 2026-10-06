import React from 'react';
import { ChevronLeft, ChevronRight, Home, Target, BookOpen, Zap, Monitor, ClipboardList, Star, Gift, Clock, Gamepad2 } from 'lucide-react';
import { detectGradeFromName } from '../utils/storage';

export default function Sidebar({ activeTab, onSelectTab, isCollapsed, onToggleCollapse, currentClass, hasOngoingSession = false }) {
  const grade = Number(currentClass?.grade || detectGradeFromName(currentClass?.name) || 3);
  const groups = [
    { label: 'Giảng dạy', items: [
      ['home', 'Trang chủ', Home], ['sessions', 'Tiết học', Target],
      ['lessons', 'Bài học & slide', BookOpen], ['quiz', 'Đố vui', Zap],
    ] },
    { label: 'Lớp học', items: [
      ['seating', 'Phòng máy', Monitor], ['gradebook', grade <= 2 ? 'Sổ kỹ năng & sao' : 'Sổ đánh giá', ClipboardList],
      ['goodscores', 'Điểm tốt & nội quy', Star], ['rewards', 'Đổi quà', Gift],
    ] },
    { label: 'Hoạt động', items: [
      ['duckrace', 'Đua vịt', Gamepad2], ['luckywheel', 'Vòng quay', Gamepad2], ['timer', 'Đếm giờ', Clock],
    ] },
  ];
  return (
    <aside className={`app-sidebar${isCollapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-heading">
        <span className="sidebar-heading-label">Không gian dạy học</span>
        <button type="button" className="btn btn-outline btn-icon sidebar-toggle" onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Mở rộng điều hướng' : 'Thu gọn điều hướng'} aria-expanded={!isCollapsed} aria-controls="main-navigation">
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav id="main-navigation" aria-label="Chức năng chính" className="sidebar-navigation">
        {groups.map(group => <section key={group.label} className="sidebar-group">
          <h2>{group.label}</h2>
          {group.items.map(([id, label, Icon]) => <button key={id} type="button" className={`sidebar-link${activeTab === id ? ' is-active' : ''}`}
            onClick={() => onSelectTab(id)} aria-current={activeTab === id ? 'page' : undefined} aria-label={label} title={label}>
            <Icon size={19} aria-hidden="true" />
            <span className="sidebar-link-label">{label}</span>
            {id === 'sessions' && hasOngoingSession && <span className="sidebar-live" aria-label="Đang dạy" />}
          </button>)}
        </section>)}
      </nav>
      <div className="sidebar-footer"><BookOpen size={18} aria-hidden="true" /><span>Tin học tiểu học</span></div>
    </aside>
  );
}
