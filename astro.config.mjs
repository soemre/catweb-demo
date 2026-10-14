import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://collettivoalanturing.it',
  output: 'static',
  trailingSlash: 'always',
  cacheDir: './.astro/cache',
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404/') })],
});
