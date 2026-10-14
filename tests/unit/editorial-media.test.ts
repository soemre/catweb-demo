import { expect, test } from 'vitest';
import { eventSchema, newsSchema } from '../../src/lib/schemas';
import { eventFixture, newsFixtures } from '../fixtures/content';

test('new and legacy event artwork remains independent from the cover and gallery', () => {
  const event = eventSchema.parse(eventFixture);
  expect(event.sticker).toBe('/media/sticker.svg');
  expect(event.calendarImage).toBe('/media/fixture.svg');
  expect(event.image).toBe('/media/fixture.svg');
  const { sticker: _sticker, ...legacy } = eventFixture;
  expect(eventSchema.parse(legacy).sticker).toBe('');
  expect(eventSchema.parse({ status: 'draft' }).gallery).toEqual([]);
});

test.each(['news', 'article', 'announcement', 'milestone'])('%s retains separate stickers and ordered photos', (category) => {
  const post = newsSchema.parse({ ...newsFixtures[0], category, milestoneDate: '2026-09-01' });
  expect(post.sticker).toBe('/media/sticker.svg');
  expect(post.image).toBe('/media/fixture.svg');
  expect(post.gallery).toEqual([{ image: '/media/photo.svg', alt: 'Second article photograph', caption: 'Another view of the gathering.' }]);
  expect(newsSchema.parse({ category, status: 'draft' })).toMatchObject({ sticker: '', gallery: [] });
});
