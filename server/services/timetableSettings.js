import { createHash } from 'node:crypto';
import { getDatabase } from '../db/connection.js';
import { getDbTimetable, saveDbTimetable } from '../db/settings.js';
import { DEFAULT_TEACHING_PERIODS, normalizeTeachingPeriods } from '../../shared/timetablePeriods.js';

const PERIOD_KEY = 'timetable_periods';
export function getTimetableSettings() {
  const row = getDatabase().prepare('SELECT value FROM app_settings WHERE key=?').get(PERIOD_KEY);
  const periodSlots = normalizeTeachingPeriods(row ? JSON.parse(row.value) : DEFAULT_TEACHING_PERIODS);
  const timetable = getDbTimetable();
  const revision = createHash('sha256').update(JSON.stringify({ timetable, periodSlots })).digest('hex');
  return { timetable, periodSlots, revision };
}

export function saveTimetableSettings({ timetable, periodSlots, expectedRevision }) {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const current = getTimetableSettings();
    if (periodSlots !== undefined && typeof expectedRevision !== 'string') {
      throw Object.assign(new Error('Hãy tải lại thời khóa biểu trước khi lưu khung giờ.'), { statusCode: 428 });
    }
    if (expectedRevision !== undefined && expectedRevision !== current.revision) {
      throw Object.assign(new Error('Thời khóa biểu đã được sửa ở cửa sổ khác. Bản đang soạn vẫn được giữ; hãy tải lịch mới trước khi sửa tiếp.'), { statusCode: 409, code: 'TIMETABLE_STALE' });
    }
    const normalized = periodSlots === undefined ? current.periodSlots : normalizeTeachingPeriods(periodSlots);
    saveDbTimetable(timetable);
    db.prepare('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)').run(PERIOD_KEY, JSON.stringify(normalized));
    const saved = getTimetableSettings();
    db.exec('COMMIT;');
    return saved;
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
}
