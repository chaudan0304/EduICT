import fs from 'node:fs';
import path from 'node:path';
import { sendJson, parseJsonBody } from './helpers.js';
import {
  generateSqlScriptDump,
  executeSqlDump,
  getDatabasePath
} from '../db.js';

export async function tryHandleBackup(req, res, ctx) {
  const { pathname, method } = ctx;

  // 8. Xuất file kịch bản SQL dạng văn bản (.sql script)
  if (pathname === '/api/sql/export-script' && method === 'GET') {
    try {
      const sqlDump = generateSqlScriptDump();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="edumaster_dump_${new Date().toISOString().slice(0, 10)}.sql"`);
      res.end(sqlDump);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 8. Tải trực tiếp file cơ sở dữ liệu SQLite binary (.sqlite)
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
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // 9. Thực thi kịch bản SQL từ client
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
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  return false;
}
