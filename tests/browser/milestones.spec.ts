import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { milestoneFixtures } from '../fixtures/content';

const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
const pageContent = JSON.parse(readFileSync('content/pages/milestones.json', 'utf8'));
const expectedSlugs = [8, 1, 2, 3, 4, 5, 6, 7].map((index) => `fixture-milestone-${index}`);

async function checkConnections(page: Page, count: number, columns: number) {
  const nodes = await page.locator('[data-milestone]').evaluateAll((items) => items.map((item) => {
    const marker = item.querySelector('.milestone-marker')!.getBoundingClientRect();
    const title = item.querySelector('.milestone-title')!.getBoundingClientRect();
    const date = item.querySelector('.milestone-date')!.getBoundingClientRect();
    const connection = Array.from(item.querySelectorAll<HTMLElement>('.milestone-connection')).find((element) => element.checkVisibility());
    const bounds = connection?.getBoundingClientRect();
    return {
      x: marker.x + marker.width / 2, y: marker.y + marker.height / 2,
      markerBottom: marker.bottom, titleTop: title.top, titleBottom: title.bottom, dateTop: date.top,
      connection: connection && bounds ? { kind: connection.className, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, radius: parseFloat(connection.classList.contains('connection-right') ? getComputedStyle(connection).borderTopRightRadius : getComputedStyle(connection).borderTopLeftRadius) } : null,
    };
  }));
  expect(nodes).toHaveLength(count);
  for (const [index, node] of nodes.entries()) {
    expect(node.titleTop).toBeGreaterThan(node.markerBottom);
    expect(node.dateTop).toBeGreaterThan(node.titleBottom);
    if (index === nodes.length - 1) { expect(node.connection).toBeNull(); continue; }
    const next = nodes[index + 1], line = node.connection!;
    expect(line).not.toBeNull();
    expect(Math.abs(line.y + 1 - node.y)).toBeLessThan(2);
    if (Math.floor(index / columns) === Math.floor((index + 1) / columns)) {
      expect(Math.abs(next.y - node.y)).toBeLessThan(2);
      expect(Math.abs(line.x - Math.min(node.x, next.x))).toBeLessThan(2);
      expect(Math.abs(line.x + line.width - Math.max(node.x, next.x))).toBeLessThan(2);
      expect(Math.sign(next.x - node.x)).toBe(Math.floor(index / columns) % 2 === 0 ? 1 : -1);
    } else {
      expect(next.y).toBeGreaterThan(node.y + 100);
      expect(Math.abs(next.x - node.x)).toBeLessThan(2);
      expect(Math.abs(line.y + line.height - 1 - next.y)).toBeLessThan(2);
      const right = line.kind.includes('connection-right');
      expect(line.kind).toContain(right ? 'connection-right' : 'connection-left');
      expect(line.radius).toBeGreaterThanOrEqual(16);
      expect(Math.abs((right ? line.x : line.x + line.width) - node.x)).toBeLessThan(2);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('milestones use occurrence dates, reflect CMS edits, and remain ordinary news posts', async ({ page }) => {
  await page.goto('/milestones/');
  await expect(page).toHaveTitle(`${pageContent.title} · ${site.name}`);
  await expect(page.locator('[data-milestone]')).toHaveCount(8);
  expect(await page.locator('[data-milestone]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-milestone')))).toEqual(expectedSlugs);
  await expect(page.locator('[data-milestone="fixture-milestone-8"] time')).toHaveAttribute('datetime', '2026-09-10');
  await expect(page.locator('main')).not.toContainText('Secret draft');
  await expect(page.locator('main')).not.toContainText('A test-only milestone story.');
  await expect(page.locator('main')).not.toContainText('The full story behind the fixture milestone.');
  await page.goto('/news/');
  await expect(page.locator('main').getByRole('link', { name: 'CMS-edited milestone story', exact: true })).toHaveAttribute('href', '/news/fixture-milestone-8/');
  await expect(page.locator('main')).toContainText('Milestone');
  await page.goto('/');
  for (const entry of milestoneFixtures.slice(0, 3)) await expect(page.locator('main').getByRole('link', { name: entry.title, exact: true })).toBeVisible();
  const response = await page.goto('/news/secret-milestone/');
  expect(response!.status()).toBe(404);
});

test('hover draws the outer ring; keyboard follows chronology and opens the story', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/milestones/');
  const first = page.locator('[data-milestone="fixture-milestone-8"] a');
  const ring = first.locator('.milestone-ring circle'), hint = first.locator('.milestone-hint');
  await expect(hint).toHaveAttribute('role', 'tooltip');
  await expect(hint).not.toBeVisible();
  expect(await hint.evaluate((node) => getComputedStyle(node).opacity)).toBe('0');
  expect(await ring.evaluate((node) => parseFloat(getComputedStyle(node).strokeDashoffset))).toBe(1);
  await first.locator('.milestone-marker').hover();
  await expect.poll(() => ring.evaluate((node) => parseFloat(getComputedStyle(node).strokeDashoffset))).toBe(0);
  await expect.poll(() => hint.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
  await expect(page.getByRole('tooltip')).toHaveCount(1);
  await hint.hover();
  await expect(hint).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(hint).not.toBeVisible();
  await first.focus();
  await expect(hint).toBeVisible();
  expect(await first.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-milestone="fixture-milestone-1"] a')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/news\/fixture-milestone-1\/$/);
  await expect(page.locator('[data-news-reader] a[href="/milestones/"]')).toBeVisible();
  await page.goto('/news/fixture-milestone-8/');
  await expect(page.locator('main h1')).toHaveText('CMS-edited milestone story');
  await expect(page.locator('main')).toContainText('The full story behind the fixture milestone.');
  await expect(page.locator('[data-news-article] time').first()).toHaveAttribute('datetime', '2026-10-01');
  await expect(page.locator('[data-news-article] time').last()).toHaveAttribute('datetime', '2026-09-10');
  const navigation = page.getByRole('navigation', { name: site.ui.navigation });
  await expect(navigation.getByRole('link', { name: site.navigation.milestones.label, exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: site.navigation.news.label, exact: true })).not.toHaveAttribute('aria-current');
  await page.setViewportSize({ width: 390, height: 850 });
  await page.getByRole('link', { name: site.ui.post.backMilestones, exact: true }).click();
  await expect(page).toHaveURL(/\/milestones\/$/);
});

test('empty, single and partial rows stop at the last dot and all connections meet their nodes', async ({ page }) => {
  test.setTimeout(45000);
  for (const width of [320, 1100]) {
    await page.setViewportSize({ width, height: 850 });
    for (const count of [0, 1, 2, 3, 4, 6, 7, 8]) {
      await page.goto(`/timeline-samples/${count}/`);
      if (count === 0) {
        await expect(page.locator('[data-milestone-empty]')).toHaveText(pageContent.empty);
        await expect(page.locator('[data-milestone-timeline]')).toHaveCount(0);
      } else await checkConnections(page, count, width <= 608 ? 2 : 3);
    }
  }
});

test('touch users see no permanent tooltip labels and can open a milestone from its dot', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 850 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/milestones/');
  const first = page.locator('[data-milestone="fixture-milestone-8"]');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(first.locator('.milestone-hint')).not.toBeVisible();
  await first.locator('.milestone-marker').tap();
  await expect(page).toHaveURL(/\/news\/fixture-milestone-8\/$/);
  await context.close();
});

