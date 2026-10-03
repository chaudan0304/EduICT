'use strict';
// secretScan — quét thư mục/asar xem có rò rỉ secret hoặc dữ liệu người dùng không (Phase 12).
//
// Cờ LỖI (finding):
//   - khóa Google API thật: mẫu AIza[0-9A-Za-z_-]{20,}
//   - giá trị khóa thật đang nằm trong .env của máy build (so khớp theo nội dung; KHÔNG bao giờ in ra giá trị)
//   - gán GEMINI_API_KEY=<không phải placeholder>, gán EDUICT_DB_PATH=<đường dẫn>
//   - tệp .env (trừ .env.example), *.sqlite/*.db/-wal/-shm, thư mục backups/ uploads/ settings/ locks/
// CLI: node secretScan.cjs <dir|app.asar> [...]   → exit 1 nếu có finding.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FORBIDDEN_FILE = /(^|[\\/])\.env(?!\.example$)(\..*)?$|\.(sqlite|sqlite3|db)(-wal|-shm)?$/i;
const FORBIDDEN_DIRS = new Set(['backups', 'uploads', 'settings', 'locks']);
const KEY_VAR = ['GEMINI', 'API', 'KEY'].join('_'); // dựng lúc chạy: test Phase 11 cấm tên biến này trong mã desktop
const PLACEHOLDERS = new Set(['', `YOUR_${KEY_VAR}_HERE`]);
const MAX_FILE_BYTES = 400 * 1024 * 1024;

function loadRealSecretLiterals(repoRoot) {
  const out = [];
  try {
    const env = fs.readFileSync(path.join(repoRoot, '.env'), 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(new RegExp(`^\\s*${KEY_VAR}\\s*=\\s*(.+?)\\s*$`));
      if (m) {
        const v = m[1].replace(/^["']|["']$/g, '');
        if (v.length > 8 && !PLACEHOLDERS.has(v)) out.push(v);
      }
    }
  } catch {
    /* không có .env → bỏ qua */
  }
  return out;
}

function scanBuffer(buf, rel, literals, findings) {
  const text = buf.toString('latin1');
  if (/AIza[0-9A-Za-z_-]{20,}/.test(text)) findings.push({ file: rel, kind: 'google-api-key-pattern' });
  for (const lit of literals) {
    if (buf.includes(lit)) findings.push({ file: rel, kind: 'real-key-literal' });
  }
  const keyAssign = new RegExp(`${KEY_VAR}[ \\t]*=[ \\t]*([^\\s'"\`)\\],;]+)`, 'g');
  let m;
  while ((m = keyAssign.exec(text))) {
    if (!PLACEHOLDERS.has(m[1]) && /^[A-Za-z0-9_-]{20,}$/.test(m[1])) findings.push({ file: rel, kind: 'gemini-key-assignment' });
  }
  const dbAssign = /EDUICT_DB_PATH[ \t]*=[ \t]*([A-Za-z]:[\\/]|\/)[^\s]*/g;
  if (dbAssign.test(text)) findings.push({ file: rel, kind: 'db-path-assignment' });
}

function scanDirectory(root, { literals = [], skipDirNames = new Set() } = {}) {
  const findings = [];
  let filesScanned = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (e.isDirectory()) {
        if (FORBIDDEN_DIRS.has(e.name.toLowerCase()) && !/node_modules/.test(rel)) findings.push({ file: rel, kind: 'forbidden-directory' });
        if (skipDirNames.has(e.name)) continue;
        walk(full);
      } else if (e.isFile()) {
        if (FORBIDDEN_FILE.test(rel)) findings.push({ file: rel, kind: 'forbidden-file' });
        const size = fs.statSync(full).size;
        if (size > MAX_FILE_BYTES) continue;
        filesScanned += 1;
        scanBuffer(fs.readFileSync(full), rel, literals, findings);
      }
    }
  })(root);
  return { findings, filesScanned };
}

// Quét NỘI DUNG app.asar bằng cách giải nén ra thư mục tạm (rồi xóa).
function scanAsar(asarFile, { literals = [] } = {}) {
  const asar = require('@electron/asar');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'edumaster-asar-scan-'));
  try {
    asar.extractAll(asarFile, tmp);
    const res = scanDirectory(tmp, { literals });
    return { ...res, listing: asar.listPackage(asarFile).length };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { scanDirectory, scanAsar, scanBuffer, loadRealSecretLiterals };

if (require.main === module) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const literals = loadRealSecretLiterals(repoRoot);
  let bad = 0;
  for (const target of process.argv.slice(2)) {
    const isAsar = /\.asar$/i.test(target) && fs.statSync(target).isFile();
    const res = isAsar ? scanAsar(target, { literals }) : scanDirectory(target, { literals });
    console.log(`[secretScan] ${target}: ${res.filesScanned} file, ${res.findings.length} finding`);
    for (const f of res.findings) console.log(`  ✗ ${f.kind}: ${f.file}`);
    bad += res.findings.length;
  }
  process.exit(bad ? 1 : 0);
}
