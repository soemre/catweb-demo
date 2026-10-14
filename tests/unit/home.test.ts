import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { countdownParts, selectHomeEvents } from '../../src/lib/home-events';
import { selectSupporterImages } from '../../src/lib/supporters';
import { pageSchemas, homeHeroSchema } from '../../src/lib/schemas';
import { resolveHomeHero } from '../../src/lib/home-hero';

const now = Date.parse('2026-10-12T09:59:59Z');
const event = (slug: string, delay: number, overrides = {}) => ({ slug, status: 'published' as const, cancelled: false, start: new Date(now + delay).toISOString(), ...overrides });
test('Home selects the nearest three future events, excluding drafts, cancellations and ongoing events', () => {
  const entries = [event('far', 4000), event('b', 2000), event('a', 2000), event('first', 1000), event('cancelled', 500, { cancelled: true }), event('draft', 200, { status: 'draft' }), event('ongoing', -1)];
  expect(selectHomeEvents(entries, 3, now).map((entry) => entry.slug)).toEqual(['first', 'a', 'b']);
  expect(selectHomeEvents(entries, 3, now + 1000).map((entry) => entry.slug)).toEqual(['a', 'b', 'far']);
  expect(selectHomeEvents(entries, 0, now)).toEqual([]);
  expect(selectHomeEvents(entries, 3, now + 4000)).toEqual([]);
});

test('countdown handles second/minute/day rollovers, three-digit days and exact zero', () => {
  const start = new Date(now + 100 * 86400000 + 1000).toISOString();
  expect(countdownParts(start, now)).toEqual({ days: 100, hours: 0, minutes: 0, seconds: 1 });
  expect(countdownParts(start, now + 1000)).toEqual({ days: 100, hours: 0, minutes: 0, seconds: 0 });
  expect(countdownParts(start, now + 2000)).toEqual({ days: 99, hours: 23, minutes: 59, seconds: 59 });
  expect(countdownParts(new Date(now + 61000).toISOString(), now + 1000)).toMatchObject({ minutes: 1, seconds: 0 });
  expect(countdownParts(new Date(now + 61000).toISOString(), now + 2000)).toMatchObject({ minutes: 0, seconds: 59 });
  expect(countdownParts(start, Date.parse(start))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  expect(countdownParts(start, Date.parse(start) + 1)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('countdown uses actual offset-bearing instants across DST, without relying on local wall time', () => {
  expect(countdownParts('2026-10-25T02:30:00+01:00', Date.parse('2026-10-25T02:30:00+02:00'))).toEqual({ days: 0, hours: 1, minutes: 0, seconds: 0 });
});

test('supporter images follow editorial order/ties and omit hidden or image-less entries', () => {
  const entries = [
    { id: 'b', data: { order: 1, visible: true, logo: '/media/b.svg' } },
    { id: 'empty', data: { order: 0, visible: true, logo: '' } },
    { id: 'hidden', data: { order: 0, visible: false, logo: '/media/hidden.svg' } },
    { id: 'a', data: { order: 1, visible: true, logo: '/media/a.svg' } },
  ];
  expect(selectSupporterImages(entries).map((entry) => entry.id)).toEqual(['a', 'b']);
  expect(entries[0].id).toBe('b');
});

const home = JSON.parse(readFileSync('content/pages/home.json', 'utf8'));
test('CMS counts match the three-card/five-row layouts and support hidden sections', () => {
  expect(pageSchemas.home.parse(home)).toMatchObject({ events: { count: 3 }, news: { count: 5 } });
  expect(pageSchemas.home.safeParse({ ...home, events: { ...home.events, count: 0 }, news: { ...home.news, count: 0 } }).success).toBe(true);
  for (const count of [-1, 1.5, 4, 12]) expect(pageSchemas.home.safeParse({ ...home, events: { ...home.events, count } }).success).toBe(false);
  for (const count of [-1, 1.5, 6, 12]) expect(pageSchemas.home.safeParse({ ...home, news: { ...home.news, count } }).success).toBe(false);
});

test('older Home settings default to an empty photo; crop controls accept edges and reject out-of-range values', () => {
  const { hero: _hero, ...legacy } = home;
  expect(pageSchemas.home.parse(legacy).hero).toEqual({ enabled: true, image: '', alt: '', focusX: 50, focusY: 50 });
  expect(homeHeroSchema.parse({ focusX: 0, focusY: 100 })).toMatchObject({ focusX: 0, focusY: 100 });
  expect(homeHeroSchema.parse({ focusX: null, focusY: null })).toMatchObject({ focusX: 50, focusY: 50 });
  expect(homeHeroSchema.safeParse({ focusX: -1 }).success).toBe(false);
  expect(homeHeroSchema.safeParse({ focusY: 101 }).success).toBe(false);
});

test('an enabled opening photo requires meaningful alt text and a local media path', () => {
  for (const alt of ['', '  ']) expect(homeHeroSchema.safeParse({ image: '/media/hero.svg', alt }).success).toBe(false);
  for (const image of ['https://example.org/hero.jpg', '/images/hero.jpg', '/media/hero.jpg?size=large']) expect(homeHeroSchema.safeParse({ image, alt: 'Opening photograph' }).success).toBe(false);
  expect(homeHeroSchema.safeParse({ enabled: false, image: '/media/hero.svg', alt: '' }).success).toBe(true);
});

test('real CMS photos and disabling take priority over a seeded demo fallback', () => {
  const demo = homeHeroSchema.parse({ image: '/media/demo-content/demo-scene-01.demo.svg', alt: 'Demo illustration' });
  const real = homeHeroSchema.parse({ image: '/media/real-home.jpg', alt: 'Real opening photo', focusX: 25 });
  expect(resolveHomeHero(real, demo)).toEqual(real);
  expect(resolveHomeHero(homeHeroSchema.parse({ enabled: false }), demo)).toMatchObject({ enabled: false, image: '' });
  expect(resolveHomeHero(homeHeroSchema.parse({ focusX: 10 }), demo)).toMatchObject({ image: demo.image, alt: demo.alt, focusX: 10 });
  expect(resolveHomeHero(homeHeroSchema.parse({}))).toMatchObject({ image: '' });
});
