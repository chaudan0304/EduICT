import fs from 'node:fs';
import path from 'node:path';
import { applyCorsHeaders } from '../services/corsConfig.js';
import { getAllClassesWithStudents, getDatabasePath } from '../db.js';
import { handleAiApiRequest } from '../ai/aiHandler.js';
import { sendJson, parseJsonBody } from './helpers.js';
import { tryHandleClasses } from './classes.js';
import { tryHandleSchoolYear } from './schoolYear.js';
import { tryHandleBackup } from './backup.js';
import { tryHandleSessions } from './sessions.js';
import { tryHandleLessonsCollection, tryHandleLessonsCrud } from './lessons.js';
import { tryHandlePptx } from './pptx.js';
import { tryHandleQuiz } from './quiz.js';

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // CORS headers (Part 12: config-driven, mặc định '*' giữ nguyên hành vi WEB)
  applyCorsHeaders(res, req.headers.origin);

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // 1. Kiểm tra trạng thái Backend & File SQLite
  if (pathname === '/api/status' && method === 'GET') {
    const dbPath = getDatabasePath();
    const exists = fs.existsSync(dbPath);
    const size = exists ? fs.statSync(dbPath).size : 0;
    const classes = getAllClassesWithStudents();
    sendJson(res, 200, {
      status: 'ok',
      engine: 'SQLite (Node.js 22 Native)',
      dbFile: path.basename(dbPath),
      dbPath: dbPath,
      fileSizeBytes: size,
      fileSizeKb: Math.round(size / 1024),
      totalClasses: classes.length,
      totalStudents: classes.reduce((acc, c) => acc + (c.students?.length || 0), 0)
    });
    return true;
  }

  // Dispatch to route modules in the EXACT original first-match order.
  const ctx = { pathname, method, url };

  if (await tryHandleClasses(req, res, ctx)) return true;
  if (await tryHandleSchoolYear(req, res, ctx)) return true;
  if (await tryHandleBackup(req, res, ctx)) return true;
  if (await tryHandleSessions(req, res, ctx)) return true;
  if (await tryHandleLessonsCollection(req, res, ctx)) return true;
  if (await tryHandlePptx(req, res, ctx)) return true;
  if (await tryHandleLessonsCrud(req, res, ctx)) return true;
  if (await tryHandleQuiz(req, res, ctx)) return true;

  // ====================================================
  // 14. PHÂN HỆ TRỢ GIẢNG AI (AI TEACHING ASSISTANT)
  // ====================================================
  const aiHandled = await handleAiApiRequest(req, res, pathname, method, parseJsonBody);
  if (aiHandled) {
    return true;
  }

  // Không phải route API
  return false;
}
