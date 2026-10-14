import { readFile, readdir, stat } from 'node:fs/promises';
import { parse } from 'yaml';
import { siteSchema, pageSchemas, collectionSchemas, homeHeroSchema, assertPublicCopy } from '../src/lib/schemas.ts';
import { resolveHomeHero } from '../src/lib/home-hero.ts';

export function parseEntry(source: string, filename: string): { data: Record<string, unknown>; body: string } {
  if (filename.endsWith('.json')) return { data: JSON.parse(source), body: '' };
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: expected Markdown with YAML front matter`);
  return { data: parse(match[1]) ?? {}, body: match[2] };
}
const site = siteSchema.parse(JSON.parse(await readFile('content/site.json', 'utf8')));
assertPublicCopy(site, 'site');
for (const [name, schema] of Object.entries(pageSchemas)) {
  const value = schema.parse(JSON.parse(await readFile(`content/pages/${name}.json`, 'utf8')));
  assertPublicCopy(value, `pages.${name}`);
}
const home = pageSchemas.home.parse(JSON.parse(await readFile('content/pages/home.json', 'utf8')));
const previewSource = await readFile('content/pages/demo-home-hero.demo.json', 'utf8').catch((error: NodeJS.ErrnoException) => {
  if (error.code === 'ENOENT') return undefined;
  throw error;
});
const preview = previewSource === undefined ? undefined : homeHeroSchema.parse(JSON.parse(previewSource));
if (preview) assertPublicCopy(preview, 'pages.demoHomeHero');
const openingPhoto = resolveHomeHero(home.hero, preview);
if (openingPhoto.enabled && openingPhoto.image) {
  await stat(`public${openingPhoto.image}`).catch(() => { throw new Error(`content/pages/home.json: opening photo ${openingPhoto.image} does not exist`); });
}
for (const [name, schema] of Object.entries(collectionSchemas)) {
  const slugs = new Set<string>();
  for (const filename of (await readdir(`content/${name}`)).filter((f) => /\.(json|md)$/.test(f))) {
    const path = `content/${name}/${filename}`;
    const { data: raw, body } = parseEntry(await readFile(path, 'utf8'), filename);
    const data = schema.parse(raw) as Record<string, unknown>;
    const published = data.status === 'published' || data.visible === true || (data.published === true && data.verification === 'confirmed');
    const publicResourcePreview = name === 'resources' && data.status === 'preview';
    if (!published && !publicResourcePreview) continue;
    assertPublicCopy(data, path);
    if (published) assertPublicCopy(body, `${path}.body`);
    if (['events', 'news', 'resources'].includes(name)) {
      for (const field of ['title', 'summary', 'slug']) if (!data[field]) throw new Error(`${path}: ${field} is required to publish`);
      const slug = String(data.slug);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${path}: invalid stable slug`);
      if (slugs.has(slug)) throw new Error(`${path}: duplicate published slug ${slug}`);
      slugs.add(slug);
      if ((name !== 'resources' || (data.kind === 'guide' && data.status === 'published')) && !body.trim()) throw new Error(`${path}: a full post body is required`);
      if (data.image && !data.imageAlt) throw new Error(`${path}: add alternative text for the cover image`);
    }
    if (name === 'events' && data.registrationRequired && !data.registrationLabel) throw new Error(`${path}: add the registration button label`);
    if (name === 'news' && !data.date) throw new Error(`${path}: publication date is required`);
    if (name === 'resources') {
      if (data.kind === 'external' && !/^https?:\/\//.test(String(data.url))) throw new Error(`${path}: an external resource needs its destination URL`);
      if (data.kind === 'file' && !data.file) throw new Error(`${path}: a file resource needs its uploaded file`);
    }
    if (name === 'events' || name === 'news') {
      const photos = data.gallery as { image: string; alt: string }[];
      for (const photo of photos) {
        if (!photo.image) throw new Error(`${path}: each photo needs an uploaded image`);
        if (!photo.alt) throw new Error(`${path}: each photo needs alternative text`);
      }
      // Calendar-only artwork is embedded in JSON, so HTML link checks cannot catch it.
      for (const image of [data.sticker, data.calendarImage, ...photos.map((photo) => photo.image)]) {
        if (image) await stat(`public${image}`).catch(() => { throw new Error(`${path}: uploaded media ${image} does not exist`); });
      }
    }
  }
}

// Check the structured CMS editors and complete coverage of each seeded page file.
const cms = parse(await readFile('.pages.yml', 'utf8'));
const fieldTypes = new Set(['string', 'text', 'rich-text', 'image', 'file', 'date', 'number', 'boolean', 'object', 'select', 'reference']);
function fieldsFor(field: any): any {
  if (field.component) {
    if (field.type || !cms.components[field.component]) throw new Error(`Invalid CMS component: ${field.name}`);
    return { ...cms.components[field.component], ...field };
  }
  return field;
}
function checkFields(fields: any[], value?: unknown, path = 'CMS'): void {
  const names = new Set<string>();
  for (const original of fields) {
    const field = fieldsFor(original);
    if (!field.name || names.has(field.name) || !fieldTypes.has(field.type)) throw new Error(`${path}: invalid/duplicate field ${field.name}`);
    names.add(field.name);
    if (field.fields) {
      const child = value && typeof value === 'object' ? (value as Record<string, unknown>)[field.name] : undefined;
      if (Array.isArray(child)) child.forEach((v) => checkFields(field.fields, v, `${path}.${field.name}`));
      else checkFields(field.fields, child, `${path}.${field.name}`);
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) for (const key of Object.keys(value)) if (!names.has(key)) throw new Error(`${path}.${key}: not editable in Pages CMS`);
}
for (const entry of cms.content) {
  if (!['file', 'collection'].includes(entry.type) || !entry.path) throw new Error(`Invalid CMS entry ${entry.name}`);
  checkFields(entry.fields, entry.type === 'file' ? JSON.parse(await readFile(entry.path, 'utf8')) : undefined, entry.name);
}

async function checkMedia(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = `${path}/${entry.name}`;
    if (entry.isDirectory()) await checkMedia(file);
    else if ((await stat(file)).size > 25 * 1024 * 1024) throw new Error(`${file}: exceeds Cloudflare Pages' 25 MiB asset limit`);
  }
}
await checkMedia('public/media');
console.log('Content, publication rules, CMS page coverage and asset sizes validated.');
