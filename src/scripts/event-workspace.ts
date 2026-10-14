import { timeStatus, type PublicEvent } from '../lib/events';
import { formatAgendaDate, groupEventsByDay } from '../lib/event-agenda';
import { formatMonth, monthDays, romeDay, shiftMonth } from '../lib/dates';
import type { SiteData } from '../lib/schemas';
import type { pages } from '../lib/content';
import { watchClock } from './clock';

type Payload = { events: PublicEvent[]; settings: typeof pages.events; labels: SiteData['ui']['event']; locale: string };
type Position = { path: string; month: string; day: string; calendarTop: number; agendaTop: number; windowY: number; focus?: { day: string; href?: string; calendar: boolean } };
const validDay = (day: string | null): day is string => Boolean(day && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day);

for (const root of document.querySelectorAll<HTMLElement>('[data-event-workspace]')) {
  const { events, settings, labels, locale }: Payload = JSON.parse(root.querySelector('[data-event-data]')!.textContent!);
  const calendar = root.querySelector<HTMLElement>('[data-event-calendar]')!;
  const calendarScroll = root.querySelector<HTMLElement>('[data-calendar-scroll]')!;
  const dayList = root.querySelector<HTMLOListElement>('[data-calendar-days]')!;
  const agenda = root.querySelector<HTMLElement>('[data-agenda-scroll]')!;
  const agendaEmpty = root.querySelector<HTMLElement>('[data-agenda-empty]')!;
  const backCalendar = root.querySelector<HTMLAnchorElement>('[data-back-calendar]')!;
  const announcement = root.querySelector<HTMLElement>('[data-calendar-selection]')!;
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const mobile = matchMedia('(max-width: 64rem)');
  const groups = new Map(groupEventsByDay(events).map(({ day, events }) => [day, events]));
  const dayGroups = new Map(Array.from(agenda.querySelectorAll<HTMLElement>('[data-agenda-day]')).map((group) => [group.dataset.agendaDay!, group]));
  const eventsBySlug = new Map(events.map((event) => [event.slug, event]));
  const prior = history.state?.eventsWorkspace as Position | undefined;
  const initial = prior?.path === location.pathname ? prior : undefined;
  let selectedDay = romeDay(Date.now()), month = selectedDay.slice(0, 7);
  let calendarSignature = '', emptyDay: HTMLElement | undefined, frame = 0, interacted = false;
  const originalRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  const statusText = (event: PublicEvent, now: number) => `${labels[timeStatus(event, now)]}${event.cancelled ? ` · ${labels.cancelled}` : ''}`;
  const fullDate = (day: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

  function readUrl(saved?: Position) {
    const params = new URLSearchParams(location.search), day = params.get('day');
    selectedDay = validDay(saved?.day ?? null) ? saved!.day : validDay(day) ? day : romeDay(Date.now());
    if (!saved && !validDay(day)) {
      const focus = params.get('focus') ?? params.get('filter'); // Previous invitation URLs still jump, without filtering.
      if (focus === 'upcoming') {
        const next = events.filter((event) => Date.parse(event.end!) > Date.now()).sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!))[0];
        if (next) selectedDay = romeDay(Math.max(Date.now(), Date.parse(next.start!)));
      } else if (focus === 'past') {
        const previous = events.filter((event) => Date.parse(event.end!) <= Date.now()).sort((a, b) => Date.parse(b.end!) - Date.parse(a.end!))[0];
        if (previous) selectedDay = romeDay(Date.parse(previous.end!) - 1);
      }
    }
    const requestedMonth = saved?.month ?? params.get('month');
    month = requestedMonth && validDay(`${requestedMonth}-01`) ? requestedMonth : selectedDay.slice(0, 7);
  }
  function remember() {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const calendarDay = active?.closest<HTMLElement>('[data-day]')?.dataset.day;
    const agendaDay = active?.closest<HTMLElement>('[data-agenda-day]')?.dataset.agendaDay;
    const state: Position = { path: location.pathname, month, day: selectedDay, calendarTop: calendarScroll.scrollTop, agendaTop: agenda.scrollTop, windowY: scrollY };
    if (calendarDay || agendaDay) state.focus = { day: (calendarDay ?? agendaDay)!, href: active instanceof HTMLAnchorElement ? active.getAttribute('href') ?? undefined : undefined, calendar: Boolean(calendarDay) };
    history.replaceState({ ...history.state, eventsWorkspace: state }, '', location.href);
  }
  function rememberScroll() { cancelAnimationFrame(frame); frame = requestAnimationFrame(remember); }
  function writeUrl() {
    const url = new URL(location.href);
    url.searchParams.delete('view'); url.searchParams.delete('filter'); url.searchParams.delete('focus');
    url.searchParams.set('day', selectedDay); url.searchParams.set('month', month);
    history.replaceState(history.state, '', url);
    remember();
  }
  function fitPanels() {
    if (header) root.style.setProperty('--events-header-height', `${header.getBoundingClientRect().height}px`);
  }
  fitPanels();
  if (header) new ResizeObserver(fitPanels).observe(header);

  function makeSticker(event: PublicEvent, index: number, now: number): HTMLLIElement {
    const item = document.createElement('li');
    item.style.setProperty('--sticker-index', String(index));
    item.style.setProperty('--sticker-turn', index % 2 ? '6deg' : '-5deg');
    item.style.setProperty('--sticker-shift', index % 2 ? '3px' : '-3px');
    const anchor = document.createElement('a');
    anchor.className = 'calendar-sticker'; anchor.href = event.href;
    anchor.setAttribute('aria-label', `${event.title} — ${statusText(event, now)}`);
    anchor.title = anchor.getAttribute('aria-label')!;
    const art = document.createElement('span'), image = event.sticker || event.calendarImage || event.image;
    art.className = 'sticker-art';
    if (image) {
      anchor.classList.add('calendar-sticker-image'); art.classList.add('sticker-cutout');
      const thumbnail = document.createElement('img');
      thumbnail.src = image; thumbnail.alt = ''; thumbnail.loading = 'lazy'; thumbnail.width = 96; thumbnail.height = 96;
      art.append(thumbnail);
    } else {
      art.classList.add('sticker-text'); art.setAttribute('aria-hidden', 'true'); art.textContent = event.title;
    }
    const caption = document.createElement('span'), state = document.createElement('span');
    caption.className = 'calendar-event-title'; caption.textContent = event.title;
    state.className = 'calendar-event-state'; state.textContent = statusText(event, now);
    anchor.append(art, caption, state); item.append(anchor);
    return item;
  }
  function renderCalendar(now: number) {
    const signature = `${month}|${romeDay(now)}|${events.map((event) => `${event.slug}:${statusText(event, now)}`).join('|')}`;
    if (signature !== calendarSignature) {
      calendarSignature = signature;
      const active = document.activeElement instanceof HTMLElement && dayList.contains(document.activeElement) ? document.activeElement : null;
      const focusedDay = active?.closest<HTMLElement>('[data-day]')?.dataset.day;
      const focusedHref = active instanceof HTMLAnchorElement ? active.getAttribute('href') : null;
      const focusedMore = active?.hasAttribute('data-more-events');
      const top = calendarScroll.scrollTop, fragment = document.createDocumentFragment();
      let matches = 0;
      root.querySelector('[data-month-heading]')!.textContent = formatMonth(month, locale);
      for (const day of monthDays(month)) {
        const cell = document.createElement('li'), button = document.createElement('button'), date = document.createElement('time');
        cell.className = 'calendar-day'; cell.dataset.day = day; cell.dataset.today = String(day === romeDay(now));
        if (day.endsWith('-01')) cell.style.gridColumnStart = String(new Date(`${day}T12:00:00Z`).getUTCDay() || 7);
        button.type = 'button'; button.className = 'calendar-day-select'; button.dataset.selectDay = day;
        button.setAttribute('aria-label', settings.controls.selectDay.replace('{date}', fullDate(day)));
        button.setAttribute('aria-controls', 'event-agenda');
        date.dateTime = day; date.textContent = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
        button.append(date); cell.append(button);
        const dayEvents = groups.get(day) ?? [];
        matches += dayEvents.length; cell.dataset.eventCount = String(dayEvents.length);
        if (dayEvents.length) {
          const stack = document.createElement('ul'), stickers = dayEvents.slice(0, 3);
          stack.className = 'calendar-sticker-stack'; stack.style.setProperty('--sticker-count', String(stickers.length));
          stickers.forEach((event, index) => stack.append(makeSticker(event, index, now)));
          if (dayEvents.length > stickers.length) {
            const item = document.createElement('li'), more = document.createElement('button');
            item.className = 'sticker-more'; more.type = 'button'; more.dataset.selectDay = day; more.dataset.moreEvents = '';
            more.setAttribute('aria-controls', 'event-agenda'); more.textContent = `+${dayEvents.length - stickers.length}`;
            more.setAttribute('aria-label', settings.controls.moreEvents.replace('{count}', String(dayEvents.length - stickers.length)));
            more.title = more.getAttribute('aria-label')!;
            item.append(more); stack.append(item);
          }
          cell.append(stack);
        }
        fragment.append(cell);
      }
      dayList.replaceChildren(fragment); calendarScroll.scrollTop = top;
      root.querySelector<HTMLElement>('[data-calendar-empty]')!.hidden = matches > 0;
      if (focusedDay) {
        const cell = dayList.querySelector<HTMLElement>(`[data-day="${focusedDay}"]`);
        const target = focusedHref ? Array.from(cell?.querySelectorAll<HTMLAnchorElement>('a') ?? []).find((anchor) => anchor.getAttribute('href') === focusedHref)
          : cell?.querySelector<HTMLButtonElement>(focusedMore ? '[data-more-events]' : '.calendar-day-select');
        (target ?? cell?.querySelector<HTMLButtonElement>('.calendar-day-select'))?.focus({ preventScroll: true });
      }
    }
    for (const cell of dayList.querySelectorAll<HTMLElement>('[data-day]')) {
      const selected = cell.dataset.day === selectedDay;
      cell.dataset.selected = String(selected); cell.querySelector('button')!.setAttribute('aria-pressed', String(selected));
    }
  }
  function selectAgendaDay(showEmpty = true): HTMLElement | undefined {
    emptyDay?.remove(); emptyDay = undefined;
    let target = dayGroups.get(selectedDay);
    if (!target && showEmpty) {
      target = document.createElement('section');
      target.className = 'event-agenda-day'; target.dataset.agendaDay = selectedDay; target.id = `agenda-day-${selectedDay}`;
      const heading = document.createElement('h3'), date = document.createElement('time'), message = document.createElement('p');
      heading.id = `agenda-heading-${selectedDay}`; heading.tabIndex = -1;
      date.dateTime = selectedDay; date.textContent = formatAgendaDate(selectedDay, locale); heading.append(date);
      target.setAttribute('aria-labelledby', heading.id);
      message.className = 'empty'; message.textContent = settings.empty.day; target.append(heading, message);
      const next = Array.from(dayGroups).find(([day]) => day > selectedDay)?.[1] ?? agendaEmpty;
      agenda.insertBefore(target, next); emptyDay = target;
    }
    for (const group of agenda.querySelectorAll<HTMLElement>('[data-agenda-day]')) group.dataset.selected = String(group.dataset.agendaDay === selectedDay);
    agendaEmpty.hidden = events.length > 0 || Boolean(target);
    return target;
  }
  function scrollToDay(target: HTMLElement, smooth = false) {
    const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant';
    if (mobile.matches) target.scrollIntoView({ block: 'start', behavior });
    else agenda.scrollTo({ top: agenda.scrollTop + target.getBoundingClientRect().top - agenda.getBoundingClientRect().top, behavior });
  }
  function chooseDay(day: string) {
    selectedDay = day; month = day.slice(0, 7);
    renderCalendar(Date.now());
    const target = selectAgendaDay();
    if (target) {
      if (mobile.matches) target.querySelector<HTMLElement>('h3')!.focus({ preventScroll: true });
      scrollToDay(target, true);
    }
    announcement.textContent = settings.controls.selectedDay.replace('{date}', fullDate(day)).replace('{count}', String(groups.get(day)?.length ?? 0));
    writeUrl();
  }
  function update(now: number) {
    renderCalendar(now);
    // Update labels in place: date order, links, focus and scroll positions stay stable.
    for (const state of agenda.querySelectorAll<HTMLElement>('[data-agenda-status]')) {
      const text = statusText(eventsBySlug.get(state.dataset.agendaStatus!)!, now);
      if (state.textContent !== text) state.textContent = text;
    }
  }
  function restore(state: Position) {
    calendarScroll.scrollTop = state.calendarTop; agenda.scrollTop = state.agendaTop;
    if (state.focus) {
      const container = state.focus.calendar ? dayList.querySelector<HTMLElement>(`[data-day="${state.focus.day}"]`) : agenda.querySelector<HTMLElement>(`[data-agenda-day="${state.focus.day}"]`);
      const target = state.focus.href ? Array.from(container?.querySelectorAll<HTMLAnchorElement>('a') ?? []).find((link) => link.getAttribute('href') === state.focus!.href)
        : container?.querySelector<HTMLElement>(state.focus.calendar ? '.calendar-day-select' : 'h3');
      target?.focus({ preventScroll: true });
    }
    window.scrollTo({ top: state.windowY, behavior: 'instant' });
  }

  readUrl(initial);
  const weekdays = root.querySelector<HTMLElement>('[data-calendar-weekdays]')!;
  for (let day = 1; day <= 7; day++) {
    const label = document.createElement('span');
    label.textContent = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day)));
    weekdays.append(label);
  }
  root.dataset.eventReady = 'true'; calendar.hidden = false; backCalendar.hidden = false;
  root.querySelector<HTMLElement>('[data-browser-fallback]')!.hidden = true;
  const query = new URLSearchParams(location.search);
  selectAgendaDay(events.length > 0 || validDay(query.get('day')));
  watchClock(events, update);
  const focusedQuery = query.has('focus') || query.has('filter') || query.has('day');
  if (!initial && (!mobile.matches || focusedQuery)) {
    const target = dayGroups.get(selectedDay) ?? emptyDay;
    if (target) scrollToDay(target);
  }
  if (initial) restore(initial);
  else remember();
  document.fonts.ready.then(() => {
    if (interacted || initial) return;
    if (!mobile.matches || focusedQuery) {
      const target = dayGroups.get(selectedDay) ?? emptyDay;
      if (target) scrollToDay(target);
    }
  });
  for (const event of ['pointerdown', 'wheel', 'keydown']) root.addEventListener(event, () => { interacted = true; }, { passive: true });
  dayList.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-select-day]') : null;
    if (button) chooseDay(button.dataset.selectDay!);
  });
  root.querySelector('[data-month-previous]')!.addEventListener('click', () => { month = shiftMonth(month, -1); calendarScroll.scrollTop = 0; renderCalendar(Date.now()); writeUrl(); });
  root.querySelector('[data-month-next]')!.addEventListener('click', () => { month = shiftMonth(month, 1); calendarScroll.scrollTop = 0; renderCalendar(Date.now()); writeUrl(); });
  root.querySelector('[data-month-today]')!.addEventListener('click', () => chooseDay(romeDay(Date.now())));
  backCalendar.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = dayList.querySelector<HTMLElement>(`.calendar-day-select[data-select-day="${selectedDay}"]`) ?? root.querySelector<HTMLElement>('[data-month-heading]')!;
    target.focus({ preventScroll: true });
    if (mobile.matches) calendar.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  agenda.addEventListener('scroll', rememberScroll, { passive: true });
  calendarScroll.addEventListener('scroll', rememberScroll, { passive: true });
  window.addEventListener('scroll', rememberScroll, { passive: true });
  window.addEventListener('pagehide', () => { remember(); history.scrollRestoration = originalRestoration; });
  window.addEventListener('pageshow', (event) => {
    history.scrollRestoration = 'manual';
    const state = event.persisted ? history.state?.eventsWorkspace as Position | undefined : initial;
    if (state) requestAnimationFrame(() => restore(state));
  });
  window.addEventListener('popstate', (event) => {
    const state = event.state?.eventsWorkspace as Position | undefined;
    readUrl(state); selectAgendaDay(events.length > 0 || validDay(new URLSearchParams(location.search).get('day'))); update(Date.now());
    if (state) restore(state);
  });
}
