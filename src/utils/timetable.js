/**
 * Lịch Giảng Dạy Cá Nhân (Thời Khóa Biểu)
 * Giáo viên: Nguyễn Văn Châu Đàn (Châu Đàn)
 * Giáo viên bộ môn Tin học • Áp dụng từ ngày 05/09/2026 • Năm học 2026 - 2027
 */

export const TEACHER_INFO = {
  name: 'Nguyễn Văn Châu Đàn',
  shortName: 'Châu Đàn',
  subject: 'Tin học',
  effectiveDate: '05/09/2026',
  schoolYear: '2026 - 2027'
};

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
  const daySchedule = TIMETABLE_DATA[day];

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
