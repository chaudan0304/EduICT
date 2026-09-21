import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  PlusCircle, 
  Search, 
  FileSpreadsheet, 
  Sparkles, 
  Trophy, 
  Calendar, 
  User, 
  UserPlus,
  Users,
  Trash2, 
  Star, 
  CheckCircle2, 
  Heart,
  TrendingUp,
  Tag,
  AlertTriangle,
  Edit2,
  Settings,
  RotateCcw,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Plus,
  Minus,
  Check,
  Flame,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { soundEffects } from '../utils/audio';
import { 
  getClassroomRules, 
  saveClassroomRules, 
  resetClassroomRulesToDefault,
  fetchClassroomRulesFromSqlite,
  syncClassroomRulesToSqlite,
  DEFAULT_CLASSROOM_RULES,
  sortStudentsVietnamese
} from '../utils/storage';

const QUICK_EMOJIS = ['🎯', '💻', '🤝', '💡', '🛡️', '🏆', '🎮', '🧃', '🪑', '📢', '🔌', '🧹', '⭐', '⚠️', '❌', '👍'];

export default function GoodScoresBoard({ 
  currentClass, 
  onUpdateStudents, 
  onUpdateGoodScores,
  onOpenExchangeModal,
  soundEnabled 
}) {
  const students = currentClass?.students || [];

  // Quản lý danh sách Nội quy phòng máy & Tiêu chí cộng/trừ điểm
  const [rules, setRules] = useState(() => getClassroomRules());

  // Đồng bộ nội quy từ SQLite khi khởi động
  useEffect(() => {
    async function loadSqliteRules() {
      const fromDb = await fetchClassroomRulesFromSqlite();
      if (fromDb && Array.isArray(fromDb) && fromDb.length > 0) {
        setRules(fromDb);
        saveClassroomRules(fromDb);
      }
    }
    loadSqliteRules();
  }, []);

  // Lưu nội quy khi có thay đổi (đồng bộ cả LocalStorage và SQLite)
  const handleSaveRules = (updatedRules) => {
    setRules(updatedRules);
    saveClassroomRules(updatedRules);
    syncClassroomRulesToSqlite(updatedRules);
  };

  // Danh sách nhật ký điểm tốt & điểm trừ của lớp đang chọn (khởi tạo rỗng hoặc từ goodScores của lớp)
  const [meritRecords, setMeritRecords] = useState(() => {
    return Array.isArray(currentClass?.goodScores) ? currentClass.goodScores : [];
  });

  // Đồng bộ khi đổi lớp: cập nhật ngay danh sách nhật ký của lớp mới và reset ô tìm kiếm
  useEffect(() => {
    setMeritRecords(Array.isArray(currentClass?.goodScores) ? currentClass.goodScores : []);
    setSearchTerm('');
  }, [currentClass?.id]);

  // Cập nhật khi goodScores của lớp hiện tại thay đổi từ bên ngoài (tiết học, sơ đồ chỗ ngồi, v.v.)
  useEffect(() => {
    if (currentClass?.goodScores) {
      setMeritRecords(Array.isArray(currentClass.goodScores) ? currentClass.goodScores : []);
    }
  }, [currentClass?.goodScores]);

  const saveMerits = (records) => {
    setMeritRecords(records);
    onUpdateGoodScores?.(records, currentClass?.id);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all'); // 'all' | 'positive' | 'negative'
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'history' | 'rules'

  // Modal ghi nhận điểm tốt / điểm trừ
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    studentId: students[0]?.id || '',
    type: 'positive', // 'positive' | 'negative'
    ruleId: '',
    title: '',
    points: 1,
    note: ''
  });

  // Khi danh sách học sinh thay đổi do đổi lớp, cập nhật lại học sinh mặc định trong form
  useEffect(() => {
    if (students && students.length > 0 && !students.some(s => s.id === newRecord.studentId)) {
      setNewRecord(prev => ({ ...prev, studentId: students[0].id }));
    }
  }, [students]);

  // Modal tạo / chỉnh sửa nội quy
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // null: tạo mới, object: chỉnh sửa
  const [ruleForm, setRuleForm] = useState({
    type: 'positive',
    title: '',
    points: 1,
    icon: '🎯',
    category: 'Thái độ',
    description: ''
  });

  // Modal Bổ Sung Học Sinh Mới Nếu Thiếu
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    gender: 'Nam',
    machineNumber: '',
    dob: '',
    stars: 0,
    note: ''
  });

  // Mở modal bổ sung học sinh (tự động gợi ý số máy trống)
  const handleOpenAddStudent = () => {
    const usedMachines = new Set(students.map(s => s.machineNumber).filter(Boolean));
    let suggestedMachine = 1;
    while (usedMachines.has(suggestedMachine) && suggestedMachine <= 45) {
      suggestedMachine++;
    }
    setStudentForm({
      name: '',
      gender: 'Nam',
      machineNumber: suggestedMachine <= 45 ? suggestedMachine : '',
      dob: '',
      stars: 0,
      note: ''
    });
    setShowAddStudentModal(true);
  };

  // Lưu học sinh mới bổ sung vào lớp
  const handleAddStudentSubmit = (e) => {
    e.preventDefault();
    if (!studentForm.name.trim()) return;

    let nextNum = 1;
    students.forEach(s => {
      const match = (s.id || '').match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });
    if (students.length === 0) {
      const g = currentClass?.grade || 3;
      nextNum = g * 100 + 1;
    }
    const nextId = `HS${String(nextNum).padStart(3, '0')}`;

    const studentToAdd = {
      id: nextId,
      name: studentForm.name.trim(),
      gender: studentForm.gender || 'Nam',
      dob: studentForm.dob?.trim() || '',
      machineNumber: parseInt(studentForm.machineNumber, 10) || null,
      stars: Math.max(0, parseInt(studentForm.stars, 10) || 0),
      attendance: 'present',
      skill_mouse: 'T',
      skill_keyboard: 'H',
      skill_paint: 'T',
      eval_regular: 'T',
      score_hk1: null,
      score_ck: null,
      note: studentForm.note?.trim() || ''
    };

    const updatedStudents = sortStudentsVietnamese([...students, studentToAdd]);
    onUpdateStudents?.(updatedStudents, currentClass?.id);

    // Tự động chọn học sinh vừa thêm trong form ghi nhận điểm
    setNewRecord(prev => ({
      ...prev,
      studentId: studentToAdd.id
    }));

    setShowAddStudentModal(false);
    if (soundEnabled) soundEffects.playStarDing?.();
  };


  // Mở modal tạo nội quy mới
  const handleOpenCreateRule = (defaultType = 'positive') => {
    setEditingRule(null);
    setRuleForm({
      type: defaultType,
      title: '',
      points: defaultType === 'positive' ? 2 : 1,
      icon: defaultType === 'positive' ? '⭐' : '⚠️',
      category: defaultType === 'positive' ? 'Khen thưởng' : 'Kỷ luật',
      description: ''
    });
    setShowRuleModal(true);
  };

  // Mở modal sửa nội quy đã có
  const handleOpenEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      type: rule.type,
      title: rule.title,
      points: rule.points,
      icon: rule.icon || (rule.type === 'positive' ? '⭐' : '⚠️'),
      category: rule.category || 'Chung',
      description: rule.description || ''
    });
    setShowRuleModal(true);
  };

  // Lưu nội quy (Thêm mới hoặc Cập nhật)
  const handleSaveRuleSubmit = (e) => {
    e.preventDefault();
    if (!ruleForm.title.trim()) return;

    if (editingRule) {
      // Cập nhật
      const updated = rules.map(r => {
        if (r.id === editingRule.id) {
          return {
            ...r,
            type: ruleForm.type,
            title: ruleForm.title.trim(),
            points: Math.max(1, parseInt(ruleForm.points, 10) || 1),
            icon: ruleForm.icon || (ruleForm.type === 'positive' ? '⭐' : '⚠️'),
            category: ruleForm.category.trim() || 'Chung',
            description: ruleForm.description.trim()
          };
        }
        return r;
      });
      handleSaveRules(updated);
    } else {
      // Thêm mới
      const newRuleObj = {
        id: `rule_${ruleForm.type === 'positive' ? 'pos' : 'neg'}_${Date.now()}`,
        type: ruleForm.type,
        title: ruleForm.title.trim(),
        points: Math.max(1, parseInt(ruleForm.points, 10) || 1),
        icon: ruleForm.icon || (ruleForm.type === 'positive' ? '⭐' : '⚠️'),
        category: ruleForm.category.trim() || 'Chung',
        description: ruleForm.description.trim()
      };
      handleSaveRules([...rules, newRuleObj]);
    }

    setShowRuleModal(false);
  };

  // Xóa 1 nội quy
  const handleDeleteRule = (ruleId) => {
    const target = rules.find(r => r.id === ruleId);
    if (!target) return;
    if (window.confirm(`Thầy/cô có chắc muốn xóa quy định "${target.title}"?`)) {
      const updated = rules.filter(r => r.id !== ruleId);
      handleSaveRules(updated);
    }
  };

  // Khôi phục nội quy mặc định
  const handleResetDefaultRules = () => {
    if (window.confirm('Khôi phục toàn bộ 12 nội quy mẫu chuẩn của phòng máy Tin học Tiểu học?')) {
      const reset = resetClassroomRulesToDefault();
      setRules(reset);
      syncClassroomRulesToSqlite(reset);
    }
  };

  // Danh sách nội quy phân loại
  const positiveRules = useMemo(() => rules.filter(r => r.type === 'positive'), [rules]);
  const negativeRules = useMemo(() => rules.filter(r => r.type === 'negative'), [rules]);

  // Tính tổng điểm tốt / sao thi đua cho từng học sinh
  const studentSummary = useMemo(() => {
    const map = {};
    students.forEach(s => {
      map[s.id] = {
        student: s,
        currentStars: s.stars || 0,
        positiveCount: 0,
        negativeCount: 0,
        lastRecord: null
      };
    });

    meritRecords.forEach(rec => {
      if (map[rec.studentId]) {
        if (rec.type === 'negative') {
          map[rec.studentId].negativeCount += 1;
        } else {
          map[rec.studentId].positiveCount += 1;
        }
        if (!map[rec.studentId].lastRecord || new Date(rec.date) >= new Date(map[rec.studentId].lastRecord.date)) {
          map[rec.studentId].lastRecord = rec;
        }
      }
    });

    return Object.values(map).sort((a, b) => b.currentStars - a.currentStars);
  }, [students, meritRecords]);

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const totalStars = students.reduce((acc, s) => acc + (s.stars || 0), 0);
    const totalPositiveEntries = meritRecords.filter(r => r.type !== 'negative').length;
    const totalNegativeEntries = meritRecords.filter(r => r.type === 'negative').length;
    const topStudent = studentSummary[0]?.currentStars > 0 ? studentSummary[0].student : null;

    return {
      totalStars,
      totalPositiveEntries,
      totalNegativeEntries,
      topStudent,
      topStars: studentSummary[0]?.currentStars || 0
    };
  }, [students, meritRecords, studentSummary]);

  // Thêm điểm tốt / điểm trừ
  const handleRecordSubmit = (e) => {
    e.preventDefault();
    if (!newRecord.studentId) return;

    const targetStudent = students.find(s => s.id === newRecord.studentId);
    if (!targetStudent) return;

    const pointsNum = Math.max(1, parseInt(newRecord.points, 10) || 1);
    const isPositive = newRecord.type === 'positive';

    let titleToSave = newRecord.title.trim();
    if (!titleToSave && newRecord.ruleId) {
      const selectedRule = rules.find(r => r.id === newRecord.ruleId);
      titleToSave = selectedRule ? `${selectedRule.icon} ${selectedRule.title}` : (isPositive ? 'Điểm tốt' : 'Điểm trừ');
    }
    if (!titleToSave) {
      titleToSave = isPositive ? 'Điểm tốt khen thưởng' : 'Nhắc nhở nội quy';
    }

    const rec = {
      id: `gs_${Date.now()}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      date: new Date().toISOString().slice(0, 10),
      type: newRecord.type,
      title: titleToSave,
      points: pointsNum,
      scoreChange: isPositive ? +pointsNum : -pointsNum,
      note: newRecord.note.trim()
    };

    saveMerits([rec, ...meritRecords]);

    // Cập nhật số sao của học sinh (không để âm)
    const updatedStudents = students.map(s => {
      if (s.id === targetStudent.id) {
        const cur = s.stars || 0;
        const nextStars = isPositive ? (cur + pointsNum) : Math.max(0, cur - pointsNum);
        return { ...s, stars: nextStars };
      }
      return s;
    });
    onUpdateStudents(updatedStudents);

    setShowAddModal(false);
    setNewRecord({
      studentId: students[0]?.id || '',
      type: 'positive',
      ruleId: '',
      title: '',
      points: 1,
      note: ''
    });

    if (soundEnabled) {
      if (isPositive) soundEffects.playVictory();
      else soundEffects.playBuzzer();
    }
  };

  // Nhanh: Thưởng 1 sao hoặc Trừ 1 sao từ bảng tổng kết
  const handleQuickAdjust = (student, isAdd = true) => {
    const rec = {
      id: `gs_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      date: new Date().toISOString().slice(0, 10),
      type: isAdd ? 'positive' : 'negative',
      title: isAdd ? '🎯 Khen thưởng phát biểu tích cực' : '⚠️ Nhắc nhở giữ trật tự phòng máy',
      points: 1,
      scoreChange: isAdd ? 1 : -1,
      note: isAdd ? 'Cộng điểm nhanh trong tiết học' : 'Trừ điểm nhắc nhở nhanh trong tiết học'
    };

    saveMerits([rec, ...meritRecords]);

    const updated = students.map(s => {
      if (s.id === student.id) {
        const cur = s.stars || 0;
        return { ...s, stars: isAdd ? cur + 1 : Math.max(0, cur - 1) };
      }
      return s;
    });
    onUpdateStudents(updated);

    if (soundEnabled) {
      if (isAdd) soundEffects.playStarDing();
      else soundEffects.playBuzzer();
    }
  };

  // Xóa 1 bản ghi nhật ký
  const handleDeleteRecord = (recordId) => {
    const recToDelete = meritRecords.find(r => r.id === recordId);
    if (!recToDelete) return;

    if (window.confirm(`Xóa bản ghi "${recToDelete.title}" của học sinh ${recToDelete.studentName}?`)) {
      saveMerits(meritRecords.filter(r => r.id !== recordId));
      // Hoàn tác số sao
      const updated = students.map(s => {
        if (s.id === recToDelete.studentId) {
          const cur = s.stars || 0;
          const delta = recToDelete.points || 1;
          const nextStars = recToDelete.type === 'positive' 
            ? Math.max(0, cur - delta) 
            : cur + delta;
          return { ...s, stars: nextStars };
        }
        return s;
      });
      onUpdateStudents(updated);
    }
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    const data = meritRecords.map((r, idx) => ({
      'STT': idx + 1,
      'Ngày': r.date,
      'Mã HS': r.studentId,
      'Họ và Tên': r.studentName,
      'Loại': r.type === 'positive' ? 'Điểm tốt / Khen thưởng (+)' : 'Điểm trừ / Nhắc nhở (-)',
      'Nội Quy / Lý Do': r.title,
      'Số Sao Thay Đổi': r.type === 'positive' ? `+${r.points}` : `-${r.points}`,
      'Ghi Chú': r.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DiemTot_DiemTru');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 24 },
      { wch: 24 },
      { wch: 36 },
      { wch: 18 },
      { wch: 35 },
    ];

    const fileName = `SoDiemTot_NoiQuy_${currentClass?.name || 'Lop'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Lọc nhật ký
  const filteredRecords = useMemo(() => {
    return meritRecords.filter(r => {
      const matchSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = historyTypeFilter === 'all' || r.type === historyTypeFilter;
      return matchSearch && matchType;
    });
  }, [meritRecords, searchTerm, historyTypeFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 4 Thẻ Thống Kê Điểm Tốt & Điểm Trừ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* Tổng Sao Cả Lớp */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.12)', color: '#d97706',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Star size={26} fill="currentColor" />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quỹ Sao Thi Đua Lớp</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706' }}>
              {stats.totalStars} ⭐
            </div>
          </div>
        </div>

        {/* Tổng Lượt Khen Thưởng (+) */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ThumbsUp size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Điểm Tốt Khen Thưởng</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              +{stats.totalPositiveEntries} lượt
            </div>
          </div>
        </div>

        {/* Tổng Lượt Nhắc Nhở (-) */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Điểm Trừ / Nhắc Nhở</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
              -{stats.totalNegativeEntries} lượt
            </div>
          </div>
        </div>

        {/* Kiện Tướng Dẫn Đầu */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Trophy size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Kiện Tướng Thi Đua</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.topStudent ? stats.topStudent.name : 'Chưa có'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
              {stats.topStars > 0 ? `${stats.topStars} ⭐ dẫn đầu` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Thanh Điều Hướng Tab & Hành Động Chính */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Bộ chuyển 3 Tab Chính */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--surface-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
              <button
                className="btn btn-sm"
                style={{
                  background: activeTab === 'summary' ? 'var(--surface)' : 'transparent',
                  color: activeTab === 'summary' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'summary' ? 'var(--shadow-sm)' : 'none',
                  fontWeight: activeTab === 'summary' ? 800 : 500
                }}
                onClick={() => setActiveTab('summary')}
              >
                📊 Bảng Thi Đua Lớp
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: activeTab === 'history' ? 'var(--surface)' : 'transparent',
                  color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none',
                  fontWeight: activeTab === 'history' ? 800 : 500
                }}
                onClick={() => setActiveTab('history')}
              >
                📜 Nhật Ký Điểm Tốt / Trừ ({meritRecords.length})
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: activeTab === 'rules' ? 'var(--surface)' : 'transparent',
                  color: activeTab === 'rules' ? '#0284c7' : 'var(--text-muted)',
                  boxShadow: activeTab === 'rules' ? 'var(--shadow-sm)' : 'none',
                  fontWeight: activeTab === 'rules' ? 800 : 500
                }}
                onClick={() => setActiveTab('rules')}
              >
                ⚖️ Nội Quy & Tiêu Chí ({rules.length})
              </button>
            </div>

            {/* Ô tìm kiếm cho Tab 1 & 2 */}
            {activeTab !== 'rules' && (
              <div style={{ position: 'relative', width: 240 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input 
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '2.2rem', paddingRight: '0.5rem', fontSize: '0.8125rem' }}
                  placeholder="Tìm tên học sinh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Các nút hành động chính */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button 
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleOpenAddStudent}
              title={`Bổ sung học sinh mới vào ${currentClass?.name || 'lớp'}`}
              style={{ fontWeight: 700, color: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              <UserPlus size={16} />
              <span>Bổ Sung Học Sinh</span>
            </button>

            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleExportExcel}
              title="Xuất dữ liệu ra file Excel"
            >
              <FileSpreadsheet size={16} color="#10b981" />
              <span>Xuất Excel</span>
            </button>

            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setActiveTab('rules')}
              title="Chỉnh sửa nội quy phòng máy và tiêu chí điểm"
              style={{
                borderColor: activeTab === 'rules' ? '#0284c7' : 'var(--surface-border)',
                color: activeTab === 'rules' ? '#0284c7' : 'var(--text-main)'
              }}
            >
              <Settings size={16} />
              <span>Chỉnh Sửa Nội Quy</span>
            </button>

            <button 
              className="btn btn-amber btn-sm pulse-card"
              onClick={() => {
                setNewRecord({
                  studentId: students[0]?.id || '',
                  type: 'positive',
                  ruleId: positiveRules[0]?.id || '',
                  title: '',
                  points: positiveRules[0]?.points || 1,
                  note: ''
                });
                setShowAddModal(true);
              }}
              style={{ fontWeight: 800 }}
            >
              <PlusCircle size={17} />
              <span>Ghi Nhận (+ / -)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: BẢNG THI ĐUA TỔNG KẾT CỦA LỚP */}
      {activeTab === 'summary' && (
        <div className="glass-panel" style={{ padding: '0.5rem', overflow: 'hidden' }}>
          <div className="table-container" style={{ maxHeight: '68vh' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>Hạng</th>
                  <th style={{ width: 85, textAlign: 'center' }}>Số Máy</th>
                  <th style={{ minWidth: 200 }}>Họ và Tên</th>
                  <th style={{ width: 140, textAlign: 'center', color: '#d97706' }}>Sao Thi Đua</th>
                  <th style={{ width: 120, textAlign: 'center', color: '#10b981' }}>Điểm Tốt (+)</th>
                  <th style={{ width: 120, textAlign: 'center', color: '#ef4444' }}>Điểm Trừ (-)</th>
                  <th style={{ minWidth: 240 }}>Lần Ghi Nhận Gần Nhất</th>
                  <th style={{ width: 190, textAlign: 'center' }}>Thao Tác Nhanh</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <Users size={42} style={{ opacity: 0.35, color: 'var(--primary)' }} />
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          Lớp {currentClass?.name || ''} hiện chưa có danh sách học sinh
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: 460 }}>
                          Thầy/cô có thể bổ sung từng học sinh mới ngay tại đây hoặc mở mục Sổ Điểm để nhập danh sách từ file Excel.
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenAddStudent}
                          style={{ marginTop: '0.5rem', fontWeight: 700 }}
                        >
                          <UserPlus size={16} />
                          <span>Bổ Sung Học Sinh Vào {currentClass?.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : studentSummary.filter(item => item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.student.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Không tìm thấy học sinh nào khớp với từ khóa "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  studentSummary
                    .filter(item => item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.student.id.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item, idx) => {
                      const s = item.student;
                      const isTop1 = idx === 0 && item.currentStars > 0;
                      const isTop2 = idx === 1 && item.currentStars > 0;
                      const isTop3 = idx === 2 && item.currentStars > 0;

                    return (
                      <tr key={s.id} style={{ background: isTop1 ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>
                          {isTop1 ? '🥇 1' : (isTop2 ? '🥈 2' : (isTop3 ? '🥉 3' : idx + 1))}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.8125rem', color: s.machineNumber ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                          {s.machineNumber ? `M.${s.machineNumber}` : '--'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: s.gender === 'Nữ' ? '#fdf2f8' : '#eff6ff',
                              color: s.gender === 'Nữ' ? '#db2777' : '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8125rem',
                              fontWeight: 700
                            }}>
                              {s.name.trim().split(' ').pop()?.[0] || 'H'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                {s.name}
                              </div>
                              {s.id && !String(s.id).startsWith('hs_') && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                                  Mã: {s.id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tổng Sao Hiện Có */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            background: (s.stars || 0) > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface-secondary)',
                            color: (s.stars || 0) > 0 ? '#d97706' : 'var(--text-dim)',
                            fontWeight: 800,
                            fontSize: '0.95rem'
                          }}>
                            {s.stars || 0} ⭐
                          </span>
                        </td>

                        {/* Số Lượt Khen Thưởng */}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                          +{item.positiveCount}
                        </td>

                        {/* Số Lượt Nhắc Nhở */}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: item.negativeCount > 0 ? '#ef4444' : 'var(--text-dim)' }}>
                          {item.negativeCount > 0 ? `-${item.negativeCount}` : '0'}
                        </td>

                        {/* Lần ghi gần nhất */}
                        <td>
                          {item.lastRecord ? (
                            <div style={{ fontSize: '0.8125rem' }}>
                              <span style={{
                                fontWeight: 700,
                                color: item.lastRecord.type === 'negative' ? '#ef4444' : '#10b981'
                              }}>
                                {item.lastRecord.title}
                              </span>
                              {item.lastRecord.note && (
                                <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                                  — "{item.lastRecord.note}"
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                              Chưa có ghi nhận
                            </span>
                          )}
                        </td>

                        {/* Thao Tác Nhanh */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ 
                                padding: '0.2rem 0.45rem', 
                                fontSize: '0.72rem', 
                                fontWeight: 800,
                                color: '#10b981',
                                borderColor: 'rgba(16, 185, 129, 0.35)',
                                background: 'rgba(16, 185, 129, 0.05)'
                              }}
                              onClick={() => handleQuickAdjust(s, true)}
                              title="Cộng nhanh 1 điểm tốt / sao"
                            >
                              +1 ⭐
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ 
                                padding: '0.2rem 0.45rem', 
                                fontSize: '0.72rem', 
                                fontWeight: 800,
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.35)',
                                background: 'rgba(239, 68, 68, 0.05)'
                              }}
                              onClick={() => handleQuickAdjust(s, false)}
                              title="Trừ nhanh 1 điểm nhắc nhở"
                            >
                              -1 ⭐
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}
                              onClick={() => {
                                setNewRecord({
                                  studentId: s.id,
                                  type: 'positive',
                                  ruleId: positiveRules[0]?.id || '',
                                  title: '',
                                  points: 1,
                                  note: ''
                                });
                                setShowAddModal(true);
                              }}
                              title="Mở bảng ghi nhận điểm theo nội quy"
                            >
                              ⚖️ Ghi điểm
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NHẬT KÝ CHI TIẾT TỪNG LƯỢT ĐIỂM TỐT & ĐIỂM TRỪ */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: '0.75rem', overflow: 'hidden' }}>
          {/* Bộ lọc loại nhật ký */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>Lọc nhật ký:</span>
            {[
              { id: 'all', label: 'Tất Cả' },
              { id: 'positive', label: '🟢 Điểm Tốt / Khen Thưởng (+)' },
              { id: 'negative', label: '🔴 Điểm Trừ / Nhắc Nhở (-)' },
            ].map(f => (
              <button
                key={f.id}
                className="btn btn-sm"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  background: historyTypeFilter === f.id ? 'var(--primary)' : 'var(--surface-secondary)',
                  color: historyTypeFilter === f.id ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: 700
                }}
                onClick={() => setHistoryTypeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="table-container" style={{ maxHeight: '65vh' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 105 }}>Ngày Ghi</th>
                  <th style={{ width: 85, textAlign: 'center' }}>Số Máy</th>
                  <th style={{ width: 190 }}>Học Sinh</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Loại</th>
                  <th style={{ minWidth: 240 }}>Nội Quy / Hoạt Động</th>
                  <th style={{ width: 110, textAlign: 'center' }}>Sao (+ / -)</th>
                  <th style={{ minWidth: 220 }}>Ghi Chú Của Thầy/Cô</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <Info size={32} style={{ opacity: 0.5, color: 'var(--text-muted)' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          Chưa có lượt điểm tốt hoặc điểm trừ nào cho {currentClass?.name || 'lớp này'}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {searchTerm || historyTypeFilter !== 'all' 
                            ? 'Không tìm thấy kết quả phù hợp với bộ lọc hiện tại.' 
                            : 'Thầy/cô có thể nhấn nút "Ghi Nhận (+ / -)" hoặc thưởng/nhắc nhở nhanh trong Bảng Thi Đua.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const isPos = record.type !== 'negative';
                    const targetStudent = students.find(s => s.id === record.studentId);
                    return (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {record.date}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.8125rem', color: targetStudent?.machineNumber ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                          {targetStudent?.machineNumber ? `M.${targetStudent.machineNumber}` : '--'}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          <div>{record.studentName}</div>
                          {record.studentId && !String(record.studentId).startsWith('hs_') && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                              Mã: {record.studentId}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: isPos ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isPos ? '#059669' : '#dc2626'
                          }}>
                            {isPos ? '🟢 Khen Thưởng' : '🔴 Điểm Trừ'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {record.title}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.9375rem',
                            color: isPos ? '#10b981' : '#ef4444'
                          }}>
                            {isPos ? `+${record.points}` : `-${record.points}`} ⭐
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {record.note ? `"${record.note}"` : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444', borderColor: 'transparent', padding: '0.2rem' }}
                            onClick={() => handleDeleteRecord(record.id)}
                            title="Xóa lượt này và hoàn lại sao"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: QUẢN LÝ & CHỈNH SỬA NỘI QUY PHÒNG MÁY */}
      {activeTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Thanh công cụ quản lý nội quy */}
          <div className="glass-panel" style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)'
          }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={20} color="var(--primary)" />
                Bảng Quy Định Nội Quy & Tiêu Chí Cộng/Trừ Điểm
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Thầy/cô có toàn quyền thêm quy định mới, chỉnh sửa tên, số sao thưởng/phạt hoặc khôi phục về mẫu chuẩn phòng Tin học.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleResetDefaultRules}
                title="Khôi phục về 12 nội quy mẫu chuẩn của phòng Tin học"
              >
                <RotateCcw size={14} />
                Đặt Lại Mẫu Chuẩn
              </button>

              <button 
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.35)' }}
                onClick={() => handleOpenCreateRule('negative')}
              >
                <Plus size={14} />
                Thêm Điểm Trừ (-)
              </button>

              <button 
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenCreateRule('positive')}
              >
                <Plus size={14} />
                Thêm Điểm Tốt (+)
              </button>
            </div>
          </div>

          {/* 2 Bảng: Quy định Điểm Tốt (+) và Điểm Trừ (-) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* CỘT 1: QUY ĐỊNH ĐIỂM TỐT / KHEN THƯỞNG (+) */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '2px solid rgba(16, 185, 129, 0.25)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ThumbsUp size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#065f46' }}>
                      Tiêu Chí Điểm Tốt / Khen Thưởng (+)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {positiveRules.length} quy định thưởng sao
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#10b981', borderColor: '#10b981' }}
                  onClick={() => handleOpenCreateRule('positive')}
                >
                  <Plus size={13} /> Thêm
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {positiveRules.map((rule) => (
                  <div 
                    key={rule.id}
                    style={{
                      background: 'var(--surface-secondary)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--surface-border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{rule.icon || '⭐'}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                            {rule.title}
                          </span>
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: 4,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#059669'
                          }}>
                            {rule.category || 'Thái độ'}
                          </span>
                        </div>
                        {rule.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{
                        fontWeight: 900,
                        fontSize: '0.875rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#059669'
                      }}>
                        +{rule.points} ⭐
                      </span>

                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        style={{ padding: '0.25rem', borderColor: 'transparent' }}
                        onClick={() => handleOpenEditRule(rule)}
                        title="Chỉnh sửa quy định này"
                      >
                        <Edit2 size={14} color="var(--primary)" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        style={{ padding: '0.25rem', borderColor: 'transparent', color: '#ef4444' }}
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Xóa quy định này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CỘT 2: QUY ĐỊNH ĐIỂM TRỪ / NHẮC NHỞ (-) */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '2px solid rgba(239, 68, 68, 0.25)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ThumbsDown size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#991b1b' }}>
                      Nội Quy Phòng Máy & Điểm Trừ (-)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {negativeRules.length} quy định nhắc nhở
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => handleOpenCreateRule('negative')}
                >
                  <Plus size={13} /> Thêm
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {negativeRules.map((rule) => (
                  <div 
                    key={rule.id}
                    style={{
                      background: 'var(--surface-secondary)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--surface-border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{rule.icon || '⚠️'}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                            {rule.title}
                          </span>
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: 4,
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#b91c1c'
                          }}>
                            {rule.category || 'Kỷ luật'}
                          </span>
                        </div>
                        {rule.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{
                        fontWeight: 900,
                        fontSize: '0.875rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#dc2626'
                      }}>
                        -{rule.points} ⭐
                      </span>

                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        style={{ padding: '0.25rem', borderColor: 'transparent' }}
                        onClick={() => handleOpenEditRule(rule)}
                        title="Chỉnh sửa quy định này"
                      >
                        <Edit2 size={14} color="var(--primary)" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        style={{ padding: '0.25rem', borderColor: 'transparent', color: '#ef4444' }}
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Xóa quy định này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: GHI NHẬN ĐIỂM TỐT HOẶC ĐIỂM TRỪ CHO HỌC SINH */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={22} color="var(--primary)" />
                Ghi Nhận Điểm Thi Đua & Nội Quy
              </h3>
              <button 
                type="button"
                className="btn btn-sm btn-outline" 
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSubmit}>
              {/* Chuyển loại: Điểm Tốt (+) vs Điểm Trừ (-) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                background: 'var(--surface-secondary)',
                padding: '0.35rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem'
              }}>
                <button
                  type="button"
                  style={{
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: newRecord.type === 'positive' ? '#10b981' : 'transparent',
                    color: newRecord.type === 'positive' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    const firstPos = positiveRules[0];
                    setNewRecord({
                      ...newRecord,
                      type: 'positive',
                      ruleId: firstPos?.id || '',
                      title: firstPos ? `${firstPos.icon} ${firstPos.title}` : '',
                      points: firstPos?.points || 1
                    });
                  }}
                >
                  <ThumbsUp size={16} /> 🟢 Điểm Tốt / Khen Thưởng
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: newRecord.type === 'negative' ? '#ef4444' : 'transparent',
                    color: newRecord.type === 'negative' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    const firstNeg = negativeRules[0];
                    setNewRecord({
                      ...newRecord,
                      type: 'negative',
                      ruleId: firstNeg?.id || '',
                      title: firstNeg ? `${firstNeg.icon} ${firstNeg.title}` : '',
                      points: firstNeg?.points || 1
                    });
                  }}
                >
                  <ThumbsDown size={16} /> 🔴 Điểm Trừ / Nhắc Nhở
                </button>
              </div>

              {/* Chọn học sinh */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Học sinh áp dụng:
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAddStudent}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: 0
                    }}
                  >
                    <UserPlus size={13} />
                    <span>+ Bổ sung học sinh nếu thiếu</span>
                  </button>
                </div>
                {students.length === 0 ? (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px dashed #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.8125rem', color: '#b91c1c', fontWeight: 600 }}>
                      ⚠️ Lớp này chưa có học sinh nào.
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      onClick={handleOpenAddStudent}
                    >
                      <UserPlus size={12} /> Bổ sung ngay
                    </button>
                  </div>
                ) : (
                  <select
                    className="input-field"
                    value={newRecord.studentId}
                    onChange={(e) => setNewRecord({ ...newRecord, studentId: e.target.value })}
                    required
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.machineNumber ? ` [Máy ${s.machineNumber}]` : ''} • Đang có {s.stars || 0} ⭐
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Chọn Quy định từ Nội quy phòng máy */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  {newRecord.type === 'positive' ? 'Chọn Tiêu Chí Khen Thưởng:' : 'Chọn Nội Quy Vi Phạm / Nhắc Nhở:'}
                </label>
                <select
                  className="input-field"
                  value={newRecord.ruleId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    const match = rules.find(r => r.id === rId);
                    if (match) {
                      setNewRecord({
                        ...newRecord,
                        ruleId: match.id,
                        title: `${match.icon} ${match.title}`,
                        points: match.points
                      });
                    } else {
                      setNewRecord({
                        ...newRecord,
                        ruleId: '',
                        title: ''
                      });
                    }
                  }}
                >
                  <option value="">-- Chọn một nội quy có sẵn --</option>
                  {(newRecord.type === 'positive' ? positiveRules : negativeRules).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.icon} {r.title} ({newRecord.type === 'positive' ? `+${r.points}` : `-${r.points}`} ⭐)
                    </option>
                  ))}
                  <option value="custom">✏️ Nhập lý do tùy chỉnh khác...</option>
                </select>
              </div>

              {/* Nếu chọn tùy chỉnh */}
              {newRecord.ruleId === 'custom' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    Nhập nội dung cụ thể:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nhập lý do khen thưởng hoặc nhắc nhở..."
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                    required
                  />
                </div>
              )}

              {/* Số Sao Thưởng / Phạt */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  {newRecord.type === 'positive' ? 'Số sao thưởng (+)' : 'Số sao trừ (-)'}:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    style={{ width: 100, textAlign: 'center', fontWeight: 800, fontSize: '1.05rem' }}
                    value={newRecord.points}
                    onChange={(e) => setNewRecord({ ...newRecord, points: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: newRecord.type === 'positive' ? '#10b981' : '#ef4444' }}>
                    {newRecord.type === 'positive' ? `+${newRecord.points} ⭐` : `-${newRecord.points} ⭐`}
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                    {[1, 2, 3, 5].map(p => (
                      <button
                        key={p}
                        type="button"
                        className="btn btn-outline btn-xs"
                        style={{ padding: '0.2rem 0.5rem' }}
                        onClick={() => setNewRecord({ ...newRecord, points: p })}
                      >
                        {p}⭐
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ghi chú của giáo viên */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Lời nhận xét / Ghi chú của Thầy/Cô (tùy chọn):
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Ví dụ: Rất tập trung, hoàn thành tốt bài học..."
                  value={newRecord.note}
                  onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className={`btn ${newRecord.type === 'positive' ? 'btn-success' : 'btn-danger'}`} 
                  style={{ fontWeight: 800 }}
                >
                  {newRecord.type === 'positive' ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                  Xác Nhận {newRecord.type === 'positive' ? 'Cộng Điểm' : 'Trừ Điểm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO MỚI HOẶC CHỈNH SỬA NỘI QUY PHÒNG MÁY */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} color="var(--primary)" />
                {editingRule ? 'Chỉnh Sửa Quy Định Nội Quy' : 'Thêm Quy Định Nội Quy Mới'}
              </h3>
              <button 
                type="button"
                className="btn btn-sm btn-outline" 
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setShowRuleModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRuleSubmit}>
              {/* Loại quy định: Điểm tốt vs Điểm trừ */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                background: 'var(--surface-secondary)',
                padding: '0.35rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem'
              }}>
                <button
                  type="button"
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: ruleForm.type === 'positive' ? '#10b981' : 'transparent',
                    color: ruleForm.type === 'positive' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                  onClick={() => setRuleForm({ ...ruleForm, type: 'positive' })}
                >
                  🟢 Điểm Tốt / Thưởng (+)
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: ruleForm.type === 'negative' ? '#ef4444' : 'transparent',
                    color: ruleForm.type === 'negative' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                  onClick={() => setRuleForm({ ...ruleForm, type: 'negative' })}
                >
                  🔴 Điểm Trừ / Nhắc Nhở (-)
                </button>
              </div>

              {/* Tên quy định */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Tên quy định / Tiêu chí:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ví dụ: Tự ý đổi chỗ ngồi, Hoàn thành bài sớm..."
                  value={ruleForm.title}
                  onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                  required
                />
              </div>

              {/* Chọn Biểu Tượng Icon (Emoji) */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Biểu tượng Icon (Emoji):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: 80, textAlign: 'center', fontSize: '1.25rem' }}
                    value={ruleForm.icon}
                    onChange={(e) => setRuleForm({ ...ruleForm, icon: e.target.value })}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {QUICK_EMOJIS.map(em => (
                      <button
                        key={em}
                        type="button"
                        className="btn btn-outline btn-xs"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '1rem', background: ruleForm.icon === em ? 'var(--primary-light)' : 'transparent' }}
                        onClick={() => setRuleForm({ ...ruleForm, icon: em })}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Số Sao và Danh Mục */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    {ruleForm.type === 'positive' ? 'Số sao thưởng (+)' : 'Số sao phạt (-)'}:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    style={{ fontWeight: 800, textAlign: 'center' }}
                    value={ruleForm.points}
                    onChange={(e) => setRuleForm({ ...ruleForm, points: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    Phân loại danh mục:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Kỷ luật, Kỹ năng, Thái độ..."
                    value={ruleForm.category}
                    onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                  />
                </div>
              </div>

              {/* Mô tả / Hướng dẫn */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  Mô tả / Hướng dẫn áp dụng:
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Giải thích ngắn gọn trường hợp nào áp dụng quy định này..."
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  <Check size={16} />
                  {editingRule ? 'Lưu Thay Đổi' : 'Tạo Quy Định'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BỔ SUNG HỌC SINH MỚI VÀO LỚP */}
      {showAddStudentModal && (
        <div className="modal-overlay" onClick={() => setShowAddStudentModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={22} color="var(--primary)" />
                Bổ Sung Học Sinh Vào {currentClass?.name || 'Lớp'}
              </h3>
              <button 
                type="button" 
                className="btn btn-sm btn-outline" 
                style={{ padding: '0.2rem 0.5rem' }} 
                onClick={() => setShowAddStudentModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit}>
              {/* Họ và Tên */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                  Họ và Tên Học Sinh <span style={{ color: '#ef4444' }}>*</span>:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              {/* Giới tính & Số máy */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Giới tính:
                  </label>
                  <select
                    className="input-field"
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                  >
                    <option value="Nam">👦 Nam</option>
                    <option value="Nữ">👧 Nữ</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Số máy phòng Tin học:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="45"
                    className="input-field"
                    placeholder="VD: 1, 2..."
                    value={studentForm.machineNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, machineNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Ngày sinh & Sao khởi đầu */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Ngày sinh (dd/mm/yyyy):
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="VD: 15/08/2016"
                    value={studentForm.dob}
                    onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Quỹ sao khởi đầu:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    value={studentForm.stars}
                    onChange={(e) => setStudentForm({ ...studentForm, stars: e.target.value })}
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                  Ghi chú của giáo viên:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ghi chú về năng lực, tiếp thu..."
                  value={studentForm.note}
                  onChange={(e) => setStudentForm({ ...studentForm, note: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddStudentModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  <UserPlus size={16} />
                  Thêm Vào Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
