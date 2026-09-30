// Phase 6 — Quick Quiz + Question Bank Tests
// ═══════════════════════════════════════════════════════

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Cô lập DB test riêng
const tmpDir = path.join(os.tmpdir(), `eduict_phase6_${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

process.env.EDUICT_APP_ROOT = tmpDir;
process.env.EDUICT_DATA_DIR = tmpDir;
process.env.EDUICT_DB_PATH = path.join(tmpDir, `phase6_test_${Date.now()}.sqlite`);

// Dynamic import sau khi set env
const { initSchema } = await import('../server/db/schema.js');
const { getDatabase } = await import('../server/db/connection.js');
const {
  createQuestion,
  getAllQuestions,
  deleteQuestion,
  getQuestionById
} = await import('../server/db/quiz.js');

const db = getDatabase();
initSchema(db);

describe('Phase 6: Quick Quiz & Question Bank', () => {
  after(() => {
    try {
      db.close();
      if (fs.existsSync(process.env.EDUICT_DB_PATH)) {
        fs.unlinkSync(process.env.EDUICT_DB_PATH);
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('1. Should create a new question successfully', () => {
    const qData = {
      question: 'Test question 1?',
      grade: 3,
      topic: 'TOPIC_A',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    };
    const created = createQuestion(qData);
    assert.ok(created.id);
    assert.equal(created.question, 'Test question 1?');
    assert.equal(created.correct_answer, 'A');
    assert.equal(created.is_deleted, 0);
  });

  it('2. Should prevent duplicate questions', () => {
    const qData = {
      question: 'Test duplicate?',
      grade: 3,
      type: 'MULTIPLE_CHOICE',
      correct_answer: 'Yes'
    };
    createQuestion(qData); // should succeed

    assert.throws(() => {
      createQuestion(qData); // duplicate should throw
    }, /trùng lặp/);
  });

  it('3. Should soft delete a question if used', () => {
    const qData = {
      question: 'Test soft delete?',
      grade: 4,
      type: 'TRUE_FALSE',
      correct_answer: 'TRUE'
    };
    const created = createQuestion(qData);
    const qId = created.id;

    // Simulate usage without full FK setup
    db.exec('PRAGMA foreign_keys = OFF;');
    db.prepare('INSERT INTO classroom_sessions (id, class_id, status, lesson_title, session_date) VALUES (?, ?, ?, ?, ?)').run('classsess1', 'class1', 'RUNNING', 'title', '2025-01-01');
    db.prepare('INSERT INTO quiz_sessions (id, classroom_session_id, title) VALUES (?, ?, ?)').run('sess1', 'classsess1', 'test title');
    db.prepare('INSERT INTO quiz_questions (id, quiz_session_id, question_bank_id, question, options, correct_index, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)').run('qq1', 'sess1', qId, 'q', '[]', 0, 'a');
    db.exec('PRAGMA foreign_keys = ON;');

    deleteQuestion(qId);
    
    // Check it is soft deleted
    const check = db.prepare('SELECT is_deleted FROM question_bank WHERE id = ?').get(qId);
    assert.equal(check.is_deleted, 1);

    // It should not appear in getAllQuestions
    const all = getAllQuestions();
    const found = all.find(q => q.id === qId);
    assert.equal(found, undefined);
  });
});
