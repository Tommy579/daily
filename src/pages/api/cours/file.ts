import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { COURS_ROOT } from '../../../utils/courses';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const relPath = url.searchParams.get('path');

  if (!relPath) {
    return new Response('Paramètre path manquant', { status: 400 });
  }

  // Sécurité anti path-traversal
  const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.resolve(COURS_ROOT, safeRelPath);

  if (!fullPath.startsWith(path.resolve(COURS_ROOT))) {
    return new Response('Accès interdit', { status: 403 });
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return new Response('Fichier introuvable', { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';
  else if (['.c', '.h', '.cpp', '.m', '.py', '.js', '.ts', '.sh'].includes(ext)) {
    contentType = 'text/plain; charset=utf-8';
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const fileName = path.basename(fullPath);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'no-cache',
    },
  });
};
