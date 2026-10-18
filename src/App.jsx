import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import DialogService from './services/DialogService';
import { onPresentationNavigate } from './services/PresentationWindowService';
import StorageService from './services/StorageService';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ClassContextBar from './components/ClassContextBar';
import ClassroomTimer from './components/ClassroomTimer';
import HomeDashboard from './components/HomeDashboard';
import NewSchoolYearDetectedModal from './components/NewSchoolYearDetectedModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ClassStarContext } from './components/ClassStars/ClassStarContext';
import useStudentUpdates from './hooks/useStudentUpdates';
import useClassDataSync from './hooks/useClassDataSync';
import DataSyncStatus from './components/DataSyncStatus';
import useTimetableSync from './hooks/useTimetableSync';
import {DRAFT_OPEN,requestedDraft} from './services/sharedDrafts';

// Part F (Giai đoạn 1B) — Code splitting: các tab NẶNG tải theo yêu cầu (React.lazy).
// Vỏ ứng dụng (Navbar/Sidebar/HomeDashboard/ClassroomTimer/modal năm học) giữ eager
// để hiện NGAY. Chỉ tách các manager lớn thành chunk riêng → giảm bundle khởi động.
// Mỗi component đích đều là `export default` (đã kiểm chứng) nên lazy() dùng trực tiếp.
const Gradebook = lazy(() => import('./components/Gradebook'));
const DuckRace = lazy(() => import('./components/DuckRace'));
const ClassroomActivities = lazy(() => import('./components/ClassroomActivities/ClassroomActivities'));
const LuckyWheel = lazy(() => import('./components/LuckyWheel'));
const SeatingChart = lazy(() => import('./components/SeatingChart'));
const RewardShop = lazy(() => import('./components/RewardShop'));
const GoodScoresBoard = lazy(() => import('./components/GoodScoresBoard'));
const SessionManager = lazy(() => import('./components/ClassroomSession/SessionManager'));
const LessonManager = lazy(() => import('./components/LessonPresentation/LessonManager'));
const QuickQuizManager = lazy(() => import('./components/QuickQuiz/QuickQuizManager'));
import { getActiveOngoingSession } from './components/ClassroomSession/sessionStorage';
import { 
  saveClasses, 
  getCurrentClassId, 
  setCurrentClassId,
  fetchClassesFromSqlite,
  fetchStudentStatisticsFromSqlite,
  fetchSchoolYearsFromSqlite,
  setCurrentSchoolYearToSqlite,
  syncClassToSqlite,
  deleteClassFromSqlite,
  syncStudentsToSqlite,
  fetchAcademicYearSettings,
  checkNewSchoolYearFromSqlite,
  transitionSchoolYearInSqlite,
  detectGradeFromName,
  fetchTeacherProfileFromSqlite
} from './utils/storage';
import { setActiveTeacherInfo } from './utils/timetable';

