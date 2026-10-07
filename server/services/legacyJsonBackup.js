import { readDatabaseSnapshot } from './databaseExport.js';

// Old JSON files contain classes/score logs only. Merge them into a full snapshot
// so the restore uses the same atomic path and preserves unrelated database data.
export function legacyJsonSnapshot(db, data) {
  if (!Array.isArray(data?.classes) || !data.classes.length) throw new Error('File JSON cũ không có danh sách lớp hợp lệ.');
  const snapshot = readDatabaseSnapshot(db);
  const now = new Date().toISOString();
  const classes = snapshot.tables.find(table => table.name === 'classes');
  const students = snapshot.tables.find(table => table.name === 'students');
  const validId = value => typeof value === 'string' && value.trim() && value.length <= 200;
  const seen = new Set();
  function upsert(table, values, keys) {
    const index = table.rows.findIndex(row => keys.every(key => row[table.columns.indexOf(key)] === values[key]));
    const current = index >= 0 ? table.rows[index] : null;
    const row = table.columns.map((column, i) => values[column] === undefined ? (current?.[i] ?? null) : values[column]);
    if (index >= 0) table.rows[index] = row; else table.rows.push(row);
  }
  for (const c of data.classes) {
    if (!validId(c?.id) || typeof c.name !== 'string' || !c.name.trim() || !Array.isArray(c.students) || seen.has(c.id)) throw new Error('Dữ liệu lớp trong JSON không hợp lệ hoặc bị trùng.');
    seen.add(c.id);
    if (!Number.isInteger(c.grade ?? 3) || (c.grade ?? 3) < 1 || (c.grade ?? 3) > 5 || (c.goodScores !== undefined && !Array.isArray(c.goodScores))) throw new Error('Khối lớp hoặc sổ điểm tốt trong JSON không hợp lệ.');
    const existing = classes.rows.find(row => row[classes.columns.indexOf('id')] === c.id);
    upsert(classes, {
      id: c.id, name: c.name, grade: c.grade ?? 3, subject: c.subject ?? 'Tin Học', school_year: c.schoolYear ?? c.school_year ?? '2026 - 2027',
      good_scores: c.goodScores === undefined ? (existing ? undefined : '[]') : JSON.stringify(c.goodScores),
      created_at: existing ? undefined : now,
    }, ['id']);
    const studentIds = new Set();
    for (const s of c.students) {
      if (!validId(s?.id) || typeof s.name !== 'string' || !s.name.trim() || studentIds.has(s.id)) throw new Error('Dữ liệu học sinh trong JSON không hợp lệ hoặc bị trùng.');
      studentIds.add(s.id);
      upsert(students, {
        id: s.id, class_id: c.id, name: s.name, dob: s.dob ?? '', gender: s.gender ?? 'Nam', machine_number: s.machineNumber ?? s.machine_number ?? null,
        stars: s.stars ?? 0, attendance: s.attendance ?? 'present', skill_mouse: s.skill_mouse ?? 'T', skill_keyboard: s.skill_keyboard ?? 'H', skill_paint: s.skill_paint ?? 'T',
        eval_regular: s.eval_regular ?? 'T', eval_hk1: s.eval_hk1 ?? s.eval_regular ?? 'T', eval_hk2: s.eval_hk2 ?? s.eval_regular ?? 'T', score_hk1: s.score_hk1 ?? null, score_ck: s.score_ck ?? null, note: s.note ?? '',
      }, ['id', 'class_id']);
    }
  }
  if (Array.isArray(data.brokenMachines)) {
    const table = snapshot.tables.find(item => item.name === 'broken_machines');
    const numbers = new Set();
    table.rows = data.brokenMachines.map(item => {
      const number = typeof item === 'number' ? item : item?.machine_number;
      if (!Number.isInteger(number) || number < 1 || number > 31 || numbers.has(number)) throw new Error('Danh sách máy hỏng trong JSON không hợp lệ.');
      numbers.add(number);
      const values = { machine_number: number, issue: item?.issue ?? 'Máy gặp sự cố', reported_at: item?.reported_at ?? now };
      return table.columns.map(column => values[column] ?? null);
    });
  }
  return snapshot;
}
