'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function createPresentationFolderPicker({ dialog, getWindow = () => undefined, linkedPresentations }) {
  let scan = null;
  const key = file => path.resolve(file).toLowerCase();
  const denied = () => ({ ok: false, code: 'DESKTOP_PERMISSION_DENIED', message: 'Hãy chọn lại thư mục và chỉ xác nhận những file trong danh sách đã tìm thấy.' });
  return {
    async pick({ names } = {}) {
      scan = null;
      if (!Array.isArray(names) || !names.length || names.length > 200 || names.some(name => typeof name !== 'string' || name.length > 250 || /[\\/:<>"|?*]/.test(name) || !/\.pptx?$/i.test(name))) throw new Error('Danh sách tên file không hợp lệ.');
      const selected = await dialog.showOpenDialog(getWindow(), { title: 'Tìm lại PowerPoint trong thư mục', properties: ['openDirectory'] });
      if (selected.canceled || !selected.filePaths?.length) return { ok: true, canceled: true, files: [] };
      const root = fs.realpathSync(selected.filePaths[0]);
      if (root.startsWith('\\\\') || root.startsWith('//')) return denied();
      const wanted = new Set(names.map(name => name.toLowerCase()));
      const files = []; const queue = [{ directory: root, depth: 0 }];
      let visited = 0; let truncated = false;
      while (queue.length && visited < 10000 && files.length < 500) {
        const { directory, depth } = queue.shift();
        let entries;
        try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { continue; }
        for (const entry of entries) {
          if (++visited > 10000 || files.length >= 500) { truncated = true; break; }
          if (entry.isSymbolicLink()) continue;
          const file = path.join(directory, entry.name);
          if (entry.isDirectory()) { if (depth < 8) queue.push({ directory: file, depth: depth + 1 }); else truncated = true; }
          else if (entry.isFile() && wanted.has(entry.name.toLowerCase())) {
            try {
              const real = fs.realpathSync(file);
              const relative = path.relative(root, real);
              if (relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) files.push({ path: real, name: entry.name, size: fs.statSync(real).size });
            } catch { /* File moved or unreadable. */ }
          }
        }
      }
      truncated ||= queue.length > 0;
      scan = { id: randomUUID(), files: new Map(files.map(file => [key(file.path), file])) };
      return { ok: true, canceled: false, scanId: scan.id, files, truncated };
    },
    approve({ scanId, paths } = {}) {
      if (!scan || scan.id !== scanId || !Array.isArray(paths) || !paths.length || paths.length > 200 || !linkedPresentations) return denied();
      const selected = [];
      for (const file of paths) {
        if (typeof file !== 'string' || !scan.files.has(key(file))) return denied();
        try { if (key(fs.realpathSync(file)) !== key(file)) return denied(); } catch { return denied(); }
        selected.push(file);
      }
      for (const file of new Set(selected)) { const result = linkedPresentations.grant(file); if (!result.ok) return denied(); }
      scan = null;
      return { ok: true };
    },
  };
}
module.exports = { createPresentationFolderPicker };
