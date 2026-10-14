import { expect, test } from 'vitest';
import { newsSchema } from '../../src/lib/schemas';
import { selectMilestones } from '../../src/lib/milestones';

test.each(['news', 'article', 'announcement'])('ordinary %s posts do not need a milestone date', (category) => {
  expect(newsSchema.safeParse({ status: 'published', category, date: '2026-10-12' }).success).toBe(true);
});

test('published milestones require the date they happened; drafts can be incomplete', () => {
  expect(newsSchema.safeParse({ status: 'draft', category: 'milestone' }).success).toBe(true);
  const missing = newsSchema.safeParse({ status: 'published', category: 'milestone', date: '2026-10-12' });
  expect(missing.success).toBe(false);
  if (!missing.success) expect(missing.error.issues[0].path).toEqual(['milestoneDate']);
  expect(newsSchema.safeParse({ status: 'published', category: 'milestone', milestoneDate: '2024-02-29' }).success).toBe(true);
  expect(newsSchema.safeParse({ status: 'published', category: 'milestone', milestoneDate: '2026-02-30' }).success).toBe(false);
});

test('milestone dates normalise Astro YAML Date objects independently of publication dates', () => {
  const result = newsSchema.parse({ status: 'published', category: 'milestone', date: '2026-10-12', milestoneDate: new Date('2024-05-12T00:00:00Z') });
  expect(result.date).toBe('2026-10-12');
  expect(result.milestoneDate).toBe('2024-05-12');
});

test('timeline excludes drafts and ordinary posts, uses occurrence dates, and breaks date ties consistently', () => {
  const entry = (slug: string, milestoneDate: string, overrides = {}) => ({ data: { slug, milestoneDate, status: 'published', category: 'milestone', date: '2026-10-12', ...overrides } });
  const entries = [entry('older', '2020-01-01'), entry('tie-z', '2025-01-01'), entry('draft', '2026-01-01', { status: 'draft' }), entry('ordinary', '2026-01-01', { category: 'article' }), entry('tie-a', '2025-01-01'), entry('newest', '2026-01-01', { date: '2020-01-01' })];
  const original = [...entries];
  expect(selectMilestones(entries).map(({ data }) => data.slug)).toEqual(['newest', 'tie-a', 'tie-z', 'older']);
  expect(entries).toEqual(original);
  expect(selectMilestones([])).toEqual([]);
});
