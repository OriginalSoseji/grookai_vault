import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { assertCollectorStagingTarget } from '../src/lib/collectorStaging.mjs';

const root = new URL('../../../', import.meta.url);
const status = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', 'supabase status -o json'], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}));
assertCollectorStagingTarget(status.API_URL);
const accountPath = process.argv[2];
assert.match(accountPath ?? '', /^C:[/\\]grookai_vault_operator_artifacts[/\\]collector_polish[/\\]authenticated_20260910[/\\]\d+[/\\]local-test-account\.json$/i);
const account = JSON.parse(readFileSync(accountPath, 'utf8'));
assert.match(account.email, /^collector-staging-\d+-0@example\.invalid$/);
assert.equal(account.url, 'http://127.0.0.1:3167/login');
const base = new URL(account.url).origin;
const client = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = await client.auth.signInWithPassword({ email: account.email, password: account.password });
if (auth.error) throw auth.error;
const out = `C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/saved-search-${Date.now()}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [];
try {
  const sample = await client.from('card_prints').select('id,gv_id').eq('set_code', 'sv03.5').order('id').limit(25);
  if (sample.error) throw sample.error;
  assert.equal(sample.data.length, 25);
  const seed = await client.from('wishlist_items').upsert(sample.data.map(card => ({ user_id: auth.data.user.id, card_id: card.id })),
    { onConflict: 'user_id,card_id', ignoreDuplicates: true });
  if (seed.error) throw seed.error;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/login?next=/saved');
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/saved', { timeout: 60000 });
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveCount(24, { timeout: 20000 });
  const firstIds = await page.locator('main a[href^="/card/"]').evaluateAll(links => [...new Set(links.map(a => a.getAttribute('href')))]);
  assert.equal(firstIds.length, 24);
  await page.getByRole('link', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveCount(1);
  const lastIds = await page.locator('main a[href^="/card/"]').evaluateAll(links => [...new Set(links.map(a => a.getAttribute('href')))]);
  assert.equal(lastIds.length, 1);
  assert.ok(!firstIds.includes(lastIds[0]));
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await page.getByRole('heading', { name: 'No more saved cards', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Back to saved cards', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveCount(24);
  results.push({ test: '25-saved-cards-pagination-and-final-page-removal', passed: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base + '/saved', { waitUntil: 'networkidle' });
    for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 700) {
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForTimeout(80);
    }
    await page.waitForFunction(() => [...document.querySelectorAll('main .gv-visual-card-image img')].length === 24 &&
      [...document.querySelectorAll('main .gv-visual-card-image img')].every(img => img.naturalWidth > 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => scrollY === 0);
    await page.screenshot({ path: `${out}/saved-${width}.png`, fullPage: false });
    results.push({ test: 'saved-grid-layout-and-images', width, loadedImages: 24, noOverflow: true });
  }
  for (const [query, statusCode, count] of [
    ['q=Blastoise&game=pokemon&number=200', 200, 1],
    ['q=Blastoise&game=pokemon&number=%23200%2F165', 200, 1],
    ['q=Blastoise&game=pokemon&number=999999', 200, 0],
    ['q=Blastoise&game=mtg', 200, 0],
    ['q=Blastoise&game=one_piece', 200, 0],
    ['q=Blastoise&game=invalid', 400, 0],
    ['q=%25_&game=pokemon', 200, 0],
  ]) {
    const response = await context.request.get(base + '/api/search/suggestions?' + query);
    assert.equal(response.status(), statusCode, query);
    const payload = await response.json();
    assert.equal(payload.rows.length, count, query);
    if (count) assert.equal(payload.rows[0].gv_id, 'GV-PK-MEW-200');
    results.push({ test: 'search-constraint', query, status: response.status(), rows: count });
  }
  await page.goto(base + '/vault', { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Saved cards', exact: true }).waitFor();
  const guest = await browser.newPage();
  await guest.goto(base + '/saved');
  assert.equal(new URL(guest.url()).pathname, '/login');
  results.push({ test: 'saved-discoverability-and-guest-denial', passed: true });
} catch (error) {
  errors.push(String(error));
  for (const [index, page] of browser.contexts().flatMap(c => c.pages()).entries()) {
    writeFileSync(`${out}/failure-${index}.txt`, await page.locator('body').innerText().catch(() => 'unavailable'));
    await page.screenshot({ path: `${out}/failure-${index}.png`, fullPage: false }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  writeFileSync(`${out}/result.json`, JSON.stringify({ results, errors, localOnly: true }, null, 2));
  console.log(JSON.stringify({ out, results, errors }, null, 2));
  await browser.close();
}
