const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const size = 256;
const pixels = Buffer.alloc(size * size * 4);

function blend(x, y, r, g, b, a = 255) {
  const i = (y * size + x) * 4;
  const alpha = a / 255;
  pixels[i] = Math.round(r * alpha + pixels[i] * (1 - alpha));
  pixels[i + 1] = Math.round(g * alpha + pixels[i + 1] * (1 - alpha));
  pixels[i + 2] = Math.round(b * alpha + pixels[i + 2] * (1 - alpha));
  pixels[i + 3] = Math.min(255, a + pixels[i + 3] * (1 - alpha));
}

function roundedRectDistance(x, y, left, top, right, bottom, radius) {
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const qx = Math.abs(x - cx) - ((right - left) / 2 - radius);
  const qy = Math.abs(y - cy) - ((bottom - top) / 2 - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const d = roundedRectDistance(x, y, 34, 34, 222, 222, 38);
    if (d < 0) {
      const t = (x + y) / (size * 2);
      blend(x, y, Math.round(70 + 12 * t), Math.round(96 + 16 * t), Math.round(75 + 9 * t));
    } else if (d < 3) {
      blend(x, y, 70, 96, 75, Math.round((3 - d) / 3 * 255));
    }
  }
}

const root2 = Math.sqrt(2);
for (let y = 48; y < 208; y++) {
  for (let x = 48; x < 208; x++) {
    const dx = x - 132;
    const dy = y - 126;
    const u = (dx - dy) / root2;
    const v = (dx + dy) / root2;
    const ellipse = (u / 67) ** 2 + (v / 29) ** 2;
    if (ellipse <= 1) blend(x, y, 248, 249, 242);
  }
}

for (let y = 70; y < 193; y++) {
  for (let x = 65; x < 195; x++) {
    const dx = x - 128;
    const dy = y - 132;
    const u = (dx - dy) / root2;
    const v = (dx + dy) / root2;
    const vein = Math.abs(v - 0.0026 * u * u + 5) < 3.2 && u > -50 && u < 58;
    if (vein) blend(x, y, 76, 101, 80);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

const rows = [];
for (let y = 0; y < size; y++) rows.push(Buffer.concat([Buffer.from([0]), pixels.subarray(y * size * 4, (y + 1) * size * 4)]));
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = 0;
icoHeader[7] = 0;
icoHeader[8] = 0;
icoHeader[9] = 0;
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(png.length, 14);
icoHeader.writeUInt32LE(22, 18);

const outputDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'icon.png'), png);
fs.writeFileSync(path.join(outputDir, 'icon.ico'), Buffer.concat([icoHeader, png]));
console.log('Generated LeafMD application icons.');
