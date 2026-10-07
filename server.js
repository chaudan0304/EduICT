import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from './server/api-handler.js';
import { handleUploadsRequest } from './server/static-file-handler.js';
import { getDatabase, getDatabasePath } from './server/db.js';
import { closeConnection } from './server/db/connection.js';
import * as pathService from './server/services/pathService.js';

const PORT = process.env.PORT || 5173;
const DIST_DIR = pathService.getDistDir();

// Khởi tạo Database SQLite
getDatabase();

const server = http.createServer(async (req, res) => {
  // Xử lý static files uploads
  if (req.url && req.url.startsWith('/uploads/')) {
    const handled = handleUploadsRequest(req, res);
    if (handled) return;
  }

  // Xử lý API routes
  if (req.url && req.url.startsWith('/api/')) {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled || res.headersSent || res.writableEnded) return;
    } catch (err) {
      if (res.headersSent || res.writableEnded) return;
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // Xử lý static files từ thư mục dist (nếu đã build)
  if (fs.existsSync(DIST_DIR)) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let filePath = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html'); // SPA fallback
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<h1>EduICT Server Đang Chạy! Hãy mở giao diện web.</h1>');
});

// Mặc định chỉ mở cục bộ (an toàn cho app desktop). Đặt EDUICT_HOST=0.0.0.0 để mở ra LAN khi cần.
const HOST = process.env.EDUICT_HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`🚀 EduICT Backend SQLite server running at http://${HOST}:${PORT}`);
  console.log(`📁 SQLite Database File: ${getDatabasePath()}`);
});

// Tắt êm: đóng HTTP server + SQLite khi nhận tín hiệu (Desktop shell/supervisor có thể gửi SIGTERM).
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] Nhận ${signal}, đang tắt...`);
  server.close(() => {
    try { closeConnection(); } catch { /* đã đóng */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// Khi chạy dưới Desktop shell (child process có kênh IPC): trên Windows SIGTERM = kill cưỡng bức,
// nên shell gửi {type:'shutdown'} để tắt êm; mất kênh IPC (shell chết) → tự thoát, không để lại process mồ côi.
if (typeof process.send === 'function') {
  process.on('message', (msg) => {
    if (msg && msg.type === 'shutdown') shutdown('IPC');
  });
  process.on('disconnect', () => shutdown('IPC-disconnect'));
}
