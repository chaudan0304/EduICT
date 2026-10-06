import React from 'react';
import { Cloud, ExternalLink, EyeOff, RefreshCw } from 'lucide-react';
import { normalizePowerPointEmbed } from '../../../shared/powerPointOnline.js';

export default function PowerPointOnlineControls({ embedUrl, onReload, onHide }) {
  let url = null;
  try { url = normalizePowerPointEmbed(embedUrl); } catch { /* Surface shows the validation error. */ }
  return <div className="online-ppt-navigation">
    <Cloud size={17} /><span>Đổi slide trong khung Microsoft</span>
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: '#fff' }} title="Mở bài trên Microsoft nếu yêu cầu đăng nhập hoặc không hiển thị"><ExternalLink size={16} /><span>Mở bài</span></a>}
    <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={onReload} title="Tải lại bài từ đầu" aria-label="Tải lại PowerPoint Online từ đầu"><RefreshCw size={16} /></button>
    <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={onHide} title="Ẩn thanh EduICT để thao tác trên slide" aria-label="Ẩn công cụ EduICT"><EyeOff size={16} /></button>
  </div>;
}
