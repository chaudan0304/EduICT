import React, { useState, useMemo, useRef } from 'react';
import DialogService from '../services/DialogService';
import {
  Search, 
  UserPlus, 
  FileSpreadsheet, 
  Upload, 
  Star, 
  Trash2, 
  Award, 
  TrendingUp, 
  Users, 
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import { 
  calculateAverage, 
  getSemesterRank,
  exportToExcel, 
  importFromExcel,
  detectGradeFromName,
  sortStudentsVietnamese 
} from '../utils/storage';
import { soundEffects } from '../utils/audio';
import { changeStars, applyNewBalance } from '../utils/starLedger';
import AiClassAnalysisModal from './AI/AiClassAnalysisModal';

export default function Gradebook({ 
  currentClass, 
  onUpdateStudents, 
  soundEnabled 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [evalFilter, setEvalFilter] = useState('all');
  const [activeSemester, setActiveSemester] = useState('hk1'); // 'hk1' | 'hk2' — xem/chấm từng học kỳ RIÊNG
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAiClassModalOpen, setIsAiClassModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [sortToast, setSortToast] = useState(false);
  const grade = currentClass?.grade || detectGradeFromName(currentClass?.name) || 3;
  const isGrade1or2 = (grade === 1 || grade === 2);
  const students = useMemo(() => {
    return sortStudentsVietnamese(currentClass?.students || []);
  }, [currentClass?.students]);

  // Form thêm học sinh mới
  const [newStudent, setNewStudent] = useState({
    name: '',
    dob: '',
    gender: 'Nam',
    machineNumber: students.length + 1 <= 31 ? students.length + 1 : 1,
    skill_mouse: 'T',
    skill_keyboard: 'H',
    skill_paint: 'T',
    eval_regular: 'T',
    eval_hk1: 'T',
    eval_hk2: 'T',
    score_hk1: '',
    score_ck: '',
    note: ''
  });

  // Mẫu nhận xét nhanh Khối 1-2
  const remarksPrimary12 = [
    'Cầm chuột khéo léo, thao tác nhanh',
    'Kéo thả mượt mà, tô màu Paint đẹp',
    'Biết click đúp mở phần mềm vẽ',
    'Ngồi đúng tư thế, giữ gìn máy tính',
    'Nhận biết tốt các phím chữ và phím số',
    'Cần rèn luyện thêm thao tác nhấp đúp',
    'Cần chú ý tập trung nghe cô hướng dẫn'
  ];

  // Mẫu nhận xét nhanh Khối 3-4-5
  const remarksPrimary345 = [
    'Nắm vững kiến thức, thực hành xuất sắc',
    'Thao tác gõ 10 ngón tiến bộ, nhanh nhẹn',
    'Soạn thảo văn bản và chèn hình chuẩn',
    'Thiết kế bài trình chiếu sinh động, đẹp',
    'Lập trình Scratch tư duy logic sáng tạo',
    'Tuân thủ tốt quy tắc an toàn phòng máy',
    'Cần gõ văn bản cẩn thận và đúng chính tả',
    'Cần rèn luyện thêm tốc độ hoàn thành bài'
  ];

  // Thống kê lớp học
  const stats = useMemo(() => {
    let totalStars = 0;
    let countT = 0;
    let countH = 0;
    let countC = 0;
    let totalScore = 0;
    let scoreCount = 0;

    students.forEach(s => {
      totalStars += (s.stars || 0);

      const ev = s.eval_hk2 ?? s.eval_regular ?? 'T';
      if (ev === 'T') countT += 1;
      else if (ev === 'H') countH += 1;
      else countC += 1;

      if (!isGrade1or2) {
        const avg = calculateAverage(s, grade);
        if (avg !== null) {
          totalScore += avg;
          scoreCount += 1;
        }
      }
    });

    const avgScore = scoreCount > 0 ? (Math.round((totalScore / scoreCount) * 10) / 10) : null;
    const completedRate = students.length > 0 
      ? Math.round(((countT + countH) / students.length) * 100) 
      : 0;

    return {
      total: students.length,
      totalStars,
      countT,
      countH,
      countC,
      completedRate,
      avgScore
    };
  }, [students, isGrade1or2, grade]);

  // Lọc học sinh
  const filteredStudents = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    return students.filter(s => {
      const matchSearch = !q ||
                          String(s.name || '').toLowerCase().includes(q) || 
                          String(s.id || '').toLowerCase().includes(q) ||
                          (s.machineNumber && `máy ${s.machineNumber}`.includes(q)) ||
                          (s.machineNumber && String(s.machineNumber).includes(q));
      const matchGender = genderFilter === 'all' || s.gender === genderFilter;
      
      const ev = s.eval_hk2 ?? s.eval_regular ?? 'T';
      const matchEval = evalFilter === 'all' || ev === evalFilter;

      return matchSearch && matchGender && matchEval;
    });
  }, [students, searchTerm, genderFilter, evalFilter, isGrade1or2]);

  // Cập nhật trường học sinh
  const handleUpdateStudentField = (studentId, field, value) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, [field]: value };
      }
      return s;
    });
    onUpdateStudents(updated);
  };

  // Cập nhật điểm số
  const handleScoreChange = (studentId, field, value) => {
    let numVal = value === '' ? null : parseFloat(value);
    if (numVal !== null) {
      if (isNaN(numVal) || numVal < 0 || numVal > 10) return;
    }
    handleUpdateStudentField(studentId, field, numVal);
  };

  // Tăng / Giảm sao thưởng — đi qua sổ cái server (cộng = award, trừ = adjust)
  const handleModifyStars = async (studentId, delta) => {
    if (!delta) return;
    try {
      const newBalance = await changeStars({
        studentId,
        classId: currentClass?.id,
        amount: delta,
        reason: delta > 0 ? 'Thưởng sao tại Sổ điểm' : 'Điều chỉnh giảm sao tại Sổ điểm',
        source: 'GRADEBOOK',
      });
      onUpdateStudents(applyNewBalance(students, studentId, newBalance));
      if (soundEnabled && delta > 0) {
        soundEffects.playStarDing();
      }
    } catch (e) {
      DialogService.alert('Không thể cập nhật sao: ' + (e?.message || 'Lỗi không xác định'));
    }
  };

  // Xóa học sinh
  const handleDeleteStudent = (studentId, studentName) => {
    if (DialogService.confirm(`Thầy/cô có chắc muốn xóa học sinh "${studentName}" khỏi lớp?`)) {
      const updated = students.filter(s => s.id !== studentId);
      onUpdateStudents(updated);
    }
  };

  // Thêm học sinh
  const handleAddStudentSubmit = (e) => {
    e.preventDefault();
    if (!newStudent.name.trim()) return;

    const nextId = `HS${String(students.length + 1).padStart(3, '0')}`;
    const studentToAdd = {
      id: nextId,
      name: newStudent.name.trim(),
      dob: newStudent.dob?.trim() || '',
      gender: newStudent.gender,
      machineNumber: parseInt(newStudent.machineNumber, 10) || null,
      skill_mouse: newStudent.skill_mouse,
      skill_keyboard: newStudent.skill_keyboard,
      skill_paint: newStudent.skill_paint,
      eval_regular: newStudent.eval_regular,
      eval_hk1: newStudent.eval_hk1 || newStudent.eval_regular || 'T',
      eval_hk2: newStudent.eval_hk2 || newStudent.eval_regular || 'T',
      score_hk1: newStudent.score_hk1 !== '' ? parseFloat(newStudent.score_hk1) : null,
      score_ck: newStudent.score_ck !== '' ? parseFloat(newStudent.score_ck) : null,
      stars: 5,
      note: newStudent.note || '',
      attendance: 'present'
    };

    const updated = sortStudentsVietnamese([...students, studentToAdd]);
    onUpdateStudents(updated);
    setNewStudent({
      name: '',
      dob: '',
      gender: 'Nam',
      machineNumber: students.length + 2 <= 31 ? students.length + 2 : 1,
      skill_mouse: 'T',
      skill_keyboard: 'H',
      skill_paint: 'T',
      eval_regular: 'T',
      score_hk1: '',
      score_ck: '',
      note: ''
    });
    setShowAddModal(false);
    if (soundEnabled) soundEffects.playStarDing();
  };

  // Sắp xếp lại danh sách học sinh theo thứ tự A - Z chuẩn tiếng Việt
  const handleSortStudentsAZ = () => {
    const sorted = sortStudentsVietnamese(students);
    onUpdateStudents(sorted);
    setSortToast(true);
    if (soundEnabled) soundEffects.playStarDing();
    setTimeout(() => setSortToast(false), 3000);
  };

  // Xử lý Import Excel
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importFromExcel(file, (err, importedList) => {
      if (err) {
        alert('Có lỗi khi đọc file Excel! Vui lòng kiểm tra lại định dạng file.');
        return;
      }
      if (importedList && importedList.length > 0) {
        if (DialogService.confirm(`Đã tìm thấy ${importedList.length} học sinh trong file. Thầy/cô muốn nạp danh sách này vào lớp ${currentClass.name}?`)) {
          const sorted = sortStudentsVietnamese(importedList);
          onUpdateStudents(sorted);
          if (soundEnabled) soundEffects.playVictory();
        }
      } else {
        alert('Không tìm thấy dữ liệu học sinh hợp lệ trong file!');
      }
    });
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Banner phân loại Khối lớp */}
      <div style={{
        background: isGrade1or2 
          ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(6, 182, 212, 0.08))'
          : 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(124, 58, 237, 0.08))',
        border: `1px solid ${isGrade1or2 ? 'rgba(2, 132, 199, 0.3)' : 'rgba(79, 70, 229, 0.3)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: isGrade1or2 ? '#0284c7' : '#4f46e5',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            {isGrade1or2 ? '👶' : '🧑‍💻'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {currentClass?.name || 'Lớp Học'} • Khối {grade}
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: 4,
                background: isGrade1or2 ? 'rgba(2, 132, 199, 0.2)' : 'rgba(79, 70, 229, 0.2)',
                color: isGrade1or2 ? '#0284c7' : '#4f46e5'
              }}>
                {isGrade1or2 ? 'LÀM QUEN & KỸ NĂNG (KHÔNG TÍNH ĐIỂM SỐ)' : 'CHUẨN THÔNG TƯ 27/2020/TT-BGDĐT'}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
              {isGrade1or2 
                ? 'Đánh giá thao tác Chuột, Bàn phím cơ bản, Vẽ Paint & Khen thưởng Sao thi đua' 
                : 'Đánh giá thường xuyên (T - H - C) & Bài kiểm tra thực hành cuối kỳ (Thang điểm 10)'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setIsAiClassModalOpen(true)}
            title="Trợ Giảng AI phân tích năng lực thực hành và học sinh cần hỗ trợ theo TT27"
            style={{
              borderColor: 'rgba(59, 130, 246, 0.4)',
              background: 'rgba(59, 130, 246, 0.08)',
              color: '#3b82f6',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700
            }}
          >
            <Sparkles size={16} color="#3b82f6" />
            <span>✨ AI Phân Tích Lớp</span>
          </button>

          <button 
            className="btn btn-outline btn-sm"
            onClick={() => exportToExcel(students, currentClass?.name, grade)}
            title="Xuất bảng Excel chuẩn nộp trường"
          >
            <FileSpreadsheet size={16} color="#10b981" />
            <span>Xuất Excel vnEdu/SMAS</span>
          </button>
          
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Nạp danh sách học sinh từ file Excel"
          >
            <Upload size={16} color="var(--primary)" />
            <span>Nhập Excel</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload} 
          />
        </div>
      </div>

      {/* Thẻ Thống Kê Nhanh */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats.total} <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>HS</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Sĩ Số Lớp</div>
          </div>
        </div>

        {isGrade1or2 && (
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Star size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
              {stats.totalStars} <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>⭐</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Tổng Sao Khen Thưởng</div>
          </div>
        </div>
        )}

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
              {stats.countT} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {stats.total}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Hoàn Thành Tốt (T)</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats.completedRate}%
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Tỷ Lệ Đạt (T + H)</div>
          </div>
        </div>
      </div>

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
              <Search size={17} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="text"
                placeholder="Tìm học sinh hoặc số máy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            {/* Lọc Giới Tính */}
            <select 
              value={genderFilter} 
              onChange={(e) => setGenderFilter(e.target.value)}
              className="input-field"
              style={{ width: 110 }}
            >
              <option value="all">Tất cả phái</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>

            {/* Lọc Mức Đánh Giá T / H / C */}
            <select 
              value={evalFilter} 
              onChange={(e) => setEvalFilter(e.target.value)}
              className="input-field"
              style={{ width: 130 }}
            >
              <option value="all">Mọi mức đạt</option>
              <option value="T">Mức Tốt (T)</option>
              <option value="H">Hoàn Thành (H)</option>
              <option value="C">Cần Cố Gắng (C)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleSortStudentsAZ}
              title="Sắp xếp lại danh sách học sinh theo thứ tự A - Z (chuẩn Bộ GD&ĐT)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                borderColor: 'rgba(99, 102, 241, 0.35)',
                background: 'rgba(99, 102, 241, 0.08)',
                color: 'var(--primary)'
              }}
            >
              <ArrowUpDown size={15} />
              <span>Sắp xếp A-Z</span>
            </button>

            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus size={16} />
              <span>Thêm Học Sinh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bảng Điểm / Bảng Đánh Giá Môn Tin Học */}
      <div className="glass-panel" style={{ padding: '0.5rem', overflow: 'hidden' }}>
        {/* Chọn Học Kỳ — tách riêng từng kỳ, chỉ hiển thị cột của kỳ đang chọn */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem 0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>Học kỳ:</span>
          <div style={{ display: 'inline-flex', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-md)', padding: '0.2rem' }}>
            {[{ id: 'hk1', label: '📘 Học Kỳ I' }, { id: 'hk2', label: '📙 Học Kỳ II (Cả Năm)' }].map(sem => (
              <button
                key={sem.id}
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveSemester(sem.id)}
                style={{
                  background: activeSemester === sem.id ? 'var(--surface)' : 'transparent',
                  color: activeSemester === sem.id ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeSemester === sem.id ? 'var(--shadow-sm)' : 'none',
                  fontWeight: activeSemester === sem.id ? 800 : 600
                }}
              >
                {sem.label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '68vh' }}>
          <table className="data-table">
            <thead>
              {isGrade1or2 ? (
                // Header Khối 1 & 2
                <tr>
                  <th style={{ width: 45, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 75, textAlign: 'center' }}>Máy</th>
                  <th style={{ minWidth: 160 }}>Họ và Tên</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Phái</th>
                  <th style={{ width: 130, textAlign: 'center' }} title="Kỹ năng cầm chuột, nhấp chuột & kéo thả">
                    🖱️ Chuột (T/H/C)
                  </th>
                  <th style={{ width: 130, textAlign: 'center' }} title="Nhận biết phím số, chữ cái, Enter, Space">
                    ⌨️ Bàn Phím (T/H/C)
                  </th>
                  <th style={{ width: 130, textAlign: 'center' }} title="Mở Paint, chọn hình, tô màu">
                    🎨 Vẽ Paint (T/H/C)
                  </th>
                  <th style={{ width: 95, textAlign: 'center', background: activeSemester === 'hk1' ? 'rgba(2, 132, 199, 0.08)' : 'rgba(245, 158, 11, 0.08)', color: activeSemester === 'hk1' ? '#0284c7' : '#d97706' }} title="Đánh giá thường xuyên của học kỳ đang chọn">ĐGTX {activeSemester === 'hk1' ? 'HK1' : 'HK2'}</th>
                  <th style={{ width: 100, textAlign: 'center', background: activeSemester === 'hk1' ? 'rgba(2, 132, 199, 0.08)' : 'rgba(245, 158, 11, 0.08)', color: activeSemester === 'hk1' ? '#0284c7' : '#d97706' }} title="Điểm kiểm tra cuối kỳ (thang điểm 10)">{activeSemester === 'hk1' ? 'Điểm Cuối HK1' : 'Điểm Cuối Năm'}</th>
                  <th style={{ width: 130, textAlign: 'center', background: activeSemester === 'hk1' ? 'rgba(2, 132, 199, 0.05)' : 'rgba(245, 158, 11, 0.05)' }}>{activeSemester === 'hk1' ? 'Mức Đạt HK1' : 'Mức Đạt Cả Năm'}</th>
                  <th style={{ width: 110, textAlign: 'center' }}>Sao Khen Thưởng</th>
                  <th style={{ minWidth: 200 }}>Lời Khen & Ghi Chú</th>
                  <th style={{ width: 50, textAlign: 'center' }}>Xóa</th>
                </tr>
              ) : (
                // Header Khối 3, 4, 5 (Chuẩn Thông tư 27)
                <tr>
                  <th style={{ width: 45, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 75, textAlign: 'center' }}>Máy</th>
                  <th style={{ minWidth: 160 }}>Họ và Tên</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Phái</th>
                  <th style={{ width: 95, textAlign: 'center', background: activeSemester === 'hk1' ? 'rgba(2, 132, 199, 0.08)' : 'rgba(245, 158, 11, 0.08)', color: activeSemester === 'hk1' ? '#0284c7' : '#d97706' }} title="Đánh giá thường xuyên của học kỳ đang chọn">ĐGTX {activeSemester === 'hk1' ? 'HK1' : 'HK2'}</th>
                  <th style={{ width: 100, textAlign: 'center', background: activeSemester === 'hk1' ? 'rgba(2, 132, 199, 0.08)' : 'rgba(245, 158, 11, 0.08)', color: activeSemester === 'hk1' ? '#0284c7' : '#d97706' }} title="Điểm kiểm tra cuối kỳ (thang điểm 10)">{activeSemester === 'hk1' ? 'Điểm Cuối HK1' : 'Điểm Cuối Năm'}</th>
                  <th style={{ width: 130, textAlign: 'center', background: activeSemester === 'hk1' ? 'rgba(2, 132, 199, 0.05)' : 'rgba(245, 158, 11, 0.05)' }}>{activeSemester === 'hk1' ? 'Mức Đạt HK1' : 'Mức Đạt Cả Năm'}</th>
                  <th style={{ minWidth: 200 }}>Nhận Xét vnEdu</th>
                  <th style={{ width: 50, textAlign: 'center' }}>Xóa</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isGrade1or2 ? 13 : 9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <AlertCircle size={36} style={{ display: 'block', margin: '0 auto 0.5rem', color: 'var(--text-dim)' }} />
                    Chưa có học sinh nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const rankHk1 = getSemesterRank(student.score_hk1, student.eval_hk1 ?? student.eval_regular);
                  const rankYear = getSemesterRank(student.score_ck, student.eval_hk2 ?? student.eval_regular);
                  const isHk1 = activeSemester === 'hk1';
                  const semEvalField = isHk1 ? 'eval_hk1' : 'eval_hk2';
                  const semEval = (isHk1 ? student.eval_hk1 : student.eval_hk2) ?? student.eval_regular ?? 'T';
                  const semScoreField = isHk1 ? 'score_hk1' : 'score_ck';
                  const semScore = isHk1 ? student.score_hk1 : student.score_ck;
                  const semRank = isHk1 ? rankHk1 : rankYear;

                  return (
                    <tr key={student.id}>
                      {/* STT */}
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-dim)' }}>
                        {idx + 1}
                      </td>

                      {/* Số Máy */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.8125rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.45rem',
                          borderRadius: 4,
                          background: student.machineNumber ? 'rgba(2, 132, 199, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                          color: student.machineNumber ? '#0284c7' : 'var(--text-dim)'
                        }}>
                          {student.machineNumber ? `M.${student.machineNumber}` : '--'}
                        </span>
                      </td>

                      {/* Họ và Tên */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <div style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: student.gender === 'Nữ' ? '#fdf2f8' : '#eff6ff',
                            color: student.gender === 'Nữ' ? '#db2777' : '#2563eb',
                            border: `1px solid ${student.gender === 'Nữ' ? '#fbcfe8' : '#bfdbfe'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8125rem',
                            fontWeight: 700
                          }}>
                            {student.name.trim().split(' ').pop()?.[0] || 'H'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                              {student.name}
                            </div>
                            {(student.dob || (student.id && !String(student.id).startsWith('hs_'))) && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {student.id && !String(student.id).startsWith('hs_') ? `${student.id}${student.dob ? ' • ' : ''}` : ''}
                                {student.dob ? `🎂 ${student.dob}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Giới Tính */}
                      <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: student.gender === 'Nữ' ? '#db2777' : '#2563eb' }}>
                        {student.gender}
                      </td>

                      {/* --- CỘT DÀNH CHO KHỐI 1 & 2 --- */}
                      {isGrade1or2 && (
                        <>
                          {/* Kỹ năng Chuột (T / H / C) */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                              {['T', 'H', 'C'].map(level => {
                                const isCur = (student.skill_mouse || 'H') === level;
                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => handleUpdateStudentField(student.id, 'skill_mouse', level)}
                                    style={{
                                      padding: '0.2rem 0.45rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      borderRadius: 4,
                                      border: isCur ? '1.5px solid transparent' : '1px solid var(--surface-border)',
                                      background: isCur 
                                        ? (level === 'T' ? '#10b981' : level === 'H' ? '#0284c7' : '#f59e0b') 
                                        : 'transparent',
                                      color: isCur ? '#fff' : 'var(--text-muted)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Kỹ năng Bàn Phím (T / H / C) */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                              {['T', 'H', 'C'].map(level => {
                                const isCur = (student.skill_keyboard || 'H') === level;
                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => handleUpdateStudentField(student.id, 'skill_keyboard', level)}
                                    style={{
                                      padding: '0.2rem 0.45rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      borderRadius: 4,
                                      border: isCur ? '1.5px solid transparent' : '1px solid var(--surface-border)',
                                      background: isCur 
                                        ? (level === 'T' ? '#10b981' : level === 'H' ? '#0284c7' : '#f59e0b') 
                                        : 'transparent',
                                      color: isCur ? '#fff' : 'var(--text-muted)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Kỹ năng Vẽ Paint (T / H / C) */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                              {['T', 'H', 'C'].map(level => {
                                const isCur = (student.skill_paint || 'T') === level;
                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => handleUpdateStudentField(student.id, 'skill_paint', level)}
                                    style={{
                                      padding: '0.2rem 0.45rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      borderRadius: 4,
                                      border: isCur ? '1.5px solid transparent' : '1px solid var(--surface-border)',
                                      background: isCur 
                                        ? (level === 'T' ? '#10b981' : level === 'H' ? '#0284c7' : '#f59e0b') 
                                        : 'transparent',
                                      color: isCur ? '#fff' : 'var(--text-muted)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </>
                      )}

                      {/* === KHỐI ĐIỂM CỦA HỌC KỲ ĐANG CHỌN (tách riêng từng kỳ) === */}
                      {/* ĐGTX của kỳ đang chọn */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                          {['T', 'H', 'C'].map(level => {
                            const isCur = semEval === level;
                            return (
                              <button key={level} type="button"
                                onClick={() => handleUpdateStudentField(student.id, semEvalField, level)}
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: 4, border: isCur ? '1.5px solid transparent' : '1px solid var(--surface-border)', background: isCur ? (level === 'T' ? '#10b981' : level === 'H' ? '#0284c7' : '#f59e0b') : 'transparent', color: isCur ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Điểm cuối kỳ đang chọn */}
                      <td style={{ textAlign: 'center' }}>
                        <input type="number" step="0.5" min="0" max="10" className="score-input" value={semScore ?? ''} placeholder="--" onChange={(e) => handleScoreChange(student.id, semScoreField, e.target.value)} />
                      </td>

                      {/* Mức đạt kỳ đang chọn */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${semRank.class}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}>{semRank.label}</span>
                      </td>

                      {/* Sao Khen Thưởng — chỉ Khối 1-2 (Sổ Kỹ Năng & Sao); Khối 3-5 không hiển thị sao thi đua */}
                      {isGrade1or2 && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <button
                            className="btn btn-outline btn-xs"
                            style={{ padding: '0.15rem 0.35rem', color: '#ef4444' }}
                            onClick={() => handleModifyStars(student.id, -1)}
                            title="Trừ 1 sao"
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 800, color: '#f59e0b', minWidth: 24 }}>
                            {student.stars || 0}⭐
                          </span>
                          <button
                            className="btn btn-outline btn-xs"
                            style={{ padding: '0.15rem 0.35rem', color: '#10b981' }}
                            onClick={() => handleModifyStars(student.id, 1)}
                            title="Cộng 1 sao"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      )}

                      {/* Nhận Xét Nhanh / Ghi Chú */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <input 
                            type="text"
                            className="input-field"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                            placeholder="Nhập lời khen..."
                            value={student.note || ''}
                            onChange={(e) => handleUpdateStudentField(student.id, 'note', e.target.value)}
                          />
                          <select
                            className="input-field"
                            style={{ width: 34, padding: '0.2rem', cursor: 'pointer' }}
                            title="Chọn nhận xét mẫu nhanh"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateStudentField(student.id, 'note', e.target.value);
                              }
                            }}
                          >
                            <option value="">▼</option>
                            {(isGrade1or2 ? remarksPrimary12 : remarksPrimary345).map((r, i) => (
                              <option key={i} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Xóa */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--text-dim)', padding: '0.25rem' }}
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          title="Xóa học sinh"
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

      {/* Modal Thêm Học Sinh Mới */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={22} color="var(--primary)" />
              Thêm Học Sinh Vào {currentClass?.name} (Khối {grade})
            </h3>
            <form onSubmit={handleAddStudentSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                  Họ và Tên Học Sinh (*)
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Ví dụ: Hoàng Gia Bảo"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Giới tính
                  </label>
                  <select 
                    className="input-field"
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Ngày sinh (dd/mm/yyyy)
                  </label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={newStudent.dob}
                    onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                    placeholder="VD: 10/10/2019"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Số máy phòng máy
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31"
                    className="input-field"
                    value={newStudent.machineNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, machineNumber: e.target.value })}
                    placeholder="1 - 31"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                  Ghi chú / Lời khen ban đầu
                </label>
                <input 
                  type="text" 
                  className="input-field"
                  value={newStudent.note}
                  onChange={(e) => setNewStudent({ ...newStudent, note: e.target.value })}
                  placeholder="VD: Cầm chuột khéo léo..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Trợ Giảng AI Phân Tích Lớp */}
      {isAiClassModalOpen && (
        <AiClassAnalysisModal
          isOpen={isAiClassModalOpen}
          onClose={() => setIsAiClassModalOpen(false)}
          currentClass={currentClass}
        />
      )}

      {/* Thông báo toast khi sắp xếp học sinh A - Z */}
      {sortToast && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: '#10b981',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          zIndex: 9999,
          fontWeight: 700,
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} />
          <span>Đã sắp xếp danh sách học sinh theo thứ tự A - Z!</span>
        </div>
      )}
    </div>
  );
}
