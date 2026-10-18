import {test} from 'node:test';
import assert from 'node:assert/strict';
test('failed history stays pending across reads, retry uses the original IDs and only history endpoints',async()=>{
  const storage=new Map();
  global.window={localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},dispatchEvent(){}};
  const previousFetch=global.fetch;
  const {addSessionEventApi,addStudentParticipationApi,fetchSessionDetailFromApi}=await import('../src/components/ClassroomSession/sessionStorage.js');
  const {getSessionWriteStatus,retrySessionWrites}=await import('../src/components/ClassroomSession/sessionPersistence.js');
  try{
    global.fetch=async()=>new Response(JSON.stringify({error:'fixture offline'}),{status:503});
    const event=await addSessionEventApi('fixture',{id:'event-1',eventType:'STARTED'});
    const part=await addStudentParticipationApi('fixture',{id:'part-1',student_id:'student-1',stars_awarded:1});
    assert.equal(event.success,false);assert.equal(part.pending,true);
    assert.equal(getSessionWriteStatus('fixture').historyPending,2);
    global.fetch=async()=>new Response(JSON.stringify({id:'fixture',events:[],participation:[]}));
    const session=await fetchSessionDetailFromApi('fixture');
    assert.equal(session.participation[0].id,'part-1');
    const calls=[];
    global.fetch=async(url,init)=>{const data=JSON.parse(init.body);calls.push({url,id:data.id});return new Response(JSON.stringify({id:data.id,success:true}));};
    await retrySessionWrites('fixture');
    assert.deepEqual(calls.map(call=>call.id),['event-1','part-1']);
    assert.ok(calls.every(call=>/\/(events|participation)$/.test(call.url)));
    assert.equal(getSessionWriteStatus('fixture').pending,0);
  }finally{global.fetch=previousFetch;delete global.window;}
});
