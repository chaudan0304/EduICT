import * as XLSX from 'xlsx';

// Danh sách các từ khóa tên Sheet mang tính hướng dẫn/hệ thống cần bỏ qua
const IGNORED_SHEET_NAMES = [
  'huong_dan', 'huongdan', 'hướng dẫn', 'huong dan',
  'guide', 'instructions', 'instruction', 'readme',
  'template', 'mau', 'mẫu', 'sample'
];

/**
 * Nhận diện Khối lớp từ tên lớp (1..5)
 * Ví dụ: "1A" -> 1, "2B" -> 2, "Lớp 3A1" -> 3, "5C" -> 5
 */
export function detectGradeFromName(className) {
  if (!className) return 3;
  const match = className.match(/([1-5])/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 3;
}

/**
 * Chuẩn hóa chuỗi để so sánh tên lớp
 * Ví dụ: "Lớp 1A" -> "1a", " 1A " -> "1a"
 */
export function normalizeClassName(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/^lớp\s+/i, '')
    .replace(/\s+/g, '');
}

/**
 * Chuẩn hóa tên học sinh
 */
export function normalizeStudentName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Chuẩn hóa ngày sinh an toàn tuyệt đối, loại trừ lỗi Timezone (UTC / GMT+7)
 * Hỗ trợ:
 * - Excel Serial Date (e.g. 43748) -> giải mã toán học bằng XLSX.SSF.parse_date_code
 * - Date Object -> lấy ngày/tháng/năm theo UTC
 * - String: dd/mm/yyyy, d/m/yyyy, yyyy-mm-dd, dd-mm-yyyy
 */
