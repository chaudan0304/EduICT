/**
 * Lịch Giảng Dạy Cá Nhân (Thời Khóa Biểu)
 * Giáo viên: Nguyễn Văn Châu Đàn (Châu Đàn)
 * Giáo viên bộ môn Tin học • Áp dụng từ ngày 05/09/2026 • Năm học 2026 - 2027
 */

export const TEACHER_INFO = {
  name: 'Nguyễn Văn Châu Đàn',
  shortName: 'Châu Đàn',
  subject: 'Tin học',
  role: 'Giáo viên bộ môn',
  effectiveDate: '05/09/2026',
  schoolYear: '2026 - 2027',
  status: 'active'
};

// Bản sao sâu an toàn cho dữ liệu thuần (không phụ thuộc structuredClone)
function deepClonePlain(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Hồ sơ giáo viên ĐANG ÁP DỤNG (có thể ghi đè bằng dữ liệu lưu trong app_settings).
// Giữ TEACHER_INFO làm giá trị mặc định; getActive/setActive cho phép App nạp hồ sơ
// đã lưu mà KHÔNG phá vỡ các nơi đang import trực tiếp TEACHER_INFO.
let _activeTeacher = deepClonePlain(TEACHER_INFO);

export function getActiveTeacherInfo() {
  return _activeTeacher;
}

export function setActiveTeacherInfo(profile) {
  if (profile && typeof profile === 'object') {
    _activeTeacher = { ...deepClonePlain(TEACHER_INFO), ...profile };
  }
  return _activeTeacher;
}

// Khung giờ các tiết học trong ngày (Chuẩn 40 phút / tiết)
export const PERIOD_SLOTS = [
  // BUỔI SÁNG
  { id: 'm1', session: 'morning', period: 1, label: 'Tiết 1 (Sáng)', startTime: '07:15', endTime: '07:55', startHour: 7, startMin: 15, endHour: 7, endMin: 55, durationMin: 40 },
  { id: 'm2', session: 'morning', period: 2, label: 'Tiết 2 (Sáng)', startTime: '07:55', endTime: '08:35', startHour: 7, startMin: 55, endHour: 8, endMin: 35, durationMin: 40 },
  { id: 'm_recess', session: 'morning', period: null, isRecess: true, label: 'Ra chơi sáng', startTime: '08:35', endTime: '08:55', startHour: 8, startMin: 35, endHour: 8, endMin: 55, durationMin: 20 },
  { id: 'm3', session: 'morning', period: 3, label: 'Tiết 3 (Sáng)', startTime: '08:55', endTime: '09:35', startHour: 8, startMin: 55, endHour: 9, endMin: 35, durationMin: 40 },
  { id: 'm4', session: 'morning', period: 4, label: 'Tiết 4 (Sáng)', startTime: '09:35', endTime: '10:15', startHour: 9, startMin: 35, endHour: 10, endMin: 15, durationMin: 40 },

  // NGHỈ TRƯA BÁN TRÚ (10:15 / 10:30 - 14:00)
  { id: 'lunch', session: 'lunch', period: null, isLunch: true, label: 'Nghỉ trưa bán trú', startTime: '10:15', endTime: '14:00', startHour: 10, startMin: 15, endHour: 14, endMin: 0, durationMin: 225 },

  // BUỔI CHIỀU
  { id: 'a1', session: 'afternoon', period: 1, label: 'Tiết 1 (Chiều)', startTime: '14:00', endTime: '14:40', startHour: 14, startMin: 0, endHour: 14, endMin: 40, durationMin: 40 },
  { id: 'a2', session: 'afternoon', period: 2, label: 'Tiết 2 (Chiều)', startTime: '14:40', endTime: '15:20', startHour: 14, startMin: 40, endHour: 15, endMin: 20, durationMin: 40 },
  { id: 'a_recess', session: 'afternoon', period: null, isRecess: true, label: 'Ra chơi chiều', startTime: '15:20', endTime: '15:40', startHour: 15, startMin: 20, endHour: 15, endMin: 40, durationMin: 20 },
  { id: 'a3', session: 'afternoon', period: 3, label: 'Tiết 3 (Chiều)', startTime: '15:40', endTime: '16:20', startHour: 15, startMin: 40, endHour: 16, endMin: 20, durationMin: 40 }
];

// Thời khóa biểu chính thức 5 ngày trong tuần
// Day Index: 1 = Thứ Hai, 2 = Thứ Ba, 3 = Thứ Tư, 4 = Thứ Năm, 5 = Thứ Sáu
export const TIMETABLE_DATA = {
  1: {
    dayOfWeek: 1,
    name: 'Thứ Hai',
    shortName: 'T2',
    morning: {
      1: null,
      2: { subject: 'Tin học', className: '3A2', grade: 3 },
      3: { subject: 'Tin học', className: '2A4', grade: 2 },
      4: { subject: 'Tin học', className: '2A5', grade: 2 }
    },
    afternoon: {
      1: null,
      2: null,
      3: null
    }
  },

  2: {
    dayOfWeek: 2,
    name: 'Thứ Ba',
    shortName: 'T3',
    morning: {
      1: { subject: 'Tin học', className: '4A4', grade: 4 },
      2: { subject: 'Tin học', className: '5A3', grade: 5 },
      3: { subject: 'Tin học', className: '5A4', grade: 5 },
      4: { subject: 'Tin học', className: '1A2', grade: 1 }
    },
    afternoon: {
      1: { subject: 'Tin học', className: '2A2', grade: 2 },
      2: { subject: 'Tin học', className: '2A3', grade: 2 },
      3: { subject: 'Tin học', className: '3A4', grade: 3 }
    }
  },

  3: {
    dayOfWeek: 3,
    name: 'Thứ Tư',
    shortName: 'T4',
    morning: {
      1: { subject: 'Tin học', className: '1A1', grade: 1 },
      2: { subject: 'Tin học', className: '2A1', grade: 2 },
      3: { subject: 'Tin học', className: '5A2', grade: 5 },
      4: { subject: 'Tin học', className: '1A3', grade: 1 }
    },
    afternoon: {
      1: { isOff: true, note: 'Nghỉ' },
      2: { isOff: true, note: 'Nghỉ' },
      3: { isOff: true, note: 'Nghỉ' }
    }
  },

  4: {
    dayOfWeek: 4,
    name: 'Thứ Năm',
    shortName: 'T5',
    morning: {
      1: { subject: 'Tin học', className: '3A1', grade: 3 },
      2: { subject: 'Tin học', className: '3A3', grade: 3 },
      3: null,
      4: { subject: 'Tin học', className: '4A2', grade: 4 }
    },
    afternoon: {
      1: null,
      2: null,
      3: null
    }
  },

  5: {
    dayOfWeek: 5,
    name: 'Thứ Sáu',
    shortName: 'T6',
    morning: {
      1: null,
      2: { subject: 'Tin học', className: '4A5', grade: 4 },
      3: { subject: 'Tin học', className: '1A4', grade: 1 },
      4: { subject: 'Tin học', className: '4A1', grade: 4 }
    },
    afternoon: {
      1: { subject: 'Tin học', className: '5A5', grade: 5 },
      2: { subject: 'Tin học', className: '4A3', grade: 4 },
      3: { subject: 'Tin học', className: '5A1', grade: 5 }
    }
  }
};

// Thời khóa biểu ĐANG ÁP DỤNG (mặc định = TIMETABLE_DATA; có thể ghi đè bằng dữ liệu đã lưu).
// getCurrentPeriodStatus đọc từ đây nên chỉnh sửa/lưu TKB phản ánh NGAY vào theo dõi thời gian thực.
let _activeTimetable = deepClonePlain(TIMETABLE_DATA);

export function getActiveTimetable() {
  return _activeTimetable;
}

export function getDefaultTimetable() {
  return deepClonePlain(TIMETABLE_DATA);
}

export function setActiveTimetable(grid) {
  const normalized = normalizeTimetableGrid(grid);
  if (normalized) _activeTimetable = normalized;
  return _activeTimetable;
}

/**
 * Kiểm tra trạng thái tiết học theo thời gian thực (Real-time clock)
 * @param {Date} [now] - Thời điểm kiểm tra (mặc định là thời gian hiện tại)
 * @returns {object} Thông tin chi tiết tiết học và số phút/giây còn lại
 */
export function getCurrentPeriodStatus(now = new Date()) {
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const curSeconds = now.getSeconds();
  const curTotalSec = curMinutes * 60 + curSeconds;

  const isWeekend = day === 0 || day === 6;
  const daySchedule = getActiveTimetable()[day];

  const toSec = (h, m) => (h * 60 + m) * 60;

  // Cuối tuần
  if (isWeekend || !daySchedule) {
    return {
      status: 'WEEKEND',
      label: 'Cuối tuần (Nghỉ giảng dạy)',
      dayName: day === 0 ? 'Chủ Nhật' : 'Thứ Bảy',
      currentPeriod: null,
      currentClass: null,
      className: '',
      remainingSec: 0,
      remainingMin: 0,
      totalSec: 0,
      elapsedSec: 0,
      progress: 0,
      isTeachingNow: false
    };
  }

  // Quét các khung giờ trong ngày
  for (const slot of PERIOD_SLOTS) {
    const startSec = toSec(slot.startHour, slot.startMin);
    const endSec = toSec(slot.endHour, slot.endMin);

    if (curTotalSec >= startSec && curTotalSec < endSec) {
      const remainingSec = endSec - curTotalSec;
      const totalSec = endSec - startSec;
      const elapsedSec = curTotalSec - startSec;
      const progress = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));
      const remainingMin = Math.ceil(remainingSec / 60);

      // 1. Giờ ra chơi
      if (slot.isRecess) {
        return {
          status: 'RECESS',
          slot,
          label: `${slot.label} (${slot.startTime} - ${slot.endTime})`,
          period: null,
          currentClass: null,
          className: 'Ra chơi',
          remainingSec,
          remainingMin,
          totalSec,
          elapsedSec,
          progress,
          isTeachingNow: false,
          dayName: daySchedule.name
        };
      }

      // 2. Nghỉ trưa bán trú
      if (slot.isLunch) {
        return {
          status: 'LUNCH_BREAK',
          slot,
          label: `Nghỉ trưa bán trú (${slot.startTime} - ${slot.endTime})`,
          period: null,
          currentClass: null,
          className: 'Nghỉ trưa',
          remainingSec,
          remainingMin,
          totalSec,
          elapsedSec,
          progress,
          isTeachingNow: false,
          dayName: daySchedule.name
        };
      }

      // 3. Tiết học
      const sessionSchedule = slot.session === 'morning' ? daySchedule.morning : daySchedule.afternoon;
      const classInfo = sessionSchedule ? sessionSchedule[slot.period] : null;
      const isOff = !classInfo || classInfo.isOff;

      return {
        status: isOff ? 'FREE_PERIOD' : 'IN_CLASS',
        slot,
        period: slot.period,
        session: slot.session,
        label: `${slot.label}: ${slot.startTime} - ${slot.endTime}`,
        currentClass: classInfo && !classInfo.isOff ? classInfo : null,
        className: classInfo && !classInfo.isOff ? classInfo.className : (classInfo?.note || 'Trống'),
        grade: classInfo?.grade || null,
        subject: classInfo?.subject || 'Tin học',
        remainingSec,
        remainingMin,
        totalSec,
        elapsedSec,
        progress,
        isTeachingNow: !isOff,
        dayName: daySchedule.name
      };
    }
  }

  // Trước giờ vào học sáng (< 07:15)
  const firstSlot = PERIOD_SLOTS[0];
  const firstSlotStartSec = toSec(firstSlot.startHour, firstSlot.startMin);
  if (curTotalSec < firstSlotStartSec) {
    const remainingSec = firstSlotStartSec - curTotalSec;
    return {
      status: 'BEFORE_SCHOOL',
      label: 'Chưa vào tiết học sáng (Vào học lúc 07:15)',
      dayName: daySchedule.name,
      currentPeriod: null,
      currentClass: null,
      className: '',
      remainingSec,
      remainingMin: Math.ceil(remainingSec / 60),
      totalSec: 0,
      isTeachingNow: false
    };
  }

  // Sau giờ học chiều (> 16:20)
  return {
    status: 'AFTER_SCHOOL',
    label: 'Đã hết giờ giảng dạy trong ngày',
    dayName: daySchedule.name,
    currentPeriod: null,
    currentClass: null,
    className: '',
    remainingSec: 0,
    remainingMin: 0,
    totalSec: 0,
    isTeachingNow: false
  };
}

