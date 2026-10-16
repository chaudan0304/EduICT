import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function checksum(file) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function referencedTemporaryFolders(database) {
  const referenced = new Set();
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  for (const { name } of tables) {
    for (const row of database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).iterate()) {
      for (const value of Object.values(row)) {
        if (typeof value !== 'string') continue;
        const normalized = value.replaceAll('\\/', '/').replaceAll('\\', '/').replace(/\/{2,}/g, '/');
        for (const match of normalized.matchAll(/(?:^|\/)uploads\/(temp|cache)\/([^/"'<>\r\n]+)/gi)) {
          let folder;
          try { folder = decodeURIComponent(match[2]); } catch { continue; }
          if (folder && !/[\\/]/.test(folder) && folder !== '.' && folder !== '..') {
            // Preserve both filesystem names with #/? and URL query/fragment forms.
            for (const candidate of [folder, folder.split(/[?#]/)[0]]) referenced.add(`${match[1]}/${candidate}`.toLowerCase());
          }
        }
        if (/^tmp_[A-Za-z0-9_-]{1,100}$/i.test(value)) referenced.add(`temp/${value}`.toLowerCase());
      }
    }
  }
  return referenced;
}

function treeBytes(file) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) return 0;
  if (!stat.isDirectory()) return stat.size;
  return fs.readdirSync(file).reduce((sum, name) => sum + treeBytes(path.join(file, name)), 0);
}

// Only immutable snapshot files are linked to each other, never a live upload.
// Every snapshot retains a complete directory tree: unlinking another snapshot
// cannot remove its contents. Export and restore still use ordinary files.
export async function copyBackupAssets({ uploadsDir, destination, database, previous = [] }) {
  const result = { filesChecksums: {}, logicalBytes: 0, copiedBytes: 0, reusedBytes: 0, excludedBytes: 0 };
  if (!fs.existsSync(uploadsDir)) return result;
  const liveRoot = fs.realpathSync(uploadsDir);
  const referenced = referencedTemporaryFolders(database);
  const candidates = new Map();
  for (const backup of previous) {
    if (!fs.existsSync(backup.filesDir) || fs.lstatSync(backup.filesDir).isSymbolicLink()) continue;
    const root = fs.realpathSync(backup.filesDir);
    for (const [relative, hash] of Object.entries(backup.filesChecksums || {})) {
      if (!/^[a-f0-9]{64}$/.test(hash) || relative.includes('\\')) continue;
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || file.startsWith(liveRoot + path.sep)) continue;
      if (!candidates.has(hash)) candidates.set(hash, { file, root });
    }
  }
  const checked = new Map();
  async function copy(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      const source = path.join(directory, entry.name);
      const parts = relative.split('/');
      if (['temp', 'cache'].includes(parts[0].toLowerCase()) && parts.length >= 2 && !referenced.has(parts.slice(0, 2).join('/').toLowerCase())) {
        result.excludedBytes += treeBytes(source); continue;
      }
      if (entry.isSymbolicLink()) throw new Error('Không sao lưu liên kết tệp ngoài kho dữ liệu.');
      if (entry.isDirectory()) { await copy(source, relative + '/'); continue; }
      if (!entry.isFile()) throw new Error('Không sao lưu tệp đặc biệt.');
      const hash = await checksum(source);
      const target = path.join(destination, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const candidate = candidates.get(hash);
      let linked = false;
      if (candidate) {
        try {
          if (!fs.realpathSync(candidate.file).startsWith(candidate.root + path.sep)) throw new Error('Outside snapshot');
          if (!checked.has(candidate.file)) checked.set(candidate.file, await checksum(candidate.file));
          if (checked.get(candidate.file) === hash) { fs.linkSync(candidate.file, target); linked = true; }
        } catch { /* Unsupported filesystem, removed or corrupt snapshot: copy instead. */ }
      }
      if (!linked) {
        fs.copyFileSync(source, target);
        if (await checksum(target) !== hash) throw new Error('Tài nguyên đang thay đổi. Hãy thử sao lưu lại sau khi lưu bài xong.');
      }
      const size = fs.statSync(target).size;
      result.filesChecksums[relative] = hash;
      result.logicalBytes += size;
      if (linked) result.reusedBytes += size;
      else result.copiedBytes += size;
      candidates.set(hash, { file: target, root: path.resolve(destination) });
      checked.set(target, hash);
    }
  }
  await copy(uploadsDir);
  return result;
}
