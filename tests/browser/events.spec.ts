import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { NOW } from '../fixtures/content';

const pageCopy = JSON.parse(readFileSync('content/pages/events.json', 'utf8'));
const join = JSON.parse(readFileSync('content/pages/join.json', 'utf8'));
const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
let errors: string[];
test.beforeEach(async ({ page }) => {
  errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date(NOW) });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});
test.afterEach(() => expect(errors).toEqual([]));

test('calendar dates select a chronological agenda without hiding past, future or empty-date neighbours', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/events/');
  expect(await page.locator('[data-agenda-day]').evaluateAll((groups) => groups.map((group) => group.getAttribute('data-agenda-day')))).toEqual(['2026-09-15', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-25']);
  await expect(page.locator('[data-agenda-event]')).toHaveCount(11);
  await expect(page.locator('[data-event-agenda]')).not.toContainText('Shared edited summary');
  await page.locator('[data-select-day="2026-10-20"]').click();
  const empty = page.locator('[data-agenda-day="2026-10-20"]');
  await expect(empty).toHaveAttribute('data-selected', 'true');
  await expect(empty).toContainText(pageCopy.empty.day);
  await expect(empty).toBeInViewport();
  await expect(page.locator('[data-agenda-event]')).toHaveCount(11);
  await expect(page.locator('[data-calendar-selection]')).toHaveText('Events for Tuesday, 20 October 2026: 0');
  await page.locator('[data-select-day="2026-10-12"]').click();
  await expect(empty).toHaveCount(0);
  await expect(page.locator('[data-agenda-day="2026-10-12"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-calendar-selection]')).toHaveText('Events for Monday, 12 October 2026: 3');
  await page.getByRole('button', { name: pageCopy.controls.next }).click();
  await expect(page.locator('[data-calendar-empty]')).toBeVisible();
  await expect(page.locator('[data-agenda-event]')).toHaveCount(11);
  await expect(page.locator('[data-agenda-day="2026-10-12"]')).toHaveAttribute('data-selected', 'true');
});

test('the calendar scrolls with the page while the agenda stays pinned and scrolls on its own', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 650 });
  await page.goto('/events/');
  const header = (await page.locator('[data-site-header]').boundingBox())!;
  const agenda = page.locator('[data-agenda-scroll]'), calendar = page.locator('[data-calendar-scroll]'), panel = page.locator('[data-event-agenda]');
  expect(await calendar.evaluate((element) => getComputedStyle(element).overflowY)).toBe('visible');
  expect(await panel.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  const agendaBox = (await agenda.boundingBox())!, calendarBox = (await calendar.boundingBox())!;
  await agenda.evaluate((element) => { element.scrollTop = 0; });
  await page.mouse.move(agendaBox.x + agendaBox.width / 2, agendaBox.y + 100);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => agenda.evaluate((element) => element.scrollTop)).toBeGreaterThan(50);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const agendaTop = await agenda.evaluate((element) => element.scrollTop);
  // Wheel over the calendar moves the page; the pinned agenda neither scrolls nor leaves the viewport.
  await page.mouse.move(calendarBox.x + calendarBox.width / 2, calendarBox.y + 100);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(await agenda.evaluate((element) => element.scrollTop)).toBe(agendaTop);
  const pinned = (await panel.boundingBox())!;
  expect(pinned.y).toBeGreaterThanOrEqual(header.height - 1);
  expect(pinned.y + pinned.height).toBeLessThanOrEqual(650 + 1);
  await page.mouse.wheel(0, 20000);
  await expect(page.locator('footer')).toBeInViewport();
  await page.mouse.wheel(0, -20000);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test('the calendar month header and weekday row stick together at the top when scrolling down', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 650 });
  await page.goto('/events/');
  const header = (await page.locator('[data-site-header]').boundingBox())!;
  const calHeader = page.locator('[data-calendar-header]');
  expect(await calHeader.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  const weekdays = page.locator('[data-calendar-weekdays]');
  const monthHeading = page.locator('[data-month-heading]');
  await expect(monthHeading).toBeVisible();
  await expect(weekdays).toBeVisible();

  await page.evaluate(() => scrollTo(0, 300));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);

  const stickyBox = (await calHeader.boundingBox())!;
  expect(Math.abs(stickyBox.y - header.height)).toBeLessThanOrEqual(2);
  await expect(monthHeading).toBeInViewport();
  await expect(weekdays).toBeInViewport();

  await page.getByRole('button', { name: pageCopy.controls.next }).click();
  await expect(page.locator('[data-calendar-empty]')).toBeVisible();
  await expect(monthHeading).toBeInViewport();
});

test('event post navigation and browser Back restore the selected day and positions', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 650 });
  await page.goto('/events/');
  await page.locator('[data-select-day="2026-10-25"]').click();
  const agenda = page.locator('[data-agenda-scroll]');
  const link = page.locator('[data-agenda-day="2026-10-25"] a');
  await link.scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, 60));
  const pageY = await page.evaluate(() => scrollY), agendaTop = await agenda.evaluate((element) => element.scrollTop);
  await link.click();
  await expect(page).toHaveURL(/\/events\/future-dst\/$/);
  await expect(page.locator('h1')).toHaveText('Future DST fixture');
  await expect(page.locator('main')).toContainText('Full fixture post.');
  await page.goBack();
  await expect(page.locator('[data-select-day="2026-10-25"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => agenda.evaluate((element) => element.scrollTop)).toBeCloseTo(agendaTop, 0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(pageY, 0);
  await expect(link).toBeFocused();
  await page.reload();
  await expect(page.locator('[data-agenda-day="2026-10-25"]')).toHaveAttribute('data-selected', 'true');
  await expect.poll(() => agenda.evaluate((element) => element.scrollTop)).toBeCloseTo(agendaTop, 0);
});

