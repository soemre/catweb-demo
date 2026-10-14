import { test, expect, type Page } from '@playwright/test';
import { NOW, stackedEvents } from '../fixtures/content';
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
const eventsPage = JSON.parse(readFileSync('content/pages/events.json', 'utf8'));
const contactPage = JSON.parse(readFileSync('content/pages/contact.json', 'utf8'));
const joinPage = JSON.parse(readFileSync('content/pages/join.json', 'utf8'));
const homePage = JSON.parse(readFileSync('content/pages/home.json', 'utf8'));
const resourcesPage = JSON.parse(readFileSync('content/pages/resources.json', 'utf8'));

async function expectLogos(page: Page, theme: 'light' | 'dark') {
  for (const scope of [page.locator('[data-site-header]'), page.getByRole('contentinfo')]) {
    const visible = scope.locator('.brand-logo:visible');
    await expect(visible).toHaveCount(1);
    await expect(visible).toHaveAttribute('src', theme === 'dark' ? site.logoDark : site.logo);
    await expect(visible).toHaveAttribute('alt', site.logoAlt || site.name);
    await expect.poll(() => visible.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
}

let errors: string[];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date(NOW) });
});
test.afterEach(() => expect(errors).toEqual([]));

test('CMS page edits, Area insertion/reordering, drafts and unverified records', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CMS-edited Home headline');
  await expect(page).toHaveTitle(`${homePage.title} · ${site.name}`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'CMS-edited search description');
  await expect(page.locator('main [data-event-card]:visible')).toHaveCount(2);
  await expect(page.locator('[data-home-news-list] a[href^="/news/"]')).toHaveCount(5);
  await page.goto('/join/');
  await expect(page.locator('[data-area] h3')).toHaveText(['New CMS Area', 'Awareness', 'Communication', 'Community', 'Organisation']);
  await expect(page.locator('main')).not.toContainText('Secret');
  await expect(page.locator('main')).not.toContainText('for the first time');
  await expect(page.getByRole('link', { name: joinPage.membership.formLabel })).toHaveAttribute('href', 'https://docs.google.com/forms/d/e/test-form/viewform');
  await expect(page.locator('iframe')).toHaveCount(0);
  for (const route of ['/events/', '/milestones/', '/news/', '/resources/']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('Secret draft');
  }
  const response = await page.goto('/events/secret-draft/');
  expect(response!.status()).toBe(404);
});

test('shared event changes reach Home, agenda, calendar and the stable post URL', async ({ page }) => {
  await page.goto('/');
  const homeLink = page.getByRole('link', { name: 'Shared edited event', exact: true });
  await expect(homeLink).toHaveAttribute('href', '/events/shared-event/');
  await expect(page.locator('[data-event-card="shared-event"]')).toContainText('Shared edited summary');
  await page.goto('/events/');
  await expect(page.locator('[data-event-agenda]').getByRole('link', { name: 'Shared edited event', exact: true })).toHaveAttribute('href', '/events/shared-event/');
  await expect(page.locator('[data-event-view-toggle], [data-event-filter], [data-event-card]')).toHaveCount(0);
  await expect(page.locator('[data-day="2026-10-12"] a')).toHaveCount(3);
  await expect(page.getByRole('link', { name: /^Shared edited event —/ })).toHaveAttribute('href', '/events/shared-event/');
  await expect(page.locator('[data-day="2026-10-11"]')).toContainText('Overnight fixture');
  await expect(page.locator('[data-day="2026-10-12"]')).toContainText('Overnight fixture');
  await expect(page.locator('[data-day="2026-10-13"]')).not.toContainText('Overnight fixture');
  await page.getByRole('button', { name: eventsPage.controls.next }).click();
  await expect(page.locator('[data-month-heading]')).toHaveText('November 2026');
  await expect(page.locator('[data-calendar-empty]')).toBeVisible();
  await expect(page.locator('[data-agenda-day="2026-09-15"] a')).toHaveCount(4);
  await page.getByRole('button', { name: eventsPage.controls.today, exact: true }).click();
  await expect(page.locator('[data-month-heading]')).toHaveText('October 2026');
  await expect(page.locator('[data-event-agenda] a[href^="/events/"]')).toHaveText([...stackedEvents.map((event) => event.title), 'Older fixture', 'Recent past fixture', 'Overnight fixture', 'Overnight fixture', 'Shared edited event', 'Cancelled fixture', 'Future DST fixture']);
  await page.locator('[data-event-agenda]').getByRole('link', { name: 'Shared edited event', exact: true }).click();
  await expect(page).toHaveURL(/\/events\/shared-event\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shared edited event');
  await expect(page).toHaveTitle(`Shared edited event · ${site.name}`);
  await expect(page.locator('main')).toContainText('Full fixture post.');
});

test('registration becomes non-actionable at the exact deadline on an open page', async ({ page }) => {
  await page.clock.pauseAt(new Date(NOW));
  await page.goto('/events/shared-event/');
  await expect(page.getByRole('link', { name: 'Register fixture' })).toBeVisible();
  await page.clock.runFor(999);
  await expect(page.getByRole('link', { name: 'Register fixture' })).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.locator('[data-registration-state]')).toHaveText('Registration closed');
  await expect(page.locator('[data-registration-action] a')).toHaveCount(0);
  await page.clock.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-post-event-status]')).toHaveText('Happening now');
  await page.clock.setSystemTime(new Date('2026-10-12T14:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-registration-state]')).toHaveText('Event ended');
  await expect(page.locator('[data-post-event-status]')).toHaveText('Past');
  await expect(page.locator('main')).toContainText('Full fixture post.');
});

