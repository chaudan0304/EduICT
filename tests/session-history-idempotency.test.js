import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('retrying history acknowledgements never creates a second event/participation or changes the star ledger', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'eduict-history-recovery-'));
  process.env.EDUICT_APP_ROOT=root; process.env.EDUICT_DATA_DIR=root; process.env.EDUICT_DB_PATH=path.join(root,'fixture.sqlite');
  const {getDatabase,closeConnection}=await import('../server/db/connection.js');
  const {createSession,addSessionEvent,addStudentParticipation}=await import('../server/db/sessions.js');
  try {
    const db=getDatabase(), student=db.prepare('SELECT id,class_id,stars FROM students LIMIT 1').get();
    createSession({id:'history-session',class_id:student.class_id});
    const event={id:'event-stable',eventType:'STUDENT_PARTICIPATED',studentId:student.id,details:'fixture'};
    const part={id:'part-stable',student_id:student.id,badge_type:'HAND_RAISE',stars_awarded:0};
    assert.deepEqual(addSessionEvent('history-session',event),addSessionEvent('history-session',event));
    assert.deepEqual(addStudentParticipation('history-session',part),addStudentParticipation('history-session',part));
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM session_events').get().n,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_participation').get().n,1);
    assert.equal(db.prepare('SELECT stars FROM students WHERE id=?').get(student.id).stars,student.stars);
    assert.throws(()=>addSessionEvent('history-session',{...event,details:'different'}),error=>error.statusCode===409);
    assert.throws(()=>addStudentParticipation('history-session',{...part,stars_awarded:3}),error=>error.statusCode===409);
  } finally {closeConnection();fs.rmSync(root,{recursive:true,force:true});}
});
