import { nextBoundary } from '../lib/events';
import type { EventData } from '../lib/schemas';

export function watchClock(events: EventData[], update: (now: number) => void, heartbeat = 30000) {
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    clearTimeout(timer);
    const now = Date.now();
    update(now);
    const next = nextBoundary(events, now);
    // Exact deadlines, plus the caller's heartbeat (one second for Home countdowns).
    timer = setTimeout(tick, Math.max(1, Math.min(heartbeat, next === undefined ? heartbeat : next - now)));
  };
  tick();
  window.addEventListener('focus', tick);
  window.addEventListener('pageshow', tick);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  return tick;
}
