import {test} from 'node:test';
import assert from 'node:assert/strict';
test('stale session writes stay local until the teacher reviews and explicitly reapplies against the latest revision',async()=>{
  const store=new Map();global.window={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},dispatchEvent(){}};
  const oldFetch=global.fetch;
  const {recordSessionSnapshot,queueSessionWrite,retrySessionWrites,getSessionWriteStatus,readSessionConflict,resolveSessionConflict}=await import('../src/components/ClassroomSession/sessionPersistence.js');
  const latest={id:'review',revision:'r2',activities_revision:'a1',teacher_notes:'Other window',activities:[]};
  try{
    recordSessionSnapshot({...latest,revision:'r1'});
    queueSessionWrite('review',{patch:{teacher_notes:'Local teacher note'}});
    global.fetch=async()=>new Response(JSON.stringify({error:'changed elsewhere'}),{status:409});
    await assert.rejects(retrySessionWrites('review'));
    assert.equal(getSessionWriteStatus('review').conflictedId,'review');
    global.fetch=async()=>new Response(JSON.stringify(latest));
    const review=await readSessionConflict('review');
    assert.equal(review.server.teacher_notes,'Other window');assert.equal(review.local.teacher_notes,'Local teacher note');
    let patch;
    global.fetch=async(url,init)=>{if(init?.method==='PUT'){patch=JSON.parse(init.body);return new Response(JSON.stringify({...latest,revision:'r3',teacher_notes:patch.teacher_notes}));}return new Response(JSON.stringify(latest));};
    queueSessionWrite('review',{patch:{teacher_notes:'New unreviewed note'}});
    await assert.rejects(resolveSessionConflict('review',review.server,true,review.localRevision),/đối chiếu lại/);
    assert.equal(patch,undefined);
    const refreshed=await readSessionConflict('review');
    await resolveSessionConflict('review',refreshed.server,true,refreshed.localRevision);
    assert.equal(patch.expectedRevision,'r2');assert.equal(getSessionWriteStatus('review').pending,0);
  }finally{global.fetch=oldFetch;delete global.window;}
});

test('choosing the common session retains the edited content in the shared drafts before clearing it',async()=>{
  const store=new Map();global.window={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},dispatchEvent(){}};
  const oldFetch=global.fetch;
  const p=await import('../src/components/ClassroomSession/sessionPersistence.js');
  const latest={id:'common-choice',revision:'r2',activities_revision:'a1',teacher_notes:'common',activities:[]};
  try{
    p.recordSessionSnapshot({...latest,revision:'r1'});p.queueSessionWrite(latest.id,{patch:{teacher_notes:'keep this draft'}});
    global.fetch=async()=>new Response(JSON.stringify(latest));
    const review=await p.readSessionConflict(latest.id);let shared;
    global.fetch=async(url,init)=>{
      if(url.includes('/api/editor-drafts')){shared=JSON.parse(init.body);return new Response(JSON.stringify({version:'draft-v1'}));}
      assert.notEqual(init?.method,'PUT');return new Response(JSON.stringify(latest));
    };
    await p.resolveSessionConflict(latest.id,review.server,false,review.localRevision);
    assert.equal(shared.data.patch.teacher_notes,'keep this draft');
    assert.ok(shared.scope.startsWith('session-conflict:common-choice:'));
    assert.equal(p.getSessionWriteStatus(latest.id).pending,0);
  }finally{global.fetch=oldFetch;delete global.window;}
});
