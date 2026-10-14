import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve(process.argv[2]);
const port = Number(process.argv[3]);
const types: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
createServer(async (request, response) => {
  let pathname = decodeURIComponent(new URL(request.url!, 'http://localhost').pathname);
  if (pathname === '/catweb-demo' || pathname.startsWith('/catweb-demo/')) {
    pathname = pathname.slice('/catweb-demo'.length) || '/';
  }
  let path = resolve(root, `.${pathname}`);
  if (!path.startsWith(`${root}/`) && path !== root) { response.writeHead(403).end(); return; }
  try {
    if ((await stat(path)).isDirectory()) path += '/index.html';
    response.setHeader('Content-Type', `${types[extname(path)] ?? 'application/octet-stream'}; charset=utf-8`);
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(await readFile(`${root}/404.html`));
  }
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} on ${port}`));
