import { describe, expect, test } from 'vitest';
import { eventSchema, assertPublicCopy, link } from '../../src/lib/schemas';
import { registrationState, timeStatus, selectEvents, occupiesDay, nextBoundary } from '../../src/lib/events';

const opening = Date.parse('2026-10-10T10:00:00Z');
const closing = Date.parse('2026-10-12T10:00:00Z');
const start = Date.parse('2026-10-12T12:00:00Z');
const end = Date.parse('2026-10-12T14:00:00Z');
const input = {
  title: 'Test event', slug: 'test-event', summary: 'Only a test fixture', status: 'published',
  start: '2026-10-12T14:00:00+02:00', end: '2026-10-12T16:00:00+02:00',
  registrationRequired: true, registrationOpens: '2026-10-10T12:00:00+02:00',
  registrationCloses: '2026-10-12T12:00:00+02:00', registrationUrl: 'https://example.org/register', registrationLabel: 'Register',
};
const event = (overrides = {}) => eventSchema.parse({ ...input, ...overrides });

describe('registration deadlines and precedence', () => {
  test('exact opening is open; exact closing is closed before the event starts', () => {
    expect(registrationState(event(), opening - 1)).toBe('scheduled');
    expect(registrationState(event(), opening)).toBe('open');
    expect(registrationState(event(), closing - 1)).toBe('open');
    expect(registrationState(event(), closing)).toBe('closed');
    expect(registrationState(event(), start)).toBe('closed');
    expect(registrationState(event(), end)).toBe('ended');
  });
  test('cancellation wins over ended and manually closed', () => {
    expect(registrationState(event({ cancelled: true, manuallyClosed: true }), end)).toBe('cancelled');
  });
  test('ended wins over manually closed and no-registration', () => {
    expect(registrationState(event({ manuallyClosed: true, registrationRequired: false }), end)).toBe('ended');
  });
  test('manual close wins over no-registration and scheduled opening', () => {
    expect(registrationState(event({ manuallyClosed: true, registrationRequired: false }), opening - 1)).toBe('closed');
    expect(registrationState(event({ manuallyClosed: true }), opening - 1)).toBe('closed');
  });
  test('no-registration wins over scheduled/deadline restrictions', () => {
    expect(registrationState(event({ registrationRequired: false }), opening - 1)).toBe('none');
    expect(registrationState(event({ registrationRequired: false }), closing)).toBe('none');
  });
  test('missing opening imposes no scheduled restriction', () => {
    expect(registrationState(event({ registrationOpens: '' }), opening - 1)).toBe('open');
  });
  test('closing at the end is coherent and end precedence applies', () => {
    const atEnd = event({ registrationCloses: input.end });
    expect(registrationState(atEnd, end - 1)).toBe('open');
    expect(registrationState(atEnd, end)).toBe('ended');
  });
});

describe('time classification and ordering', () => {
  test('start is inclusive and end is exclusive', () => {
    expect(timeStatus(event(), start - 1)).toBe('upcoming');
    expect(timeStatus(event(), start)).toBe('happening');
    expect(timeStatus(event(), end - 1)).toBe('happening');
    expect(timeStatus(event(), end)).toBe('past');
  });
  test('ongoing/upcoming come first, then past newest first; cancelled remains findable', () => {
    const entries = [
      event({ slug: 'old', start: '2026-10-01T10:00:00Z', end: '2026-10-01T12:00:00Z', registrationRequired: false, registrationOpens: '', registrationCloses: '' }),
      event({ slug: 'future', cancelled: true }),
      event({ slug: 'recent', start: '2026-10-11T10:00:00Z', end: '2026-10-11T12:00:00Z', registrationRequired: false, registrationOpens: '', registrationCloses: '' }),
      event({ slug: 'ongoing', start: '2026-10-12T09:00:00Z', end: input.end, registrationRequired: false }),
    ];
    expect(selectEvents(entries, 'all', closing).map((e) => e.slug)).toEqual(['ongoing', 'future', 'recent', 'old']);
    expect(selectEvents(entries, 'upcoming', closing).map((e) => e.slug)).toEqual(['ongoing', 'future']);
    expect(selectEvents(entries, 'past', closing).map((e) => e.slug)).toEqual(['recent', 'old']);
    expect(nextBoundary([event()], closing - 1)).toBe(closing);
    expect(nextBoundary([event()], closing)).toBe(start);
  });
  test('calendar covers every occupied Rome day, excluding a midnight end', () => {
    const span = { start: '2026-03-28T23:30:00+01:00', end: '2026-03-30T00:00:00+02:00' };
    expect(occupiesDay(span, '2026-03-28')).toBe(true);
    expect(occupiesDay(span, '2026-03-29')).toBe(true);
    expect(occupiesDay(span, '2026-03-30')).toBe(false);
  });
});

describe('publication validation', () => {
  test('published registration needs both a real URL and deadline', () => {
    expect(eventSchema.safeParse({ ...input, registrationUrl: '' }).success).toBe(false);
    expect(eventSchema.safeParse({ ...input, registrationUrl: 'https://' }).success).toBe(false);
    expect(eventSchema.safeParse({ ...input, registrationCloses: '' }).success).toBe(false);
  });
  test.each([
    { end: input.start },
    { registrationOpens: input.registrationCloses },
    { registrationCloses: '2026-10-12T17:00:00+02:00' },
    { start: '2026-10-12T14:00:00' },
    { start: '2026-02-30T14:00:00+01:00' },
  ])('rejects incoherent/ambiguous published input %j', (override) => {
    expect(eventSchema.safeParse({ ...input, ...override }).success).toBe(false);
  });
  test('drafts can be incomplete and can retain unfinished windows', () => {
    expect(eventSchema.safeParse({ status: 'draft' }).success).toBe(true);
    expect(eventSchema.safeParse({ ...input, status: 'draft', end: input.start, registrationCloses: '' }).success).toBe(true);
  });
  test('editor notes are rejected as public copy, ordinary Markdown links are accepted', () => {
    expect(() => assertPublicCopy('[Explain what Organisation does.]')).toThrow(/placeholders/);
    expect(() => assertPublicCopy('Talk to us [here](/contact/).')).not.toThrow();
    expect(() => assertPublicCopy({ editorNotes: '[Confirm the milestone.]' })).not.toThrow();
    expect(link.safeParse('javascript:alert(1)').success).toBe(false);
    expect(link.safeParse('//example.org').success).toBe(false);
  });
});
