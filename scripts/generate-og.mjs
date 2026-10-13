/**
 * Génère l'image de partage par défaut (public/og-default.png, 1200×630).
 * Usage : node scripts/generate-og.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <line x1="96" y1="96" x2="96" y2="534" stroke="#232323" stroke-width="2"/>
  <g transform="translate(150 150)">
    <circle cx="28" cy="28" r="24" fill="none" stroke="#ededed" stroke-width="3"/>
    <path d="M28 4a24 24 0 0 1 0 48z" fill="#ededed"/>
  </g>
  <text x="150" y="350" fill="#ededed" font-family="Source Serif 4, Georgia, DejaVu Serif, serif"
        font-size="132" font-style="italic" font-weight="600" letter-spacing="-4">Marges</text>
  <text x="152" y="430" fill="#9a9a9a" font-family="Source Serif 4, Georgia, DejaVu Serif, serif"
        font-size="40">Penser lentement ce que les machines font vite.</text>
  <text x="152" y="520" fill="#9a9a9a" font-family="Inter, Helvetica, DejaVu Sans, sans-serif"
        font-size="22" letter-spacing="5">ESSAIS · QUESTIONS · DIALOGUES · NOTES</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log(`✓ ${out}`);
