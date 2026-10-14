import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { NOW } from '../fixtures/content';

const home = JSON.parse(readFileSync('content/pages/home.json', 'utf8'));
let errors: string[];
test.beforeEach(async ({ page }) => {
  errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date(NOW) });
  await page.clock.pauseAt(new Date(NOW));
});
test.afterEach(() => expect(errors).toEqual([]));

test('Home shows future-only event boxes and the same five latest compact rows as News', async ({ page }) => {
  await page.goto('/news/');
  const latest = (await page.locator('[data-news-list] h3').allTextContents()).slice(0, 5);
  await page.goto('/');
  await expect(page.locator('[data-home-news-list] h3')).toHaveText(latest);
  await expect(page.locator('[data-home-news-list] .cover')).toHaveCount(0);
  await expect(page.locator('[data-home-news-list]')).not.toContainText('A test-only milestone story.');
  await expect(page.locator('[data-event-card]:visible h3')).toHaveText(['Shared edited event', 'Future DST fixture']);
  await expect(page.locator('[data-event-card="cancelled"]')).not.toBeVisible();
  await expect(page.locator('[data-event-card="overnight"]')).not.toBeVisible();
  await page.locator('[data-home-news-list] a').first().click();
  await expect(page).toHaveURL(/\/news\/fixture-milestone-1\/$/);
  await expect(page.locator('[data-news-reader] h1')).toHaveText(latest[0]);
});

test('three countdown cards are ordered left to right and update each digit at exact boundaries', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/home-samples/countdown/');
  const visible = page.locator('[data-event-card]:visible');
  await expect(visible.locator('h3')).toHaveText(['Countdown event 1', 'Countdown event 2', 'Countdown event 3']);
  const boxes = await visible.evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().toJSON()));
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width);
  expect(boxes[2].x).toBeGreaterThan(boxes[1].x + boxes[1].width);
  expect(Math.abs(boxes[0].y - boxes[2].y)).toBeLessThan(1);
  await expect(visible.locator('[data-countdown-unit]')).toHaveCount(12);
  for (const timer of await visible.locator('[role="timer"]').all()) await expect(timer).toHaveAttribute('aria-live', 'off');
  const first = page.locator('[data-event-card="shared-event"]');
  await expect(first.locator('[data-countdown-unit="seconds"] .countdown-digit')).toHaveText(['0', '1']);
  await first.getByRole('link').focus();
  await page.clock.runFor(999);
  await expect(first).toBeVisible();
  await page.clock.runFor(1);
  await expect(first).not.toBeVisible();
  await expect(visible.locator('h3')).toHaveText(['Countdown event 2', 'Countdown event 3', 'Countdown event 4']);
  const second = page.locator('[data-event-card="older"]'), distant = page.locator('[data-event-card="future-dst"]');
  await expect(second.getByRole('link')).toBeFocused();
  await expect(second.locator('[data-countdown-unit="minutes"] .countdown-digit')).toHaveText(['0', '1']);
  await expect(second.locator('[data-countdown-unit="seconds"] .countdown-digit')).toHaveText(['0', '0']);
  await expect(distant.locator('[data-countdown-unit="days"] .countdown-digit')).toHaveText(['1', '0', '0']);
  await page.clock.runFor(1000);
  await expect(second.locator('[data-countdown-unit="minutes"] .countdown-digit')).toHaveText(['0', '0']);
  await expect(second.locator('[data-countdown-unit="seconds"] .countdown-digit')).toHaveText(['5', '9']);
  await expect(distant.locator('[data-countdown-unit="days"] .countdown-digit')).toHaveText(['9', '9']);
  await expect(second.getByRole('link')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('countdowns catch up after clock changes and cards open the existing event post', async ({ page }) => {
  await page.goto('/home-samples/countdown/');
  await page.clock.setSystemTime(new Date(Date.parse(NOW) + 61000));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-event-card]:visible h3')).toHaveText(['Countdown event 3', 'Countdown event 4']);
  const third = page.locator('[data-event-card="recent-past"]');
  await expect(third.locator('[data-countdown-unit="minutes"] .countdown-digit')).toHaveText(['5', '9']);
  await page.clock.runFor(1000);
  await expect(third.locator('[data-countdown-unit="seconds"] .countdown-digit')).toHaveText(['5', '9']);
  await third.getByRole('link').click();
  await expect(page).toHaveURL(/\/events\/recent-past\/$/);
  await expect(page.locator('h1')).toHaveText('Recent past fixture');
});

