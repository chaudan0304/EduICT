import { normalizePowerPointEmbed } from './powerPointOnline.js';

export const MAX_ONLINE_BATCH_ITEMS = 200;
export const MAX_ONLINE_BATCH_TEXT = 2500000;

// One entry per line; Microsoft may format an iframe across several lines.
export function parsePowerPointOnlineBatch(input) {
  if (typeof input !== 'string' || input.length > MAX_ONLINE_BATCH_TEXT) {
    throw new Error('Danh sách quá dài. Hãy chia thành các đợt tối đa 200 bài.');
  }
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i].trim();
    if (!raw) continue;
    const line = i + 1;
    if (/<iframe\b/i.test(raw)) {
      while (!/<\/iframe\s*>/i.test(raw) && i + 1 < lines.length) raw += `\n${lines[++i]}`;
    }
    const divider = raw.indexOf('|');
    const sourceStart = raw.search(/https:\/\/|<iframe\b/i);
    const named = divider >= 0 && (sourceStart < 0 || divider < sourceStart);
    const title = named ? raw.slice(0, divider).trim() : '';
    const embed = named ? raw.slice(divider + 1).trim() : raw;
    let error = '';
    let url = '';
    try { url = normalizePowerPointEmbed(embed); }
    catch (err) { error = err.message; }
    entries.push({ line, title, embed, url, error });
    if (entries.length > MAX_ONLINE_BATCH_ITEMS) throw new Error('Mỗi lần gắn tối đa 200 bài. Hãy chia nhỏ danh sách.');
  }
  if (!entries.length) throw new Error('Hãy dán ít nhất một mã Embed hoặc URL nhúng.');
  return entries;
}