export default function App() {
  useTimetableSync();
  const [classes, setClasses] = useState([]);
  const [saveError, setSaveError] = useState('');
  const { persistStudents, writeStatus, isBlocked, getRevision, discardUnsaved, trackMetadata } = useStudentUpdates(classes, setClasses, setSaveError);
  const [currentClassId, setClassId] = useState(() => getCurrentClassId());
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const ongoing = getActiveOngoingSession();
      if (ongoing && (ongoing.status === 'RUNNING' || ongoing.status === 'PAUSED')) {
        return 'sessions';
      }
    } catch {}
    return 'home';
  });
  useEffect(()=>{
    const resume=()=>{const request=requestedDraft();if(!request||request.scope==='timetable-editor')return;setActiveTab(/^(question-form|ai-questions):/.test(request.scope)?'quiz':'sessions');};
    resume();window.addEventListener(DRAFT_OPEN,resume);return()=>window.removeEventListener(DRAFT_OPEN,resume);
  },[]);
  const [ongoingSession, setOngoingSession] = useState(() => getActiveOngoingSession());
  useEffect(() => onPresentationNavigate(setActiveTab), []);
  const [isProjector, setIsProjector] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentSchoolYear, setCurrentSchoolYear] = useState('2026 - 2027');
  const [syncReady, setSyncReady] = useState(false);
  const { status: syncStatus, refresh: refreshClasses } = useClassDataSync({ classes, schoolYear: currentSchoolYear, enabled: syncReady, setClasses, setClassId, isBlocked, getRevision, discardUnsaved });
  const dbStatus = { connected: syncStatus.connected, dbFile: 'edumaster.sqlite' };
  const [availableSchoolYears, setAvailableSchoolYears] = useState(['2025 - 2026', '2026 - 2027']);
  const [academicYearSettings, setAcademicYearSettings] = useState({ startMonth: 9, startDay: 5 });
  const [newYearInfo, setNewYearInfo] = useState(null);
  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [studentStats, setStudentStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [autoOpenSessionForClassId, setAutoOpenSessionForClassId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return StorageService.get('eduict_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      StorageService.set('eduict_sidebar_collapsed', sidebarCollapsed);
    } catch {}
  }, [sidebarCollapsed]);

  // Kiểm tra định kỳ xem có tiết học nào đang diễn ra không (để hiển thị Banner và cập nhật icon)
  useEffect(() => {
    const checkOngoing = () => {
      const active = getActiveOngoingSession();
      setOngoingSession(active || null);
    };
    checkOngoing();
    const interval = setInterval(checkOngoing, 2500);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Xử lý khi nhấp vào lớp trong Thời khóa biểu: tự động chọn lớp & mở chuẩn bị tiết học
  const handleSelectClassFromTimetable = (targetClassName, targetGrade) => {
    if (!targetClassName || !classes || classes.length === 0) return;
    const clean = targetClassName.trim().toLowerCase();
    let found = classes.find(c => {
      const cName = (c.name || '').trim().toLowerCase();
      return cName === clean || cName === `lớp ${clean}` || `lớp ${cName}` === clean;
    });
    if (!found && targetGrade) {
      found = classes.find(c => (c.grade || detectGradeFromName(c.name)) === targetGrade);
    }
    const targetId = found ? found.id : classes[0].id;
    setClassId(targetId);
    setCurrentClassId(targetId);
    setAutoOpenSessionForClassId(targetId);
    setActiveTab('sessions');
  };

  // Làm mới thống kê số lượng học sinh & lớp theo khối và toàn trường trực tiếp từ SQLite
  const loadStudentStats = useCallback(async (schoolYear) => {
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      const stats = await fetchStudentStatisticsFromSqlite(schoolYear);
      if (stats) {
        setStudentStats(stats);
      }
    } catch (err) {
      console.warn('Lỗi khi tải thống kê học sinh:', err);
      setStatsError(err.message || 'Không thể tải thống kê');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);
  const refreshStudentStats = useCallback((schoolYear = null) =>
    loadStudentStats(schoolYear || currentSchoolYear), [loadStudentStats, currentSchoolYear]);

  // Tải dữ liệu từ cơ sở dữ liệu file SQLite khi ứng dụng khởi động
  useEffect(() => {
    async function initSqliteData() {
      try {
        const yearsInfo = await fetchSchoolYearsFromSqlite();
        const activeYear = yearsInfo?.currentYear || '2026 - 2027';
        if (yearsInfo?.availableYears && Array.isArray(yearsInfo.availableYears)) {
          setAvailableSchoolYears(yearsInfo.availableYears);
        }
        setCurrentSchoolYear(activeYear);

        // The sync hook also accepts an empty collection and reports failures.
        setSyncReady(true);
        await loadStudentStats(activeYear);

        // GIAI ĐOẠN 3 — Nạp hồ sơ giáo viên & thời khóa biểu đã lưu (nếu có),
        // ghi đè giá trị mặc định trong module timetable để theo dõi thời gian thực
        // và modal TKB phản ánh đúng dữ liệu đã lưu.
        try {
          const savedTeacher = await fetchTeacherProfileFromSqlite();
          if (savedTeacher) setActiveTeacherInfo(savedTeacher);
        } catch (e) {
          console.warn('Could not load teacher/timetable from SQLite:', e);
        }

        // Nạp cài đặt ngày bắt đầu năm học (Mặc định 05/09)
        const settingsRes = await fetchAcademicYearSettings();
        if (settingsRes?.settings) {
          setAcademicYearSettings(settingsRes.settings);
        }

        // Tự động kiểm tra phát hiện năm học mới (Section VI & IX)
        const newYearCheck = await checkNewSchoolYearFromSqlite();
        if (newYearCheck?.isNewYearDetected) {
          setNewYearInfo(newYearCheck);
          setShowNewYearModal(true);
        }
      } catch (e) {
        console.warn('Could not connect to SQLite backend:', e);
      } finally {
        setSyncReady(true);
      }
    }
    initSqliteData();
  }, [loadStudentStats]);

  // Xử lý khi lưu cài đặt ngày bắt đầu năm học
  const handleSaveAcademicYearSettings = async (newSettings, newCurrentYear) => {
    setAcademicYearSettings(newSettings);
    if (newCurrentYear && newCurrentYear !== currentSchoolYear) {
      handleSelectSchoolYear(newCurrentYear);
    }
    const check = await checkNewSchoolYearFromSqlite();
    if (check?.isNewYearDetected) {
      setNewYearInfo(check);
      setShowNewYearModal(true);
    }
  };

  // Lưu lớp học khi state thay đổi vào localStorage
  useEffect(() => {
    saveClasses(classes);
  }, [classes]);

  // Cập nhật lớp học hiện tại
  useEffect(() => {
    setCurrentClassId(currentClassId);
  }, [currentClassId]);

  // Tự động cuộn lên đầu trang khi chuyển tab
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Gán data-projector vào thẻ html để bật chế độ máy chiếu
  useEffect(() => {
    if (isProjector) {
      document.documentElement.setAttribute('data-projector', 'true');
    } else {
      document.documentElement.removeAttribute('data-projector');
    }
  }, [isProjector]);

  const currentClass = classes.find(c => c.id === currentClassId) || classes[0];
  const selectClass = useCallback(id => { setClassId(id); setCurrentClassId(id); }, []);
  const enterTeaching = () => {
    if (ongoingSession) {
      const id = ongoingSession.class_id || ongoingSession.classId;
      if (classes.some(c => c.id === id)) selectClass(id);
    } else if (currentClass) setAutoOpenSessionForClassId(currentClass.id);
    setActiveTab('sessions');
  };

  const handleClassStarsApplied = result => {
    const balances = new Map(result.balances.map(item => [String(item.studentId), item.newBalance]));
    // The batch API already persisted everything. Do not re-save a stale roster.
    setClasses(previous => previous.map(c => String(c.id) === result.classId ? {
      ...c,
      students: (c.students || []).map(s => balances.has(String(s.id)) ? { ...s, stars: balances.get(String(s.id)) } : s),
      goodScores: result.goodScores,
    } : c));
    refreshStudentStats();
  };

  // Cập nhật danh sách học sinh của lớp (đồng bộ cả LocalStorage và SQLite, hỗ trợ targetClassId cho Tiết dạy)
  const handleUpdateStudents = async (updatedStudents, targetClassId = null) => {
    const classIdToUpdate = targetClassId || currentClass?.id;
    if (!classIdToUpdate) return;
    const saved = await persistStudents(classIdToUpdate, updatedStudents);
    if (!saved) return false;
    refreshStudentStats();
    return true;
  };

  // Cập nhật sổ điểm tốt của lớp (đồng bộ cả LocalStorage và SQLite, hỗ trợ targetClassId cho Tiết dạy)
  const handleUpdateGoodScores = (updatedGoodScores, targetClassId = null) => {
    const classIdToUpdate = targetClassId || currentClass?.id;
    if (!classIdToUpdate) return;
    const safeScores = Array.isArray(updatedGoodScores) ? updatedGoodScores : [];
    setClasses(prevClasses => {
      const nextClasses = prevClasses.map(c => {
        if (c.id === classIdToUpdate) {
          return { ...c, goodScores: safeScores };
        }
        return c;
      });
      saveClasses(nextClasses);
      return nextClasses;
    });
    const targetClass = classes.find(c => c.id === classIdToUpdate) || currentClass;
    if (targetClass) {
      // The star ledger already saved the new balance. A merit-only update must
      // not send the stale roster captured before awarding stars.
      const { students: _students, ...classMetadata } = targetClass;
      void trackMetadata(classIdToUpdate, () => syncClassToSqlite({ ...classMetadata, goodScores: safeScores })).catch(error => setSaveError(`Chưa lưu sổ điểm tốt: ${error.message}`));
    }
  };

  // Thêm lớp mới (lưu vào state và ghi vào file SQLite)
  const handleAddClass = async (newClassData) => {
    const gradeNum = newClassData.grade || 3;
    const newClass = {
      id: `class_${Date.now()}`,
      name: newClassData.name,
      grade: gradeNum,
      subject: newClassData.subject || `Tin Học ${gradeNum}`,
      schoolYear: newClassData.schoolYear || currentSchoolYear || '2026 - 2027',
      students: []
    };
    try {
      await syncClassToSqlite(newClass);
      const fresh = await fetchClassesFromSqlite(currentSchoolYear);
      if (fresh) setClasses(fresh);
      setClassId(newClass.id);
    } catch (error) { setSaveError(`Chưa tạo được lớp: ${error.message}`); return; }
    refreshStudentStats(currentSchoolYear);
  };

  // Chuyển đổi xem năm học khác
  const handleSelectSchoolYear = async (year) => {
    if (!year || year === currentSchoolYear) return;
    if (writeStatus.pending > 0 || writeStatus.unsaved) {
      setSaveError('Hãy lưu xong thay đổi hoặc làm mới dữ liệu trước khi đổi năm học.');
      return;
    }
    try {
      if (!await setCurrentSchoolYearToSqlite(year)) throw new Error('Không lưu được năm học đang chọn.');
      const yearClasses = await fetchClassesFromSqlite(year, { strict: true });
      setCurrentSchoolYear(year);
      setClasses(yearClasses);
      saveClasses(yearClasses);
      // Requirement Section 20 - Test 5: Reset lớp đang chọn nếu không tồn tại trong năm mới
      const classExists = yearClasses.some(c => c.id === currentClassId);
      if (!classExists) {
        const nextId = yearClasses[0]?.id || '';
        setClassId(nextId);
        setCurrentClassId(nextId);
      }
      await refreshStudentStats(year);
    } catch (error) { setSaveError(`Chưa đổi được năm học: ${error.message}`); }
  };

  // Xử lý khi chuyển năm học thành công
  const handleTransitionSuccess = async (toYear, _result) => {
    setCurrentSchoolYear(toYear);
    const yearsInfo = await fetchSchoolYearsFromSqlite();
    if (yearsInfo?.availableYears && Array.isArray(yearsInfo.availableYears)) {
      setAvailableSchoolYears(yearsInfo.availableYears);
    }
    const newClasses = await fetchClassesFromSqlite(toYear);
    if (newClasses && Array.isArray(newClasses)) {
      setClasses(newClasses);
      saveClasses(newClasses);
      setClassId(newClasses[0]?.id || '');
      setCurrentClassId(newClasses[0]?.id || '');
    }
    await refreshStudentStats(toYear);
  };

  // Phục hồi dữ liệu các lớp (đồng bộ toàn bộ lên SQLite)
  const handleRestoreClasses = async (newClasses) => {
    try {
      const baseline = await fetchClassesFromSqlite('all');
      if (!baseline) throw new Error('Không nạp được dữ liệu gốc để phục hồi an toàn.');
      for (const c of newClasses) {
        await syncClassToSqlite(c);
        const current = (await fetchClassesFromSqlite('all'))?.find(item => item.id === c.id);
        if (!current) throw new Error('Không nạp được lớp vừa lưu.');
        await syncStudentsToSqlite(c.id, c.students || [], current.studentsVersion);
      }
      const fresh = await fetchClassesFromSqlite(currentSchoolYear);
      if (fresh) setClasses(fresh);
    } catch (error) { setSaveError(`Chưa phục hồi đủ dữ liệu: ${error.message}`); return; }
    if (newClasses && newClasses.length > 0) {
      setClassId(newClasses[0].id);
      setCurrentClassId(newClasses[0].id);
    }
    refreshStudentStats(currentSchoolYear);
  };

  // Xóa lớp học (xóa trong state và trong file SQLite)
  const handleDeleteClass = async (classIdToDelete) => {
    if (classes.length <= 1) {
      alert('⚠️ Không thể xóa: Hệ thống cần tối thiểu 1 lớp học để hoạt động!');
      return;
    }
    const target = classes.find(c => c.id === classIdToDelete);
    if (!target) return;

    const confirmed = DialogService.confirm(
      `Thầy/cô có chắc chắn muốn xóa lớp "${target.name}" (${target.students?.length || 0} học sinh)?\n\n` +
      `⚠️ CẢNH BÁO: Toàn bộ dữ liệu điểm số, điểm tốt / sao và sơ đồ phòng máy của lớp này sẽ bị xóa khỏi file SQLite!`
    );

    if (confirmed) {
      try { await deleteClassFromSqlite(classIdToDelete); }
      catch (error) { setSaveError(`Chưa xóa được lớp: ${error.message}`); return; }
      const remainingClasses = classes.filter(c => c.id !== classIdToDelete);
      setClasses(remainingClasses);
      saveClasses(remainingClasses);
      refreshStudentStats(currentSchoolYear);
      
      // Nếu xóa lớp đang chọn, chuyển sang lớp đầu tiên còn lại
      if (currentClassId === classIdToDelete) {
        const nextClassId = remainingClasses[0]?.id || '';
        setClassId(nextClassId);
        setCurrentClassId(nextClassId);
      }
    }
  };

  // Xử lý khi Batch Import từ Excel thành công (1 file nhiều sheet)
  const handleBatchImportSuccess = async (updatedClasses, targetClassId) => {
    if (updatedClasses && Array.isArray(updatedClasses) && updatedClasses.length > 0) {
      setClasses(updatedClasses);
      saveClasses(updatedClasses);
      if (targetClassId) {
        setClassId(targetClassId);
        setCurrentClassId(targetClassId);
      }
      await refreshStudentStats(currentSchoolYear);
    }
  };

  return (
    <ClassStarContext.Provider value={handleClassStarsApplied}>
    <div className="app-root-layout" style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-main)' }}>
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        currentClass={currentClass}
        hasOngoingSession={Boolean(ongoingSession)}
      />

      {/* Main Right Column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Navigation Header */}
        <Navbar
          classes={classes}
          currentClass={currentClass}
          studentStats={studentStats}
          isLoadingStats={isLoadingStats}
          statsError={statsError}
          onRefreshStats={refreshStudentStats}
          onSelectClass={selectClass}
          onAddClass={handleAddClass}
          onDeleteClass={handleDeleteClass}
          onRestoreClasses={handleRestoreClasses}
          onBatchImportSuccess={handleBatchImportSuccess}
          isProjector={isProjector}
          onToggleProjector={() => setIsProjector(prev => !prev)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(prev => !prev)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onSelectClassFromTimetable={handleSelectClassFromTimetable}
          currentSchoolYear={currentSchoolYear}
          availableSchoolYears={availableSchoolYears}
          academicYearSettings={academicYearSettings}
          onSaveAcademicYearSettings={handleSaveAcademicYearSettings}
          onSelectSchoolYear={handleSelectSchoolYear}
          onTransitionSuccess={handleTransitionSuccess}
          dbStatus={dbStatus}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          isSidebarCollapsed={sidebarCollapsed}
        />

        {/* Main Content Area */}
        <ErrorBoundary title="Đã xảy ra sự cố khi tải nội dung chức năng">
          <main className="app-container" style={{ flex: 1, paddingTop: '1.25rem', width: '100%' }}>
          <DataSyncStatus status={syncStatus} writeStatus={writeStatus} currentClass={currentClass} hasSession={Boolean(ongoingSession)}
            onRefresh={async () => {
              const discard = writeStatus.unsaved;
              if (discard && !await DialogService.confirmAsync('Tải lại dữ liệu đã lưu trên máy chủ? Các thay đổi chưa lưu ở cửa sổ này sẽ bị bỏ.')) return;
              if (await refreshClasses({ discard })) { setSaveError(''); await refreshStudentStats(); }
            }}
            onTeach={enterTeaching} />
          {syncStatus.connected && classes.length === 0 && <p role="status" className="empty-state">Chưa có lớp trong năm học {currentSchoolYear}. Bạn có thể thêm lớp hoặc chọn năm học khác.</p>}
          {saveError && <div role="alert" className="error-message" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <strong>{saveError}</strong><p>Kiểm tra kết nối và thực hiện lại. Khi có xung đột, dữ liệu mới nhất của lớp đã được nạp lại nếu kết nối còn hoạt động.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setSaveError('')}>Đã hiểu</button>
          </div>}
          {/* Thanh thông báo nổi bật khi đang có tiết học chưa kết thúc (hiển thị ở mọi tab ngoài tab sessions) */}
          {activeTab !== 'sessions' && ongoingSession && ongoingSession.status !== 'COMPLETED' && (
            <div style={{
              background: 'linear-gradient(90deg, #059669 0%, #0284c7 100%)',
              color: '#fff',
              padding: '0.85rem 1.35rem',
              borderRadius: 'var(--radius-lg, 12px)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              boxShadow: '0 6px 20px rgba(5, 150, 105, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  flexShrink: 0
                }}>
                  ⚡
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>TIẾT HỌC ĐANG DIỄN RA: <strong>{ongoingSession.lesson_title || 'Tin học'}</strong></span>
                    <span style={{
                      fontSize: '0.7rem',
                      background: 'rgba(255, 255, 255, 0.25)',
                      padding: '0.1rem 0.5rem',
                      borderRadius: '999px',
                      fontWeight: 700
                    }}>
                      Lớp {classes.find(c => c.id === (ongoingSession.class_id || ongoingSession.classId))?.name || 'Học sinh'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', opacity: 0.92, marginTop: '0.15rem' }}>
                    Tiết học chưa kết thúc và vẫn đang được lưu an toàn. Bấm để quay lại điều khiển ngay.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const sClassId = ongoingSession.class_id || ongoingSession.classId;
                  if (sClassId) {
                    setClassId(sClassId);
                    setCurrentClassId(sClassId);
                  }
                  setActiveTab('sessions');
                }}
                className="btn"
                style={{
                  background: '#fff',
                  color: '#059669',
                  fontWeight: 900,
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>▶ Tiếp Tục Tiết Học Ngay</span>
              </button>
            </div>
          )}

          {activeTab !== 'home' && (
            <ClassContextBar classes={classes} currentClass={currentClass} schoolYear={currentSchoolYear}
              onSelectClass={selectClass} />
          )}

          <Suspense fallback={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              padding: '4rem 1rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{
                width: 40,
                height: 40,
                border: '4px solid var(--surface-border, #e2e8f0)',
                borderTopColor: 'var(--primary, #0284c7)',
                borderRadius: '50%',
                animation: 'eduict-spin 0.8s linear infinite'
              }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Đang tải chức năng…</div>
              <style>{'@keyframes eduict-spin { to { transform: rotate(360deg); } }'}</style>
            </div>
          }>
          {activeTab === 'home' && (
            <HomeDashboard
              classes={classes}
              currentClass={currentClass}
              onSelectClass={selectClass}
              studentStats={studentStats}
              isLoadingStats={isLoadingStats}
              currentSchoolYear={currentSchoolYear}
              onSelectTab={setActiveTab}
              onEnterSession={enterTeaching}
              ongoingSession={ongoingSession}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionManager
              classes={classes}
              currentClass={currentClass}
              onSelectClass={selectClass}
              autoOpenClassId={autoOpenSessionForClassId}
              onClearAutoOpen={() => setAutoOpenSessionForClassId(null)}
              onUpdateStudents={handleUpdateStudents}
              onUpdateGoodScores={handleUpdateGoodScores}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'lessons' && (
            <LessonManager
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              onUpdateGoodScores={handleUpdateGoodScores}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'quiz' && (
            <QuickQuizManager
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
            />
          )}

          {activeTab === 'gradebook' && (
            <Gradebook
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'goodscores' && (
            <GoodScoresBoard
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              onUpdateGoodScores={handleUpdateGoodScores}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'duckrace' && (
            <DuckRace
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'activities' && <ClassroomActivities currentClass={currentClass} soundEnabled={soundEnabled} />}

          {activeTab === 'luckywheel' && (
            <LuckyWheel
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'seating' && (
            <SeatingChart
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              onUpdateGoodScores={handleUpdateGoodScores}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'rewards' && (
            <RewardShop
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'timer' && (
            <ClassroomTimer
              soundEnabled={soundEnabled}
            />
          )}
          </Suspense>
        </main>
      </ErrorBoundary>

      {/* Modal Thông Báo Khi Phát Hiện Năm Học Mới (Section IX) */}
      <NewSchoolYearDetectedModal
        isOpen={showNewYearModal}
        onClose={() => setShowNewYearModal(false)}
        newYear={newYearInfo?.currentSchoolYear}
        previousYear={newYearInfo?.previousYear}
        onConfirmTransition={async () => {
          setShowNewYearModal(false);
          if (newYearInfo?.previousYear && newYearInfo?.currentSchoolYear) {
            try {
              const res = await transitionSchoolYearInSqlite(newYearInfo.previousYear, newYearInfo.currentSchoolYear);
              handleTransitionSuccess(newYearInfo.currentSchoolYear, res);
            } catch (err) {
              alert(err.message || 'Chuyển năm học thất bại');
            }
          }
        }}
      />

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--surface-border)',
        background: 'var(--surface-card)',
        padding: '1rem 1.5rem',
        textAlign: 'center',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <strong>EduICT Primary</strong> • Trợ Giảng Số & Nền Tảng Giảng Dạy Tin Học Tiểu Học
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>💡 Mẹo: Nhấn <strong>F11</strong> trên bàn phím để mở toàn màn hình máy chiếu</span>
            <span>•</span>
            <span>Dữ liệu lưu an toàn trên máy tính cá nhân</span>
          </div>
        </div>
      </footer>
      </div>
    </div>
    </ClassStarContext.Provider>
  );
}
