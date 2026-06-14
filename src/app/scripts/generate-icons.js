// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = [192, 512, 180]; // 180 untuk apple-touch-icon
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Pastikan folder ada
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate icon dari SVG
async function generateIcons() {
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22d3ee"/>
          <stop offset="50%" style="stop-color:#3b82f6"/>
          <stop offset="100%" style="stop-color:#6366f1"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#grad)" rx="80"/>
      <text x="256" y="320" font-size="200" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">
        F
      </text>
    </svg>
  `;

  for (const size of ICON_SIZES) {
    const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png({ quality: 90 })
      .toFile(path.join(OUTPUT_DIR, filename));
    
    console.log(`✅ Generated ${filename}`);
  }
}

generateIcons().catch(console.error);