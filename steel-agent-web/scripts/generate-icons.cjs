const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xEDB88320;
      else crc = crc >>> 1;
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(size, inkR, inkG, inkB, bgR, bgG, bgB) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);

  const rawData = Buffer.alloc(size * (1 + size * 3));
  const center = size / 2;
  const iconRadius = size * 0.42;
  const strokeW = Math.max(2, Math.floor(size * 0.028));

  for (let y = 0; y < size; y++) {
    const rowOff = y * (1 + size * 3);
    rawData[rowOff] = 0;
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);
      const dist = dx + dy;
      const innerDist = dist - strokeW;

      let r, g, b;
      if (dist < iconRadius && innerDist >= 0) {
        r = inkR; g = inkG; b = inkB;
      } else {
        r = bgR; g = bgG; b = bgB;
      }

      const off = rowOff + 1 + x * 3;
      rawData[off] = r;
      rawData[off + 1] = g;
      rawData[off + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const iconsDir = path.resolve(__dirname, '..', 'public', 'icons');

const ink = { r: 0x0A, g: 0x0A, b: 0x0A };
const bg = { r: 0xFF, g: 0xFF, b: 0xFF };

[192, 512].forEach((size) => {
  const png = createPNG(size, ink.r, ink.g, ink.b, bg.r, bg.g, bg.b);
  const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created: icon-${size}x${size}.png (${png.length} bytes)`);
});

console.log('\nPWA icons generated successfully!');
