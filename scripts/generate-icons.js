const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunk checksums
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lengthBuf, toCrc, crcBuf]);
}

function createPng(size, primaryColor, accentColor) {
  // RGBA buffer
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));

  const [pr, pg, pb] = primaryColor;
  const [ar, ag, ab] = accentColor;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle background
      const radius = size * 0.22;
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);

      let inBounds = true;
      if (dx < radius && dy < radius) {
        const dist = Math.hypot(radius - dx, radius - dy);
        if (dist > radius) {
          inBounds = false;
        }
      }

      if (!inBounds) {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Inside icon boundary: base gradient background (#0A66C2 to #0284C7)
      const t = (x + y) / (width + height);
      let r = Math.round(pr * (1 - t * 0.3));
      let g = Math.round(pg * (1 - t * 0.2));
      let b = Math.round(pb * (1 - t * 0.1));
      let a = 255;

      // Draw Bookmark / Job Briefcase icon symbol
      // Normalize coordinate between 0 and 1
      const nx = x / width;
      const ny = y / height;

      // Briefcase shape: center area from 0.25 to 0.75
      const inHandle = (nx >= 0.40 && nx <= 0.60 && ny >= 0.24 && ny <= 0.34);
      const inHandleHole = (nx >= 0.44 && nx <= 0.56 && ny >= 0.28 && ny <= 0.34);
      const inBody = (nx >= 0.26 && nx <= 0.74 && ny >= 0.34 && ny <= 0.76);
      const inStrap = (nx >= 0.26 && nx <= 0.74 && ny >= 0.50 && ny <= 0.55);
      const inLatch = (nx >= 0.46 && nx <= 0.54 && ny >= 0.49 && ny <= 0.58);

      if ((inHandle && !inHandleHole) || inBody) {
        if (inStrap && !inLatch) {
          // Darker accent band
          r = Math.round(r * 0.85);
          g = Math.round(g * 0.85);
          b = Math.round(b * 0.85);
        } else if (inLatch) {
          // Golden / Bright Cyan Latch
          r = ar;
          g = ag;
          b = ab;
        } else {
          // White symbol for maximum contrast
          r = 255;
          g = 255;
          b = 255;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression deflate
  ihdr[11] = 0; // Filter adaptive
  ihdr[12] = 0; // No interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '../assets/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Brand colors: LinkedIn Navy/Blue [10, 102, 194] and High-Contrast Sky Cyan [56, 189, 248]
const primary = [10, 102, 194];
const accent = [56, 189, 248];

[16, 48, 128].forEach(size => {
  const png = createPng(size, primary, accent);
  const dest = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`Generated ${dest} (${size}x${size}, ${png.length} bytes)`);
});
