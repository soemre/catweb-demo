import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
const processor = createSatteriMarkdownProcessor();
export async function renderMarkdown(text: string): Promise<string> {
  return (await (await processor).render(text)).code;
}
