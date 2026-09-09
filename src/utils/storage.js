import * as XLSX from 'xlsx';

const STORAGE_KEY = 'edumaster_classes_data_v2';
const CURRENT_CLASS_KEY = 'edumaster_current_class_id';
const BROKEN_MACHINES_KEY = 'edumaster_broken_machines_v1';

// Học sinh mẫu chuẩn tiếng Việt cho Khối 1 (Làm quen & Kỹ năng chuột)
const STUDENTS_GRADE_1 = [
  { id: 'HS101', name: 'Nguyễn Tuấn Anh', gender: 'Nam', machineNumber: 1, skill_mouse: 'T', skill_keyboard: 'H', skill_paint: 'T', stars: 15, note: 'Cầm chuột đúng cách, vẽ bông hoa đẹp', attendance: 'present' },
  { id: 'HS102', name: 'Trần Bảo Châu', gender: 'Nữ', machineNumber: 2, skill_mouse: 'T', skill_keyboard: 'T', skill_paint: 'T', stars: 22, note: 'Thao tác kéo thả rất nhanh, chăm chỉ', attendance: 'present' },
  { id: 'HS103', name: 'Lê Minh Đăng', gender: 'Nam', machineNumber: 3, skill_mouse: 'H', skill_keyboard: 'H', skill_paint: 'H', stars: 10, note: 'Biết click đúp mở phần mềm Paint', attendance: 'present' },
  { id: 'HS104', name: 'Phạm Quỳnh Giang', gender: 'Nữ', machineNumber: 4, skill_mouse: 'T', skill_keyboard: 'T', skill_paint: 'T', stars: 18, note: 'Tô màu khéo, không lem ra ngoài', attendance: 'present' },
  { id: 'HS105', name: 'Vũ Đức Khang', gender: 'Nam', machineNumber: 5, skill_mouse: 'H', skill_keyboard: 'C', skill_paint: 'H', stars: 8, note: 'Cần luyện thêm tìm phím Enter và Space', attendance: 'present' },
  { id: 'HS106', name: 'Đỗ Thảo Linh', gender: 'Nữ', machineNumber: 6, skill_mouse: 'T', skill_keyboard: 'H', skill_paint: 'T', stars: 14, note: 'Rất ngoan, ngồi đúng tư thế', attendance: 'present' },
  { id: 'HS107', name: 'Bùi Gia Minh', gender: 'Nam', machineNumber: 7, skill_mouse: 'H', skill_keyboard: 'H', skill_paint: 'H', stars: 9, note: 'Đã biết di chuyển chuột mượt mà', attendance: 'present' },
  { id: 'HS108', name: 'Ngô Ngọc Mai', gender: 'Nữ', machineNumber: 8, skill_mouse: 'T', skill_keyboard: 'T', skill_paint: 'T', stars: 20, note: 'Biết chọn hình tròn, hình vuông trong Paint', attendance: 'present' },
  { id: 'HS109', name: 'Hoàng Nhật Nam', gender: 'Nam', machineNumber: 9, skill_mouse: 'T', skill_keyboard: 'H', skill_paint: 'T', stars: 12, note: 'Hăng hái xung phong thực hành', attendance: 'present' },
  { id: 'HS110', name: 'Đặng Yến Oanh', gender: 'Nữ', machineNumber: 10, skill_mouse: 'T', skill_keyboard: 'T', skill_paint: 'T', stars: 16, note: 'Giữ trật tự phòng máy rất tốt', attendance: 'present' },
];

