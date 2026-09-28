import { getDatabase } from './connection.js';

// ====================================================
// 14. PHÂN HỆ TRỢ GIẢNG AI: CACHE & AUDIT
// ====================================================

// 1. Lấy kết quả AI đã lưu trong cache theo input_hash
export function getAiGenerationCache(feature, inputHash) {
  if (!feature || !inputHash) return null;
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM ai_generations 
    WHERE feature = ? AND input_hash = ? AND status = 'SUCCESS'
    ORDER BY created_at DESC LIMIT 1;
  `).get(feature, inputHash);

  if (!row || !row.result_json) return null;
  try {
    return {
      ...row,
      result: JSON.parse(row.result_json)
    };
  } catch (e) {
    return null;
  }
}

// 2. Lưu kết quả AI vào cache & audit log
export function saveAiGenerationCache({
  id = null,
  feature,
  entityType = null,
  entityId = null,
  model = 'gemini-3.5-flash-lite',
  inputHash,
  status = 'SUCCESS',
  result = null,
  errorCode = null,
  promptVersion = 'v1'
}) {
  const db = getDatabase();
  const genId = id || `ai_gen_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const resultJson = typeof result === 'object' ? JSON.stringify(result) : (result || null);

  const stmt = db.prepare(`
    INSERT INTO ai_generations (
      id, feature, entity_type, entity_id, model, input_hash, status, result_json, error_code, prompt_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `);

  stmt.run(
    genId,
    feature,
    entityType,
    entityId,
    model,
    inputHash,
    status,
    resultJson,
    errorCode,
    promptVersion
  );

  return { id: genId, success: true };
}

// 3. Xóa cache của một entity cụ thể khi nội dung thay đổi
export function deleteAiGenerationCache(feature, entityId) {
  if (!feature || !entityId) return;
  const db = getDatabase();
  db.prepare('DELETE FROM ai_generations WHERE feature = ? AND entity_id = ?;').run(feature, entityId);
}
