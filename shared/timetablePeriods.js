const PERIODS = [
  ['m1', 'morning', 1, 'Tiết 1 (Sáng)', '07:15', '07:55'],
  ['m2', 'morning', 2, 'Tiết 2 (Sáng)', '07:55', '08:35'],
  ['m3', 'morning', 3, 'Tiết 3 (Sáng)', '08:55', '09:35'],
  ['m4', 'morning', 4, 'Tiết 4 (Sáng)', '09:35', '10:15'],
  ['a1', 'afternoon', 1, 'Tiết 1 (Chiều)', '14:00', '14:40'],
  ['a2', 'afternoon', 2, 'Tiết 2 (Chiều)', '14:40', '15:20'],
  ['a3', 'afternoon', 3, 'Tiết 3 (Chiều)', '15:40', '16:20'],
];
export const DEFAULT_TEACHING_PERIODS = PERIODS.map(([id, , , , startTime, endTime]) => ({ id, startTime, endTime }));
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
const minutes = time => {
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw invalid('Giờ học phải có dạng HH:MM, từ 00:00 đến 23:59.');
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
};
const clockFields = (startTime, endTime) => ({
  startTime, endTime,
  startHour: Number(startTime.slice(0, 2)), startMin: Number(startTime.slice(3)),
  endHour: Number(endTime.slice(0, 2)), endMin: Number(endTime.slice(3)),
  durationMin: minutes(endTime) - minutes(startTime),
});

export function normalizeTeachingPeriods(input) {
  if (!Array.isArray(input) || input.length !== PERIODS.length || new Set(input.map(row => row?.id)).size !== PERIODS.length) {
    throw invalid('Cần đủ 4 tiết sáng và 3 tiết chiều, mỗi tiết một khung giờ.');
  }
  let previousEnd = -1;
  return PERIODS.map(([id, session, period, label]) => {
    const row = input.find(item => item?.id === id);
    if (!row) throw invalid(`Thiếu khung giờ ${label}.`);
    const start = minutes(row.startTime), end = minutes(row.endTime);
    if (end <= start) throw invalid(`${label}: giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.`);
    if (start < previousEnd) throw invalid(`${label}: giờ học chồng lên tiết trước. Hãy điều chỉnh lại.`);
    previousEnd = end;
    return { id, session, period, label, ...clockFields(row.startTime, row.endTime) };
  });
}

// Breaks follow the gaps between lessons, so moving a lesson never leaves an
// old recess/lunch interval covering a newly scheduled class.
export function buildPeriodSlots(input = DEFAULT_TEACHING_PERIODS) {
  const lessons = normalizeTeachingPeriods(input);
  const slots = [];
  lessons.forEach((lesson, index) => {
    const previous = lessons[index - 1];
    if (previous && previous.endTime < lesson.startTime) {
      const lunch = previous.session !== lesson.session;
      const id = lunch ? 'lunch' : lesson.id === 'm3' ? 'm_recess' : lesson.id === 'a3' ? 'a_recess' : `break_${lesson.id}`;
      slots.push({ id, session: lunch ? 'lunch' : lesson.session, period: null,
        ...(lunch ? { isLunch: true } : { isRecess: true }),
        label: lunch ? 'Nghỉ trưa' : `Nghỉ giữa tiết ${lesson.session === 'morning' ? 'sáng' : 'chiều'}`,
        ...clockFields(previous.endTime, lesson.startTime) });
    }
    slots.push(lesson);
  });
  return slots;
}
