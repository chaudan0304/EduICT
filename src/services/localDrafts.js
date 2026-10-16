import StorageService from './StorageService';
const keyFor = scope => `eduict_draft_v1:${scope}`;
export function readLocalDraft(scope) {
  try {
    const saved = JSON.parse(StorageService.get(keyFor(scope)) || 'null');
    return saved?.version === 1 && saved.data && typeof saved.data === 'object' && !Array.isArray(saved.data) ? saved : null;
  } catch { return null; }
}
export function saveLocalDraft(scope, data) {
  const savedAt = new Date().toISOString();
  try {
    const serialized = JSON.stringify({ version: 1, savedAt, data });
    if (serialized.length > 1024 * 1024) throw new Error('Draft too large');
    StorageService.set(keyFor(scope), serialized);
    return { ok: true, savedAt };
  } catch { return { ok: false, error: 'Chưa lưu được bản nháp trên trình duyệt này. Hãy giữ cửa sổ mở và lưu nội dung trước khi đóng.' }; }
}
export function clearLocalDraft(scope) {
  try { StorageService.remove(keyFor(scope)); return true; }
  catch { return false; }
}
