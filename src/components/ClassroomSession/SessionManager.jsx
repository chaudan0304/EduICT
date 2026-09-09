import React, { useState, useEffect } from 'react';
import SessionList from './SessionList';
import SessionDashboard from './SessionDashboard';
import CreateSessionModal from './CreateSessionModal';
import SessionSummaryModal from './SessionSummaryModal';
import { 
  fetchSessionsFromApi, 
  fetchSessionDetailFromApi, 
  createSessionApi, 
  deleteSessionApi,
  getStoredActiveSessionId,
  setStoredActiveSessionId
} from './sessionStorage';

export default function SessionManager({
  classes = [],
  currentClass,
  onUpdateStudents,
  onUpdateGoodScores,
  soundEnabled
}) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'dashboard'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewSummarySession, setViewSummarySession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Nạp danh sách sessions khi component khởi tạo hoặc đổi lớp
  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      const data = await fetchSessionsFromApi();
      setSessions(data || []);

      // Kiểm tra nếu có session đang chạy trong cache để tiếp tục ngay (F5 resilience)
      const storedActiveId = getStoredActiveSessionId();
      if (storedActiveId) {
        const activeDetail = await fetchSessionDetailFromApi(storedActiveId);
        if (activeDetail && (activeDetail.status === 'RUNNING' || activeDetail.status === 'PAUSED')) {
          setActiveSession(activeDetail);
          setCurrentView('dashboard');
        }
      }
      setLoading(false);
    }
    loadSessions();
  }, []);

  // Tạo Session mới
  const handleCreateSession = async (sessionData, shouldStartImmediately) => {
    const created = await createSessionApi(sessionData);
    if (created) {
      setSessions(prev => [created, ...prev.filter(s => s.id !== created.id)]);
      if (shouldStartImmediately) {
        const detail = await fetchSessionDetailFromApi(created.id);
        setActiveSession(detail || created);
        setCurrentView('dashboard');
        setStoredActiveSessionId(created.id);
      }
    }
  };

  // Vào xem / điều khiển session
  const handleEnterSession = async (sessionId) => {
    setLoading(true);
    const detail = await fetchSessionDetailFromApi(sessionId);
    if (detail) {
      setActiveSession(detail);
      setCurrentView('dashboard');
      if (detail.status === 'RUNNING' || detail.status === 'PAUSED') {
        setStoredActiveSessionId(detail.id);
      }
    }
    setLoading(false);
  };

  // Xem báo cáo tổng kết của session đã hoàn thành
  const handleViewSummary = async (sessionId) => {
    const detail = await fetchSessionDetailFromApi(sessionId);
    if (detail) {
      setViewSummarySession(detail);
    }
  };

  // Xóa session
  const handleDeleteSession = async (sessionId, title) => {
    if (window.confirm(`Thầy/cô có chắc muốn xóa tiết học "${title}"?`)) {
      await deleteSessionApi(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setCurrentView('list');
      }
    }
  };

  // Quay lại danh sách
  const handleBackToList = async () => {
    const freshList = await fetchSessionsFromApi();
    setSessions(freshList || []);
    setCurrentView('list');
    setActiveSession(null);
  };

  // Tìm lớp của active session
  const sessionClass = classes.find(c => c.id === (activeSession?.class_id || activeSession?.classId)) || currentClass;

  return (
    <div className="classroom-session-container">
      {currentView === 'list' && (
        loading && sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Đang tải dữ liệu tiết học...
          </div>
        ) : (
          <SessionList
            sessions={sessions}
            classes={classes}
            currentClass={currentClass}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onEnterSession={handleEnterSession}
            onViewSummary={handleViewSummary}
            onDeleteSession={handleDeleteSession}
          />
        )
      )}

      {currentView === 'dashboard' && activeSession && (
        <SessionDashboard
          key={activeSession.id}
          initialSession={activeSession}
          currentClass={sessionClass}
          onUpdateStudents={onUpdateStudents}
          onUpdateGoodScores={onUpdateGoodScores}
          onBackToList={handleBackToList}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Modal Tạo Session Mới */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classes={classes}
        currentClass={currentClass}
        onCreateSession={handleCreateSession}
      />

      {/* Modal Xem Báo Cáo của Session đã hoàn thành (từ danh sách) */}
      {viewSummarySession && (
        <SessionSummaryModal
          isOpen={true}
          isConfirmingEnd={false}
          onClose={() => setViewSummarySession(null)}
          session={viewSummarySession}
          currentClass={classes.find(c => c.id === (viewSummarySession.class_id || viewSummarySession.classId)) || currentClass}
          activities={viewSummarySession.activities || []}
          participationRecords={viewSummarySession.participation || []}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  );
}