test('focus return corrects a skipped deadline and cancellation stays discoverable', async ({ page }) => {
  await page.goto('/events/shared-event/');
  await expect(page.getByRole('link', { name: 'Register fixture' })).toBeVisible();
  await page.clock.setSystemTime(new Date('2026-10-12T10:01:00Z'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('[data-registration-action] a')).toHaveCount(0);
  await page.goto('/events/cancelled/');
  await expect(page.locator('[data-registration-state]')).toHaveText('Event cancelled');
  await expect(page.locator('main')).toContainText('Fixture cancellation notice.');
});

test('Home previews update across event boundaries while the agenda retains every event', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-event-card="overnight"]')).not.toBeVisible();
  await expect(page.locator('[data-event-card="cancelled"]')).not.toBeVisible();
  await expect(page.locator('[data-event-card]:visible')).toHaveCount(2);
  await page.clock.setSystemTime(new Date('2026-10-14T12:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-event-card]:visible')).toHaveCount(1);
  await expect(page.locator('[data-event-card]:visible')).toContainText('Future DST fixture');
  await page.goto('/events/?filter=past');
  await expect(page.locator('[data-agenda-event]')).toHaveCount(11);
  await expect(page.locator('[data-agenda-day][data-selected="true"]')).toHaveAttribute('data-agenda-day', '2026-10-12');
  await expect(page.locator('[data-agenda-event="future-dst"]')).toContainText('Upcoming');
});

test('single theme switch follows the device initially and persists manual choices', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const toggle = page.getByRole('switch', { name: site.ui.theme.dark, exact: true });
  await expect(page.locator('[data-theme-auto]')).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(toggle.locator('svg:visible')).toHaveCount(1);
  await expect(toggle.locator('[data-icon="moon"]')).toBeVisible();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle.locator('[data-icon="sun"]')).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await toggle.click();
  await page.goto('/join/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await page.goto('/contact/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('header/footer logos follow manual theme choices across device changes, repeated toggles and reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('cat-theme', 'light'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expectLogos(page, 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  for (const theme of ['dark', 'light', 'dark', 'light'] as const) {
    await page.getByRole('switch').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expectLogos(page, theme);
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expectLogos(page, 'light');
  for (const source of [site.logo, site.logoDark]) {
    const response = await page.request.get(source);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain('prefers-color-scheme');
  }
});

test('logo variants follow the device without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await expectLogos(page, 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expectLogos(page, 'light');
  await context.close();
});

test('mobile month grid shows empty dates and selected dates reveal their events', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/events/');
  await expect(page.locator('[data-day]')).toHaveCount(31);
  await expect(page.locator('[data-day="2026-10-01"]')).toBeVisible();
  await expect(page.locator('[data-day="2026-10-13"]')).toBeVisible();
  await expect(page.locator('[data-day="2026-10-31"]')).toBeVisible();
  await expect(page.locator('[data-calendar-weekdays] span')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  for (const weekday of await page.locator('[data-calendar-weekdays] span').all()) {
    await expect(weekday).toBeVisible();
    expect(await weekday.evaluate((node) => getComputedStyle(node).color)).not.toBe('rgba(0, 0, 0, 0)');
  }
  await page.locator('[data-select-day="2026-10-12"]').click();
  await expect(page.locator('[data-agenda-day="2026-10-12"] h3')).toHaveText('Monday, 12 Oct 2026');
  await expect(page.locator('[data-agenda-day="2026-10-12"] a')).toHaveText(['Overnight fixture', 'Shared edited event', 'Cancelled fixture']);
  await expect(page.locator('[data-agenda-day="2026-09-15"] a')).toHaveCount(4);
  await page.locator('[data-select-day="2026-10-20"]').click();
  await expect(page.locator('[data-agenda-day="2026-10-20"] .empty')).toBeVisible();
  await expect(page.locator('[data-select-day="2026-10-20"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('calendar date selection and live status refresh preserve keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/events/');
  const date = page.locator('.calendar-day-select[data-select-day="2026-10-12"]');
  await expect(date).toHaveAccessibleName('Show events for Monday, 12 October 2026');
  await date.focus();
  await page.keyboard.press('Enter');
  await expect(date).toBeFocused();
  await expect(date).toHaveAttribute('aria-pressed', 'true');
  await page.clock.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(date).toBeFocused();
  const selectedLink = page.locator('[data-agenda-day="2026-10-12"] a[href="/events/shared-event/"]');
  await selectedLink.focus();
  await page.clock.setSystemTime(new Date('2026-10-12T14:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(selectedLink).toBeFocused();
  await expect(selectedLink.locator('../..')).toContainText('Past');
});

test.describe('touch calendar', () => {
  test.use({ hasTouch: true });

  test('mobile calendar overflow jumps to all four events and survives rotation and month controls', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto('/events/?filter=past');
    await page.getByRole('button', { name: eventsPage.controls.previous }).click();
    await expect(page.locator('[data-day]')).toHaveCount(30);
    const day = page.locator('[data-day="2026-09-15"]');
    await expect(day.locator('a')).toHaveCount(3);
    const more = day.getByRole('button', { name: eventsPage.controls.moreEvents.replace('{count}', '1') });
    await expect(more).toBeVisible();
    await more.tap();
    await expect(page.locator('[data-agenda-day="2026-09-15"] h3')).toHaveText('Tuesday, 15 Sept 2026');
    await expect(page.locator('[data-agenda-day="2026-09-15"] a')).toHaveText(stackedEvents.map((event) => event.title));
    await page.screenshot({ path: testInfo.outputPath('calendar-320-overflow.png'), fullPage: true });
    await page.setViewportSize({ width: 850, height: 390 });
    await expect(page.locator('[data-agenda-day="2026-09-15"] a')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 320, height: 850 });
    await page.locator('[data-back-calendar]').tap();
    await expect(page.locator('[data-day]')).toHaveCount(30);
    await expect(page.locator('[data-agenda-day="2026-10-25"]')).toHaveCount(1);
    await page.getByRole('button', { name: eventsPage.controls.today, exact: true }).click();
    await expect(page.locator('[data-month-heading]')).toHaveText('October 2026');
    await expect(page.locator('[data-day="2026-10-12"] a')).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath('calendar-320.png'), fullPage: true });
    await page.locator('[data-agenda-day="2026-10-12"] a[href="/events/shared-event/"]').tap();
    await expect(page).toHaveURL(/\/events\/shared-event\/$/);
  });
});

