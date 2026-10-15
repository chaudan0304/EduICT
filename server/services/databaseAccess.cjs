'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const held = new Set();
const users = new Map();
function layout(database) {
  const id = createHash('sha256').update(path.resolve(database).toLowerCase()).digest('hex').slice(0, 20);
  const root = path.join(path.dirname(database), 'locks', `database-${id}`);
  fs.mkdirSync(root, { recursive: true });
  return { root, mutex: path.join(root, 'registry.lock'), user: path.join(root, `${process.pid}.json`) };
}
function alive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}
function locked(database, operation) {
  const files = layout(database);
  if (held.has(files.mutex)) return operation(files);
  const deadline = Date.now() + 5000;
  const token = randomUUID();
  for (;;) {
    try { fs.writeFileSync(files.mutex, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' }); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const owner = JSON.parse(fs.readFileSync(files.mutex, 'utf8'));
        if (!alive(owner.pid)) { fs.unlinkSync(files.mutex); continue; }
      } catch (readError) { if (readError.code === 'ENOENT') continue; }
      if (Date.now() >= deadline) throw Object.assign(new Error('Kho dữ liệu đang bảo trì. Hãy thử lại sau.'), { statusCode: 409, code: 'DATABASE_BUSY' });
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  held.add(files.mutex);
  try { return operation(files); }
  finally {
    held.delete(files.mutex);
    try { if (JSON.parse(fs.readFileSync(files.mutex, 'utf8')).token === token) fs.unlinkSync(files.mutex); } catch { /* Preserve another owner's lock. */ }
  }
}

process.once('exit', () => { for (const file of users.values()) { try { fs.unlinkSync(file); } catch { /* Already released. */ } } });
function registerDatabaseUser(database) {
  return locked(database, files => {
    fs.writeFileSync(files.user, JSON.stringify({ pid: process.pid }));
    users.set(path.resolve(database), files.user);
    return () => locked(database, () => { try { fs.unlinkSync(files.user); } catch (error) { if (error.code !== 'ENOENT') throw error; } users.delete(path.resolve(database)); });
  });
}
function withDatabaseMaintenance(database, operation) {
  return locked(database, files => {
    for (const name of fs.readdirSync(files.root).filter(name => /^\d+\.json$/.test(name))) {
      const pid = Number(name.slice(0, -5));
      if (pid !== process.pid && alive(pid)) throw Object.assign(new Error('Hãy đóng cả bản web và desktop còn lại trước khi khôi phục dữ liệu.'), { statusCode: 409, code: 'DATABASE_IN_USE' });
      if (!alive(pid)) fs.unlinkSync(path.join(files.root, name));
    }
    return operation();
  });
}
module.exports = { registerDatabaseUser, withDatabaseMaintenance };