test('an event post returns to the exact Events day it was opened from', async ({ page }) => {
  await page.goto('/events/');
  await page.locator('[data-select-day="2026-10-25"]').click();
  await page.locator('[data-agenda-day="2026-10-25"] a').click();
  const back = page.getByRole('link', { name: site.ui.post.backEvents, exact: true });
  await expect(back).toBeVisible();
  await expect(page.getByRole('link', { name: site.ui.post.backHome, exact: true })).not.toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/events\/\?day=2026-10-25&month=2026-10$/);
  await expect(page.locator('[data-select-day="2026-10-25"]')).toHaveAttribute('aria-pressed', 'true');
});

test('an event post opened from Home returns to Home', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-event-card]:visible h3 a').first().click();
  await expect(page).toHaveURL(/\/events\/[^/]+\/$/);
  const back = page.getByRole('link', { name: site.ui.post.backHome, exact: true });
  await expect(back).toBeVisible();
  await expect(page.getByRole('link', { name: site.ui.post.backEvents, exact: true })).not.toBeVisible();
  await back.click();
  expect(new URL(page.url()).pathname).toBe('/');
});

test('mobile day selection moves into the stacked agenda and the shortcut returns to the calendar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/events/');
  await page.locator('[data-select-day="2026-10-12"]').click();
  const heading = page.locator('[data-agenda-day="2026-10-12"] h3');
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(page.locator('[data-back-calendar]')).toBeInViewport();
  expect(await page.locator('[data-agenda-scroll]').evaluate((element) => getComputedStyle(element).overflowY)).toBe('visible');
  await page.locator('[data-back-calendar]').click();
  await expect(page.locator('[data-select-day="2026-10-12"]')).toBeFocused();
  await expect(page.locator('[data-month-heading]')).toBeInViewport();
  await expect(page.locator('[data-agenda-event]')).toHaveCount(11);
});

test('upcoming invitations and old filter URLs jump to a date but never filter the agenda', async ({ page }) => {
  await page.goto('/join/');
  await page.getByRole('link', { name: join.membership.events.label, exact: true }).click();
  await expect(page.locator('[data-agenda-day="2026-10-12"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-agenda-day="2026-09-15"] a')).toHaveCount(4);
  await page.goto('/events/?filter=past&view=list');
  await expect(page.locator('[data-agenda-day="2026-10-10"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-agenda-event="future-dst"]')).toHaveCount(1);
  await expect(page.locator('[data-event-filter], [data-event-view-toggle]')).toHaveCount(0);
});

test('editorial markup remains data and cannot truncate the calendar payload', async ({ page }) => {
  await page.goto('/events/');
  const note = await page.locator('[data-event-workspace] [data-event-data]').evaluate((element) => JSON.parse(element.textContent!).events.find((event: { slug: string }) => event.slug === 'future-dst').accessibility);
  expect(note).toBe('A fixture note containing the literal </script> delimiter.');
  await expect(page.locator('[data-day]')).toHaveCount(31);
  await expect(page.locator('[data-agenda-event="future-dst"]')).toContainText('Upcoming');
});

test('the static agenda retains complete dates, midnight rules and event links without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 850 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323/events/');
  await expect(page.locator('[data-event-calendar]')).not.toBeVisible();
  await expect(page.locator('[data-agenda-event]')).toHaveCount(11);
  await expect(page.locator('[data-agenda-day="2026-10-11"]')).toContainText('Overnight fixture');
  await expect(page.locator('[data-agenda-day="2026-10-12"]')).toContainText('Overnight fixture');
  await expect(page.locator('[data-agenda-day="2026-10-13"]')).toHaveCount(0);
  await expect(page.locator('[data-agenda-day="2026-09-15"] h3')).toContainText('2026');
  await page.getByRole('link', { name: 'Shared edited event', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Shared edited event');
  await expect(page.locator('main')).toContainText('Full fixture post.');
  await context.close();
});

test('an empty collection shows a selected empty date consistently after reload', async ({ page }) => {
  await page.goto('/empty-browsers/events/');
  await expect(page.locator('[data-agenda-empty]')).toBeVisible();
  await page.locator('[data-select-day="2026-10-20"]').click();
  const selected = page.locator('[data-agenda-day="2026-10-20"]');
  await expect(selected).toContainText(pageCopy.empty.day);
  await expect(page.locator('[data-agenda-empty]')).not.toBeVisible();
  await page.reload();
  await expect(selected).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-select-day="2026-10-20"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-agenda-empty]')).not.toBeVisible();
  await expect(page.locator('[data-agenda-event]')).toHaveCount(0);
});

for (const scheme of ['light', 'dark'] as const) for (const width of [320, 800, 1280]) {
  test(`calendar and day-grouped agenda layout: ${scheme}, ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/events/');
    await expect(page.locator('[data-day]')).toHaveCount(31);
    await expect(page.locator('[data-event-agenda]')).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Come along');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 1024) await page.screenshot({ path: testInfo.outputPath(`events-stacked-${scheme}-${width}.png`), fullPage: true });
    await page.locator('[data-select-day="2026-10-12"]').click();
    await expect(page.locator('[data-agenda-day="2026-10-12"]')).toHaveAttribute('data-selected', 'true');
    await page.screenshot({ path: testInfo.outputPath(`events-${scheme}-${width}.png`), fullPage: width > 1024 });
  });
}
