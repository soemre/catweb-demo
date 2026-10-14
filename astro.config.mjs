import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const site = process.env.ASTRO_SITE || (isGitHubPages ? 'https://soemre.github.io' : 'https://collettivoalanturing.it');
const base = process.env.ASTRO_BASE !== undefined
  ? process.env.ASTRO_BASE
  : (isGitHubPages ? '/catweb-demo' : undefined);

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  cacheDir: './.astro/cache',
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404/') })],
});
