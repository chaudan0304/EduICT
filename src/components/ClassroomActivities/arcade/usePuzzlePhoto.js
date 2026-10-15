import { useEffect, useRef, useState } from 'react';
import { useActivityState } from '../activityState';
import apiClient from '../../../services/apiClient';

const normalize = value => value && typeof value.name === 'string' && /^[a-f0-9]{64}$/.test(value.fingerprint) && /^\/uploads\/classroom-games\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(value.src) ? value : null;
export default function usePuzzlePhoto(key) {
  const [photo, setPhoto] = useActivityState(`${key}:picture-file`, null, normalize);
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
      const src = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file);
      });
      const image = new Image(); image.src = src; await image.decode();
      if (image.width * image.height > 30000000) throw new Error('Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 30 triệu điểm ảnh.');
      if (token !== sequence.current) return;
      const classId = decodeURIComponent(key.slice('eduict_activities_v2:'.length));
      const next = await apiClient.post('/api/classroom-activities/picture', { classId, name: file.name, dataUrl: src, expectedFingerprint });
      if (token === sequence.current) setPhoto(normalize(next));
    } catch (err) { if (token === sequence.current) setError(err.message || 'Ảnh không hợp lệ. Hãy chọn ảnh khác.'); }
    finally { if (token === sequence.current) setLoading(false); }
  };
  return { photo, loading, error, load };
}
