import fs from 'node:fs';
import sharp from 'sharp';

async function generateIcons() {
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  const svgBuffer = fs.readFileSync('public/icon.svg');
  const sizes = [16, 32, 48, 72, 96, 128, 144, 192, 256, 384, 512];

  for (const s of sizes) {
    await sharp(svgBuffer).resize(s, s).png().toFile(`public/icon-${s}.png`);
  }

  await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');

  // Maskable icon with safe zone
  const resized = await sharp(svgBuffer).resize(410, 410).png().toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 224, g: 242, b: 254, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile('public/icon-maskable-512.png');

  // Generate multi-size favicon.ico
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  const images = [
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width, 0);
    entry.writeUInt8(img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  fs.writeFileSync('app/favicon.ico', icoBuffer);

  console.log('All icons and favicon.ico generated successfully!');
}

generateIcons().catch(console.error);