test('calendar keeps all dates on an empty month and supports month navigation', async ({ page }) => {
  await page.goto('/empty-browsers/events/');
  await expect(page.locator('[data-day]')).toHaveCount(31);
  await expect(page.locator('[data-calendar-empty]')).toBeVisible();
  await expect(page.locator('[data-agenda-empty]')).toBeVisible();
  await page.getByRole('button', { name: eventsPage.controls.next }).click();
  await expect(page.locator('[data-day]')).toHaveCount(30);
  await expect(page.locator('[data-month-heading]')).toHaveText('November 2026');
  await expect(page.locator('[data-calendar-empty]')).toBeVisible();
});

test('resources list only linked names and summaries, with details on their preview pages', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:4322/resources/');
  await expect(page.locator('[data-resource] h2').filter({ hasNotText: /^Demo:/ })).toHaveText([
    'Emergency/Crisis Resources', 'Trans* Etiquette', 'Collettivo Etiquette', 'You are not alone', 'Sexual Health & STI Guide', 'Alias career',
  ]);
  await expect(page.locator('[data-resource]').first()).toHaveAttribute('data-resource-status', 'preview');
  await expect(page.locator('[data-resource]').first()).toContainText('Where to find immediate help if you or someone else is in danger or in crisis.');
  const alias = page.locator('[data-resource]').filter({ has: page.getByRole('heading', { name: 'Alias career' }) });
  await expect(alias.getByRole('link')).toHaveCount(1);
  await expect(alias).not.toContainText(site.ui.resource.provider);
  await expect(alias.getByRole('link', { name: site.ui.resource.official })).toHaveCount(0);
  await expect(alias.getByRole('link', { name: site.ui.resource.guide })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Editorial notes');
  await expect(page.getByRole('link', { name: 'Alias career', exact: true })).toHaveAttribute('href', '/resources/alias-career/');
  await expect(page.locator('h1')).toHaveText(resourcesPage.headline);
  await page.setViewportSize({ width: 390, height: 850 });
  const trans = page.getByRole('link', { name: 'Trans* Etiquette', exact: true });
  await expect(trans.locator('svg[data-icon="caret-right"]')).toBeVisible();
  await expect(page.locator('[data-resource] img, [data-resource] time')).toHaveCount(0);
  for (const resource of await page.locator('[data-resource]').all()) {
    await expect(resource.getByRole('link')).toHaveCount(1);
    await expect(resource.locator('p')).toHaveCount(1);
    expect(await resource.evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe('0px');
  }
  await page.screenshot({ path: testInfo.outputPath('resources-mobile.png'), fullPage: true });
  await trans.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trans* Etiquette');
  await expect(page).toHaveTitle(`Trans* Etiquette · ${site.name}`);
  await expect(page.locator('[data-resource-preview]')).toHaveText(site.ui.resource.preview);
  await expect(page.locator('main')).toContainText('A guide to respectful interactions with trans people.');
  await expect(page.locator('body')).not.toContainText('Editorial notes');
  await page.screenshot({ path: testInfo.outputPath('resource-preview-mobile.png'), fullPage: true });
  await page.goto('http://127.0.0.1:4322/resources/alias-career/');
  await expect(page.locator('main')).toContainText(`${site.ui.resource.provider}: Politecnico di Torino`);
  await expect(page.getByRole('link', { name: site.ui.resource.official })).toHaveAttribute('href', 'https://www.polito.it/en/polito/equity-welfare-and-inclusion/diversity-and-inclusion/alias-careers');
});

test('Events opens directly on its calendar and agenda without introductory copy', async ({ page }) => {
  await page.goto('/events/');
  await expect(page.locator('main')).not.toContainText('Come along');
  await expect(page.locator('main')).not.toContainText('Our events are a chance to meet people');
  await expect(page.locator('main')).not.toContainText('Browse upcoming and past events in the list or calendar');
});

test('calendar stickers use overrides, covers and text fallbacks with usable stacked links', async ({ page }) => {
  await page.goto('/events/');
  const day = page.locator('[data-day="2026-10-12"]');
  const shared = day.locator('a[href="/events/shared-event/"]');
  await expect(shared.locator('img')).toHaveAttribute('src', '/media/sticker.svg');
  await expect(page.locator('[data-day="2026-10-09"] a[href="/events/older/"] img')).toHaveAttribute('src', '/media/sticker.svg');
  expect(await shared.locator('.sticker-art').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await shared.locator('img').evaluate((element) => getComputedStyle(element).objectFit)).toBe('contain');
  await expect(day.locator('a[href="/events/cancelled/"] img')).toHaveAttribute('src', '/media/fixture.svg');
  await expect(day.locator('a[href="/events/overnight/"] .sticker-text')).toContainText('Overnight fixture');
  const art = await day.locator('.sticker-art').all();
  const first = (await art[0].boundingBox())!, second = (await art[1].boundingBox())!, third = (await art[2].boundingBox())!;
  expect(second.y).toBeGreaterThan(first.y);
  expect(second.y).toBeLessThan(first.y + first.height);
  expect(third.y).toBeGreaterThan(second.y);
  expect(Math.abs(second.x - first.x)).toBeGreaterThan(1);
  await shared.focus();
  expect(await shared.locator('.sticker-art').evaluate((element) => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(3);
  await shared.locator('.sticker-art').click();
  await expect(page).toHaveURL(/\/events\/shared-event\/$/);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`calendar hover and keyboard focus follow the transparent sticker silhouette: ${scheme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1100, height: 850 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/events/');
    const day = page.locator('[data-day="2026-10-12"]'), link = day.locator('a[href="/events/shared-event/"]');
    const art = link.locator('.sticker-art'), image = art.locator('img');
    // The centre is covered by the next stacked sticker; hover its exposed upper edge.
    await image.hover({ position: { x: 16, y: 8 } });
    expect(await art.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
    expect(await image.evaluate((element) => getComputedStyle(element).filter)).toContain('drop-shadow');
    await day.screenshot({ path: testInfo.outputPath(`calendar-cutout-${scheme}.png`) });
    await page.mouse.move(0, 0);
    await link.focus();
    expect(await link.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
    expect(await image.evaluate((element) => getComputedStyle(element).filter)).toContain('drop-shadow');
    const text = day.locator('a[href="/events/overnight/"]');
    await text.focus();
    expect(await text.locator('.sticker-text').evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  });
}

test('social icons form a labelled horizontal row in Contact and the footer', async ({ page }) => {
  await page.goto('/contact/');
  for (const scope of [page.locator('main'), page.getByRole('contentinfo')]) {
    const telegram = scope.getByRole('link', { name: contactPage.labels.telegram, exact: true });
    const instagram = scope.getByRole('link', { name: contactPage.labels.instagram, exact: true });
    const linkedin = scope.getByRole('link', { name: contactPage.labels.linkedin, exact: true });
    await expect(telegram).toHaveAttribute('title', contactPage.labels.telegram);
    await expect(instagram).toHaveAttribute('title', contactPage.labels.instagram);
    await expect(linkedin).toHaveAttribute('title', contactPage.labels.linkedin);
    await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/company/collettivo-alan-turing');
    const first = (await telegram.boundingBox())!, second = (await instagram.boundingBox())!, third = (await linkedin.boundingBox())!;
    expect(Math.abs(first.y - second.y)).toBeLessThan(1);
    expect(Math.abs(first.y - third.y)).toBeLessThan(1);
    expect(second.x).toBeGreaterThan(first.x);
    expect(third.x).toBeGreaterThan(second.x);
    await telegram.focus();
    expect(await telegram.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  }
});

test('Apfel loads for headings/body/controls and dashboard mode emits no source beacon', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 32px "Apfel Grotezk"'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('16px "Apfel Grotezk"'))).toBe(true);
  for (const element of [page.locator('h1'), page.locator('main p').first(), page.locator('[data-theme-toggle]')]) {
    expect(await element.evaluate((node) => getComputedStyle(node).fontFamily)).toContain('Apfel Grotezk');
  }
  await expect(page.getByRole('contentinfo')).toContainText(site.footer.copy);
  await expect(page.locator('[data-analytics-loader]')).toHaveCount(0);
  expect((await page.request.get('/fonts/ApfelGrotezk-Regular.woff2')).status()).toBe(200);
});

test('resource destination types and uploaded media work', async ({ page }) => {
  await page.goto('/resources/');
  await expect(page.locator('[data-resource] h2')).toHaveText(['Fixture external resource', 'Fixture guide', 'Fixture file', 'Fixture preview guide', 'Fixture preview external']);
  await expect(page.getByRole('link', { name: 'Fixture guide', exact: true })).toHaveAttribute('href', '/resources/fixture-guide/');
  await expect(page.getByRole('link', { name: 'Fixture external resource', exact: true })).toHaveAttribute('href', '/resources/fixture-external/');
  await expect(page.getByRole('link', { name: 'Fixture file', exact: true })).toHaveAttribute('href', '/resources/fixture-file/');
  await expect(page.locator('[data-resource-list] img, [data-resource-list] time')).toHaveCount(0);
  await expect(page.locator('[data-resource-list]')).not.toContainText('Test provider');
  await expect(page.locator('[data-resource-list]')).not.toContainText('1 Oct 2026');
  await expect(page.locator('[data-resource-list]')).not.toContainText('Test-only additional description.');
  await expect(page.locator('[data-resource-list]')).not.toContainText('Test-only file instructions.');
  await page.getByRole('link', { name: 'Fixture guide', exact: true }).click();
  await expect(page).toHaveTitle(`Fixture guide · ${site.name}`);
  await expect(page.getByRole('heading', { name: 'Fixture guide heading' })).toBeVisible();
  await expect(page.locator('main')).toContainText('1 Oct 2026');
  await expect(page.locator('main')).toContainText('Test provider');
  await expect(page.locator('main img.cover')).toHaveAttribute('src', '/media/fixture.svg');
  await expect(page.getByRole('link', { name: site.ui.resource.official })).toHaveAttribute('href', 'https://example.org/official');
  await page.locator('main').getByRole('link', { name: site.ui.post.backResources, exact: true }).click();
  await page.getByRole('link', { name: 'Fixture external resource', exact: true }).click();
  await expect(page).toHaveTitle(`Fixture external resource · ${site.name}`);
  await expect(page.locator('main')).toContainText('Test-only additional description.');
  await expect(page.locator('main')).toContainText('Test external provider');
  await expect(page.locator('main time')).toHaveAttribute('datetime', '2026-10-01');
  await expect(page.getByRole('link', { name: site.ui.resource.external, exact: true })).toHaveAttribute('href', 'https://example.org/resource');
  await page.locator('main').getByRole('link', { name: site.ui.post.backResources, exact: true }).click();
  await page.getByRole('link', { name: 'Fixture file', exact: true }).click();
  await expect(page).toHaveTitle(`Fixture file · ${site.name}`);
  await expect(page.locator('main')).toContainText('Test-only file instructions.');
  await expect(page.getByRole('link', { name: site.ui.resource.file, exact: true })).toHaveAttribute('href', '/media/fixture.txt');
  await page.goto('/events/shared-event/');
  for (const image of await page.locator('main img').all()) expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect((await page.request.get('/media/fixture.txt')).status()).toBe(200);
});

test('preview details publish approved summaries/destinations but never unfinished bodies or notes', async ({ page }) => {
  await page.goto('/resources/');
  const previews = page.locator('[data-resource-status="preview"]');
  await expect(previews).toHaveCount(2);
  await expect(previews).toContainText(['Approved preview summary.', 'Approved external preview summary.']);
  await expect(previews.getByRole('link', { name: 'Fixture preview external', exact: true })).toHaveAttribute('href', '/resources/fixture-preview-external/');
  await expect(previews.getByRole('link', { name: site.ui.resource.guide })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('unfinished private');
  await expect(page.locator('body')).not.toContainText('Private preview editorial notes');
  const sitemap = await (await page.request.get('/sitemap-0.xml')).text();
  expect(sitemap).toContain('/resources/fixture-preview-guide/');
  await previews.getByRole('link', { name: 'Fixture preview guide', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture preview guide');
  await expect(page.locator('[data-resource-preview]')).toHaveText(site.ui.resource.preview);
  await expect(page.locator('body')).not.toContainText('unfinished private');
  await expect(page.locator('body')).not.toContainText('Private preview editorial notes');
  await page.goto('/resources/fixture-preview-external/');
  await expect(page.locator('main')).toContainText('Approved external preview summary.');
  await expect(page.locator('main')).toContainText('Test preview provider');
  await expect(page.locator('main time')).toHaveAttribute('datetime', '2026-10-02');
  await expect(page.getByRole('link', { name: site.ui.resource.external, exact: true })).toHaveAttribute('href', 'https://example.org/preview');
  await expect(page.locator('[data-resource-preview]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('unfinished private');
  await expect(page.locator('body')).not.toContainText('Private preview editorial notes');
  expect(sitemap).toContain('/resources/fixture-preview-external/');
  expect((await page.request.get('/resources/secret-draft/')).status()).toBe(404);
  expect(sitemap).not.toContain('/resources/secret-draft/');
});

test('keyboard navigation, labelled controls and visible focus', async ({ page }) => {
  await page.goto('/events/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: site.ui.skip })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const previous = page.getByRole('button', { name: eventsPage.controls.previous, exact: true });
  await previous.focus();
  expect(await previous.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-month-heading]')).toHaveText('September 2026');
  await expect(previous).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: eventsPage.controls.today, exact: true })).toBeFocused();
});

test('event calendar and agenda split on desktop and stack on small screens', async ({ page }) => {
  for (const width of [320, 390, 1100]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/events/');
    const calendar = (await page.locator('[data-event-calendar]').boundingBox())!, agenda = (await page.locator('[data-event-agenda]').boundingBox())!;
    if (width > 1024) {
      expect(agenda.x).toBeGreaterThan(calendar.x + calendar.width);
      expect(Math.abs(agenda.y - calendar.y)).toBeLessThan(1);
    } else expect(agenda.y).toBeGreaterThanOrEqual(calendar.y + calendar.height);
    await expect(page.locator('[data-event-view-toggle], [data-event-filter]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('scrolling ends at the footer on short and long pages without bottom overflow', async ({ page }) => {
  for (const width of [320, 390, 1100]) {
    await page.setViewportSize({ width, height: 850 });
    for (const route of ['/', '/join/', '/events/', '/milestones/', '/news/', '/resources/', '/resources/trans-etiquette/', '/contact/', '/missing-page/']) {
      await page.goto(`http://127.0.0.1:4322${route}`);
      // Populated demo pages have lazy images; settle their layout before measuring the final edge.
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).filter((image) => image.checkVisibility()).map(async (image) => {
          image.loading = 'eager';
          await image.decode().catch(() => {});
        }));
        // Let pageshow scroll restoration finish before the test chooses its own position.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      });
      const bounds = await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const footer = document.querySelector('footer')!.getBoundingClientRect();
        return { gap: document.documentElement.scrollHeight - footer.bottom - scrollY, bottom: footer.bottom, y: scrollY, height: innerHeight };
      });
      expect(Math.abs(bounds.gap)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds.bottom - bounds.height)).toBeLessThanOrEqual(1);
      expect(await page.locator('html').evaluate((node) => getComputedStyle(node).overscrollBehaviorY)).toBe('none');
      await page.mouse.wheel(0, 1000);
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(bounds.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('mobile menu supports keyboard opening, Escape, outside clicks and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: site.ui.menu, exact: true });
  const navigation = page.getByRole('navigation', { name: site.ui.navigation, includeHidden: true });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', { name: site.navigation.contact.label, exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(navigation).toBeHidden();
  await menu.click();
  await page.locator('[data-join-cta]').click();
  await expect(page).toHaveURL(/\/join\/$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('responsive navigation recovers on resize and indicates the current post section', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/events/shared-event/');
  const menu = page.getByRole('button', { name: site.ui.menu, exact: true });
  const navigation = page.getByRole('navigation', { name: site.ui.navigation, includeHidden: true });
  await menu.click();
  await expect(navigation.getByRole('link', { name: site.navigation.events.label, exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1100, height: 850 });
  await expect(menu).toBeHidden();
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', { name: site.navigation.events.label, exact: true }).focus();
  await page.setViewportSize({ width: 390, height: 850 });
  await expect(menu).toBeFocused();
  await expect(navigation).toBeHidden();
});

test('compact footer preserves labelled contact links and details are on Contact', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('navigation')).toHaveCount(0);
  await expect(footer.getByRole('link', { name: site.contact.email })).toHaveAttribute('href', `mailto:${site.contact.email}`);
  await expect(footer.getByRole('link', { name: contactPage.labels.telegram })).toHaveAttribute('href', site.contact.telegram);
  await expect(footer.getByRole('link', { name: contactPage.labels.instagram, exact: true })).toHaveAttribute('href', site.contact.instagram);
  await expect(footer).not.toContainText('Get in touch');
  await expect(footer).not.toContainText(contactPage.labels.office);
  await expect(footer).not.toContainText(site.contact.fiscalCode);
  if (site.logo) await expect(footer.locator('img.brand-logo:visible')).toHaveAttribute('src', site.logo);
  await page.goto('/contact/');
  await expect(page.locator('main')).toContainText(site.contact.office);
  await expect(page.locator('main')).toContainText(site.contact.fiscalCode);
  await expect(page.locator('main')).not.toContainText('Stay connected');
  await expect(page.locator('main')).not.toContainText('Email:');
});

test('Join Us is one visible right-side header CTA at mobile and desktop widths', async ({ page }) => {
  for (const width of [320, 390, 1100]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    const header = page.locator('[data-site-header]');
    const join = header.getByRole('link', { name: site.navigation.join.label, exact: true });
    await expect(join).toHaveCount(1);
    await expect(join).toBeVisible();
    await expect(join).toHaveAttribute('href', site.navigation.join.url);
    const brand = (await header.locator('.identity').boundingBox())!, action = (await join.boundingBox())!;
    expect(action.x).toBeGreaterThan(brand.x + brand.width);
    expect(action.width).toBeGreaterThan(40);
    if (width <= 1024) {
      const menuButton = header.locator('[data-menu-toggle]');
      const menu = (await menuButton.boundingBox())!;
      for (const hover of [false, true]) {
        if (hover) await menuButton.hover();
        const chrome = await menuButton.evaluate((element) => {
          const style = getComputedStyle(element);
          return { background: style.backgroundColor, border: style.borderTopWidth, shadow: style.boxShadow };
        });
        expect(chrome).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px', shadow: 'none' });
      }
      expect(menu.width).toBeGreaterThanOrEqual(44);
      expect(menu.height).toBeGreaterThanOrEqual(44);
      const theme = (await header.locator('[data-theme-toggle]').boundingBox())!;
      expect(action.x).toBeGreaterThanOrEqual(theme.x + theme.width);
      expect(menu.x).toBeGreaterThan(action.x + action.width);
      await header.locator('[data-theme-toggle]').focus();
      await page.keyboard.press('Tab');
      await expect(join).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(header.locator('[data-menu-toggle]')).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('[data-join-cta]').click();
  await expect(page).toHaveURL(/\/join\/$/);
  await expect(page.locator('[data-join-cta]')).toHaveAttribute('aria-current', 'page');
});

test('stacked footer aligns left on small screens, desktop aligns right, and icons stay below email', async ({ page }, testInfo) => {
  for (const scheme of ['light', 'dark'] as const) for (const width of [320, 390, 768, 800, 1100]) {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/contact/');
    await expect(page.locator('main h1')).toHaveText(contactPage.headline);
    for (const selector of ['[data-contact-row]', '[data-footer-contact-row]']) {
      const row = page.locator(selector);
      const email = row.getByRole('link', { name: site.contact.email });
      await expect(email.locator('svg')).toHaveCount(0);
      const emailBox = (await email.boundingBox())!, socialBox = (await row.locator('.social-links').boundingBox())!;
      if (selector === '[data-contact-row]' || width <= 768) {
        expect(Math.abs(emailBox.x - socialBox.x)).toBeLessThan(2);
        if (selector === '[data-footer-contact-row]') {
          const brand = (await page.locator('.footer-brand .identity').boundingBox())!;
          expect(Math.abs(emailBox.x - brand.x)).toBeLessThan(2);
          const footerCopy = (await page.locator('.footer-brand .prose').boundingBox())!;
          expect(Math.abs(footerCopy.x - brand.x)).toBeLessThan(2);
        }
      }
      else {
        const rowBox = (await row.boundingBox())!;
        expect(Math.abs(emailBox.x + emailBox.width - socialBox.x - socialBox.width)).toBeLessThan(2);
        expect(Math.abs(emailBox.x + emailBox.width - rowBox.x - rowBox.width)).toBeLessThan(2);
        await row.getByRole('link', { name: contactPage.labels.instagram, exact: true }).hover();
      }
      expect(socialBox.y).toBeGreaterThanOrEqual(emailBox.y + emailBox.height);
    }
    if (width === 1100) {
      const brand = (await page.locator('.footer-brand').boundingBox())!, contact = (await page.locator('.footer-contact').boundingBox())!;
      expect(Math.abs(brand.y + brand.height / 2 - contact.y - contact.height / 2)).toBeLessThan(2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`contact-${scheme}-${width}.png`), fullPage: true });
  }
});

test('descriptive H1s, CMS search metadata and linked factual entities are rendered', async ({ page }) => {
  const names = ['home', 'join', 'events', 'milestones', 'news', 'resources', 'contact'];
  for (const name of names) {
    const content = JSON.parse(readFileSync(`content/pages/${name}.json`, 'utf8'));
    const path = name === 'home' ? '/' : `/${name}/`;
    await page.goto(`http://127.0.0.1:4322${path}`);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText(content.headline);
    if (!['news', 'events'].includes(name)) await expect(page.locator('main h1')).not.toHaveText(content.title);
    await expect(page).toHaveTitle(`${content.title} · ${site.name}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', content.seo.title || `${content.title} · ${site.name}`);
    const canonical = new URL(path, 'https://collettivoalanturing.it').href;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    const data = JSON.parse(await page.locator('[data-site-structured-data]').textContent() ?? '{}');
    expect(data['@graph'].find((entry: any) => entry['@type'] === 'WebPage').url).toBe(canonical);
    if (name === 'home') {
      const organization = data['@graph'].find((entry: any) => entry['@type'] === 'Organization');
      expect(organization.name).toBe(site.name);
      expect(organization.email).toBe(site.contact.email);
      expect(organization).not.toHaveProperty('foundingDate');
      await expect(page.locator('main')).toContainText('queer student community at Politecnico di Torino (PoliTO)');
    }
  }
  const sitemap = await (await page.request.get('http://127.0.0.1:4323/sitemap-0.xml')).text();
  expect(sitemap).not.toContain('secret-draft');
  const robots = await (await page.request.get('http://127.0.0.1:4322/robots.txt')).text();
  expect(robots).toContain('Allow: /');
  expect(robots).toContain('User-agent: OAI-SearchBot\nAllow: /');
  expect(robots).not.toContain('Disallow: /');
  expect(robots).toContain('https://collettivoalanturing.it/sitemap-index.xml');
  await page.goto('http://127.0.0.1:4322/missing-page/');
  await expect(page.locator('[data-site-structured-data]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await page.goto('/news/fixture-news-4/');
  await expect(page).toHaveTitle(`Fixture news 4 · ${site.name}`);
});

test('no JavaScript retains posts/deadlines and never exposes a registration link', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 850 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323/events/shared-event/');
  await expect(page.locator('main')).toContainText('Full fixture post.');
  await expect(page.locator('main')).toContainText('Registration closes');
  await expect(page.getByRole('link', { name: 'Register fixture' })).toHaveCount(0);
  await page.goto('http://127.0.0.1:4323/events/');
  await expect(page.getByRole('link', { name: 'Shared edited event' })).toBeVisible();
  await page.goto('http://127.0.0.1:4323/');
  await expect(page.locator('main')).toContainText('Browse all events for dates and full details.');
  await expect(page.getByRole('navigation', { name: site.ui.navigation })).toBeVisible();
  await expect(page.getByRole('navigation', { name: site.ui.navigation }).getByRole('link')).toHaveCount(6);
  await expect(page.locator('[data-join-cta]')).toBeVisible();
  await expect(page.getByRole('button', { name: site.ui.menu })).toHaveCount(0);
  await page.goto('http://127.0.0.1:4323/resources/');
  await page.getByRole('link', { name: 'Fixture external resource', exact: true }).click();
  await expect(page.locator('main')).toContainText('Test-only additional description.');
  await expect(page.getByRole('link', { name: site.ui.resource.external, exact: true })).toHaveAttribute('href', 'https://example.org/resource');
  await context.close();
});

for (const scheme of ['light', 'dark'] as const) for (const width of [390, 1100]) {
  test(`event controls, media and text contrast: ${scheme}, ${width}px`, async ({ page }, testInfo) => {
    await page.clock.pauseAt(new Date(NOW));
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const image of await page.locator('.brand-logo:visible').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    }
    for (const image of await page.locator('[data-home-hero] img, [data-event-card]:visible img, [data-home-news-list] img, [data-supporter-original] img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
    await page.goto('/events/');
    await expect(page.locator('[data-event-calendar]')).toBeVisible();
    await expect(page.locator('[data-day="2026-10-12"] a')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('calendar.png'), fullPage: true });
    await page.goto('/events/shared-event/');
    await expect(page.getByRole('link', { name: 'Register fixture' })).toBeVisible();
    const minimumContrast = await page.evaluate(() => {
      const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((v) => v / 255);
      const luminance = (color: number[]) => color.map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
      return Math.min(...Array.from(document.querySelectorAll<HTMLElement>('body, a, .muted, .event-status, button, select, .footer-brand .prose')).filter((el) => el.checkVisibility()).map((el) => {
        let background: Element = el;
        while (getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)' && background.parentElement) background = background.parentElement;
        const foreground = luminance(rgb(getComputedStyle(el).color));
        const behind = luminance(rgb(getComputedStyle(background).backgroundColor));
        return (Math.max(foreground, behind) + .05) / (Math.min(foreground, behind) + .05);
      }));
    });
    expect(minimumContrast).toBeGreaterThanOrEqual(4.5);
  });
  test(`production routes and empty states: ${scheme}, ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of ['/', '/join/', '/events/', '/milestones/', '/news/', '/resources/', '/contact/', '/missing-page/']) {
      const response = await page.goto(`http://127.0.0.1:4322${path}`);
      expect(response!.status()).toBe(path === '/missing-page/' ? 404 : 200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      const menu = page.getByRole('button', { name: site.ui.menu, exact: true });
      if (await menu.isVisible()) await menu.click();
      await expect(page.getByRole('navigation', { name: site.ui.navigation }).getByRole('link')).toHaveText(['home', 'events', 'milestones', 'news', 'resources', 'contact'].map((key) => site.navigation[key].label));
      await expect(page.locator('[data-join-cta]')).toBeVisible();
      await expect(page.locator('[data-join-cta]')).toHaveAttribute('href', site.navigation.join.url);
      if (await menu.isVisible()) await menu.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('main')).not.toContainText('[Explain');
      await expect(page.locator('main')).not.toContainText('Charter of Values');
    }
    await page.goto('http://127.0.0.1:4322/events/');
    await expect(page.locator('[data-event-workspace]')).toHaveAttribute('data-event-ready', 'true');
    if (await page.locator('[data-agenda-event]').count() === 0) {
      await expect(page.locator('[data-agenda-empty]')).toBeVisible();
      await expect(page.locator('[data-calendar-empty]')).toBeVisible();
    }
    await page.goto('http://127.0.0.1:4322/');
    await expect(page.locator('main')).toContainText(homePage.safeSpace);
    await page.goto('http://127.0.0.1:4322/milestones/');
    if (await page.locator('[data-milestone]').count() === 0) await expect(page.locator('[data-milestone-empty]')).toBeVisible();
  });
}

test('Home headings carry a small underlined See All link centred on their right', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/');
  for (const [section, heading] of [['[data-home-events]', homePage.events.heading], ['[data-home-news]', homePage.news.heading]]) {
    const scope = page.locator(section);
    const title = scope.getByRole('heading', { name: heading, level: 2 });
    const link = scope.getByRole('link', { name: `${homePage.events.action.label} ${heading}`, exact: true });
    await expect(link).toBeVisible();
    await expect(link.locator('span')).toHaveText('See All');
    expect(await link.locator('span').evaluate((node) => getComputedStyle(node).textDecorationLine)).toBe('underline');
    expect(await link.locator('svg').count()).toBe(1);
    const t = (await title.boundingBox())!, l = (await link.boundingBox())!, row = (await scope.locator('.section-heading').boundingBox())!;
    expect(l.x).toBeGreaterThan(t.x + t.width);
    expect(row.x + row.width - (l.x + l.width)).toBeLessThan(2);
    expect(Math.abs((t.y + t.height / 2) - (l.y + l.height / 2))).toBeLessThan(3);
    expect(await link.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeLessThan(await title.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)));
  }
  await page.locator('[data-home-news] .see-all').click();
  expect(new URL(page.url()).pathname).toBe('/news/');
});

