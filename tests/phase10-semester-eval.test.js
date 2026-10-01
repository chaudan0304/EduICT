// Sổ Điểm 2 Học Kỳ — eval_hk1 / eval_hk2 (persistence, startup-trap regression, backup, migration)
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const tmpDir = path.join(os.tmpdir(), `eduict_phase10_${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });
process.env.EDUICT_APP_ROOT = tmpDir;
process.env.EDUICT_DATA_DIR = tmpDir;
process.env.EDUICT_DB_PATH = path.join(tmpDir, `phase10_${Date.now()}.sqlite`);

const { initSchema } = await import('../server/db/schema.js');
const { getDatabase } = await import('../server/db/connection.js');
const {
  saveOrUpdateClass,
  saveStudentsForClass,
  getAllClassesWithStudents,
  sortAllStudentsInDatabase
} = await import('../server/db/classes.js');
const { generateSqlScriptDump } = await import('../server/db/backup.js');

const db = getDatabase();
initSchema(db);

describe('Sổ Điểm 2 học kỳ: eval_hk1 / eval_hk2', () => {
  after(() => {
    try {
      db.close();
      if (fs.existsSync(process.env.EDUICT_DB_PATH)) fs.unlinkSync(process.env.EDUICT_DB_PATH);
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('1. Lưu & đọc lại giữ nguyên eval_hk1/eval_hk2', () => {
    saveOrUpdateClass({ id: 'C_P10', name: 'Lớp 3P10', grade: 3, students: [] });
    saveStudentsForClass('C_P10', [
      { id: 'HS1', name: 'An', eval_hk1: 'H', eval_hk2: 'C', score_hk1: 8, score_ck: 6 }
    ]);
    const cls = getAllClassesWithStudents().find(c => c.id === 'C_P10');
    const s = cls.students.find(x => x.id === 'HS1');
    assert.equal(s.eval_hk1, 'H');
    assert.equal(s.eval_hk2, 'C');
  });

  it('2. REGRESSION startup-trap: re-sort KHÔNG reset eval_hk1/eval_hk2', () => {
    db.prepare("INSERT INTO classes (id, name, grade) VALUES ('C_SORT', 'Lớp Sort', 3);").run();
    // Chèn LỆCH thứ tự A-Z để ép sortAll xóa + chèn lại
    db.prepare("INSERT INTO students (id, class_id, name, eval_hk1, eval_hk2) VALUES ('s_binh', 'C_SORT', 'Bình', 'H', 'C');").run();
    db.prepare("INSERT INTO students (id, class_id, name, eval_hk1, eval_hk2) VALUES ('s_an', 'C_SORT', 'An', 'T', 'H');").run();
    sortAllStudentsInDatabase();
    const binh = db.prepare("SELECT eval_hk1, eval_hk2 FROM students WHERE id = 's_binh';").get();
    const an = db.prepare("SELECT eval_hk1, eval_hk2 FROM students WHERE id = 's_an';").get();
    assert.equal(binh.eval_hk1, 'H', 'Bình.eval_hk1 phải giữ H sau khi re-sort');
    assert.equal(binh.eval_hk2, 'C');
    assert.equal(an.eval_hk1, 'T');
    assert.equal(an.eval_hk2, 'H');
  });

  it('3. Backup dump chứa cột + giá trị eval_hk1/eval_hk2', () => {
    const dump = generateSqlScriptDump();
    assert.ok(dump.includes('eval_hk1'), 'dump phải khai báo cột eval_hk1');
    assert.ok(dump.includes('eval_hk2'), 'dump phải khai báo cột eval_hk2');
    assert.ok(/'H', 'C'/.test(dump), 'giá trị eval học kỳ của Bình (H, C) phải nằm trong câu INSERT');
  });

  it('4. Migration idempotent: initSchema chạy lại không lỗi, cột vẫn còn', () => {
    assert.doesNotThrow(() => initSchema(db));
    const cols = db.prepare('PRAGMA table_info(students);').all().map(c => c.name);
    assert.ok(cols.includes('eval_hk1'));
    assert.ok(cols.includes('eval_hk2'));
  });
});