/**
 * Định dạng thời gian đếm ngược dạng MM:SS
 * @param {number} totalSeconds
 */
export function formatTimeCountdown(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return '00:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Tìm slot theo slotId (vd: 'm1', 'm2', 'a1'...)
 * @param {string} slotId 
 */
export function getSlotById(slotId) {
  if (!slotId) return null;
  return PERIOD_SLOTS.find(s => s.id === slotId) || null;
}

/**
 * Lấy danh sách tất cả các tiết học chính thức (không bao gồm ra chơi, nghỉ trưa)
 */
export function getAllTeachingSlots() {
  return PERIOD_SLOTS.filter(s => s.period !== null && !s.isRecess && !s.isLunch);
}

/**
 * Tìm slot theo buổi và số tiết (vd: 'morning', 1)
 * @param {'morning'|'afternoon'} sessionType 
 * @param {number} periodNum 
 */
export function getSlotByPeriod(sessionType, periodNum) {
  return PERIOD_SLOTS.find(s => s.session === sessionType && s.period === periodNum) || null;
}

/**
 * Kiểm tra xem hiện tại có đang nằm trong khung giờ của một tiết học chính khóa hay không
 * @param {Date} [now] 
 */
export function isTeachingPeriodNow(now = new Date()) {
  const status = getCurrentPeriodStatus(now);
  return !!(status.slot && status.slot.period !== null && !status.slot.isRecess && !status.slot.isLunch);
}

/**
 * Lấy slot tiết học đang diễn ra hoặc slot được ưu tiên
 * @param {Date} [now]
 * @param {string} [preferredSlotId]
 */
export function getActiveTeachingSlot(now = new Date(), preferredSlotId = null) {
  if (preferredSlotId) {
    const preferred = getSlotById(preferredSlotId);
    if (preferred && preferred.period !== null) return preferred;
  }

  const status = getCurrentPeriodStatus(now);
  if (status.slot && status.slot.period !== null && !status.slot.isRecess && !status.slot.isLunch) {
    return status.slot;
  }

  return null;
}

/**
 * Tính toán thời gian còn lại đến giờ HẾT TIẾT theo Thời Khóa Biểu
 * @param {object} slot - Đối tượng slot từ PERIOD_SLOTS
 * @param {Date} [now] - Thời điểm hiện tại
 * @param {number} [extraMinutes=0] - Số phút gia hạn thêm (dạy thêm giờ)
 * @returns {object} Chi tiết thời gian đếm ngược chính xác đến từng giây
 */
export function calculatePeriodRemainingSec(slot, now = new Date(), extraMinutes = 0) {
  if (!slot) return null;

  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const curSeconds = now.getSeconds();
  const curTotalSec = curMinutes * 60 + curSeconds;

  const startSec = (slot.startHour * 60 + slot.startMin) * 60;
  const baseEndSec = (slot.endHour * 60 + slot.endMin) * 60;
  const endSec = baseEndSec + (extraMinutes * 60);

  // Tính số giây còn lại đến đúng mốc kết thúc của tiết
  const remainingSec = Math.max(0, endSec - curTotalSec);
  const totalSec = Math.max(1, endSec - startSec);
  const elapsedSec = Math.max(0, curTotalSec - startSec);
  const progress = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));

  // Kiểm tra thời điểm hiện tại có đang nằm trong khung giờ tiết học hay không
  const isCurrentlyInSlot = curTotalSec >= startSec && curTotalSec < endSec;
  const isTimeUp = remainingSec === 0;

  // Giờ kết thúc có định dạng HH:MM
  const endHour = Math.floor(endSec / 3600) % 24;
  const endMin = Math.floor((endSec % 3600) / 60);
  const formattedEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  return {
    slot,
    remainingSec,
    remainingMin: Math.ceil(remainingSec / 60),
    totalSec,
    elapsedSec,
    progress,
    isCurrentlyInSlot,
    isTimeUp,
    curTotalSec,
    startSec,
    baseEndSec,
    endSec,
    extraMinutes,
    formattedEndTime
  };
}

