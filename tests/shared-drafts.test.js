import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('shared drafts reload between clients, reject stale edits, acknowledge a repeated save and allow archive/restore',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'eduict-shared-drafts-'));
  process.env.EDUICT_APP_ROOT=root;process.env.EDUICT_DATA_DIR=root;process.env.EDUICT_DB_PATH=path.join(root,'fixture.sqlite');
  const {closeConnection}=await import('../server/db/connection.js');
  const {readDraft,saveDraft,listDrafts}=await import('../server/services/editorDrafts.js');
  try{
    const empty=readDraft('question-form:new');assert.equal(empty.version,null);
    const first=saveDraft({scope:'question-form:new',expectedVersion:null,data:{formData:{question:'Fixture question'}}});
    closeConnection();assert.deepEqual(readDraft('question-form:new'),first);
    assert.equal(saveDraft({scope:'question-form:new',expectedVersion:null,data:first.data}).version,first.version);
    assert.throws(()=>saveDraft({scope:'question-form:new',expectedVersion:null,data:{formData:{question:'Different'}}}),error=>error.statusCode===409);
    const archived=saveDraft({scope:'question-form:new',expectedVersion:first.version,archived:true});
    assert.equal(archived.archived,true);assert.deepEqual(archived.data,first.data);
    assert.equal(listDrafts()[0].archived,true);
    const restored=saveDraft({scope:'question-form:new',expectedVersion:archived.version,data:archived.data});
    assert.equal(restored.archived,false);
    assert.throws(()=>saveDraft({scope:'unknown',expectedVersion:null,data:{}}),/bản nháp/);
    assert.throws(()=>saveDraft({scope:'timetable-editor',expectedVersion:null,data:{source:'a'.repeat(1024*1024)}}),error=>error.statusCode===413);
  }finally{closeConnection();fs.rmSync(root,{recursive:true,force:true});}
});
