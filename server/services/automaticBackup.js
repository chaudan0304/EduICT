import { createBackup, listBackups } from './backupService.js';

let running = false;
let lastError = '';
let stop = null;

export function getAutomaticBackupStatus() {
  return { enabled: true, running, keepCount: 7, lastError,
    latest: listBackups().find(b => b.kind === 'automatic') || null };
}

export function startAutomaticBackup() {
  if (stop) return stop;
  const run = async () => {
    if (running) return;
    running = true;
    try { await createBackup({ kind: 'automatic' }); lastError = ''; }
    catch (error) {
      if (error.statusCode !== 409) {
        lastError = error.message;
        console.error('[Backup] Không tạo được bản sao lưu tự động:', error.message);
      }
    } finally { running = false; }
  };
  const first = setTimeout(run, 15000);
  const timer = setInterval(run, 5 * 60 * 1000);
  first.unref?.(); timer.unref?.();
  stop = () => { clearTimeout(first); clearInterval(timer); stop = null; };
  return stop;
}
