import {useCallback,useEffect,useState} from 'react';
import {listSharedDrafts,readSharedDraft,writeSharedDraft,DRAFTS_UPDATED,openDraft} from '../../services/sharedDrafts';
import {listLocalDrafts,readLocalDraft,saveLocalDraft,clearLocalDraft} from '../../services/localDrafts';
import {draftLabel,draftReadableText} from '../../services/draftPresentation';
import apiClient from '../../services/apiClient';

export default function DraftsPanel({onBusyChange,onResume}){
  const [rows,setRows]=useState([]),[sessions,setSessions]=useState([]),[showArchived,setShowArchived]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(null),[target,setTarget]=useState('');
  const load=useCallback(async()=>{
    try{
      const shared=await listSharedDrafts();const merged=new Map(shared.drafts.map(row=>[row.scope,row]));
      for(const local of listLocalDrafts())if(local.pendingSync!==false){const previous=merged.get(local.scope);merged.set(local.scope,{...previous,scope:local.scope,title:local.data.lessonTitle||local.data.formData?.question||previous?.title||draftLabel(local.scope),updatedAt:local.savedAt,archived:false,localPending:true,pendingClear:local.pendingClear});}
      setRows([...merged.values()].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))));setError('');
    }catch(err){setError(`Chưa đọc được bản nháp chung: ${err.message}`);setRows(listLocalDrafts().map(row=>({...row,title:draftLabel(row.scope),updatedAt:row.savedAt,localPending:true,archived:false})));}
  },[]);
  useEffect(()=>{void load();apiClient.get('/api/sessions').then(setSessions).catch(()=>{});window.addEventListener(DRAFTS_UPDATED,load);return()=>window.removeEventListener(DRAFTS_UPDATED,load);},[load]);
  const run=async action=>{if(busy)return;setBusy(true);onBusyChange?.(true);setError('');try{await action();}catch(err){setError(err.message);}finally{setBusy(false);onBusyChange?.(false);}};
  const detail=async row=>{const server=await readSharedDraft(row.scope),local=readLocalDraft(row.scope);return {server,data:row.localPending&&local?local.data:server.data};};
  const resume=row=>run(async()=>{
    const {server,data}=await detail(row);if(!data)throw new Error('Bản nháp không còn nội dung. Hãy làm mới danh sách.');
    if(row.scope.startsWith('ai-flow:')&&!target)throw new Error('Hãy chọn tiết học nhận tiến trình trước khi tiếp tục.');
    if(!row.localPending)saveLocalDraft(row.scope,data,{sharedVersion:server.version,pendingSync:false});
    openDraft({scope:row.scope,data,targetSessionId:target||null});onResume?.();
  });
  const archive=row=>run(async()=>{
    const {server,data}=await detail(row),local=readLocalDraft(row.scope);
    const version=row.localPending?local?.sharedVersion??null:server.version;
    await writeSharedDraft(row.scope,data,version,true);clearLocalDraft(row.scope);setPreview(null);await load();
  });
  const restore=row=>run(async()=>{const server=await readSharedDraft(row.scope);await writeSharedDraft(row.scope,server.data,row.version,false);await load();});
  return <section className="drafts-panel" aria-busy={busy}><h3>Bản nháp chưa hoàn tất</h3><p>Tiếp tục soạn trên web hoặc desktop qua kho dữ liệu chung của máy này. Bỏ tạm vẫn giữ nội dung để khôi phục.</p>
    <div className="classroom-tools-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>run(load)}>Làm mới</button><label><input type="checkbox" checked={showArchived} onChange={event=>setShowArchived(event.target.checked)}/> Xem bản đã kết thúc / bỏ tạm</label></div>
    {rows.some(row=>row.scope.startsWith('ai-flow:')&&!row.archived)&&<label className="backup-picker">Tiết học nhận tiến trình AI<select className="input-field" value={target} onChange={event=>setTarget(event.target.value)}><option value="">Chọn khi tiếp tục bản đề xuất AI</option>{sessions.filter(session=>!['COMPLETED','CANCELLED'].includes(session.status)).map(session=><option key={session.id} value={session.id}>{session.class_name} · {session.lesson_title} · {session.session_date}</option>)}</select></label>}
    {rows.filter(row=>Boolean(row.archived)===showArchived).map(row=><article key={row.scope} className="draft-list-card"><div><strong>{draftLabel(row.scope)}</strong><h4>{row.title}</h4><small>{new Date(row.updatedAt).toLocaleString('vi-VN')} · {row.localPending?'Có nội dung trên thiết bị này chưa đồng bộ':'Trong dữ liệu chung'}</small></div>
      <div className="classroom-tools-actions"><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>run(async()=>{const result=await detail(row);setPreview({scope:row.scope,data:result.data});})}>Xem nội dung</button>
      {row.archived?<button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={()=>restore(row)}>Khôi phục bản nháp</button>:<><button type="button" className="btn btn-primary btn-sm" disabled={busy||row.pendingClear} onClick={()=>resume(row)}>Tiếp tục soạn</button><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>archive(row)}>{row.pendingClear?'Thử kết thúc bản nháp':'Bỏ tạm'}</button></>}</div></article>)}
    {!rows.some(row=>Boolean(row.archived)===showArchived)&&<p>Chưa có bản nháp trong danh sách này.</p>}
    {preview&&<section className="draft-preview"><h4>{draftLabel(preview.scope)}</h4><pre>{draftReadableText(preview.data||{})}</pre><button type="button" className="btn btn-outline btn-sm" onClick={()=>setPreview(null)}>Đóng nội dung</button></section>}
    {error&&<p role="alert" className="classroom-tools-error">{error}</p>}
  </section>;
}
