import fs from 'node:fs';
import path from 'node:path';

const src = '/home/tom/Documents/Cours';
const dest = path.resolve('public/cours-files');

function copyRecursive(s, d) {
  if (!fs.existsSync(s)) return;
  fs.mkdirSync(d, { recursive: true });
  for (const item of fs.readdirSync(s)) {
    if (item.startsWith('.')) continue;
    const curSrc = path.join(s, item);
    const curDest = path.join(d, item);
    if (fs.statSync(curSrc).isDirectory()) {
      copyRecursive(curSrc, curDest);
    } else {
      fs.copyFileSync(curSrc, curDest);
    }
  }
}

copyRecursive(src, dest);
console.log('✓ Cours synchronisés dans public/cours-files');
