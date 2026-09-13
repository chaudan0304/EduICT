import React, { useState, useMemo } from 'react';
import { 
  Monitor, 
  Star, 
  CheckCircle2, 
  RotateCcw, 
  Shuffle, 
  Wrench, 
  UserX,
  Server,
  Sparkles,
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  Users,
  Maximize2
} from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { 
  getGlobalBrokenMachines, 
  saveGlobalBrokenMachines, 
  detectGradeFromName,
  fetchBrokenMachinesFromSqlite,
  syncBrokenMachinesToSqlite,
  getClassroomRules
} from '../utils/storage';
import SeatingDisplayMode from './SeatingDisplayMode';

export default function SeatingChart({ 
  currentClass, 
  onUpdateStudents, 
  onUpdateGoodScores,
  soundEnabled 
}) {
  const students = currentClass?.students || [];
  const grade = currentClass?.grade || detectGradeFromName(currentClass?.name) || 3;
  const isGrade1or2 = (grade === 1 || grade === 2);

  // Chế độ trình chiếu chỗ ngồi riêng cho học sinh trên màn chiếu lớn
  const [isDisplayMode, setIsDisplayMode] = useState(false);

  // Vị trí của Bàn Giáo Viên & Dãy 1 (mặc định 'right')
  const [teacherSide, setTeacherSide] = useState('right'); // 'right' | 'left'
  // Góc nhìn hiển thị: 'teacher' (Góc nhìn Giáo viên) | 'student' (Góc nhìn Học sinh)
  const [chartPerspective, setChartPerspective] = useState('teacher');
  // Danh sách máy hỏng dùng chung cho toàn bộ 23 lớp
  const [brokenMachines, setBrokenMachines] = useState(() => getGlobalBrokenMachines());
  // Modal máy đang chọn
  const [activeMachineNum, setActiveMachineNum] = useState(null);

  // Danh sách nội quy phòng máy phục vụ cộng/trừ nhanh
  const rules = React.useMemo(() => getClassroomRules(), [activeMachineNum]);
  const [quickRuleFeedback, setQuickRuleFeedback] = useState(null);

  // Thông báo khi tự động xếp lại chỗ do báo máy hỏng
  const [reassignAlerts, setReassignAlerts] = useState(null);

  React.useEffect(() => {
    if (!reassignAlerts) return;
    const timer = setTimeout(() => {
      setReassignAlerts(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [reassignAlerts]);

  // Hàm cộng / trừ sao và ghi nhận nội quy phòng máy cho học sinh
  const handleAwardStudent = (studentId, pointsDelta, ruleObj = null) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) return;

    const currentStars = targetStudent.stars || 0;
    const newStars = Math.max(0, currentStars + pointsDelta);

    const updated = students.map(s => s.id === studentId ? { ...s, stars: newStars } : s);
    onUpdateStudents(updated);

    // Âm thanh
    if (soundEnabled) {
      if (pointsDelta > 0) {
        if (pointsDelta >= 5) soundEffects.playVictory();
        else soundEffects.playStarDing();
      } else {
        soundEffects.playBuzzer();
      }
    }

    // Nhật ký điểm tốt / trừ nếu có
    if (ruleObj && onUpdateGoodScores) {
      const rec = {
        id: `gs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        date: new Date().toISOString().slice(0, 10),
        type: ruleObj.type,
        title: `${ruleObj.icon} ${ruleObj.title}`,
        points: Math.abs(pointsDelta),
        scoreChange: pointsDelta,
        note: `Ghi nhận tại Máy ${activeMachineNum}`
      };
      const prevGoodScores = currentClass?.goodScores || [];
      onUpdateGoodScores([rec, ...prevGoodScores]);
    }

    const msg = pointsDelta > 0
      ? `+${pointsDelta}⭐ cho ${targetStudent.name}${ruleObj ? ` (${ruleObj.title})` : ''}`
      : `${pointsDelta}⭐ cho ${targetStudent.name}${ruleObj ? ` (${ruleObj.title})` : ''}`;
    setQuickRuleFeedback({ text: msg, isPositive: pointsDelta > 0 });
    setTimeout(() => setQuickRuleFeedback(null), 3500);
  };

  // Nạp danh sách máy hỏng từ SQLite nếu có
  React.useEffect(() => {
    async function loadBrokenFromSqlite() {
      const fromSqlite = await fetchBrokenMachinesFromSqlite();
      if (fromSqlite && Array.isArray(fromSqlite)) {
        setBrokenMachines(fromSqlite);
        saveGlobalBrokenMachines(fromSqlite);
      }
    }
    loadBrokenFromSqlite();
  }, []);

  // Tính toán layout 5 dãy
  const labLayout = useMemo(() => {
    if (teacherSide === 'right') {
      return [
        { id: 5, rowName: 'Dãy 5', subtitle: 'Phía Cửa Ra Vào', machineRange: [26, 31], count: 6, isTeacherSide: false, isDoorSide: true },
        { id: 4, rowName: 'Dãy 4', subtitle: 'Làn máy số 4', machineRange: [20, 25], count: 6, isTeacherSide: false, isDoorSide: false },
        { id: 3, rowName: 'Dãy 3', subtitle: 'Làn máy trung tâm', machineRange: [14, 19], count: 6, isTeacherSide: false, isDoorSide: false },
        { id: 2, rowName: 'Dãy 2', subtitle: 'Làn máy số 2', machineRange: [8, 13], count: 6, isTeacherSide: false, isDoorSide: false },
        { id: 1, rowName: 'Dãy 1 (Trong cùng)', subtitle: 'Đối diện Bàn Giáo Viên', machineRange: [1, 7], count: 7, isTeacherSide: true, isDoorSide: false },
      ];
    } else {
      return [
        { id: 1, rowName: 'Dãy 1 (Trong cùng)', subtitle: 'Đối diện Bàn Giáo Viên', machineRange: [1, 7], count: 7, isTeacherSide: true, isDoorSide: false },
        { id: 2, rowName: 'Dãy 2', subtitle: 'Làn máy số 2', machineRange: [8, 13], count: 6, isTeacherSide: false, isDoorSide: false },
        { id: 3, rowName: 'Dãy 3', subtitle: 'Làn máy trung tâm', machineRange: [14, 19], count: 6, isTeacherSide: false, isDoorSide: false },
        { id: 4, rowName: 'Dãy 4', subtitle: 'Làn máy số 4', machineRange: [20, 25], count: 6, isTeacherSide: false, isDoorSide: false },
        { id: 5, rowName: 'Dãy 5', subtitle: 'Phía Cửa Ra Vào', machineRange: [26, 31], count: 6, isTeacherSide: false, isDoorSide: true },
      ];
    }
  }, [teacherSide]);

  // Tạo map máy -> danh sách học sinh (tối đa 2 học sinh mỗi máy)
  const machineStudentMap = useMemo(() => {
    const map = {};
    for (let m = 1; m <= 31; m++) {
      map[m] = [];
    }

    const assignedIds = new Set();
    students.forEach(s => {
      if (s.machineNumber && s.machineNumber >= 1 && s.machineNumber <= 31) {
        // Tuyệt đối không nhận học sinh vào máy đang báo hỏng
        if (!brokenMachines.includes(s.machineNumber)) {
          if (map[s.machineNumber].length < 2) {
            map[s.machineNumber].push(s);
            assignedIds.add(s.id);
          }
        }
      }
    });

    // Với học sinh chưa có số máy, tự động xếp vào máy hoạt động còn trống
    // Hoặc ghép vào máy đã có 1 bạn nếu máy không đủ
    const workingMachines = [];
    for (let m = 1; m <= 31; m++) {
      if (!brokenMachines.includes(m)) {
        workingMachines.push(m);
      }
    }

    let unassigned = students.filter(s => !assignedIds.has(s.id));

    // Đợt 1: xếp vào máy hoàn toàn trống
    for (const m of workingMachines) {
      if (unassigned.length === 0) break;
      if (map[m].length === 0) {
        const s = unassigned.shift();
        map[m].push(s);
        assignedIds.add(s.id);
      }
    }

    // Đợt 2: nếu vẫn còn học sinh, cho ngồi ghép 2 bạn/máy vào các máy hoạt động
    for (const m of workingMachines) {
      if (unassigned.length === 0) break;
      if (map[m].length === 1) {
        const s = unassigned.shift();
        map[m].push(s);
        assignedIds.add(s.id);
      }
    }

    return map;
  }, [students, brokenMachines]);

  // Xếp tuần tự: ưu tiên 1 bạn / máy, tự động ghép 2 bạn / máy nếu thiếu máy hoặc máy hỏng
  const handleAutoAssign = () => {
    const workingMachines = [];
    for (let m = 1; m <= 31; m++) {
      if (!brokenMachines.includes(m)) {
        workingMachines.push(m);
      }
    }

    if (workingMachines.length === 0) {
      alert('Tất cả các máy đều đang báo hỏng!');
      return;
    }

    const updated = [...students];
    let sIdx = 0;

    // Lượt 1: mỗi máy hoạt động 1 bạn
    for (let i = 0; i < workingMachines.length && sIdx < updated.length; i++) {
      updated[sIdx] = { ...updated[sIdx], machineNumber: workingMachines[i] };
      sIdx++;
    }

    // Lượt 2: nếu còn học sinh, ghép đôi 2 bạn / máy vào các máy hoạt động
    for (let i = 0; i < workingMachines.length && sIdx < updated.length; i++) {
      updated[sIdx] = { ...updated[sIdx], machineNumber: workingMachines[i] };
      sIdx++;
    }

    // Học sinh còn lại nếu vượt quá 62 bạn
    while (sIdx < updated.length) {
      updated[sIdx] = { ...updated[sIdx], machineNumber: null };
      sIdx++;
    }

    onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playVictory();
  };

  // Xếp ngẫu nhiên
  const handleShuffleAssign = () => {
    const workingMachines = [];
    for (let m = 1; m <= 31; m++) {
      if (!brokenMachines.includes(m)) {
        workingMachines.push(m);
      }
    }

    if (workingMachines.length === 0) return;

    const shuffledStudents = [...students].sort(() => 0.5 - Math.random());
    const shuffledMachines = [...workingMachines].sort(() => 0.5 - Math.random());

    const machineSlots = [];
    shuffledMachines.forEach(m => machineSlots.push(m));
    shuffledMachines.forEach(m => machineSlots.push(m)); // Lượt 2 cho bạn thứ 2 ngồi ghép

    const updated = shuffledStudents.map((s, idx) => ({
      ...s,
      machineNumber: idx < machineSlots.length ? machineSlots[idx] : null
    }));

    onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playVictory();
  };

  // Thưởng sao thi đua 1-chạm
  const addStar = (studentId) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, stars: (s.stars || 0) + 1 };
      }
      return s;
    });
    onUpdateStudents(updated);
    if (soundEnabled) soundEffects.playStarDing();
  };

  // Bật/tắt máy hỏng dùng chung toàn trường & tự động chuyển chỗ ngồi cho học sinh
  const toggleBrokenMachine = (machineNum) => {
    const isCurrentlyBroken = brokenMachines.includes(machineNum);

    if (isCurrentlyBroken) {
      // 1. GIÁO VIÊN HỦY BÁO HỎNG (máy đã sửa xong, đưa về hoạt động bình thường)
      const nextBroken = brokenMachines.filter(m => m !== machineNum);
      setBrokenMachines(nextBroken);
      saveGlobalBrokenMachines(nextBroken);
      syncBrokenMachinesToSqlite(nextBroken);

      // Máy trở về trạng thái trống bình thường, KHÔNG tự động kéo học sinh về để tránh xáo trộn
      setReassignAlerts({
        type: 'info',
        title: `Đã Hủy Báo Hỏng Máy ${String(machineNum).padStart(2, '0')}`,
        items: [
          {
            type: 'info',
            text: `Máy ${String(machineNum).padStart(2, '0')} đã sẵn sàng hoạt động bình thường (ở trạng thái trống). Thầy/Cô có thể xếp học sinh thủ công nếu muốn dùng lại máy này.`
          }
        ]
      });

      if (soundEnabled) soundEffects.playTick();
      return;
    }

    // 2. GIÁO VIÊN BÁO MÁY HỎNG
    const nextBroken = [...brokenMachines, machineNum];
    setBrokenMachines(nextBroken);
    saveGlobalBrokenMachines(nextBroken);
    syncBrokenMachinesToSqlite(nextBroken);

    // a. Lấy danh sách học sinh đang gán ở máy vừa bị đánh dấu hỏng (cả HS1 và HS2 nếu có)
    const currentOnBroken = machineStudentMap[machineNum] || [];
    const displacedStudents = students.filter(
      s => Number(s.machineNumber) === machineNum || currentOnBroken.some(c => c.id === s.id)
    );

    if (displacedStudents.length === 0) {
      // Máy đang trống, không có học sinh bị ảnh hưởng
      setReassignAlerts({
        type: 'warning',
        title: `Đã Báo Hỏng Máy ${String(machineNum).padStart(2, '0')}`,
        items: [
          {
            type: 'warning',
            text: `Máy ${String(machineNum).padStart(2, '0')} đã được đánh dấu Hỏng (máy đang trống, không có học sinh bị ảnh hưởng).`
          }
        ]
      });
      if (soundEnabled) soundEffects.playBuzzer();
      return;
    }

    // b. Xác định các máy hoạt động còn lại
    const workingMachines = [];
    for (let m = 1; m <= 31; m++) {
      if (!nextBroken.includes(m)) {
        workingMachines.push(m);
      }
    }

    // c. Tính toán số lượng học sinh hiện có ở các máy hoạt động (loại trừ các học sinh ở máy vừa hỏng)
    const displacedIds = new Set(displacedStudents.map(s => s.id));
    const occupancyMap = {};
    for (const m of workingMachines) {
      const seated = (machineStudentMap[m] || []).filter(s => !displacedIds.has(s.id));
      occupancyMap[m] = [...seated];
    }

    const notices = [];
    const updatedStudents = [...students];

    // d. Duyệt qua từng học sinh bị ảnh hưởng để tìm máy phù hợp theo đúng logic ghép đôi
    for (const student of displacedStudents) {
      let targetMachine = null;

      // ƯU TIÊN 1: Tìm máy hoạt động còn trống hoàn toàn (0 học sinh)
      for (const m of workingMachines) {
        if (occupancyMap[m].length === 0) {
          targetMachine = m;
          break;
        }
      }

      // ƯU TIÊN 2: Nếu hết máy trống hoàn toàn, tìm máy đang có đúng 1 học sinh (ghép đôi slot 2)
      if (!targetMachine) {
        for (const m of workingMachines) {
          if (occupancyMap[m].length === 1) {
            targetMachine = m;
            break;
          }
        }
      }

      const sIdx = updatedStudents.findIndex(s => s.id === student.id);

      if (targetMachine) {
        // Gán học sinh vào targetMachine và cập nhật occupancy
        occupancyMap[targetMachine].push(student);
        const isPaired = occupancyMap[targetMachine].length === 2;

        if (sIdx !== -1) {
          updatedStudents[sIdx] = { ...updatedStudents[sIdx], machineNumber: targetMachine };
        }

        notices.push({
          type: 'success',
          text: `Đã tự động chuyển ${student.name} từ Máy ${String(machineNum).padStart(2, '0')} (hỏng) sang Máy ${String(targetMachine).padStart(2, '0')}${isPaired ? ' (ngồi ghép đôi)' : ''}`
        });
      } else {
        // Trường hợp không còn máy trống / chỗ ghép (tất cả máy hoạt động đã đủ 2 bạn)
        // Tuyệt đối KHÔNG tự ý ghép 3 bạn vào 1 máy, chuyển về trạng thái chưa có chỗ (machineNumber = null)
        if (sIdx !== -1) {
          updatedStudents[sIdx] = { ...updatedStudents[sIdx], machineNumber: null };
        }

        notices.push({
          type: 'error',
          text: `Không đủ chỗ để tự động xếp lại cho ${student.name} — vui lòng xếp thủ công`
        });
      }
    }

    // Cập nhật lại dữ liệu xếp chỗ trong database cho các học sinh vừa được chuyển
    onUpdateStudents(updatedStudents);

    const hasError = notices.some(n => n.type === 'error');
    setReassignAlerts({
      type: hasError ? 'error' : 'success',
      title: `Báo Hỏng Máy ${String(machineNum).padStart(2, '0')} — Tự Động Xử Lý Chỗ Ngồi`,
      items: notices
    });

    if (soundEnabled) {
      if (hasError) soundEffects.playBuzzer();
      else soundEffects.playStarDing();
    }
  };

  // Gán học sinh cụ thể vào máy (Học sinh 1 hoặc Học sinh 2)
  const handleSetStudentAtSlot = (machineNum, studentId, slotIndex) => {
    const currentOnMachine = machineStudentMap[machineNum] || [];
    
    // Nếu chọn gỡ học sinh tại slot này
    if (!studentId) {
      const studentToRemove = currentOnMachine[slotIndex];
      if (studentToRemove) {
        const updated = students.map(s => s.id === studentToRemove.id ? { ...s, machineNumber: null } : s);
        onUpdateStudents(updated);
      }
      return;
    }

    // Gán studentId vào máy
    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, machineNumber: machineNum };
      }
      // Nếu có học sinh cũ tại slot này và khác studentId mới
      const oldStudentAtSlot = currentOnMachine[slotIndex];
      if (oldStudentAtSlot && s.id === oldStudentAtSlot.id && s.id !== studentId) {
        return { ...s, machineNumber: null };
      }
      return s;
    });

    onUpdateStudents(updated);
  };

  // Gỡ cả máy (tất cả học sinh ở máy đó)
  const handleClearMachine = (machineNum) => {
    const updated = students.map(s => {
      if (s.machineNumber === machineNum) {
        return { ...s, machineNumber: null };
      }
      return s;
    });
    onUpdateStudents(updated);
  };

  // Thống kê phòng máy
  const allSeatedStudents = Object.values(machineStudentMap).flat();

  // Đếm số máy ghép 2 học sinh
  let sharedMachinesCount = 0;
  for (let m = 1; m <= 31; m++) {
    if ((machineStudentMap[m] || []).length === 2) {
      sharedMachinesCount++;
    }
  }

  const activeMachineStudents = activeMachineNum ? (machineStudentMap[activeMachineNum] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Toolbar */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>🖥️</span> Sơ Đồ Phòng Máy (31 Máy • Hỗ Trợ 2 HS/Máy)
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Cho phép 2 học sinh ngồi ghép chung 1 máy khi có máy hỏng hoặc sĩ số đông • Đánh giá kỹ năng & cộng sao thi đua 1-chạm
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 700 }}>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <CheckCircle2 size={16} /> {allSeatedStudents.length} HS có chỗ
              </span>
              •
              <span style={{ color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Số máy có 2 học sinh ngồi chung">
                <Users size={16} /> {sharedMachinesCount} Máy ghép 2 bạn
              </span>
              •
              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Wrench size={16} /> {brokenMachines.length} Máy hỏng
              </span>
            </div>

            {/* Nút Chiếu Sơ Đồ Chỗ Ngồi cho học sinh */}
            <button 
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsDisplayMode(true)}
              title="Bật Chế độ trình chiếu chỗ ngồi để chiếu lên màn hình lớn/máy chiếu cho học sinh xem"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                padding: '0.35rem 0.85rem',
                cursor: 'pointer'
              }}
            >
              <Maximize2 size={15} />
              <span>Chiếu Sơ Đồ Chỗ Ngồi</span>
            </button>

            {/* Bộ chọn 2 góc nhìn: Giáo Viên & Học Sinh */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--surface-secondary)',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--surface-border)'
            }}>
              <button
                type="button"
                className={`btn btn-xs ${chartPerspective === 'teacher' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setChartPerspective('teacher')}
                style={{ fontWeight: 800, padding: '0.25rem 0.6rem' }}
                title="Góc nhìn Giáo viên (nhìn từ bục giảng xuống)"
              >
                👨‍🏫 Góc Nhìn GV
              </button>
              <button
                type="button"
                className={`btn btn-xs ${chartPerspective === 'student' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setChartPerspective('student')}
                style={{ fontWeight: 800, padding: '0.25rem 0.6rem' }}
                title="Góc nhìn Học sinh (đứng từ cửa/cuối phòng nhìn lên bảng, xoay 180°)"
              >
                🧑‍🎓 Góc Nhìn HS
              </button>
            </div>

            {/* Đổi hướng phòng */}
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setTeacherSide(prev => prev === 'right' ? 'left' : 'right')}
              title="Đổi hướng Bàn GV & Dãy 1 (Bên Phải hoặc Bên Trái)"
            >
              <ArrowLeftRight size={14} />
              Đổi Bên: {teacherSide === 'right' ? 'Bàn GV Bên Phải' : 'Bàn GV Bên Trái'}
            </button>

            <button className="btn btn-outline btn-sm" onClick={handleAutoAssign} title="Xếp học sinh tuần tự (tự động ghép đôi nếu thiếu máy)">
              <RotateCcw size={14} />
              Tự Động Xếp & Ghép Máy
            </button>

            <button className="btn btn-secondary btn-sm" onClick={handleShuffleAssign} title="Xếp ngẫu nhiên">
              <Shuffle size={14} color="var(--primary)" />
              Xếp Ngẫu Nhiên
            </button>
          </div>
        </div>
      </div>

      {/* Thông Báo Tự Động Xếp Lại Chỗ Khi Báo Máy Hỏng */}
      {reassignAlerts && (
        <div style={{
          background: reassignAlerts.type === 'error' ? '#fef2f2' : (reassignAlerts.type === 'warning' ? '#fffbeb' : '#ecfdf5'),
          border: `1.5px solid ${reassignAlerts.type === 'error' ? '#f87171' : (reassignAlerts.type === 'warning' ? '#fde047' : '#34d399')}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.35rem', lineHeight: 1 }}>
              {reassignAlerts.type === 'error' ? '🚫' : (reassignAlerts.type === 'warning' ? '⚠️' : '✅')}
            </div>
            <div>
              <div style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: reassignAlerts.type === 'error' ? '#991b1b' : (reassignAlerts.type === 'warning' ? '#854d0e' : '#065f46'),
                marginBottom: '0.35rem'
              }}>
                {reassignAlerts.title}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {reassignAlerts.items.map((it, idx) => (
                  <li 
                    key={idx} 
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: it.type === 'error' ? '#b91c1c' : '#1e293b'
                    }}
                  >
                    {it.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setReassignAlerts(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontWeight: 800,
              fontSize: '1.1rem',
              padding: '0.1rem 0.4rem',
              borderRadius: 4
            }}
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Định Hướng Phía Trên Tùy Theo Góc Nhìn */}
      {chartPerspective === 'student' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'stretch',
          padding: '0 0.5rem',
          marginBottom: '0.25rem'
        }}>
          {/* Cột 1: Bàn Giáo Viên (Dãy 1 trong cùng) */}
          <div style={{
            gridColumn: '1 / 2',
            padding: '0.65rem 0.85rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(254, 243, 199, 0.25))',
            border: '2px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem'
          }}>
            <Server size={18} color="#d97706" />
            <span style={{ fontWeight: 900, color: '#b45309', fontSize: '0.875rem' }}>💻 BÀN GIÁO VIÊN</span>
          </div>

          {/* Cột 2, 3, 4: Bảng và Tivi */}
          <div style={{
            gridColumn: '2 / 5',
            textAlign: 'center',
            padding: '0.65rem 1rem',
            background: 'var(--surface-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--surface-border)',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem'
          }}>
            <span>📋 BẢNG LỚP HỌC & MÀN CHIẾU CHÍNH (HƯỚNG NHÌN LÊN)</span>
          </div>

          {/* Cột 5: Cửa ra vào */}
          <div style={{
            gridColumn: '5 / 6',
            padding: '0.65rem 0.85rem',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(224, 242, 254, 0.25))',
            border: '2px solid #0284c7',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem'
          }}>
            <span style={{ fontWeight: 900, color: '#0284c7', fontSize: '0.875rem' }}>🚪 CỬA RA VÀO</span>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.45rem 1.25rem',
          background: 'var(--surface-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--surface-border)',
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: 'var(--text-muted)'
        }}>
          {teacherSide === 'right' ? (
            <>
              <span style={{ color: '#0284c7' }}>🚪 PHÍA DÃY NGOÀI CÙNG (DÃY 5)</span>
              <span>🪟 CỬA SỔ LẤY SÁNG & PHÍA CUỐI PHÒNG THỰC HÀNH</span>
              <span style={{ color: '#d97706' }}>📍 PHÍA DÃY TRONG CÙNG (DÃY 1)</span>
            </>
          ) : (
            <>
              <span style={{ color: '#d97706' }}>📍 PHÍA DÃY TRONG CÙNG (DÃY 1)</span>
              <span>🪟 CỬA SỔ LẤY SÁNG & PHÍA CUỐI PHÒNG THỰC HÀNH</span>
              <span style={{ color: '#0284c7' }}>🚪 PHÍA DÃY NGOÀI CÙNG (DÃY 5)</span>
            </>
          )}
        </div>
      )}

      {/* 5 Dãy Máy Tính Theo Góc Nhìn Đang Chọn */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(215px, 1fr))',
        gap: '1rem',
        alignItems: 'start',
        overflowX: 'auto',
        paddingBottom: '1rem'
      }}>
        {(chartPerspective === 'student' ? [...labLayout].sort((a, b) => a.id - b.id) : labLayout).map(row => {
          const [start, end] = row.machineRange;
          const machineNumbers = [];
          if (chartPerspective === 'student') {
            for (let m = end; m >= start; m--) {
              machineNumbers.push(m);
            }
          } else {
            for (let m = start; m <= end; m++) {
              machineNumbers.push(m);
            }
          }

          let borderTopColor = 'var(--primary)';
          let bgPanel = 'var(--surface-card)';
          let shadowPanel = 'var(--shadow-sm)';

          if (row.isTeacherSide) {
            borderTopColor = '#f59e0b';
            bgPanel = 'rgba(254, 243, 199, 0.2)';
            shadowPanel = '0 4px 15px rgba(245, 158, 11, 0.15)';
          } else if (row.isDoorSide) {
            borderTopColor = '#0ea5e9';
            bgPanel = 'rgba(14, 165, 233, 0.04)';
            shadowPanel = '0 4px 15px rgba(14, 165, 233, 0.1)';
          }

          return (
            <div 
              key={row.id}
              className="glass-panel"
              style={{
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                borderTop: `4px solid ${borderTopColor}`,
                background: bgPanel,
                boxShadow: shadowPanel
              }}
            >
              {/* Row Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.4rem',
                borderBottom: '1px solid var(--surface-border)'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '0.9375rem',
                    fontWeight: 800,
                    color: row.isTeacherSide ? '#d97706' : (row.isDoorSide ? '#0284c7' : 'var(--text-main)'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    {row.rowName}
                    {row.isTeacherSide && <Sparkles size={14} color="#f59e0b" />}
                  </h3>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: row.isTeacherSide ? '#b45309' : (row.isDoorSide ? '#0369a1' : 'var(--text-muted)')
                  }}>
                    {row.subtitle}
                  </span>
                </div>

                <span style={{
                  fontSize: '0.71875rem',
                  fontWeight: 800,
                  background: row.isTeacherSide ? '#fef3c7' : (row.isDoorSide ? '#e0f2fe' : 'var(--surface-secondary)'),
                  color: row.isTeacherSide ? '#b45309' : (row.isDoorSide ? '#0369a1' : 'var(--text-muted)'),
                  padding: '0.15rem 0.45rem',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {row.count} máy
                </span>
              </div>

              {/* Workstations List in this row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {machineNumbers.map(mNum => {
                  const assigned = machineStudentMap[mNum] || [];
                  const isBroken = brokenMachines.includes(mNum);
                  const isShared = assigned.length === 2;

                  let statusBorder = 'var(--surface-border)';
                  let statusBg = 'var(--surface)';

                  if (isBroken) {
                    statusBorder = '#f59e0b';
                    statusBg = 'rgba(245, 158, 11, 0.08)';
                  } else if (isShared) {
                    statusBorder = '#818cf8';
                    statusBg = 'rgba(99, 102, 241, 0.04)';
                  } else if (assigned.length === 1) {
                    statusBorder = '#10b981';
                    statusBg = 'rgba(16, 185, 129, 0.04)';
                  }

                  return (
                    <div
                      key={mNum}
                      onClick={() => setActiveMachineNum(mNum)}
                      style={{
                        padding: '0.6rem 0.65rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${statusBorder}`,
                        background: statusBg,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      {/* Top Bar: Machine # & Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Monitor size={15} color={isBroken ? '#f59e0b' : (row.isTeacherSide ? '#d97706' : 'var(--primary)')} />
                          <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                            Máy {String(mNum).padStart(2, '0')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {isBroken && (
                            <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '0.1rem 0.35rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                              <AlertTriangle size={10} /> Hỏng
                            </span>
                          )}

                          {isShared && (
                            <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '0.1rem 0.4rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Users size={10} /> 2 Bạn
                            </span>
                          )}

                          {assigned.length === 0 && !isBroken && (
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)' }}>
                              Trống
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display warning if machine is broken */}
                      {isBroken && (
                        <div style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '0.25rem 0.4rem', borderRadius: 4 }}>
                          {assigned.length > 0 
                            ? '⚠️ Máy hỏng! Hãy chuyển học sinh sang máy khác.' 
                            : '⚠️ Máy hỏng - Tạm ngưng sử dụng'}
                        </div>
                      )}

                      {/* Student(s) Display */}
                      {assigned.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {assigned.map((student) => {
                            return (
                              <div 
                                key={student.id} 
                                style={{
                                  background: isShared ? 'var(--surface)' : 'transparent',
                                  padding: isShared ? '0.35rem 0.45rem' : '0',
                                  borderRadius: 'var(--radius-sm)',
                                  border: isShared ? '1px solid var(--surface-border)' : 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.25rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                                    <div style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      background: student.gender === 'Nữ' ? '#fdf2f8' : '#eff6ff',
                                      color: student.gender === 'Nữ' ? '#db2777' : '#2563eb',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      flexShrink: 0
                                    }}>
                                      {student.name.trim().split(' ').pop()?.[0] || 'H'}
                                    </div>
                                    <div style={{
                                      fontSize: '0.8125rem',
                                      fontWeight: 700,
                                      color: 'var(--text-main)',
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                      overflow: 'hidden'
                                    }}>
                                      {student.name}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                                    <span style={{
                                      fontSize: '0.6875rem',
                                      fontWeight: 800,
                                      color: '#0284c7',
                                      background: 'rgba(2, 132, 199, 0.1)',
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: 3
                                    }} title="Mức đạt kỹ năng thực hành (T: Tốt, H: Hoàn thành, C: Cần cố gắng)">
                                      {isGrade1or2 ? (student.skill_mouse || 'T') : (student.eval_regular || 'T')}
                                    </span>
                                    <span style={{ fontSize: '0.71875rem', fontWeight: 800, color: '#d97706' }}>
                                      {student.stars || 0}⭐
                                    </span>
                                  </div>
                                </div>

                                {/* Nút Thưởng Sao Nhanh 1-Chạm */}
                                <div 
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="btn btn-amber btn-xs"
                                    style={{ 
                                      flex: 1, 
                                      padding: '0.2rem 0.4rem', 
                                      fontSize: '0.6875rem', 
                                      fontWeight: 800, 
                                      borderRadius: 4, 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      gap: '0.25rem',
                                      boxShadow: '0 1px 3px rgba(245, 158, 11, 0.2)'
                                    }}
                                    onClick={() => addStar(student.id)}
                                    title="Thưởng 1 sao thi đua thực hành"
                                  >
                                    <Star size={11} fill="currentColor" /> +1 Sao
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Nút thêm bạn ngồi ghép nếu máy mới có 1 bạn */}
                          {assigned.length === 1 && !isBroken && (
                            <div 
                              style={{
                                textAlign: 'center',
                                padding: '0.2rem',
                                border: '1px dashed var(--primary)',
                                borderRadius: 4,
                                color: 'var(--primary)',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: 'rgba(79, 70, 229, 0.04)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMachineNum(mNum);
                              }}
                            >
                              + Thêm Bạn Ngồi Ghép (HS 2)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '0.2rem 0' }}>
                          {isBroken ? '(Máy hỏng - Không sử dụng)' : '(Nhấp để gán học sinh vào máy)'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Phía Dưới Phòng Máy Tùy Theo Góc Nhìn */}
      {chartPerspective === 'student' ? (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.65rem 1.25rem',
          background: 'var(--surface-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--surface-border)',
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          marginTop: '0.5rem'
        }}>
          <span style={{ color: '#d97706' }}>📍 PHÍA TRONG CÙNG (CUỐI DÃY 1)</span>
          <span>🪟 HƯỚNG CUỐI PHÒNG MÁY / CỬA SỔ THÔNG THOÁNG</span>
          <span style={{ color: '#0284c7' }}>🚪 CỬA RA VÀO PHÍA SAU (CUỐI DÃY 5)</span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'stretch',
          padding: '0 0.5rem',
          marginTop: '0.5rem'
        }}>
          {teacherSide === 'right' ? (
            <>
              {/* Cột 1: Cửa ra vào (dưới Dãy 5) */}
              <div style={{
                gridColumn: '1 / 2',
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(16, 185, 129, 0.18))',
                border: '2px dashed var(--secondary)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}>
                <div style={{ fontSize: '0.71875rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Cùng hàng Bảng & Bàn GV
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontWeight: 900, fontSize: '0.9375rem' }}>
                  🚪 CỬA RA VÀO CHÍNH
                </div>
              </div>

              {/* Cột 2, 3, 4: Bảng lớp học & Màn chiếu chính */}
              <div style={{
                gridColumn: '2 / 5',
                textAlign: 'center',
                padding: '0.85rem 1rem',
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--surface-border)',
                color: 'var(--text-main)',
                fontSize: '0.9375rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem'
              }}>
                <span>📋 BẢNG LỚP HỌC & MÀN CHIẾU CHÍNH</span>
              </div>

              {/* Cột 5: Bàn Giáo Viên & Máy Chủ (dưới Dãy 1 trong cùng) */}
              <div style={{
                gridColumn: '5 / 6',
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(245, 158, 11, 0.22))',
                border: '2px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} /> Đối diện trực tiếp Dãy 1 (Máy 01 – 07)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 900, fontSize: '0.9375rem' }}>
                  <Server size={20} color="var(--accent)" />
                  BÀN GIÁO VIÊN & MÁY CHỦ
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Cột 1: Bàn Giáo Viên & Máy Chủ (dưới Dãy 1 trong cùng) */}
              <div style={{
                gridColumn: '1 / 2',
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(245, 158, 11, 0.22))',
                border: '2px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} /> Đối diện trực tiếp Dãy 1 (Máy 01 – 07)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 900, fontSize: '0.9375rem' }}>
                  <Server size={20} color="var(--accent)" />
                  BÀN GIÁO VIÊN & MÁY CHỦ
                </div>
              </div>

              {/* Cột 2, 3, 4: Bảng lớp học & Màn chiếu chính */}
              <div style={{
                gridColumn: '2 / 5',
                textAlign: 'center',
                padding: '0.85rem 1rem',
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--surface-border)',
                color: 'var(--text-main)',
                fontSize: '0.9375rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem'
              }}>
                <span>📋 BẢNG LỚP HỌC & MÀN CHIẾU CHÍNH</span>
              </div>

              {/* Cột 5: Cửa ra vào (dưới Dãy 5) */}
              <div style={{
                gridColumn: '5 / 6',
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(16, 185, 129, 0.18))',
                border: '2px dashed var(--secondary)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}>
                <div style={{ fontSize: '0.71875rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Cùng hàng Bảng & Bàn GV
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontWeight: 900, fontSize: '0.9375rem' }}>
                  🚪 CỬA RA VÀO CHÍNH
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Chi Tiết Máy Tính: Hỗ Trợ Ghép 2 Học Sinh */}
      {activeMachineNum && (
        <div className="modal-overlay" onClick={() => setActiveMachineNum(null)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Monitor size={24} color="var(--primary)" />
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Máy Tính Số {String(activeMachineNum).padStart(2, '0')}
                </h3>
                {brokenMachines.includes(activeMachineNum) && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                    ⚠️ BÁO HỎNG
                  </span>
                )}
              </div>

              <button
                className={`btn btn-sm ${brokenMachines.includes(activeMachineNum) ? 'btn-danger' : 'btn-outline'}`}
                onClick={() => toggleBrokenMachine(activeMachineNum)}
              >
                <Wrench size={14} />
                {brokenMachines.includes(activeMachineNum) ? 'Hủy Báo Hỏng' : 'Báo Máy Hỏng'}
              </button>
            </div>

            {brokenMachines.includes(activeMachineNum) && (
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: '#b45309',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                  <AlertTriangle size={18} color="#d97706" />
                  <span>Máy này đang gặp sự cố (Đã Báo Hỏng / Tạm Ngưng).</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#78350f' }}>
                  Hệ thống đã tự động gỡ và xếp lại các học sinh trước đó sang máy hoạt động khác. Khi máy được sửa xong, hãy bấm "Hủy Báo Hỏng" để đưa máy trở lại sử dụng bình thường.
                </div>
              </div>
            )}

            {/* Thông báo kết quả tự động chuyển chỗ trong modal */}
            {reassignAlerts && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.825rem',
                fontWeight: 700,
                background: reassignAlerts.type === 'error' ? '#fef2f2' : '#ecfdf5',
                color: reassignAlerts.type === 'error' ? '#991b1b' : '#065f46',
                border: `1px solid ${reassignAlerts.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <div style={{ fontWeight: 800 }}>{reassignAlerts.title}:</div>
                {reassignAlerts.items.map((it, idx) => (
                  <div key={idx} style={{ color: it.type === 'error' ? '#b91c1c' : '#1e293b' }}>
                    • {it.text}
                  </div>
                ))}
              </div>
            )}

            {/* Thông báo thưởng / phạt theo nội quy */}
            {quickRuleFeedback && (
              <div style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: quickRuleFeedback.isPositive ? '#ecfdf5' : '#fef2f2',
                color: quickRuleFeedback.isPositive ? '#065f46' : '#991b1b',
                border: `1px solid ${quickRuleFeedback.isPositive ? '#6ee7b7' : '#fca5a5'}`,
                marginBottom: '1rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}>
                {quickRuleFeedback.isPositive ? '✨ ' : '⚠️ '}
                {quickRuleFeedback.text}
              </div>
            )}

            {/* Quản lý 2 học sinh trên máy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Học sinh 1 */}
              <div style={{
                background: 'var(--surface-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--primary)' }}>
                    👤 Học Sinh 1:
                  </label>
                  {activeMachineStudents[0] && (
                    <button 
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                      onClick={() => handleSetStudentAtSlot(activeMachineNum, null, 0)}
                      title="Gỡ học sinh 1"
                    >
                      <UserX size={13} /> Gỡ HS 1
                    </button>
                  )}
                </div>

                <select
                  className="input-field"
                  style={{ marginBottom: '0.75rem' }}
                  value={activeMachineStudents[0]?.id || ''}
                  onChange={(e) => handleSetStudentAtSlot(activeMachineNum, e.target.value, 0)}
                >
                  <option value="">-- Chưa có học sinh 1 (Bấm chọn) --</option>
                  {students
                    .filter(s => {
                      // Không cho phép chọn học sinh đang ngồi ở Slot 2 (HS2) của máy này
                      if (activeMachineStudents[1]?.id && s.id === activeMachineStudents[1].id) {
                        return false;
                      }
                      // Giữ lại học sinh đang ngồi ở Slot 1 (HS1) của máy này để xem/sửa/giữ nguyên
                      if (activeMachineStudents[0]?.id && s.id === activeMachineStudents[0].id) {
                        return true;
                      }
                      // Chỉ hiển thị học sinh chưa được xếp vào bất kỳ máy nào trong lớp
                      return !s.machineNumber || Number(s.machineNumber) < 1 || Number(s.machineNumber) > 31;
                    })
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.machineNumber ? ` [Đang ở Máy ${s.machineNumber}]` : ''}
                      </option>
                    ))}
                </select>

                {activeMachineStudents[0] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                    {/* Hàng Đánh Giá & Khen Thưởng Nhanh */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Đánh Giá Kỹ Năng T / H / C */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          {isGrade1or2 ? '🖱️ Kỹ Năng Chuột & Paint:' : '📋 Đánh Giá TT27:'}
                        </label>
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                          {['T', 'H', 'C'].map(lvl => {
                            const cur = isGrade1or2 ? (activeMachineStudents[0].skill_mouse || 'T') : (activeMachineStudents[0].eval_regular || 'T');
                            const isSelected = cur === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  borderRadius: 4,
                                  border: isSelected ? '1.5px solid transparent' : '1px solid var(--surface-border)',
                                  background: isSelected 
                                    ? (lvl === 'T' ? '#10b981' : lvl === 'H' ? '#0284c7' : '#f59e0b') 
                                    : 'var(--surface-card)',
                                  color: isSelected ? '#fff' : 'var(--text-muted)',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  const field = isGrade1or2 ? 'skill_mouse' : 'eval_regular';
                                  const updated = students.map(s => s.id === activeMachineStudents[0].id ? { ...s, [field]: lvl } : s);
                                  onUpdateStudents(updated);
                                }}
                              >
                                {lvl === 'T' ? 'T (Tốt)' : lvl === 'H' ? 'H (Đạt)' : 'C (Cố gắng)'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sao Thi Đua & Nội Quy Phòng Máy */}
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            ⭐ Sao & Nội Quy:
                          </label>
                          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>
                            {activeMachineStudents[0].stars || 0} ⭐
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-amber btn-xs"
                            onClick={() => handleAwardStudent(activeMachineStudents[0].id, 1)}
                            title="Thưởng +1 sao"
                          >
                            +1⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-amber btn-xs"
                            onClick={() => handleAwardStudent(activeMachineStudents[0].id, 2)}
                            title="Làm bài nhanh +2 sao"
                          >
                            +2⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-amber btn-xs"
                            onClick={() => handleAwardStudent(activeMachineStudents[0].id, 5)}
                            title="Xuất sắc +5 sao"
                          >
                            +5⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 800 }}
                            onClick={() => handleAwardStudent(activeMachineStudents[0].id, -1)}
                            title="Trừ 1 sao (Nhắc nhở / vi phạm)"
                          >
                            -1⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 800 }}
                            onClick={() => handleAwardStudent(activeMachineStudents[0].id, -2)}
                            title="Trừ 2 sao (Vi phạm nội quy)"
                          >
                            -2⭐
                          </button>
                        </div>
                        <select
                          className="input-field"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', height: 'auto', width: '100%', background: 'var(--surface-card)' }}
                          defaultValue=""
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            if (!selectedId) return;
                            const rule = rules.find(r => r.id === selectedId);
                            if (rule) {
                              const delta = rule.type === 'positive' ? rule.points : -rule.points;
                              handleAwardStudent(activeMachineStudents[0].id, delta, rule);
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="">⚖️ Áp dụng nhanh theo nội quy...</option>
                          <optgroup label="🌟 Điểm Tốt / Khen Thưởng (+)">
                            {rules.filter(r => r.type === 'positive').map(r => (
                              <option key={r.id} value={r.id}>
                                {r.icon} {r.title} (+{r.points}⭐)
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="⚠️ Vi Phạm / Điểm Trừ (-)">
                            {rules.filter(r => r.type === 'negative').map(r => (
                              <option key={r.id} value={r.id}>
                                {r.icon} {r.title} (-{r.points}⭐)
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Học sinh 2 (Ngồi ghép) */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.05)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--primary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 800, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Users size={16} /> Học Sinh 2 (Ngồi Ghép Chung):
                  </label>
                  {activeMachineStudents[1] && (
                    <button 
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                      onClick={() => handleSetStudentAtSlot(activeMachineNum, null, 1)}
                      title="Gỡ học sinh 2"
                    >
                      <UserX size={13} /> Gỡ HS 2
                    </button>
                  )}
                </div>

                <select
                  className="input-field"
                  style={{ marginBottom: '0.75rem' }}
                  value={activeMachineStudents[1]?.id || ''}
                  onChange={(e) => handleSetStudentAtSlot(activeMachineNum, e.target.value, 1)}
                >
                  <option value="">-- Chưa có bạn ngồi ghép (Chọn để thêm HS 2) --</option>
                  {students
                    .filter(s => {
                      // Không cho phép chọn học sinh đang ngồi ở Slot 1 (HS1) của máy này làm HS2
                      if (activeMachineStudents[0]?.id && s.id === activeMachineStudents[0].id) {
                        return false;
                      }
                      // Giữ lại học sinh đang ngồi ở Slot 2 (HS2) của máy này để xem/sửa/giữ nguyên
                      if (activeMachineStudents[1]?.id && s.id === activeMachineStudents[1].id) {
                        return true;
                      }
                      // Chỉ hiển thị học sinh chưa được xếp vào bất kỳ máy nào trong lớp
                      return !s.machineNumber || Number(s.machineNumber) < 1 || Number(s.machineNumber) > 31;
                    })
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.machineNumber ? ` [Đang ở Máy ${s.machineNumber}]` : ''}
                      </option>
                    ))}
                </select>

                {activeMachineStudents[1] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Đánh Giá Kỹ Năng T / H / C */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          {isGrade1or2 ? '🖱️ Kỹ Năng Chuột & Paint:' : '📋 Đánh Giá TT27:'}
                        </label>
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                          {['T', 'H', 'C'].map(lvl => {
                            const cur = isGrade1or2 ? (activeMachineStudents[1].skill_mouse || 'T') : (activeMachineStudents[1].eval_regular || 'T');
                            const isSelected = cur === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  borderRadius: 4,
                                  border: isSelected ? '1.5px solid transparent' : '1px solid var(--surface-border)',
                                  background: isSelected 
                                    ? (lvl === 'T' ? '#10b981' : lvl === 'H' ? '#0284c7' : '#f59e0b') 
                                    : 'var(--surface-card)',
                                  color: isSelected ? '#fff' : 'var(--text-muted)',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  const field = isGrade1or2 ? 'skill_mouse' : 'eval_regular';
                                  const updated = students.map(s => s.id === activeMachineStudents[1].id ? { ...s, [field]: lvl } : s);
                                  onUpdateStudents(updated);
                                }}
                              >
                                {lvl === 'T' ? 'T (Tốt)' : lvl === 'H' ? 'H (Đạt)' : 'C (Cố gắng)'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sao Thi Đua & Nội Quy Phòng Máy */}
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            ⭐ Sao & Nội Quy:
                          </label>
                          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>
                            {activeMachineStudents[1].stars || 0} ⭐
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-amber btn-xs"
                            onClick={() => handleAwardStudent(activeMachineStudents[1].id, 1)}
                            title="Thưởng +1 sao"
                          >
                            +1⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-amber btn-xs"
                            onClick={() => handleAwardStudent(activeMachineStudents[1].id, 2)}
                            title="Làm bài nhanh +2 sao"
                          >
                            +2⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-amber btn-xs"
                            onClick={() => handleAwardStudent(activeMachineStudents[1].id, 5)}
                            title="Xuất sắc +5 sao"
                          >
                            +5⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 800 }}
                            onClick={() => handleAwardStudent(activeMachineStudents[1].id, -1)}
                            title="Trừ 1 sao (Nhắc nhở / vi phạm)"
                          >
                            -1⭐
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 800 }}
                            onClick={() => handleAwardStudent(activeMachineStudents[1].id, -2)}
                            title="Trừ 2 sao (Vi phạm nội quy)"
                          >
                            -2⭐
                          </button>
                        </div>
                        <select
                          className="input-field"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', height: 'auto', width: '100%', background: 'var(--surface-card)' }}
                          defaultValue=""
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            if (!selectedId) return;
                            const rule = rules.find(r => r.id === selectedId);
                            if (rule) {
                              const delta = rule.type === 'positive' ? rule.points : -rule.points;
                              handleAwardStudent(activeMachineStudents[1].id, delta, rule);
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="">⚖️ Áp dụng nhanh theo nội quy...</option>
                          <optgroup label="🌟 Điểm Tốt / Khen Thưởng (+)">
                            {rules.filter(r => r.type === 'positive').map(r => (
                              <option key={r.id} value={r.id}>
                                {r.icon} {r.title} (+{r.points}⭐)
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="⚠️ Vi Phạm / Điểm Trừ (-)">
                            {rules.filter(r => r.type === 'negative').map(r => (
                              <option key={r.id} value={r.id}>
                                {r.icon} {r.title} (-{r.points}⭐)
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => {
                  handleClearMachine(activeMachineNum);
                  setActiveMachineNum(null);
                }}
              >
                Gỡ Cả 2 Học Sinh Khỏi Máy Này
              </button>

              <button className="btn btn-primary" onClick={() => setActiveMachineNum(null)}>
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chế độ trình chiếu chỗ ngồi riêng cho học sinh trên màn chiếu lớn */}
      {isDisplayMode && (
        <SeatingDisplayMode
          currentClass={currentClass}
          labLayout={labLayout}
          machineStudentMap={machineStudentMap}
          brokenMachines={brokenMachines}
          teacherSide={teacherSide}
          initialPerspective={chartPerspective === 'student' ? 'student' : 'student'}
          onClose={() => setIsDisplayMode(false)}
        />
      )}
    </div>
  );
}
