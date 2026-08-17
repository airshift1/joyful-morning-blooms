#!/usr/bin/env node
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgPath = path.join(__dirname, 'public', 'icon.svg');
const iconSizes = [180, 192, 512];

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const size of iconSizes) {
      await sharp(svgBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toFile(path.join(__dirname, 'public', `icon-${size}.png`));
      
      console.log(`✓ Generated icon-${size}.png`);
    }
    
    console.log('✓ All icons generated successfully');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
