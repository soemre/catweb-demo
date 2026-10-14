import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('dist');
async function files(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(`${path}/${entry.name}`) : [`${path}/${entry.name}`]))).flat();
}
const output = await files(root);
if (output.length > 20000) throw new Error('Build exceeds the free-plan 20,000-file limit');
for (const file of output) {
  if ((await stat(file)).size > 25 * 1024 * 1024) throw new Error(`${file}: exceeds the 25 MiB asset limit`);
  if (!file.endsWith('.html')) continue;
  const html = await readFile(file, 'utf8');
  if (!html.includes('lang="en"')) throw new Error(`${file}: missing document language`);
  for (const match of html.matchAll(/\b(?:href|src)=["'](\/(?!\/)[^"']*)["']/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), 'https://collettivoalanturing.it');
    const path = decodeURIComponent(url.pathname);
    let target = resolve(root, `.${path}`);
    if (!target.startsWith(`${root}/`) && target !== root) throw new Error(`Invalid path ${path}`);
    if (path.endsWith('/')) target += '/index.html';
    try { await stat(target); } catch { throw new Error(`${file}: broken internal destination ${path}`); }
    if (url.hash && target.endsWith('.html')) {
      const destination = await readFile(target, 'utf8');
      if (!destination.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) throw new Error(`${file}: missing anchor ${match[1]}`);
    }
  }
}
console.log(`Checked ${output.length} built files: internal links, uploaded media, language and Pages limits.`);
