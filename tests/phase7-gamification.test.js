import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_gamification_'));
const TMP_DB = path.join(TMP_ROOT, `gamification_${Date.now()}.sqlite`);

// Cô lập khỏi DB thực tế
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = TMP_DB;

describe('Phase 7 - Gamification Engine', () => {
  let db;

  before(async () => {
    // Import db to initialize schema
    const connection = await import('../server/db/connection.js');
    db = connection.getDatabase();

    // Dữ liệu giả lập
    db.exec(`
      INSERT INTO classes (id, name, grade) VALUES ('c1', '3A1', 3);
      INSERT INTO students (id, name, class_id, stars) VALUES ('s1', 'Nguyễn Văn A', 'c1', 10);
      INSERT INTO students (id, name, class_id, stars) VALUES ('s2', 'Trần Thị B', 'c1', 5);
      
      -- Seed rewards
      INSERT INTO rewards (id, name, cost) VALUES ('r1', 'Thẻ Miễn Tử', 15);
      INSERT INTO rewards (id, name, cost) VALUES ('r2', 'Thẻ Âm Nhạc', 5);
    `);
  });

  after(() => {
    if (db) db.close();
    try {
      if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB);
      if (fs.existsSync(TMP_ROOT)) fs.rmdirSync(TMP_ROOT);
    } catch(e) {}
  });

  test('Requirement 22: Gamification is a unified engine, Idempotency for stars', async () => {
    const { awardStar } = await import('../server/db/gamification.js');
    
    const res1 = awardStar({
      id: 'event_1',
      studentId: 's1',
      classId: 'c1',
      amount: 2,
      reason: 'Phát biểu đúng',
      source: 'MANUAL',
      sessionId: null
    });
    
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.newBalance, 12);

    // Idempotency: same event ID should fail gracefully
    const res2 = awardStar({
      id: 'event_1',
      studentId: 's1',
      classId: 'c1',
      amount: 2,
      reason: 'Phát biểu đúng (trùng lặp)',
      source: 'MANUAL',
      sessionId: null
    });
    
    assert.strictEqual(res2.success, false);
    assert.match(res2.message, /already exists/i);
    
    // Balance should remain 12
    const balance = db.prepare('SELECT stars FROM students WHERE id = ?').get('s1');
    assert.strictEqual(balance.stars, 12);
  });

  test('Requirement 22: Server-side validation for rewards', async () => {
    const { redeemReward } = await import('../server/db/gamification.js');
    
    // s2 has 5 stars. Try to buy 'r1' (cost 15) -> Should fail
    assert.throws(() => {
      redeemReward({
        id: 'red_1',
        studentId: 's2',
        classId: 'c1',
        rewardId: 'r1',
        sessionId: null
      });
    }, /Insufficient stars/i);
    
    // Try to buy 'r2' (cost 5) -> Should succeed
    const res = redeemReward({
      id: 'red_2',
      studentId: 's2',
      classId: 'c1',
      rewardId: 'r2',
      sessionId: null
    });
    
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newBalance, 0); // 5 - 5 = 0
    
    // Check redemption history in DB
    const count = db.prepare('SELECT COUNT(*) as c FROM reward_redemptions WHERE id = ?').get('red_2').c;
    assert.strictEqual(count, 1);
  });

  test('Gộp sổ cái 1b: adjustStars ghi sao có dấu, kẹp sàn 0, idempotent', async () => {
    const { adjustStars } = await import('../server/db/gamification.js');

    db.exec("INSERT INTO students (id, name, class_id, stars) VALUES ('s3', 'Lê Văn C', 'c1', 8);");

    // Trừ 3 -> 5, ghi 1 dòng ledger amount = -3
    const dec = adjustStars({ id: 'adj_1', studentId: 's3', classId: 'c1', amount: -3, reason: 'Chỉnh tay', source: 'GRADEBOOK', sessionId: null });
    assert.strictEqual(dec.success, true);
    assert.strictEqual(dec.newBalance, 5);
    const tx = db.prepare('SELECT amount FROM star_transactions WHERE id = ?').get('adj_1');
    assert.strictEqual(tx.amount, -3);

    // Trừ quá tay -> kẹp sàn 0, không âm
    const floor = adjustStars({ id: 'adj_2', studentId: 's3', classId: 'c1', amount: -100, reason: 'Chỉnh tay', source: 'GRADEBOOK', sessionId: null });
    assert.strictEqual(floor.newBalance, 0);

    // Idempotency: trùng id -> không ghi lại
    const dup = adjustStars({ id: 'adj_1', studentId: 's3', classId: 'c1', amount: -3, reason: 'trùng', source: 'GRADEBOOK', sessionId: null });
    assert.strictEqual(dup.success, false);
    assert.match(dup.message, /already exists/i);
    assert.throws(() => adjustStars({ id: 'adj_3', studentId: 's3', classId: 'c1', amount: 0, reason: 'x', source: 'X' }), /non-zero/i);
  });

  test('Gộp sổ cái 1b: addStudentParticipation KHÔNG còn tự đổi students.stars', async () => {
    const { addStudentParticipation } = await import('../server/db/sessions.js');

    db.exec("INSERT INTO students (id, name, class_id, stars) VALUES ('s4', 'Phạm Thị D', 'c1', 7);");
    db.exec("INSERT INTO classroom_sessions (id, class_id, lesson_title, session_date) VALUES ('sess1', 'c1', 'Bài 1', '2026-10-02');");

    const before = db.prepare("SELECT stars FROM students WHERE id = 's4' AND class_id = 'c1'").get().stars;
    const res = addStudentParticipation('sess1', { student_id: 's4', badge_type: 'STAR', stars_awarded: 5, note: 'test' });
    assert.strictEqual(res.success, true);

    // Số sao PHẢI giữ nguyên (participation giờ chỉ là log)
    const after = db.prepare("SELECT stars FROM students WHERE id = 's4' AND class_id = 'c1'").get().stars;
    assert.strictEqual(after, before);

    // Nhưng bản ghi participation vẫn được lưu
    const part = db.prepare("SELECT stars_awarded FROM student_participation WHERE session_id = 'sess1' AND student_id = 's4'").get();
    assert.strictEqual(part.stars_awarded, 5);
  });
});