// Học sinh mẫu chuẩn cho Khối 2 (Luyện gõ & Vẽ)
const STUDENTS_GRADE_2 = [
  { id: 'HS201', name: 'Trịnh Bảo An', gender: 'Nữ', machineNumber: 1, skill_mouse: 'T', skill_keyboard: 'T', skill_paint: 'T', stars: 18, note: 'Gõ hàng phím cơ sở tốt', attendance: 'present' },
  { id: 'HS202', name: 'Lý Quốc Bảo', gender: 'Nam', machineNumber: 2, skill_mouse: 'T', skill_keyboard: 'H', skill_paint: 'T', stars: 14, note: 'Vẽ ngôi nhà và cây xanh rất sáng tạo', attendance: 'present' },
  { id: 'HS203', name: 'Dương Khánh Chi', gender: 'Nữ', machineNumber: 3, skill_mouse: 'T', skill_keyboard: 'T', skill_paint: 'T', stars: 25, note: 'Thao tác gõ chữ tiếng Việt cơ bản nhanh', attendance: 'present' },
  { id: 'HS204', name: 'Mai Hữu Đạt', gender: 'Nam', machineNumber: 4, skill_mouse: 'H', skill_keyboard: 'H', skill_paint: 'H', stars: 9, note: 'Cần chú ý đặt đúng ngón tay trên phím F và J', attendance: 'present' },
  { id: 'HS205', name: 'Cao Diễm Hằng', gender: 'Nữ', machineNumber: 5, skill_mouse: 'T', skill_keyboard: 'H', skill_paint: 'T', stars: 16, note: 'Biết phóng to thu nhỏ hình vẽ', attendance: 'present' },
  { id: 'HS206', name: 'Phan Tuấn Kiệt', gender: 'Nam', machineNumber: 6, skill_mouse: 'H', skill_keyboard: 'H', skill_paint: 'H', stars: 11, note: 'Chăm chỉ hoàn thành bài luyện gõ', attendance: 'present' },
  { id: 'HS207', name: 'Lâm Thanh Lam', gender: 'Nữ', machineNumber: 7, skill_mouse: 'T', skill_keyboard: 'T', skill_paint: 'T', stars: 21, note: 'Vẽ cờ đỏ sao vàng chuẩn và đẹp', attendance: 'present' },
  { id: 'HS208', name: 'Hồ Minh Phát', gender: 'Nam', machineNumber: 8, skill_mouse: 'H', skill_keyboard: 'C', skill_paint: 'H', stars: 7, note: 'Cần rèn luyện thêm tốc độ gõ phím', attendance: 'present' },
];

// Học sinh mẫu chuẩn cho Khối 3 (Tin học GDPT 2018 - Gõ 10 ngón, Paint)
const STUDENTS_GRADE_3 = [
  { id: 'HS301', name: 'Nguyễn Thành Long', gender: 'Nam', machineNumber: 1, eval_regular: 'T', score_hk1: 9.5, score_ck: 10.0, stars: 28, note: 'Gõ 10 ngón chuẩn xác, hoàn thành bài sớm', attendance: 'present' },
  { id: 'HS302', name: 'Lê Thuỳ Trang', gender: 'Nữ', machineNumber: 2, eval_regular: 'T', score_hk1: 9.0, score_ck: 9.5, stars: 24, note: 'Hiểu bài nhanh, hướng dẫn bạn cùng máy', attendance: 'present' },
  { id: 'HS303', name: 'Trần Quang Huy', gender: 'Nam', machineNumber: 3, eval_regular: 'H', score_hk1: 7.5, score_ck: 8.0, stars: 12, note: 'Thao tác gõ tiếng Việt Telex tiến bộ', attendance: 'present' },
  { id: 'HS304', name: 'Võ Minh Thư', gender: 'Nữ', machineNumber: 4, eval_regular: 'T', score_hk1: 8.5, score_ck: 9.0, stars: 19, note: 'Vẽ tranh phong cảnh Paint rất khéo', attendance: 'present' },
  { id: 'HS305', name: 'Phạm Đức Trọng', gender: 'Nam', machineNumber: 5, eval_regular: 'H', score_hk1: 6.5, score_ck: 7.0, stars: 8, note: 'Cần rèn luyện thêm gõ hàng phím trên', attendance: 'present' },
  { id: 'HS306', name: 'Đỗ Ngọc Bích', gender: 'Nữ', machineNumber: 6, eval_regular: 'T', score_hk1: 9.5, score_ck: 9.5, stars: 26, note: 'Nắm vững quy tắc an toàn phòng máy', attendance: 'present' },
  { id: 'HS307', name: 'Hoàng Anh Tuấn', gender: 'Nam', machineNumber: 7, eval_regular: 'H', score_hk1: 7.0, score_ck: 7.5, stars: 10, note: 'Có tiến bộ trong thực hành tạo thư mục', attendance: 'present' },
  { id: 'HS308', name: 'Đặng Mai Chi', gender: 'Nữ', machineNumber: 8, eval_regular: 'T', score_hk1: 8.5, score_ck: 9.0, stars: 17, note: 'Soạn đoạn thơ ngắn đúng dấu', attendance: 'present' },
];

