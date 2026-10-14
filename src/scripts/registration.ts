import { registrationState, timeStatus } from '../lib/events';
import { formatInstant } from '../lib/dates';
import type { EventData, SiteData } from '../lib/schemas';
import { watchClock } from './clock';

for (const root of document.querySelectorAll<HTMLElement>('[data-registration]')) {
  const { event, labels, locale }: { event: EventData; labels: SiteData['ui']['event']; locale: string } = JSON.parse(root.querySelector('[data-registration-data]')!.textContent!);
  const explanation = root.querySelector<HTMLElement>('[data-registration-state]')!;
  const action = root.querySelector<HTMLElement>('[data-registration-action]')!;
  const setText = (element: Element, text: string) => { if (element.textContent !== text) element.textContent = text; };
  const update = (now: number) => {
    const postStatus = root.closest('main')?.querySelector('[data-post-event-status]');
    if (postStatus) setText(postStatus, labels[timeStatus(event, now)]);
    const state = registrationState(event, now);
    root.dataset.registrationStatus = state;
    if (state === 'open') {
      setText(explanation, '');
      if (!action.firstElementChild) {
        const anchor = document.createElement('a');
        anchor.className = 'button';
        anchor.textContent = event.registrationLabel;
        anchor.href = event.registrationUrl;
        anchor.addEventListener('click', (click) => {
          if (registrationState(event, Date.now()) !== 'open') { click.preventDefault(); update(Date.now()); }
        });
        action.append(anchor);
      }
    } else {
      action.replaceChildren();
      setText(explanation, state === 'scheduled' ? labels.opens.replace('{date}', formatInstant(event.registrationOpens!, locale)) : state === 'none' ? labels.noRegistration : labels[state]);
    }
  };
  watchClock([event], update);
}
