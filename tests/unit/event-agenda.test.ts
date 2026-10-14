import { expect, test } from 'vitest';
import { groupEventsByDay, formatEventRange } from '../../src/lib/event-agenda';

const range = (slug: string, start: string, end: string) => ({ slug, start, end });

test('agenda includes past and future dates in chronological order and sorts rows by actual instants', () => {
  const entries = [
    range('later', '2026-10-12T14:30:00+02:00', '2026-10-12T16:00:00+02:00'),
    range('future', '2027-01-01T18:00:00Z', '2027-01-01T20:00:00Z'),
    range('earlier', '2026-10-12T16:00:00+04:00', '2026-10-12T18:00:00+04:00'),
    range('past', '2024-01-01T18:00:00Z', '2024-01-01T20:00:00Z'),
  ];
  const groups = groupEventsByDay(entries);
  expect(groups.map((group) => group.day)).toEqual(['2024-01-01', '2026-10-12', '2027-01-01']);
  expect(groups[1].events.map((event) => event.slug)).toEqual(['earlier', 'later']);
  expect(entries[0].slug).toBe('later');
});

test.each([
  ['2026-03-28T23:30:00+01:00', '2026-03-30T00:00:00+02:00', ['2026-03-28', '2026-03-29']],
  ['2026-10-24T23:30:00+02:00', '2026-10-26T00:00:00+01:00', ['2026-10-24', '2026-10-25']],
  ['2026-12-31T23:30:00+01:00', '2027-01-02T00:00:00+01:00', ['2026-12-31', '2027-01-01']],
  ['2026-10-11T23:30:00Z', '2026-10-12T01:00:00Z', ['2026-10-12']],
])('occupied dates follow Rome, DST and exclusive midnight endings: %s', (start, end, dates) => {
  expect(groupEventsByDay([range('span', start as string, end as string)]).map((group) => group.day)).toEqual(dates);
});

test('same-time rows have stable slug ordering; unfinished ranges do not produce dates', () => {
  const event = range('b', '2026-10-12T18:00:00Z', '2026-10-12T20:00:00Z');
  expect(groupEventsByDay([event, { ...event, slug: 'a' }, { slug: 'draft', start: undefined, end: undefined }])[0].events.map((entry) => entry.slug)).toEqual(['a', 'b']);
  expect(groupEventsByDay([])).toEqual([]);
});

test('time labels distinguish the two autumn 02:30 instants and date a multi-day range', () => {
  const repeated = formatEventRange(range('dst', '2026-10-25T02:30:00+02:00', '2026-10-25T02:30:00+01:00'));
  expect(repeated).toContain('02:30 CEST');
  expect(repeated).toContain('02:30 CET');
  expect(formatEventRange(range('overnight', '2026-10-11T23:30:00+02:00', '2026-10-13T00:00:00+02:00'))).toContain('11 Oct 2026');
});
