import React, { useState, useEffect } from 'react';
import SessionHeader from './SessionHeader';
import SessionTimerDisplay from './SessionTimerDisplay';
import LessonFlowList from './LessonFlowList';
import StudentParticipationGrid from './StudentParticipationGrid';
import SessionControlBar from './SessionControlBar';
import QuickToolModal from './QuickToolModal';
import SessionSummaryModal from './SessionSummaryModal';
import PresentationView from '../LessonPresentation/PresentationView';
import { fetchLessonDetailApi, fetchLessonsApi } from '../LessonPresentation/lessonStorage';
import { 
  updateSessionApi, 
  saveActivitiesApi, 
  addSessionEventApi, 
  addStudentParticipationApi,
  setStoredActiveSessionId 
} from './sessionStorage';
import { soundEffects } from '../../utils/audio';
import CreateQuizModal from '../QuickQuiz/CreateQuizModal';
import QuizPlayer from '../QuickQuiz/QuizPlayer';
import QuizResultModal from '../QuickQuiz/QuizResultModal';

export default function SessionDashboard({
  initialSession,
  currentClass,
  onUpdateStudents,
  onUpdateGoodScores,
  onBackToList,
  soundEnabled
}) {
  const [session, setSession] = useState(initialSession);
  const [activities, setActivities] = useState(() => initialSession.activities || []);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(() => {
    const foundIdx = (initialSession.activities || []).findIndex(a => a.status === 'IN_PROGRESS');
    return foundIdx >= 0 ? foundIdx : 0;
  });

  const [participationRecords, setParticipationRecords] = useState(() => initialSession.participation || []);
  
  // Timer States (tính theo giây)
  const sessionTotalSec = (session.duration_minutes || session.durationMinutes || 35) * 60;
  const [sessionRemainingSec, setSessionRemainingSec] = useState(() => {
    if (session.status === 'RUNNING' && session.started_at) {
      const startMs = new Date(session.started_at).getTime();
      const nowMs = Date.now();
      const pausedSec = session.total_paused_seconds || 0;
      const elapsed = Math.floor((nowMs - startMs) / 1000) - pausedSec;
      return Math.max(0, sessionTotalSec - Math.max(0, elapsed));
    }
    return sessionTotalSec;
  });

  const currentActivity = activities[currentActivityIndex] || activities[0];
  const actDurationSec = (currentActivity?.duration_minutes || currentActivity?.durationMinutes || 5) * 60;
  const [activityRemainingSec, setActivityRemainingSec] = useState(actDurationSec);

  // Modal states
  const [quickToolType, setQuickToolType] = useState(null); // 'wheel' | 'duckrace' | 'quiz' | null
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [presentationLesson, setPresentationLesson] = useState(null);
  const [isQuizCreatorOpen, setIsQuizCreatorOpen] = useState(false);
  const [activeQuizSession, setActiveQuizSession] = useState(null);
  const [quizSummary, setQuizSummary] = useState(null);
  const [isQuizResultOpen, setIsQuizResultOpen] = useState(false);

  // Mở trình chiếu bài học ngay trong tiết học
  const handleLaunchPresentation = async () => {
    try {
      let lesson = null;
      if (session.lesson_id || session.lessonId) {
        lesson = await fetchLessonDetailApi(session.lesson_id || session.lessonId);
      }
      if (!lesson) {
        const grade = currentClass?.grade || 3;
        const available = await fetchLessonsApi({ grade });
        if (available && available.length > 0) {
          lesson = await fetchLessonDetailApi(available[0].id);
        }
      }
      if (!lesson) {
        alert('Chưa có bài học nào trong Thư Viện. Vui lòng chuyển sang tab "Bài Học & Slide" để tạo bài học trước!');
        return;
      }
      setPresentationLesson(lesson);
      setIsPresentationOpen(true);
    } catch (err) {
      alert(`Lỗi mở trình chiếu: ${err.message}`);
    }
  };

  // Sync active session ID to localStorage
  useEffect(() => {
    if (session.status === 'RUNNING' || session.status === 'PAUSED') {
      setStoredActiveSessionId(session.id);
    } else if (session.status === 'COMPLETED') {
      setStoredActiveSessionId(null);
    }
  }, [session.id, session.status]);

  // Master Timer Interval
  const isRunning = session.status === 'RUNNING';
  const isPaused = session.status === 'PAUSED';

  useEffect(() => {
    let timerId = null;
    if (isRunning) {
      timerId = setInterval(() => {
        setSessionRemainingSec(prev => Math.max(0, prev - 1));
        setActivityRemainingSec(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isRunning]);

  // 1. Bắt đầu tiết học
  const handleStartSession = async () => {
    const nowIso = new Date().toISOString();
    const updated = {
      ...session,
      status: 'RUNNING',
      started_at: session.started_at || nowIso
    };
    setSession(updated);

    // Kích hoạt hoạt động đầu tiên nếu chưa chạy
    let updatedActivities = [...activities];
    if (updatedActivities.length > 0 && !updatedActivities.some(a => a.status === 'IN_PROGRESS')) {
      updatedActivities[0] = { ...updatedActivities[0], status: 'IN_PROGRESS', started_at: nowIso };
      setActivities(updatedActivities);
      saveActivitiesApi(session.id, updatedActivities);
    }

    await updateSessionApi(session.id, { status: 'RUNNING', started_at: updated.started_at });
    await addSessionEventApi(session.id, { eventType: 'SESSION_STARTED', details: 'Tiết học bắt đầu' });
    if (soundEnabled) soundEffects.playBoost();
  };

  // 2. Tạm dừng tiết học
  const handlePauseSession = async () => {
    const nowIso = new Date().toISOString();
    setSession(prev => ({ ...prev, status: 'PAUSED', paused_at: nowIso }));
    await updateSessionApi(session.id, { status: 'PAUSED', paused_at: nowIso });
    await addSessionEventApi(session.id, { eventType: 'SESSION_PAUSED', details: 'Giáo viên tạm dừng tiết học' });
    if (soundEnabled) soundEffects.playTick();
  };

  // 3. Tiếp tục tiết học
  const handleResumeSession = async () => {
    const nowMs = Date.now();
    let additionalPausedSec = 0;
    if (session.paused_at) {
      additionalPausedSec = Math.floor((nowMs - new Date(session.paused_at).getTime()) / 1000);
    }
    const newTotalPaused = (session.total_paused_seconds || 0) + Math.max(0, additionalPausedSec);

    const updated = {
      ...session,
      status: 'RUNNING',
      paused_at: null,
      total_paused_seconds: newTotalPaused
    };
    setSession(updated);

    await updateSessionApi(session.id, {
      status: 'RUNNING',
      paused_at: null,
      total_paused_seconds: newTotalPaused
    });
    await addSessionEventApi(session.id, { eventType: 'SESSION_RESUMED', details: 'Tiết học tiếp tục' });
    if (soundEnabled) soundEffects.playBoost();
  };

  // 4. Kết thúc tiết học
  const handleRequestEndSession = () => {
    setIsConfirmingEnd(true);
    setIsSummaryModalOpen(true);
  };

  const handleConfirmEndSession = async () => {
    const nowIso = new Date().toISOString();
    const updated = {
      ...session,
      status: 'COMPLETED',
      ended_at: nowIso
    };
    setSession(updated);
    setIsConfirmingEnd(false);

    await updateSessionApi(session.id, { status: 'COMPLETED', ended_at: nowIso });
    await addSessionEventApi(session.id, { eventType: 'SESSION_COMPLETED', details: 'Kết thúc tiết học thành công' });
    setStoredActiveSessionId(null);
  };

  // 5. Chuyển hoạt động tiếp theo
  const handleNextActivity = async () => {
    if (currentActivityIndex >= activities.length - 1) return;

    const nextIdx = currentActivityIndex + 1;
    const nowIso = new Date().toISOString();

    const updated = activities.map((act, idx) => {
      if (idx === currentActivityIndex) {
        return { ...act, status: 'COMPLETED', completed_at: nowIso };
      }
      if (idx === nextIdx) {
        return { ...act, status: 'IN_PROGRESS', started_at: nowIso };
      }
      return act;
    });

    setActivities(updated);
    setCurrentActivityIndex(nextIdx);
    const nextActSec = (updated[nextIdx]?.duration_minutes || updated[nextIdx]?.durationMinutes || 5) * 60;
    setActivityRemainingSec(nextActSec);
    await saveActivitiesApi(session.id, updated);
    await addSessionEventApi(session.id, {
      eventType: 'ACTIVITY_STARTED',
      activityId: updated[nextIdx]?.id,
      details: `Chuyển sang hoạt động: ${updated[nextIdx]?.title}`
    });

    if (soundEnabled) soundEffects.playStarDing();
  };

  // 6. Quay lại hoạt động trước
  const handlePrevActivity = () => {
    if (currentActivityIndex <= 0) return;
    const prevIdx = currentActivityIndex - 1;
    setCurrentActivityIndex(prevIdx);
    const prevActSec = (activities[prevIdx]?.duration_minutes || activities[prevIdx]?.durationMinutes || 5) * 60;
    setActivityRemainingSec(prevActSec);
  };

  // 7. Chọn hoạt động bất kỳ từ danh sách flow
  const handleSelectActivity = async (index) => {
    setCurrentActivityIndex(index);
    const target = activities[index];
    const targetSec = (target?.duration_minutes || target?.durationMinutes || 5) * 60;
    setActivityRemainingSec(targetSec);
    if (target && target.status === 'PENDING') {
      const nowIso = new Date().toISOString();
      const updated = activities.map((act, idx) => {
        if (idx === index) {
          return { ...act, status: 'IN_PROGRESS', started_at: nowIso };
        }
        return act;
      });
      setActivities(updated);
      await saveActivitiesApi(session.id, updated);
    }
  };

  // 8. Cập nhật danh sách activities
  const handleUpdateActivities = async (newActivities) => {
    setActivities(newActivities);
    await saveActivitiesApi(session.id, newActivities);
  };

  // 9. Điều chỉnh thời gian hoạt động (+30s, +1p, Reset)
  const handleAdjustActivityTime = (secDelta) => {
    setActivityRemainingSec(prev => prev + secDelta);
    setSessionRemainingSec(prev => prev + secDelta);
    if (soundEnabled) soundEffects.playTick();
  };

  const handleResetActivityTimer = () => {
    const actSec = (currentActivity?.duration_minutes || currentActivity?.durationMinutes || 5) * 60;
    setActivityRemainingSec(actSec);
    if (soundEnabled) soundEffects.playTick();
  };

  // 10. Ghi nhận học sinh tham gia & cộng Sao thi đua
  const handleAwardStudent = async (studentId, badgeType, starsDelta, note) => {
    const students = currentClass?.students || [];
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) return;

    // a. Cập nhật học sinh trong state toàn cục App.jsx
    if (starsDelta !== 0) {
      const newStars = Math.max(0, (targetStudent.stars || 0) + starsDelta);
      const updatedStudents = students.map(s => s.id === studentId ? { ...s, stars: newStars } : s);
      onUpdateStudents(updatedStudents);

      // Phát âm thanh
      if (soundEnabled) {
        if (starsDelta > 0) soundEffects.playStarDing();
        else soundEffects.playBuzzer();
      }

      // Ghi nhận vào sổ điểm tốt goodScores của lớp
      if (onUpdateGoodScores) {
        const gsRecord = {
          id: `gs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          studentId: targetStudent.id,
          studentName: targetStudent.name,
          date: session.session_date || new Date().toISOString().slice(0, 10),
          type: starsDelta >= 0 ? 'positive' : 'negative',
          category: 'Tiết học',
          title: note || `Tham gia tiết học: ${session.lesson_title}`,
          points: Math.abs(starsDelta),
          scoreChange: starsDelta,
          note: `Ghi nhận tại Tiết học: ${session.lesson_title}`
        };
        const prevGoodScores = currentClass?.goodScores || [];
        onUpdateGoodScores([gsRecord, ...prevGoodScores]);
      }
    } else {
      // Nếu không đổi sao (chỉ ghi nhận phát biểu)
      if (soundEnabled) soundEffects.playTick();
    }

    // b. Ghi nhận bản ghi tham gia vào SQLite & State session
    const partRecord = {
      id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      session_id: session.id,
      student_id: studentId,
      student_name: targetStudent.name,
      activity_id: currentActivity?.id || null,
      badge_type: badgeType,
      stars_awarded: starsDelta,
      note: note || '',
      created_at: new Date().toISOString()
    };

    setParticipationRecords(prev => [partRecord, ...prev]);
    await addStudentParticipationApi(session.id, partRecord);

    // c. Ghi log sự kiện
    await addSessionEventApi(session.id, {
      eventType: starsDelta > 0 ? 'STAR_AWARDED' : 'STUDENT_PARTICIPATED',
      activityId: currentActivity?.id || null,
      studentId: studentId,
      details: note || `${targetStudent.name} nhận huy hiệu ${badgeType}`
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5.5rem' }}>
      {/* 1. Header Thông tin Session */}
      <SessionHeader
        session={session}
        currentClass={currentClass}
        onBackToList={onBackToList}
        participationRecords={participationRecords}
        onLaunchPresentation={handleLaunchPresentation}
      />

      {/* 2. Đồng hồ đếm ngược Master & Hoạt động */}
      <SessionTimerDisplay
        sessionDurationSec={sessionTotalSec}
        sessionRemainingSec={sessionRemainingSec}
        currentActivity={currentActivity}
        activityRemainingSec={activityRemainingSec}
        isRunning={isRunning}
        isPaused={isPaused}
        soundEnabled={soundEnabled}
        onAdjustTime={handleAdjustActivityTime}
        onResetActivityTimer={handleResetActivityTimer}
        onTogglePlayPause={isRunning ? handlePauseSession : handleResumeSession}
      />

      {/* 3. Khu vực chính 2 cột: Cột trái Lesson Flow • Cột phải Bảng học sinh tương tác */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 1fr) minmax(400px, 1.35fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Cột trái: Tiến trình bài học (Lesson Flow) */}
        <LessonFlowList
          activities={activities}
          currentActivityIndex={currentActivityIndex}
          onSelectActivity={handleSelectActivity}
          onUpdateActivities={handleUpdateActivities}
          isSessionRunning={isRunning}
        />

        {/* Cột phải: Bảng tương tác học sinh & cộng sao */}
        <StudentParticipationGrid
          students={currentClass?.students || []}
          currentActivity={currentActivity}
          participationRecords={participationRecords}
          onAwardStudent={handleAwardStudent}
        />
      </div>

      {/* 4. Thanh Điều Khiển Cố Định Chân Trang (Control Bar) */}
      <SessionControlBar
        status={session.status}
        onStartSession={handleStartSession}
        onPauseSession={handlePauseSession}
        onResumeSession={handleResumeSession}
        onEndSession={handleRequestEndSession}
        onPrevActivity={handlePrevActivity}
        onNextActivity={handleNextActivity}
        canPrev={currentActivityIndex > 0}
        canNext={currentActivityIndex < activities.length - 1}
        currentActivityTitle={currentActivity?.title || 'Chưa chọn'}
        onOpenQuickTool={(toolKey) => {
          if (toolKey === 'quiz') {
            setIsQuizCreatorOpen(true);
          } else {
            setQuickToolType(toolKey);
          }
        }}
        onQuickAddMinutes={(mins) => handleAdjustActivityTime(mins * 60)}
        onLaunchPresentation={handleLaunchPresentation}
      />

      {/* 5. Modal Tiện Ích Nhanh (Lucky Wheel, Duck Race) */}
      <QuickToolModal
        toolType={quickToolType}
        onClose={() => setQuickToolType(null)}
        currentClass={currentClass}
        onUpdateStudents={onUpdateStudents}
        soundEnabled={soundEnabled}
      />

      {/* 6. Modal Tổng Kết Tiết Học */}
      <SessionSummaryModal
        isOpen={isSummaryModalOpen}
        isConfirmingEnd={isConfirmingEnd}
        onCancelEnd={() => {
          setIsConfirmingEnd(false);
          setIsSummaryModalOpen(false);
        }}
        onConfirmEnd={handleConfirmEndSession}
        onClose={() => {
          setIsSummaryModalOpen(false);
          onBackToList();
        }}
        session={session}
        currentClass={currentClass}
        activities={activities}
        participationRecords={participationRecords}
        soundEnabled={soundEnabled}
      />

      {/* 7. Màn Hình Trình Chiếu Toàn Màn Hình Tích Hợp Tiết Học */}
      {isPresentationOpen && presentationLesson && (
        <PresentationView
          lesson={presentationLesson}
          initialSlideIndex={0}
          onClose={() => setIsPresentationOpen(false)}
          currentClass={currentClass}
          onUpdateStudents={onUpdateStudents}
          onUpdateGoodScores={onUpdateGoodScores}
          sessionTimerRemainingSec={sessionRemainingSec}
          soundEnabled={soundEnabled}
        />
      )}

      {/* 8. Phân Hệ Quick Quiz Tích Hợp Trực Tiếp Trong Tiết Học */}
      <CreateQuizModal
        isOpen={isQuizCreatorOpen}
        onClose={() => setIsQuizCreatorOpen(false)}
        onStartQuiz={(qSession) => {
          setIsQuizCreatorOpen(false);
          setActiveQuizSession(qSession);
        }}
        currentClass={currentClass}
        sessionId={session.id}
      />

      {activeQuizSession && (
        <QuizPlayer
          quizSession={activeQuizSession}
          students={currentClass?.students || []}
          onClose={() => setActiveQuizSession(null)}
          onCompleteQuiz={async (summaryPayload) => {
            setActiveQuizSession(null);
            setQuizSummary(summaryPayload);
            setIsQuizResultOpen(true);

            try {
              await addSessionEventApi(session.id, {
                type: 'QUIZ_COMPLETED',
                description: `Hoàn thành Quick Quiz: ${summaryPayload.title} (${summaryPayload.total_questions} câu, Độ chính xác: ${summaryPayload.average_accuracy}%, +${summaryPayload.total_stars_awarded}⭐)`
              });
            } catch (err) {
              console.error('Lỗi ghi nhận sự kiện quiz vào session:', err);
            }
          }}
          onAwardStars={(starsMap) => {
            if (onUpdateStudents && currentClass?.students) {
              const updated = currentClass.students.map(s => {
                const add = starsMap[s.id] || 0;
                return add > 0 ? { ...s, stars: (s.stars || 0) + add } : s;
              });
              onUpdateStudents(updated);
            }
          }}
        />
      )}

      <QuizResultModal
        isOpen={isQuizResultOpen}
        onClose={() => {
          setIsQuizResultOpen(false);
          setQuizSummary(null);
        }}
        summaryData={quizSummary}
      />
    </div>
  );
}
