import { useEffect, useRef, useState } from 'react';

// Pictures stay in this window's memory, never in SQLite, sessionStorage or an upload API.
const photos = new Map();
// A content fingerprint is used only to restore the same classroom picture.
// The fallback also works when a school serves the app over a local HTTP network.
async function fingerprintOf(file) {
  const bytes = await file.arrayBuffer();
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  let first = 2166136261; let second = 5381;
  for (const byte of new Uint8Array(bytes)) {
    first = Math.imul(first ^ byte, 16777619);
    second = Math.imul(second, 33) ^ byte;
  }
  return `local-${bytes.byteLength}-${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}`;
}
export default function usePuzzlePhoto(key) {
  const [photo, setPhoto] = useState(() => photos.get(key) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  const load = async (file, expectedFingerprint = '') => {
    if (!file) return;
    const token = ++sequence.current;
    setError(''); setLoading(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error('Chọn ảnh PNG, JPG hoặc WebP, tối đa 3 MB.');
      const fingerprint = await fingerprintOf(file);
      if (expectedFingerprint && expectedFingerprint !== fingerprint) throw new Error('Ảnh này khác ảnh của ván đang chơi. Chọn lại đúng ảnh hoặc bắt đầu ván mới.');
      const src = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file);
      });
      const image = new Image(); image.src = src; await image.decode();
      if (image.width * image.height > 30000000) throw new Error('Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 30 triệu điểm ảnh.');
      if (token !== sequence.current) return;
      const next = { src, fingerprint, name: file.name.slice(0, 200) };
      photos.delete(key); photos.set(key, next);
      // Bound photo memory while switching between many classes or days.
      if (photos.size > 4) photos.delete(photos.keys().next().value);
      setPhoto(next);
    } catch (err) { if (token === sequence.current) setError(err.message || 'Ảnh không hợp lệ. Hãy chọn ảnh khác.'); }
    finally { if (token === sequence.current) setLoading(false); }
  };
  return { photo, loading, error, load };
}
