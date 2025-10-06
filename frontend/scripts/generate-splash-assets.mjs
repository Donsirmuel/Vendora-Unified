import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDir = path.resolve("public", "splash");

const variants = [
  { name: "splash.png", width: 2048, height: 2732 },
  { name: "13__iPad_Pro_M4_portrait.png", width: 2064, height: 2752 },
  { name: "iPhone_17_Pro__iPhone_17__iPhone_16_Pro_portrait.png", width: 1206, height: 2622 },
  { name: "iPhone_11__iPhone_XR_landscape.png", width: 1792, height: 828 }
];

const colors = {
  deep: "#071621",
  dark: "#0C2231",
  mid: "#103445",
  accent: "#0EA5B7",
  accentSoft: "#4CD7F0",
  textPrimary: "#F9FBFD",
  textSecondary: "#D4E6EE"
};

function buildSvg(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const circleRadius = Math.min(width, height) * 0.12;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.dark}"/>
      <stop offset="55%" stop-color="${colors.deep}"/>
      <stop offset="100%" stop-color="${colors.mid}"/>
    </linearGradient>
    <radialGradient id="glow-1" cx="15%" cy="20%" r="55%">
      <stop offset="0%" stop-color="${colors.accentSoft}" stop-opacity="0.85" />
      <stop offset="65%" stop-color="${colors.accent}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${colors.accent}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glow-2" cx="85%" cy="80%" r="60%">
      <stop offset="0%" stop-color="${colors.accent}" stop-opacity="0.75" />
      <stop offset="45%" stop-color="${colors.accent}" stop-opacity="0.05" />
      <stop offset="100%" stop-color="${colors.accent}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="badge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.accent}" stop-opacity="0.85" />
      <stop offset="100%" stop-color="${colors.accentSoft}" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>
  <rect width="${width}" height="${height}" fill="url(#glow-1)"/>
  <rect width="${width}" height="${height}" fill="url(#glow-2)"/>
  <g transform="translate(${centerX}, ${centerY})">
    <circle r="${circleRadius}" fill="rgba(14,165,183,0.18)" />
    <circle r="${circleRadius * 0.72}" fill="rgba(14,165,183,0.85)" />
    <text text-anchor="middle" dominant-baseline="central" fill="${colors.deep}" font-family="'Inter','Segoe UI',sans-serif" font-size="${circleRadius * 0.85}" font-weight="700">V</text>
  </g>
  <g transform="translate(${centerX}, ${centerY + circleRadius * 1.9})" text-anchor="middle">
    <text fill="${colors.textPrimary}" font-family="'Inter','Segoe UI',sans-serif" font-size="${Math.min(width, height) * 0.05}" font-weight="600" letter-spacing="0.04em">VENDORA</text>
    <text y="${Math.min(width, height) * 0.08}" fill="${colors.textSecondary}" font-family="'Inter','Segoe UI',sans-serif" font-size="${Math.min(width, height) * 0.028}" font-weight="400">Preparing your vendor desk</text>
  </g>
  <g transform="translate(${centerX}, ${centerY - circleRadius * 3.2})">
    <rect x="${-Math.min(width, height) * 0.18}" y="${-Math.min(width, height) * 0.032}" width="${Math.min(width, height) * 0.36}" height="${Math.min(width, height) * 0.064}" rx="${Math.min(width, height) * 0.032}" fill="url(#badge-gradient)" opacity="0.85" />
    <text x="0" y="${Math.min(width, height) * 0.008}" text-anchor="middle" fill="${colors.deep}" font-family="'Inter','Segoe UI',sans-serif" font-size="${Math.min(width, height) * 0.026}" font-weight="600" letter-spacing="0.14em">VENDOR DESK</text>
  </g>
</svg>`;
}

async function generate() {
  await mkdir(outputDir, { recursive: true });
  for (const variant of variants) {
    const svg = buildSvg(variant.width, variant.height);
    const svgPath = path.join(outputDir, `${variant.name.replace(/\.png$/, '')}.svg`);
    await writeFile(svgPath, svg, "utf-8");
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outputDir, variant.name));
    console.log(`Generated ${variant.name} (${variant.width}x${variant.height})`);
  }
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
