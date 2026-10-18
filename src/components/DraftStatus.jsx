import {useState} from 'react';
import {draftReadableText} from '../services/draftPresentation';
export default function DraftStatus({status}){
  const [busy,setBusy]=useState(false);
  if(!status)return null;
  const choose=async action=>{setBusy(true);try{await action();}finally{setBusy(false);}};
  const message=status.error||(status.shared?`${status.restored?'Đã khôi phục':'Đã đồng bộ'} bản nháp web/desktop`:status.durable===false?'Chỉ giữ trong cửa sổ này; đang chờ đồng bộ':'Đã giữ bản nháp tại đây; đang chờ đồng bộ');
  return <div className={`draft-status${status.error?' is-error':''}`}><p role={status.error?'alert':'status'}>{message}{status.savedAt&&` · ${new Date(status.savedAt).toLocaleTimeString('vi-VN')}`}</p>
    {status.conflict&&<details><summary>Đối chiếu hai bản nháp</summary><div className="session-conflict-columns"><section><h4>Bản đang soạn</h4><pre>{draftReadableText(status.localData)}</pre></section><section><h4>{status.sharedArchived?'Bản chung đã kết thúc/bỏ tạm':'Bản chung'}</h4><pre>{draftReadableText(status.sharedData||{})}</pre></section></div>
      <div className="classroom-tools-actions"><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>choose(status.useShared)}>Dùng bản chung</button><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={()=>choose(status.keepLocal)}>Đồng bộ bản đang soạn đã đối chiếu</button></div></details>}
    {status.retry&&<button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>choose(status.retry)}>Thử đồng bộ lại</button>}
  </div>;
}
