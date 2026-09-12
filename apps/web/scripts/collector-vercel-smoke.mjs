import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.PREVIEW_TEST_URL || 'http://127.0.0.1:3166';
const out = process.env.PREVIEW_TEST_OUTPUT || 'C:/grookai_vault_operator_artifacts/collector_polish/vercel_preview_20260910';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
if (process.env.PREVIEW_TEST_BYPASS) {
  await context.request.get(base + '/robots.txt', {
    headers: { 'x-vercel-protection-bypass': process.env.PREVIEW_TEST_BYPASS, 'x-vercel-set-bypass-cookie': 'true' },
  });
  assert.ok((await context.cookies(base)).some(cookie => cookie.name.includes('vercel')), 'Protected preview did not set its access cookie');
}
const page = await context.newPage();
const failures = [], errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
try {
  for (const route of ['/explore', '/card/GV-PK-MEW-200', '/sets/sv03.5', '/network/discover']) {
    const start = Date.now();
    const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.equal(response.status(), 200);
    await page.getByRole('main').first().waitFor();
    if (route.includes('/card/')) {
      await page.getByRole('heading', { name: 'Blastoise ex', exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('.gv-detail-main-image')?.naturalWidth > 250, null, { timeout: 45000 });
    }
    if (route === '/explore') {
      await page.getByRole('heading', { name: 'The original 151.' }).waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('.gv-approved-feature-art img')].length === 3 && [...document.querySelectorAll('.gv-approved-feature-art img')].every(image => image.naturalWidth > 200), null, { timeout: 45000 });
    }
    if (route === '/network/discover') await page.getByRole('heading', { name: 'Discover collectors' }).waitFor();
    for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 800) {
      await page.evaluate(y => window.scrollTo(0, y), y);
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/${route.replaceAll('/', '_')}.png`, fullPage: true, animations: 'disabled' });
    const images = await page.locator('main img').evaluateAll(images => ({ total: images.length, loaded: images.filter(image => image.naturalWidth > 0).length }));
    results.push({ route, status: response.status(), elapsedMs: Date.now() - start, images });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/card/GV-PK-MEW-200', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByRole('heading', { name: 'Blastoise ex', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.gv-detail-main-image')?.naturalWidth > 250);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  await page.screenshot({ path: `${out}/mobile-detail.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: /Open enlarged preview for Blastoise/ }).click();
  await page.getByRole('dialog', { name: /Enlarged preview for Blastoise/ }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  results.push({ route: 'mobile-detail', zoom: 'passed', horizontalOverflow: false });
  for (const route of ['/vault', '/login', '/submit']) {
    await page.goto(base + route);
    await page.getByRole('heading', { name: 'Account actions are paused in this preview' }).waitFor();
    results.push({ route, accountBlocked: true });
  }
  for (const route of ['/api/telemetry', '/card/GV-PK-MEW-200']) {
    const response = await context.request.post(base + route, { data: {} });
    assert.equal(response.status(), 403);
    results.push({ route, method: 'POST', status: response.status() });
  }
  const search = await context.request.get(base + '/api/resolver/search?q=Blastoise&game=pokemon');
  assert.equal(search.status(), 200);
  const json = await search.json();
  assert.ok(json.rows.length > 0);
  results.push({ route: 'search:Blastoise', rows: json.rows.length });
  assert.equal(errors.length, 0, errors.join('\n'));
} finally {
  writeFileSync(`${out}/smoke.json`, JSON.stringify({ base, results, errors, failures }, null, 2));
  console.log(JSON.stringify({ results, errors, failures }, null, 2));
  await browser.close();
}
