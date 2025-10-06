import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcSvg = resolve(__dirname, '../public/brand/logo-dark.svg');
const outDir = resolve(__dirname, '../public/icons');

const outputs = [
  { size: 96, filename: 'icon-96.png' },
  { size: 192, filename: 'icon-192.png' },
  { size: 256, filename: 'icon-256.png' },
  { size: 384, filename: 'icon-384.png' },
  { size: 512, filename: 'icon-512.png' },
  { size: 180, filename: 'apple-touch-icon-180.png' },
  { size: 512, filename: 'icon-maskable.png' }
];

async function run() {
  try {
    mkdirSync(outDir, { recursive: true });
    for (const { size, filename } of outputs) {
      const out = join(outDir, filename);
      await sharp(srcSvg, { density: 512 })
        .resize(size, size, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(out);
      console.log('✓ Wrote', out);
    }

    console.log('Icon generation complete (logo-dark source).');
  } catch (err) {
    console.error('Icon generation failed:', err);
    process.exit(1);
  }
}

run();
