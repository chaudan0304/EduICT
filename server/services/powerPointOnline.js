import { normalizePowerPointEmbed } from '../../shared/powerPointOnline.js';
import { linkedPowerPointMetadata } from './linkedPowerPoint.js';

export function normalizeLessonMetadata(data, existing = null) {
  const invalid = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
  let result = linkedPowerPointMetadata(data, existing);
  const type = data.type || existing?.type;
  if (existing && (existing.type === 'powerpoint_online') !== (type === 'powerpoint_online')) {
    invalid('Hãy thêm liên kết Online cho bài hiện tại, không đổi loại lưu trữ của bài.');
  }
  let embed = existing?.online_embed_url || '';
  if (data.online_embed_url !== undefined) {
    if (data.online_embed_url === '') embed = '';
    else {
      try { embed = normalizePowerPointEmbed(data.online_embed_url); }
      catch (err) { invalid(err.message); }
    }
    result = { ...result, online_embed_url: embed };
  }
  if (type !== 'powerpoint_online') return result;
  if (!embed) invalid('Bài PowerPoint Online cần có mã Embed của Microsoft.');
  if (data.slides !== undefined && (!Array.isArray(data.slides) || data.slides.length)) invalid('Bài Online chỉ lưu liên kết, không nhập nội dung slide.');
  const title = String(data.title ?? existing?.title ?? '').trim();
  const grade = Number(data.grade ?? existing?.grade ?? 3);
  const duration = Number(data.duration_minutes ?? existing?.duration_minutes ?? 35);
  if (!title || title.length > 250 || !Number.isInteger(grade) || grade < 1 || grade > 5 || !Number.isFinite(duration) || duration < 1 || duration > 240) invalid('Tên bài, khối hoặc thời lượng không hợp lệ.');
  return {
    ...(data.id ? { id: data.id } : {}), type, online_embed_url: embed, title, grade,
    subject: String(data.subject ?? existing?.subject ?? 'Tin Học').slice(0, 100),
    topic: String(data.topic ?? existing?.topic ?? 'Chung').slice(0, 250),
    teacher_notes: String(data.teacher_notes ?? existing?.teacher_notes ?? '').slice(0, 10000),
    duration_minutes: duration, source_file_path: '', source_file_name: '', source_file_size: 0,
    render_status: 'online', import_status: 'ONLINE', slide_count: 0,
    thumbnail_url: '', thumbnail_path: '', total_slides: 0, rendered_slides: 0, failed_slides: 0, render_progress: 0,
  };
}
