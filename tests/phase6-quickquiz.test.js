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
  getQuestionById,
  createQuizSession,
  getQuizSessionById,
  saveQuizResults
} = await import('../server/db/quiz.js');
const { validateQuestionPayload } = await import('../server/routes/quiz.js');

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

  it('4. Server-side scoring: correct_count tính từ distribution + correct_index (bỏ qua số client)', () => {
    const sess = createQuizSession({ id: 'qs_p6_score', mode: 'CLASS',
      questions: [{ question: 'Q?', options: ['A', 'B', 'C', 'D'], correct_index: 1, correct_answer: 'B' }] });
    const qqId = sess.questions[0].id;
    saveQuizResults('qs_p6_score', { status: 'COMPLETED',
      results: [{ quiz_question_id: qqId, distribution: { '0': 1, '1': 8, '2': 1, '3': 0 }, total_responses: 10, correct_count: 999, accuracy_rate: 100 }] });
    const saved = getQuizSessionById('qs_p6_score');
    const r = saved.results.find(x => x.quiz_question_id === qqId);
    assert.equal(r.correct_count, 8);
    assert.equal(r.wrong_count, 2);
    assert.equal(r.accuracy_rate, 80);
    assert.equal(saved.average_accuracy, 80);
  });

  it('5. Loại kết quả học sinh KHÔNG thuộc lớp của phiên', () => {
    db.exec("INSERT OR REPLACE INTO classes (id, name, grade) VALUES ('C_P6', 'Lớp Test P6', 3);");
    db.exec("INSERT OR REPLACE INTO students (id, class_id, name) VALUES ('S_P6_1', 'C_P6', 'HS 1');");
    const sess = createQuizSession({ id: 'qs_p6_member', mode: 'STUDENT', class_id: 'C_P6',
      questions: [{ question: 'Q?', options: ['A', 'B'], correct_index: 0, correct_answer: 'A' }] });
    const qqId = sess.questions[0].id;
    saveQuizResults('qs_p6_member', { status: 'COMPLETED', student_results: [
      { quiz_question_id: qqId, student_id: 'S_P6_1', student_name: 'HS 1', status: 'CORRECT' },
      { quiz_question_id: qqId, student_id: 'KHONG_THUOC_LOP', student_name: 'Giả', status: 'CORRECT' }
    ] });
    const saved = getQuizSessionById('qs_p6_member');
    assert.equal(saved.student_results.length, 1);
    assert.equal(saved.student_results[0].student_id, 'S_P6_1');
  });

  it('6. Idempotent: lưu kết quả 2 lần không nhân đôi bản ghi', () => {
    const sess = createQuizSession({ id: 'qs_p6_idem', mode: 'CLASS',
      questions: [{ question: 'Q?', options: ['A', 'B'], correct_index: 0, correct_answer: 'A' }] });
    const qqId = sess.questions[0].id;
    const payload = { status: 'COMPLETED', results: [{ quiz_question_id: qqId, distribution: { '0': 5, '1': 5 }, total_responses: 10 }] };
    saveQuizResults('qs_p6_idem', payload);
    saveQuizResults('qs_p6_idem', payload);
    const row = db.prepare('SELECT COUNT(*) AS c FROM quiz_results WHERE quiz_session_id = ?;').get('qs_p6_idem');
    assert.equal(row.c, 1);
    assert.equal(getQuizSessionById('qs_p6_idem').results[0].correct_count, 5);
  });

  it('7. validateQuestionPayload chặn đáp án/loại/lựa chọn không hợp lệ', () => {
    assert.throws(() => validateQuestionPayload({ question: 'q', type: 'MULTIPLE_CHOICE', options: ['A', 'B'], correct_answer: 'Z' }), /nằm trong danh sách/);
    assert.throws(() => validateQuestionPayload({ question: 'q', type: 'KHONG_CO_LOAI' }), /không hợp lệ/);
    assert.throws(() => validateQuestionPayload({ question: 'q', type: 'MULTIPLE_CHOICE', options: ['A', 'A'], correct_answer: 'A' }), /trùng nhau/);
    assert.doesNotThrow(() => validateQuestionPayload({ question: 'q', type: 'MULTIPLE_CHOICE', options: ['A', 'B'], correct_answer: 'B' }));
  });
});
