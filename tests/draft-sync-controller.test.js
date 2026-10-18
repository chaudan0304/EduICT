import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraftSync} from '../src/services/draftSyncController.js';

test('draft sync keeps both edits on conflict, resumes the common draft in another client, and archives after an in-flight save',async()=>{
  let remote={scope:'question-form:new',version:'v1',data:{text:'shared'},updatedAt:new Date().toISOString(),archived:false},counter=1,local=null,status,restored;
  const writes=[];
  const io={readLocal:()=>local,saveLocal:(scope,data,meta)=>{local={data,...meta};return{ok:true};},clearLocal:()=>{local=null;},read:async()=>structuredClone(remote),
    write:async(scope,data,expectedVersion,archived=false)=>{
      writes.push({data,expectedVersion,archived});
      if(expectedVersion!==remote.version)throw Object.assign(new Error('conflict'),{status:409,data:{current:structuredClone(remote)}});
      remote={...remote,version:`v${++counter}`,data:archived?remote.data:data,archived};return structuredClone(remote);
    }};
  const sync=createDraftSync('question-form:new',{restore:data=>{restored=data;},status:value=>{status=value;}},io);
  await sync.start({text:''});assert.equal(restored.text,'shared');
  sync.touch();sync.change({text:'local'});
  remote={...remote,version:'v-other',data:{text:'other window'}};
  await sync.flush();assert.equal(status.conflict,true);assert.equal(local.data.text,'local');
  await status.useShared();assert.equal(restored.text,'other window');
  sync.change({text:'reviewed local'});await sync.flush();assert.equal(remote.data.text,'reviewed local');
  await sync.clear();assert.equal(remote.archived,true);assert.equal(remote.data.text,'reviewed local');sync.close();
  local=null;
  restored=undefined;
  const next=createDraftSync('question-form:new',{restore:data=>{restored=data;},status(){}},io);
  await next.start({text:'new form'});assert.equal(restored,undefined);
  next.touch();next.change({text:'second client'});await next.flush();assert.equal(remote.archived,false);next.close();
  assert.ok(writes.some(write=>write.archived));
});

test('late common-draft reads do not replace text already typed; form initialization is allowed to restore the common draft',async()=>{
  let release,restored,status;
  const result=new Promise(resolve=>{release=resolve;});
  const io={readLocal:()=>null,saveLocal:()=>({ok:true}),clearLocal(){},read:()=>result,write:async()=>{throw new Error('must review');}};
  const sync=createDraftSync('question-form:late',{restore:data=>{restored=data;},status:value=>{status=value;}},io);
  const start=sync.start({text:''});sync.touch();sync.change({text:'teacher typed'});
  release({version:'new',data:{text:'other window'},archived:false});await start;
  assert.equal(restored,undefined);assert.equal(status.conflict,true);assert.equal(status.localData.text,'teacher typed');sync.close();
});

test('a pending archive is retried without disabling the next edit in that form',async()=>{
  let local={data:{text:'already saved question'},sharedVersion:'v1',pendingClear:true};
  let remote={version:'v1',data:local.data,archived:false};
  const io={readLocal:()=>local,saveLocal:(scope,data,meta)=>{local={data,...meta};return{ok:true};},clearLocal:()=>{local=null;},read:async()=>remote,
    write:async(scope,data,version,archived=false)=>{assert.equal(version,remote.version);remote={version:remote.version+'x',data,archived};return remote;}};
  const sync=createDraftSync('question-form:archive-retry',{restore(){},status(){}},io);
  await sync.start({text:'new form'});assert.equal(remote.archived,true);
  sync.touch();sync.change({text:'next question'});await sync.flush();
  assert.equal(remote.data.text,'next question');assert.equal(remote.archived,false);sync.close();
});

test('finishing a draft waits for its in-flight save and archives using the acknowledged version',async()=>{
  let release,entered;
  const gate=new Promise(resolve=>{release=resolve;}), started=new Promise(resolve=>{entered=resolve;});
  const writes=[];
  const io={readLocal:()=>null,saveLocal:()=>({ok:true}),clearLocal(){},read:async()=>({version:null,data:null}),
    write:async(scope,data,version,archived=false)=>{
      writes.push({version,archived});
      if(!archived){entered();await gate;return{version:'saved',data,archived:false};}
      assert.equal(version,'saved');return{version:'archived',data,archived:true};
    }};
  const sync=createDraftSync('question-form:in-flight',{restore(){},status(){}},io);
  await sync.start({text:''});sync.touch();sync.change({text:'question saved'});
  const writing=sync.flush();await started;
  const finishing=sync.clear();assert.equal(writes.length,1);
  release();await Promise.all([writing,finishing]);
  assert.deepEqual(writes,[{version:null,archived:false},{version:'saved',archived:true}]);sync.close();
});
