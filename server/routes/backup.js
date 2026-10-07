import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { sendJson, parseJsonBody } from './helpers.js';
import {
  generateSqlScriptDump,
  executeSqlDump,
  getDatabase,
  validateSqlDump
} from '../db.js';
import { DATABASE_EXPORT_FORMAT, readDatabaseSnapshot, renderSnapshotSql, createSqliteDownload } from '../services/databaseExport.js';
import { legacyJsonSnapshot } from '../services/legacyJsonBackup.js';
import {
  listBackups,
  createBackup,
  deleteBackup,
  verifyBackup,
  restoreBackup
} from '../services/backupService.js';

export async function tryHandleBackup(req, res, ctx) {
  const { pathname, method } = ctx;

  if (pathname === '/api/backup/export-json' && method === 'GET') {
    try {
      const json = JSON.stringify(readDatabaseSnapshot(getDatabase()));
      if (Buffer.byteLength(json) > 50 * 1024 * 1024) throw Object.assign(new Error('Bản JSON vượt 50 MB. Hãy tải SQLite để giữ toàn bộ dữ liệu.'), { statusCode: 413 });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="EduICT_ToanBo.json"');
      res.setHeader('Cache-Control', 'no-store');
      res.end(json);
    } catch (err) { sendJson(res, err.statusCode || 500, { success: false, error: err.message }); }
    return true;
  }

  if (pathname === '/api/backup/import-json' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, { maxBytes: 60 * 1024 * 1024 });
      const full = body?.format === DATABASE_EXPORT_FORMAT;
      const snapshot = full ? body : legacyJsonSnapshot(getDatabase(), body);
      const sql = renderSnapshotSql(snapshot);
      validateSqlDump(sql);
      const safety = await createBackup();
      // Legacy merge must include writes that completed while the safety backup
      // was being copied. Full backups intentionally replace the saved state.
      executeSqlDump(full ? sql : renderSnapshotSql(legacyJsonSnapshot(getDatabase(), body)));
      sendJson(res, 200, { success: true, count: snapshot.tables.find(table => table.name === 'classes')?.rows.length || 0, safetyBackupId: safety.backupId, full });
    } catch (err) { sendJson(res, err.statusCode || 400, { success: false, error: err.message }); }
    return true;
  }

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
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', `attachment; filename="edumaster_dump_${new Date().toISOString().slice(0, 10)}.sql"`);
      res.end(sqlDump);
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.message });
    }
    return true;
  }

  if (pathname === '/api/sql/download-db' && method === 'GET') {
    let snapshot;
    try {
      snapshot = createSqliteDownload(getDatabase());
      const stat = fs.statSync(snapshot.file);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', 'attachment; filename="edumaster.sqlite"');
      res.setHeader('Cache-Control', 'no-store');
      await pipeline(fs.createReadStream(snapshot.file), res);
    } catch (err) {
      if (!res.headersSent && !res.destroyed) sendJson(res, err.statusCode || 500, { error: err.message });
    } finally { snapshot?.cleanup(); }
    return true;
  }

  if (pathname === '/api/sql/import-script' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, { maxBytes: 60 * 1024 * 1024 });
      const sql = typeof body === 'string' ? body : body.sql;
      if (!sql) {
        sendJson(res, 400, { error: 'Thiếu nội dung SQL' });
        return true;
      }
      validateSqlDump(sql);
      const safety = await createBackup();
      executeSqlDump(sql);
      sendJson(res, 200, { success: true, safetyBackupId: safety.backupId, message: 'Đã phục hồi SQL vào cơ sở dữ liệu' });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.message });
    }
    return true;
  }

  return false;
}
