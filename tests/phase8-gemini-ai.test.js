import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict_phase8_'));
const TMP_DB = path.join(TMP_ROOT, `phase8_test_${Date.now()}.sqlite`);

// Isolate DB and environment
process.env.EDUICT_APP_ROOT = TMP_ROOT;
process.env.EDUICT_DATA_DIR = TMP_ROOT;
process.env.EDUICT_DB_PATH = TMP_DB;

describe('Phase 8: Gemini AI Integration', () => {
  let db;

  before(async () => {
    const connection = await import('../server/db/connection.js');
    db = connection.getDatabase();

    // Mock initial data
    db.exec(`
      INSERT INTO classes (id, name, grade) VALUES ('c1', '3A1', 3);
      INSERT INTO lessons (id, title, grade, subject) VALUES ('l1', 'An Toàn Mạng', 4, 'Tin Học');
    `);
  });

  after(() => {
    if (db) db.close();
    try {
      if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB);
      if (fs.existsSync(TMP_ROOT)) fs.rmdirSync(TMP_ROOT);
    } catch(e) {}
  });

  test('AI config: Should handle disabled state correctly', async () => {
    // Override env
    process.env.GEMINI_ENABLED = 'false';
    const { getAiStatus } = await import('../server/ai/geminiService.js');
    
    const status = getAiStatus();
    assert.strictEqual(status.enabled, false);
  });

  test('AI config: Should recognize configured state when API key is provided', async () => {
    process.env.GEMINI_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'fake_key';
    const { getAiStatus } = await import('../server/ai/geminiService.js');
    
    const status = getAiStatus();
    assert.strictEqual(status.enabled, true);
    assert.strictEqual(status.configured, true);
  });

  test('AI Service: analyzeLessonService validates lesson existence', async () => {
    const { analyzeLessonService } = await import('../server/ai/geminiService.js');
    
    await assert.rejects(
      analyzeLessonService({ lessonId: 'not_found', clientIp: '127.0.0.1' }),
      /Không tìm thấy bài học/
    );
  });

  test('AI Service: generateQuestionsService validates lesson existence', async () => {
    const { generateQuestionsService } = await import('../server/ai/geminiService.js');
    
    await assert.rejects(
      generateQuestionsService({ lessonId: 'not_found', count: 5, clientIp: '127.0.0.1' }),
      /Không tìm thấy bài học/
    );
  });
  
  test('AI Route: Should reject POST without lessonId for analyze-lesson', async () => {
    const { handleAiApiRequest } = await import('../server/ai/aiHandler.js');
    
    // Mock req and res
    const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(data) { this.data = data; }
    };
    const parseJsonBody = async () => ({});
    
    const handled = await handleAiApiRequest(req, res, '/api/ai/analyze-lesson', 'POST', parseJsonBody);
    assert.strictEqual(handled, true);
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.data);
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Thiếu lessonId/);
  });
});
