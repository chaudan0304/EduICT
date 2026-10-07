import * as XLSX from 'xlsx';
import apiClient from './apiClient';
import { sortStudentsVietnamese } from '../utils/vietnameseSort';

const date = () => new Date().toISOString().slice(0, 10);
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser/Electron download to acquire the blob before revoking it.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function downloadDatabaseFile(url, filename) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Không thể xuất dữ liệu (${response.status}).`);
  }
  downloadBlob(await response.blob(), filename);
}

export async function fetchFullDatabase() {
  const snapshot = await apiClient.get('/api/backup/export-json');
  if (snapshot?.format !== 'eduict-full-database' || !Array.isArray(snapshot.tables)) throw new Error('Máy chủ chưa hỗ trợ xuất toàn bộ dữ liệu. Hãy cập nhật ứng dụng.');
  return snapshot;
}

// Excel limits each text cell to 32767 characters. Keep long values in ordered
// chunks instead of truncating them, including the complete restorable JSON.
function chunks(text) {
  const result = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + 30000, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    result.push(text.slice(start, end)); start = end;
  }
  return result.length ? result : [''];
}

export async function exportFullDatabaseExcel({ preferredClassId } = {}) {
  const snapshot = await fetchFullDatabase();
  const workbook = XLSX.utils.book_new();
  const used = new Set();
  const longValues = [['Sheet', 'Dòng Excel', 'Cột Excel', 'Phần', 'Nội dung (ghép theo thứ tự)']];
  const uniqueName = label => {
    const base = String(label || 'DuLieu').replace(/[\\/?*[\]:]/g, '').replace(/^'+|'+$/g, '').trim() || 'DuLieu';
    let name = base.slice(0, 31), suffix = 1;
    while (used.has(name.toLowerCase())) { const tail = `_${suffix++}`; name = base.slice(0, 31 - tail.length) + tail; }
    used.add(name.toLowerCase()); return name;
  };
  const append = (label, rows) => {
    const name = uniqueName(label);
    const cells = rows.map((row, r) => row.map((value, c) => {
      const text = value && typeof value === 'object' ? JSON.stringify(value) : value;
      if (typeof text !== 'string' || text.length <= 32767) return text ?? null;
      chunks(text).forEach((part, index) => longValues.push([name, r + 1, c + 1, index + 1, part]));
      return `[DU_LIEU_DAI: ${name}, dòng ${r + 1}, cột ${c + 1}]`;
    }));
    if (cells.length > 1048576 || cells.some(row => row.length > 16384)) throw new Error('Dữ liệu vượt giới hạn Excel. Hãy xuất JSON hoặc SQLite để giữ toàn bộ.');
    const sheet = XLSX.utils.aoa_to_sheet(cells);
    sheet['!cols'] = (cells[0] || []).map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };
  const records = name => {
    const table = snapshot.tables.find(item => item.name === name);
    return table ? table.rows.map(row => Object.fromEntries(table.columns.map((key, index) => [key, row[index]]))) : [];
  };
  const classRows = records('classes');
  const studentRows = records('students');
  classRows.sort((a, b) => Number(b.id === preferredClassId) - Number(a.id === preferredClassId));
  append('HUONG_DAN', [
    ['Mục', 'Nội dung'], ['Thời điểm UTC', snapshot.exportedAt],
    ['Phạm vi', 'Toàn bộ cơ sở dữ liệu: mọi năm học, điểm HK1/cuối năm, sao, sổ điểm tốt/điểm trừ, bài học, quiz, tiết học và cài đặt.'],
    ['Bảng dữ liệu', `${snapshot.tables.length} bảng; sheet DB_* giữ mọi cột gốc (NULL = ô trống).`],
    ['Khôi phục', 'Ưu tiên JSON, SQL hoặc SQLite. Chức năng nhập danh sách Excel thông thường chỉ nhập danh sách học sinh.'],
    ['JSON đầy đủ', 'Sheet BACKUP_JSON: ghép cột JSON theo thứ tự Phần để nhận lại bản JSON toàn bộ, giữ chính xác kiểu dữ liệu và schema.'],
    ['Văn bản dài', 'Ô vượt 32767 ký tự được chia vào DU_LIEU_DAI, không bị cắt bỏ.'],
    ['Slide', 'Giữ liên kết và thông tin bài; file PowerPoint ngoài máy/OneDrive không được đóng gói trong các bản xuất dữ liệu.'],
  ]);
  const meritRows = [];
  for (const c of classRows) {
    const students = sortStudentsVietnamese(studentRows.filter(s => s.class_id === c.id));
    const headers = ['STT', 'Mã HS', 'Họ và Tên', 'Lớp', 'Năm học', 'Khối', 'Ngày sinh', 'Giới tính', 'Máy Số', 'Chuyên cần', 'Kỹ năng Chuột', 'Kỹ năng Bàn phím', 'Kỹ năng Paint', 'ĐGTX', 'ĐGTX HK1', 'Điểm Cuối HK1', 'ĐGTX HK2', 'Điểm Cuối Năm', 'Số Sao', 'Ghi Chú'];
    append(`${c.name} ${c.school_year || ''}`, [headers, ...students.map((s, i) => [i + 1, s.id, s.name, c.name, c.school_year, c.grade, s.dob, s.gender, s.machine_number, s.attendance, s.skill_mouse, s.skill_keyboard, s.skill_paint, s.eval_regular, s.eval_hk1, s.score_hk1, s.eval_hk2, s.score_ck, s.stars, s.note])]);
    let merits;
    try { merits = JSON.parse(c.good_scores || '[]'); } catch { merits = null; }
    if (Array.isArray(merits)) for (const record of merits) meritRows.push({ 'Lớp': c.name, 'Năm học': c.school_year, ...Object.fromEntries(Object.entries(record || {}).map(([key, value]) => [`Nhật ký: ${key}`, value])) });
  }
  const meritHeaders = [...new Set(['Lớp', 'Năm học', ...meritRows.flatMap(row => Object.keys(row))])];
  append('SO_DIEM_TOT', [meritHeaders, ...meritRows.map(row => meritHeaders.map(key => row[key] ?? null))]);
  for (const table of snapshot.tables) append(`DB_${table.name}`, [table.columns, ...table.rows]);
  append('BACKUP_JSON', [['Phần', 'JSON'], ...chunks(JSON.stringify(snapshot)).map((part, i) => [i + 1, part])]);
  if (longValues.length > 1) append('DU_LIEU_DAI', longValues);
  XLSX.writeFile(workbook, `EduICT_ToanBoDuLieu_${date()}.xlsx`);
}
