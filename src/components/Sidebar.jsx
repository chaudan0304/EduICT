import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  Home,
  Target,
  BookOpen,
  Zap,
  Monitor,
  ClipboardList,
  Star,
  Gift,
  Clock,
  Sparkles,
  Gamepad2,
  HelpCircle
} from 'lucide-react';
import { detectGradeFromName } from '../utils/storage';

export default function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  currentClass
}) {
  const currentGradeNum = currentClass?.grade || detectGradeFromName(currentClass?.name) || 3;

  const navTabs = [
    { id: 'home', label: 'Trang Chủ', icon: <Home size={19} />, emoji: '🏠' },
    { id: 'sessions', label: 'Tiết Học (Session)', icon: <Target size={19} />, emoji: '🎯', badge: 'CHÍNH', highlight: true },
    { id: 'lessons', label: 'Bài Học & Slide', icon: <BookOpen size={19} />, emoji: '📚' },
    { id: 'quiz', label: 'Quick Quiz (Đố Vui)', icon: <Zap size={19} />, emoji: '⚡' },
    { id: 'seating', label: 'Phòng Máy (31 Máy)', icon: <Monitor size={19} />, emoji: '🖥️' },
    { id: 'gradebook', label: currentGradeNum <= 2 ? 'Sổ Kỹ Năng & Sao' : 'Sổ Điểm (TT27)', icon: <ClipboardList size={19} />, emoji: '📋' },
    { id: 'goodscores', label: 'Điểm Tốt & Nội Quy', icon: <Star size={19} />, emoji: '⭐' },
    { id: 'duckrace', label: 'Đua Vịt', icon: <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>🦆</span>, emoji: '🦆' },
    { id: 'luckywheel', label: 'Vòng Quay', icon: <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>🎡</span>, emoji: '🎡' },
    { id: 'rewards', label: 'Đổi Thưởng', icon: <Gift size={19} />, emoji: '🎁' },
    { id: 'timer', label: 'Đếm Giờ', icon: <Clock size={19} />, emoji: '⏱️' },
  ];

  return (
    <aside 
      className="app-sidebar"
      style={{
        width: isCollapsed ? '70px' : '240px',
        minWidth: isCollapsed ? '70px' : '240px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--surface-card)',
        borderRight: '1px solid var(--surface-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 90,
        boxShadow: '1px 0 6px rgba(0, 0, 0, 0.03)',
        userSelect: 'none'
      }}
    >
      {/* Sidebar Header: Toggle Button */}
      <div style={{
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        padding: isCollapsed ? '0' : '0 1rem',
        borderBottom: '1px solid var(--surface-border)',
        flexShrink: 0
      }}>
        {!isCollapsed && (
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            color: 'var(--text-muted)', 
            letterSpacing: '0.06em', 
            textTransform: 'uppercase' 
          }}>
            Điều Hướng
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Mở rộng thanh điều hướng (Sidebar)" : "Thu gọn thanh điều hướng (Sidebar)"}
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-secondary)',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.1)';
            e.currentTarget.style.color = '#0284c7';
            e.currentTarget.style.borderColor = 'rgba(2, 132, 199, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface-secondary)';
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.borderColor = 'var(--surface-border)';
          }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Tabs List */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isCollapsed ? '0.6rem 0.4rem' : '0.6rem 0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}
      >
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              title={isCollapsed ? tab.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: isCollapsed ? '0.65rem 0' : '0.65rem 0.75rem',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                color: isActive ? '#0284c7' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--surface-secondary)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              {/* Active Indicator Bar on Left */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '15%',
                  bottom: '15%',
                  width: '3.5px',
                  background: '#0284c7',
                  borderRadius: '0 4px 4px 0'
                }} />
              )}

              {/* Tab Icon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                flexShrink: 0,
                color: isActive ? '#0284c7' : (tab.highlight ? '#0284c7' : 'inherit')
              }}>
                {tab.icon}
              </div>

              {/* Label & Badge (hidden when collapsed) */}
              {!isCollapsed && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flex: 1, 
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {tab.label}
                  </span>

                  {tab.badge && (
                    <span style={{
                      fontSize: '0.625rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      color: '#fff',
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)',
                      letterSpacing: '0.02em',
                      marginLeft: '0.4rem'
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--surface-border)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-secondary)'
        }}>
          <span>EduICT v2.0</span>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.3rem', 
            fontSize: '0.7rem',
            color: '#10b981',
            fontWeight: 600
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            Sẵn sàng
          </span>
        </div>
      )}
    </aside>
  );
}