// Học sinh mẫu chuẩn cho Khối 4 (Soạn thảo văn bản & Trình chiếu)
const STUDENTS_GRADE_4 = [
  { id: 'HS401', name: 'Bùi Đức Anh', gender: 'Nam', machineNumber: 1, eval_regular: 'T', score_hk1: 9.0, score_ck: 9.5, stars: 20, note: 'Định dạng phông chữ, cỡ chữ văn bản rất chuẩn', attendance: 'present' },
  { id: 'HS402', name: 'Nguyễn Hoàng Yến', gender: 'Nữ', machineNumber: 2, eval_regular: 'T', score_hk1: 10.0, score_ck: 10.0, stars: 32, note: 'Chèn ảnh và tạo hiệu ứng trình chiếu đẹp mắt', attendance: 'present' },
  { id: 'HS403', name: 'Lê Gia Hưng', gender: 'Nam', machineNumber: 3, eval_regular: 'H', score_hk1: 7.5, score_ck: 8.0, stars: 13, note: 'Biết chèn bảng đơn giản trong Word', attendance: 'present' },
  { id: 'HS404', name: 'Trần Phương Uyên', gender: 'Nữ', machineNumber: 4, eval_regular: 'T', score_hk1: 9.0, score_ck: 9.0, stars: 21, note: 'Tìm kiếm thông tin trên Internet an toàn', attendance: 'present' },
  { id: 'HS405', name: 'Vũ Quốc Khánh', gender: 'Nam', machineNumber: 5, eval_regular: 'H', score_hk1: 6.5, score_ck: 7.0, stars: 9, note: 'Cần lưu bài đúng vào thư mục cá nhân', attendance: 'present' },
  { id: 'HS406', name: 'Phạm Hồng Nhung', gender: 'Nữ', machineNumber: 6, eval_regular: 'T', score_hk1: 9.5, score_ck: 9.5, stars: 25, note: 'Thiết kế slide bài thuyết trình rất sinh động', attendance: 'present' },
];

// Học sinh mẫu chuẩn cho Khối 5 (Lập trình Scratch & Đa phương tiện)
const STUDENTS_GRADE_5 = [
  { id: 'HS501', name: 'Đoàn Nhật Minh', gender: 'Nam', machineNumber: 1, eval_regular: 'T', score_hk1: 10.0, score_ck: 10.0, stars: 35, note: 'Lập trình nhân vật Scratch chuyển động mượt mà', attendance: 'present' },
  { id: 'HS502', name: 'Võ Khánh Vy', gender: 'Nữ', machineNumber: 2, eval_regular: 'T', score_hk1: 9.5, score_ck: 9.5, stars: 27, note: 'Tạo game mê cung Scratch rất sáng tạo', attendance: 'present' },
  { id: 'HS503', name: 'Hoàng Trung Kiên', gender: 'Nam', machineNumber: 3, eval_regular: 'T', score_hk1: 9.0, score_ck: 9.5, stars: 22, note: 'Hiểu câu lệnh lặp và rẽ nhánh if-then', attendance: 'present' },
  { id: 'HS504', name: 'Ngô Thảo Nguyên', gender: 'Nữ', machineNumber: 4, eval_regular: 'H', score_hk1: 8.0, score_ck: 8.5, stars: 15, note: 'Nhập dữ liệu vào bảng tính cẩn thận', attendance: 'present' },
  { id: 'HS505', name: 'Đinh Trọng Phúc', gender: 'Nam', machineNumber: 5, eval_regular: 'H', score_hk1: 7.0, score_ck: 7.5, stars: 11, note: 'Cần chú ý thêm khối lệnh âm thanh trong Scratch', attendance: 'present' },
  { id: 'HS506', name: 'Trần Mỹ Dung', gender: 'Nữ', machineNumber: 6, eval_regular: 'T', score_hk1: 9.5, score_ck: 10.0, stars: 30, note: 'Xuất sắc, tư duy logic rất tốt', attendance: 'present' },
];

