import type { EventData } from './schemas';
import { formatInstant, romeDay, TIME_ZONE } from './dates';

type EventRange = Pick<EventData, 'slug' | 'start' | 'end'>;
export interface EventDay<T> { day: string; events: T[]; }

/** Group by occupied Rome dates, not by elapsed 24-hour periods across DST. */
export function groupEventsByDay<T extends EventRange>(events: T[]): EventDay<T>[] {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const start = Date.parse(event.start ?? ''), end = Date.parse(event.end ?? '');
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;
    const first = Date.parse(`${romeDay(start)}T12:00:00Z`);
    const last = Date.parse(`${romeDay(end - 1)}T12:00:00Z`);
    for (let date = first; date <= last; date += 86400000) {
      const day = new Date(date).toISOString().slice(0, 10);
      const group = groups.get(day) ?? [];
      group.push(event);
      groups.set(day, group);
    }
  }
  return Array.from(groups, ([day, entries]) => ({
    day, events: entries.sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!) || a.slug.localeCompare(b.slug)),
  })).sort((a, b) => a.day.localeCompare(b.day));
}

export function formatAgendaDate(day: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
}

export function formatEventRange(event: EventRange, locale = 'en-GB'): string {
  const start = Date.parse(event.start!), end = Date.parse(event.end!);
  if (romeDay(start) !== romeDay(end - 1)) return `${formatInstant(event.start!, locale)} – ${formatInstant(event.end!, locale)}`;
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: TIME_ZONE });
  return `${time.format(start)} – ${time.format(end)}`;
}
