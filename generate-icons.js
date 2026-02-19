const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Brand colors
const PRIMARY_COLOR = '#e94560';
const BACKGROUND_COLOR = '#1a1a2e';
const TEXT_COLOR = '#ffffff';

// Create SVG for the icon
function createIconSVG(size) {
  const fontSize = size * 0.4;
  const cornerRadius = size * 0.15;
  const padding = size * 0.15;
  
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c73e54;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bgGradient)"/>
  
  <!-- Accent circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="none" stroke="url(#accentGradient)" stroke-width="${size * 0.04}"/>
  
  <!-- Inner circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.22}" fill="url(#accentGradient)"/>
  
  <!-- TOC Text -->
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.18}" fill="white">
    TOC
  </text>
</svg>
  `.trim();
}

// Create SVG for splash screen
function createSplashSVG(width, height) {
  const iconSize = Math.min(width, height) * 0.4;
  
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c73e54;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- Accent circle -->
  <circle cx="${width/2}" cy="${height/2}" r="${iconSize * 0.5}" fill="none" stroke="url(#accentGradient)" stroke-width="${iconSize * 0.06}"/>
  
  <!-- Inner circle -->
  <circle cx="${width/2}" cy="${height/2}" r="${iconSize * 0.3}" fill="url(#accentGradient)"/>
  
  <!-- TOC Text -->
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${iconSize * 0.25}" fill="white">
    TOC
  </text>
  
  <!-- App name below -->
  <text x="50%" y="${height/2 + iconSize * 0.7}" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="600" font-size="${iconSize * 0.12}" fill="#888">
    TheRealTOC
  </text>
</svg>
  `.trim();
}

// Create SVG for feature graphic (Google Play)
function createFeatureGraphicSVG(width, height) {
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f0f1a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c73e54;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- Decorative circles -->
  <circle cx="${width * 0.15}" cy="${height * 0.5}" r="${height * 0.3}" fill="none" stroke="#e94560" stroke-width="2" opacity="0.3"/>
  <circle cx="${width * 0.85}" cy="${height * 0.5}" r="${height * 0.25}" fill="none" stroke="#e94560" stroke-width="2" opacity="0.2"/>
  
  <!-- Icon -->
  <g transform="translate(${width * 0.2}, ${height * 0.5})">
    <circle cx="0" cy="0" r="${height * 0.25}" fill="none" stroke="url(#accentGradient)" stroke-width="${height * 0.03}"/>
    <circle cx="0" cy="0" r="${height * 0.15}" fill="url(#accentGradient)"/>
    <text x="0" y="0" dominant-baseline="middle" text-anchor="middle" 
          font-family="Arial, sans-serif" font-weight="bold" font-size="${height * 0.12}" fill="white">
      TOC
    </text>
  </g>
  
  <!-- Text -->
  <text x="${width * 0.45}" y="${height * 0.4}" dominant-baseline="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${height * 0.18}" fill="white">
    TheRealTOC
  </text>
  <text x="${width * 0.45}" y="${height * 0.6}" dominant-baseline="middle" 
        font-family="Arial, sans-serif" font-weight="normal" font-size="${height * 0.08}" fill="#888">
    Pool League Management
  </text>
</svg>
  `.trim();
}

async function generateIcons() {
  console.log('🎨 Generating icons for TheRealTOC...\n');
  
  const assetsDir = path.join(__dirname, 'assets');
  
  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Generate main icon (1024x1024)
  console.log('📱 Generating main app icon...');
  const iconSvg = createIconSVG(1024);
  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('  ✓ icon.png (1024x1024)');
  
  // Generate source-icon.png (for future reference)
  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(path.join(assetsDir, 'source-icon.png'));
  console.log('  ✓ source-icon.png (1024x1024)');
  
  // Generate adaptive icon foreground (Android)
  const adaptiveSvg = createIconSVG(432);
  await sharp(Buffer.from(adaptiveSvg))
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('  ✓ adaptive-icon.png (432x432)');
  
  // Generate adaptive icon background
  const bgSvg = `<svg width="432" height="432" xmlns="http://www.w3.org/2000/svg">
    <rect width="432" height="432" fill="${BACKGROUND_COLOR}"/>
  </svg>`;
  await sharp(Buffer.from(bgSvg))
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon-bg.png'));
  console.log('  ✓ adaptive-icon-bg.png (432x432)');
  
  // Generate monochrome icon (Android 13+ themed icons)
  const monoSvg = `
<svg width="432" height="432" xmlns="http://www.w3.org/2000/svg">
  <circle cx="216" cy="216" r="150" fill="none" stroke="white" stroke-width="25"/>
  <circle cx="216" cy="216" r="95" fill="white"/>
  <text x="216" y="216" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="80" fill="black">
    TOC
  </text>
</svg>`;
  await sharp(Buffer.from(monoSvg))
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon-mono.png'));
  console.log('  ✓ adaptive-icon-mono.png (432x432)');
  
  // Generate iOS dark icon
  const darkSvg = createIconSVG(1024).replace(/#e94560/g, '#c73e54').replace(/#1a1a2e/g, '#0f0f1a');
  await sharp(Buffer.from(darkSvg))
    .png()
    .toFile(path.join(assetsDir, 'ios-icon-dark.png'));
  console.log('  ✓ ios-icon-dark.png (1024x1024)');
  
  // Generate iOS tinted icon
  const tintedSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="white"/>
  <circle cx="512" cy="512" r="350" fill="none" stroke="black" stroke-width="40"/>
  <circle cx="512" cy="512" r="220" fill="black"/>
  <text x="512" y="512" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="180" fill="white">
    TOC
  </text>
</svg>`;
  await sharp(Buffer.from(tintedSvg))
    .png()
    .toFile(path.join(assetsDir, 'ios-icon-tinted.png'));
  console.log('  ✓ ios-icon-tinted.png (1024x1024)');
  
  // Generate splash screen (2048x2048)
  console.log('\n🌊 Generating splash screens...');
  const splashSvg = createSplashSVG(2048, 2048);
  await sharp(Buffer.from(splashSvg))
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('  ✓ splash.png (2048x2048)');
  
  // Generate smaller splash for compatibility
  const splashIconSvg = createSplashSVG(1242, 1242);
  await sharp(Buffer.from(splashIconSvg))
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('  ✓ splash-icon.png (1242x1242)');
  
  // Generate favicon (32x32)
  console.log('\n🌐 Generating favicon...');
  const faviconSvg = createIconSVG(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('  ✓ favicon.png (32x32)');
  
  // Generate feature graphic for Google Play (1024x500)
  console.log('\n🎨 Generating Google Play feature graphic...');
  const featureSvg = createFeatureGraphicSVG(1024, 500);
  await sharp(Buffer.from(featureSvg))
    .png()
    .toFile(path.join(assetsDir, 'feature-graphic.png'));
  console.log('  ✓ feature-graphic.png (1024x500)');
  
  // Generate Play Store icon (512x512)
  console.log('\n🤖 Generating Play Store icon...');
  const playIconSvg = createIconSVG(512);
  await sharp(Buffer.from(playIconSvg))
    .png()
    .toFile(path.join(assetsDir, 'play-store-icon.png'));
  console.log('  ✓ play-store-icon.png (512x512)');
  
  console.log('\n✅ All icons generated successfully!');
  console.log('\nGenerated files:');
  const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png'));
  files.forEach(f => {
    const stats = fs.statSync(path.join(assetsDir, f));
    console.log(`  - ${f} (${Math.round(stats.size / 1024)}KB)`);
  });
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
