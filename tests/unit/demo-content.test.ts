import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { parse } from 'yaml';
import { createDemoContent, seedDemoContent, clearDemoContent, demoCollections, demoHomeHeroPath } from '../../scripts/demo-content';
import { eventSchema, newsSchema } from '../../src/lib/schemas';
import { registrationState, timeStatus } from '../../src/lib/events';
import { selectHomeEvents } from '../../src/lib/home-events';

const now = new Date('2026-10-12T12:00:00Z');
let root: string;
beforeEach(async () => {
  const parent = resolve('test-results');
  await mkdir(parent, { recursive: true });
  root = await mkdtemp(join(parent, 'demo-content-'));
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

test('demo data fills every collection, post category, resource kind and live registration state', () => {
  const demo = createDemoContent(now);
  expect(new Set(demo.entries.map((entry) => entry.collection))).toEqual(new Set(demoCollections));
  const posts = demo.entries.filter((entry) => entry.collection === 'news' && entry.data.status === 'published');
  expect(new Set(posts.map((entry) => entry.data.category))).toEqual(new Set(['news', 'article', 'announcement', 'milestone']));
  const resources = demo.entries.filter((entry) => entry.collection === 'resources' && entry.data.status !== 'draft');
  expect(new Set(resources.map((entry) => entry.data.kind))).toEqual(new Set(['guide', 'external', 'file']));
  const events = demo.entries.filter((entry) => entry.collection === 'events' && entry.data.status === 'published').map((entry) => eventSchema.parse(entry.data));
  expect(new Set(events.map((event) => timeStatus(event, now.valueOf())))).toEqual(new Set(['upcoming', 'happening', 'past']));
  expect(new Set(events.map((event) => registrationState(event, now.valueOf())))).toEqual(new Set(['open', 'none', 'scheduled', 'closed', 'cancelled', 'ended']));
});

test('the expanded demo fills every current layout with stickers, galleries, countdowns and transparent sponsors', () => {
  const demo = createDemoContent(now);
  expect(demo.entries).toHaveLength(148);
  expect(demo.assets.size).toBe(39);
  const events = demo.entries.filter((entry) => entry.collection === 'events' && entry.data.status === 'published').map((entry) => eventSchema.parse(entry.data));
  expect(selectHomeEvents(events, 3, now.valueOf()).map((event) => event.slug)).toEqual(['demo-soon-coffee', 'demo-next-creative-meetup', 'demo-tomorrow-social']);
  expect(events.some((event) => Date.parse(event.start!) - now.valueOf() > 100 * 86400000)).toBe(true);
  expect(events.some((event) => event.sticker && event.image && event.sticker !== event.image)).toBe(true);
  expect(events.some((event) => event.gallery.length >= 3 && event.recap && event.materials.length > 0)).toBe(true);
  const posts = demo.entries.filter((entry) => entry.collection === 'news' && entry.data.status === 'published').map((entry) => newsSchema.parse(entry.data));
  for (const category of ['news', 'article', 'announcement', 'milestone']) {
    const examples = posts.filter((post) => post.category === category);
    expect(examples.length).toBeGreaterThanOrEqual(10);
    expect(examples.some((post) => post.sticker && post.gallery.length >= 2)).toBe(true);
    expect(examples.some((post) => !post.image && post.gallery.length > 0)).toBe(true);
  }
  const supporters = demo.entries.filter((entry) => entry.collection === 'supporters' && entry.data.visible);
  expect(supporters).toHaveLength(12);
  for (const supporter of supporters) {
    const asset = demo.assets.get(String(supporter.data.logo).split('/').pop()!)!;
    expect(asset).toContain('<svg');
    expect(asset).not.toContain('<rect');
    expect(supporter.data.website).toMatch(/^https:\/\/example\.org\//);
  }
  for (const entry of demo.entries) {
    for (const reference of `${JSON.stringify(entry.data)}\n${entry.body}`.matchAll(/\/media\/demo-content\/([a-z0-9-]+\.demo\.(?:svg|txt|md))/g)) expect(demo.assets.has(reference[1])).toBe(true);
  }
});

test('seeding and clearing preserve original entries, settings, archives and unrelated media', async () => {
  const originals = ['content/news/real-article.md', 'content/news/demo-real-article.md', 'content/news/notes.demo.md', 'content/site.json', 'content/archive/demo-history.demo.json', 'public/media/real-logo.svg', 'public/media/demo-content/my-image.svg', 'public/media/demo-content/demo-real-logo.svg'];
  for (const path of originals) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), `Original: ${path}`);
  }
  await mkdir(join(root, 'content/events'), { recursive: true });
  await writeFile(join(root, 'content/events/demo-obsolete-event.demo.md'), 'An obsolete pseudo record.');
  await writeFile(join(root, 'public/media/demo-content/demo-obsolete-poster.demo.svg'), 'An obsolete pseudo image.');
  const demo = await seedDemoContent(root, now);
  await expect(readFile(join(root, 'content/events/demo-obsolete-event.demo.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(readFile(join(root, 'public/media/demo-content/demo-obsolete-poster.demo.svg'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  expect((await readdir(join(root, 'content/news'))).length).toBeGreaterThan(20);
  const removed = await clearDemoContent(root);
  expect(removed).toEqual({ records: demo.entries.length + 1, assets: demo.assets.size });
  for (const path of originals) expect(await readFile(join(root, path), 'utf8')).toBe(`Original: ${path}`);
  expect(await readdir(join(root, 'content/events'))).toEqual([]);
  expect(await readdir(join(root, 'public/media/demo-content'))).toEqual(['demo-real-logo.svg', 'my-image.svg']);
  expect(await clearDemoContent(root)).toEqual({ records: 0, assets: 0 });
});

test('regenerating refreshes event dates without accumulating duplicate demo records', async () => {
  await seedDemoContent(root, now);
  const source = () => readFile(join(root, 'content/events/demo-welcome-evening.demo.md'), 'utf8');
  const frontmatter = (markdown: string) => parse(markdown.match(/^---\n([\s\S]*?)\n---/)![1]);
  const initial = frontmatter(await source());
  const later = new Date(now.valueOf() + 7 * 24 * 60 * 60 * 1000);
  const regenerated = await seedDemoContent(root, later);
  const updated = frontmatter(await source());
  expect(Date.parse(updated.start) - Date.parse(initial.start)).toBe(7 * 24 * 60 * 60 * 1000);
  const count = (await Promise.all(demoCollections.map((collection) => readdir(join(root, 'content', collection))))).flat().length;
  expect(count).toBe(regenerated.entries.length);
});

test('an invalid reference date fails before removing existing demo content', async () => {
  await mkdir(join(root, 'content/news'), { recursive: true });
  const path = join(root, 'content/news/demo-existing.demo.md');
  await writeFile(path, 'A demo record to preserve on invalid input.');
  await expect(seedDemoContent(root, new Date('invalid'))).rejects.toThrow(/valid reference date/);
  expect(await readFile(path, 'utf8')).toBe('A demo record to preserve on invalid input.');
});

test('seed, reseed and clear manage only the hero sidecar and preserve the real CMS selection', async () => {
  await mkdir(join(root, 'content/pages'), { recursive: true });
  const original = JSON.stringify({ headline: 'A real Home page', hero: { enabled: true, image: '/media/real-opening.jpg', alt: 'Our actual community photograph', focusX: 70, focusY: 30 } }, null, 2);
  const homePath = join(root, 'content/pages/home.json');
  await writeFile(homePath, original);
  const seeded = await seedDemoContent(root, now);
  expect(JSON.parse(await readFile(join(root, demoHomeHeroPath), 'utf8'))).toEqual(seeded.homeHero);
  expect(await readFile(homePath, 'utf8')).toBe(original);
  await seedDemoContent(root, new Date(now.valueOf() + 86400000));
  expect(await readFile(homePath, 'utf8')).toBe(original);
  await clearDemoContent(root);
  await expect(readFile(join(root, demoHomeHeroPath), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  expect(await readFile(homePath, 'utf8')).toBe(original);
});
