import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from './server/api-handler.js';
import { handleUploadsRequest } from './server/static-file-handler.js';
import { getDatabase } from './server/db.js';

const PORT = process.env.PORT || 5173;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

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
      if (handled) return;
    } catch (err) {
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

server.listen(PORT, () => {
  console.log(`🚀 EduICT Backend SQLite server running at http://localhost:${PORT}`);
  console.log(`📁 SQLite Database File: ${path.resolve(process.cwd(), 'edumaster.sqlite')}`);
});
