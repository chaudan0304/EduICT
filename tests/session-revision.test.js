import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('two session editors cannot overwrite stale notes or activities; identical acknowledgement retry succeeds',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'eduict-session-revision-'));
  process.env.EDUICT_APP_ROOT=root;process.env.EDUICT_DATA_DIR=root;process.env.EDUICT_DB_PATH=path.join(root,'fixture.sqlite');
  const {getDatabase,closeConnection}=await import('../server/db/connection.js');
  const {createSession,getSessionById,updateSession,saveSessionActivities}=await import('../server/db/sessions.js');
  try{
    const classId=getDatabase().prepare('SELECT id FROM classes LIMIT 1').get().id;
    const initial=createSession({id:'cas-session',class_id:classId,activities:[{id:'act-cas',title:'Initial'}]});
    assert.equal(typeof initial.revision,'string');assert.equal(typeof initial.activities_revision,'string');
    const fresh=updateSession(initial.id,{teacher_notes:'Editor A',expectedRevision:initial.revision});
    assert.throws(()=>updateSession(initial.id,{teacher_notes:'Editor B',expectedRevision:initial.revision}),error=>error.statusCode===409);
    assert.equal(updateSession(initial.id,{teacher_notes:'Editor A',expectedRevision:initial.revision}).revision,fresh.revision);
    const activities=[{...initial.activities[0],title:'Flow A'}];
    saveSessionActivities(initial.id,activities,{expectedRevision:initial.activities_revision});
    assert.throws(()=>saveSessionActivities(initial.id,[{...activities[0],title:'Flow B'}],{expectedRevision:initial.activities_revision}),error=>error.statusCode===409);
    assert.equal(getSessionById(initial.id).activities[0].title,'Flow A');
    assert.equal(getSessionById(initial.id).teacher_notes,'Editor A');
    saveSessionActivities(initial.id,activities,{expectedRevision:initial.activities_revision});
  }finally{closeConnection();fs.rmSync(root,{recursive:true,force:true});}
});
