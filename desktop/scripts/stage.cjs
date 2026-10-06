'use strict';
// stage — dựng thư mục ứng dụng SẠCH để electron-builder đóng gói (Phase 12).
//
//   desktop/.stage/app/
//     package.json        (name/productName/version/main/type + CHỈ dependencies chạy thật của backend)
//     server.js, server/  (backend hiện tại, không có seed/dev plugin)
//     dist/               (React build — phải chạy `npm run build` trước)
//     desktop/{main,preload,native,config,migration}
//     node_modules/       (production deps — cài bằng npm, không kéo Vite/React/test)
//
// KHÔNG đưa vào: .env*, *.sqlite, uploads/, backups/, settings/, tests/, docs/, .git, scratch/, desktop/smoke.
// Phiên bản: MỘT nguồn duy nhất = package.json gốc (EDUMASTER_BUILD_VERSION chỉ dùng cho smoke test nâng cấp).
// Sau khi dựng: quét secret; có finding → FAIL (không đóng gói).

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scanDirectory, loadRealSecretLiterals } = require('./secretScan.cjs');

const REPO = path.resolve(__dirname, '..', '..');
const STAGE = path.join(REPO, 'desktop', '.stage', 'app');

const SERVER_EXCLUDE = new Set(['seedFakeData.js', 'vite-sqlite-plugin.js']);
const DESKTOP_DIRS = ['main', 'preload', 'native', 'config', 'migration'];
const ALWAYS_EXCLUDE_NAMES = new Set(['.env', '.git', 'node_modules', 'uploads', 'backups', 'settings', 'locks', 'scratch', 'tests', 'docs']);

function copyTree(src, dst, { excludeFile = () => false } = {}) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (ALWAYS_EXCLUDE_NAMES.has(e.name) || /^\.env/.test(e.name)) continue;
    if (/\.(sqlite|sqlite3|db)(-wal|-shm)?$/i.test(e.name) || /\.map$/i.test(e.name)) continue;
    if (excludeFile(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyTree(s, d, { excludeFile });
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}

function main() {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const version = process.env.EDUMASTER_BUILD_VERSION || rootPkg.version;
  if (!/^\d+\.\d+\.\d+([-.][0-9A-Za-z.]+)?$/.test(version)) throw new Error(`Phiên bản không hợp lệ: ${version}`);

  const dist = path.join(REPO, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Thiếu dist/ — chạy `npm run build` trước.');

  fs.rmSync(path.join(REPO, 'desktop', '.stage'), { recursive: true, force: true });
  fs.mkdirSync(STAGE, { recursive: true });

  copyTree(dist, path.join(STAGE, 'dist'));
  copyTree(path.join(REPO, 'shared'), path.join(STAGE, 'shared'));
  fs.copyFileSync(path.join(REPO, 'server.js'), path.join(STAGE, 'server.js'));
  copyTree(path.join(REPO, 'server'), path.join(STAGE, 'server'), { excludeFile: (n) => SERVER_EXCLUDE.has(n) });
  for (const d of DESKTOP_DIRS) copyTree(path.join(REPO, 'desktop', d), path.join(STAGE, 'desktop', d));

  // Chỉ những dependency backend thực sự import (React/Vite/xlsx... đã nằm trong dist).
  const runtimeDeps = {};
  for (const name of ['@google/genai']) {
    if (!rootPkg.dependencies[name]) throw new Error(`Thiếu dependency ${name} trong package.json gốc`);
    runtimeDeps[name] = rootPkg.dependencies[name];
  }
  fs.writeFileSync(
    path.join(STAGE, 'package.json'),
    JSON.stringify(
      {
        name: 'edumaster',
        productName: 'EduMaster',
        version,
        description: 'EduMaster — Trợ giảng số môn Tin học Tiểu học (Windows Desktop)',
        author: 'EduICT',
        license: 'UNLICENSED',
        private: true,
        type: 'module', // server.js là ESM; các tệp desktop dùng .cjs nên không bị ảnh hưởng
        main: 'desktop/main/main.cjs',
        dependencies: runtimeDeps,
      },
      null,
      2,
    ),
  );

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const install = spawnSync(npm, ['install', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false'], {
    cwd: STAGE,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (install.status !== 0) throw new Error('npm install (production) thất bại trong thư mục stage.');

  const { findings, filesScanned } = scanDirectory(STAGE, { literals: loadRealSecretLiterals(REPO) });
  console.log(`[stage] quét secret: ${filesScanned} file, ${findings.length} finding`);
  if (findings.length) {
    for (const f of findings) console.error(`  ✗ ${f.kind}: ${f.file}`);
    throw new Error('Stage chứa secret/dữ liệu người dùng — dừng đóng gói.');
  }
  console.log(`[stage] OK v${version} → ${STAGE}`);
}

try {
  main();
} catch (err) {
  console.error(`[stage] LỖI: ${err.message}`);
  process.exit(1);
}
