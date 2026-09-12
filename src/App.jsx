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
import StarExchangeModal from './components/StarExchangeModal';
import SessionManager from './components/ClassroomSession/SessionManager';
import LessonManager from './components/LessonPresentation/LessonManager';
import QuickQuizManager from './components/QuickQuiz/QuickQuizManager';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  getStoredClasses, 
  saveClasses, 
  getCurrentClassId, 
  setCurrentClassId,
  fetchClassesFromSqlite,
  syncClassToSqlite,
  deleteClassFromSqlite,
  syncStudentsToSqlite
} from './utils/storage';

export default function App() {
  const [classes, setClasses] = useState(() => getStoredClasses());
  const [currentClassId, setClassId] = useState(() => getCurrentClassId());
  const [activeTab, setActiveTab] = useState('home');
  const [isProjector, setIsProjector] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [exchangeStudentId, setExchangeStudentId] = useState(null);
  const [dbStatus, setDbStatus] = useState({ connected: false, dbFile: 'edumaster.sqlite' });
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

  // Tải dữ liệu từ cơ sở dữ liệu file SQLite khi ứng dụng khởi động
  useEffect(() => {
    async function initSqliteData() {
      try {
        const sqliteClasses = await fetchClassesFromSqlite();
        if (sqliteClasses && Array.isArray(sqliteClasses) && sqliteClasses.length > 0) {
          setClasses(sqliteClasses);
          saveClasses(sqliteClasses);
          setDbStatus({ connected: true, dbFile: 'edumaster.sqlite' });
        } else {
          setDbStatus({ connected: true, dbFile: 'edumaster.sqlite' });
        }
      } catch (e) {
        console.warn('Could not connect to SQLite backend:', e);
      }
    }
    initSqliteData();
  }, []);

  const handleOpenExchangeModal = (studentId = null) => {
    setExchangeStudentId(studentId);
    setIsExchangeModalOpen(true);
  };

  // Lưu lớp học khi state thay đổi vào localStorage
  useEffect(() => {
    saveClasses(classes);
  }, [classes]);

  // Cập nhật lớp học hiện tại
  useEffect(() => {
    setCurrentClassId(currentClassId);
  }, [currentClassId]);

  // Gán data-projector vào thẻ html để bật chế độ máy chiếu
  useEffect(() => {
    if (isProjector) {
      document.documentElement.setAttribute('data-projector', 'true');
    } else {
      document.documentElement.removeAttribute('data-projector');
    }
  }, [isProjector]);

  const currentClass = classes.find(c => c.id === currentClassId) || classes[0];

  // Cập nhật danh sách học sinh của lớp hiện tại (đồng bộ cả LocalStorage và SQLite)
  const handleUpdateStudents = (updatedStudents) => {
    if (!currentClass) return;
    setClasses(prevClasses => {
      return prevClasses.map(c => {
        if (c.id === currentClass.id) {
          return { ...c, students: updatedStudents };
        }
        return c;
      });
    });
    syncStudentsToSqlite(currentClass.id, updatedStudents);
  };

  // Cập nhật sổ điểm tốt của lớp hiện tại (đồng bộ cả LocalStorage và SQLite)
  const handleUpdateGoodScores = (updatedGoodScores) => {
    if (!currentClass) return;
    setClasses(prevClasses => {
      return prevClasses.map(c => {
        if (c.id === currentClass.id) {
          return { ...c, goodScores: updatedGoodScores };
        }
        return c;
      });
    });
    syncClassToSqlite({ ...currentClass, goodScores: updatedGoodScores });
  };

  // Thêm lớp mới (lưu vào state và ghi vào file SQLite)
  const handleAddClass = (newClassData) => {
    const gradeNum = newClassData.grade || 3;
    const newClass = {
      id: `class_${Date.now()}`,
      name: newClassData.name,
      grade: gradeNum,
      subject: newClassData.subject || `Tin Học ${gradeNum}`,
      schoolYear: newClassData.schoolYear || '2025 - 2026',
      students: []
    };
    setClasses(prev => [...prev, newClass]);
    setClassId(newClass.id);
    syncClassToSqlite(newClass);
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
  };

  // Xóa lớp học (xóa trong state và trong file SQLite)
  const handleDeleteClass = (classIdToDelete) => {
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
      deleteClassFromSqlite(classIdToDelete);
      
      // Nếu xóa lớp đang chọn, chuyển sang lớp đầu tiên còn lại
      if (currentClassId === classIdToDelete) {
        const nextClassId = remainingClasses[0]?.id || '';
        setClassId(nextClassId);
        setCurrentClassId(nextClassId);
      }
    }
  };

  // Xử lý khi Batch Import từ Excel thành công (1 file nhiều sheet)
  const handleBatchImportSuccess = (updatedClasses, targetClassId) => {
    if (updatedClasses && Array.isArray(updatedClasses) && updatedClasses.length > 0) {
      setClasses(updatedClasses);
      saveClasses(updatedClasses);
      if (targetClassId) {
        setClassId(targetClassId);
        setCurrentClassId(targetClassId);
      }
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
      />

      {/* Main Right Column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Navigation Header */}
        <Navbar
          classes={classes}
          currentClass={currentClass}
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
          dbStatus={dbStatus}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          isSidebarCollapsed={sidebarCollapsed}
        />

        {/* Main Content Area */}
        <ErrorBoundary title="Đã xảy ra sự cố khi tải nội dung chức năng">
          <main className="app-container" style={{ flex: 1, paddingTop: '1.25rem', width: '100%' }}>
          {activeTab === 'home' && (
            <HomeDashboard
              currentClass={currentClass}
              onSelectTab={setActiveTab}
              onOpenExchangeModal={handleOpenExchangeModal}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionManager
              classes={classes}
              currentClass={currentClass}
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
              onOpenExchangeModal={handleOpenExchangeModal}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'goodscores' && (
            <GoodScoresBoard
              currentClass={currentClass}
              onUpdateStudents={handleUpdateStudents}
              onUpdateGoodScores={handleUpdateGoodScores}
              onOpenExchangeModal={handleOpenExchangeModal}
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
              onOpenExchangeModal={handleOpenExchangeModal}
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

      {/* Modal Quy Đổi Sao Sang Điểm (10⭐ = +1.0 Điểm) */}
      <StarExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => {
          setIsExchangeModalOpen(false);
          setExchangeStudentId(null);
        }}
        students={currentClass?.students || []}
        initialStudentId={exchangeStudentId}
        onUpdateStudents={handleUpdateStudents}
        soundEnabled={soundEnabled}
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