// ============================================================================
// GIAI ĐOẠN 3 — Tiện ích cho TKB có thể chỉnh sửa: viết tắt môn, chuẩn hóa
// lưới, phẳng hóa và PHÁT HIỆN XUNG ĐỘT (thuần túy — test được ngoài trình duyệt).
// ============================================================================

// Metadata cố định của 5 ngày trong tuần (dùng khi chuẩn hóa lưới từ dữ liệu đã lưu)
const DAY_META = {
  1: { dayOfWeek: 1, name: 'Thứ Hai', shortName: 'T2' },
  2: { dayOfWeek: 2, name: 'Thứ Ba', shortName: 'T3' },
  3: { dayOfWeek: 3, name: 'Thứ Tư', shortName: 'T4' },
  4: { dayOfWeek: 4, name: 'Thứ Năm', shortName: 'T5' },
  5: { dayOfWeek: 5, name: 'Thứ Sáu', shortName: 'T6' }
};

const DAY_NAMES = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu' };

// Bảng viết tắt môn học (CHỈ để hiển thị — dữ liệu luôn giữ tên đầy đủ + tooltip)
const SUBJECT_ABBREVIATIONS = {
  'Tin học': 'Tin',
  'Công nghệ': 'CN',
  'Hoạt động trải nghiệm': 'HĐTN',
  'Giáo dục thể chất': 'GDTC',
  'Âm nhạc': 'Nhạc',
  'Mĩ thuật': 'MT'
};

