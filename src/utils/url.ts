/**
 * Préfixe une route avec le BASE_URL d'Astro (ex: '/daily').
 * Fonctionne aussi bien en local (BASE_URL = '/') que sur GitHub Pages (BASE_URL = '/daily/').
 */
export function url(path: string = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath === '/' && base) {
    return `${base}/`;
  }
  return `${base}${cleanPath}`;
}