test('timeline links work without JavaScript and reduced motion removes draw transitions', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 850 } });
  const staticPage = await context.newPage();
  await staticPage.goto('/milestones/');
  await checkConnections(staticPage, 8, 2);
  await staticPage.getByRole('link', { name: 'CMS-edited milestone story', exact: true }).click();
  await expect(staticPage.locator('main')).toContainText('The full story behind the fixture milestone.');
  await context.close();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/milestones/');
  const first = page.locator('[data-milestone] a').first();
  await first.focus();
  expect(await first.locator('.milestone-ring circle').evaluate((node) => getComputedStyle(node).transitionDuration)).toBe('0s');
  expect(await first.locator('.milestone-ring circle').evaluate((node) => parseFloat(getComputedStyle(node).strokeDashoffset))).toBe(0);
});

for (const scheme of ['light', 'dark'] as const) for (const width of [320, 390, 1100]) {
  test(`winding timeline remains connected and readable: ${scheme}, ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/milestones/');
    await checkConnections(page, 8, width <= 608 ? 2 : 3);
    if (width === 1100) await page.locator('[data-milestone] a').first().hover();
    await page.screenshot({ path: testInfo.outputPath(`milestones-${scheme}-${width}.png`), fullPage: true, animations: 'disabled' });
  });
}

test('resizing changes the number of dots per row while preserving focus and the winding path', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/milestones/');
  const link = page.locator('[data-milestone="fixture-milestone-4"] a');
  await link.focus();
  for (const width of [390, 800, 320, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(link).toBeFocused();
    await checkConnections(page, 8, width <= 608 ? 2 : 3);
  }
});
