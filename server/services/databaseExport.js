import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DATABASE_EXPORT_FORMAT = 'eduict-full-database';
export const FULL_SQL_HEADER = '-- EduICT Full Database v1\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n';
export const FULL_SQL_FOOTER = '\nCOMMIT;\nPRAGMA foreign_keys=ON;\n';
export const quoteIdentifier = value => `"${String(value).replaceAll('"', '""')}"`;
const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };

function encodeValue(value) {
  if (typeof value === 'bigint') return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : { sqliteType: 'integer', value: String(value) };
  if (value instanceof Uint8Array) return { sqliteType: 'blob', value: Buffer.from(value).toString('hex') };
  if (typeof value === 'number' && !Number.isFinite(value)) return { sqliteType: 'real', value: value > 0 ? 'Infinity' : '-Infinity' };
  return value;
}

export function sqlValue(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : (value > 0 ? '9e999' : '-9e999');
  if (typeof value === 'string') return value.includes('\0') ? `CAST(X'${Buffer.from(value).toString('hex')}' AS TEXT)` : `'${value.replaceAll("'", "''")}'`;
  if (value?.sqliteType === 'integer' && typeof value.value === 'string' && /^-?\d{1,19}$/.test(value.value)) return value.value;
  if (value?.sqliteType === 'real' && ['Infinity', '-Infinity'].includes(value.value)) return value.value === 'Infinity' ? '9e999' : '-9e999';
  if (value?.sqliteType === 'blob' && typeof value.value === 'string' && /^(?:[a-f0-9]{2})*$/i.test(value.value)) return `X'${value.value}'`;
  fail('Giá trị dữ liệu trong bản sao lưu không hợp lệ.');
}

export function readDatabaseSnapshot(db) {
  db.exec('BEGIN;');
  try {
    const objects = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*' ORDER BY type, name").all();
    const tables = objects.filter(item => item.type === 'table').map(item => {
      const name = item.name;
      if (/^CREATE\s+VIRTUAL\s+TABLE/i.test(item.sql)) fail('Cơ sở dữ liệu có bảng virtual. Hãy dùng bản xuất SQLite để giữ đầy đủ dữ liệu.');
      const columns = db.prepare(`PRAGMA table_xinfo(${quoteIdentifier(name)})`).all().filter(column => column.hidden === 0).map(column => column.name);
      const query = db.prepare(`SELECT ${columns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(name)}`);
      query.setReadBigInts(true);
      const rows = Array.from(query.iterate(), row => columns.map(column => encodeValue(row[column])));
      return { name, columns, rows };
    });
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'").get()) {
      const query = db.prepare('SELECT name, seq FROM sqlite_sequence'); query.setReadBigInts(true);
      tables.push({ name: 'sqlite_sequence', columns: ['name', 'seq'], rows: Array.from(query.iterate(), row => [row.name, encodeValue(row.seq)]) });
    }
    const snapshot = { format: DATABASE_EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), objects, tables, userVersion: db.prepare('PRAGMA user_version').get().user_version, applicationId: db.prepare('PRAGMA application_id').get().application_id };
    db.exec('COMMIT;');
    return snapshot;
  } catch (err) { db.exec('ROLLBACK;'); throw err; }
}

export function renderSnapshotBody(snapshot) {
  if (snapshot?.format !== DATABASE_EXPORT_FORMAT || snapshot.version !== 1 || !Array.isArray(snapshot.objects) || !Array.isArray(snapshot.tables)) fail('Định dạng bản sao lưu toàn bộ không hợp lệ.');
  const names = new Set();
  for (const object of snapshot.objects) {
    if (!['table', 'index', 'view', 'trigger'].includes(object?.type) || typeof object.name !== 'string' || !object.name || names.has(object.name) || typeof object.sql !== 'string' || !object.sql.trim()) fail('Schema trong bản sao lưu không hợp lệ.');
    names.add(object.name);
  }
  const lines = ['-- Snapshot exported at UTC ' + String(snapshot.exportedAt || '').replace(/[\r\n]/g, ' ')];
  for (const type of ['trigger', 'view', 'index', 'table']) for (const object of snapshot.objects.filter(item => item.type === type)) lines.push(`DROP ${type.toUpperCase()} IF EXISTS ${quoteIdentifier(object.name)};`);
  for (const object of snapshot.objects.filter(item => item.type === 'table')) lines.push(`${object.sql};`);
  const tableNames = new Set();
  for (const table of snapshot.tables) {
    if (!table || tableNames.has(table.name) || (table.name !== 'sqlite_sequence' && !snapshot.objects.some(item => item.type === 'table' && item.name === table.name)) || !Array.isArray(table.columns) || !table.columns.length || table.columns.some(column => typeof column !== 'string' || !column) || new Set(table.columns).size !== table.columns.length || !Array.isArray(table.rows)) fail('Bảng dữ liệu trong bản sao lưu không hợp lệ.');
    tableNames.add(table.name);
    if (table.name === 'sqlite_sequence') lines.push('DELETE FROM sqlite_sequence;');
    const prefix = `INSERT INTO ${quoteIdentifier(table.name)} (${table.columns.map(quoteIdentifier).join(', ')}) VALUES `;
    for (const row of table.rows) {
      if (!Array.isArray(row) || row.length !== table.columns.length) fail('Dòng dữ liệu trong bản sao lưu không hợp lệ.');
      lines.push(`${prefix}(${row.map(sqlValue).join(', ')});`);
    }
  }
  if (snapshot.objects.some(item => item.type === 'table' && !tableNames.has(item.name))) fail('Bản sao lưu thiếu dữ liệu của một bảng.');
  for (const object of snapshot.objects.filter(item => item.type !== 'table')) lines.push(`${object.sql};`);
  for (const [pragma, value] of [['user_version', snapshot.userVersion], ['application_id', snapshot.applicationId]]) {
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) fail('Thông tin phiên bản SQLite không hợp lệ.');
    lines.push(`PRAGMA ${pragma}=${value};`);
  }
  return lines.join('\n');
}

export function renderSnapshotSql(snapshot) {
  const sql = FULL_SQL_HEADER + renderSnapshotBody(snapshot) + FULL_SQL_FOOTER;
  if (Buffer.byteLength(sql) > 50 * 1024 * 1024) throw Object.assign(new Error('Bản SQL vượt 50 MB. Hãy tải bản SQLite để giữ toàn bộ dữ liệu.'), { statusCode: 413 });
  return sql;
}

export function createSqliteDownload(db) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-db-export-'));
  const file = path.join(dir, 'edumaster.sqlite');
  const cleanup = () => {
    try { fs.unlinkSync(file); } catch (err) { if (err.code !== 'ENOENT') console.warn('[DB export] Cannot clean temporary snapshot'); }
    try { fs.rmdirSync(dir); } catch (err) { if (err.code !== 'ENOENT') console.warn('[DB export] Cannot clean temporary directory'); }
  };
  try { db.exec(`VACUUM INTO ${sqlValue(file)};`); return { file, cleanup }; }
  catch (err) { cleanup(); throw err; }
}
