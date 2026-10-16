import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip } from 'node:zlib';
import { getBackupDir, ensureDir } from './pathService.js';
import { getBackupLocation, verifyBackup, withBackupOperation } from './backupService.js';

// Portable v1 package: gzip of MAGIC, followed by [u32 header length,
// UTF-8 JSON {path,size}, raw file bytes] records, ending with u32 zero.
// No executable extraction tool, user config, symlinks or outside paths.
const MAGIC = Buffer.from('EDUICT-BACKUP/1\n');
const MAX_TOTAL = 4 * 1024 ** 3;
const MAX_FILE = 1024 ** 3;
const MAX_FILES = 100000;
const invalid = () => new Error('Gói sao lưu không hợp lệ, bị thiếu dữ liệu hoặc vượt giới hạn 4 GB.');

function safeMember(name) {
  if (typeof name !== 'string' || name.length > 512 || /[\\:]/.test(name) || [...name].some(c => c.charCodeAt(0) < 32)) throw invalid();
  if (name !== 'manifest.json' && name !== 'database.sqlite' && !name.startsWith('files/')) throw invalid();
  const parts = name.split('/');
  if (parts.length > 32 || parts.some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p))) throw invalid();
  return name;
}

async function* records(root) {
  yield MAGIC;
  let total = 0;
  let count = 0;
  async function* walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw invalid();
      const name = prefix + entry.name;
      if (!prefix && !['manifest.json', 'database.sqlite', 'files'].includes(name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) yield* walk(file, name + '/');
      else {
        safeMember(name);
        const size = fs.statSync(file).size;
        total += size;
        if (++count > MAX_FILES || size > MAX_FILE || total > MAX_TOTAL) throw invalid();
        const header = Buffer.from(JSON.stringify({ path: name, size }));
        const length = Buffer.alloc(4); length.writeUInt32BE(header.length);
        yield length; yield header;
        yield* fs.createReadStream(file);
      }
    }
  }
  yield* walk(root);
  yield Buffer.alloc(4);
}

export async function downloadBackupPackage(backupId, response) {
  return withBackupOperation(async () => {
    const verified = await verifyBackup(backupId);
    if (!verified.manifest.uploadsComplete) throw new Error('Hãy tạo bản sao lưu mới có đầy đủ tài nguyên trước khi tải gói.');
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${backupId}.eduict"`);
    response.setHeader('Cache-Control', 'no-store');
    await pipeline(Readable.from(records(getBackupLocation(backupId))), createGzip(), response);
  });
}

class PackageReader {
  constructor(stream) { this.iterator = stream[Symbol.asyncIterator](); this.chunk = Buffer.alloc(0); this.offset = 0; this.total = 0; }
  async take(size) {
    if (this.offset === this.chunk.length) {
      const next = await this.iterator.next();
      if (next.done) throw invalid();
      this.chunk = next.value; this.offset = 0;
      this.total += this.chunk.length;
      if (this.total > MAX_TOTAL + MAX_FILES * 8196) throw invalid();
    }
    const bytes = this.chunk.subarray(this.offset, this.offset + Math.min(size, this.chunk.length - this.offset));
    this.offset += bytes.length;
    return bytes;
  }
  async read(size) {
    const parts = []; let left = size;
    while (left > 0) { const part = await this.take(left); parts.push(part); left -= part.length; }
    return Buffer.concat(parts, size);
  }
  async end() {
    if (this.offset !== this.chunk.length || !(await this.iterator.next()).done) throw invalid();
  }
}

export async function importBackupPackage(input) {
  return withBackupOperation(async () => {
    const root = fs.realpathSync(ensureDir(getBackupDir()));
    const id = `EduMaster-Backup-import-${Date.now()}-${randomUUID()}`;
    const temporary = path.join(root, `${id}.tmp`);
    fs.mkdirSync(temporary);
    const unzip = createGunzip();
    let pipeError;
    const transfer = pipeline(input, unzip).catch(error => { pipeError = error; });
    try {
      const reader = new PackageReader(unzip);
      if (!(await reader.read(MAGIC.length)).equals(MAGIC)) throw invalid();
      const seen = new Set(); let total = 0;
      for (;;) {
        const headerLength = (await reader.read(4)).readUInt32BE();
        if (!headerLength) break;
        if (headerLength > 8192 || seen.size >= MAX_FILES) throw invalid();
        const header = JSON.parse((await reader.read(headerLength)).toString('utf8'));
        const name = safeMember(header.path);
        const key = name.toLowerCase();
        if (seen.has(key) || !Number.isSafeInteger(header.size) || header.size < 0 || header.size > MAX_FILE) throw invalid();
        total += header.size;
        if (total > MAX_TOTAL) throw invalid();
        seen.add(key);
        const target = path.resolve(temporary, name);
        if (!target.startsWith(temporary + path.sep)) throw invalid();
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const file = await fs.promises.open(target, 'wx');
        try {
          let left = header.size;
          while (left > 0) { const bytes = await reader.take(left); await file.writeFile(bytes); left -= bytes.length; }
        } finally { await file.close(); }
      }
      await reader.end(); await transfer;
      if (pipeError || !seen.has('manifest.json') || !seen.has('database.sqlite')) throw invalid();
      const manifestPath = path.join(temporary, 'manifest.json');
      if (fs.statSync(manifestPath).size > 16 * 1024 ** 2) throw invalid();
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.uploadsComplete !== true) throw new Error('Gói cần được tạo từ bản sao lưu đầy đủ có tài nguyên.');
      if (!Number.isFinite(Date.parse(manifest.createdAt))) throw invalid();
      const expected = new Set(['manifest.json', 'database.sqlite', ...Object.keys(manifest.filesChecksums || {}).map(p => 'files/' + p)]);
      if (expected.size !== seen.size || [...expected].some(p => !seen.has(p.toLowerCase()))) throw invalid();
      Object.assign(manifest, { backupId: id, kind: 'imported', importedAt: new Date().toISOString(), sizeBytes: total });
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      const finalDir = getBackupLocation(id);
      fs.renameSync(temporary, finalDir);
      try { await verifyBackup(id); }
      catch (error) { fs.rmSync(finalDir, { recursive: true, force: true }); throw error; }
      return { success: true, backupId: id, manifest };
    } finally {
      unzip.destroy(); await transfer;
      if (fs.existsSync(temporary)) fs.rmSync(temporary, { recursive: true, force: true });
    }
  });
}
