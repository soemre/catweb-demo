import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { withBase } from './urls';

const processor = createSatteriMarkdownProcessor();

export async function renderMarkdown(text: string): Promise<string> {
  const code = (await (await processor).render(text)).code;
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  if (!base) return code;
  return code.replace(/\b(href|src)=["'](\/(?!\/)[^"']*)["']/g, (_, attr, path) => {
    return `${attr}="${withBase(path)}"`;
  });
}
