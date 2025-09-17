import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcPng = resolve(__dirname, '../public/icons/icon-512.png');
const outDir = resolve(__dirname, '../public/icons');
const sizes = [96, 192, 256, 384, 512];

async function run() {
  try {
    mkdirSync(outDir, { recursive: true });
    const buf = readFileSync(srcPng);

    for (const size of sizes) {
      const out = join(outDir, `icon-${size}.png`);
      await sharp(buf).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(out);
      console.log('✓ Wrote', out);
    }

    console.log('Icon generation complete.');
  } catch (err) {
    console.error('Icon generation failed:', err);
    process.exit(1);
  }
}

run();
