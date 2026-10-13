import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';
import { THEMES } from '../data/themes';

export async function GET(context) {
  const textes = (await getCollection('textes', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: textes.map((t) => ({
      title: t.data.title,
      pubDate: t.data.date,
      description: t.data.summary,
      link: `/textes/${t.id}/`,
      categories: t.data.themes.map((th) => THEMES[th]?.label ?? th),
    })),
    customData: `<language>fr-fr</language>`,
    trailingSlash: true,
  });
}
