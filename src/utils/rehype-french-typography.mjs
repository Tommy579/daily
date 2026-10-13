/**
 * Typographie française automatique.
 *
 * Remplace l'espace ordinaire tapée avant ; : ! ? » et après « par une
 * espace fine insécable (U+202F), pour éviter qu'un signe se retrouve seul
 * en début de ligne. On ne touche qu'aux espaces déjà présentes : les URL
 * (« https://… ») et les heures (« 10:30 ») restent intactes.
 */

const SKIP = new Set(['code', 'pre', 'script', 'style', 'kbd', 'samp']);
const NNBSP = '\u202F';

/** @param {string} str */
export function frenchTypography(str) {
  return str
    .replace(/'/g, '’')
    .replace(/[ \u00A0]([;:!?»])/g, `${NNBSP}$1`)
    .replace(/«[ \u00A0]/g, `«${NNBSP}`)
    .replace(/[ \u00A0]—[ \u00A0]/g, `\u00A0— `);
}

/** Plugin rehype. */
export default function rehypeFrenchTypography() {
  /** @param {any} node */
  const walk = (node) => {
    if (node.type === 'element' && SKIP.has(node.tagName)) return;
    if (node.type === 'text' && typeof node.value === 'string') {
      node.value = frenchTypography(node.value);
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  /** @param {any} tree */
  return (tree) => walk(tree);
}
