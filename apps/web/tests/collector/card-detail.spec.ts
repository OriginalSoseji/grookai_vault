import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL || new URL(baseURL).hostname !== '127.0.0.1') throw new Error('Local verification only');
  await context.route('**/*', route => {
    const request = route.request();
    return new URL(request.url()).origin === new URL(baseURL).origin && ['GET', 'HEAD', 'OPTIONS'].includes(request.method()) ? route.continue() : route.abort();
  });
});

test('real card detail retains approved layout, image zoom, identity and governed actions', async ({ page }, info) => {
  await page.goto('/card/GV-PK-MEW-199?cards=GV-PK-MEW-200', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Charizard ex', exact: true })).toBeVisible();
  const shape = await page.evaluate(() => {
    const layout = document.querySelector('.gv-detail-layout')!;
    const art = document.querySelector('.gv-detail-art-stage')!.getBoundingClientRect();
    const copy = document.querySelector('.gv-detail-copy')!.getBoundingClientRect();
    return { width: layout.getBoundingClientRect().width, columns: getComputedStyle(layout).gridTemplateColumns.split(' ').length,
      artRight: art.right, artBottom: art.bottom, copyLeft: copy.left, copyTop: copy.top,
      titleSize: getComputedStyle(document.querySelector('.gv-detail-heading h1')!).fontSize,
      overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  const phone = info.project.name.startsWith('phone');
  expect(shape.columns).toBe(phone ? 1 : 2);
  expect(shape.titleSize).toBe(phone ? '29px' : '35px');
  expect(shape.overflow).toBe(false);
  if (phone) expect(shape.artBottom).toBeLessThan(shape.copyTop);
  else { expect(shape.width).toBe(1080); expect(shape.artRight).toBeLessThan(shape.copyLeft); }
  await expect.poll(() => page.locator('.gv-detail-main-image').evaluate((image: HTMLImageElement) => image.naturalWidth), { timeout: 30_000 }).toBeGreaterThan(200);
  await expect(page.locator('.gv-detail-identity-table')).toContainText('GV-PK-MEW-199');
  await expect(page.locator('.gv-detail-identity-table')).toContainText('Artist');
  expect(await page.locator('.gv-detail-art-stage').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  const imageUpdate = page.getByRole('link', { name: 'Update image', exact: true });
  await expect(imageUpdate).toHaveAttribute('href', /\/login\?next=/);
  const submit = new URL(new URL((await imageUpdate.getAttribute('href'))!, 'http://localhost').searchParams.get('next')!, 'http://localhost');
  expect(submit.pathname).toBe('/submit');
  expect(submit.searchParams.get('card')).toBe('GV-PK-MEW-199');
  expect(submit.searchParams.get('intent')).toBe('MISSING_IMAGE');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { document.documentElement.dataset.sharedUrl = text; } } });
  });
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.sharedUrl)).toBe(new URL('/card/GV-PK-MEW-199', page.url()).href);
  const previousNext = page.getByRole('navigation', { name: 'Previous and next card in set' });
  await expect(previousNext.getByRole('link').first()).toHaveAttribute('href', /GV-PK-MEW-198/);
  await expect(previousNext.getByRole('link').last()).toHaveAttribute('href', /GV-PK-MEW-200/);
  await expect(page.getByRole('heading', { name: 'More from this collection', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'More cards like this', exact: true })).toBeVisible();
  const order = await page.evaluate(() => ['.gv-detail-set-navigation', 'section[aria-label="More from this collection"]', 'section[aria-label="More cards like this"]'].map(selector => document.querySelector(selector)!.getBoundingClientRect().top));
  expect(order[0]).toBeLessThan(order[1]);
  expect(order[1]).toBeLessThan(order[2]);
  const collectionLinks = await page.getByRole('region', { name: 'More from this collection', exact: true }).locator('a.group').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(collectionLinks).toHaveLength(5);
  const backgrounds = await page.locator('.gv-detail-related-grid img,.gv-detail-related-grid > a').evaluateAll(elements => elements.map(el => getComputedStyle(el).backgroundColor));
  expect(backgrounds.every(color => color === 'rgba(0, 0, 0, 0)')).toBe(true);
  expect(collectionLinks.every(link => !/GV-PK-MEW-19[89]|GV-PK-MEW-200/.test(new URL(link!, page.url()).pathname))).toBe(true);
  await expect(page.getByRole('link', { name: 'Sign in to add', exact: true })).toBeVisible();
  const addColors = await page.getByRole('link', { name: 'Sign in to add', exact: true }).evaluate(el => ({ foreground: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
  expect(addColors.background).toBe(info.project.name.endsWith('dark') ? 'rgb(145, 196, 163)' : 'rgb(23, 103, 71)');
  expect(addColors.foreground).toBe(info.project.name.endsWith('dark') ? 'rgb(21, 41, 29)' : 'rgb(255, 255, 255)');
  await expect(page.locator('.gv-detail-market')).toContainText('Sign in to view pricing');
  const printing = page.getByRole('combobox', { name: 'Variant / Finish', exact: true });
  await expect(printing).toBeVisible();
  await expect(printing).toBeEnabled();
  expect(await page.locator('.gv-detail-finish-field').evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(90);
  await expect(page.locator('.gv-variant-selector,.gv-hi-selected-version,.gv-detail-printing-disclosure')).toHaveCount(0);
  await expect(page.locator('.gv-detail-printing-notice')).toContainText('Base image');
  const firstPrinting = await printing.locator('option').first().getAttribute('value');
  await printing.selectOption(firstPrinting!);
  await expect(printing).toHaveValue(firstPrinting!);
  const breadcrumb = page.getByRole('navigation', { name: 'Card breadcrumb' });
  await expect(breadcrumb.getByRole('link', { name: 'Search', exact: true })).toHaveAttribute('href', /cards=GV-PK-MEW-200/);
  const information = page.locator('details.gv-detail-disclosure').filter({ has: page.locator('summary', { hasText: 'Card information' }) });
  await expect(information).not.toHaveAttribute('open', '');
  await information.locator('summary').click();
  await expect(information.getByRole('heading', { name: 'Card information', exact: true })).toBeVisible();
  await information.locator('summary').click();
  await page.getByRole('button', { name: /Open enlarged preview for Charizard ex/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => page.getByRole('dialog').locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth), { timeout: 30_000 }).toBeGreaterThan(200);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await info.attach('real-card-detail', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('native sharing, cancellation and denied clipboard report truthful outcomes', async ({ page }) => {
  await page.goto('/card/GV-PK-MEW-200', { waitUntil: 'domcontentloaded' });
  const share = page.getByRole('button', { name: 'Share', exact: true });
  await expect(share).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { document.documentElement.dataset.nativeUrl = data.url; } });
  });
  await share.click();
  await expect(page.getByRole('status', { exact: true }).filter({ hasText: 'Shared' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.nativeUrl)).toBe(new URL('/card/GV-PK-MEW-200', page.url()).href);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { document.documentElement.dataset.unexpectedCopy = 'yes'; } } });
  });
  await share.click();
  await expect(share).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.dataset.unexpectedCopy)).toBeUndefined();
  await expect(page.locator('.gv-detail-share-status')).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } });
  });
  await share.click();
  await expect(page.locator('.gv-detail-share-status')).toContainText('Unable to share');
  await expect(share).toBeEnabled();
});
