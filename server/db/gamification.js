import { getDatabase } from './connection.js';

// ==========================================
// 1. STAR SYSTEM
// ==========================================

export function awardStar(transactionData) {
  const db = getDatabase();
  const { id, studentId, classId, amount, reason, source, sessionId } = transactionData;
  
  if (amount < 0) {
    throw new Error('Amount cannot be negative in awardStar. Use deduction rules if needed.');
  }

  // Idempotency check
  const existing = db.prepare('SELECT id FROM star_transactions WHERE id = ?').get(id);
  if (existing) {
    return { success: false, message: 'Transaction already exists' };
  }

  const stmt = db.prepare(`
    INSERT INTO star_transactions (id, student_id, class_id, amount, reason, source, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const updateStmt = db.prepare(`
    UPDATE students 
    SET stars = MAX(0, COALESCE(stars, 0) + ?)
    WHERE id = ? AND class_id = ?
  `);

  try {
    db.exec('BEGIN TRANSACTION');
    stmt.run(id, studentId, classId, amount, reason, source, sessionId || null);
    updateStmt.run(amount, studentId, classId);
    
    // Fetch updated balance
    const balance = db.prepare('SELECT stars FROM students WHERE id = ? AND class_id = ?').get(studentId, classId);
    
    db.exec('COMMIT');
    return { success: true, newBalance: balance.stars };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Điều chỉnh sao có DẤU (dương = cộng, âm = trừ) — dùng cho chỉnh tay của giáo
// viên và badge nội quy âm. Khác awardStar (chỉ nhận dương): hàm này nhận số
// nguyên khác 0, vẫn ghi 1 dòng star_transactions (amount có dấu) để sổ cái
// phản ánh đủ mọi thay đổi. Số dư luôn kẹp sàn 0.
export function adjustStars(transactionData) {
  const db = getDatabase();
  const { id, studentId, classId, amount, reason, source, sessionId } = transactionData;

  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt === 0) {
    throw new Error('Adjust amount must be a non-zero integer.');
  }

  // Idempotency check
  const existing = db.prepare('SELECT id FROM star_transactions WHERE id = ?').get(id);
  if (existing) {
    return { success: false, message: 'Transaction already exists' };
  }

  const stmt = db.prepare(`
    INSERT INTO star_transactions (id, student_id, class_id, amount, reason, source, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE students
    SET stars = MAX(0, COALESCE(stars, 0) + ?)
    WHERE id = ? AND class_id = ?
  `);

  try {
    db.exec('BEGIN TRANSACTION');
    stmt.run(id, studentId, classId, amt, reason, source, sessionId || null);
    updateStmt.run(amt, studentId, classId);

    const balance = db.prepare('SELECT stars FROM students WHERE id = ? AND class_id = ?').get(studentId, classId);

    db.exec('COMMIT');
    return { success: true, newBalance: balance.stars };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getStarHistory(studentId, classId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM star_transactions 
    WHERE student_id = ? AND class_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(studentId, classId);
}

// ==========================================
// 2. REWARD SYSTEM
// ==========================================

export function getAllRewards() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM rewards WHERE is_active = 1 ORDER BY cost ASC').all();
}

export function redeemReward(redemptionData) {
  const db = getDatabase();
  const { id, studentId, classId, rewardId, sessionId } = redemptionData;
  
  // Idempotency check
  const existing = db.prepare('SELECT id FROM reward_redemptions WHERE id = ?').get(id);
  if (existing) {
    return { success: false, message: 'Redemption already exists' };
  }

  try {
    db.exec('BEGIN TRANSACTION');
    
    const reward = db.prepare('SELECT * FROM rewards WHERE id = ? AND is_active = 1').get(rewardId);
    if (!reward) {
      throw new Error('Reward not found or inactive');
    }

    const student = db.prepare('SELECT stars FROM students WHERE id = ? AND class_id = ?').get(studentId, classId);
    if (!student || student.stars < reward.cost) {
      throw new Error('Insufficient stars');
    }

    const newStars = student.stars - reward.cost;

    // Deduct stars
    db.prepare('UPDATE students SET stars = ? WHERE id = ? AND class_id = ?').run(newStars, studentId, classId);
    
    // Insert redemption record
    db.prepare(`
      INSERT INTO reward_redemptions (id, student_id, class_id, reward_id, cost, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, studentId, classId, rewardId, reward.cost, sessionId || null);
    
    db.exec('COMMIT');
    return { success: true, newBalance: newStars, reward };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getRedemptionHistory(studentId, classId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT r.*, rw.name, rw.icon, rw.color 
    FROM reward_redemptions r
    JOIN rewards rw ON r.reward_id = rw.id
    WHERE r.student_id = ? AND r.class_id = ?
    ORDER BY r.redeemed_at DESC
  `);
  return stmt.all(studentId, classId);
}

// ==========================================
// 3. CHALLENGE SYSTEM (Foundation)
// ==========================================

export function getAllChallenges() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM challenges WHERE is_active = 1').all();
}

export function getStudentProgress(studentId, classId) {
  const db = getDatabase();
  return db.prepare(`
    SELECT p.*, c.name, c.description, c.type, c.target, c.reward 
    FROM student_progress p
    JOIN challenges c ON p.challenge_id = c.id
    WHERE p.student_id = ? AND p.class_id = ?
  `).all(studentId, classId);
}

export function updateChallengeProgress(studentId, classId, challengeId, amount = 1) {
  const db = getDatabase();
  try {
    db.exec('BEGIN TRANSACTION');
    
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ? AND is_active = 1').get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found or inactive');
    }

    let progress = db.prepare('SELECT * FROM student_progress WHERE student_id = ? AND class_id = ? AND challenge_id = ?').get(studentId, classId, challengeId);
    
    let isNewlyCompleted = false;

    if (!progress) {
      const pId = `prog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newProgress = Math.min(amount, challenge.target);
      const completed = newProgress >= challenge.target ? 1 : 0;
      isNewlyCompleted = completed === 1;

      db.prepare(`
        INSERT INTO student_progress (id, student_id, class_id, challenge_id, progress, completed)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pId, studentId, classId, challengeId, newProgress, completed);
      
      progress = { progress: newProgress, completed };
    } else {
      if (progress.completed === 1) {
        db.exec('COMMIT');
        return { success: true, completed: true, newlyCompleted: false };
      }

      const newProgress = Math.min(progress.progress + amount, challenge.target);
      const completed = newProgress >= challenge.target ? 1 : 0;
      isNewlyCompleted = completed === 1;

      db.prepare(`
        UPDATE student_progress 
        SET progress = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newProgress, completed, progress.id);
      
      progress.progress = newProgress;
      progress.completed = completed;
    }

    // Award star if newly completed
    if (isNewlyCompleted && challenge.reward > 0) {
      const awardId = `chal_reward_${challengeId}_${studentId}_${Date.now()}`;
      const updateStmt = db.prepare('UPDATE students SET stars = MAX(0, COALESCE(stars, 0) + ?) WHERE id = ? AND class_id = ?');
      updateStmt.run(challenge.reward, studentId, classId);
      
      db.prepare(`
        INSERT INTO star_transactions (id, student_id, class_id, amount, reason, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(awardId, studentId, classId, challenge.reward, 'Hoàn thành thử thách: ' + challenge.name, 'CHALLENGE');
    }

    db.exec('COMMIT');
    return { success: true, progress: progress.progress, completed: progress.completed === 1, newlyCompleted: isNewlyCompleted };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
