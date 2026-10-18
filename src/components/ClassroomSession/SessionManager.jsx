import React, { useState, useEffect, useRef } from 'react';
import DialogService from '../../services/DialogService';
import SessionList from './SessionList';
import SessionDashboard from './SessionDashboard';
import CreateSessionModal from './CreateSessionModal';
import SessionSummaryModal from './SessionSummaryModal';
import SessionSaveStatus from './SessionSaveStatus';
import {SESSION_RESOLVED_EVENT,restoreSessionRecoveryDraft,mergePendingSession} from './sessionPersistence';
import {DRAFT_OPEN,requestedDraft,consumeDraft} from '../../services/sharedDrafts';
import { 
  fetchSessionsFromApi, 
  fetchSessionDetailFromApi, 
  createSessionApi, 
  resolveSessionClassId,
  deleteSessionApi,
  getStoredActiveSessionId,
  setStoredActiveSessionId
} from './sessionStorage';

export default function SessionManager({
  classes = [],
  currentClass,
  onSelectClass = null,
  autoOpenClassId = null,
  onClearAutoOpen = null,
  onUpdateStudents,
  onUpdateGoodScores,
  soundEnabled
}) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'dashboard'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalTargetClassId, setCreateModalTargetClassId] = useState(null);
  const [createModalTargetSlot, setCreateModalTargetSlot] = useState(null);
  const [viewSummarySession, setViewSummarySession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteFailure, setDeleteFailure] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [resumeError,setResumeError]=useState('');
  const resuming=useRef(null);
  useEffect(()=>{
    const resume=async()=>{
      const request=requestedDraft();if(!request||!classes.length||resuming.current===request||/^(question-form|ai-questions):/.test(request.scope)||request.scope==='timetable-editor')return;
      resuming.current=request;setResumeError('');
      try{
        if(request.scope.startsWith('session-create:')){
          const id=request.scope.slice('session-create:'.length);const target=classes.find(row=>row.id===id)||classes.find(row=>row.id===request.data.selectedClassId);
          if(!target)throw new Error('Lớp trong bản nháp không còn tồn tại. Nội dung vẫn được giữ trong danh sách Bản nháp.');
          setCreateModalTargetClassId(target.id);setShowCreateModal(true);consumeDraft(request);return;
        }
        const id=request.scope.startsWith('flow-editor:')?request.scope.slice('flow-editor:'.length):request.scope.startsWith('session-conflict:')?request.data.sessionId:request.targetSessionId;
        if(!id)throw new Error('Chưa chọn tiết học để tiếp tục bản nháp.');
        const detail=await fetchSessionDetailFromApi(id);
        if(!detail)throw new Error('Tiết học trong bản nháp không còn tồn tại. Nội dung vẫn được giữ.');
        if(request.scope.startsWith('ai-flow:')&&['COMPLETED','CANCELLED'].includes(detail.status))throw new Error('Hãy chọn một tiết học chưa kết thúc để nhận tiến trình.');
        if(request.scope.startsWith('session-conflict:'))restoreSessionRecoveryDraft(request.data);
        setActiveSession(mergePendingSession(detail));setCurrentView('dashboard');setStoredActiveSessionId(id);onSelectClass?.(detail.class_id);
        if(!request.scope.startsWith('ai-flow:'))consumeDraft(request);
        else window.dispatchEvent(new Event(DRAFT_OPEN));
      }catch(error){setResumeError(error.message);consumeDraft(request);}
    };
    void resume();window.addEventListener(DRAFT_OPEN,resume);return()=>window.removeEventListener(DRAFT_OPEN,resume);
  },[classes,onSelectClass]);
  useEffect(()=>{
    const resolved=event=>{setSessions(previous=>previous.map(session=>session.id===event.detail.id?event.detail:session));setActiveSession(previous=>previous?.id===event.detail.id?event.detail:previous);};
    window.addEventListener(SESSION_RESOLVED_EVENT,resolved);
    return()=>window.removeEventListener(SESSION_RESOLVED_EVENT,resolved);
  },[]);

  // Tự động mở Modal tạo tiết học khi được kích hoạt từ Thời khóa biểu
  useEffect(() => {
    if (autoOpenClassId) {
      // Nếu đang có tiết học chưa hoàn thành, ưu tiên tiếp tục tiết học đang diễn ra
      if (activeSession && activeSession.status !== 'COMPLETED') {
        const currentActiveCId = activeSession.class_id || activeSession.classId;
        if (currentActiveCId === autoOpenClassId) {
          setCurrentView('dashboard');
          onClearAutoOpen?.();
          return;
        } else {
          const keepOngoing = DialogService.confirm(
            `Đang có tiết học "${activeSession.lesson_title || 'Tin học'}" chưa kết thúc!\n\nThầy/Cô có muốn tiếp tục tiết học đang diễn ra không?\n(Bấm OK để tiếp tục tiết học này, bấm Cancel nếu muốn tạo tiết học mới)`
          );
          if (keepOngoing) {
            setCurrentView('dashboard');
            onClearAutoOpen?.();
            return;
          }
        }
      }

      setCreateModalTargetClassId(autoOpenClassId);
      setShowCreateModal(true);
      onClearAutoOpen?.();
    }
  }, [autoOpenClassId, activeSession, onClearAutoOpen]);

  // Nạp danh sách sessions khi component khởi tạo và tự động khôi phục tiết học chưa kết thúc
  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      const data = await fetchSessionsFromApi();
      setSessions(data || []);
      if(resuming.current){setLoading(false);return;}

      // 1. Kiểm tra session có id trong stored active session
      const storedActiveId = getStoredActiveSessionId();
      let restoredSession = null;

      if (storedActiveId) {
        const activeDetail = await fetchSessionDetailFromApi(storedActiveId);
        if (activeDetail && activeDetail.status !== 'COMPLETED' && activeDetail.status !== 'CANCELLED') {
          restoredSession = activeDetail;
        }
      }

      // 2. Nếu chưa có, tự động quét tìm phiên chưa hoàn thành gần nhất (RUNNING, PAUSED, READY)
      if (!restoredSession && data && data.length > 0) {
        const ongoing = data.find(s => s.status === 'RUNNING' || s.status === 'PAUSED' || s.status === 'READY');
        if (ongoing) {
          const detail = await fetchSessionDetailFromApi(ongoing.id);
          if (detail && detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED') {
            restoredSession = detail;
          }
        }
      }

      // 3. Tự động đưa giáo viên vào lại tiết học chưa kết thúc
      if (restoredSession) {
        setActiveSession(restoredSession);
        setCurrentView('dashboard');
        setStoredActiveSessionId(restoredSession.id);
        const targetCId = restoredSession.class_id || restoredSession.classId;
        if (targetCId && onSelectClass) {
          onSelectClass(targetCId);
        }
      }
      setLoading(false);
    }
    loadSessions();
  }, [onSelectClass]);

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
        const targetCId = detail?.class_id || detail?.classId || created?.class_id || created?.classId;
        if (targetCId && onSelectClass) {
          onSelectClass(targetCId);
        }
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
      const targetCId = detail.class_id || detail.classId;
      if (targetCId && onSelectClass) {
        onSelectClass(targetCId);
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
  const handleDeleteSession = async (sessionId, title, retry = false) => {
    if (deleting) return;
    if (retry || DialogService.confirm(`Thầy/cô có chắc muốn xóa tiết học "${title}"?`)) {
      setDeleting(true);
      try {
      await deleteSessionApi(sessionId);
      setDeleteFailure(null);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setCurrentView('list');
      }
      } catch (error) { setDeleteFailure({ sessionId, title, message: error.message }); }
      finally { setDeleting(false); }
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
      {resumeError&&<p role="alert" className="session-save-warning">{resumeError}</p>}
      {currentView === 'list' && <SessionSaveStatus />}
      {deleteFailure && <div role="alert" className="session-save-warning"><strong>Chưa xóa tiết học</strong><p>{deleteFailure.message} Tiết học vẫn được giữ trong danh sách.</p><button className="btn btn-outline" disabled={deleting} onClick={() => handleDeleteSession(deleteFailure.sessionId, deleteFailure.title, true)}>Thử xóa lại</button></div>}
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
            onOpenCreateModal={(targetClassId = null, targetSlot = null) => {
              const cId = resolveSessionClassId(classes, targetClassId, currentClass?.id);
              if (!cId) { DialogService.alert('Hãy chọn một lớp trước khi tạo tiết học.'); return; }
              if (cId && onSelectClass) {
                onSelectClass(cId);
              }
              setCreateModalTargetClassId(cId);
              setCreateModalTargetSlot(targetSlot);
              setShowCreateModal(true);
            }}
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
          onUpdateStudents={(updatedStudents, classId = sessionClass?.id) => {
            onUpdateStudents?.(updatedStudents, classId || sessionClass?.id);
          }}
          onUpdateGoodScores={(updatedGoodScores, classId = sessionClass?.id) => {
            onUpdateGoodScores?.(updatedGoodScores, classId || sessionClass?.id);
          }}
          onBackToList={handleBackToList}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Modal Tạo Session Mới */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateModalTargetClassId(null);
          setCreateModalTargetSlot(null);
        }}
        classes={classes}
        currentClass={classes.find(c => c.id === createModalTargetClassId) || currentClass}
        initialClassId={createModalTargetClassId}
        initialSlot={createModalTargetSlot}
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
