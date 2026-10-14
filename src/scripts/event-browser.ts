import type { PublicEvent } from '../lib/events';
import { countdownParts, selectHomeEvents } from '../lib/home-events';
import type { pages } from '../lib/content';
import { watchClock } from './clock';

// Home's count-limited previews are separate from the full day-grouped agenda.
type Payload = { events: PublicEvent[]; countdown: typeof pages.home.events.countdown; count: number; homeEmpty: string };
for (const root of document.querySelectorAll<HTMLElement>('[data-event-browser]')) {
  const { events, countdown, count, homeEmpty }: Payload = JSON.parse(root.querySelector('[data-event-data]')!.textContent!);
  const list = root.querySelector<HTMLElement>('[data-event-list]')!;
  const empty = root.querySelector<HTMLElement>('[data-list-empty]')!;
  const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-event-card]')).map((card) => [card.dataset.eventCard!, card]));
  let signature = '';
  watchClock(events, (now) => {
    const selected = selectHomeEvents(events, count, now);
    const ids = new Set(selected.map((event) => event.slug));
    const activeCard = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('[data-event-card]') : null;
    const moveFocus = activeCard && root.contains(activeCard) && !ids.has(activeCard.dataset.eventCard!);
    for (const event of events) {
      const card = cards.get(event.slug)!;
      card.hidden = !ids.has(event.slug);
      if (card.hidden) continue;
      const timer = card.querySelector<HTMLElement>('[data-countdown]')!;
      const parts = countdownParts(event.start!, now);
      let description = countdown.label;
      for (const [unit, value] of Object.entries(parts)) {
        const digits = String(value).padStart(2, '0');
        const row = timer.querySelector<HTMLElement>(`[data-countdown-unit="${unit}"]`)!;
        if (row.childElementCount !== digits.length) row.replaceChildren(...Array.from(digits, () => {
          const span = document.createElement('span'); span.className = 'countdown-digit'; return span;
        }));
        Array.from(row.children).forEach((digit, index) => { if (digit.textContent !== digits[index]) digit.textContent = digits[index]; });
        description = description.replace(`{${unit}}`, String(value));
      }
      timer.setAttribute('aria-label', description);
    }
    const next = selected.map((event) => event.slug).join('|');
    if (next !== signature) {
      selected.forEach((event) => list.insertBefore(cards.get(event.slug)!, empty));
      signature = next;
    }
    if (moveFocus) {
      const target = selected.length ? cards.get(selected[0].slug)?.querySelector<HTMLAnchorElement>('a') : root.closest('section')?.querySelector<HTMLAnchorElement>('[data-home-events-action]');
      if (target) target.focus({ preventScroll: true });
      else { root.tabIndex = -1; root.focus({ preventScroll: true }); }
    }
    empty.hidden = selected.length > 0;
    empty.textContent = homeEmpty;
    list.hidden = false;
  }, 1000);
  root.querySelector<HTMLElement>('[data-browser-fallback]')!.hidden = true;
}
