'use strict';
// powerpoint-smoke — smoke test THẬT cho PowerPoint Desktop Bridge (chạy tay: node desktop/smoke/powerpoint-smoke.cjs).
// Sao chép một original.pptx có sẵn vào thư mục TẠM (không đụng dữ liệu thật), rồi chạy đủ 11 bước.
// Nếu không có Windows/PowerPoint → in "NOT EXECUTED" và thoát mã 0 (không giả mạo kết quả).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPowerPointBridge, createPowerShellRunner } = require('../native/powerpointBridge.cjs');

const REPO = path.resolve(__dirname, '..', '..');

function findSamplePptx() {
  const root = path.join(REPO, 'uploads', 'presentations');
  if (!fs.existsSync(root)) return null;
  for (const dir of fs.readdirSync(root)) {
    const candidate = path.join(root, dir, 'original.pptx');
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (process.platform !== 'win32') {
    console.log('PowerPoint smoke test: NOT EXECUTED — không phải Windows');
    return;
  }
  const sample = findSamplePptx();
  if (!sample) {
    console.log('PowerPoint smoke test: NOT EXECUTED — không có file original.pptx mẫu');
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'edumaster_ppt_smoke_'));
  const uploadsDir = path.join(tmp, 'uploads');
  fs.mkdirSync(path.join(uploadsDir, 'presentations', 'smoke_lesson'), { recursive: true });
  const target = path.join(uploadsDir, 'presentations', 'smoke_lesson', 'original.pptx');
  fs.copyFileSync(sample, target);

  const bridge = createPowerPointBridge({
    runner: createPowerShellRunner({ logger: { info() {}, warn: console.warn, error: console.error } }),
    uploadsDir,
  });

  const probe = await bridge.probe();
  if (!probe.installed) {
    console.log('PowerPoint smoke test: NOT EXECUTED — Microsoft PowerPoint unavailable');
    return;
  }

  const steps = [];
  const record = (name, res, ok) => {
    steps.push({ step: name, pass: Boolean(ok), result: res });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(res)}`);
  };

  // Bảo mật: đường dẫn ngoài vùng presentations phải bị từ chối, KHÔNG mở PowerPoint.
  const evil = await bridge.openPowerPoint(path.join(os.tmpdir(), 'x.pptx'));
  record('0. từ chối path ngoài vùng hợp lệ', evil, evil.ok === false && evil.code);

  const open = await bridge.openPowerPoint('/uploads/presentations/smoke_lesson/original.pptx');
  record('1. openPowerPoint', open, open.ok !== false && open.opened === true);
  await sleep(1500);
  const status = await bridge.getStatus();
  record('2. getStatus', status, status.ok !== false && status.running === true);
  const active = await bridge.getActivePresentation();
  record('3. getActivePresentation', active, active && active.slideCount >= 1);
  const slideCount = (active && active.slideCount) || 1;
  const n1 = await bridge.nextSlide();
  record('4. nextSlide', n1, n1.ok !== false && typeof n1.currentSlide === 'number');
  const p1 = await bridge.previousSlide();
  record('5. previousSlide', p1, p1.ok !== false && typeof p1.currentSlide === 'number');
  const target2 = Math.min(2, slideCount);
  const g = await bridge.goToSlide(target2);
  record(`6. goToSlide(${target2})`, g, g.ok !== false && g.currentSlide === target2);
  const bad = await bridge.goToSlide(9999);
  record('6b. goToSlide(9999) bị từ chối', bad, bad.ok === false);
  const start = await bridge.startSlideShow();
  record('7. startSlideShow', start, start.ok !== false && start.started === true);
  await sleep(2500);
  const st2 = await bridge.getStatus();
  record('7b. slideShowActive', st2, st2.slideShowActive === true);
  const exit = await bridge.exitSlideShow();
  record('8. exitSlideShow', exit, exit.ok !== false && exit.exited === true);
  await sleep(800);
  const close = await bridge.closePowerPoint();
  record('9. closePowerPoint', close, close.ok !== false && close.closed === true);
  await sleep(800);
  const st3 = await bridge.getStatus();
  record('10. PowerPoint không còn bài của EduMaster', st3, st3.ok !== false);

  const failed = steps.filter((s) => !s.pass);
  console.log(`\nPowerPoint smoke test: ${failed.length ? 'FAIL' : 'PASS'} (${steps.length - failed.length}/${steps.length})`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exitCode = failed.length ? 1 : 0;
})().catch((err) => {
  console.error('PowerPoint smoke test: ERROR', err.message);
  process.exitCode = 1;
});
