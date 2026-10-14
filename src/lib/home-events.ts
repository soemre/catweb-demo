import type { EventData } from './schemas';

export function selectHomeEvents<T extends Pick<EventData, 'status' | 'cancelled' | 'start' | 'slug'>>(events: T[], count: number, now: number): T[] {
  return events.filter((event) => event.status === 'published' && !event.cancelled && Date.parse(event.start ?? '') > now)
    .sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!) || a.slug.localeCompare(b.slug))
    .slice(0, Math.max(0, Math.min(3, count)));
}

export function countdownParts(start: string, now: number) {
  const remaining = Date.parse(start) - now;
  const total = Number.isFinite(remaining) ? Math.max(0, Math.ceil(remaining / 1000)) : 0;
  return { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
}
