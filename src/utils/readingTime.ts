/** Temps de lecture estimé, en minutes (Markdown brut en entrée). */
export function readingTime(text: string, wpm = 220): number {
  const clean = text
    .replace(/^---[\s\S]*?---/, '') // frontmatter éventuel
    .replace(/\[\^[^\]]+\]/g, '') // appels de notes
    .replace(/[#>*_`~\-]+/g, ' '); // syntaxe Markdown
  const words = clean.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}
