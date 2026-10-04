'use strict';
// installed-e2e — kiểm chứng BẢN ĐÃ CÀI (Phase 12.1). Chạy EduMaster.exe thật với --user-data-dir cô lập, điều khiển renderer
// qua Chrome DevTools Protocol (--remote-debugging-port; KHÔNG sửa mã ứng dụng), kiểm tra dữ liệu bằng node:sqlite sau khi app đóng.
//
//   node desktop/smoke/installed-e2e.cjs <installDir> <userDataDir> <step> [--sample=<original.pptx>] [--legacy-dir=<dir>]
//   step: seed | verify | ppt | pptneg | backup | migrate
// Mọi dữ liệu nằm trong userDataDir do người gọi cung cấp (thư mục TẠM). Không bao giờ dùng %APPDATA%\EduMaster.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const [installDir, userData, step] = process.argv.slice(2);
const argv = process.argv.slice(5);
const arg = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || null;
if (!installDir || !userData || !step) {
  console.error('usage: installed-e2e.cjs <installDir> <userDataDir> <step>');
  process.exit(2);
}
if (/AppData[\\/]Roaming[\\/]EduMaster/i.test(path.resolve(userData))) {
  console.error('REFUSED: không dùng thư mục dữ liệu thật %APPDATA%\\EduMaster');
  process.exit(2);
}

const dataDir = path.join(userData, 'data');
const statePath = path.join(userData, 'p121-state.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const readState = () => { try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { return {}; } };
const writeState = (s) => fs.writeFileSync(statePath, JSON.stringify(s, null, 2));
const report = {};

async function httpJson(url) {
  const r = await fetch(url);
  return r.json();
}

async function launch(extraArgs = []) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const env = { ...process.env, EDUICT_SKIP_MIGRATION: step === 'migrate' ? '0' : '1' };
  delete env.EDUICT_DATA_DIR;
  delete env.EDUICT_DB_PATH;
  const child = spawn(path.join(installDir, 'EduMaster.exe'), [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`, ...extraArgs], { env, stdio: 'ignore', windowsHide: false });
  const exited = new Promise((r) => child.once('exit', (code) => r(code)));
  let target = null;
  for (let i = 0; i < 120 && !target; i++) {
    await sleep(500);
    try {
      const list = await httpJson(`http://127.0.0.1:${port}/json/list`);
      target = list.find((t) => t.type === 'page' && /^http:\/\/127\.0\.0\.1:\d+/.test(t.url));
    } catch { /* chưa sẵn sàng */ }
  }
  if (!target) { child.kill(); throw new Error('không tìm thấy cửa sổ renderer'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception || r.result.exceptionDetails).slice(0, 400));
    return r.result.result.value;
  };
  for (let i = 0; i < 60; i++) {
    if (await ev("!!(document.getElementById('root') && document.getElementById('root').children.length)")) break;
    await sleep(300);
  }
  const close = async () => {
    try { await ev('window.close()'); } catch { /* cửa sổ đóng */ }
    const code = await Promise.race([exited, sleep(20000).then(() => 'timeout')]);
    if (code === 'timeout') { child.kill(); return 'killed'; }
    try { ws.close(); } catch { /* đã đóng */ }
    return code;
  };
  return { ev, close, child };
}

const J = `const j = async (u, init) => { const r = await fetch(u, init); let b = null; try { b = await r.json(); } catch {} return { status: r.status, body: b }; };`;
const post = (u, body) => `j(${JSON.stringify(u)}, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(${JSON.stringify(body)}) })`;

function dbCheck() {
  const file = path.join(dataDir, 'edumaster.sqlite');
  if (!fs.existsSync(file)) return { exists: false };
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const q = (s) => db.prepare(s).all();
    return {
      exists: true,
      integrity: q('PRAGMA integrity_check')[0].integrity_check,
      classes: q('SELECT COUNT(*) n FROM classes')[0].n,
      students: q('SELECT COUNT(*) n FROM students')[0].n,
      lessons: q('SELECT COUNT(*) n FROM lessons')[0].n,
    };
  } finally { db.close(); }
}

