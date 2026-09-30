import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Play,
  Pencil,
  Save,
  RotateCcw,
  AlertTriangle,
  UserCog
} from 'lucide-react';
import {
  PERIOD_SLOTS,
  getCurrentPeriodStatus,
  formatTimeCountdown,
  getActiveTeacherInfo,
  getActiveTimetable,
  getDefaultTimetable,
  setActiveTimetable,
  setActiveTeacherInfo,
  abbreviateSubject,
  detectTimetableConflicts,
  hasBlockingConflicts
} from '../../utils/timetable';
import { saveTimetableToSqlite, saveTeacherProfileToSqlite } from '../../utils/storage';

const cloneGrid = (g) => JSON.parse(JSON.stringify(g));

function detectGradeFromClassName(name) {
  if (!name) return null;
  const m = String(name).match(/\d/);
  return m ? Number(m[0]) : null;
}

export default function TimetableModal({
  isOpen,
  onClose,
  classes = [],
  onSelectClassForSession = null // (className, grade) => void
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [periodStatus, setPeriodStatus] = useState(() => getCurrentPeriodStatus(new Date()));
  const [editMode, setEditMode] = useState(false);
  const [grid, setGrid] = useState(() => cloneGrid(getActiveTimetable()));
  const [teacher, setTeacher] = useState(() => ({ ...getActiveTeacherInfo() }));
  const [conflicts, setConflicts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type:'success'|'error', text }
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [teacherDraft, setTeacherDraft] = useState(() => ({ ...getActiveTeacherInfo() }));

  // Cập nhật đồng hồ thời gian thực mỗi 1 giây
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setPeriodStatus(getCurrentPeriodStatus(now));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Khi mở modal: nạp lại TKB & hồ sơ GV đang áp dụng, thoát chế độ sửa
  useEffect(() => {
    if (!isOpen) return;
    setGrid(cloneGrid(getActiveTimetable()));
    setTeacher({ ...getActiveTeacherInfo() });
    setEditMode(false);
    setShowTeacherForm(false);
    setConflicts([]);
    setSaveMsg(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDay = currentTime.getDay(); // 1..5

  const days = [
    { day: 1, name: 'THỨ HAI' },
    { day: 2, name: 'THỨ BA' },
    { day: 3, name: 'THỨ TƯ' },
    { day: 4, name: 'THỨ NĂM' },
    { day: 5, name: 'THỨ SÁU' }
  ];

  const morningSlots = PERIOD_SLOTS.filter(s => s.session === 'morning' && !s.isRecess);
  const afternoonSlots = PERIOD_SLOTS.filter(s => s.session === 'afternoon' && !s.isRecess);

  // Danh sách lớp cho ô chọn (từ prop classes; loại trùng tên)
  const classOptions = [];
  const seenNames = new Set();
  for (const c of (classes || [])) {
    const nm = (c && c.name ? c.name : '').trim();
    if (nm && !seenNames.has(nm)) {
      seenNames.add(nm);
      classOptions.push({ name: nm, grade: c.grade ?? detectGradeFromClassName(nm) });
    }
  }

  const recomputeConflicts = (g) => {
    const found = detectTimetableConflicts(g);
    setConflicts(found);
    return found;
  };

  const handleCellChange = (dayNum, session, period, value) => {
    setGrid(prev => {
      const next = cloneGrid(prev);
      if (!next[dayNum] || !next[dayNum][session]) return prev;
      let newCell;
      if (value === '') {
        newCell = null;
      } else if (value === '__off__') {
        newCell = { isOff: true, note: 'Nghỉ' };
      } else {
        const found = classOptions.find(c => c.name === value);
        newCell = {
          subject: (teacher.subject || 'Tin học'),
          className: value,
          grade: found?.grade ?? detectGradeFromClassName(value)
        };
      }
      next[dayNum][session][period] = newCell;
      recomputeConflicts(next);
      return next;
    });
    setSaveMsg(null);
  };

  const handleSaveTimetable = async () => {
    const found = recomputeConflicts(grid);
    if (hasBlockingConflicts(found)) {
      setSaveMsg({ type: 'error', text: 'Không thể lưu: thời khóa biểu đang có xung đột nghiêm trọng (ô viền đỏ).' });
      return;
    }
    setSaving(true);
    const res = await saveTimetableToSqlite(grid);
    setSaving(false);
    if (res.success) {
      setActiveTimetable(grid);
      setPeriodStatus(getCurrentPeriodStatus(new Date()));
      setEditMode(false);
      setSaveMsg({ type: 'success', text: '✅ Đã lưu thời khóa biểu.' });
    } else {
      if (Array.isArray(res.conflicts) && res.conflicts.length > 0) {
        setConflicts(res.conflicts.map(c => ({ ...c, severity: 'error' })));
      }
      setSaveMsg({ type: 'error', text: res.error || 'Lưu thất bại.' });
    }
  };

  const handleResetTimetable = () => {
    const def = cloneGrid(getDefaultTimetable());
    setGrid(def);
    recomputeConflicts(def);
    setSaveMsg({ type: 'success', text: 'Đã khôi phục TKB mặc định (chưa lưu — bấm "Lưu TKB" để áp dụng).' });
  };

  const handleCancelEdit = () => {
    setGrid(cloneGrid(getActiveTimetable()));
    setEditMode(false);
    setConflicts([]);
    setSaveMsg(null);
  };

  const openTeacherForm = () => {
    setTeacherDraft({ ...teacher });
    setShowTeacherForm(true);
    setSaveMsg(null);
  };

  const handleSaveTeacher = async () => {
    if (!teacherDraft.name || !teacherDraft.name.trim()) {
      setSaveMsg({ type: 'error', text: 'Tên giáo viên không được để trống.' });
      return;
    }
    setSaving(true);
    const res = await saveTeacherProfileToSqlite(teacherDraft);
    setSaving(false);
    if (res.success) {
      const saved = res.profile || teacherDraft;
      setActiveTeacherInfo(saved);
      setTeacher(saved);
      setShowTeacherForm(false);
      setSaveMsg({ type: 'success', text: '✅ Đã lưu hồ sơ giáo viên.' });
    } else {
      setSaveMsg({ type: 'error', text: res.error || 'Lưu hồ sơ thất bại.' });
    }
  };

  const blocking = hasBlockingConflicts(conflicts);
  const warnings = conflicts.filter(c => c && c.severity === 'warning');
  const errors = conflicts.filter(c => c && c.severity === 'error');

  // Ô nào thuộc xung đột nghiêm trọng? (để tô viền đỏ)
  const conflictClassDays = new Set();
  const conflictSlots = new Set();
  for (const c of errors) {
    if (c.type === 'CLASS_SAME_DAY') conflictClassDays.add(`${c.className}|${c.day}`);
    if (c.type === 'SLOT_COLLISION') conflictSlots.add(`${c.day}|${c.session}|${c.period}`);
  }

  const isConflictCell = (cell, dayNum, session, period) => {
    if (!cell || cell.isOff) return false;
    if (conflictSlots.has(`${dayNum}|${session}|${period}`)) return true;
    if (cell.className && conflictClassDays.has(`${cell.className}|${dayNum}`)) return true;
    return false;
  };

  const renderCellContent = (cell, slot, session, dayNum) => {
    if (editMode) {
      const value = cell && cell.isOff ? '__off__' : (cell && cell.className ? cell.className : '');
      const knownValue = value === '' || value === '__off__' || classOptions.some(c => c.name === value);
      const bad = isConflictCell(cell, dayNum, session, slot.period);
      return (
        <select
          value={value}
          onChange={(e) => handleCellChange(dayNum, session, slot.period, e.target.value)}
          style={{
            width: '100%',
            fontSize: '0.75rem',
            padding: '0.3rem 0.2rem',
            borderRadius: 6,
            border: bad ? '2px solid #ef4444' : '1px solid var(--surface-border)',
            background: bad ? 'rgba(239,68,68,0.08)' : 'var(--surface-card)',
            color: 'var(--text-main)',
            fontWeight: 700
          }}
        >
          <option value="">— Trống —</option>
          {classOptions.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
          {!knownValue && <option value={value}>{value} (hiện tại)</option>}
          <option value="__off__">Nghỉ</option>
        </select>
      );
    }

    if (cell && !cell.isOff) {
      return (
        <div
          onClick={() => {
            if (onSelectClassForSession) {
              onSelectClassForSession(cell.className, cell.grade, slot);
              onClose();
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)';
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = 'transparent';
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            cursor: 'pointer',
            padding: '0.35rem 0.25rem',
            borderRadius: '8px',
            transition: 'all 0.15s ease'
          }}
          title={`Môn ${cell.subject} • 👉 Nhấp để chọn Lớp ${cell.className} & mở danh sách bài học ngay`}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }} title={cell.subject}>
            {abbreviateSubject(cell.subject)}
          </span>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 800,
            color: '#1e40af',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
            padding: '0.2rem 0.6rem',
            borderRadius: '6px'
          }}>
            Lớp {cell.className}
          </span>
        </div>
      );
    }

    if (cell && cell.isOff) {
      return (
        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          {cell.note || 'Nghỉ'}
        </span>
      );
    }

    return <span style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>-</span>;
  };

  return typeof document !== 'undefined' && createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 1080,
          width: '96%',
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: '1.75rem',
          position: 'relative'
        }}
      >
        {/* Nút đóng góc trên */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline btn-sm"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10, padding: '0.35rem 0.65rem' }}
        >
          <X size={18} />
        </button>

        {/* Tiêu đề Thời khóa biểu */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.25rem 0.85rem', borderRadius: '999px',
            background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.25)',
            color: '#0284c7', fontSize: '0.8125rem', fontWeight: 800, marginBottom: '0.4rem'
          }}>
            <Calendar size={15} />
            <span>NĂM HỌC {teacher.schoolYear} • ÁP DỤNG TỪ {teacher.effectiveDate}</span>
          </div>

          <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-main)' }}>
            LỊCH GIẢNG DẠY CÁ NHÂN
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {teacher.role ? `${teacher.role}: ` : 'Giáo viên: '}
            <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{teacher.name} ({teacher.shortName})</span> • Môn {teacher.subject}
            {teacher.status === 'inactive' && (
              <span style={{
                marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#6b7280',
                background: 'rgba(107,114,128,0.15)', padding: '0.1rem 0.5rem', borderRadius: '999px'
              }}>Ngưng hoạt động</span>
            )}
          </p>
        </div>
        {/* Thanh công cụ: chỉnh sửa TKB & hồ sơ giáo viên */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.85rem' }}>
          {!editMode ? (
            <>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setEditMode(true); recomputeConflicts(grid); setSaveMsg(null); }} style={{ fontWeight: 800 }}>
                <Pencil size={14} /> Sửa Thời Khóa Biểu
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={openTeacherForm} style={{ fontWeight: 800 }}>
                <UserCog size={14} /> Sửa Hồ Sơ Giáo Viên
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={saving || blocking} onClick={handleSaveTimetable}
                style={{ fontWeight: 800, opacity: (saving || blocking) ? 0.55 : 1, cursor: (saving || blocking) ? 'not-allowed' : 'pointer' }}
                title={blocking ? 'Còn xung đột nghiêm trọng — hãy sửa trước khi lưu' : 'Lưu thời khóa biểu'}>
                <Save size={14} /> {saving ? 'Đang lưu…' : 'Lưu TKB'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleResetTimetable} style={{ fontWeight: 700 }}>
                <RotateCcw size={14} /> Khôi phục mặc định
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit} style={{ fontWeight: 700 }}>
                Hủy
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                Chọn lớp cho từng ô. Hệ thống tự phát hiện xung đột.
              </span>
            </>
          )}
        </div>

        {/* Thông báo lưu */}
        {saveMsg && (
          <div style={{
            marginBottom: '0.85rem', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-lg)',
            fontSize: '0.85rem', fontWeight: 700, textAlign: 'center',
            background: saveMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${saveMsg.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color: saveMsg.type === 'error' ? '#b91c1c' : '#047857'
          }}>
            {saveMsg.text}
          </div>
        )}

        {/* Bảng xung đột */}
        {conflicts.length > 0 && (
          <div style={{
            marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
            background: errors.length ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${errors.length ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: errors.length ? '#b91c1c' : '#b45309', marginBottom: '0.35rem' }}>
              <AlertTriangle size={16} />
              {errors.length ? `${errors.length} xung đột nghiêm trọng (chặn lưu)` : `${warnings.length} cảnh báo`}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
              {errors.map((c, i) => <li key={`e${i}`} style={{ color: '#b91c1c' }}>{c.message}</li>)}
              {warnings.map((c, i) => <li key={`w${i}`} style={{ color: '#b45309' }}>{c.message}</li>)}
            </ul>
          </div>
        )}
        {/* Biểu mẫu chỉnh sửa hồ sơ giáo viên */}
        {showTeacherForm && (
          <div style={{
            marginBottom: '1rem', padding: '1rem 1.15rem', borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-muted, rgba(148,163,184,0.08))', border: '1px solid var(--surface-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              <UserCog size={16} /> Chỉnh sửa hồ sơ giáo viên
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
              {[
                { key: 'name', label: 'Họ và tên', ph: 'Nguyễn Văn A' },
                { key: 'shortName', label: 'Tên hiển thị ngắn', ph: 'Văn A' },
                { key: 'subject', label: 'Môn giảng dạy', ph: 'Tin học' },
                { key: 'role', label: 'Chức danh', ph: 'Giáo viên bộ môn' },
                { key: 'effectiveDate', label: 'Áp dụng từ', ph: '05/09/2026' },
                { key: 'schoolYear', label: 'Năm học', ph: '2026 - 2027' }
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {f.label}
                  <input
                    type="text"
                    value={teacherDraft[f.key] || ''}
                    placeholder={f.ph}
                    onChange={(e) => setTeacherDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem' }}
                  />
                </label>
              ))}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Trạng thái
                <select
                  value={teacherDraft.status === 'inactive' ? 'inactive' : 'active'}
                  onChange={(e) => setTeacherDraft(prev => ({ ...prev, status: e.target.value }))}
                  style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngưng hoạt động</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={handleSaveTeacher} style={{ fontWeight: 800 }}>
                <Save size={14} /> {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTeacherForm(false)} style={{ fontWeight: 700 }}>
                Hủy
              </button>
            </div>
          </div>
        )}
        {/* Banner Trạng Thái Thời Gian Thực (Live Real-time Period Tracker) */}
        <div style={{
          background: periodStatus.isTeachingNow
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))'
            : periodStatus.status === 'RECESS'
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(79, 70, 229, 0.03))',
          border: `1.5px solid ${periodStatus.isTeachingNow ? '#10b981' : periodStatus.status === 'RECESS' ? '#f59e0b' : 'rgba(99, 102, 241, 0.25)'}`,
          borderRadius: 'var(--radius-xl)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              background: periodStatus.isTeachingNow ? 'rgba(16, 185, 129, 0.2)' : periodStatus.status === 'RECESS' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              color: periodStatus.isTeachingNow ? '#10b981' : periodStatus.status === 'RECESS' ? '#d97706' : '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
            }}>
              {periodStatus.isTeachingNow ? '🏫' : periodStatus.status === 'RECESS' ? '☕' : periodStatus.status === 'LUNCH_BREAK' ? '🍱' : '⏱'}
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem', fontWeight: 800,
                color: periodStatus.isTeachingNow ? '#059669' : periodStatus.status === 'RECESS' ? '#d97706' : 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                {periodStatus.isTeachingNow ? '🟢 ĐANG TRONG TIẾT DẠY (THỜI GIAN THỰC)'
                  : periodStatus.status === 'RECESS' ? '☕ GIỜ RA CHƠI'
                  : periodStatus.status === 'LUNCH_BREAK' ? '🍱 NGHỈ TRƯA BÁN TRÚ'
                  : '📅 THEO DÕI TIẾT DẠY'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                {periodStatus.dayName} • {periodStatus.label}
                {periodStatus.className && (
                  <span style={{ color: 'var(--primary)', marginLeft: '0.4rem' }}>({periodStatus.className})</span>
                )}
              </div>
            </div>
          </div>
          {/* Đồng hồ đếm ngược số phút còn lại */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--surface-card)', padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {periodStatus.isTeachingNow ? 'TIẾT HỌC CÒN' : 'THỜI GIAN'}
              </div>
              <div style={{
                fontSize: '1.35rem', fontWeight: 900,
                color: periodStatus.isTeachingNow ? '#10b981' : periodStatus.status === 'RECESS' ? '#d97706' : 'var(--primary)',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {periodStatus.isTeachingNow || periodStatus.status === 'RECESS'
                  ? formatTimeCountdown(periodStatus.remainingSec)
                  : currentTime.toLocaleTimeString('vi-VN')}
              </div>
            </div>
            {periodStatus.isTeachingNow && onSelectClassForSession && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onSelectClassForSession(periodStatus.className, periodStatus.grade, periodStatus.slot);
                  onClose();
                }}
                style={{ fontWeight: 800, fontSize: '0.8125rem', background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.45rem 0.85rem' }}
              >
                <Play size={14} fill="#fff" />
                Vào Dạy Ngay
              </button>
            )}
          </div>
        </div>
        {/* Bảng Thời Khóa Biểu Chuẩn */}
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-secondary)', borderBottom: '2px solid var(--surface-border)' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 800, width: 65 }}>Buổi</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 800, width: 50 }}>Tiết</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 800, width: 120 }}>Thời gian</th>
                {days.map(d => {
                  const isToday = d.day === currentDay;
                  return (
                    <th key={d.day} style={{
                      padding: '0.75rem 0.5rem', fontWeight: 800,
                      background: isToday ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                      color: isToday ? '#0284c7' : 'var(--text-main)',
                      borderLeft: '1px solid var(--surface-border)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>{d.name}</span>
                        {isToday && (
                          <span style={{
                            fontSize: '0.6875rem', fontWeight: 800, color: '#0284c7',
                            background: 'rgba(2, 132, 199, 0.15)', padding: '0.1rem 0.45rem',
                            borderRadius: '999px', marginTop: '0.15rem'
                          }}>Hôm nay</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* --- 1. BUỔI SÁNG --- */}
              {morningSlots.map((slot, idx) => (
                <tr key={slot.id} style={{
                  borderBottom: '1px solid var(--surface-border)',
                  background: idx % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-secondary)'
                }}>
                  {idx === 0 && (
                    <td rowSpan={4} style={{
                      fontWeight: 900, fontSize: '1rem', background: 'rgba(245, 158, 11, 0.08)',
                      color: '#d97706', borderRight: '1px solid var(--surface-border)', verticalAlign: 'middle'
                    }}>SÁNG</td>
                  )}
                  <td style={{ fontWeight: 800, borderRight: '1px solid var(--surface-border)' }}>{slot.period}</td>
                  <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', borderRight: '1px solid var(--surface-border)' }}>
                    {slot.startTime} - {slot.endTime}
                  </td>
                  {days.map(d => {
                    const cell = grid?.[d.day]?.morning?.[slot.period];
                    const isNow = d.day === currentDay && periodStatus.session === 'morning' && periodStatus.period === slot.period;
                    const bad = editMode && isConflictCell(cell, d.day, 'morning', slot.period);
                    return (
                      <td key={d.day} style={{
                        padding: '0.6rem 0.4rem', borderLeft: '1px solid var(--surface-border)',
                        background: bad ? 'rgba(239,68,68,0.12)' : isNow ? 'rgba(16, 185, 129, 0.15)' : d.day === currentDay ? 'rgba(2, 132, 199, 0.04)' : 'transparent',
                        outline: bad ? '2px solid #ef4444' : isNow ? '2px solid #10b981' : 'none', outlineOffset: -2
                      }}>
                        {renderCellContent(cell, slot, 'morning', d.day)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* --- NGHỈ TRƯA BÁN TRÚ --- */}
              <tr style={{ background: 'rgba(99, 102, 241, 0.05)', borderBottom: '2px solid var(--surface-border)' }}>
                <td colSpan={8} style={{ padding: '0.6rem', fontWeight: 800, color: '#6366f1', fontSize: '0.8125rem' }}>
                  🍱 NGHỈ TRƯA BÁN TRÚ (10:15 / 10:30 - 14:00)
                </td>
              </tr>
              {/* --- 2. BUỔI CHIỀU --- */}
              {afternoonSlots.map((slot, idx) => (
                <tr key={slot.id} style={{
                  borderBottom: '1px solid var(--surface-border)',
                  background: idx % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-secondary)'
                }}>
                  {idx === 0 && (
                    <td rowSpan={3} style={{
                      fontWeight: 900, fontSize: '1rem', background: 'rgba(99, 102, 241, 0.08)',
                      color: '#4f46e5', borderRight: '1px solid var(--surface-border)', verticalAlign: 'middle'
                    }}>CHIỀU</td>
                  )}
                  <td style={{ fontWeight: 800, borderRight: '1px solid var(--surface-border)' }}>{slot.period}</td>
                  <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', borderRight: '1px solid var(--surface-border)' }}>
                    {slot.startTime} - {slot.endTime}
                  </td>
                  {days.map(d => {
                    const cell = grid?.[d.day]?.afternoon?.[slot.period];
                    const isNow = d.day === currentDay && periodStatus.session === 'afternoon' && periodStatus.period === slot.period;
                    const bad = editMode && isConflictCell(cell, d.day, 'afternoon', slot.period);
                    return (
                      <td key={d.day} style={{
                        padding: '0.6rem 0.4rem', borderLeft: '1px solid var(--surface-border)',
                        background: bad ? 'rgba(239,68,68,0.12)' : isNow ? 'rgba(16, 185, 129, 0.15)' : d.day === currentDay ? 'rgba(2, 132, 199, 0.04)' : 'transparent',
                        outline: bad ? '2px solid #ef4444' : isNow ? '2px solid #10b981' : 'none', outlineOffset: -2
                      }}>
                        {renderCellContent(cell, slot, 'afternoon', d.day)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer Ghi chú & Nút đóng */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem',
          borderTop: '1px solid var(--surface-border)', fontSize: '0.8125rem', color: 'var(--text-muted)'
        }}>
          <div>
            💡 <em>Mẹo: Nhấp vào ô lớp để mở nhanh danh sách bài học. Bật &quot;Sửa TKB&quot; để chỉnh sửa &amp; lưu thời khóa biểu; hệ thống tự phát hiện xung đột.</em>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Đóng Bảng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
