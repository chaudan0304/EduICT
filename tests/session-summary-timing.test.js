import {test} from 'node:test';
import assert from 'node:assert/strict';
test('summary uses actual teaching time minus pauses and counts completed activities', async()=>{
  const {getSessionSummaryTiming}=await import('../src/components/ClassroomSession/sessionSummaryTiming.js');
  const session={started_at:'2026-10-16T01:00:00Z',ended_at:'2026-10-16T01:10:00Z',total_paused_seconds:120,duration_minutes:35};
  assert.deepEqual(getSessionSummaryTiming(session,[{status:'COMPLETED'},{status:'SKIPPED'},{status:'PENDING'}]),{actualSeconds:480,plannedMinutes:35,completed:1,total:3});
  assert.equal(getSessionSummaryTiming({...session,paused_at:'2026-10-16T01:09:00Z'},[]).actualSeconds,420);
  assert.equal(getSessionSummaryTiming({duration_minutes:35},[]).actualSeconds,null);
  assert.equal(getSessionSummaryTiming({...session,ended_at:'bad'},[]).actualSeconds,null);
});
