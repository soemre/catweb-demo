import type { EventData } from './schemas';
import { romeDay } from './dates';

export type TimeStatus = 'upcoming' | 'happening' | 'past';
export type RegistrationState = 'cancelled' | 'ended' | 'closed' | 'none' | 'scheduled' | 'open';
export type Filter = 'all' | 'upcoming' | 'past';
export type PublicEvent = EventData & { href: string };

export function timeStatus(event: Pick<EventData, 'start' | 'end'>, now: number): TimeStatus {
  if (now >= Date.parse(event.end!)) return 'past';
  return now < Date.parse(event.start!) ? 'upcoming' : 'happening';
}
export function registrationState(event: EventData, now: number): RegistrationState {
  if (event.cancelled) return 'cancelled';
  if (now >= Date.parse(event.end!)) return 'ended';
  if (event.manuallyClosed) return 'closed';
  if (!event.registrationRequired) return 'none';
  if (event.registrationOpens && now < Date.parse(event.registrationOpens)) return 'scheduled';
  if (!event.registrationCloses || now >= Date.parse(event.registrationCloses)) return 'closed';
  return event.registrationUrl ? 'open' : 'closed';
}
export function selectEvents<T extends EventData>(events: T[], filter: Filter, now: number): T[] {
  return events.filter((event) => filter === 'all' || (filter === 'past' ? timeStatus(event, now) === 'past' : timeStatus(event, now) !== 'past'))
    .sort((a, b) => {
      const aPast = timeStatus(a, now) === 'past', bPast = timeStatus(b, now) === 'past';
      if (aPast !== bPast) return aPast ? 1 : -1;
      return (aPast ? -1 : 1) * (Date.parse(a.start!) - Date.parse(b.start!)) || a.slug.localeCompare(b.slug);
    });
}
export function occupiesDay(event: Pick<EventData, 'start' | 'end'>, day: string): boolean {
  // End is exclusive: a midnight finish does not occupy the next day.
  return romeDay(Date.parse(event.start!)) <= day && day <= romeDay(Date.parse(event.end!) - 1);
}
export function nextBoundary(events: EventData[], now: number): number | undefined {
  return events.flatMap((e) => [e.start, e.end, e.registrationOpens, e.registrationCloses])
    .filter((v): v is string => Boolean(v)).map(Date.parse).filter((v) => v > now).sort((a, b) => a - b)[0];
}
