import React from 'react';
import { FileSliders, Play, Link, Trash2 } from 'lucide-react';

export default function LinkedPowerPointCard({ lesson, onOpen, onEdit, onDelete, onOnline, launching }) {
  return <article className="library-card linked-ppt-card">
    <div className="linked-ppt-card-icon"><FileSliders size={34} /><span>FILE TRÊN MÁY</span></div>
    <div className="linked-ppt-card-body"><span className="linked-ppt-eyebrow">POWERPOINT LIÊN KẾT · KHỐI {lesson.grade}</span><h3>{lesson.title}</h3><p>{lesson.duration_minutes || 35} phút · Hiệu ứng gốc qua PowerPoint</p><div className="linked-ppt-path" title={lesson.source_file_path}>{lesson.source_file_name || lesson.source_filename || lesson.source_file_path}</div></div>
    <div className="linked-ppt-card-footer"><button className="btn btn-primary btn-sm" disabled={launching} onClick={onOpen}><Play size={16} />{launching ? 'Đang mở…' : 'Trình chiếu'}</button><button className="btn btn-outline btn-sm" onClick={onEdit} aria-label={`Thông tin và chọn lại file: ${lesson.title}`}><Link size={16} />Liên kết</button>{onOnline && <button className="btn btn-outline btn-sm" onClick={onOnline}><Link size={16} />Online</button>}<button className="btn btn-ghost btn-sm" onClick={onDelete} aria-label={`Xóa liên kết: ${lesson.title}`}><Trash2 size={16} /></button></div>
  </article>;
}