/**
 * Viết tắt tên môn để hiển thị trong ô TKB nhỏ. KHÔNG thay đổi dữ liệu gốc.
 * @param {string} fullName - Tên môn đầy đủ (giữ trong dữ liệu + tooltip)
 * @returns {string} Nhãn viết tắt
 */
export function abbreviateSubject(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const name = fullName.trim();
  if (!name) return '';
  if (SUBJECT_ABBREVIATIONS[name]) return SUBJECT_ABBREVIATIONS[name];
  if (name.length <= 6) return name;
  const initials = name.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('');
  return initials.length >= 2 ? initials.slice(0, 6) : name.slice(0, 6);
}

// Chuẩn hóa 1 ô: null | {isOff,note} | {subject,className,grade}
function normalizeCell(cell) {
  if (!cell || typeof cell !== 'object') return null;
  if (cell.isOff) {
    return { isOff: true, note: typeof cell.note === 'string' && cell.note.trim() ? cell.note.trim() : 'Nghỉ' };
  }
  const className = typeof cell.className === 'string' ? cell.className.trim() : '';
  if (!className) return null;
  const out = {
    subject: typeof cell.subject === 'string' && cell.subject.trim() ? cell.subject.trim() : 'Tin học',
    className
  };
  if (cell.grade !== undefined && cell.grade !== null && cell.grade !== '') {
    const g = Number(cell.grade);
    if (!Number.isNaN(g)) out.grade = g;
  }
  return out;
}

