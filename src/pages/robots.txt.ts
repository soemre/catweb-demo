import type { APIRoute } from 'astro';
const robots = [
  'User-agent: *', 'Allow: /', '',
  'User-agent: OAI-SearchBot', 'Allow: /', '',
  'Sitemap: https://collettivoalanturing.it/sitemap-index.xml', '',
].join('\n');
export const GET: APIRoute = () => new Response(robots, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
