import React, { useState, useMemo, useRef } from 'react';
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
  ChevronDown,
  Monitor,
  CheckCircle2,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { 
  calculateAverage, 
  getGradeRank, 
  exportToExcel, 
  importFromExcel,
  detectGradeFromName 
} from '../utils/storage';
import { soundEffects } from '../utils/audio';

export default function Gradebook({ 
  currentClass, 
  onUpdateStudents, 
  onOpenExchangeModal,
  soundEnabled 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [evalFilter, setEvalFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef(null);

  const grade = currentClass?.grade || detectGradeFromName(currentClass?.name) || 3;
  const isGrade1or2 = (grade === 1 || grade === 2);
  const students = currentClass?.students || [];

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

      const ev = isGrade1or2 ? (s.skill_mouse || 'H') : (s.eval_regular || 'T');
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
    return students.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) || 
                          s.id.toLowerCase().includes(q) ||
                          (s.machineNumber && `máy ${s.machineNumber}`.includes(q)) ||
                          (s.machineNumber && String(s.machineNumber).includes(q));
      const matchGender = genderFilter === 'all' || s.gender === genderFilter;
      
      const ev = isGrade1or2 ? (s.skill_mouse || 'H') : (s.eval_regular || 'T');
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

  // Tăng / Giảm sao
  const handleModifyStars = (studentId, delta) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        const nextStars = Math.max(0, (s.stars || 0) + delta);
        return { ...s, stars: nextStars };
      }
      return s;
    });
    onUpdateStudents(updated);
    if (soundEnabled && delta > 0) {
      soundEffects.playStarDing();
    }
  };

  // Xóa học sinh
  const handleDeleteStudent = (studentId, studentName) => {
    if (window.confirm(`Thầy/cô có chắc muốn xóa học sinh "${studentName}" khỏi lớp?`)) {
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
      score_hk1: newStudent.score_hk1 !== '' ? parseFloat(newStudent.score_hk1) : null,
      score_ck: newStudent.score_ck !== '' ? parseFloat(newStudent.score_ck) : null,
      stars: 5,
      note: newStudent.note || '',
      attendance: 'present'
    };

    onUpdateStudents([...students, studentToAdd]);
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
        if (window.confirm(`Đã tìm thấy ${importedList.length} học sinh trong file. Thầy/cô muốn nạp danh sách này vào lớp ${currentClass.name}?`)) {
          onUpdateStudents(importedList);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Tổng Sao Thi Đua</div>
          </div>
        </div>

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button 
              className="btn btn-amber btn-sm"
              onClick={() => onOpenExchangeModal?.()}
              title="Quy đổi sao sang điểm thưởng"
            >
              <Sparkles size={16} />
              <span>Đổi Thưởng Sao (10⭐=1đ)</span>
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
                  <th style={{ width: 135, textAlign: 'center' }} title="Đánh giá thường xuyên theo Thông tư 27">
                    📋 Đ.Giá TX (T/H/C)
                  </th>
                  <th style={{ width: 95, textAlign: 'center', background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }} title="Kiểm tra thực hành Cuối Học Kỳ 1 (Thang điểm 10)">
                    T.Hành HK1
                  </th>
                  <th style={{ width: 95, textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)', color: '#d97706' }} title="Kiểm tra thực hành Cuối Năm (Thang điểm 10)">
                    T.Hành CK
                  </th>
                  <th style={{ width: 85, textAlign: 'center', fontWeight: 800 }}>ĐTB</th>
                  <th style={{ width: 120, textAlign: 'center' }}>Xếp Loại TT27</th>
                  <th style={{ width: 105, textAlign: 'center' }}>Sao Thi Đua</th>
                  <th style={{ minWidth: 200 }}>Nhận Xét vnEdu</th>
                  <th style={{ width: 50, textAlign: 'center' }}>Xóa</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isGrade1or2 ? 10 : 12} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <AlertCircle size={36} style={{ display: 'block', margin: '0 auto 0.5rem', color: 'var(--text-dim)' }} />
                    Chưa có học sinh nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const avg = calculateAverage(student, grade);
                  const rank = getGradeRank(avg, student.eval_regular, grade);

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
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {student.id}{student.dob ? ` • 🎂 ${student.dob}` : ''}
                            </div>
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

                      {/* --- CỘT DÀNH CHO KHỐI 3, 4, 5 (THÔNG TƯ 27) --- */}
                      {!isGrade1or2 && (
                        <>
                          {/* Đánh Giá Thường Xuyên T / H / C */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                              {['T', 'H', 'C'].map(level => {
                                const isCur = (student.eval_regular || 'T') === level;
                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => handleUpdateStudentField(student.id, 'eval_regular', level)}
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

                          {/* Điểm Thực Hành HK1 */}
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="number"
                              step="0.5"
                              min="0"
                              max="10"
                              className="score-input"
                              value={student.score_hk1 ?? ''}
                              placeholder="--"
                              onChange={(e) => handleScoreChange(student.id, 'score_hk1', e.target.value)}
                            />
                          </td>

                          {/* Điểm Thực Hành Cuối Năm */}
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="number"
                              step="0.5"
                              min="0"
                              max="10"
                              className="score-input"
                              value={student.score_ck ?? ''}
                              placeholder="--"
                              onChange={(e) => handleScoreChange(student.id, 'score_ck', e.target.value)}
                            />
                          </td>

                          {/* ĐTB */}
                          <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-main)' }}>
                            {avg !== null ? avg : '--'}
                          </td>

                          {/* Xếp Loại TT27 */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${rank.class}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                              {rank.label}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Sao Khen Thưởng */}
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
    </div>
  );
}
