import { getDatabase } from './connection.js';
import { FULL_SQL_HEADER, FULL_SQL_FOOTER, readDatabaseSnapshot, renderSnapshotSql } from '../services/databaseExport.js';

// Read every real table/column in one consistent transaction, including score logs.
export function generateSqlScriptDump() {
  return renderSnapshotSql(readDatabaseSnapshot(getDatabase()));
}
// Nhập và chạy file kịch bản SQL
/**
 * validateSqlDump — chốt an toàn cho kịch bản SQL nhập từ client (Part 11).
 *
 * KHÔNG đổi hành vi restore hợp lệ: vẫn cho CREATE/INSERT/UPDATE/DELETE/DROP
 * (bản xuất mới tái tạo schema và mọi bảng trong cùng một giao dịch).
 * CHỈ chặn các lệnh biến "khôi phục dữ liệu" thành "chiếm quyền host":
 * truy cập file/DB khác, nạp extension, ghi file, sửa schema thô.
 */
export function validateSqlDump(sqlString) {
  if (typeof sqlString !== 'string' || !sqlString.trim()) {
    throw new Error('Kịch bản SQL trống hoặc không hợp lệ.');
  }
  if (Buffer.byteLength(sqlString) > 50 * 1024 * 1024) {
    throw new Error('Kịch bản SQL quá lớn (>50MB), từ chối để đảm bảo an toàn.');
  }
  // Chuẩn hóa + GỠ chú thích SQL để blocklist không bị lách bằng comment (vd ATTACH/**/DATABASE hoặc -- )
  const normalized = sqlString.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|\/\*[\s\S]*?\*\/|--[^\n]*/g, token => {
    if (token.startsWith("'") || token.startsWith('--') || token.startsWith('/*')) return ' ';
    return token.slice(1, -1);
  }).toLowerCase();
  const forbidden = [
    { re: /\battach\b/, msg: 'ATTACH DATABASE' },
    { re: /\bdetach\b/, msg: 'DETACH DATABASE' },
    { re: /\bload_extension\s*\(/, msg: 'load_extension()' },
    { re: /\bvacuum\s+into\b/, msg: 'VACUUM INTO' },
    { re: /\bpragma\s+(?:\w+\s*\.\s*)?writable_schema\b/, msg: 'PRAGMA writable_schema' },
    { re: /\bpragma\s+(?:\w+\s*\.\s*)?(?:temp_store_directory|data_store_directory)\b/, msg: 'PRAGMA directory' },
  ];
  for (const f of forbidden) {
    if (f.re.test(normalized)) {
      throw new Error(`Kịch bản SQL chứa lệnh bị chặn vì lý do an toàn: ${f.msg}`);
    }
  }
}

export function executeSqlDump(sqlString) {
  validateSqlDump(sqlString);
  const db = getDatabase();
  const full = sqlString.startsWith(FULL_SQL_HEADER);
  if (full && !sqlString.endsWith(FULL_SQL_FOOTER)) throw new Error('Bản SQL toàn bộ bị thiếu phần kết thúc. Chưa phục hồi dữ liệu.');
  const body = full ? sqlString.slice(FULL_SQL_HEADER.length, -FULL_SQL_FOOTER.length) : sqlString;
  if (full) {
    const control = body.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|\/\*[\s\S]*?\*\/|--[^\n]*/g, ' ');
    const withoutTriggers = control.replace(/\bcreate\s+(?:(?:temp|temporary)\s+)?trigger\b[\s\S]*?\bend\s*;/gi, ' ');
    if (/\b(?:commit|rollback|savepoint|release)\b|\bbegin\s*(?:(?:immediate|exclusive|deferred)\s*)?(?:transaction\s*)?;|\bend\s*(?:transaction\s*)?;/i.test(withoutTriggers)) throw new Error('Bản SQL toàn bộ chứa điều khiển giao dịch không hợp lệ. Chưa phục hồi dữ liệu.');
  }
  try {
    if (full) {
      db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
      db.exec(body);
      if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Bản sao lưu có tham chiếu dữ liệu không hợp lệ. Đã hủy phục hồi.');
      db.exec('COMMIT;');
    } else db.exec(sqlString);
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch { /* no open transaction */ }
    throw err;
  } finally { db.exec('PRAGMA foreign_keys=ON;'); }
}
