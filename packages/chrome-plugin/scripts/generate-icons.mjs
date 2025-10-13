import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SIZES = [16, 32, 48, 64, 128];
const INPUT_ICON = resolve(__dirname, '../assets/clyo.png');
const OUTPUT_DIR = resolve(__dirname, '../assets');

async function generateIcons() {
  try {
    console.log(`Reading input icon from: ${INPUT_ICON}`);
    const image = sharp(INPUT_ICON);
    const metadata = await image.metadata();
    console.log(`Input icon format: ${metadata.format}, size: ${metadata.width}x${metadata.height}`);

    for (const size of SIZES) {
      const outputPath = resolve(OUTPUT_DIR, `icon${size}.png`);
      console.log(`Generating ${size}x${size} icon...`);
      await image
        .resize(size, size)
        .toFile(outputPath);
      console.log(`✅ Created ${outputPath}`);
    }

    console.log('🚀 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons();