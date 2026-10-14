import { readFileSync } from 'node:fs';
import { afterEach, expect, test } from 'vitest';
import { format, parseISO } from 'date-fns';
import { parse } from 'yaml';
import { formatInstant, formatDate, romeDay, monthDays, shiftMonth } from '../../src/lib/dates';
import { eventSchema, newsSchema } from '../../src/lib/schemas';

const originalTZ = process.env.TZ;
afterEach(() => { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; });
const cmsFormat = parse(readFileSync('.pages.yml', 'utf8')).components.instant.options.format;
const instants = [
  '2026-01-01T18:00:00+01:00', '2026-07-01T18:00:00+02:00',
  '2026-03-29T01:30:00+01:00', '2026-03-29T03:30:00+02:00',
  '2026-10-25T02:30:00+02:00', '2026-10-25T02:30:00+01:00',
];
test.each(['Europe/Rome', 'America/New_York', 'Asia/Tokyo'])('CMS date-fns output round-trips the same instant in %s', (timezone) => {
  process.env.TZ = timezone;
  for (const iso of instants) {
    const output = format(parseISO(iso), cmsFormat);
    expect(output).toMatch(/(?:Z|[+-]\d\d:\d\d)$/);
    expect(Date.parse(output)).toBe(Date.parse(iso));
    const serialized = JSON.parse(JSON.stringify({ start: output }));
    expect(formatInstant(serialized.start)).toBe(formatInstant(iso));
  }
});
test('Rome display crosses the spring gap and distinguishes instants in the autumn fold', () => {
  expect(formatInstant('2026-03-29T00:30:00Z')).toContain('01:30');
  expect(formatInstant('2026-03-29T01:30:00Z')).toContain('03:30');
  expect(Date.parse(instants[5]) - Date.parse(instants[4])).toBe(3600000);
  expect(formatInstant(instants[4])).not.toBe(formatInstant(instants[5]));
});
test('calendar dates and publication dates are independent of the visitor timezone', () => {
  process.env.TZ = 'America/Los_Angeles';
  expect(romeDay(Date.parse('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
  expect(formatDate('2026-07-02')).toBe('2 Jul 2026');
  expect(monthDays('2028-02')).toHaveLength(29);
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
});
test('Astro YAML Date values normalize without moving the instant or editorial date', () => {
  const event = eventSchema.parse({ status: 'draft', start: new Date('2026-10-25T02:30:00+01:00') });
  expect(event.start).toBe('2026-10-25T01:30:00.000Z');
  expect(newsSchema.parse({ status: 'draft', date: new Date('2026-10-01T00:00:00Z') }).date).toBe('2026-10-01');
});