test('few, empty and hidden sections use the CMS counts without filler boxes', async ({ page }) => {
  await page.goto('/home-samples/few/');
  await expect(page.locator('[data-event-card]:visible')).toHaveCount(1);
  await expect(page.locator('[data-home-news-list] a')).toHaveCount(2);
  await page.clock.runFor(1000);
  await expect(page.locator('[data-event-card]:visible')).toHaveCount(0);
  await expect(page.locator('[data-list-empty]')).toBeVisible();
  await page.goto('/home-samples/empty/');
  await expect(page.locator('[data-list-empty]')).toBeVisible();
  await expect(page.locator('[data-home-news] .empty')).toBeVisible();
  await expect(page.locator('[data-supporter-strip]')).toHaveCount(0);
  await page.goto('/home-samples/hidden/');
  await expect(page.locator('[data-home-events], [data-home-news], [data-supporter-strip]')).toHaveCount(0);
});

test('supporter images use CMS ordering, edited photos/destinations and fallback alt text', async ({ page }) => {
  await page.goto('/');
  const strip = page.locator('[data-supporter-strip]'), original = strip.locator('[data-supporter-original]');
  await expect(original.locator('[data-supporter]')).toHaveCount(4);
  expect(await original.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')))).toEqual(['Fixture supporter', 'Fixture supporter 2', 'Fixture supporter 3', 'Fixture supporter 4']);
  await expect(original.locator('[data-supporter="fixture"] img')).toHaveAttribute('src', '/media/photo.svg');
  await expect(original.locator('[data-supporter="fixture"] img')).toHaveAttribute('alt', 'CMS-edited supporter photo');
  await expect(original.locator('[data-supporter="fixture-3"] img')).toHaveAttribute('alt', 'Fixture supporter 3');
  await expect(strip.locator('h2, h3, p, figcaption')).toHaveCount(0);
  await expect(strip.getByRole('button')).toHaveCount(0);
  await expect(original.locator('[data-supporter="fixture-3"] img')).toHaveAttribute('src', '/media/sticker.svg');
  expect(await original.locator('a').first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(strip).not.toContainText('relationship prose');
  await expect(strip.locator('[data-supporter="no-image-fixture"], [data-supporter="hidden-fixture"]')).toHaveCount(0);
  await expect(strip.getByRole('link')).toHaveCount(4);
  await original.getByRole('link', { name: 'Fixture supporter', exact: true }).click();
  await expect(page).toHaveURL(/\/join\/$/);
});

test('supporter movement loops right to left and pauses for hover and focus without controls', async ({ page }) => {
  await page.goto('/');
  const strip = page.locator('[data-supporter-strip]'), viewport = strip.locator('[data-supporter-viewport]');
  await viewport.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(strip).toHaveAttribute('data-running', 'true');
  const first = strip.locator('[data-supporter-original] img').first();
  const before = (await first.boundingBox())!.x;
  await page.clock.runFor(1000);
  expect((await first.boundingBox())!.x).toBeLessThan(before - 5);
  const offset = await viewport.evaluate((element) => element.scrollLeft);
  await page.clock.runFor(24000);
  expect(Math.abs(await viewport.evaluate((element) => element.scrollLeft) - offset)).toBeLessThan(4);
  await viewport.hover();
  await expect(strip).toHaveAttribute('data-running', 'false');
  const paused = await viewport.evaluate((element) => element.scrollLeft);
  await page.clock.runFor(1000);
  expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(paused);
  await page.mouse.move(0, 0);
  await expect(strip).toHaveAttribute('data-running', 'true');
  const link = strip.locator('[data-supporter-original] a').last();
  await link.focus();
  await expect(strip).toHaveAttribute('data-running', 'false');
  await expect(link).toBeInViewport();
  await page.getByRole('link', { name: `${home.news.action.label} ${home.news.heading}`, exact: true }).focus();
  // The link sits at its heading, far above the strip; the strip only runs while on screen.
  await viewport.scrollIntoViewIfNeeded();
  await expect(strip).toHaveAttribute('data-running', 'true');
  await expect(strip.getByRole('button')).toHaveCount(0);
  for (const copy of await strip.locator('[data-supporter-clone]').all()) {
    await expect(copy).toHaveAttribute('aria-hidden', 'true');
    for (const anchor of await copy.locator('a').all()) await expect(anchor).toHaveAttribute('tabindex', '-1');
  }
});

test('visible loop-copy images retain their real click destinations', async ({ page }) => {
  await page.goto('/');
  const strip = page.locator('[data-supporter-strip]'), viewport = strip.locator('[data-supporter-viewport]');
  await viewport.scrollIntoViewIfNeeded();
  await viewport.hover();
  await viewport.evaluate((element) => { element.scrollLeft = (element.querySelector<HTMLElement>('[data-supporter-clone]')!.offsetLeft - element.querySelector<HTMLElement>('[data-supporter-original]')!.offsetLeft); });
  const copy = strip.locator('[data-supporter-clone] a').first();
  await expect(copy).toBeInViewport();
  await copy.click();
  await expect(page).toHaveURL(/\/join\/$/);
});

test('reduced motion keeps every original image reachable without duplicate links', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const strip = page.locator('[data-supporter-strip]');
  await expect(strip).toHaveAttribute('data-running', 'false');
  await expect(strip.locator('[data-supporter-clone]')).toHaveCount(0);
  await expect(strip.getByRole('button')).toHaveCount(0);
  const last = strip.getByRole('link', { name: 'Fixture supporter 4', exact: true });
  await last.focus();
  await expect(last).toBeInViewport();
  await expect(strip.getByRole('link')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/home-samples/single/');
  await expect(page.locator('[data-supporter-original] img')).toHaveCount(1);
  await expect(page.locator('[data-supporter-strip] button')).toHaveCount(0);
});

test('without JavaScript news and image destinations remain usable and no frozen countdown is shown', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 850 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323/');
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.locator('[data-home-news-list] a')).toHaveCount(5);
  await expect(page.locator('[data-supporter-original] a')).toHaveCount(4);
  await expect(page.locator('[data-supporter-clone]')).toHaveCount(0);
  await page.locator('[data-supporter-original] a').first().click();
  await expect(page).toHaveURL(/\/join\/$/);
  await context.close();
});

