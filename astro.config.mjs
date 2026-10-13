// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeFrenchTypography from './src/utils/rehype-french-typography.mjs';

// https://astro.build/config
export default defineConfig({
  // ⚠️ Remplacer par l'URL finale du site (utilisée pour le sitemap, le RSS, les balises canonical et Open Graph).
  site: 'https://marges.example',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  markdown: {
    syntaxHighlight: false,
    rehypePlugins: [rehypeFrenchTypography],
    remarkRehype: {
      footnoteLabel: 'Notes',
      footnoteLabelTagName: 'h2',
      footnoteBackLabel: 'Retour au texte',
    },
  },
});
