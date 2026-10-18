import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('timetable saves class and hours together, reloads custom hours, rejects stale and invalid writes without changing saved data', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-timetable-recovery-'));
  process.env.EDUICT_APP_ROOT = root; process.env.EDUICT_DATA_DIR = root; process.env.EDUICT_DB_PATH = path.join(root, 'fixture.sqlite');
  const { closeConnection } = await import('../server/db/connection.js');
  const { getTimetableSettings, saveTimetableSettings } = await import('../server/services/timetableSettings.js');
  const { getDefaultTimetable, setActiveTimetable, setActivePeriodSlots, getCurrentPeriodStatus } = await import('../src/utils/timetable.js');
  try {
    const original = getTimetableSettings();
    const periods = original.periodSlots.map(slot => slot.id === 'm1' ? { ...slot, startTime: '07:10', endTime: '07:50' } : slot);
    const grid = getDefaultTimetable(); grid[1].morning[1] = { className: '1A9', grade: 1, subject: 'Tin học' };
    const saved = saveTimetableSettings({ timetable: grid, periodSlots: periods, expectedRevision: original.revision });
    closeConnection();
    assert.deepEqual(getTimetableSettings(), saved);
    setActiveTimetable(saved.timetable); setActivePeriodSlots(saved.periodSlots);
    const status = getCurrentPeriodStatus(new Date(2026, 9, 19, 7, 20));
    assert.equal(status.className, '1A9'); assert.equal(status.remainingSec, 30 * 60);
    assert.throws(() => saveTimetableSettings({ timetable: grid, periodSlots: periods, expectedRevision: original.revision }), error => error.statusCode === 409);
    const invalid = periods.map(slot => slot.id === 'm2' ? { ...slot, startTime: '07:30' } : slot);
    assert.throws(() => saveTimetableSettings({ timetable: {}, periodSlots: invalid, expectedRevision: saved.revision }), /chồng/);
    assert.deepEqual(getTimetableSettings(), saved);
    assert.throws(() => saveTimetableSettings({ timetable: grid, periodSlots: periods }), error => error.statusCode === 428);
  } finally { closeConnection(); fs.rmSync(root, { recursive: true, force: true }); }
});
