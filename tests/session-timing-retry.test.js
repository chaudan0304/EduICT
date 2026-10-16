import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('started sessions retain their start time, safe create retry returns the existing session and stale updates fail', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eduict-session-retry-'));
  process.env.EDUICT_APP_ROOT=root; process.env.EDUICT_DATA_DIR=root; process.env.EDUICT_DB_PATH=path.join(root,'fixture.sqlite');
  const {getDatabase,closeConnection}=await import('../server/db/connection.js');
  const {createSession,updateSession}=await import('../server/db/sessions.js');
  try {
    const db=getDatabase();
    const data={id:'session-retry',class_id:db.prepare('SELECT id FROM classes LIMIT 1').get().id,lesson_title:'Fixture',status:'RUNNING',started_at:'2026-10-16T01:00:00Z'};
    assert.equal(createSession(data).started_at,data.started_at);
    assert.equal(createSession(data).id,data.id);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM classroom_sessions').get().n,1);
    assert.throws(()=>createSession({...data,lesson_title:'Other'}),error=>error.statusCode===409);
    assert.throws(()=>updateSession('missing',{status:'COMPLETED'}),error=>error.statusCode===404);
  } finally {closeConnection();fs.rmSync(root,{recursive:true,force:true});}
});
