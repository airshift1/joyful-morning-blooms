#!/usr/bin/env node
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, 'public', 'icon.svg');

async function generateFavicon() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(__dirname, 'public', 'favicon-32.png'));
    
    console.log('✓ Generated favicon-32.png');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateFavicon();