/**
 * Chuẩn hóa lưới TKB về đúng hình dạng (ngày 1–5, morning 1–4, afternoon 1–3).
 * Phòng thủ khi nạp từ API / lưu từ client. Trả về null nếu đầu vào không phải object.
 */
export function normalizeTimetableGrid(grid) {
  if (!grid || typeof grid !== 'object') return null;
  const out = {};
  for (let day = 1; day <= 5; day++) {
    const src = grid[day] || grid[String(day)] || {};
    const meta = DAY_META[day];
    const morning = {};
    for (let p = 1; p <= 4; p++) {
      morning[p] = normalizeCell(src.morning ? src.morning[p] : null);
    }
    const afternoon = {};
    for (let p = 1; p <= 3; p++) {
      afternoon[p] = normalizeCell(src.afternoon ? src.afternoon[p] : null);
    }
    out[day] = { dayOfWeek: meta.dayOfWeek, name: meta.name, shortName: meta.shortName, morning, afternoon };
  }
  return out;
}

/**
 * Phẳng hóa lưới TKB thành danh sách phân công (bỏ ô trống / ô nghỉ).
 * @returns {Array<{day,session,period,slotId,className,subject,grade}>}
 */
export function flattenTimetable(grid) {
  const list = [];
  if (!grid || typeof grid !== 'object') return list;
  for (let day = 1; day <= 5; day++) {
    const d = grid[day] || grid[String(day)];
    if (!d || typeof d !== 'object') continue;
    for (const session of ['morning', 'afternoon']) {
      const s = d[session];
      if (!s || typeof s !== 'object') continue;
      for (const periodKey of Object.keys(s)) {
        const cell = s[periodKey];
        if (!cell || cell.isOff) continue;
        const className = typeof cell.className === 'string' ? cell.className.trim() : '';
        if (!className) continue;
        list.push({
          day: Number(day),
          session,
          period: Number(periodKey),
          slotId: `${session === 'morning' ? 'm' : 'a'}${periodKey}`,
          className,
          subject: cell.subject || 'Tin học',
          grade: cell.grade ?? null
        });
      }
    }
  }
  return list;
}

