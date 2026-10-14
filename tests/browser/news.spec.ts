import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
const news = JSON.parse(readFileSync('content/pages/news.json', 'utf8'));
let errors: string[];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(() => expect(errors).toEqual([]));

test('desktop selection keeps the list and updates the reader, URL, metadata and history in place', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/news/');
  await page.evaluate(() => { (window as Window & { newsMarker?: string }).newsMarker = 'same document'; });
  const reader = page.locator('[data-news-reader]'), sidebar = page.locator('[data-news-sidebar]'), list = page.locator('[data-news-list]');
  expect((await reader.boundingBox())!.x).toBeLessThan((await sidebar.boundingBox())!.x);
  await expect(sidebar.locator('[data-news-link]')).toHaveCount(12);
  await expect(sidebar).not.toContainText('Test article summary.');
  await expect(sidebar).not.toContainText('Full article body');
  await expect(page.locator('main')).not.toContainText('From us');
  await expect(reader.locator('#news-article-title')).toHaveText('Fixture milestone 1');
  await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const listTop = await list.evaluate((element) => element.scrollTop);
  await sidebar.locator('[href="/news/fixture-news-1/"]').click();
  await expect(page).toHaveURL(/\/news\/fixture-news-1\/$/);
  await expect(reader.locator('h1')).toHaveText('Fixture news 1');
  await expect(reader).toContainText('Full article body for Fixture news 1.');
  await expect(sidebar.locator('[href="/news/fixture-news-1/"]')).toHaveAttribute('aria-current', 'page');
  expect(await list.evaluate((element) => element.scrollTop)).toBeCloseTo(listTop, 0);
  await expect(page).toHaveTitle(`Fixture news 1 · ${site.name}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://collettivoalanturing.it/news/fixture-news-1/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://collettivoalanturing.it/media/fixture.svg');
  expect(await page.evaluate(() => (window as Window & { newsMarker?: string }).newsMarker)).toBe('same document');
  await sidebar.locator('[href="/news/fixture-news-4/"]').click();
  await expect(reader.locator('h1')).toHaveText('Fixture news 4');
  await page.goBack();
  await expect(reader.locator('h1')).toHaveText('Fixture news 1');
  await expect(page.locator('[data-photo-controls]')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/news\/$/);
  await expect(reader.locator('#news-article-title')).toHaveText('Fixture milestone 1');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://collettivoalanturing.it/news/');
  await page.goForward();
  await expect(reader.locator('h1')).toHaveText('Fixture news 1');
  expect(await page.evaluate(() => (window as Window & { newsMarker?: string }).newsMarker)).toBe('same document');
});

test('mobile opens one article and returns to the same list position and link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/news/');
  await expect(page.locator('[data-news-reader]')).not.toBeVisible();
  const link = page.locator('[data-news-link][href="/news/fixture-news-1/"]');
  await link.scrollIntoViewIfNeeded();
  const listY = await page.evaluate(() => scrollY);
  await link.click();
  await expect(page.locator('[data-news-article]')).toHaveAttribute('data-news-article', 'fixture-news-1');
  await expect(page.locator('[data-news-sidebar]')).not.toBeVisible();
  await expect(page.locator('[data-news-reader]')).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole('link', { name: site.ui.post.backNews, exact: true }).click();
  await expect(page).toHaveURL(/\/news\/$/);
  await expect(page.locator('[data-news-sidebar]')).toBeVisible();
  await expect(link).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(listY, 0);
  await page.goForward();
  await expect(page.locator('[data-news-article]')).toHaveAttribute('data-news-article', 'fixture-news-1');
  await page.reload();
  await expect(page.locator('[data-news-reader] h1')).toHaveText('Fixture news 1');
});

test('article return links appear only when the compact list is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/news/fixture-news-1/');
  const back = page.locator('[data-news-back]'), returns = page.locator('.news-return-links');
  await expect(back).not.toBeVisible();
  await expect(returns).not.toBeVisible();
  const article = (await page.locator('[data-news-article]').boundingBox())!, photo = (await page.locator('[data-photo-header]').boundingBox())!;
  expect(Math.abs(photo.y - article.y)).toBeLessThan(1);
  await page.setViewportSize({ width: 800, height: 850 });
  await expect(back).toBeVisible();
  await expect(page.locator('[data-news-sidebar]')).not.toBeVisible();
  await page.setViewportSize({ width: 1280, height: 850 });
  await expect(back).not.toBeVisible();
  await expect(page.locator('[data-news-sidebar]')).toBeVisible();
  await page.locator('[data-news-link][href="/news/fixture-milestone-1/"]').click();
  await expect(page.locator('[data-news-reader] h1')).toHaveText('Fixture milestone 1');
  await expect(returns).not.toBeVisible();
  await page.setViewportSize({ width: 800, height: 850 });
  // Chosen from the news list, so the only way back is the news list.
  await expect(back).toBeVisible();
  await expect(page.getByRole('link', { name: site.ui.post.backMilestones, exact: true })).not.toBeVisible();
});

test('a milestone opened without a known origin offers both the news list and Milestones', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 850 });
  await page.goto('/news/fixture-milestone-1/');
  await expect(page.getByRole('link', { name: site.ui.post.backNews, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: site.ui.post.backMilestones, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: site.ui.post.backHome, exact: true })).not.toBeVisible();
});

test('an article opened from Home returns to Home, on desktop as well as mobile', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    await page.locator('[data-home-news-list] a').first().click();
    await expect(page).toHaveURL(/\/news\/[^/]+\/$/);
    const home = page.getByRole('link', { name: site.ui.post.backHome, exact: true });
    await expect(home).toBeVisible();
    await expect(page.getByRole('link', { name: site.ui.post.backNews, exact: true })).not.toBeVisible();
    await expect(page.getByRole('link', { name: site.ui.post.backMilestones, exact: true })).not.toBeVisible();
    await home.click();
    expect(new URL(page.url()).pathname).toBe('/');
  }
});

test('a milestone opened from the Milestones page returns only to Milestones', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/milestones/');
    await page.locator('[data-milestone="fixture-milestone-1"] a').click();
    await expect(page).toHaveURL(/\/news\/fixture-milestone-1\/$/);
    const milestones = page.getByRole('link', { name: site.ui.post.backMilestones, exact: true });
    await expect(milestones).toBeVisible();
    await expect(page.getByRole('link', { name: site.ui.post.backNews, exact: true })).not.toBeVisible();
    await milestones.click();
    expect(new URL(page.url()).pathname).toBe('/milestones/');
  }
});

test('on desktop the left column scrolls the page while the news list stays pinned and scrolls on its own', async ({ page }) => {
  for (const viewport of [{ width: 1100, height: 700 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    // Start a fresh article navigation, rather than reloading its saved footer position.
    await page.goto('/news/');
    await page.goto('/news/fixture-news-1/');
    const reader = page.locator('[data-news-reader]'), list = page.locator('[data-news-list]'), sidebar = page.locator('[data-news-sidebar]');
    expect(await reader.evaluate((element) => getComputedStyle(element).overflowY)).toBe('visible');
    expect(await sidebar.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
    const header = (await page.locator('[data-site-header]').boundingBox())!;
    const readerBox = (await reader.boundingBox())!, listBox = (await list.boundingBox())!;
    // Wheel over the article moves the page, not an inner scroller, and the list stays in place.
    await page.mouse.move(readerBox.x + readerBox.width / 2, readerBox.y + 120);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    expect(await list.evaluate((element) => element.scrollTop)).toBe(0);
    const pinned = (await sidebar.boundingBox())!;
    expect(pinned.y).toBeGreaterThanOrEqual(header.height - 1);
    expect(pinned.y + pinned.height).toBeLessThanOrEqual(viewport.height + 1);
    // Wheel over the list scrolls only the list.
    const pageY = await page.evaluate(() => scrollY);
    await page.mouse.move(listBox.x + listBox.width / 2, pinned.y + 120);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(pageY, 0);
    // The article decides when the page reaches its end.
    await page.mouse.move(readerBox.x + readerBox.width / 2, 200);
    await page.mouse.wheel(0, 20000);
    await expect(page.locator('footer')).toBeInViewport();
    await page.mouse.wheel(0, -20000);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  }
});

test('desktop page scroll positions survive article changes, history and reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/news/fixture-news-1/');
  const reader = page.locator('[data-news-reader]'), list = page.locator('[data-news-list]');
  const next = page.locator('[data-news-link][href="/news/fixture-news-4/"]');
  await next.scrollIntoViewIfNeeded();
  const listTop = await list.evaluate((element) => element.scrollTop);
  await page.evaluate(() => scrollTo(0, 350));
  const pageY = await page.evaluate(() => scrollY);
  expect(pageY).toBeGreaterThan(100);
  await next.click();
  await expect(reader.locator('h1')).toHaveText('Fixture news 4');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(await list.evaluate((element) => element.scrollTop)).toBeCloseTo(listTop, 0);
  await page.goBack();
  await expect(reader.locator('h1')).toHaveText('Fixture news 1');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(pageY, 0);
  await page.reload();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(pageY, 0);
});

test('photo controls and keyboard switch photographs and retain the selection after resizing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/news/fixture-news-1/');
  const gallery = page.locator('[data-photo-header]'), track = page.locator('[data-photo-track]');
  await expect(gallery.locator('[data-photo-position]')).toHaveText('Photo 1 of 2');
  await expect(gallery.getByRole('button', { name: news.controls.previousPhoto })).toBeDisabled();
  await gallery.getByRole('button', { name: news.controls.nextPhoto }).click();
  await expect(gallery).toHaveAttribute('data-photo-index', '1');
  await expect(gallery.locator('[data-photo-position]')).toHaveText('Photo 2 of 2');
  await expect(gallery.getByAltText('Second article photograph')).toBeInViewport();
  await expect(gallery.getByRole('button', { name: news.controls.nextPhoto })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 850 });
  await expect(gallery.getByAltText('Second article photograph')).toBeInViewport();
  await expect(gallery).toHaveAttribute('data-photo-index', '1');
  await track.focus();
  await page.keyboard.press('Home');
  await expect(gallery).toHaveAttribute('data-photo-index', '0');
  await expect(gallery.getByAltText('First article photograph')).toBeInViewport();
  await page.keyboard.press('ArrowRight');
  await expect(gallery).toHaveAttribute('data-photo-index', '1');
  const photo = gallery.locator('.photo-header-image').first();
  expect(await photo.evaluate((element) => getComputedStyle(element).maskImage)).toContain('linear-gradient');
  const photoBox = (await photo.boundingBox())!, titleBox = (await page.locator('#news-article-title').boundingBox())!;
  expect(titleBox.y).toBeGreaterThanOrEqual(photoBox.y + photoBox.height);
  await page.goto('/news/fixture-news-4/');
  await expect(page.locator('[data-photo-slide]')).toHaveCount(1);
  await expect(page.locator('[data-photo-controls]')).toHaveCount(0);
  await page.goto('/news/fixture-news-3/');
  await expect(page.locator('[data-photo-header]')).toHaveCount(0);
});

test('rapid article selections cancel the older response', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/news/');
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/news/fixture-news-1/', async (route) => { await gate; await route.continue().catch(() => {}); });
  await page.locator('[data-news-link][href="/news/fixture-news-1/"]').click();
  await expect(page.locator('[data-news-reader]')).toHaveAttribute('aria-busy', 'true');
  await page.locator('[data-news-link][href="/news/fixture-news-2/"]').click();
  await expect(page.locator('[data-news-reader] h1')).toHaveText('Fixture news 2');
  release!();
  await expect(page).toHaveURL(/\/news\/fixture-news-2\/$/);
  await expect(page.locator('[data-news-reader]')).not.toHaveAttribute('aria-busy');
});

test('a failed reader fetch falls back to the real article page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/news/');
  let failed = false;
  await page.route('**/news/fixture-news-1/', (route) => {
    if (!route.request().isNavigationRequest()) { failed = true; return route.fulfill({ status: 503, body: 'Temporarily unavailable' }); }
    return route.continue();
  });
  await page.locator('[data-news-link][href="/news/fixture-news-1/"]').click();
  await expect(page).toHaveURL(/\/news\/fixture-news-1\/$/);
  await expect(page.locator('[data-news-reader] h1')).toHaveText('Fixture news 1');
  expect(failed).toBe(true);
});

test('an empty news collection has one heading and one readable empty state at every width', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/empty-browsers/news/');
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main .empty')).toHaveCount(1);
    await expect(page.locator('main .empty')).toBeVisible();
    await expect(page.locator('[data-photo-header], [data-news-link]')).toHaveCount(0);
  }
});

test('static article links, mobile return and native photo scrolling work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 850 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4323/news/');
  await expect(page.locator('[data-news-reader]')).not.toBeVisible();
  await page.locator('[data-news-link][href="/news/fixture-news-1/"]').click();
  await expect(page.locator('[data-news-reader] h1')).toHaveText('Fixture news 1');
  await expect(page.locator('[data-news-reader]')).toContainText('Full article body for Fixture news 1.');
  await expect(page.locator('[data-photo-controls]')).not.toBeVisible();
  expect(await page.locator('[data-photo-track]').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.getByRole('link', { name: site.ui.post.backNews, exact: true }).click();
  await expect(page.locator('[data-news-sidebar]')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 850 });
  await expect(page.locator('[data-news-reader]')).toBeVisible();
  await context.close();
});

for (const scheme of ['light', 'dark'] as const) for (const width of [320, 800, 1280]) {
  test(`news photos and cutout stickers remain readable: ${scheme}, ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/news/');
    const sticker = page.locator('[data-news-link] .sticker-cutout').first();
    expect(await sticker.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await sticker.locator('img').evaluate((element) => getComputedStyle(element).objectFit)).toBe('contain');
    expect(await sticker.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('[data-news-link][href="/news/fixture-news-1/"]').click();
    await expect(page.locator('[data-news-reader] h1')).toHaveText('Fixture news 1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`news-${scheme}-${width}.png`), fullPage: true });
    await page.goto('/milestones/');
    const timelineSticker = page.locator('.milestone-sticker').first();
    await expect(timelineSticker).toBeVisible();
    expect(await timelineSticker.locator('img').evaluate((element) => getComputedStyle(element).objectFit)).toBe('contain');
    await expect(page.locator('.milestone-marker')).toHaveCount(8);
  });
}