test('Home event cards go from three columns to two to one as the width shrinks', async ({ page }) => {
  await page.goto('/home-samples/countdown/');
  const columns = async (width: number) => {
    await page.setViewportSize({ width, height: 850 });
    const tops = await page.locator('[data-event-card]:visible').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    return tops.filter((top) => top === tops[0]).length;
  };
  expect(await columns(1280)).toBe(3);
  expect(await columns(900)).toBe(3);
  expect(await columns(700)).toBe(2);
  expect(await columns(390)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('all three Apfel weights are preloaded and font files are cached as immutable', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('link[rel="preload"][as="font"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort())).toEqual([
    '/fonts/ApfelGrotezk-Fett.woff2', '/fonts/ApfelGrotezk-Mittel.woff2', '/fonts/ApfelGrotezk-Regular.woff2',
  ]);
  expect(await page.evaluate(() => Array.from(document.fonts).map((face) => face.display))).toEqual(['block', 'block', 'block']);
  expect(readFileSync('public/_headers', 'utf8')).toMatch(/\/fonts\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});

test('the header does not shift while fonts arrive late', async ({ page }) => {
  await page.route('**/fonts/*.woff2', async (route) => { await new Promise((resolve) => setTimeout(resolve, 600)); await route.continue(); });
  await page.addInitScript(() => {
    (window as Window & { shifts?: number }).shifts = 0;
    new PerformanceObserver((list) => { for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) if (!entry.hadRecentInput) (window as Window & { shifts?: number }).shifts! += entry.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/contact/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => (window as Window & { shifts?: number }).shifts)).toBeLessThan(0.02);
});
