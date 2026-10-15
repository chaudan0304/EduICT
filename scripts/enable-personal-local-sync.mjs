// Explicit one-machine migration, selected by the teacher: web is authoritative.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';

if (!process.argv.includes('--web-is-primary') || !process.argv.includes('--desktop-closed')) throw new Error('Cần xác nhận --web-is-primary --desktop-closed. Đóng cả web server và desktop trước khi chạy.');
const root = process.cwd();
if (!process.env.APPDATA || !fs.existsSync(path.join(root, 'desktop/config/desktopConfig.cjs'))) throw new Error('Chạy từ gốc EduICT trên máy Windows cá nhân.');
const envPath = path.join(root, '.env'); const originalEnv = fs.readFileSync(envPath, 'utf8');
const value = key => originalEnv.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const sourcePath = path.resolve(value('EDUICT_DB_PATH') || path.join(value('EDUICT_DATA_DIR') || root, 'edumaster.sqlite'));
const targetDir = path.resolve(process.env.APPDATA, 'EduMaster', 'data');
const targetPath = path.join(targetDir, 'edumaster.sqlite');
if (sourcePath.toLowerCase() === targetPath.toLowerCase()) throw new Error('Máy đã dùng chung dữ liệu. Không chuyển lại hoặc ghi đè.');
if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) throw new Error('Thiếu cơ sở dữ liệu nguồn hoặc đích. Dừng để tránh tạo nhầm dữ liệu trống.');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const archive = path.join(process.env.APPDATA, 'EduMaster', 'migration-backups', `personal-sync-apply-${stamp}`);
fs.mkdirSync(archive, { recursive: true });
const targetEnv = path.join(targetDir, 'settings', '.env');
fs.copyFileSync(envPath, path.join(archive, 'web.env.private'));
if (fs.existsSync(targetEnv)) fs.copyFileSync(targetEnv, path.join(archive, 'desktop.env.private'));
function inspect(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = Object.values(db.prepare('PRAGMA integrity_check').get())[0];
    if (integrity !== 'ok') throw new Error('CSDL không toàn vẹn; không áp dụng.');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const counts = Object.fromEntries(tables.map(({ name }) => [name, db.prepare(`SELECT COUNT(*) n FROM "${name.replaceAll('"','""')}"`).get().n]));
    return { integrity, counts, stars: db.prepare('SELECT COALESCE(SUM(stars),0) n FROM students').get().n };
  } finally { db.close(); }
}
for (const [label, file] of [['web', sourcePath], ['desktop', targetPath]]) {
  // Allow SQLite to recover/checkpoint WAL after the local server has stopped.
  // No application schema or records are changed by this connection.
  const source = new DatabaseSync(file, { timeout: 5000 });
  try { await backup(source, path.join(archive, `${label}.sqlite`)); } finally { source.close(); }
  inspect(path.join(archive, `${label}.sqlite`));
}
const sourceSummary = inspect(path.join(archive, 'web.sqlite'));
const targetUploads = path.join(targetDir, 'uploads');
const originalUploads = path.join(archive, 'desktop-uploads');
if (fs.existsSync(targetUploads)) fs.cpSync(targetUploads, originalUploads, { recursive: true, errorOnExist: true, force: false });
const oldDatabase = path.join(archive, 'desktop-original.sqlite');
let replaced = false;
try {
  const checkpoint = new DatabaseSync(targetPath, { timeout: 1000 });
  try { if (checkpoint.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get().busy) throw new Error('Desktop còn dùng dữ liệu; hãy đóng rồi chạy lại.'); } finally { checkpoint.close(); }
  // Both targets are explicit, resolved paths above; original files remain recoverable.
  fs.renameSync(targetPath, oldDatabase);
  replaced = true;
  for (const suffix of ['-wal', '-shm']) if (fs.existsSync(targetPath + suffix)) fs.renameSync(targetPath + suffix, oldDatabase + suffix);
  fs.copyFileSync(path.join(archive, 'web.sqlite'), targetPath, fs.constants.COPYFILE_EXCL);
  const sourceUploads = path.join(value('EDUICT_DATA_DIR') || root, 'uploads');
  if (fs.existsSync(sourceUploads)) fs.cpSync(sourceUploads, targetUploads, { recursive: true, force: true });
  const result = inspect(targetPath);
  if (JSON.stringify(result) !== JSON.stringify(sourceSummary)) throw new Error('Đích khác bản nguồn đã sao lưu.');
  const controlled = new Set(['EDUICT_DB_PATH','EDUICT_DATA_DIR','EDUICT_APP_ROOT','EDUICT_RUNTIME','EDUICT_HOST','EDUICT_API_BASE_URL','EDUICT_SHARED_LOCAL_DATA','PORT']);
  const settings = originalEnv.split(/\r?\n/).filter(line => !controlled.has(line.trim().split('=')[0].trim())).join('\n');
  fs.mkdirSync(path.dirname(targetEnv), { recursive: true });
  fs.writeFileSync(targetEnv, settings, { mode: 0o600 });
  const kept = originalEnv.split(/\r?\n/).filter(line => !['EDUICT_DB_PATH','EDUICT_DATA_DIR','EDUICT_SHARED_LOCAL_DATA'].includes(line.trim().split('=')[0].trim()));
  fs.writeFileSync(envPath, [...kept, `EDUICT_DB_PATH=${targetPath.replaceAll('\\','/')}`, `EDUICT_DATA_DIR=${targetDir.replaceAll('\\','/')}`, 'EDUICT_SHARED_LOCAL_DATA=1', ''].join('\n'));
  fs.writeFileSync(path.join(archive, 'manifest.json'), JSON.stringify({ mode: 'web-primary', appliedAt: new Date().toISOString(), sourcePath, targetPath, ...result }, null, 2));
  console.log(JSON.stringify({ archive, targetPath, ...result }, null, 2));
} catch (error) {
  if (replaced) {
    fs.copyFileSync(path.join(archive, 'desktop.sqlite'), targetPath);
    if (fs.existsSync(originalUploads)) fs.cpSync(originalUploads, targetUploads, { recursive: true, force: true });
  }
  fs.writeFileSync(envPath, originalEnv);
  if (fs.existsSync(path.join(archive, 'desktop.env.private'))) fs.copyFileSync(path.join(archive, 'desktop.env.private'), targetEnv);
  throw error;
}