async function run() {
  const state = readState();
  if (step === 'seed') {
    const sample = arg('sample');
    const b64 = fs.readFileSync(sample).toString('base64');
    const app = await launch();
    const out = await app.ev(`(async () => { ${J}
      const cls = await ${post('/api/classes', { id: 'p121_class', name: 'Lớp 12.1', grade: 3, subject: 'Tin học', schoolYear: '2025 - 2026', students: [1, 2, 3].map((n) => ({ id: `P121S${n}`, name: `Học sinh ${n}`, gender: n % 2 ? 'Nam' : 'Nữ', machineNumber: n, stars: n, attendance: 'present' })) })};
      const les = await ${post('/api/lessons/import-fast', { fileName: 'p121.pptx', fileBase64: '__B64__', title: 'Bài 12.1', grade: 3, subject: 'Tin học', allowDuplicate: true }).replace('"__B64__"', JSON.stringify(b64))};
      const bk = await j('/api/backup/create', { method: 'POST' });
      return { cls: cls.status, les: les.status, lesBody: les.body && { id: les.body.id || (les.body.lesson && les.body.lesson.id), keys: Object.keys(les.body || {}) }, bk: bk.status, backupId: bk.body && bk.body.backupId };
    })()`);
    report.seed = out;
    const lessons = await app.ev(`fetch('/api/lessons').then(r => r.json())`);
    const lesson = (Array.isArray(lessons) ? lessons : lessons.lessons || []).find((l) => l.title === 'Bài 12.1');
    report.lesson = lesson && { id: lesson.id, source_file_path: lesson.source_file_path };
    report.exit = await app.close();
    await sleep(1500);
    if (lesson) {
      const pptx = path.join(dataDir, 'uploads', 'presentations', lesson.id, 'original.pptx');
      report.pptxExists = fs.existsSync(pptx);
      state.pptx = { lessonId: lesson.id, path: pptx, sha: report.pptxExists ? sha(pptx) : null, srcSha: sha(sample) };
      report.pptxMatchesSource = state.pptx.sha === state.pptx.srcSha;
    }
    const envFile = path.join(dataDir, 'settings', '.env');
    fs.appendFileSync(envFile, '\n# p121-marker\n');
    state.settingsSha = sha(envFile);
    state.backupId = out.backupId;
    report.db = dbCheck();
    state.dbSha = sha(path.join(dataDir, 'edumaster.sqlite'));
    state.counts = report.db;
    writeState(state);
  } else if (step === 'verify' || step === 'backup') {
    const app = await launch();
    report.health = await app.ev(`fetch('/api/health').then(r => r.json())`);
    const data = await app.ev(`(async () => { ${J}
      const classes = (await j('/api/classes')).body || [];
      const lessons = (await j('/api/lessons')).body;
      const list = (await j('/api/backup/list')).body;
      let created = null, verified = null;
      if (${step === 'backup'}) {
        created = (await j('/api/backup/create', { method: 'POST' })).body;
        verified = (await ${post('/api/backup/verify', { backupId: '__ID__' })}).body;
      }
      return { classes: classes.map(c => ({ id: c.id, students: (c.students || []).length })), lessons: (Array.isArray(lessons) ? lessons : lessons.lessons || []).map(l => ({ id: l.id, title: l.title, source: l.source_file_path })), list, created };
    })()`);
    report.data = data;
    const listArr = Array.isArray(data.list) ? data.list : (data.list && (data.list.data || data.list.backups)) || [];
    const ids = listArr.map((b) => b.id || b.backupId);
    report.backupStillListed = state.backupId ? ids.includes(state.backupId) : null;
    if (step === 'backup' && data.created && data.created.backupId) {
      const v = await app.ev(`fetch('/api/backup/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backupId: ${JSON.stringify(data.created.backupId)} }) }).then(r => r.json())`);
      report.verify = v;
      state.backupId2 = data.created.backupId;
    }
    report.exit = await app.close();
    await sleep(1500);
    report.db = dbCheck();
    if (state.pptx) {
      report.pptxExists = fs.existsSync(state.pptx.path);
      report.pptxHashUnchanged = report.pptxExists && sha(state.pptx.path) === state.pptx.sha;
    }
    report.settingsHashUnchanged = state.settingsSha ? sha(path.join(dataDir, 'settings', '.env')) === state.settingsSha : null;
    report.countsUnchanged = state.counts ? ['classes', 'students', 'lessons'].every((k) => report.db[k] === state.counts[k]) : null;
    report.dbHashUnchangedAfterRun = state.dbSha ? sha(path.join(dataDir, 'edumaster.sqlite')) === state.dbSha : null;
    const mig = path.join(userData, 'migration-backups');
    report.updateBackups = fs.existsSync(mig) ? fs.readdirSync(mig) : [];
    writeState(state);
  } else if (step === 'ppt') {
    const rel = `/uploads/presentations/${state.pptx.lessonId}/original.pptx`;
    const app = await launch();
    const out = await app.ev(`(async () => {
      const b = window.eduMaster.desktop.bridge; const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const r = [];
      const t = async (name, fn) => { const t0 = Date.now(); let v; try { v = await fn(); } catch (e) { v = { thrown: String(e && e.message) }; } r.push({ name, ms: Date.now() - t0, v }); await sleep(name === 'startSlideShow' ? 2000 : 1200); };
      r.push({ name: 'capabilities', v: await window.eduMaster.desktop.getCapabilities() });
      await t('openPowerPoint', () => b.openPowerPoint(${JSON.stringify(rel)}));
      await t('getStatus', () => b.getStatus());
      await t('getActivePresentation', () => b.getActivePresentation());
      await t('nextSlide', () => b.nextSlide());
      await t('previousSlide', () => b.previousSlide());
      await t('goToSlide(2)', () => b.goToSlide(2));
      await t('startSlideShow', () => b.startSlideShow());
      await t('nextSlide(show)', () => b.nextSlide());
      await t('exitSlideShow', () => b.exitSlideShow());
      await t('closePowerPoint', () => b.closePowerPoint());
      return r;
    })()`);
    report.steps = out;
    report.exit = await app.close();
  } else if (step === 'pptneg') {
    const app = await launch();
    const out = await app.ev(`(async () => {
      const b = window.eduMaster.desktop.bridge; const r = {};
      const t = async (k, fn) => { try { r[k] = await fn(); } catch (e) { r[k] = { thrown: String(e && e.message) }; } };
      await t('A_missing_original', () => b.openPowerPoint('/uploads/presentations/khong_ton_tai/original.pptx'));
      await t('C_outside_abs', () => b.openPowerPoint('C:\\\\Windows\\\\win.ini'));
      await t('C_outside_unc', () => b.openPowerPoint('\\\\\\\\server\\\\share\\\\x.pptx'));
      await t('C_traversal', () => b.openPowerPoint('/uploads/../../Windows/x.pptx'));
      await t('C_wrong_ext', () => b.openPowerPoint('/uploads/presentations/x/original.exe'));
      const t0 = Date.now();
      const res = await Promise.all([b.getStatus(), b.getStatus(), b.getStatus()]);
      r.D_concurrent = { ms: Date.now() - t0, results: res };
      return r;
    })()`);
    report.cases = out;
    report.exit = await app.close();
  } else if (step === 'crash') {
    const app = await launch();
    report.created = await app.ev(`(async () => { ${J}
      const r = await ${post('/api/classes', { id: 'p122_crash', name: 'Lớp 12.2 crash', grade: 3, subject: 'Tin học', schoolYear: '2025 - 2026', students: [{ id: 'P122C1', name: 'Crash 1', gender: 'Nam', machineNumber: 1, stars: 0, attendance: 'present' }] })};
      return r.status; })()`);
    await sleep(2000); // chờ SQLite commit xong rồi mới kill
    const { execFileSync } = require('node:child_process');
    try { execFileSync('taskkill', ['/F', '/T', '/PID', String(app.child.pid)], { stdio: 'ignore' }); } catch { /* đã thoát */ }
    report.afterKill = dbCheck();
    if (report.afterKill && report.afterKill.exists) {
      state.counts = report.afterKill;
      state.dbSha = sha(path.join(dataDir, 'edumaster.sqlite'));
      writeState(state);
    }
  } else if (step === 'migrate') {
    const legacy = arg('legacy-dir');
    const app = await launch([`--legacy-dir=${legacy}`]);
    report.health = await app.ev(`fetch('/api/health').then(r => r.json())`);
    report.exit = await app.close();
    await sleep(1500);
    report.db = dbCheck();
    const mf = path.join(userData, 'migration-state.json');
    report.marker = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : null;
  }
  console.log(JSON.stringify(report, null, 1));
}

run().catch((e) => { console.error('E2E ERROR:', e.message); console.log(JSON.stringify(report, null, 1)); process.exit(1); });
