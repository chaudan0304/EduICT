import {useState} from 'react';
import {readSessionConflict,resolveSessionConflict} from './sessionPersistence';

function VersionDetails({label,session}) {
  return <section><h4>{label}</h4><p><strong>{session.lesson_title || 'Tiết học'}</strong> · {session.status} · {session.duration_minutes} phút</p>
    <p>Ngày dạy: {session.session_date || '—'} · Đã tạm dừng: {session.total_paused_seconds || 0} giây</p>
    <p>Bắt đầu: {session.started_at || '—'}<br/>Tạm dừng: {session.paused_at || '—'}<br/>Kết thúc: {session.ended_at || '—'}</p>
    <p>Mục tiêu: {session.objectives || '—'}</p><p>Ghi chú: {session.teacher_notes || '—'}</p>
    <ol>{(session.activities||[]).map(activity=><li key={activity.id}>{activity.title} · {activity.duration_minutes} phút · {activity.status}<br/>{activity.description} {activity.notes}</li>)}</ol></section>;
}
export default function SessionConflictReview({sessionId}) {
  const [review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const read=async()=>{setBusy(true);setError('');try{setReview(await readSessionConflict(sessionId));}catch(err){setError(err.message);}finally{setBusy(false);}};
  const choose=async keepLocal=>{setBusy(true);setError('');try{await resolveSessionConflict(sessionId,review.server,keepLocal,review.localRevision);setReview(null);}catch(err){setError(err.message);}finally{setBusy(false);}};
  return <div className="session-conflict-review"><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={read}>Đối chiếu bản đang sửa và bản chung</button>
    {review&&<><div className="session-conflict-columns"><VersionDetails label="Bản đang sửa tại đây" session={review.local}/><VersionDetails label="Bản chung vừa đọc" session={review.server}/></div>
      <p>Dùng bản chung sẽ giữ bản đang sửa trong danh sách Bản nháp. Áp dụng bản đang sửa sẽ thay các trường đã sửa và tiến trình có thay đổi; hệ thống vẫn kiểm tra nếu có người lưu tiếp.</p>
      <div className="classroom-tools-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>choose(false)}>Giữ bản chung</button><button type="button" className="btn btn-primary" disabled={busy} onClick={()=>choose(true)}>Áp dụng bản đang sửa đã đối chiếu</button></div></>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
