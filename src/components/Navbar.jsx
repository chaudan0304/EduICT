import React, { useState, useMemo } from 'react';
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
  HardDrive
} from 'lucide-react';
import { 
  exportAllBackupData, 
  importAllBackupData, 
  getGlobalBrokenMachines, 
  detectGradeFromName,
  downloadSqliteDatabaseFile,
  downloadSqlScriptFile,
  importSqlScriptFile
} from '../utils/storage';

export default function Navbar({ 
  classes, 
  currentClass, 
  onSelectClass, 
  onAddClass, 
  onDeleteClass, 
  onRestoreClasses,
  isProjector, 
  onToggleProjector, 
  soundEnabled, 
  onToggleSound, 
  activeTab, 
  onSelectTab,
  dbStatus = { connected: true, dbFile: 'edumaster.sqlite' }
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(3);
  const [newClassSubject, setNewClassSubject] = useState('Tin Học');

  // Khối lớp đang chọn lọc trên thanh điều hướng ('all' hoặc 1 | 2 | 3 | 4 | 5)
  const [selectedGradeFilter, setSelectedGradeFilter] = useState(() => {
    return currentClass?.grade || detectGradeFromName(currentClass?.name) || 3;
  });

  // Lọc danh sách lớp theo khối
  const classesInSelectedGrade = useMemo(() => {
    if (selectedGradeFilter === 'all') return classes;
    return classes.filter(c => (c.grade || detectGradeFromName(c.name)) === Number(selectedGradeFilter));
  }, [classes, selectedGradeFilter]);

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
      schoolYear: '2025 - 2026'
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

  const navTabs = [
    { id: 'home', label: 'Trang Chủ', icon: '🏠' },
    { id: 'sessions', label: 'Tiết Học (Session)', icon: '🎯', highlight: true },
    { id: 'lessons', label: 'Bài Học & Slide', icon: '📚' },
    { id: 'quiz', label: 'Quick Quiz (Đố Vui)', icon: '⚡' },
    { id: 'seating', label: 'Phòng Máy (5 Dãy • 31 Máy)', icon: '🖥️' },
    { id: 'gradebook', label: currentGradeNum <= 2 ? 'Sổ Kỹ Năng & Sao' : 'Sổ Điểm (TT27)', icon: '📋' },
    { id: 'goodscores', label: 'Điểm Tốt & Nội Quy', icon: '⭐' },
    { id: 'duckrace', label: 'Đua Vịt', icon: '🦆' },
    { id: 'luckywheel', label: 'Vòng Quay', icon: '🎡' },
    { id: 'rewards', label: 'Đổi Thưởng', icon: '🎁' },
    { id: 'timer', label: 'Đếm Giờ', icon: '⏱️' },
  ];

  return (
    <>
      <header className="navbar-container" style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--surface-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Logo & Brand: Tin Học Tiểu Học */}
          <div 
            onClick={() => onSelectTab('home')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}
            title="Về Trang Chủ Tin Học EduICT"
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
            }}>
              <Monitor size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                  EduICT
                </span>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)'
                }}>
                  TIN HỌC TIỂU HỌC
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Phòng máy 31 máy • 5 Khối lớp ({classes.length} lớp học)
              </p>
            </div>
          </div>

          {/* Selector 5 Khối Lớp & Lớp Học */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Bộ chuyển nhanh 5 Khối */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--surface-secondary)',
              padding: '0.2rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--surface-border)'
            }}>
              <button
                type="button"
                onClick={() => handleFilterGradeChange('all')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: selectedGradeFilter === 'all' ? 'var(--primary)' : 'transparent',
                  color: selectedGradeFilter === 'all' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Tất Cả
              </button>
              {[1, 2, 3, 4, 5].map(g => {
                const isActive = selectedGradeFilter === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleFilterGradeChange(g)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Xem các lớp Khối ${g}`}
                  >
                    K{g}
                  </button>
                );
              })}
            </div>

            {/* Dropdown Lớp thuộc Khối */}
            <div style={{ position: 'relative' }}>
              <select 
                value={currentClass?.id} 
                onChange={(e) => onSelectClass(e.target.value)}
                className="input-field"
                style={{
                  fontWeight: 700,
                  paddingRight: '2rem',
                  cursor: 'pointer',
                  minWidth: 155,
                  background: 'var(--surface-secondary)',
                  borderColor: 'var(--primary)'
                }}
              >
                {classesInSelectedGrade.length === 0 ? (
                  <option value="">Chưa có lớp Khối {selectedGradeFilter}</option>
                ) : (
                  classesInSelectedGrade.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.students?.length || 0} HS)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Nút Thêm Lớp */}
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setShowAddModal(true)}
              title="Thêm hoặc quản lý các lớp học"
            >
              <PlusCircle size={16} />
              <span>Thêm Lớp</span>
            </button>

            {/* Nút Xóa Lớp */}
            <button 
              className="btn btn-outline btn-sm"
              style={{ 
                color: '#ef4444', 
                borderColor: 'rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.05)'
              }}
              onClick={() => onDeleteClass?.(currentClass?.id)}
              title={`Xóa ${currentClass?.name || 'lớp này'}`}
            >
              <Trash2 size={16} />
            </button>

            {/* Nút CSDL SQL & Sao lưu */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowBackupModal(true)}
              title="Cơ sở dữ liệu SQLite & Xuất file SQL"
              style={{
                borderColor: 'rgba(2, 132, 199, 0.4)',
                background: 'rgba(2, 132, 199, 0.06)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Database size={15} color="var(--primary)" />
              <span>CSDL SQL</span>
              <span 
                style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: dbStatus?.connected !== false ? '#10b981' : '#f59e0b',
                  boxShadow: dbStatus?.connected !== false ? '0 0 6px #10b981' : 'none'
                }} 
                title={dbStatus?.connected !== false ? 'Đã kết nối edumaster.sqlite' : 'Đang kết nối'}
              />
            </button>
          </div>

          {/* Tiện ích toàn cục: Âm thanh & Máy chiếu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={onToggleSound}
              className={`btn btn-sm ${soundEnabled ? 'btn-secondary' : 'btn-outline'}`}
              title={soundEnabled ? 'Đang bật âm thanh' : 'Đang tắt âm thanh'}
            >
              {soundEnabled ? <Volume2 size={18} color="var(--primary)" /> : <VolumeX size={18} color="var(--text-dim)" />}
              <span>{soundEnabled ? 'Âm thanh' : 'Tắt tiếng'}</span>
            </button>

            <button 
              onClick={onToggleProjector}
              className={`btn btn-sm ${isProjector ? 'btn-amber pulse-card' : 'btn-secondary'}`}
              title="Chế độ Máy chiếu (Chữ to, tương phản cao trên màn hình lớn phòng tin học)"
            >
              <Tv size={18} />
              <span>{isProjector ? 'Máy chiếu: BẬT' : 'Máy chiếu'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0.25rem 1.25rem 0.5rem',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.95rem',
                  fontSize: '0.9375rem',
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  background: isActive 
                    ? 'var(--primary-light)' 
                    : (tab.highlight ? 'rgba(2, 132, 199, 0.1)' : 'transparent'),
                  color: isActive 
                    ? 'var(--primary)' 
                    : (tab.highlight ? '#0284c7' : 'var(--text-muted)'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.highlight && (
                  <span style={{
                    fontSize: '0.625rem',
                    background: '#0284c7',
                    color: '#fff',
                    padding: '0.1rem 0.35rem',
                    borderRadius: 6,
                    fontWeight: 800
                  }}>
                    CHÍNH
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Modal Quản Lý & Thêm Lớp Học (Sử dụng React Portal) */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540, width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                🏫 Thêm & Quản Lý Lớp Tin Học
              </h3>
              <button 
                className="btn btn-sm btn-outline" 
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Form Thêm Lớp Mới với Khối 1 - 5 */}
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
                <span>📋 Danh Sách Lớp ({classes.length} lớp học)</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Tối thiểu 1 lớp</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                {classes.map(c => {
                  const isCurrent = c.id === currentClass?.id;
                  const g = c.grade || detectGradeFromName(c.name);
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
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: isCurrent ? 'var(--primary)' : 'var(--text-main)' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {c.subject || 'Tin Học'} • {c.students?.length || 0} học sinh
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
    </>
  );
}
