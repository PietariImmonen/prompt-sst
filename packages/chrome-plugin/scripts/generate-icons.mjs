import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const sizes = [16, 32, 48, 64, 128];
const outputDir = join(process.cwd(), 'assets');

// Ensure assets directory exists
try {
  mkdirSync(outputDir, { recursive: true });
} catch (e) {
  // Directory already exists
}

// Create a simple blue square with white "PS" text as SVG
const createSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3B82F6" rx="${size * 0.15}"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    fill="white"
    font-family="Arial, sans-serif"
    font-weight="bold"
    font-size="${size * 0.5}">PS</text>
</svg>`;

async function generateIcons() {
  console.log('Generating icons...');

  for (const size of sizes) {
    const svg = Buffer.from(createSVG(size));
    const outputPath = join(outputDir, `icon${size}.png`);

    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created icon${size}.png`);
  }

  // Also create a default icon.png (using 128 size)
  const svg = Buffer.from(createSVG(128));
  await sharp(svg)
    .resize(128, 128)
    .png()
    .toFile(join(outputDir, 'icon.png'));

  console.log('✓ Created icon.png');
  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
