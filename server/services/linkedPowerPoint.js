import path from 'node:path';

export function linkedPowerPointMetadata(data, existing = null) {
  const invalid = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
  if (existing && (existing.type === 'linked_powerpoint') !== ((data.type || existing.type) === 'linked_powerpoint')) invalid('Không thể đổi loại lưu trữ của bài học.');
  if ((data.type || existing?.type) !== 'linked_powerpoint') return data;
  const source = data.source_file_path ?? existing?.source_file_path;
  if (typeof source !== 'string' || source.length > 1024 || !/^[A-Za-z]:[\\/]/.test(source) || /[\0<>"|?*]/.test(source) || source.indexOf(':', 2) !== -1 || !['.ppt', '.pptx'].includes(path.win32.extname(source).toLowerCase())) invalid('Hãy chọn file PowerPoint trên máy bằng hộp thoại Desktop.');
  if (data.slides?.length) invalid('Bài PowerPoint liên kết chỉ lưu thông tin và đường dẫn.');
  const title = String(data.title ?? existing?.title ?? '').trim();
  const grade = Number(data.grade ?? existing?.grade ?? 3);
  const duration = Number(data.duration_minutes ?? existing?.duration_minutes ?? 35);
  if (!title || title.length > 250 || !Number.isInteger(grade) || grade < 1 || grade > 5 || !Number.isFinite(duration) || duration < 1 || duration > 240) invalid('Tên bài, khối hoặc thời lượng không hợp lệ.');
  return {
    ...(data.id ? { id: data.id } : {}), type: 'linked_powerpoint', title, grade,
    topic: String(data.topic ?? existing?.topic ?? 'Chung').slice(0, 250),
    subject: String(data.subject ?? existing?.subject ?? 'Tin Học').slice(0, 100),
    teacher_notes: String(data.teacher_notes ?? existing?.teacher_notes ?? '').slice(0, 10000),
    duration_minutes: duration, source_file_path: source,
    source_file_name: path.win32.basename(source),
    source_file_size: Number(data.source_file_size ?? existing?.source_file_size) || 0,
    render_status: 'linked', import_status: 'LINKED', slide_count: 0,
    thumbnail_url: '', thumbnail_path: '', total_slides: 0, rendered_slides: 0, failed_slides: 0, render_progress: 0,
  };
}

export function assertManagedPowerPoint(lesson) {
  if (lesson?.type === 'linked_powerpoint') throw Object.assign(new Error('Bài liên kết được trình chiếu bằng PowerPoint Desktop, không tạo ảnh slide.'), { statusCode: 409 });
}
