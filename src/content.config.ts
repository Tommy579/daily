import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { THEME_SLUGS } from './data/themes';
import { TYPE_SLUGS } from './consts';

const textes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/textes' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    summary: z.string(),
    type: z.enum(TYPE_SLUGS).default('essai'),
    themes: z.array(z.enum(THEME_SLUGS)).default([]),
    /** Série éditoriale facultative, ex. « Vieilles questions, nouvelle machine ». */
    series: z.string().optional(),
    epigraph: z.string().optional(),
    epigraphAuthor: z.string().optional(),
    dropcap: z.boolean().default(false),
    /** Encadré « Pour aller plus loin » en fin de texte. */
    references: z
      .array(
        z.object({
          title: z.string(),
          author: z.string().optional(),
          note: z.string().optional(),
          url: z.string().optional(),
        }),
      )
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { textes };
