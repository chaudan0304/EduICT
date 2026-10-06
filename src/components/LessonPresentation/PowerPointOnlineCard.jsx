import React from 'react';
import { Cloud, Play, Link, Trash2 } from 'lucide-react';

export default function PowerPointOnlineCard({ lesson, launching, onOpen, onEdit, onDelete }) {
  return <article className="library-card linked-ppt-card online-ppt-card">
    <div className="linked-ppt-card-icon"><Cloud size={34} /><span>POWERPOINT ONLINE</span></div>
    <div className="linked-ppt-card-body"><span className="linked-ppt-eyebrow">ONEDRIVE / SHAREPOINT · KHỐI {lesson.grade}</span><h3>{lesson.title}</h3><p>{lesson.duration_minutes || 35} phút · Trình chiếu có hiệu ứng trên web</p><p>File ở tài khoản Microsoft của bạn.</p></div>
    <div className="linked-ppt-card-footer"><button className="btn btn-primary btn-sm" disabled={launching} onClick={onOpen}><Play size={16} />{launching ? 'Đang mở…' : 'Trình chiếu'}</button><button className="btn btn-outline btn-sm" onClick={onEdit} aria-label={`Sửa liên kết Online: ${lesson.title}`}><Link size={16} />Liên kết</button><button className="btn btn-ghost btn-sm" onClick={onDelete} aria-label={`Xóa bài: ${lesson.title}`}><Trash2 size={16} /></button></div>
  </article>;
}
