import fs from 'node:fs';
import path from 'node:path';
import { sendJson, parseJsonBody } from './helpers.js';
import {
  generateSqlScriptDump,
  executeSqlDump,
  getDatabasePath
} from '../db.js';
import {
  listBackups,
  createBackup,
  deleteBackup,
  verifyBackup,
  restoreBackup
} from '../services/backupService.js';

export async function tryHandleBackup(req, res, ctx) {
  const { pathname, method } = ctx;

  if (pathname === '/api/backup/list' && method === 'GET') {
    try {
      sendJson(res, 200, { success: true, data: listBackups() });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { success: false, error: err.message });
    }
    return true;
  }

  if (pathname === '/api/backup/create' && method === 'POST') {
    try {
      const result = await createBackup();
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, err.statusCode || 500, { success: false, error: err.message });
    }
    return true;
  }

  if (pathname === '/api/backup/verify' && method === 'POST') {
    try {
      const { backupId } = await parseJsonBody(req);
      if (!backupId) return sendJson(res, 400, { success: false, error: 'Thiếu backupId' });
      const result = await verifyBackup(backupId);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return true;
  }

  if (pathname === '/api/backup/restore' && method === 'POST') {
    try {
      const { backupId } = await parseJsonBody(req);
      if (!backupId) return sendJson(res, 400, { success: false, error: 'Thiếu backupId' });
      const result = await restoreBackup(backupId);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, err.statusCode || 500, { success: false, error: err.message });
    }
    return true;
  }

  if (pathname === '/api/backup/delete' && method === 'POST') {
    try {
      const { backupId } = await parseJsonBody(req);
      if (!backupId) return sendJson(res, 400, { success: false, error: 'Thiếu backupId' });
      const result = deleteBackup(backupId);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, err.statusCode || 500, { success: false, error: err.message });
    }
    return true;
  }

  // --- Hỗ trợ cũ (nếu có frontend dùng tới, giữ tương thích) ---
  if (pathname === '/api/sql/export-script' && method === 'GET') {
    try {
      const sqlDump = generateSqlScriptDump();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="edumaster_dump_${new Date().toISOString().slice(0, 10)}.sql"`);
      res.end(sqlDump);
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.message });
    }
    return true;
  }

  if (pathname === '/api/sql/download-db' && method === 'GET') {
    try {
      const dbPath = getDatabasePath();
      if (!fs.existsSync(dbPath)) {
        sendJson(res, 404, { error: `File SQLite chưa được khởi tạo tại ${dbPath}` });
        return true;
      }
      const stat = fs.statSync(dbPath);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(dbPath)}"`);
      fs.createReadStream(dbPath).pipe(res);
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.message });
    }
    return true;
  }

  if (pathname === '/api/sql/import-script' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const sql = typeof body === 'string' ? body : body.sql;
      if (!sql) {
        sendJson(res, 400, { error: 'Thiếu nội dung SQL' });
        return true;
      }
      executeSqlDump(sql);
      sendJson(res, 200, { success: true, message: 'Đã thực thi thành công kịch bản SQL' });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.message });
    }
    return true;
  }

  return false;
}
