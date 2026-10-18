import {readLocalDraft,saveLocalDraft,clearLocalDraft} from './localDrafts';
import {readSharedDraft,writeSharedDraft} from './sharedDrafts';

const owners=new Map();
const signature=value=>JSON.stringify(value);
export function createDraftSync(scope,{restore,status},io={readLocal:readLocalDraft,saveLocal:saveLocalDraft,clearLocal:clearLocalDraft,read:readSharedDraft,write:writeSharedDraft}){
  let current,initial,base=null,remote=null,loaded=false,loading=null,dirty=false,blocked=false,closed=false,cleared=false,touched=false,durable=true,restoredLocal=false,timer,chain=Promise.resolve();
  const token={};owners.set(scope,token);
  const notify=value=>{if(!closed)status(value);};
  const clearCache=()=>{if(owners.get(scope)===token)io.clearLocal(scope);};
  const cache=(pendingSync=true,pendingClear=false)=>{
    if(owners.get(scope)!==token)return;
    const result=io.saveLocal(scope,current,{sharedVersion:base,pendingSync,pendingClear});durable=result.ok;
    if(!result.ok)notify({error:result.error});
  };
  const conflict=record=>{remote=record;blocked=true;notify({conflict:true,error:'Bản nháp đã đổi ở cửa sổ khác. Nội dung tại đây vẫn được giữ.',localData:current,sharedData:record.data,sharedArchived:record.archived,
    useShared:()=>choose(false),keepLocal:()=>choose(true)});};
  const adopt=record=>{
    remote=record;base=record.version;loaded=true;dirty=false;blocked=false;
    if(record.data&&!record.archived){current=record.data;if(!closed)restore(current);}
    else if(restoredLocal){current=initial;if(!closed)restore(current);}
    if(record.data&&!record.archived){cache(false);notify({shared:true,restored:true,savedAt:record.updatedAt});}
    else{clearCache();notify(null);}
  };
  const sync=()=>{
    clearTimeout(timer);
    chain=chain.catch(()=>{}).then(async()=>{
      if(!loaded||blocked||cleared||!dirty)return;
      const sent=current;
      try{
        const saved=await io.write(scope,sent,base);base=saved.version;remote=saved;
        if(signature(current)===signature(sent)){dirty=false;cache(false);notify({shared:true,savedAt:saved.updatedAt});}
        else cache(true);
      }catch(error){
        if(error.status===409&&error.data?.current)conflict(error.data.current);
        else notify({error:`${durable?'Đã giữ tại thiết bị này':'Hãy giữ cửa sổ mở'}; chưa đồng bộ: ${error.message}`,retry:()=>sync()});
      }
    });
    return chain;
  };
  const choose=async keepLocal=>{
    if(!remote)return;
    if(!keepLocal){adopt(remote);return;}
    base=remote.version;blocked=false;loaded=true;dirty=true;cache(true);await sync();
  };
  const load=()=>{
    if(loading)return loading;
    loading=(async()=>{
      try{
        const record=await io.read(scope);loaded=true;remote=record;
        if(cleared)return;
        if(dirty){
          if(record.data&&signature(record.data)===signature(current)&&!record.archived){base=record.version;dirty=false;cache(false);notify({shared:true,savedAt:record.updatedAt});}
          else if(record.version!==base&&record.data&&!record.archived)conflict(record);
          else if(record.archived&&base!==null&&record.version!==base)conflict(record);
          else{base=record.version;await sync();}
        }else adopt(record);
      }catch(error){notify({error:`Chưa đọc được bản nháp chung: ${error.message}. ${durable?'Nội dung trên thiết bị này được giữ.':'Hãy giữ cửa sổ mở.'}`,retry:()=>load()});}
      finally{loading=null;}
    })();return loading;
  };
  return {
    async start(value){
      initial=value;current=value;
      const local=io.readLocal(scope);
      if(local?.pendingClear){base=local.sharedVersion;current=local.data;cleared=true;if(!await this.clear())return;cleared=false;dirty=false;loaded=false;base=null;current=initial;await load();return;}
      if(local){restoredLocal=true;current=local.data;base=local.sharedVersion??null;dirty=local.pendingSync!==false;restore(current);notify({restored:true,savedAt:local.savedAt,pending:true});}
      await load();
    },
    touch(){touched=true;},
    change(value){
      if(cleared||signature(value)===signature(current))return;
      current=value;
      if(!loaded&&!touched)return;
      dirty=true;cache(true);notify({pending:true,durable,savedAt:new Date().toISOString()});
      if(blocked){conflict(remote);return;}
      if(!loaded){void load();return;}
      clearTimeout(timer);timer=setTimeout(sync,600);
    },
    async clear(){
      cleared=true;clearTimeout(timer);clearCache();
      await chain.catch(()=>{});
      try{
        if(!loaded){remote=await io.read(scope);loaded=true;if(base===null&&!remote.data)base=remote.version;}
        if(remote?.data||dirty){remote=await io.write(scope,current,base,true);base=remote.version;}
        clearCache();notify(null);return true;
      }catch(error){
        cache(true,true);
        if(error.status===409&&error.data?.current){cleared=false;loaded=true;dirty=true;conflict(error.data.current);}
        else notify({error:`Chưa kết thúc được bản nháp chung: ${error.message}. Giữ nội dung đang soạn và thử lại.`,retry:()=>this.start(initial)});
        return false;
      }
    },
    close(){closed=true;clearTimeout(timer);if(!cleared&&dirty&&!blocked){if(loaded)void sync();else void load();}},
    flush:sync,
  };
}
