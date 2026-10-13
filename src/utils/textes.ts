import { getCollection, type CollectionEntry } from 'astro:content';
import { THEMES, type ThemeSlug } from '../data/themes';
import { TYPES, type TypeSlug } from '../consts';
import { frenchTypography } from './rehype-french-typography.mjs';

export type Texte = CollectionEntry<'textes'>;

/** Textes publiés, du plus récent au plus ancien. Les brouillons restent visibles en développement. */
export async function getTextes(): Promise<Texte[]> {
  const textes = await getCollection('textes', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return textes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function textUrl(entry: Texte): string {
  return `/textes/${entry.id}/`;
}

export function themeLabel(slug: ThemeSlug): string {
  return THEMES[slug]?.label ?? slug;
}

export function typeLabel(slug: TypeSlug): string {
  return TYPES[slug]?.label ?? slug;
}

/** Applique la typographie française (espaces fines) à une chaîne du frontmatter. */
export function fr(str: string): string {
  return frenchTypography(str);
}

/** Pluriel français simple. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}
