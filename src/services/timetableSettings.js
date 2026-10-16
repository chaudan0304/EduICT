import apiClient from './apiClient';
import { getDefaultTimetable, setActiveTimetable, setActivePeriodSlots } from '../utils/timetable';

export const TIMETABLE_UPDATED = 'eduict-timetable-updated';
let revision = null;
let generation = 0;
export const getTimetableGeneration = () => generation;
export const getTimetableRevision = () => revision;
export const fetchTimetableSettings = options => apiClient.get('/api/timetable', options);
export function applyTimetableSettings(settings) {
  if (!settings?.revision || !Array.isArray(settings.periodSlots)) throw new Error('Máy chủ chưa hỗ trợ chỉnh giờ học. Hãy cập nhật ứng dụng rồi thử lại.');
  if (revision === settings.revision) return;
  // Validate period data before replacing either active schedule.
  setActivePeriodSlots(settings.periodSlots);
  setActiveTimetable(settings.timetable || getDefaultTimetable());
  revision = settings.revision;
  generation++;
  window.dispatchEvent(new CustomEvent(TIMETABLE_UPDATED, { detail: settings }));
}
export async function saveTimetableSettings(timetable, periodSlots, expectedRevision) {
  const saved = await apiClient.post('/api/timetable', { timetable, periodSlots, expectedRevision });
  applyTimetableSettings(saved);
  return saved;
}
