'use strict';

// Exact file grants come only from the native picker. No presentation bytes are stored.
const fs = require('node:fs');
const path = require('node:path');

function createLinkedPresentations({ storePath }) {
  let grants = new Map();
  try {
    const saved = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    if (Array.isArray(saved)) grants = new Map(saved.filter(entry => Array.isArray(entry) && entry.length === 2 && entry.every(v => typeof v === 'string')));
  } catch (err) {
    // Corrupt/unreadable permissions fail closed. The picker can grant a file again.
    if (err.code !== 'ENOENT') grants = new Map();
  }
  const key = value => path.resolve(value).toLowerCase();
  function inspect(input) {
    if (typeof input !== 'string' || input.length > 1024 || /[\0]/.test(input) || !path.isAbsolute(input) || input.startsWith('\\\\') || input.startsWith('//') || input.indexOf(':', 2) !== -1 || !['.ppt', '.pptx'].includes(path.extname(input).toLowerCase())) {
      return { ok: false, code: 'INVALID_PRESENTATION_PATH' };
    }
    try {
      if (!fs.statSync(input).isFile()) return { ok: false, code: 'INVALID_PRESENTATION_PATH' };
      const real = fs.realpathSync(input);
      if (real.startsWith('\\\\') || !['.ppt', '.pptx'].includes(path.extname(real).toLowerCase())) return { ok: false, code: 'INVALID_PRESENTATION_PATH' };
      return { ok: true, path: real, size: fs.statSync(real).size, name: path.basename(real) };
    } catch { return { ok: false, code: 'PRESENTATION_NOT_FOUND' }; }
  }
  return {
    grant(input) {
      const result = inspect(input);
      if (!result.ok) return result;
      const next = new Map(grants);
      next.set(key(result.path), result.path);
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
      fs.writeFileSync(`${storePath}.tmp`, JSON.stringify([...next]), 'utf8');
      fs.renameSync(`${storePath}.tmp`, storePath);
      grants = next;
      return result;
    },
    validate(input) {
      if (typeof input !== 'string' || !path.isAbsolute(input) || !grants.has(key(input))) return { ok: false, code: 'INVALID_PRESENTATION_PATH' };
      const result = inspect(input);
      if (result.ok && key(result.path) !== key(grants.get(key(input)))) return { ok: false, code: 'INVALID_PRESENTATION_PATH' };
      return result;
    },
  };
}

module.exports = { createLinkedPresentations };
