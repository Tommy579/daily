/**
 * Génère les icônes de l'application (PWA, iOS, favicons) à partir du design de favicon.svg.
 * Usage : node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

const FONT_FAMILY =
  "'Source Serif 4 Variable', 'Source Serif Pro', 'Source Serif 4', Georgia, 'DejaVu Serif', 'Times New Roman', serif";

// Couleur d'arrière-plan très sombre pour le mode teinté / sombre d'iOS et PWA
const APP_ICON_BG = '#121214';
// Glyphe "M" blanc pur (luminance 100%) pour que le moteur de teinte iOS le colore correctement
const APP_ICON_FG = '#ffffff';

async function generate() {
  console.log('Génération des icônes pour PWA et mobile...');

  // 1. favicon-32x32.png (fallback navigateur avec coins arrondis comme le SVG d'origine)
  const faviconSvg = fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ public/favicon-32x32.png (32x32)');

  // 2. apple-touch-icon.png (180x180, fond plein #121214 sans rx, lettre M #ffffff avec >30px de marge)
  const appleTouchSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${APP_ICON_BG}" />
  <text x="90" y="130" text-anchor="middle"
        font-family="${FONT_FAMILY}"
        font-style="italic" font-weight="700" font-size="124" fill="${APP_ICON_FG}">M</text>
</svg>`;
  await sharp(Buffer.from(appleTouchSvg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ public/apple-touch-icon.png (180x180)');

  // 3. icon-192.png (192x192, fond plein #121214, lettre M #ffffff)
  const icon192Svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="${APP_ICON_BG}" />
  <text x="96" y="139" text-anchor="middle"
        font-family="${FONT_FAMILY}"
        font-style="italic" font-weight="700" font-size="132" fill="${APP_ICON_FG}">M</text>
</svg>`;
  await sharp(Buffer.from(icon192Svg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ public/icon-192.png (192x192)');

  // 4. icon-512.png (512x512, fond plein #121214 et lettre M #ffffff dans la zone maskable 80%)
  const icon512Svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${APP_ICON_BG}" />
  <text x="256" y="368" text-anchor="middle"
        font-family="${FONT_FAMILY}"
        font-style="italic" font-weight="700" font-size="350" fill="${APP_ICON_FG}">M</text>
</svg>`;
  await sharp(Buffer.from(icon512Svg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ public/icon-512.png (512x512)');

  console.log('Toutes les icônes ont été générées avec succès !');
}

generate().catch((err) => {
  console.error('Erreur lors de la génération des icônes :', err);
  process.exit(1);
});
