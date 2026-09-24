import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Gradebook from './components/Gradebook';
import DuckRace from './components/DuckRace';
import LuckyWheel from './components/LuckyWheel';
import SeatingChart from './components/SeatingChart';
import RewardShop from './components/RewardShop';
import ClassroomTimer from './components/ClassroomTimer';
import GoodScoresBoard from './components/GoodScoresBoard';
import HomeDashboard from './components/HomeDashboard';
import NewSchoolYearDetectedModal from './components/NewSchoolYearDetectedModal';
import SessionManager from './components/ClassroomSession/SessionManager';
import LessonManager from './components/LessonPresentation/LessonManager';
import QuickQuizManager from './components/QuickQuiz/QuickQuizManager';
import ErrorBoundary from './components/ErrorBoundary';
import { getActiveOngoingSession } from './components/ClassroomSession/sessionStorage';
import { 
  getStoredClasses, 
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
  detectGradeFromName
} from './utils/storage';

export default function App() {
  const [classes, setClasses] = useState(() => getStoredClasses());
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
  const [ongoingSession, setOngoingSession] = useState(() => getActiveOngoingSession());
  const [isProjector, setIsProjector] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dbStatus, setDbStatus] = useState({ connected: false, dbFile: 'edumaster.sqlite' });
  const [currentSchoolYear, setCurrentSchoolYear] = useState('2026 - 2027');
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
      return localStorage.getItem('eduict_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('eduict_sidebar_collapsed', sidebarCollapsed);
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
  const refreshStudentStats = async (schoolYear = null) => {
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      const yearToFetch = schoolYear || currentSchoolYear;
      const stats = await fetchStudentStatisticsFromSqlite(yearToFetch);
      if (stats) {
        setStudentStats(stats);
      }
    } catch (err) {
      console.warn('Lỗi khi tải thống kê học sinh:', err);
      setStatsError(err.message || 'Không thể tải thống kê');
    } finally {
      setIsLoadingStats(false);
    }
  };

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

        const sqliteClasses = await fetchClassesFromSqlite(activeYear);
        if (sqliteClasses && Array.isArray(sqliteClasses) && sqliteClasses.length > 0) {
          setClasses(sqliteClasses);
          saveClasses(sqliteClasses);
          const hasCurrent = sqliteClasses.some(c => c.id === currentClassId);
          if (!hasCurrent && sqliteClasses[0]) {
            setClassId(sqliteClasses[0].id);
          }
          setDbStatus({ connected: true, dbFile: 'edumaster.sqlite' });
        } else {
          setDbStatus({ connected: true, dbFile: 'edumaster.sqlite' });
        }
        await refreshStudentStats(activeYear);

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
      }
    }
    initSqliteData();
  }, []);

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

  // Cập nhật danh sách học sinh của lớp (đồng bộ cả LocalStorage và SQLite, hỗ trợ targetClassId cho Tiết dạy)
  const handleUpdateStudents = async (updatedStudents, targetClassId = null) => {
    const classIdToUpdate = targetClassId || currentClass?.id;
    if (!classIdToUpdate) return;
    setClasses(prevClasses => {
      return prevClasses.map(c => {
        if (c.id === classIdToUpdate) {
          return { ...c, students: updatedStudents };
        }
        return c;
      });
    });
    await syncStudentsToSqlite(classIdToUpdate, updatedStudents);
    refreshStudentStats();
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
      syncClassToSqlite({ ...targetClass, goodScores: safeScores });
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
    setClasses(prev => [...prev, newClass]);
    setClassId(newClass.id);
    await syncClassToSqlite(newClass);
    refreshStudentStats(currentSchoolYear);
  };

  // Chuyển đổi xem năm học khác
  const handleSelectSchoolYear = async (year) => {
    if (!year || year === currentSchoolYear) return;
    setCurrentSchoolYear(year);
    await setCurrentSchoolYearToSqlite(year);

    const yearClasses = await fetchClassesFromSqlite(year);
    if (yearClasses && Array.isArray(yearClasses)) {
      setClasses(yearClasses);
      saveClasses(yearClasses);
      // Requirement Section 20 - Test 5: Reset lớp đang chọn nếu không tồn tại trong năm mới
      const classExists = yearClasses.some(c => c.id === currentClassId);
      if (!classExists) {
        const nextId = yearClasses[0]?.id || '';
        setClassId(nextId);
        setCurrentClassId(nextId);
      }
    }
    await refreshStudentStats(year);
  };

  // Xử lý khi chuyển năm học thành công
  const handleTransitionSuccess = async (toYear, _result) => {
    setCurrentSchoolYear(toYear);
    const yearsInfo = await fetchSchoolYearsFromSqlite();
    if (yearsInfo?.availableYears && Array.isArray(yearsInfo.availableYears)) {
      setAvailableSchoolYears(yearsInfo.availableYears);
    }
    const newClasses = await fetchClassesFromSqlite(toYear);
    if (newClasses && Array.isArray(newClasses) && newClasses.length > 0) {
      setClasses(newClasses);
      saveClasses(newClasses);
      if (newClasses[0]) {
        setClassId(newClasses[0].id);
        setCurrentClassId(newClasses[0].id);
      }
    }
    await refreshStudentStats(toYear);
  };

  // Phục hồi dữ liệu các lớp (đồng bộ toàn bộ lên SQLite)
  const handleRestoreClasses = async (newClasses) => {
    setClasses(newClasses);
    if (newClasses && newClasses.length > 0) {
      setClassId(newClasses[0].id);
      setCurrentClassId(newClasses[0].id);
    }
    for (const c of newClasses) {
      await syncClassToSqlite(c);
      if (c.students && c.students.length > 0) {
        await syncStudentsToSqlite(c.id, c.students);
      }
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

    const confirmed = window.confirm(
      `Thầy/cô có chắc chắn muốn xóa lớp "${target.name}" (${target.students?.length || 0} học sinh)?\n\n` +
      `⚠️ CẢNH BÁO: Toàn bộ dữ liệu điểm số, điểm tốt / sao và sơ đồ phòng máy của lớp này sẽ bị xóa khỏi file SQLite!`
    );

    if (confirmed) {
      const remainingClasses = classes.filter(c => c.id !== classIdToDelete);
      setClasses(remainingClasses);
      saveClasses(remainingClasses);
      await deleteClassFromSqlite(classIdToDelete);
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
          onRefreshStats={() => refreshStudentStats(currentSchoolYear)}
          onSelectClass={setClassId}
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

          {/* Section 13: Thanh thông tin & chuyển lớp khi ở các màn hình chức năng (không để trên Header) */}
          {activeTab !== 'home' && currentClass && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '0.65rem 1.15rem',
              marginBottom: '1.25rem',
              background: 'var(--surface-card, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--surface-border, #e2e8f0)',
              boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                  Năm học {currentSchoolYear || '2026 - 2027'}
                </span>
                <span style={{ color: 'var(--surface-border, #cbd5e1)' }}>•</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #1e293b)' }}>
                  Khối {currentClass.grade || detectGradeFromName(currentClass.name) || 3} › <span style={{ color: 'var(--primary, #0284c7)' }}>{currentClass.name}</span>
                </span>
                <span style={{
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.65rem',
                  background: 'rgba(2, 132, 199, 0.1)',
                  color: 'var(--primary, #0284c7)',
                  borderRadius: '999px',
                  fontWeight: 700
                }}>
                  👥 {currentClass.students?.length || 0} học sinh
                </span>
              </div>

              {classes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {/* MỤC CHỌN KHỐI (Hàng nút bấm nhanh K1 - K5 trực quan) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Khối:
                    </span>
                    <div style={{ display: 'inline-flex', gap: '0.2rem', background: 'var(--surface-secondary, #f1f5f9)', padding: '0.15rem', borderRadius: '8px', border: '1px solid var(--surface-border, #cbd5e1)' }}>
                      {[1, 2, 3, 4, 5].map(gNum => {
                        const curG = currentClass.grade || detectGradeFromName(currentClass.name) || 1;
                        const isAct = Number(curG) === gNum;
                        return (
                          <button
                            key={gNum}
                            type="button"
                            onClick={() => {
                              const targetClasses = classes.filter(c => (c.grade || detectGradeFromName(c.name)) === gNum);
                              if (targetClasses.length > 0) {
                                const currentInTarget = targetClasses.find(c => c.id === currentClassId);
                                const nextClassId = currentInTarget ? currentInTarget.id : targetClasses[0].id;
                                setClassId(nextClassId);
                                setCurrentClassId(nextClassId);
                              }
                            }}
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.775rem',
                              fontWeight: 800,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              background: isAct ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
                              color: isAct ? '#fff' : 'var(--text-main, #334155)',
                              boxShadow: isAct ? '0 1px 4px rgba(2, 132, 199, 0.3)' : 'none'
                            }}
                            title={`Chuyển sang Khối ${gNum}`}
                          >
                            K{gNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vạch phân cách giữa Khối và Lớp */}
                  <div style={{ width: 1, height: 20, background: 'var(--surface-border, #cbd5e1)', opacity: 0.8 }} />

                  {/* MỤC CHỌN LỚP */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label htmlFor="quick-class-switcher" style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Chọn lớp:
                    </label>
                    <select
                      id="quick-class-switcher"
                      value={currentClass.id}
                      onChange={(e) => {
                        setClassId(e.target.value);
                        setCurrentClassId(e.target.value);
                      }}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-main, #1e293b)',
                        background: 'var(--surface-secondary, #f8fafc)',
                        border: '1px solid var(--surface-border, #cbd5e1)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {(
                        classes.filter(c => (c.grade || detectGradeFromName(c.name)) === Number(currentClass.grade || detectGradeFromName(currentClass.name) || 1)).length > 0
                          ? classes.filter(c => (c.grade || detectGradeFromName(c.name)) === Number(currentClass.grade || detectGradeFromName(currentClass.name) || 1))
                          : classes
                      ).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.students?.length || 0} HS)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'home' && (
            <HomeDashboard
              classes={classes}
              currentClass={currentClass}
              onSelectClass={setClassId}
              studentStats={studentStats}
              isLoadingStats={isLoadingStats}
              currentSchoolYear={currentSchoolYear}
              onSelectTab={setActiveTab}
              ongoingSession={ongoingSession}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionManager
              classes={classes}
              currentClass={currentClass}
              onSelectClass={(newClassId) => {
                setClassId(newClassId);
                setCurrentClassId(newClassId);
              }}
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
  );
}
