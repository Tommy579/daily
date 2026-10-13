import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Paramètre url requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Marges-Calendar-Sync/1.0)',
        'Accept': 'text/calendar, application/rss+xml, application/xml, text/xml, text/plain, */*',
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Erreur HTTP ${res.status}: ${res.statusText}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const text = await res.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Échec du téléchargement: ${err?.message || err}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
