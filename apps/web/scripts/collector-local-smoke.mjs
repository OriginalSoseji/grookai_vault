import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.COLLECTOR_SMOKE_URL || 'http://127.0.0.1:3165';
if (new URL(base).hostname !== '127.0.0.1') throw new Error('Local smoke only.');
const out = process.env.COLLECTOR_SMOKE_OUTPUT || 'C:/grookai_vault_operator_artifacts/collector_polish/real_local_20260910/smoke';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const [name, viewport, theme] of [
    ['desktop', { width: 1440, height: 1000 }, 'light'],
    ['phone', { width: 390, height: 844 }, 'light'],
    ['dark', { width: 1440, height: 1000 }, 'dark'],
  ]) {
    const context = await browser.newContext({ viewport, colorScheme: theme });
    await context.addInitScript((value) => localStorage.setItem('grookai-theme', value), theme);
    await context.route('**/*', (route) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    for (const route of ['/explore', '/network', '/network/discover', '/sets', '/vault', '/binders', '/dex', '/compare']) {
      const errors = [];
      const onError = (error) => errors.push(error.message);
      page.on('pageerror', onError);
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 90000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      const headings = await page.locator('h1').allTextContents();
      const file = `${name}-${route.slice(1).replaceAll('/', '-')}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true });
      report.push({ viewport: name, route, finalUrl: page.url(), status: response?.status(), headings, overflow, errors, screenshot: file });
      page.off('pageerror', onError);
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.some(row => row.status >= 500 || row.overflow || row.errors.length)) process.exitCode = 1;
