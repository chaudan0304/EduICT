import { test } from 'node:test';
import assert from 'node:assert/strict';

test('session writes: reject failed create/delete; preserve pending updates across reads; retry only PUTs', async () => {
  const store = new Map();
  global.window = { localStorage: { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) }, dispatchEvent() {} };
  const original = global.fetch;
  const { createSessionApi, updateSessionApi, deleteSessionApi, fetchSessionDetailFromApi, setStoredActiveSessionId, getStoredActiveSessionId } = await import('../src/components/ClassroomSession/sessionStorage.js');
  const { getSessionWriteStatus, retrySessionWrites, queueSessionWrite, mergePendingSession } = await import('../src/components/ClassroomSession/sessionPersistence.js');
  const calls = [];
  try {
    global.fetch = async () => new Response(JSON.stringify({error:'fixture unavailable'}), {status:503});
    await assert.rejects(createSessionApi({id:'s1',class_id:'c1'}), /fixture unavailable/);
    setStoredActiveSessionId('s1');
    await assert.rejects(deleteSessionApi('s1'), /fixture unavailable/);
    assert.equal(getStoredActiveSessionId(), 's1');
    global.fetch = async () => new Response(JSON.stringify({id:'s1',status:'RUNNING',activities:[] }));
    await fetchSessionDetailFromApi('s1');
    global.fetch = async () => { throw new Error('offline fixture'); };
    const pending = await updateSessionApi('s1', {status:'PAUSED',paused_at:'2026-10-16T01:00:00Z'});
    assert.equal(pending.status, 'PAUSED');
    assert.equal(getSessionWriteStatus('s1').pending, 1);
    global.fetch = async (url,init) => { calls.push({url,method:init?.method||'GET'}); return new Response(JSON.stringify({id:'s1',status:init?.method==='PUT'?'PAUSED':'RUNNING',activities:[]})); };
    assert.equal((await fetchSessionDetailFromApi('s1')).status, 'PAUSED');
    await retrySessionWrites('s1');
    assert.equal(getSessionWriteStatus('s1').pending, 0);
    assert.deepEqual(calls.filter(c=>c.method!=='GET').map(c=>c.method), ['PUT']);
    // A newer edit arriving while the first request waits must also be acknowledged.
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const payloads = [];
    global.fetch = async (url, init) => {
      const body = JSON.parse(init.body); payloads.push(body);
      if (payloads.length === 1) await gate;
      return new Response(JSON.stringify(String(url).endsWith('/activities') ? body.activities : { id: 's1', ...body }));
    };
    queueSessionWrite('s1', { patch: { status: 'PAUSED' } });
    const first = retrySessionWrites('s1');
    queueSessionWrite('s1', { patch: { teacher_notes: 'newest' }, activities: [{ id: 'a1', title: 'Latest activity' }] });
    release(); await first;
    assert.equal(getSessionWriteStatus('s1').pending, 0);
    assert.equal(payloads.at(-2).teacher_notes, 'newest');
    assert.equal(payloads.at(-1).activities[0].title, 'Latest activity');
    // Wrong successful-response shape is not an acknowledgement.
    queueSessionWrite('s1', { patch: { status: 'COMPLETED' } });
    global.fetch = async () => new Response(JSON.stringify({ success: true }));
    await assert.rejects(retrySessionWrites('s1'), /chưa xác nhận/);
    assert.equal(mergePendingSession({ id: 's1', status: 'PAUSED' }).status, 'COMPLETED');
  } finally { global.fetch=original; delete global.window; }
});
