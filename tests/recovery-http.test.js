import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
test('HTTP supports timetable revisions, blocks stale session writes and limits shared drafts to localhost',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'eduict-recovery-http-'));
  process.env.EDUICT_APP_ROOT=root;process.env.EDUICT_DATA_DIR=root;process.env.EDUICT_DB_PATH=path.join(root,'fixture.sqlite');
  const {handleApiRequest}=await import('../server/routes/index.js');
  const {getDatabase,closeConnection}=await import('../server/db/connection.js');
  const {getDefaultTimetable}=await import('../src/utils/timetable.js');
  const call=async(method,url,body,address='127.0.0.1')=>{
    const req=Readable.from([body===undefined?'':JSON.stringify(body)]);Object.assign(req,{method,url,headers:{host:'127.0.0.1','content-type':'application/json'},socket:{remoteAddress:address}});
    let data='';const res={statusCode:200,setHeader(){},end(chunk){data+=chunk||'';}};
    await handleApiRequest(req,res);return{status:res.statusCode,data:JSON.parse(data)};
  };
  try{
    const baseline=(await call('GET','/api/timetable')).data;
    const payload={timetable:getDefaultTimetable(),periodSlots:baseline.periodSlots,expectedRevision:baseline.revision};
    assert.equal((await call('POST','/api/timetable',payload)).status,200);
    assert.equal((await call('POST','/api/timetable',payload)).status,409);
    const classId=getDatabase().prepare('SELECT id FROM classes LIMIT 1').get().id;
    const created=(await call('POST','/api/sessions',{id:'http-cas',class_id:classId})).data;
    assert.equal((await call('PUT','/api/sessions/http-cas',{teacher_notes:'A',expectedRevision:created.revision})).status,200);
    assert.equal((await call('PUT','/api/sessions/http-cas',{teacher_notes:'B',expectedRevision:created.revision})).status,409);
    assert.equal((await call('GET','/api/editor-drafts',undefined,'192.0.2.1')).status,403);
    const draft=await call('POST','/api/editor-drafts/item',{scope:'question-form:new',expectedVersion:null,data:{formData:{question:'Fixture'}}});
    assert.equal(draft.status,200);
    assert.equal((await call('GET','/api/editor-drafts')).data.drafts.length,1);
  }finally{closeConnection();fs.rmSync(root,{recursive:true,force:true});}
});
