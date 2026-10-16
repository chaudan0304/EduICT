import {useEffect,useState} from 'react';
import {FolderOpen} from 'lucide-react';
import FileDialogService from '../../services/FileDialogService';
import {getNativeAdapter} from '../../services/DesktopCapabilityService';

export default function BackupDestination({mirror,busy,onSave,onCopy,selectedId}){
  const [folder,setFolder]=useState(mirror?.folder||'');
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{setFolder(mirror?.folder||'');setConfirmed(false);},[mirror?.folder]);
  return <section className="backup-auto backup-destination" aria-labelledby="backup-destination-title"><h4 id="backup-destination-title">Bản dự phòng ở thư mục khác</h4>
    <p>Giữ thêm gói EduICT gồm dữ liệu lớp học, điểm và tài nguyên. Sau khi bật, bản sao lưu mới và bản tự động hằng ngày sẽ được chép tới đây khi ứng dụng đang chạy.</p>
    <label className="backup-picker">Thư mục trên máy<input className="input-field" placeholder="Ví dụ: D:\SaoLuuEduMaster" value={folder} disabled={busy} onChange={event=>{setFolder(event.target.value);setConfirmed(false);}} /></label>
    <div className="classroom-tools-actions">{getNativeAdapter()?.selectFolder&&<button type="button" className="btn btn-outline" disabled={busy} onClick={async()=>{try{const chosen=await FileDialogService.selectFolder({title:'Chọn nơi giữ bản dự phòng EduMaster'});if(chosen){setFolder(chosen);setConfirmed(false);}setError('');}catch(err){setError(err.message);}}}><FolderOpen size={16}/>Chọn thư mục</button>}</div>
    <p className="classroom-tools-muted">Có thể dùng thư mục OneDrive đã đồng bộ trên máy. OneDrive sẽ tải gói dữ liệu lên tài khoản đang kết nối. Các gói được đặt trong thư mục con EduMaster-backups và không tự xóa.</p>
    <label className="backup-destination-consent"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>Tôi muốn lưu thêm dữ liệu lớp học và điểm vào thư mục này.</label>
    <div className="classroom-tools-actions"><button type="button" className="btn btn-primary" disabled={busy||!folder.trim()||!confirmed} onClick={()=>onSave(folder.trim())}>Bật nơi dự phòng</button>
      {mirror?.enabled&&<><button type="button" className="btn btn-outline" disabled={busy||!selectedId} onClick={()=>onCopy(selectedId)}>Chép bản đang chọn</button><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>onSave('')}>Ngừng chép dự phòng</button></>}</div>
    <p className="classroom-tools-muted">{mirror?.enabled?`Đang dùng: ${mirror.folder}`:'Chưa bật nơi dự phòng.'}<br/>{mirror?.lastCopiedAt?`Chép thành công gần nhất: ${new Date(mirror.lastCopiedAt).toLocaleString('vi-VN')}`:'Chưa có lần chép thành công được ghi nhận.'}</p>
    {(error||mirror?.lastError)&&<p className="classroom-tools-error" role="alert">{error||mirror.lastError}</p>}
  </section>;
}
