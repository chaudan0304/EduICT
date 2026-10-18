import {useCallback,useEffect,useRef,useState} from 'react';
import {createDraftSync} from '../services/draftSyncController';

export default function useLocalDraft(scope,enabled,value,restore){
  const [status,setStatus]=useState(null);
  const controller=useRef(null),restoreRef=useRef(restore),valueRef=useRef(value);
  const serialized=JSON.stringify(value);
  useEffect(()=>{restoreRef.current=restore;valueRef.current=value;});
  useEffect(()=>{
    if(!enabled)return;
    const sync=createDraftSync(scope,{restore:data=>restoreRef.current(data),status:setStatus});controller.current=sync;
    void sync.start(valueRef.current);
    const touched=()=>sync.touch();
    document.addEventListener('input',touched,true);document.addEventListener('pointerdown',touched,true);
    return()=>{sync.close();document.removeEventListener('input',touched,true);document.removeEventListener('pointerdown',touched,true);};
  },[scope,enabled]);
  useEffect(()=>{if(enabled)controller.current?.change(JSON.parse(serialized));},[enabled,serialized]);
  const clear=useCallback(()=>controller.current?.clear(),[]);
  return {status,clear};
}
