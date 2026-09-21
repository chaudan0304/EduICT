import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Flag, Clock } from 'lucide-react';
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
import { 
  getSlotById, 
  getActiveTeachingSlot, 
  calculatePeriodRemainingSec, 
  getCurrentPeriodStatus, 
  formatTimeCountdown 
} from '../../utils/timetable';
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
  
  // Khung giờ tiết học theo Thời Khóa Biểu
  const [activeSlot, setActiveSlot] = useState(() => {
    if (initialSession.period_slot_id) {
      const found = getSlotById(initialSession.period_slot_id);
      if (found) return found;
    }
    return getActiveTeachingSlot(new Date());
  });

  // Chế độ đồng bộ theo TKB (Mặc định BẬT nếu có activeSlot hoặc session.sync_timetable_period)
  const [isTimetableSynced, setIsTimetableSynced] = useState(() => {
    if (initialSession.sync_timetable_period !== undefined) {
      return !!initialSession.sync_timetable_period;
    }
    const st = getCurrentPeriodStatus(new Date());
    return !!(st.slot && st.slot.period !== null && !st.slot.isRecess && !st.slot.isLunch);
  });

  // Số phút dạy thêm giờ (+5p, +10p...)
  const [extraMinutes, setExtraMinutes] = useState(0);

  // Timer States (tính theo giây)
  const initialPeriodCalc = (isTimetableSynced && activeSlot)
    ? calculatePeriodRemainingSec(activeSlot, new Date(), extraMinutes)
    : null;

  const fallbackSessionTotalSec = (session.duration_minutes || session.durationMinutes || 35) * 60;
  const sessionTotalSec = initialPeriodCalc ? initialPeriodCalc.totalSec : fallbackSessionTotalSec;

  const [sessionRemainingSec, setSessionRemainingSec] = useState(() => {
    if (initialPeriodCalc) {
      return initialPeriodCalc.remainingSec;
    }
    if (session.started_at) {
      const startMs = new Date(session.started_at).getTime();
      const pausedSec = session.total_paused_seconds || 0;
      let elapsed = 0;
      if (session.status === 'RUNNING') {
        const nowMs = Date.now();
        elapsed = Math.floor((nowMs - startMs) / 1000) - pausedSec;
      } else if (session.status === 'PAUSED' && session.paused_at) {
        const pauseMs = new Date(session.paused_at).getTime();
        elapsed = Math.floor((pauseMs - startMs) / 1000) - pausedSec;
      }
      return Math.max(0, fallbackSessionTotalSec - Math.max(0, elapsed));
    }
    return fallbackSessionTotalSec;
  });

  const currentActivity = activities[currentActivityIndex] || activities[0];
  const actDurationSec = (currentActivity?.duration_minutes || currentActivity?.durationMinutes || 5) * 60;
  const [activityRemainingSec, setActivityRemainingSec] = useState(actDurationSec);

  // Modal & Notification states
  const [quickToolType, setQuickToolType] = useState(null); // 'wheel' | 'duckrace' | 'quiz' | null
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [presentationLesson, setPresentationLesson] = useState(null);
  const [isQuizCreatorOpen, setIsQuizCreatorOpen] = useState(false);
  const [activeQuizSession, setActiveQuizSession] = useState(null);
  const [quizSummary, setQuizSummary] = useState(null);
  const [isQuizResultOpen, setIsQuizResultOpen] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const hasPlayedTimeUpBellRef = useRef(false);

  // Mở trình chiếu bài học ngay trong tiết học
  const handleLaunchPresentation = async () => {
    try {
      let lesson = null;
      // 1. Thử tải theo lesson_id đã gắn với session
      const directLessonId = session.lesson_id || session.lessonId;
      if (directLessonId) {
        lesson = await fetchLessonDetailApi(directLessonId);
      }

      // 2. Nếu chưa có lesson_id hoặc lesson_id không tìm thấy, tìm bài học trong Thư Viện khớp với tên bài của session
      const grade = currentClass?.grade || session.class_grade || 2;
      const available = await fetchLessonsApi({ grade });

      if (!lesson && available && available.length > 0) {
        const sessionTitle = (session.lesson_title || session.lessonTitle || '').trim().toLowerCase();

        // A. Khớp chính xác tiêu đề
        let found = available.find(l => (l.title || '').trim().toLowerCase() === sessionTitle);

        // B. Khớp theo số bài: "Bài 2", "Bài 1", ...
        if (!found) {
          const numMatch = sessionTitle.match(/(?:bài|bai|tiết)\s*(\d+)/i);
          if (numMatch) {
            const num = numMatch[1];
            found = available.find(l => {
              const lNumMatch = (l.title || '').match(/(?:bài|bai|tiết)\s*(\d+)/i);
              return lNumMatch && lNumMatch[1] === num;
            });
          }
        }

        // C. Khớp tương đối theo từ khóa tiêu đề (chứa lẫn nhau)
        if (!found) {
          found = available.find(l => 
            (l.title && sessionTitle.includes(l.title.toLowerCase())) ||
            (l.title && l.title.toLowerCase().includes(sessionTitle))
          );
        }

        if (found) {
          lesson = await fetchLessonDetailApi(found.id);
          // Tự động liên kết lesson_id vào session để lưu trữ đồng bộ
          if (session.id && found.id) {
            updateSessionApi(session.id, { lesson_id: found.id });
            setSession(prev => ({ ...prev, lesson_id: found.id }));
          }
        } else {
          // Fallback về bài đầu tiên nếu hoàn toàn không tìm thấy bài nào tương ứng
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

  // Đồng bộ Active Session ID vào localStorage (kể cả READY, RUNNING, PAUSED) để F5/tắt nhầm không mất
  useEffect(() => {
    if (session.status === 'RUNNING' || session.status === 'PAUSED' || session.status === 'READY') {
      setStoredActiveSessionId(session.id);
    } else if (session.status === 'COMPLETED') {
      setStoredActiveSessionId(null);
    }
  }, [session.id, session.status]);

  // Cảnh báo chống lỡ tay đóng tab / tắt trình duyệt khi tiết học chưa kết thúc
  useEffect(() => {
    const isOngoing = session.status === 'RUNNING' || session.status === 'PAUSED' || session.status === 'READY';
    if (!isOngoing) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Tiết học đang diễn ra! Thầy/cô có chắc chắn muốn rời khỏi không? Dữ liệu tiết học vẫn được lưu.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session.status]);

  // Master Timer Interval
  const isRunning = session.status === 'RUNNING';
  const isPaused = session.status === 'PAUSED';

  useEffect(() => {
    let timerId = null;
    if (isRunning) {
      timerId = setInterval(() => {
        if (isTimetableSynced && activeSlot) {
          const now = new Date();
          const calc = calculatePeriodRemainingSec(activeSlot, now, extraMinutes);
          if (calc) {
            setSessionRemainingSec(calc.remainingSec);
            if (calc.isTimeUp) {
              if (!hasPlayedTimeUpBellRef.current) {
                hasPlayedTimeUpBellRef.current = true;
                if (soundEnabled) {
                  soundEffects.playSchoolBell();
                }
                setShowTimeUpModal(true);
              }
            }
          }
        } else {
          setSessionRemainingSec(prev => Math.max(0, prev - 1));
        }

        setActivityRemainingSec(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isRunning, isTimetableSynced, activeSlot, extraMinutes, soundEnabled]);

  // Theo dõi khi Hết Giờ (sessionRemainingSec === 0): Phát chuông trường học & mở thông báo
  useEffect(() => {
    if (sessionRemainingSec === 0 && isRunning) {
      if (!hasPlayedTimeUpBellRef.current) {
        hasPlayedTimeUpBellRef.current = true;
        if (soundEnabled) {
          soundEffects.playSchoolBell();
        }
        setShowTimeUpModal(true);
      }
    }
  }, [sessionRemainingSec, isRunning, soundEnabled]);

  // 1. Bắt đầu tiết học
  const handleStartSession = async () => {
    const nowIso = new Date().toISOString();
    let currentSlot = activeSlot;
    let shouldSync = isTimetableSynced;

    if (!currentSlot) {
      currentSlot = getActiveTeachingSlot(new Date());
      if (currentSlot) {
        setActiveSlot(currentSlot);
        setIsTimetableSynced(true);
        shouldSync = true;
      }
    }

    const updated = {
      ...session,
      status: 'RUNNING',
      started_at: session.started_at || nowIso,
      period_slot_id: currentSlot ? currentSlot.id : session.period_slot_id,
      period_label: currentSlot ? currentSlot.label : session.period_label,
      period_end_time: currentSlot ? currentSlot.endTime : session.period_end_time,
      sync_timetable_period: shouldSync
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
    setShowTimeUpModal(false);
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

  // 4.1 Gia hạn thêm giờ khi hết thời gian (+5 phút, +10 phút)
  const handleExtendSessionTime = (extraMins = 5) => {
    const extraSec = extraMins * 60;
    setExtraMinutes(prev => prev + extraMins);
    setSessionRemainingSec(prev => prev + extraSec);
    setActivityRemainingSec(prev => prev + extraSec);
    setShowTimeUpModal(false);
    hasPlayedTimeUpBellRef.current = false;
    if (soundEnabled) soundEffects.playBoost();
  };

  // 4.1.1 Thử nghiệm chuông trường học & modal thông báo hết tiết
  const handleTestTimeUpAlert = () => {
    if (soundEnabled) {
      soundEffects.playSchoolBell();
    }
    setShowTimeUpModal(true);
  };

  // 4.2 Rời màn hình có xác nhận an toàn (bảo đảm không mất tiết học)
  const handleSafeBackToList = () => {
    const isOngoing = session.status === 'RUNNING' || session.status === 'PAUSED' || session.status === 'READY';
    if (isOngoing) {
      const confirmLeave = window.confirm(
        '⚠️ Tiết học đang diễn ra!\n\nThầy/Cô có muốn tạm rời màn hình này để xem danh sách hoặc chuyển sang chức năng khác?\n\n(Lưu ý: Tiết học vẫn được lưu an toàn và tiếp tục chạy trong nền. Thầy/Cô có thể quay lại bất cứ lúc nào qua nút "Tiếp Tục Tiết Học".)'
      );
      if (!confirmLeave) return;
    }
    onBackToList?.();
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
    const targetStudent = students.find(s => String(s.id) === String(studentId));
    if (!targetStudent) return;

    // a. Cập nhật học sinh trong state toàn cục App.jsx
    if (starsDelta !== 0) {
      const newStars = Math.max(0, (targetStudent.stars || 0) + starsDelta);
      const updatedStudents = students.map(s => String(s.id) === String(studentId) ? { ...s, stars: newStars } : s);
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
        onBackToList={handleSafeBackToList}
        participationRecords={participationRecords}
        onLaunchPresentation={handleLaunchPresentation}
        isTimetableSynced={isTimetableSynced}
        activeSlot={activeSlot}
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
        isTimetableSynced={isTimetableSynced}
        activeSlot={activeSlot}
        extraMinutes={extraMinutes}
        onToggleTimetableSync={() => setIsTimetableSynced(prev => !prev)}
        onExtendSessionTime={handleExtendSessionTime}
        onTestTimeUpAlert={handleTestTimeUpAlert}
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
        onUpdateStudents={async (updatedStudents) => {
          const prevMap = new Map((currentClass?.students || []).map(s => [String(s.id), s.stars || 0]));
          for (const s of updatedStudents) {
            const oldStars = prevMap.get(String(s.id)) || 0;
            const delta = (s.stars || 0) - oldStars;
            if (delta > 0) {
              const partRecord = {
                id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                session_id: session.id,
                student_id: s.id,
                student_name: s.name,
                activity_id: currentActivity?.id || null,
                badge_type: 'STAR',
                stars_awarded: delta,
                note: `Thưởng ${delta} ⭐ từ trò chơi ${quickToolType === 'wheel' ? 'Vòng quay' : 'Đua vịt'}`,
                created_at: new Date().toISOString()
              };
              setParticipationRecords(prev => [partRecord, ...prev]);
              addStudentParticipationApi(session.id, partRecord);
            }
          }
          onUpdateStudents(updatedStudents);
        }}
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
          onUpdateStudents={async (updatedStudents) => {
            const prevMap = new Map((currentClass?.students || []).map(s => [String(s.id), s.stars || 0]));
            for (const s of updatedStudents) {
              const oldStars = prevMap.get(String(s.id)) || 0;
              const delta = (s.stars || 0) - oldStars;
              if (delta > 0) {
                const partRecord = {
                  id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                  session_id: session.id,
                  student_id: s.id,
                  student_name: s.name,
                  activity_id: currentActivity?.id || null,
                  badge_type: 'STAR',
                  stars_awarded: delta,
                  note: `Thưởng ${delta} ⭐ từ bài học trình chiếu`,
                  created_at: new Date().toISOString()
                };
                setParticipationRecords(prev => [partRecord, ...prev]);
                addStudentParticipationApi(session.id, partRecord);
              }
            }
            onUpdateStudents(updatedStudents);
          }}
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
                const add = starsMap[s.id] || starsMap[String(s.id)] || 0;
                if (add > 0) {
                  const partRecord = {
                    id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    session_id: session.id,
                    student_id: s.id,
                    student_name: s.name,
                    activity_id: currentActivity?.id || null,
                    badge_type: 'STAR',
                    stars_awarded: add,
                    note: `Thưởng ${add} ⭐ từ Quick Quiz`,
                    created_at: new Date().toISOString()
                  };
                  setParticipationRecords(prev => [partRecord, ...prev]);
                  addStudentParticipationApi(session.id, partRecord);
                }
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

      {/* 9. Modal Thông Báo Khi Hết Giờ Tiết Học (Chuông reo) */}
      {showTimeUpModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--surface-card, #ffffff)',
            borderRadius: 'var(--radius-2xl, 1.25rem)',
            border: '2px solid #f59e0b',
            boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.4)',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header Modal */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                flexShrink: 0
              }}>
                🔔
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                  {isTimetableSynced && activeSlot ? `Đã Hết Giờ ${activeSlot.label || 'Tiết Học'}!` : 'Đã Hết Giờ Tiết Học!'}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.95 }}>
                  {isTimetableSynced && activeSlot 
                    ? `Chuông báo trường học đã reo (${activeSlot.startTime} - ${activeSlot.endTime}) • Lớp ${currentClass?.name || 'Học sinh'}`
                    : `Chuông báo đã vang lên • Lớp ${currentClass?.name || 'Học sinh'}`}
                </p>
              </div>
            </div>

            {/* Nội dung */}
            <div style={{ padding: '1.75rem' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-lg, 0.75rem)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                marginBottom: '1.25rem'
              }}>
                <Clock size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {isTimetableSynced && activeSlot ? (
                    <span>
                      Đã đến giờ kết thúc <strong>{activeSlot.label} ({activeSlot.startTime} - {activeSlot.endTime})</strong> theo đúng Thời Khóa Biểu. Bài học <strong>"{session.lesson_title || 'Tin học'}"</strong> đã hoàn thành thời gian giảng dạy. Thầy/Cô có thể hoàn tất tiết học để xem báo cáo khen thưởng hoặc gia hạn thêm giờ nếu cần!
                    </span>
                  ) : (
                    <span>
                      Thời gian phân bổ cho bài học <strong>"{session.lesson_title || 'Tin học'}"</strong> đã kết thúc. Thầy/Cô có thể hoàn tất tiết học để xem báo cáo khen thưởng hoặc gia hạn thêm giờ nếu chưa hoàn thành nội dung.
                    </span>
                  )}
                </div>
              </div>

              {/* Lựa chọn hành động */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleRequestEndSession}
                  className="btn btn-primary"
                  style={{
                    padding: '0.85rem 1.25rem',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem'
                  }}
                >
                  <Flag size={18} />
                  <span>Kết Thúc Tiết Học & Xem Tổng Kết</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handleExtendSessionTime(5)}
                    className="btn btn-outline"
                    style={{
                      padding: '0.75rem',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      borderColor: '#f59e0b',
                      color: '#d97706'
                    }}
                  >
                    <Clock size={16} />
                    <span>Dạy thêm +5 phút</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExtendSessionTime(10)}
                    className="btn btn-outline"
                    style={{
                      padding: '0.75rem',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Clock size={16} />
                    <span>Dạy thêm +10 phút</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