test('the CMS opening photo is full width and the headline and introduction overlap it in normal flow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/');
  const hero = page.locator('[data-home-hero]'), image = hero.locator('img');
  await expect(image).toHaveAttribute('src', '/media/fixture.svg');
  await expect(image).toHaveAttribute('alt', 'CMS-edited Home opening photo');
  await expect(image).toHaveAttribute('loading', 'eager');
  await expect(image).toHaveAttribute('fetchpriority', 'high');
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  expect(await image.evaluate((element) => getComputedStyle(element).objectPosition)).toBe('35% 60%');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(hero.locator('h1')).toHaveText('CMS-edited Home headline');
  const bounds = (await hero.boundingBox())!, header = (await page.locator('[data-site-header]').boundingBox())!;
  const intro = (await page.locator('[data-home-introduction]').boundingBox())!, copy = (await hero.locator('.home-hero-copy').boundingBox())!;
  expect(bounds.x).toBe(0);
  expect(bounds.width).toBe(await page.evaluate(() => document.documentElement.clientWidth));
  expect(Math.abs(bounds.y - header.y - header.height)).toBeLessThan(1);
  expect(intro.y).toBeLessThan(bounds.y + bounds.height);
  expect(intro.y).toBeGreaterThan(bounds.y);
  expect(copy.y + copy.height).toBeLessThan(intro.y);
  expect(await hero.evaluate((element) => getComputedStyle(element).position)).toBe('relative');
  expect(await page.locator('[data-home-introduction] .prose').count()).toBe(2);
});

