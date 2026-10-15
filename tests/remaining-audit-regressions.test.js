import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import apiClient from '../src/services/apiClient.js';
import { analyzeClassApi, analyzeLessonApi } from '../src/components/AI/aiService.js';
import { loadSpreadsheet } from '../src/utils/loadSpreadsheet.js';

function waitForAbort(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

test('HTTP timeout still aborts when a caller supplies its own signal', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const caller = new AbortController();
  let requestSignal;
  globalThis.fetch = (_url, options) => {
    requestSignal = options.signal;
    return waitForAbort(options.signal);
  };
  await assert.rejects(apiClient.get('/fake', { signal: caller.signal, timeout: 15 }), /Hết thời gian/);
  assert.equal(requestSignal.aborted, true);
  assert.equal(caller.signal.aborted, false);
});

test('HTTP cancellation is distinguished from timeout, including a pre-aborted signal', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = (_url, options) => waitForAbort(options.signal);
  const caller = new AbortController();
  const request = apiClient.get('/fake', { signal: caller.signal });
  caller.abort();
  await assert.rejects(request, error => error.code === 'REQUEST_ABORTED');
  await assert.rejects(apiClient.get('/fake', { signal: caller.signal }), error => error.code === 'REQUEST_ABORTED');
});

test('HTTP deadline also covers a response body that has not finished loading', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (_url, options) => ({ ok: true, text: () => waitForAbort(options.signal) });
  await assert.rejects(apiClient.get('/fake', { timeout: 15 }), /Hết thời gian/);
});

test('AI analysis clients forward cancellation for class and lesson requests', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const caller = new AbortController();
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), signal: options.signal });
    return { ok: true, json: async () => ({ success: true, data: { ok: true } }) };
  };
  await analyzeClassApi('fake-class', { signal: caller.signal });
  await analyzeLessonApi('fake-lesson', { signal: caller.signal });
  assert.deepEqual(calls.map(c => c.body), [{ classId: 'fake-class' }, { lessonId: 'fake-lesson' }]);
  assert.ok(calls.every(c => c.signal === caller.signal));
});

test('Spreadsheet lazy loader reuses the module and keeps the patched version', async () => {
  const [first, second] = await Promise.all([loadSpreadsheet(), loadSpreadsheet()]);
  assert.equal(first, second);
  assert.equal(first.version, '0.20.3');
});

test('Installer checks the actual installation folder before an upgrade', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../desktop/electron-builder.json', import.meta.url)));
  assert.equal(config.nsis.include, 'build/installer.nsh');
  const script = fs.readFileSync(new URL('../desktop/build/installer.nsh', import.meta.url), 'utf8');
  assert.match(script, /FileOpen \$R1 "\$R0" w/);
  assert.match(script, /\$INSTDIR\\\.EduMaster-write-probe/);
  assert.match(script, /SetErrorLevel 5\s+Quit/);
  assert.match(script, /INSTALL_LOCATION_NOT_WRITABLE/);
  assert.doesNotMatch(script, /RMDir|--delete-app-data/);
});
