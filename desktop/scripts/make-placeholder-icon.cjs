'use strict';
// Sinh icon PLACEHOLDER KỸ THUẬT (khối màu + chữ "E" bằng hình khối) → desktop/build/EduMaster.ico (256x256, PNG-in-ICO).
// TODO: replace production icon — đây KHÔNG phải logo thương hiệu chính thức. Thay file EduMaster.ico bằng icon thật.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const SIZE = 256;
const BG = [79, 70, 229, 255]; // indigo (màu chủ đạo của giao diện)
const FG = [255, 255, 255, 255];

function inE(x, y) {
  const left = 78, right = 182, top = 60, bottom = 196, bar = 24;
  if (x < left || x > right || y < top || y > bottom) return false;
  if (x < left + bar) return true; // thân dọc
  const mid = Math.floor((top + bottom) / 2);
  return y < top + bar || y > bottom - bar || (y >= mid - bar / 2 && y < mid + bar / 2);
}

function roundedCorner(x, y, r = 44) {
  const cx = x < r ? r : x >= SIZE - r ? SIZE - r - 1 : x;
  const cy = y < r ? r : y >= SIZE - r ? SIZE - r - 1 : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    const o = y * (SIZE * 4 + 1) + 1 + x * 4;
    const c = !roundedCorner(x, y) ? [0, 0, 0, 0] : inE(x, y) ? FG : BG;
    raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = c[3];
  }
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);

const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0; entry[1] = 0; // 0 = 256px
entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(22, 12);

const out = path.join(__dirname, '..', 'build', 'EduMaster.ico');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, entry, png]));
console.log(`Đã tạo icon placeholder: ${out} (${png.length + 22} bytes)`);
