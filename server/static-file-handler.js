import fs from 'node:fs';
import path from 'node:path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.pdf': 'application/pdf',
  '.json': 'application/json'
};

export function handleUploadsRequest(req, res) {
  if (!req.url || !req.url.startsWith('/uploads/')) {
    return false;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const decodedPath = decodeURIComponent(url.pathname);
    // Chuẩn hóa và loại bỏ path traversal
    const relativePath = decodedPath.replace(/^\/uploads\/?/, '');
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(UPLOADS_DIR, safePath);

    // Kiểm tra an toàn: đường dẫn phải nằm trong UPLOADS_DIR
    if (!fullPath.startsWith(UPLOADS_DIR)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Forbidden: Truy cập ngoài thư mục uploads bị từ chối');
      return true;
    }

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Not Found: Tệp tin không tồn tại');
      return true;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Thêm Cache-Control hợp lý
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(fullPath).pipe(res);
    return true;
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`Internal Server Error: ${err.message}`);
    return true;
  }
}
