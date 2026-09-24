import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  Trash2, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  FileCode2, 
  FileText, 
  HardDrive, 
  FileSpreadsheet,
  Sparkles,
  MoreVertical,
  GraduationCap,
  RotateCw,
  Settings,
  Calendar,
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  exportAllBackupData, 
  importAllBackupData, 
  getGlobalBrokenMachines, 
  detectGradeFromName, 
  downloadSqliteDatabaseFile, 
  downloadSqlScriptFile, 
  importSqlScriptFile, 
  exportAllClassesToExcel, 
  downloadSampleExcelTemplate 
} from '../utils/storage';
import ImportExcelModal from './ImportExcelModal';
import SchoolYearTransitionModal from './SchoolYearTransitionModal';
import AcademicYearSettingsModal from './AcademicYearSettingsModal';
import AiAssistantModal from './AI/AiAssistantModal';
import { fetchAiStatus } from './AI/aiService';
import { getCurrentPeriodStatus } from '../utils/timetable';
import TimetableModal from './ClassroomSession/TimetableModal';

export default function Navbar({ 
  classes, 
  currentClass, 
  studentStats,
  isLoadingStats,
  statsError,
  onRefreshStats,
  onSelectClass, 
  onAddClass, 
  onDeleteClass, 
  onRestoreClasses, 
  onBatchImportSuccess, 
  isProjector, 
  onToggleProjector, 
  soundEnabled, 
  onToggleSound, 
  isSidebarCollapsed, 
  onToggleSidebar, 
  activeTab, 
  onSelectTab, 
  currentSchoolYear = '2026 - 2027',
  availableSchoolYears = ['2025 - 2026', '2026 - 2027'],
  onSelectSchoolYear,
  onTransitionSuccess,
  academicYearSettings,
  onSaveAcademicYearSettings,
  onSelectClassFromTimetable = null,
  dbStatus = { connected: true, dbFile: 'edumaster.sqlite' } 
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showYearSettingsModal, setShowYearSettingsModal] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [importTargetYear, setImportTargetYear] = useState(null);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [aiStatus, setAiStatus] = useState({ enabled: true, configured: false, model: 'gemini-3.5-flash-lite' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(3);
  const [newClassSubject, setNewClassSubject] = useState('Tin Học');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [modalGradeFilter, setModalGradeFilter] = useState('all');
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [livePeriodStatus, setLivePeriodStatus] = useState(() => getCurrentPeriodStatus());

  // Cập nhật trạng thái tiết dạy thời gian thực trên thanh điều hướng
  useEffect(() => {
    const timer = setInterval(() => {
      setLivePeriodStatus(getCurrentPeriodStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tự động làm mới số liệu thống kê khi mở modal Quản lý lớp
  useEffect(() => {
    if (showAddModal) {
      onRefreshStats?.();
    }
  }, [showAddModal]);

  // Mở modal Import Excel từ modal Thêm & Quản lý lớp
  const handleOpenImportExcel = (targetYear = null) => {
    setImportTargetYear(targetYear || currentSchoolYear);
    setShowImportExcelModal(true);
  };

  // Đóng menu "..." khi click ra ngoài
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleOutsideClick = () => setShowMoreMenu(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showMoreMenu]);

  // Đóng dropdown năm học khi click ra ngoài
  useEffect(() => {
    if (!showYearDropdown) return;
    const handleOutsideClick = () => setShowYearDropdown(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showYearDropdown]);

  // Kiểm tra trạng thái AI khi mở Navbar
  useEffect(() => {
    fetchAiStatus().then(st => setAiStatus(st));
  }, []);

  // Khối lớp đang chọn lọc trên thanh điều hướng ('all' hoặc 1 | 2 | 3 | 4 | 5)
  const [selectedGradeFilter, setSelectedGradeFilter] = useState(() => {
    return currentClass?.grade || detectGradeFromName(currentClass?.name) || 3;
  });

  // Lọc danh sách lớp theo khối
  const classesInSelectedGrade = useMemo(() => {
    if (selectedGradeFilter === 'all') return classes;
    return classes.filter(c => (c.grade || detectGradeFromName(c.name)) === Number(selectedGradeFilter));
  }, [classes, selectedGradeFilter]);

  // Lọc danh sách lớp trong modal Quản lý lớp
  const modalFilteredClasses = useMemo(() => {
    if (modalGradeFilter === 'all') return classes;
    return classes.filter(c => (c.grade || detectGradeFromName(c.name)) === Number(modalGradeFilter));
  }, [classes, modalGradeFilter]);

  // Đổi bộ lọc khối và tự động chọn lớp phù hợp
  const handleFilterGradeChange = (grade) => {
    setSelectedGradeFilter(grade);
    if (grade !== 'all') {
      const matchInGrade = classes.find(c => (c.grade || detectGradeFromName(c.name)) === Number(grade));
      if (matchInGrade && matchInGrade.id !== currentClass?.id) {
        onSelectClass(matchInGrade.id);
      }
    }
  };

  const handleCreateClass = (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const gradeNum = parseInt(newClassGrade, 10) || detectGradeFromName(newClassName.trim());
    onAddClass({
      name: newClassName.trim(),
      grade: gradeNum,
      subject: newClassSubject.trim() || `Tin Học ${gradeNum}`,
      schoolYear: currentSchoolYear || '2026 - 2027'
    });
    setNewClassName('');
    setShowAddModal(false);
  };

  // Sao lưu dữ liệu
  const handleExportBackup = () => {
    const broken = getGlobalBrokenMachines();
    exportAllBackupData(classes, broken);
  };

  // Phục hồi dữ liệu từ file JSON
  const handleImportBackupFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importAllBackupData(event.target.result);
      if (result.success) {
        alert(`✅ Đã phục hồi thành công dữ liệu ${result.count} lớp học!`);
        window.location.reload();
      } else {
        alert(`❌ Lỗi phục hồi: ${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Nhập & Thực thi kịch bản SQL (.sql)
  const handleImportSqlScript = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const sqlText = event.target.result;
        const res = await importSqlScriptFile(sqlText);
        if (res.success) {
          alert('✅ Đã nạp và thực thi kịch bản SQL vào cơ sở dữ liệu SQLite thành công!');
          window.location.reload();
        } else {
          alert(`❌ Lỗi thực thi SQL: ${res.error}`);
        }
      } catch (err) {
        alert(`❌ Không thể kết nối tới máy chủ SQLite: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const currentGradeNum = currentClass?.grade || detectGradeFromName(currentClass?.name) || 3;

  return (
    <>
      <header className="navbar-container" style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--surface-border)',
        position: 'sticky',
        top: 0,
        zIndex: 85,
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="navbar-header-inner">
          {/* Logo & Brand: Tin Học Tiểu Học (Zone 1: Trái) */}
          <div 
            onClick={() => onSelectTab?.('home')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem', 
              cursor: 'pointer', 
              userSelect: 'none',
              flex: '0 0 auto',
              flexShrink: 0
            }}
            title="Về Trang Chủ Tin Học EduICT"
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
              flexShrink: 0
            }}>
              <Monitor size={20} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                EduICT
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.625rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#fff',
                padding: '0.12rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                letterSpacing: '0.02em'
              }}>
                TIN HỌC TIỂU HỌC
              </span>
            </div>
          </div>

          {/* Nhóm Thao Tác & Công Cụ (Zone 2: Giữa) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            flexShrink: 0
          }}>
            {/* Nhóm thao tác lớp */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                type="button"
                className="btn btn-outline btn-sm navbar-btn-add-class-inline"
                style={{
                  height: 32,
                  padding: '0 0.55rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  background: 'rgba(2, 132, 199, 0.06)'
                }}
                onClick={() => setShowAddModal(true)}
                title="Thêm hoặc quản lý các lớp học"
              >
                <PlusCircle size={14} color="var(--primary)" />
                <span>+ Thêm lớp</span>
              </button>
            </div>

            {/* Đường phân cách giữa Nhóm Lớp và Nhóm Công Cụ */}
            <div style={{ width: 1, height: 18, background: 'var(--surface-border)', opacity: 0.8, margin: '0 0.05rem' }} />

            {/* Nhóm công cụ hỗ trợ giảng dạy */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {/* Nút Trợ Giảng AI Gemini */}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowAiAssistantModal(true)}
                title="Trợ Giảng AI Gemini GDPT 2018"
                style={{
                  height: 32,
                  padding: '0 0.55rem',
                  borderColor: 'rgba(168, 85, 247, 0.45)',
                  background: 'rgba(168, 85, 247, 0.08)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: '#a855f7',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <Sparkles size={14} color="#a855f7" />
                <span>Trợ Giảng AI</span>
                <span 
                  style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: aiStatus.configured ? '#10b981' : '#f59e0b',
                    boxShadow: aiStatus.configured ? '0 0 6px #10b981' : 'none'
                  }} 
                  title={aiStatus.configured ? 'Gemini AI sẵn sàng' : 'Chưa thiết lập GEMINI_API_KEY'}
                />
              </button>

              {/* Nút Máy chiếu */}
              <button 
                type="button"
                onClick={onToggleProjector}
                className={`btn btn-sm ${isProjector ? 'btn-amber pulse-card' : 'btn-secondary'}`}
                style={{
                  height: 32,
                  padding: '0 0.55rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title="Chế độ Máy chiếu (Chữ to, tương phản cao trên màn hình lớn phòng tin học)"
              >
                <Tv size={14} />
                <span>{isProjector ? 'Máy chiếu: BẬT' : 'Máy chiếu'}</span>
              </button>

              {/* Các nút phụ inline khi màn hình rộng */}
              <button
                type="button"
                className="btn btn-outline btn-sm navbar-btn-inline-secondary"
                onClick={() => setShowTimetableModal(true)}
                title="Lịch giảng dạy cá nhân (Thời khóa biểu) & Thời gian thực"
                style={{
                  height: 34,
                  padding: '0 0.75rem',
                  borderColor: livePeriodStatus.isTeachingNow ? '#10b981' : 'rgba(2, 132, 199, 0.4)',
                  background: livePeriodStatus.isTeachingNow 
                    ? 'rgba(16, 185, 129, 0.12)' 
                    : livePeriodStatus.status === 'RECESS' 
                    ? 'rgba(245, 158, 11, 0.12)' 
                    : 'rgba(2, 132, 199, 0.06)',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: livePeriodStatus.isTeachingNow 
                    ? '#059669' 
                    : livePeriodStatus.status === 'RECESS'
                    ? '#d97706'
                    : 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <Calendar size={15} color={livePeriodStatus.isTeachingNow ? '#10b981' : 'var(--primary)'} />
                {livePeriodStatus.isTeachingNow ? (
                  <span>🟢 Tiết {livePeriodStatus.period} ({livePeriodStatus.className}) • {livePeriodStatus.remainingMin}p</span>
                ) : livePeriodStatus.status === 'RECESS' ? (
                  <span>☕ Ra chơi • {livePeriodStatus.remainingMin}p</span>
                ) : (
                  <span>TKB</span>
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm navbar-btn-inline-secondary"
                onClick={() => setShowBackupModal(true)}
                title="Cơ sở dữ liệu SQLite & Xuất/Nhập file SQL"
                style={{
                  height: 34,
                  padding: '0 0.65rem',
                  borderColor: 'rgba(2, 132, 199, 0.4)',
                  background: 'rgba(2, 132, 199, 0.06)',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <Database size={15} color="var(--primary)" />
                <span>CSDL</span>
                <span 
                  style={{ 
                    width: 7, 
                    height: 7, 
                    borderRadius: '50%', 
                    background: dbStatus?.connected !== false ? '#10b981' : '#f59e0b',
                    boxShadow: dbStatus?.connected !== false ? '0 0 6px #10b981' : 'none'
                  }} 
                  title={dbStatus?.connected !== false ? 'Đã kết nối SQLite' : 'Đang kết nối'}
                />
              </button>

              <button 
                type="button"
                onClick={onToggleSound}
                className={`btn btn-sm navbar-btn-inline-secondary ${soundEnabled ? 'btn-secondary' : 'btn-outline'}`}
                style={{ width: 34, height: 34, padding: 0, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title={soundEnabled ? 'Âm thanh: Đang BẬT' : 'Âm thanh: Đang TẮT'}
              >
                {soundEnabled ? <Volume2 size={16} color="var(--primary)" /> : <VolumeX size={16} color="var(--text-dim)" />}
              </button>

              {/* Menu "⋮" More actions */}
              <div className="navbar-more-dropdown-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(prev => !prev);
                  }}
                  className={`btn btn-outline btn-sm ${showMoreMenu ? 'active' : ''}`}
                  style={{
                    width: 34,
                    height: 34,
                    padding: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    borderColor: showMoreMenu ? 'var(--primary)' : 'var(--surface-border)',
                    background: showMoreMenu ? 'var(--surface-secondary)' : 'transparent',
                    color: showMoreMenu ? 'var(--primary)' : 'var(--text-main)'
                  }}
                  title="Thao tác & Cài đặt bổ sung"
                >
                  <MoreVertical size={16} />
                </button>

                {showMoreMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                      padding: '0.5rem',
                      minWidth: 230,
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      backdropFilter: 'blur(16px)'
                    }}
                  >
                    {/* Âm thanh */}
                    <button
                      type="button"
                      onClick={() => onToggleSound()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {soundEnabled ? <Volume2 size={16} color="var(--primary)" /> : <VolumeX size={16} color="var(--text-dim)" />}
                        <span>Âm thanh</span>
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: soundEnabled ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-secondary)',
                        color: soundEnabled ? 'var(--primary)' : 'var(--text-muted)'
                      }}>
                        {soundEnabled ? 'BẬT' : 'TẮT'}
                      </span>
                    </button>

                    {/* CSDL SQL */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowBackupModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Database size={16} color="var(--primary)" />
                        <span>Cơ sở dữ liệu (CSDL)</span>
                      </div>
                      <span 
                        style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: dbStatus?.connected !== false ? '#10b981' : '#f59e0b',
                          boxShadow: dbStatus?.connected !== false ? '0 0 6px #10b981' : 'none'
                        }} 
                        title={dbStatus?.connected !== false ? 'Đã kết nối SQLite' : 'Đang kết nối'}
                      />
                    </button>

                    {/* Cài đặt năm học */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowYearSettingsModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Calendar size={16} color="var(--primary)" />
                        <span>Cài đặt năm học</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {academicYearSettings ? `${String(academicYearSettings.startDay).padStart(2, '0')}/${String(academicYearSettings.startMonth).padStart(2, '0')}` : '05/09'}
                      </span>
                    </button>

                    {/* Thêm Lớp */}
                    <button
                      type="button"
                      className="navbar-menu-item-add-class"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowAddModal(true);
                      }}
                      style={{
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <PlusCircle size={16} color="var(--primary)" />
                      <span>Thêm / Quản lý Lớp</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cụm Quản Lý Năm Học Riêng Biệt (Zone 3: Phải - Cấp Cao Nhất) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--surface-secondary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.2rem 0.35rem',
            flexShrink: 0
          }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              paddingLeft: '0.25rem'
            }}>
              Năm học:
            </span>

            {/* Custom Dropdown Năm Học (Section 10) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowYearDropdown(prev => !prev);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  height: 30
                }}
                title="Bấm để chọn năm học khác"
              >
                <span>{currentSchoolYear || '2026 - 2027'}</span>
                <ChevronDown size={13} style={{ transition: 'transform 0.15s', transform: showYearDropdown ? 'rotate(180deg)' : 'none' }} />
              </button>

              {/* Dropdown Menu Năm Học */}
              {showYearDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
                    padding: '0.45rem',
                    minWidth: 200,
                    zIndex: 100,
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.4rem 0.6rem 0.3rem',
                    borderBottom: '1px solid var(--surface-border)',
                    marginBottom: '0.3rem'
                  }}>
                    CHỌN NĂM HỌC
                  </div>

                  {availableSchoolYears.map(year => {
                    const isSelected = year === currentSchoolYear;
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setShowYearDropdown(false);
                          onSelectSchoolYear?.(year);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '0.5rem 0.65rem',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                          color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'var(--surface-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span>{year}</span>
                        {isSelected && <Check size={14} color="var(--primary)" />}
                      </button>
                    );
                  })}

                  <div style={{ borderTop: '1px solid var(--surface-border)', marginTop: '0.3rem', paddingTop: '0.3rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowYearDropdown(false);
                        setShowYearSettingsModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '0.5rem 0.65rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--surface-secondary)';
                        e.currentTarget.style.color = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                    >
                      <Settings size={14} />
                      <span>⚙ Cài đặt năm học</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Nút [ ⚙ ] riêng biệt (Section 6) */}
            <button
              type="button"
              onClick={() => setShowYearSettingsModal(true)}
              style={{
                width: 30,
                height: 30,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-card)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Cài đặt năm học"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--surface-border)';
              }}
            >
              <Settings size={13} />
            </button>

            {/* Nút [ ↻ Chuyển năm học ] (Section 5) */}
            <button
              type="button"
              onClick={() => setShowTransitionModal(true)}
              style={{
                height: 30,
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#fff',
                fontSize: '0.725rem',
                fontWeight: 700,
                padding: '0 0.55rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
              }}
              title="Tự động chuyển sang năm học mới & lên lớp"
            >
              <RotateCw size={12} />
              <span>Chuyển năm học</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal Quản Lý & Thêm Lớp Học (Sử dụng React Portal) */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 720, width: '94%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  🏫 Thêm & Quản Lý Lớp Tin Học
                </h3>
              </div>
              <button 
                className="btn btn-sm btn-outline" 
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Thanh công cụ 5 chức năng: Thêm lớp, Import Excel, Chuyển Năm Học, Xuất Excel, Tải mẫu */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <button
                type="button"
                className={`btn btn-sm ${showCreateForm ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowCreateForm(prev => !prev)}
                style={{ fontSize: '0.8125rem' }}
                title="Bật / tắt biểu mẫu tạo lớp thủ công"
              >
                <PlusCircle size={15} />
                <span>➕ Thêm Lớp</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleOpenImportExcel()}
                style={{
                  fontSize: '0.8125rem',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  background: 'rgba(2, 132, 199, 0.06)'
                }}
                title="Nhập 1 file Excel gồm nhiều sheet, mỗi sheet là 1 lớp học"
              >
                <FileSpreadsheet size={15} />
                <span>📥 Import Excel</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setShowTransitionModal(true)}
                style={{
                  fontSize: '0.8125rem',
                  borderColor: '#6366f1',
                  color: '#4f46e5',
                  background: 'rgba(99, 102, 241, 0.06)'
                }}
                title="Tự động lên khối cho học sinh, kết thúc lớp 5 và tạo lớp 1 mới cho năm học tiếp theo"
              >
                <GraduationCap size={15} />
                <span>🎓 Chuyển Năm</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => exportAllClassesToExcel(classes)}
                style={{
                  fontSize: '0.8125rem',
                  borderColor: '#10b981',
                  color: '#059669',
                  background: 'rgba(16, 185, 129, 0.06)'
                }}
                title="Xuất toàn bộ các lớp học vào 1 file Excel (mỗi lớp 1 sheet riêng biệt)"
              >
                <Download size={15} />
                <span>📤 Xuất Excel</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={downloadSampleExcelTemplate}
                style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
                title="Tải file Excel mẫu gồm các sheet 1A, 1B, 2A và Sheet Hướng dẫn"
              >
                <FileText size={15} />
                <span>📄 Tải mẫu</span>
              </button>
            </div>

            {/* THỐNG KÊ TỔNG SỐ HỌC SINH TOÀN TRƯỜNG & THEO TỪNG KHỐI (TÍNH TỪ DATABASE) */}
            <div style={{
              background: 'var(--surface-secondary)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.85rem 1rem',
              marginBottom: '1.15rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  <span>📊 Thống Kê Học Sinh & Lớp Học</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'rgba(2, 132, 199, 0.1)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: 4
                  }}>
                    Năm học: {studentStats?.schoolYear || currentSchoolYear || '2026 - 2027'}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => onRefreshStats?.()}
                  disabled={isLoadingStats}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--primary)',
                    borderColor: 'rgba(2, 132, 199, 0.3)'
                  }}
                  title="Cập nhật số liệu mới nhất từ cơ sở dữ liệu SQLite"
                >
                  <RefreshCw size={12} className={isLoadingStats ? 'spin' : ''} />
                  <span>{isLoadingStats ? 'Đang tải...' : 'Làm mới'}</span>
                </button>
              </div>

              {/* Thông báo lỗi nếu có */}
              {statsError && (
                <div style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={15} />
                    <span>Không thể tải thống kê từ cơ sở dữ liệu: {statsError}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => onRefreshStats?.()}
                    style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Grid các Card Thống Kê */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 1.35fr) repeat(5, minmax(75px, 1fr))',
                gap: '0.5rem'
              }}>
                {/* 1. Card Toàn Trường */}
                <div
                  onClick={() => setModalGradeFilter('all')}
                  style={{
                    background: modalGradeFilter === 'all'
                      ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.18), rgba(99, 102, 241, 0.12))'
                      : 'var(--surface-card)',
                    border: modalGradeFilter === 'all'
                      ? '1.5px solid var(--primary)'
                      : '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.6rem 0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Bấm để hiển thị tất cả các lớp"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      🏫 Toàn trường
                    </span>
                    {modalGradeFilter === 'all' && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                      {isLoadingStats && !studentStats 
                        ? '...' 
                        : (studentStats?.totalStudents ?? classes.reduce((sum, c) => sum + (c.students?.length || 0), 0))}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HS</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    <strong>{studentStats?.totalClasses ?? classes.length}</strong> lớp học
                  </div>
                </div>

                {/* 2. Các Card Khối 1 đến 5 */}
                {[1, 2, 3, 4, 5].map(g => {
                  const gData = studentStats?.grades?.find(item => item.grade === g);
                  const fallbackClasses = classes.filter(c => (c.grade || detectGradeFromName(c.name)) === g);
                  const classCount = gData?.classCount ?? fallbackClasses.length;
                  const studentCount = gData?.studentCount ?? fallbackClasses.reduce((sum, c) => sum + (c.students?.length || 0), 0);
                  const isSelected = modalGradeFilter === g;

                  return (
                    <div
                      key={g}
                      onClick={() => setModalGradeFilter(isSelected ? 'all' : g)}
                      style={{
                        background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-card)',
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.55rem 0.5rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Bấm để lọc danh sách lớp Khối ${g}`}
                    >
                      <div style={{
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                        textTransform: 'uppercase'
                      }}>
                        Khối {g}
                      </div>
                      <div style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        marginTop: '0.15rem'
                      }}>
                        {isLoadingStats && !studentStats ? '...' : studentCount} <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-muted)' }}>HS</span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {classCount} lớp
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Thêm Lớp Mới với Khối 1 - 5 */}
            {showCreateForm && (
              <form onSubmit={handleCreateClass} style={{
                background: 'var(--surface-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>
                  ➕ Thêm Lớp Học Mới
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Khối lớp (*)
                    </label>
                    <select
                      className="input-field"
                      value={newClassGrade}
                      onChange={(e) => setNewClassGrade(Number(e.target.value))}
                    >
                      <option value={1}>Khối 1 (Làm quen)</option>
                      <option value={2}>Khối 2 (Luyện phím)</option>
                      <option value={3}>Khối 3 (GDPT 2018)</option>
                      <option value={4}>Khối 4 (GDPT 2018)</option>
                      <option value={5}>Khối 5 (GDPT 2018)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Tên lớp (*)
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="VD: 3A2, 4B..."
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Môn học
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newClassSubject}
                      onChange={(e) => setNewClassSubject(e.target.value)}
                      placeholder="VD: Tin Học..."
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <PlusCircle size={15} /> Tạo Lớp
                  </button>
                </div>
              </form>
            )}

            {/* Danh Sách Lớp Hiện Có */}
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: 700, 
                marginBottom: '0.6rem', 
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>📋 Danh Sách Lớp ({modalFilteredClasses.length} lớp học)</span>
                  {modalGradeFilter !== 'all' && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: 4,
                      background: 'rgba(2, 132, 199, 0.12)',
                      color: 'var(--primary)'
                    }}>
                      Lọc Khối {modalGradeFilter}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {modalGradeFilter !== 'all' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setModalGradeFilter('all')}
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
                    >
                      ✕ Xem tất cả khối
                    </button>
                  )}
                  <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Tối thiểu 1 lớp</span>
                </div>
              </div>

              {/* Empty state nếu khối đang lọc không có lớp nào */}
              {modalFilteredClasses.length === 0 ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'var(--surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--surface-border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem'
                }}>
                  Không có lớp học nào thuộc Khối {modalGradeFilter}.
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setModalGradeFilter('all')}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Quay lại xem tất cả lớp
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflowY: 'auto' }}>
                  {modalFilteredClasses.map(c => {
                    const isCurrent = c.id === currentClass?.id;
                    const g = c.grade || detectGradeFromName(c.name);
                    const statClass = studentStats?.classes?.find(sc => sc.id === c.id);
                    const studentCount = statClass ? statClass.studentCount : (c.students?.length || 0);

                    return (
                      <div 
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: isCurrent ? 'rgba(2, 132, 199, 0.08)' : 'var(--surface-card)',
                          border: isCurrent ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.45rem',
                            borderRadius: 4,
                            background: 'rgba(2, 132, 199, 0.15)',
                            color: '#0284c7'
                          }}>
                            Khối {g}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: isCurrent ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span>{c.name}</span>
                              {g === 1 && (
                                studentCount === 0 ? (
                                  <span style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: 4,
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#b45309',
                                    border: '1px solid rgba(245, 158, 11, 0.3)'
                                  }}>
                                    ⚠ Chưa có danh sách học sinh
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: 4,
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    color: '#059669',
                                    border: '1px solid rgba(16, 185, 129, 0.25)'
                                  }}>
                                    ✓ Đã có danh sách
                                  </span>
                                )
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {c.subject || 'Tin Học'} • <strong style={{ color: 'var(--text-main)' }}>{studentCount}</strong> học sinh
                            </div>
                          </div>
                          {isCurrent && (
                            <span style={{
                              fontSize: '0.6875rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '999px',
                              background: 'var(--primary)',
                              color: '#fff',
                              fontWeight: 700
                            }}>
                              Đang chọn
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {g === 1 && studentCount === 0 && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.72rem',
                                color: 'var(--primary)',
                                borderColor: 'var(--primary)',
                                background: 'rgba(2, 132, 199, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              onClick={() => handleOpenImportExcel()}
                              title={`Nhập danh sách học sinh cho lớp ${c.name} từ Excel`}
                            >
                              <FileSpreadsheet size={13} />
                              <span>Nhập Excel</span>
                            </button>
                          )}
                          {!isCurrent && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => onSelectClass(c.id)}
                            >
                              Chọn
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{
                              color: '#ef4444',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(239, 68, 68, 0.05)',
                              cursor: classes.length <= 1 ? 'not-allowed' : 'pointer',
                              opacity: classes.length <= 1 ? 0.4 : 1
                            }}
                            onClick={() => onDeleteClass?.(c.id)}
                            title={classes.length <= 1 ? 'Cần giữ tối thiểu 1 lớp' : `Xóa lớp ${c.name}`}
                            disabled={classes.length <= 1}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Tự Động Chuyển Năm Học & Chuyển Lớp */}
      <SchoolYearTransitionModal
        isOpen={showTransitionModal}
        onClose={() => setShowTransitionModal(false)}
        currentSchoolYear={currentSchoolYear}
        classes={classes}
        onTransitionSuccess={(toYear, result) => {
          onTransitionSuccess?.(toYear, result);
        }}
        onOpenImportExcel={(toYear) => {
          handleOpenImportExcel(toYear);
        }}
      />

      {/* Modal Cài Đặt Ngày Bắt Đầu Năm Học */}
      <AcademicYearSettingsModal
        isOpen={showYearSettingsModal}
        onClose={() => setShowYearSettingsModal(false)}
        initialSettings={academicYearSettings}
        onSaveSuccess={(newSettings, newCurrentYear) => {
          setShowYearSettingsModal(false);
          onSaveAcademicYearSettings?.(newSettings, newCurrentYear);
        }}
      />

      {/* Modal Import Danh Sách Lớp & Học Sinh Từ Excel (Nhiều Sheet = Nhiều Lớp) */}
      <ImportExcelModal
        isOpen={showImportExcelModal}
        onClose={() => {
          setShowImportExcelModal(false);
          setImportTargetYear(null);
        }}
        onFinish={() => {
          setShowImportExcelModal(false);
          setShowAddModal(false);
          setImportTargetYear(null);
        }}
        existingClasses={classes}
        onImportSuccess={(updatedClasses, targetClassId) => {
          onBatchImportSuccess?.(updatedClasses, targetClassId);
        }}
        soundEnabled={soundEnabled}
        currentSchoolYear={importTargetYear || currentSchoolYear}
      />

      {/* Modal Cơ Sở Dữ Liệu SQL & Sao Lưu Toàn Diện */}
      {showBackupModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowBackupModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={22} color="var(--primary)" />
                Cơ Sở Dữ Liệu SQL & Sao Lưu Dữ Liệu
              </h3>
              <button 
                className="btn btn-sm btn-outline" 
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setShowBackupModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Banner trạng thái SQLite Cục Bộ */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <div style={{ 
                width: 10, 
                height: 10, 
                borderRadius: '50%', 
                background: '#10b981', 
                marginTop: '0.35rem',
                flexShrink: 0,
                boxShadow: '0 0 8px #10b981' 
              }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#065f46' }}>
                  Đang lưu trữ tự động trong file SQLite: <code>edumaster.sqlite</code>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#047857', marginTop: '0.2rem', lineHeight: 1.45 }}>
                  Hệ thống sử dụng SQLite chuẩn file CSDL nội bộ. Mọi thao tác thêm/sửa lớp, chấm điểm (TT27/Kỹ năng), cộng sao và trạng thái phòng máy đều được lưu bền vững vào file này trong thư mục dự án.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Nhóm 1: Thao Tác Trực Tiếp Với File SQL / SQLite */}
              <div>
                <div style={{ 
                  fontSize: '0.8125rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em', 
                  color: 'var(--primary)',
                  marginBottom: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <span>💾 Tệp Tin Cơ Sở Dữ Liệu SQL</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Tải file CSDL SQLite (.sqlite) */}
                  <div style={{
                    background: 'var(--surface-secondary)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--surface-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <HardDrive size={16} color="var(--primary)" />
                        Tải File Database SQLite (.sqlite)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        File CSDL nhị phân gốc <code>edumaster.sqlite</code>. Mở được bằng DB Browser for SQLite hoặc VS Code SQLite Viewer.
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={downloadSqliteDatabaseFile}
                      style={{ whiteSpace: 'nowrap' }}
                      title="Tải trực tiếp file edumaster.sqlite về máy tính"
                    >
                      <Download size={14} /> Tải .sqlite
                    </button>
                  </div>

                  {/* Tải file SQL Script (.sql) */}
                  <div style={{
                    background: 'var(--surface-secondary)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--surface-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileCode2 size={16} color="#0284c7" />
                        Xuất File Kịch Bản Mã SQL Script (.sql)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Tạo file mã nguồn SQL chứa đầy đủ các câu lệnh <code>CREATE TABLE</code> và <code>INSERT INTO</code> dạng văn bản thuần.
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={downloadSqlScriptFile}
                      style={{ whiteSpace: 'nowrap' }}
                      title="Xuất kịch bản mã SQL đầy đủ"
                    >
                      <Download size={14} /> Xuất .sql
                    </button>
                  </div>

                  {/* Nhập & Thực thi file SQL Script (.sql) */}
                  <div style={{
                    background: 'var(--surface-secondary)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--surface-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileText size={16} color="#f59e0b" />
                        Nạp & Thực Thi File Kịch Bản SQL (.sql)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Nạp một file kịch bản <code>.sql</code> có sẵn và chạy trực tiếp để cập nhật CSDL.
                      </div>
                    </div>
                    <label className="btn btn-outline btn-sm" style={{ display: 'inline-flex', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <Upload size={14} />
                      <span>Nạp .sql</span>
                      <input 
                        type="file" 
                        accept=".sql" 
                        style={{ display: 'none' }} 
                        onChange={handleImportSqlScript}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Sao Lưu Nhanh File JSON Web */}
              <div style={{ borderTop: '1px dashed var(--surface-border)', paddingTop: '1rem' }}>
                <div style={{ 
                  fontSize: '0.8125rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em', 
                  color: 'var(--text-muted)',
                  marginBottom: '0.6rem' 
                }}>
                  📦 Sao Lưu Dự Phòng Nhanh (File JSON Web)
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleExportBackup}
                    style={{ flex: 1, minWidth: 200, justifyContent: 'center' }}
                  >
                    <Download size={14} /> Tải File Sao Lưu (.json)
                  </button>
                  <label className="btn btn-outline btn-sm" style={{ flex: 1, minWidth: 200, justifyContent: 'center', cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>Phục hồi từ File (.json)</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      style={{ display: 'none' }} 
                      onChange={handleImportBackupFile}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBackupModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Trung Tâm Điều Khiển Trợ Giảng AI Gemini */}
      {showAiAssistantModal && (
        <AiAssistantModal
          isOpen={showAiAssistantModal}
          onClose={() => setShowAiAssistantModal(false)}
          onOpenAnalyzeLesson={() => onSelectTab('lessons')}
          onOpenQuestionGen={() => onSelectTab('quiz')}
          onOpenLessonFlow={() => onSelectTab('sessions')}
          onOpenClassAnalysis={() => onSelectTab('gradebook')}
        />
      )}

      {/* Modal Lịch Giảng Dạy Cá Nhân (Thời Khóa Biểu) */}
      <TimetableModal
        isOpen={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        onSelectClassForSession={(targetClassName, targetGrade) => {
          setShowTimetableModal(false);
          if (onSelectClassFromTimetable) {
            onSelectClassFromTimetable(targetClassName, targetGrade);
          } else {
            if (targetClassName && classes && classes.length > 0) {
              const clean = targetClassName.trim().toLowerCase();
              const found = classes.find(c => {
                const cName = (c.name || '').trim().toLowerCase();
                return cName === clean || cName === `lớp ${clean}` || `lớp ${cName}` === clean;
              });
              if (found && onSelectClass) {
                onSelectClass(found.id);
              }
            }
            if (onSelectTab) {
              onSelectTab('sessions');
            }
          }
        }}
      />
    </>
  );
}
