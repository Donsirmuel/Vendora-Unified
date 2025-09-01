import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const svgPath = resolve(__dirname, '../public/icons/icon-maskable.svg');
const outDir = resolve(__dirname, '../public/icons');

const targets = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon-180.png' },
];

async function run() {
  try {
    mkdirSync(outDir, { recursive: true });
    for (const t of targets) {
      const out = resolve(outDir, t.name);
      await sharp(svgPath, { density: 512 })
        .resize(t.size, t.size, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(out);
      console.log(`✓ Generated ${t.name}`);
    }
  } catch (err) {
    console.error('Icon generation failed:', err);
    process.exit(1);
  }
}

run();