// 5 Khối Lớp mẫu chuẩn Tiểu học dành cho Giáo viên Tin học
const INITIAL_CLASSES = [
  {
    id: 'class_1a1',
    name: 'Lớp 1A1',
    grade: 1,
    subject: 'Tin Học 1 (Làm quen & Vẽ Paint)',
    schoolYear: '2025 - 2026',
    students: STUDENTS_GRADE_1,
  },
  {
    id: 'class_2a1',
    name: 'Lớp 2A1',
    grade: 2,
    subject: 'Tin Học 2 (Luyện phím & Vẽ hình)',
    schoolYear: '2025 - 2026',
    students: STUDENTS_GRADE_2,
  },
  {
    id: 'class_3a1',
    name: 'Lớp 3A1',
    grade: 3,
    subject: 'Tin Học 3 (Gõ 10 ngón & Paint)',
    schoolYear: '2025 - 2026',
    students: STUDENTS_GRADE_3,
  },
  {
    id: 'class_4a1',
    name: 'Lớp 4A1',
    grade: 4,
    subject: 'Tin Học 4 (Word & PowerPoint)',
    schoolYear: '2025 - 2026',
    students: STUDENTS_GRADE_4,
  },
  {
    id: 'class_5a1',
    name: 'Lớp 5A1',
    grade: 5,
    subject: 'Tin Học 5 (Lập trình Scratch & Internet)',
    schoolYear: '2025 - 2026',
    students: STUDENTS_GRADE_5,
  }
];

