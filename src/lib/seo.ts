import type { SiteData } from './schemas';

export function plainText(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[#*_`]/g, '').replace(/\s+/g, ' ').trim();
}

export function structuredData(site: SiteData, base: string, canonical: string, title: string, description: string) {
  const home = new URL('/', base).href;
  const organizationId = `${home}#organization`;
  const websiteId = `${home}#website`;
  const graph: Record<string, unknown>[] = [];
  if (canonical === home) {
    // Use configured direct social profiles; a short link is not a verified Telegram identity.
    const sameAs = [site.contact.instagram, site.contact.telegram, site.contact.linkedin].filter((destination) =>
      ['instagram.com', 'www.instagram.com', 't.me', 'telegram.me', 'linkedin.com', 'www.linkedin.com'].includes(new URL(destination).hostname));
    graph.push({
      '@type': 'Organization', '@id': organizationId,
      name: site.name, url: home, description: plainText(site.description), email: site.contact.email,
      ...(site.logo ? { logo: new URL(site.logo, home).href } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    });
    graph.push({ '@type': 'WebSite', '@id': websiteId, url: home, name: site.name, inLanguage: 'en', publisher: { '@id': organizationId } });
  }
  graph.push({
    '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
    name: title, description: plainText(description), inLanguage: 'en',
    isPartOf: { '@id': websiteId }, about: { '@id': organizationId },
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function jsonForHtml(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}
