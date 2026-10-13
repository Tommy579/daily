// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeFrenchTypography from './src/utils/rehype-french-typography.mjs';

export default defineConfig({
  // Configuration GitHub Pages
  site: 'https://tommy579.github.io',
  base: '/daily',
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