test('scrolling moves the opening photo upward and fades it without changing document height', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const hero = page.locator('[data-home-hero]'), media = hero.locator('[data-hero-media]');
  const bounds = (await hero.boundingBox())!, height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(await media.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
  await page.evaluate((distance) => scrollTo(0, distance), bounds.height / 2);
  await expect.poll(async () => {
    await page.clock.runFor(20);
    return media.evaluate((element) => Number(getComputedStyle(element).opacity));
  }).toBeCloseTo(.5, 1);
  const opacity = await media.evaluate((element) => Number(getComputedStyle(element).opacity));
  expect(opacity).toBeGreaterThan(.25);
  expect(opacity).toBeLessThan(.75);
  expect((await hero.boundingBox())!.y).toBeLessThan(bounds.y - 100);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
  await page.evaluate((distance) => scrollTo(0, distance), bounds.height + 20);
  await expect.poll(async () => {
    await page.clock.runFor(20);
    return media.evaluate((element) => Number(getComputedStyle(element).opacity));
  }).toBe(0);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(async () => {
    await page.clock.runFor(20);
    return media.evaluate((element) => Number(getComputedStyle(element).opacity));
  }).toBe(1);
});

test('cleared and disabled opening photos leave the text opening without a hero spacer', async ({ page }) => {
  for (const kind of ['hero-empty', 'hero-disabled']) {
    await page.goto(`/home-samples/${kind}/`);
    await expect(page.locator('[data-home-hero]')).toHaveCount(0);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText('Home layout fixture');
    expect(await page.locator('main > .shell').evaluate((element) => getComputedStyle(element).marginTop)).toBe('0px');
  }
});

test('reduced motion keeps ordinary scrolling and the static photo fade, including live preference changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.locator('[data-home-hero]'), media = hero.locator('[data-hero-media]');
  const bounds = (await hero.boundingBox())!;
  await page.evaluate((distance) => scrollTo(0, distance), bounds.height / 2);
  await page.clock.runFor(40);
  expect(await media.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
  expect(await media.evaluate((element) => getComputedStyle(element).maskImage)).toContain('linear-gradient');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => media.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(.75);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => media.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
});

test('the opening photo and content are readable without JavaScript and Home skip navigation works', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 850 }, colorScheme: 'dark' });
  const staticPage = await context.newPage();
  await staticPage.goto('http://127.0.0.1:4323/');
  await expect(staticPage.locator('[data-home-hero] img')).toHaveAttribute('alt', 'CMS-edited Home opening photo');
  await expect(staticPage.locator('main h1')).toHaveCount(1);
  await expect(staticPage.locator('[data-home-introduction]')).toContainText('We are Collettivo Alan Turing');
  expect(await staticPage.locator('[data-hero-media]').evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
  await context.close();
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

for (const scheme of ['light', 'dark'] as const) for (const width of [320, 800, 1280]) {
  test(`Home opening photo and overlapping copy: ${scheme}, ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/home-samples/hero/');
    const hero = page.locator('[data-home-hero]'), intro = page.locator('[data-home-introduction]');
    await expect(hero.locator('h1')).toHaveText('Home layout fixture');
    const bounds = (await hero.boundingBox())!;
    expect(bounds.width).toBe(await page.evaluate(() => document.documentElement.clientWidth));
    expect((await intro.boundingBox())!.y).toBeLessThan(bounds.y + bounds.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`home-hero-${scheme}-${width}.png`), fullPage: true });
  });
}

for (const scheme of ['light', 'dark'] as const) for (const width of [320, 800, 1280]) {
  test(`Home cards, compact news and image strip: ${scheme}, ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/home-samples/countdown/');
    const cards = page.locator('[data-event-card]:visible');
    await expect(cards).toHaveCount(3);
    const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
    // Cards stack only on narrow screens; the shell has room for all three well below the old 1024px breakpoint.
    if (width <= 400) expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height);
    else expect(Math.abs(boxes[0].y - boxes[2].y)).toBeLessThan(1);
    const strip = page.locator('[data-supporter-strip]');
    const bounds = (await strip.boundingBox())!;
    expect(Math.abs(bounds.x)).toBeLessThan(1);
    expect(bounds.width).toBe(await page.evaluate(() => document.documentElement.clientWidth));
    await expect(strip.getByRole('button')).toHaveCount(0);
    expect(await strip.locator('a').first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`home-${scheme}-${width}.png`), fullPage: true });
  });
}
