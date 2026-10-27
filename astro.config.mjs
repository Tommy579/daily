// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeFrenchTypography from './src/utils/rehype-french-typography.mjs';

export default defineConfig({
  // Configuration GitHub Pages
  site: 'https://tommy579.github.io',
  base: '/marges',
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
  vite: {
    plugins: [
      {
        name: 'marges-calendar-proxy-dev',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url || !req.url.includes('/api/calendar/proxy')) {
              return next();
            }
            try {
              const parsed = new URL(req.url, 'http://localhost');
              const targetUrl = parsed.searchParams.get('url');
              if (!targetUrl) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Paramètre url requis' }));
                return;
              }
              const upstream = await fetch(targetUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; Marges-Calendar-Sync/1.0)',
                  Accept: 'text/calendar, application/octet-stream, text/plain, */*',
                },
              });
              if (!upstream.ok) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `HTTP ${upstream.status}` }));
                return;
              }
              const text = await upstream.text();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(text);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        },
      },
    ],
  },
});