/**
 * PHÁT HIỆN XUNG ĐỘT thời khóa biểu (mô hình 1 GV + 1 phòng máy).
 * Nhận lưới HOẶC danh sách phân công phẳng (để test độc lập).
 * Trả về mảng {type, severity:'error'|'warning', message, ...}. severity==='error' ⇒ CHẶN LƯU.
 *  - SLOT_COLLISION (error): ≥2 lớp cùng một khung (ngày+buổi+tiết) → vi phạm đồng thời cả 3 quy tắc.
 *  - CLASS_SAME_DAY (error): 1 lớp bị xếp ≥2 tiết trong cùng một ngày.
 *  - CLASS_MULTI_DAY (warning): 1 lớp xuất hiện ở nhiều ngày trong tuần (nhắc kiểm tra, không chặn).
 */
export function detectTimetableConflicts(gridOrList) {
  const assignments = Array.isArray(gridOrList) ? gridOrList : flattenTimetable(gridOrList);
  const conflicts = [];

  // 1) SLOT_COLLISION — trùng khung giờ vật lý
  const slotMap = new Map();
  for (const a of assignments) {
    const key = `${a.day}|${a.session}|${a.period}`;
    if (!slotMap.has(key)) slotMap.set(key, []);
    slotMap.get(key).push(a);
  }
  for (const [key, list] of slotMap) {
    if (list.length > 1) {
      const day = Number(key.split('|')[0]);
      const first = list[0];
      conflicts.push({
        type: 'SLOT_COLLISION',
        severity: 'error',
        day,
        session: first.session,
        period: first.period,
        classes: list.map(x => x.className),
        message: `Trùng tiết: ${list.map(x => x.className).join(', ')} bị xếp cùng một khung giờ (${DAY_NAMES[day] || 'Ngày ' + day}, tiết ${first.period} ${first.session === 'morning' ? 'sáng' : 'chiều'}).`
      });
    }
  }

  // 2) CLASS_SAME_DAY — 1 lớp ≥2 tiết cùng ngày
  const classDayMap = new Map();
  for (const a of assignments) {
    const key = `${a.className}|${a.day}`;
    if (!classDayMap.has(key)) classDayMap.set(key, []);
    classDayMap.get(key).push(a);
  }
  for (const [key, list] of classDayMap) {
    if (list.length > 1) {
      const parts = key.split('|');
      const className = parts[0];
      const day = Number(parts[1]);
      conflicts.push({
        type: 'CLASS_SAME_DAY',
        severity: 'error',
        day,
        className,
        count: list.length,
        message: `Lớp ${className} bị xếp ${list.length} tiết trong ${DAY_NAMES[day] || 'ngày ' + day} — một lớp không thể học 2 tiết Tin học cùng ngày.`
      });
    }
  }

  // 3) CLASS_MULTI_DAY — cảnh báo lớp xuất hiện ở nhiều ngày
  const classWeekMap = new Map();
  for (const a of assignments) {
    if (!classWeekMap.has(a.className)) classWeekMap.set(a.className, new Set());
    classWeekMap.get(a.className).add(a.day);
  }
  for (const [className, daySet] of classWeekMap) {
    if (daySet.size > 1) {
      conflicts.push({
        type: 'CLASS_MULTI_DAY',
        severity: 'warning',
        className,
        days: Array.from(daySet).sort((x, y) => x - y),
        message: `Lớp ${className} được xếp ở ${daySet.size} ngày khác nhau trong tuần — hãy kiểm tra lại nếu không chủ đích.`
      });
    }
  }

  return conflicts;
}

/**
 * Có xung đột NGHIÊM TRỌNG (severity==='error') hay không → dùng để chặn lưu.
 */
export function hasBlockingConflicts(conflicts) {
  return Array.isArray(conflicts) && conflicts.some(c => c && c.severity === 'error');
}

