import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { siteSchema } from '../../src/lib/schemas';
import { structuredData, jsonForHtml, plainText } from '../../src/lib/seo';

const site = siteSchema.parse(JSON.parse(readFileSync('content/site.json', 'utf8')));
const base = 'https://collettivoalanturing.it/';

test('organisation identity derives supplied facts and excludes unsupported claims/short links', () => {
  const data = structuredData(site, base, base, 'Home title', 'Home description');
  const organization = data['@graph'].find((entry) => entry['@type'] === 'Organization')!;
  expect(organization.name).toBe(site.name);
  expect(organization.email).toBe(site.contact.email);
  expect(organization.url).toBe(base);
  expect(organization).not.toHaveProperty('foundingDate');
  expect(organization).not.toHaveProperty('memberOf');
  expect(organization).not.toHaveProperty('offers');
  expect(organization.sameAs).not.toContain('https://tr.ee/zmQ9ZKx2S2');
  expect(organization.sameAs).toContain('https://www.linkedin.com/company/collettivo-alan-turing');
});

test('page entities refer to the same site and organisation without duplicating identity', () => {
  const data = structuredData(site, base, `${base}contact/`, 'Contact title', 'Contact description');
  expect(data['@graph']).toHaveLength(1);
  expect(data['@graph'][0]).toMatchObject({ '@type': 'WebPage', url: `${base}contact/`, isPartOf: { '@id': `${base}#website` }, about: { '@id': `${base}#organization` } });
});

test('editor-authored markup cannot close the structured-data script', () => {
  const value = { name: '</script><script>alert(1)</script>' };
  const encoded = jsonForHtml(value);
  expect(encoded).not.toContain('</script>');
  expect(JSON.parse(encoded)).toEqual(value);
  expect(plainText('Read **this** [guide](/resources/) and <em>get support</em>.')).toBe('Read this guide and get support.');
});
