import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL || new URL(baseURL).hostname !== "127.0.0.1") throw new Error("Local verification only");
  await context.route("**/*", route => {
    const request = route.request();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
    return route.continue();
  });
});

test("approved collection, geometry and real images precede the search toolbar", async ({ page }, info) => {
  await page.goto('/explore', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'The original 151.', exact: true })).toBeVisible();
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    return { heroBottom: rect('.gv-approved-feature').bottom, toolbarTop: rect('.gv-approved-toolbar').top,
      columns: getComputedStyle(document.querySelector('.gv-approved-product-grid')!).gridTemplateColumns.split(' ').length,
      heroHeight: rect('.gv-approved-feature').height, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  expect(geometry.heroBottom).toBeLessThan(geometry.toolbarTop);
  expect(geometry.columns).toBe(info.project.name.startsWith('phone') ? 2 : 5);
  expect(geometry.heroHeight).toBe(info.project.name.startsWith('phone') ? 190 : 218);
  expect(geometry.overflow).toBe(false);
  await expect(page.locator('.gv-approved-product')).toHaveCount(10);
  const first = page.locator('.gv-approved-product').first();
  await expect(first).toHaveAttribute('data-card-id', 'GV-PK-MEW-199');
  await expect(first.locator('.gv-approved-product-title')).toHaveText('Charizard ex');
  await expect.poll(() => page.locator('.gv-approved-feature img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.locator('.gv-approved-product').last().scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.gv-approved-product img').evaluateAll(images => images.length === 10 && images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.evaluate(() => scrollTo(0,0));
  await info.attach('approved-real-catalog', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test("filters, sorting, compare and real search work without sample ownership", async ({ page }) => {
  await page.goto('/explore', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByLabel('Rarity', { exact: true }).selectOption('Illustration rare');
  await expect(page.locator('.gv-approved-product')).toHaveCount(4);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.gv-approved-product')).toHaveCount(10);
  await page.getByLabel('Sort featured cards').selectOption('name');
  await expect(page.locator('.gv-approved-product-title').first()).toHaveText('Blastoise ex');
  await page.getByRole('button', { name: 'Add to compare', exact: true }).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('cards'), { timeout: 30_000 }).toBe('GV-PK-MEW-200');
  await expect(page.getByRole('button', { name: 'Remove from compare', exact: true }).first()).toBeVisible();
  const search = page.getByRole('searchbox');
  await expect(search).toHaveCount(1);
  await search.fill('Pikachu');
  await search.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('q'), { timeout: 30_000 }).toBe('Pikachu');
  await expect(page.getByRole('heading', { name: 'Pikachu', exact: true }).first()).toBeVisible();
  expect(new URL(page.url()).searchParams.get('cards')).toBe('GV-PK-MEW-200');
});

test("Enter searches the typed query instead of a pointer-hovered suggestion", async ({ page }) => {
  await page.goto('/explore', { waitUntil: 'domcontentloaded' });
  const search = page.getByRole('searchbox');
  await expect(search).toBeEnabled();
  await search.fill('Pikachu');
  const suggestion = page.getByRole('listbox', { name: 'Card suggestions' }).getByRole('option').first();
  await expect(suggestion).toBeVisible({ timeout: 30_000 });
  await suggestion.hover();
  await search.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('q'), { timeout: 30_000 }).toBe('Pikachu');
  expect(new URL(page.url()).pathname).toBe('/explore');
});
