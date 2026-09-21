import * as XLSX from 'xlsx';
export {
  parseExcelWorkbook,
  exportAllClassesToExcel,
  downloadSampleExcelTemplate,
  parseExcelDate,
  normalizeGender,
  normalizeClassName,
  normalizeStudentName
} from './excelImport';

const STORAGE_KEY = 'edumaster_classes_data_v2';
const CURRENT_CLASS_KEY = 'edumaster_current_class_id';
const BROKEN_MACHINES_KEY = 'edumaster_broken_machines_v1';

import { compareVietnameseNames, sortStudentsVietnamese } from './vietnameseSort';
export { compareVietnameseNames, sortStudentsVietnamese };

// 5 Khối Lớp chuẩn Tiểu học dành cho Giáo viên Tin học
const INITIAL_CLASSES = [
  {
    id: 'class_1a1',
    name: 'Lớp 1A1',
    grade: 1,
    subject: 'Tin Học 1 (Làm quen & Vẽ Paint)',
    schoolYear: '2026 - 2027',
    goodScores: [],
    students: [],
  },
  {
    id: 'class_2a1',
    name: 'Lớp 2A1',
    grade: 2,
    subject: 'Tin Học 2 (Luyện phím & Vẽ hình)',
    schoolYear: '2026 - 2027',
    goodScores: [],
    students: [],
  },
  {
    id: 'class_3a1',
    name: 'Lớp 3A1',
    grade: 3,
    subject: 'Tin Học 3 (Gõ 10 ngón & Paint)',
    schoolYear: '2026 - 2027',
    goodScores: [],
    students: [],
  },
  {
    id: 'class_4a1',
    name: 'Lớp 4A1',
    grade: 4,
    subject: 'Tin Học 4 (Word & PowerPoint)',
    schoolYear: '2026 - 2027',
    goodScores: [],
    students: [],
  },
  {
    id: 'class_5a1',
    name: 'Lớp 5A1',
    grade: 5,
    subject: 'Tin Học 5 (Lập trình Scratch & Internet)',
    schoolYear: '2026 - 2027',
    goodScores: [],
    students: [],
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
        // Đảm bảo mọi lớp đều có thuộc tính grade, goodScores và học sinh sắp xếp A - Z
        return parsed.map(c => ({
          ...c,
          grade: c.grade || detectGradeFromName(c.name),
          goodScores: Array.isArray(c.goodScores) ? c.goodScores : [],
          students: sortStudentsVietnamese(c.students || [])
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load classes from localStorage', e);
  }
  // Khởi tạo mặc định nếu chưa có
  const defaultClasses = INITIAL_CLASSES.map(c => ({
    ...c,
    goodScores: [],
    students: sortStudentsVietnamese(c.students || [])
  }));
  saveClasses(defaultClasses);
  return defaultClasses;
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
      'Ngày sinh': s.dob || '',
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
        'Ngày sinh': s.dob || '',
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
          dob: parseExcelDate(row['Ngày sinh'] || row['NgaySinh'] || row['DOB'] || row['SinhNgày'] || ''),
          gender: normalizeGender(row['Giới tính'] || row['GioiTinh']).value || 'Nam',
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

// Tính toán năm học chuẩn dựa theo ngày và mốc bắt đầu của nhà trường (Section IV: Công thức)
export function calculateAcademicYear(date = new Date(), startMonth = 9, startDay = 5) {
  const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date(date);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const currentYear = validDate.getFullYear();
  const currentMonth = validDate.getMonth() + 1;
  const currentDay = validDate.getDate();

  let schoolYearStart;
  if (currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay)) {
    schoolYearStart = currentYear;
  } else {
    schoolYearStart = currentYear - 1;
  }

  return `${schoolYearStart} - ${schoolYearStart + 1}`;
}

export async function fetchAcademicYearSettings() {
  try {
    const res = await fetch('/api/school-year/settings');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Could not fetch academic year settings:', e);
  }
  return { startMonth: 9, startDay: 5, currentCalculatedYear: '2026 - 2027', activeCurrentYear: '2026 - 2027' };
}

export async function saveAcademicYearSettings(startMonth, startDay) {
  const res = await fetch('/api/school-year/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startMonth, startDay })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

export async function checkNewSchoolYearFromSqlite() {
  try {
    const res = await fetch('/api/school-year/check-new');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Could not check new school year:', e);
  }
  return { isNewYearDetected: false, newYear: '2026 - 2027', promotionCompleted: false };
}

export function calculateNextSchoolYear(yearStr) {
  const match = (yearStr || '').match(/(\d{4})\s*-\s*(\d{4})/);
  if (match) {
    const y1 = parseInt(match[1], 10);
    const y2 = parseInt(match[2], 10);
    return `${y1 + 1} - ${y2 + 1}`;
  }
  const currentYearNum = new Date().getFullYear();
  return `${currentYearNum} - ${currentYearNum + 1}`;
}

export async function fetchSchoolYearsFromSqlite() {
  try {
    const res = await fetch('/api/school-years');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend SQLite school-years API not reachable:', e);
  }
  return { currentYear: '2026 - 2027', availableYears: ['2025 - 2026', '2026 - 2027'], transitions: [] };
}

export async function setCurrentSchoolYearToSqlite(schoolYear) {
  try {
    const res = await fetch('/api/school-year/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolYear })
    });
    return res.ok;
  } catch (e) {
    console.warn('Failed to set current school year:', e);
    return false;
  }
}

export async function transitionSchoolYearInSqlite(fromYear, toYear) {
  const res = await fetch('/api/school-year/transition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromYear, toYear })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

export async function fetchClassesFromSqlite(schoolYear = null) {
  try {
    const url = schoolYear && schoolYear !== 'all' 
      ? `/api/classes?schoolYear=${encodeURIComponent(schoolYear)}`
      : (schoolYear === 'all' ? '/api/classes?schoolYear=all' : '/api/classes');
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(c => ({
          ...c,
          students: sortStudentsVietnamese(c.students || [])
        }));
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
    const sorted = sortStudentsVietnamese(students);
    await fetch(`/api/classes/${classId}/students`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: sorted })
    });
  } catch (e) {
    console.warn('Failed to sync students to SQLite:', e);
  }
}

// Gọi API sắp xếp lại học sinh của tất cả các lớp trong SQLite theo thứ tự A - Z
export async function sortClassStudentsInSqlite() {
  try {
    const res = await fetch('/api/classes/sort-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to sort students in SQLite:', e);
  }
  return null;
}

export async function batchImportClassesToSqlite(payload) {
  try {
    const res = await fetch('/api/classes/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi máy chủ (${res.status})`);
  } catch (e) {
    console.error('Failed to batch import classes to SQLite:', e);
    throw e;
  }
}

export async function fetchStudentStatisticsFromSqlite(schoolYear = null) {
  try {
    const url = schoolYear && schoolYear !== 'all'
      ? `/api/statistics/students?schoolYear=${encodeURIComponent(schoolYear)}`
      : '/api/statistics/students';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('Backend SQLite statistics API not reachable:', e);
  }
  return null;
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