// Nhận diện khối lớp từ tên lớp (VD: '3A2' -> 3, 'Lớp 5C' -> 5)
export function detectGradeFromName(className) {
  if (!className) return 3;
  const match = className.match(/([1-5])/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 3;
}

export function getStoredClasses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Đảm bảo mọi lớp đều có thuộc tính grade
        return parsed.map(c => ({
          ...c,
          grade: c.grade || detectGradeFromName(c.name)
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load classes from localStorage', e);
  }
  // Khởi tạo mặc định nếu chưa có
  saveClasses(INITIAL_CLASSES);
  return INITIAL_CLASSES;
}

export function saveClasses(classes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  } catch (e) {
    console.error('Failed to save classes to localStorage', e);
  }
}

export function getCurrentClassId() {
  return localStorage.getItem(CURRENT_CLASS_KEY) || 'class_3a1';
}

export function setCurrentClassId(id) {
  localStorage.setItem(CURRENT_CLASS_KEY, id);
}

// Quản lý máy hỏng dùng chung cho toàn trường (phòng máy 31 máy)
export function getGlobalBrokenMachines() {
  try {
    const raw = localStorage.getItem(BROKEN_MACHINES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load broken machines', e);
  }
  return []; // mặc định chưa có máy hỏng
}

export function saveGlobalBrokenMachines(machines) {
  try {
    localStorage.setItem(BROKEN_MACHINES_KEY, JSON.stringify(machines));
  } catch (e) {
    console.error('Failed to save broken machines', e);
  }
}

// Sao lưu toàn bộ dữ liệu 23 lớp học ra file JSON
export function exportAllBackupData(classes, brokenMachines) {
  const backupData = {
    version: '2.0-primary-informatics',
    exportDate: new Date().toISOString(),
    totalClasses: classes.length,
    classes: classes,
    brokenMachines: brokenMachines || []
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EduICT_Backup_TinHoc_${classes.length}Lop_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Phục hồi dữ liệu từ file sao lưu JSON
export function importAllBackupData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data && Array.isArray(data.classes)) {
      saveClasses(data.classes);
      if (Array.isArray(data.brokenMachines)) {
        saveGlobalBrokenMachines(data.brokenMachines);
      }
      return { success: true, count: data.classes.length };
    }
    return { success: false, error: 'Định dạng file sao lưu không hợp lệ' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Tính điểm trung bình môn / xếp loại theo Thông tư 27
export function calculateAverage(student, grade = 3) {
  // Với Khối 1 & 2: Không có điểm số
  if (grade === 1 || grade === 2) {
    return null;
  }

  // Với Khối 3, 4, 5: Tính trung bình bài kiểm tra thực hành HK1 và Cuối Năm
  const scores = [];
  if (student.score_hk1 !== null && student.score_hk1 !== undefined && student.score_hk1 !== '') {
    const v = parseFloat(student.score_hk1);
    if (!isNaN(v)) scores.push(v);
  }
  if (student.score_ck !== null && student.score_ck !== undefined && student.score_ck !== '') {
    const v = parseFloat(student.score_ck);
    if (!isNaN(v)) scores.push(v);
  }

  // Hỗ trợ ngược dữ liệu cũ nếu có
  if (scores.length === 0 && (student.gk || student.ck)) {
    if (student.gk) scores.push(parseFloat(student.gk));
    if (student.ck) scores.push(parseFloat(student.ck));
  }

  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

// Xếp loại Thông tư 27
export function getGradeRank(avg, evalRegular = 'T', grade = 3) {
  if (grade === 1 || grade === 2) {
    if (evalRegular === 'T') return { label: 'Hoàn Thành Tốt 🌟', class: 'badge-excellent' };
    if (evalRegular === 'H') return { label: 'Hoàn Thành 👍', class: 'badge-good' };
    return { label: 'Chưa Hoàn Thành ⚠️', class: 'badge-weak' };
  }

  if (avg === null || avg === undefined) {
    if (evalRegular === 'T') return { label: 'Đạt Mức Tốt (T) 🌟', class: 'badge-excellent' };
    if (evalRegular === 'H') return { label: 'Đạt Mức HT (H) 👍', class: 'badge-good' };
    return { label: 'Chưa Đạt (C) ⚠️', class: 'badge-weak' };
  }

  if (avg >= 9.0) return { label: 'Xuất Sắc 🏆', class: 'badge-excellent' };
  if (avg >= 7.0) return { label: 'Hoàn Thành Tốt (T) 🌟', class: 'badge-good' };
  if (avg >= 5.0) return { label: 'Hoàn Thành (H) 👍', class: 'badge-average' };
  return { label: 'Chưa Hoàn Thành (C) ⚠️', class: 'badge-weak' };
}

// Xuất Excel chuẩn Tiểu học (Theo Thông tư 27 & Mẫu vnEdu/SMAS)
export function exportToExcel(students, className, grade = 3) {
  const isPrimaryLow = (grade === 1 || grade === 2);

  let data = [];
  if (isPrimaryLow) {
    data = students.map((s, idx) => ({
      'STT': idx + 1,
      'Mã HS': s.id,
      'Họ và Tên': s.name,
      'Giới tính': s.gender || 'Nam',
      'Máy Số': s.machineNumber || '',
      'Kỹ năng Chuột (T/H/C)': s.skill_mouse || 'H',
      'Bàn phím cơ bản (T/H/C)': s.skill_keyboard || 'H',
      'Vẽ Paint / Tranh (T/H/C)': s.skill_paint || 'T',
      'Số Sao (⭐)': s.stars || 0,
      'Nhận Xét / Lời Khen': s.note || 'Thực hành chăm chỉ',
    }));
  } else {
    data = students.map((s, idx) => {
      const avg = calculateAverage(s, grade);
      const rank = getGradeRank(avg, s.eval_regular, grade);
      return {
        'STT': idx + 1,
        'Mã HS': s.id,
        'Họ và Tên': s.name,
        'Giới tính': s.gender || 'Nam',
        'Máy Số': s.machineNumber || '',
        'Đánh Giá Thường Xuyên (T/H/C)': s.eval_regular || 'T',
        'Điểm Thực Hành HK1': s.score_hk1 ?? '',
        'Điểm Thực Hành Cuối Năm': s.score_ck ?? '',
        'Điểm Trung Bình': avg !== null ? avg : '',
        'Xếp Loại TT27': rank.label,
        'Số Sao (⭐)': s.stars || 0,
        'Nhận Xét vnEdu': s.note || 'Nắm vững kiến thức thực hành',
      };
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, className || 'TinHocTieuHoc');

  const fileName = `TinHoc_${className || 'Lop'}_Khoi${grade}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// Nhập danh sách học sinh từ Excel (Tương thích file vnEdu / SMAS)
export function importFromExcel(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const importedStudents = json.map((row, idx) => {
        return {
          id: row['Mã HS'] || row['MaHS'] || `HS${String(idx + 1).padStart(3, '0')}`,
          name: row['Họ và Tên'] || row['Họ và tên'] || row['HoTen'] || row['Tên'] || `Học sinh ${idx + 1}`,
          gender: row['Giới tính'] || row['GioiTinh'] || 'Nam',
          machineNumber: parseInt(row['Máy Số'] || row['MaySo'] || (idx + 1 <= 31 ? idx + 1 : Math.floor((idx + 1) / 2)), 10) || null,
          eval_regular: row['Đánh Giá Thường Xuyên (T/H/C)'] || row['DanhGia'] || 'T',
          score_hk1: row['Điểm Thực Hành HK1'] || row['HK1'] || null,
          score_ck: row['Điểm Thực Hành Cuối Năm'] || row['CK'] || null,
          skill_mouse: row['Kỹ năng Chuột (T/H/C)'] || 'T',
          skill_keyboard: row['Bàn phím cơ bản (T/H/C)'] || 'H',
          skill_paint: row['Vẽ Paint / Tranh (T/H/C)'] || 'T',
          stars: parseInt(row['Số Sao (⭐)'] || row['Sao'] || 0, 10),
          note: row['Nhận Xét / Lời Khen'] || row['Nhận Xét vnEdu'] || row['GhiChu'] || '',
          attendance: 'present',
        };
      });

      callback(null, importedStudents);
    } catch (err) {
      callback(err, null);
    }
  };
  reader.readAsArrayBuffer(file);
}

// --- CÁC HÀM ĐỒNG BỘ CƠ SỞ DỮ LIỆU SQLITE (FILE SQL) ---

export async function fetchClassesFromSqlite() {
  try {
    const res = await fetch('/api/classes');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend SQLite API not reachable, using localStorage:', e);
  }
  return null;
}

export async function syncClassToSqlite(classData) {
  try {
    await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData)
    });
  } catch (e) {
    console.warn('Failed to sync class to SQLite:', e);
  }
}

export async function deleteClassFromSqlite(classId) {
  try {
    await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Failed to delete class from SQLite:', e);
  }
}

export async function syncStudentsToSqlite(classId, students) {
  try {
    await fetch(`/api/classes/${classId}/students`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students })
    });
  } catch (e) {
    console.warn('Failed to sync students to SQLite:', e);
  }
}

export async function fetchBrokenMachinesFromSqlite() {
  try {
    const res = await fetch('/api/broken-machines');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn('Backend SQLite API not reachable for broken machines:', e);
  }
  return null;
}

export async function syncBrokenMachinesToSqlite(machines) {
  try {
    await fetch('/api/broken-machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machines })
    });
  } catch (e) {
    console.warn('Failed to sync broken machines to SQLite:', e);
  }
}

// Tải file database SQLite nhị phân (.sqlite)
export function downloadSqliteDatabaseFile() {
  const a = document.createElement('a');
  a.href = '/api/sql/download-db';
  a.download = 'edumaster.sqlite';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Tải file kịch bản SQL dạng văn bản (.sql) chứa CREATE TABLE và INSERT INTO
export function downloadSqlScriptFile() {
  const a = document.createElement('a');
  a.href = '/api/sql/export-script';
  a.download = `edumaster_backup_${new Date().toISOString().slice(0, 10)}.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Nhập và chạy file kịch bản SQL trên máy chủ SQLite
export async function importSqlScriptFile(sqlText) {
  const res = await fetch('/api/sql/import-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: sqlText })
  });
  return res.json();
}

// --- QUẢN LÝ NỘI QUY PHÒNG MÁY & TIÊU CHÍ CỘNG/TRỪ ĐIỂM ---

const RULES_STORAGE_KEY = 'edumaster_classroom_rules_v1';

export const DEFAULT_CLASSROOM_RULES = [
  // --- ĐIỂM TỐT / KHEN THƯỞNG (+) ---
  {
    id: 'rule_pos_1',
    type: 'positive',
    title: 'Phát biểu & Xây dựng bài tích cực',
    points: 1,
    icon: '🎯',
    category: 'Thái độ',
    description: 'Hăng hái xung phong giơ tay, trả lời đúng câu hỏi bài học'
  },
  {
    id: 'rule_pos_2',
    type: 'positive',
    title: 'Thực hành xuất sắc / Về đích sớm',
    points: 2,
    icon: '💻',
    category: 'Kỹ năng',
    description: 'Hoàn thành bài tập gõ phím, vẽ Paint hoặc soạn thảo nhanh và chuẩn xác'
  },
  {
    id: 'rule_pos_3',
    type: 'positive',
    title: 'Giúp đỡ bạn cùng máy / bạn cùng tiến',
    points: 1,
    icon: '🤝',
    category: 'Tương trợ',
    description: 'Nhiệt tình hướng dẫn bạn bên cạnh khi bạn gặp khó khăn'
  },
  {
    id: 'rule_pos_4',
    type: 'positive',
    title: 'Sáng tạo vượt trội trong thực hành',
    points: 2,
    icon: '💡',
    category: 'Sáng tạo',
    description: 'Vẽ tranh phối màu đẹp, tự tìm tòi câu lệnh Scratch mới mẻ'
  },
  {
    id: 'rule_pos_5',
    type: 'positive',
    title: 'Bảo quản tốt máy tính & an toàn điện',
    points: 1,
    icon: '🛡️',
    category: 'Ý thức',
    description: 'Tắt máy tính đúng quy trình, xếp gọn gàng chuột và bàn phím'
  },
  {
    id: 'rule_pos_6',
    type: 'positive',
    title: 'Thành tích nổi bật / Thắng mini-game',
    points: 3,
    icon: '🏆',
    category: 'Khen thưởng',
    description: 'Đạt giải cao trong Đua Vịt, Vòng Quay hoặc giải đố Tin học sôi nổi'
  },

  // --- ĐIỂM TRỪ / NHẮC NHỞ NỘI QUY (-) ---
  {
    id: 'rule_neg_1',
    type: 'negative',
    title: 'Tự ý chơi game / Mở ứng dụng ngoài',
    points: 2,
    icon: '🎮',
    category: 'Vi phạm',
    description: 'Mở trò chơi, xem video giải trí khi chưa có hiệu lệnh thực hành'
  },
  {
    id: 'rule_neg_2',
    type: 'negative',
    title: 'Mang đồ ăn, nước ngọt vào phòng máy',
    points: 2,
    icon: '🧃',
    category: 'An toàn',
    description: 'Nguy cơ làm đổ nước gây chập điện hoặc hỏng bàn phím máy tính'
  },
  {
    id: 'rule_neg_3',
    type: 'negative',
    title: 'Tự ý đổi chỗ ngồi / Chạy lung tung',
    points: 1,
    icon: '🪑',
    category: 'Kỷ luật',
    description: 'Rời vị trí máy tính được phân công, tranh giành chuột với bạn'
  },
  {
    id: 'rule_neg_4',
    type: 'negative',
    title: 'Làm ồn, la hét gây mất trật tự',
    points: 1,
    icon: '📢',
    category: 'Trật tự',
    description: 'Nói chuyện to, đùa giỡn làm ảnh hưởng đến các bạn đang làm bài'
  },
  {
    id: 'rule_neg_5',
    type: 'negative',
    title: 'Tắt máy bằng rút điện / Bấm nút nguồn',
    points: 2,
    icon: '🔌',
    category: 'An toàn thiết bị',
    description: 'Tắt máy sai quy trình gây lỗi hệ điều hành Windows'
  },
  {
    id: 'rule_neg_6',
    type: 'negative',
    title: 'Không xếp gọn ghế & bàn phím khi về',
    points: 1,
    icon: '🧹',
    category: 'Vệ sinh',
    description: 'Hết giờ thực hành ra về không đẩy bàn phím và ghế ngay ngắn'
  }
];

export function getClassroomRules() {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load rules from localStorage', e);
  }
  return DEFAULT_CLASSROOM_RULES;
}

export function saveClassroomRules(rules) {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save rules to localStorage', e);
  }
}

export function resetClassroomRulesToDefault() {
  saveClassroomRules(DEFAULT_CLASSROOM_RULES);
  return DEFAULT_CLASSROOM_RULES;
}

export async function fetchClassroomRulesFromSqlite() {
  try {
    const res = await fetch('/api/rules');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.warn('Backend SQLite API not reachable for rules:', e);
  }
  return null;
}

export async function syncClassroomRulesToSqlite(rules) {
  try {
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules })
    });
  } catch (e) {
    console.warn('Failed to sync rules to SQLite:', e);
  }
}

