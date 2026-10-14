import type { APIRoute } from 'astro';
import { withBase } from '../lib/urls';

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = site
    ? new URL(withBase('/sitemap-index.xml'), site).href
    : 'https://collettivoalanturing.it/sitemap-index.xml';

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');

  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