export function parseExcelDate(val) {
  if (val === null || val === undefined || val === '') {
    return '';
  }

  // 1. Nếu là số hoặc chuỗi 5 chữ số (Excel Serial Date: vd 43748 = 10/10/2019)
  const numericVal = typeof val === 'number' 
    ? val 
    : (typeof val === 'string' && /^\d{4,6}(\.\d+)?$/.test(val.trim()) ? Number(val.trim()) : null);

  if (numericVal !== null && !isNaN(numericVal) && numericVal > 1000 && numericVal < 100000) {
    // Excel tính từ ngày 30/12/1899 (bù lỗi năm nhuận 1900 của Excel)
    // Sử dụng UTC timestamp để không bao giờ bị lệch 1 ngày do timezone GMT+7 hay âm
    const utcMs = Date.UTC(1899, 11, 30) + Math.round(numericVal) * 86400000;
    const dObj = new Date(utcMs);
    const dd = String(dObj.getUTCDate()).padStart(2, '0');
    const mm = String(dObj.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = String(dObj.getUTCFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  // 2. Nếu là Date object (do cấu hình cellDates: true nếu có)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    // Dùng UTC để không bị timezone local đẩy lùi 1 ngày
    const dd = String(val.getUTCDate()).padStart(2, '0');
    const mm = String(val.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = String(val.getUTCFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  // 3. Nếu là chuỗi
  const str = String(val).trim();
  if (!str) return '';

  // Dạng dd/mm/yyyy hoặc d/m/yyyy hoặc dd-mm-yyyy
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const dd = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const mm = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${dd}/${mm}/${yyyy}`;
  }

  // Dạng yyyy-mm-dd hoặc yyyy/mm/dd
  const ymdMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const dd = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  // Trả về chuỗi gốc đã trim nếu không khớp mẫu trên
  return str;
}

/**
 * Chuẩn hóa giới tính:
 * Nam/nam/NAM -> 'Nam'
 * Nữ/nữ/NỮ/Nu -> 'Nữ'
 * Giá trị khác -> invalid
 */
export function normalizeGender(val) {
  if (!val) {
    return { value: 'Nam', isValid: false, isDefault: true };
  }
  const clean = String(val).trim().toLowerCase();
  if (clean === 'nam' || clean === 'm' || clean === 'male') {
    return { value: 'Nam', isValid: true };
  }
  if (clean === 'nữ' || clean === 'nu' || clean === 'f' || clean === 'female') {
    return { value: 'Nữ', isValid: true };
  }
  return { value: String(val).trim(), isValid: false };
}

/**
 * Tự động tìm dòng tiêu đề Header trong sheet
 * Quét các dòng 0..25 để xác định các cột:
 * - STT
 * - Họ và Tên
 * - Ngày sinh
 * - Giới tính
 * - Số máy (nếu có)
 * - Ghi chú (nếu có)
 */
export function findHeaderRow(rows) {
  const maxScanRows = Math.min(rows.length, 30);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let nameCol = -1;
    let dobCol = -1;
    let genderCol = -1;
    let sttCol = -1;
    let machineCol = -1;
    let noteCol = -1;
    let codeCol = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (!cell) continue;

      // Họ tên
      if (
        nameCol === -1 &&
        (cell.includes('họ và tên') ||
         cell.includes('họ tên') ||
         cell.includes('hoten') ||
         cell.includes('họ và tên học sinh') ||
         cell.includes('tên học sinh') ||
         cell === 'họ và tên' ||
         cell === 'họ tên' ||
         cell === 'tên')
      ) {
        nameCol = c;
      }
      // Ngày sinh
      else if (
        dobCol === -1 &&
        (cell.includes('ngày sinh') ||
         cell.includes('ngaysinh') ||
         cell.includes('sinh ngày') ||
         cell.includes('năm sinh') ||
         cell.includes('ngày, tháng, năm sinh') ||
         cell === 'dob')
      ) {
        dobCol = c;
      }
      // Giới tính
      else if (
        genderCol === -1 &&
        (cell.includes('giới tính') ||
         cell.includes('gioitinh') ||
         cell === 'phái' ||
         cell.includes('nam/nữ') ||
         cell === 'gender')
      ) {
        genderCol = c;
      }
      // STT
      else if (
        sttCol === -1 &&
        (cell === 'stt' ||
         cell === 'số tt' ||
         cell === 'số thứ tự' ||
         cell === 'tt')
      ) {
        sttCol = c;
      }
      // Số máy
      else if (
        machineCol === -1 &&
        (cell.includes('máy số') ||
         cell.includes('số máy') ||
         cell === 'máy' ||
         cell === 'mayso')
      ) {
        machineCol = c;
      }
      // Mã học sinh
      else if (
        codeCol === -1 &&
        (cell.includes('mã hs') ||
         cell.includes('mã học sinh') ||
         cell === 'mahs')
      ) {
        codeCol = c;
      }
      // Ghi chú
      else if (
        noteCol === -1 &&
        (cell.includes('ghi chú') ||
         cell.includes('nhận xét') ||
         cell === 'note')
      ) {
        noteCol = c;
      }
    }

    // Tiêu chí nhận diện: Phải có cột Họ tên, và có thêm ít nhất 1 cột trong (Ngày sinh, Giới tính, STT)
    if (nameCol !== -1 && (dobCol !== -1 || genderCol !== -1 || sttCol !== -1)) {
      return {
        headerRowIndex: r,
        columns: {
          nameCol,
          dobCol,
          genderCol,
          sttCol,
          machineCol,
          noteCol,
          codeCol
        }
      };
    }
  }

  return null;
}

/**
 * Kiểm tra xem dòng có phải là dòng tiêu đề cuối trang / chữ ký / ghi chú biểu mẫu
 */
function isFooterOrSignatureRow(row) {
  if (!Array.isArray(row)) return true;
  const fullText = row.map(c => String(c || '').trim()).join(' ').toLowerCase();
  if (!fullText) return true;

  const footerPatterns = [
    'giáo viên chủ nhiệm',
    'người lập biểu',
    'ban giám hiệu',
    'hiệu trưởng',
    'tổng số học sinh',
    'hà nội, ngày',
    'tp.hcm, ngày',
    'ngày...tháng...năm',
    'xác nhận của'
  ];

  return footerPatterns.some(pattern => fullText.includes(pattern));
}

/**
 * Đọc và parse toàn bộ file Excel (1 File = Nhiều Sheet = Nhiều Lớp)
 * Trả về preview đầy đủ của cả Workbook và từng Sheet
 */
export function parseExcelWorkbook(file, existingClasses = []) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        const parsedSheets = [];
        let totalStudentsInWorkbook = 0;

        for (const rawSheetName of workbook.SheetNames) {
          const trimmedSheetName = rawSheetName.trim();
          const lowerName = trimmedSheetName.toLowerCase();

          // Bỏ qua sheet hướng dẫn hoặc ghi chú
          if (IGNORED_SHEET_NAMES.some(ign => lowerName === ign || lowerName.includes('huong_dan') || lowerName.includes('hướng dẫn'))) {
            continue;
          }

          const worksheet = workbook.Sheets[rawSheetName];
          if (!worksheet) continue;

          // Đọc dữ liệu dạng 2D Array
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          const detectedGrade = detectGradeFromName(trimmedSheetName);

          // Kiểm tra lớp đã có trong cơ sở dữ liệu chưa
          const matchedClass = existingClasses.find(c =>
            c.name.trim().toLowerCase() === trimmedSheetName.toLowerCase() ||
            normalizeClassName(c.name) === normalizeClassName(trimmedSheetName)
          );

          const classExists = !!matchedClass;
          const targetClassId = matchedClass ? matchedClass.id : null;
          const existingStudentsInClass = matchedClass?.students || [];

          // Tạo Map học sinh hiện có trong DB của lớp: key = "họ tên|ngày sinh"
          const existingMap = new Map();
          existingStudentsInClass.forEach(s => {
            const key = `${normalizeStudentName(s.name)}|${parseExcelDate(s.dob)}`;
            existingMap.set(key, s);
          });

          // Tìm Header
          const headerInfo = findHeaderRow(rows);

          if (!headerInfo) {
            // Không tìm thấy header
            parsedSheets.push({
              sheetName: trimmedSheetName,
              className: trimmedSheetName,
              grade: detectedGrade,
              classExists,
              targetClassId,
              status: 'error',
              errorMessage: 'Không tìm thấy dòng tiêu đề cột (Họ tên, Ngày sinh, Giới tính)',
              totalRows: 0,
              validRows: 0,
              existingRows: 0,
              errorRows: 0,
              students: []
            });
            continue;
          }

          const { headerRowIndex, columns } = headerInfo;
          const dataRows = rows.slice(headerRowIndex + 1);

          const parsedStudents = [];
          const sheetDuplicateMap = new Map(); // chống trùng lặp ngay trong chính sheet
          let validCount = 0;
          let existingCount = 0;
          let errorCount = 0;

          for (let idx = 0; idx < dataRows.length; idx++) {
            const row = dataRows[idx];
            const originalRowNumber = headerRowIndex + 2 + idx;

            // Bỏ qua dòng trống hoặc dòng chữ ký chân trang
            const hasAnyContent = row.some(cell => String(cell || '').trim().length > 0);
            if (!hasAnyContent || isFooterOrSignatureRow(row)) {
              continue;
            }

            const rawName = columns.nameCol !== -1 ? row[columns.nameCol] : '';
            const rawDob = columns.dobCol !== -1 ? row[columns.dobCol] : '';
            const rawGender = columns.genderCol !== -1 ? row[columns.genderCol] : '';
            const rawMachine = columns.machineCol !== -1 ? row[columns.machineCol] : '';
            const rawNote = columns.noteCol !== -1 ? row[columns.noteCol] : '';
            const rawCode = columns.codeCol !== -1 ? row[columns.codeCol] : '';

            const name = String(rawName || '').trim();
            const dob = parseExcelDate(rawDob);
            const genderRes = normalizeGender(rawGender);
            const machineNum = rawMachine ? parseInt(rawMachine, 10) : null;

            const studentItem = {
              rowNumber: originalRowNumber,
              id: rawCode ? String(rawCode).trim() : null,
              name,
              dob,
              gender: genderRes.value,
              machineNumber: !isNaN(machineNum) && machineNum >= 1 && machineNum <= 31 ? machineNum : null,
              note: String(rawNote || '').trim(),
              status: 'valid',
              errors: []
            };

            // 1. Kiểm tra Họ tên
            if (!name) {
              studentItem.status = 'error';
              studentItem.errors.push('Thiếu họ tên học sinh');
            }

            // 2. Kiểm tra Giới tính
            if (!genderRes.isValid) {
              studentItem.status = 'error';
              studentItem.errors.push(`Giới tính không hợp lệ: "${rawGender}" (chỉ nhận Nam/Nữ)`);
            }

            // 3. Kiểm tra Ngày sinh
            if (!dob && name) {
              // Cảnh báo thiếu ngày sinh
              studentItem.warning = 'Thiếu ngày sinh';
            }

            // 4. Kiểm tra trùng lặp với Database hiện tại
            if (studentItem.status !== 'error' && name) {
              const keyWithDob = `${normalizeStudentName(name)}|${dob}`;

              // Đã có trong database lớp
              if (dob && existingMap.has(keyWithDob)) {
                studentItem.status = 'existing';
                studentItem.errors.push('Học sinh đã tồn tại trong lớp này');
              } else if (!dob) {
                // Trùng tên nhưng thiếu ngày sinh
                const matchNameOnly = existingStudentsInClass.some(
                  es => normalizeStudentName(es.name) === normalizeStudentName(name)
                );
                if (matchNameOnly) {
                  studentItem.status = 'warning';
                  studentItem.warning = 'Trùng họ tên với học sinh trong lớp nhưng thiếu ngày sinh';
                }
              }

              // Kiểm tra trùng lặp trong chính file Excel (cùng sheet)
              if (dob && sheetDuplicateMap.has(keyWithDob)) {
                studentItem.status = 'existing';
                studentItem.errors.push(`Trùng lặp với dòng ${sheetDuplicateMap.get(keyWithDob)} trong sheet`);
              } else if (dob) {
                sheetDuplicateMap.set(keyWithDob, originalRowNumber);
              }
            }

            if (studentItem.status === 'valid') {
              validCount++;
            } else if (studentItem.status === 'existing') {
              existingCount++;
            } else if (studentItem.status === 'error') {
              errorCount++;
            }

            parsedStudents.push(studentItem);
          }

          const hasErrors = errorCount > 0;
          const sheetStatus = parsedStudents.length === 0 
            ? 'empty' 
            : (hasErrors ? 'has_errors' : 'valid');

          parsedSheets.push({
            sheetName: trimmedSheetName,
            className: trimmedSheetName,
            grade: detectedGrade,
            classExists,
            targetClassId,
            status: sheetStatus,
            totalRows: parsedStudents.length,
            validRows: validCount,
            existingRows: existingCount,
            errorRows: errorCount,
            students: parsedStudents
          });

          totalStudentsInWorkbook += validCount;
        }

        resolve({
          fileName: file.name,
          fileSizeBytes: file.size,
          totalSheets: parsedSheets.length,
          totalStudents: totalStudentsInWorkbook,
          sheets: parsedSheets
        });
      } catch (err) {
        reject(new Error(`Lỗi đọc file Excel: ${err.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Không thể đọc file từ thiết bị'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Xuất toàn bộ danh sách các lớp ra 1 file Excel (1 Workbook = Nhiều Sheet = Nhiều Lớp)
 */
export function exportAllClassesToExcel(classes) {
  if (!classes || classes.length === 0) {
    alert('Chưa có dữ liệu lớp học để xuất Excel!');
    return;
  }

  const workbook = XLSX.utils.book_new();

  for (const c of classes) {
    const isPrimaryLow = (c.grade === 1 || c.grade === 2);
    const students = c.students || [];

    // Chuẩn bị tên sheet (tối đa 31 ký tự, loại bỏ ký tự cấm: \ / ? * [ ])
    let sheetName = (c.name || 'Lop')
      .replace(/^lớp\s+/i, '')
      .replace(/[\\/?*[\]:]/g, '')
      .trim()
      .slice(0, 31);

    if (!sheetName) sheetName = `Lop_${c.id}`;

    let data = [];
    if (isPrimaryLow) {
      data = students.map((s, idx) => ({
        'STT': idx + 1,
        'Mã HS': s.id || `HS${String(idx + 1).padStart(3, '0')}`,
        'Họ và Tên': s.name || '',
        'Ngày sinh': s.dob || '',
        'Giới tính': s.gender || 'Nam',
        'Máy Số': s.machineNumber || '',
        'Kỹ năng Chuột (T/H/C)': s.skill_mouse || 'T',
        'Bàn phím cơ bản (T/H/C)': s.skill_keyboard || 'H',
        'Vẽ Paint / Tranh (T/H/C)': s.skill_paint || 'T',
        'Đánh Giá Thường Xuyên': s.eval_regular || 'T',
        'Số Sao (⭐)': s.stars || 0,
        'Nhận Xét / Lời Khen': s.note || ''
      }));
    } else {
      data = students.map((s, idx) => ({
        'STT': idx + 1,
        'Mã HS': s.id || `HS${String(idx + 1).padStart(3, '0')}`,
        'Họ và Tên': s.name || '',
        'Ngày sinh': s.dob || '',
        'Giới tính': s.gender || 'Nam',
        'Máy Số': s.machineNumber || '',
        'Đánh Giá Thường Xuyên (T/H/C)': s.eval_regular || 'T',
        'Điểm Thực Hành HK1': s.score_hk1 ?? '',
        'Điểm Thực Hành Cuối Năm': s.score_ck ?? '',
        'Số Sao (⭐)': s.stars || 0,
        'Nhận Xét vnEdu': s.note || ''
      }));
    }

    // Nếu lớp chưa có học sinh nào, tạo ít nhất 1 dòng tiêu đề
    if (data.length === 0) {
      data = [{
        'STT': 1,
        'Mã HS': 'HS001',
        'Họ và Tên': 'Học sinh mẫu',
        'Ngày sinh': '01/01/2019',
        'Giới tính': 'Nam',
        'Máy Số': 1,
        'Ghi Chú': 'Mẫu danh sách lớp'
      }];
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  const fileName = `EduICT_DanhSach_${classes.length}LopHoc_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Tải file Excel mẫu chuẩn Tiểu học:
 * Gồm các Sheet:
 * - HUONG_DAN
 * - 1A
 * - 1B
 * - 2A
 */
export function downloadSampleExcelTemplate() {
  const workbook = XLSX.utils.book_new();

  // 1. Sheet Hướng dẫn (HUONG_DAN)
  const guideData = [
    { 'MỤC': 'HỆ THỐNG', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'EduICT Primary - Nền Tảng Giảng Dạy & Trợ Giảng Số Tin Học Tiểu Học' },
    { 'MỤC': 'MÔ HÌNH', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': '1 FILE EXCEL = NHIỀU SHEET = NHIỀU LỚP HỌC' },
    { 'MỤC': '1. Tên Sheet', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Tên Sheet chính là Tên Lớp học (VD: 1A, 1B, 2A, 3B, 4A, 5C). Không đổi tên Sheet nếu muốn nhập đúng lớp.' },
    { 'MỤC': '2. Nhận diện Khối', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Hệ thống tự động suy ra Khối từ ký tự đầu tên Sheet (1A -> Khối 1, 2B -> Khối 2, 5A -> Khối 5).' },
    { 'MỤC': '3. Dòng Tiêu Đề', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Tiêu đề có thể ở dòng 1 hoặc dưới tên trường, năm học. Hệ thống tự quét tìm các cột: STT, Họ tên, Ngày sinh, Giới tính.' },
    { 'MỤC': '4. Cột Bắt Buộc', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Cột "Họ tên" bắt buộc phải có dữ liệu. Không import dòng trống.' },
    { 'MỤC': '5. Định Dạng Ngày Sinh', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Khuyên dùng định dạng ngày dd/mm/yyyy (Ví dụ: 10/10/2019). Hỗ trợ cả ngày tháng Excel.' },
    { 'MỤC': '6. Định Dạng Giới Tính', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Chỉ dùng "Nam" hoặc "Nữ" (không phân biệt chữ hoa/thường).' },
    { 'MỤC': '7. Chống Trùng Lặp', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Học sinh trùng cả Họ tên và Ngày sinh sẽ được tự động bỏ qua. Hai học sinh cùng tên khác ngày sinh được thêm đầy đủ.' },
    { 'MỤC': '8. Tạo Lớp Tự Động', 'NỘI DUNG HƯỚNG DẪN IMPORT EXCEL': 'Nếu lớp chưa tồn tại trong hệ thống, chọn "Tự động tạo lớp" để hệ thống tự tạo lớp và nạp học sinh.' }
  ];
  const guideSheet = XLSX.utils.json_to_sheet(guideData);
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'HUONG_DAN');

  // 2. Sheet Lớp 1A (Mẫu Khối 1)
  const sheet1A = [
    { 'STT': 1, 'Họ và Tên': 'Hoàng Văn Bảo An', 'Ngày sinh': '10/10/2019', 'Giới tính': 'Nam' },
    { 'STT': 2, 'Họ và Tên': 'Tổng Phúc Tuấn Anh', 'Ngày sinh': '01/01/2019', 'Giới tính': 'Nam' },
    { 'STT': 3, 'Họ và Tên': 'Trần Đình Minh Anh', 'Ngày sinh': '03/03/2019', 'Giới tính': 'Nam' },
    { 'STT': 4, 'Họ và Tên': 'Nguyễn Ngọc Bảo Châu', 'Ngày sinh': '15/05/2019', 'Giới tính': 'Nữ' },
    { 'STT': 5, 'Họ và Tên': 'Lê Hải Đăng', 'Ngày sinh': '20/08/2019', 'Giới tính': 'Nam' }
  ];
  const ws1A = XLSX.utils.json_to_sheet(sheet1A);
  XLSX.utils.book_append_sheet(workbook, ws1A, '1A');

  // 3. Sheet Lớp 1B (Mẫu Khối 1)
  const sheet1B = [
    { 'STT': 1, 'Họ và Tên': 'Vũ Thảo Linh', 'Ngày sinh': '12/04/2019', 'Giới tính': 'Nữ' },
    { 'STT': 2, 'Họ và Tên': 'Đỗ Quốc Bảo', 'Ngày sinh': '08/09/2019', 'Giới tính': 'Nam' },
    { 'STT': 3, 'Họ và Tên': 'Phạm Quỳnh Nga', 'Ngày sinh': '25/11/2019', 'Giới tính': 'Nữ' },
    { 'STT': 4, 'Họ và Tên': 'Bùi Gia Khiêm', 'Ngày sinh': '18/02/2019', 'Giới tính': 'Nam' }
  ];
  const ws1B = XLSX.utils.json_to_sheet(sheet1B);
  XLSX.utils.book_append_sheet(workbook, ws1B, '1B');

  // 4. Sheet Lớp 2A (Mẫu Khối 2 - minh họa 2 bạn cùng tên nhưng khác ngày sinh)
  const sheet2A = [
    { 'STT': 1, 'Họ và Tên': 'Nguyễn Văn An', 'Ngày sinh': '01/01/2018', 'Giới tính': 'Nam' },
    { 'STT': 2, 'Họ và Tên': 'Nguyễn Văn An', 'Ngày sinh': '05/05/2018', 'Giới tính': 'Nam' },
    { 'STT': 3, 'Họ và Tên': 'Lý Mỹ Duyên', 'Ngày sinh': '14/07/2018', 'Giới tính': 'Nữ' },
    { 'STT': 4, 'Họ và Tên': 'Cao Tiến Dũng', 'Ngày sinh': '22/10/2018', 'Giới tính': 'Nam' }
  ];
  const ws2A = XLSX.utils.json_to_sheet(sheet2A);
  XLSX.utils.book_append_sheet(workbook, ws2A, '2A');

  XLSX.writeFile(workbook, 'EduICT_Mau_Nhap_HocSinh_NhieuLop.xlsx');
}
