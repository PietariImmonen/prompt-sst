// Simple script to create basic PNG icons for development
// In production, you should use proper icon files

const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Blue background
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(0, 0, size, size);
  
  // White text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PS', size / 2, size / 2);
  
  return canvas.toBuffer('image/png');
}

// Create icons for all required sizes
[16, 32, 48, 64, 128].forEach(size => {
  const buffer = createIcon(size);
  fs.writeFileSync(\`icon\${size}.png\`, buffer);
  console.log(\`Created icon\${size}.png\`);
});

console.log('Icons created successfully!');
