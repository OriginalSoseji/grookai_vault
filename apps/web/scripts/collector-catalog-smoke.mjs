import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = 'http://127.0.0.1:3165';
const out = process.env.COLLECTOR_CATALOG_SMOKE_OUTPUT || 'C:/grookai_vault_operator_artifacts/collector_polish/real_local_20260910/catalog-smoke';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/explore', '/explore?q=Pikachu', '/sets', '/card/GV-PK-MEW-025']) {
      const response = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('main').waitFor();
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 130)); }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(2500);
      const state = await page.evaluate(() => ({
        headings: [...document.querySelectorAll('h1,h2')].map(element => element.textContent),
        cardLinks: [...new Set([...document.querySelectorAll('a[href^="/card/"]')].map(element => element.getAttribute('href')))],
        images: [...document.querySelectorAll('main img')].map(image => ({ src: image.currentSrc, alt: image.alt, width: image.naturalWidth, height: image.naturalHeight })),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      const filename = `${name}-${route.replace(/[^a-z0-9]/gi, '-')}.png`;
      await page.screenshot({ path: path.join(out, filename), fullPage: true });
      results.push({ name, route, status: response.status(), ...state, errors: [...errors], screenshot: filename });
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(path.join(out, 'report.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(({ images, cardLinks, ...row }) => ({ ...row, cards: cardLinks.length, images: images.length, loadedImages: images.filter(image => image.width > 0).length })), null, 2));
if (results.some(row => row.status !== 200 || row.overflow || row.errors.length ||
  (row.route !== '/sets' && !row.images.some(image => image.width > 0)) ||
  (row.route === '/sets' && !row.headings.includes('Prismatic Evolutions')) ||
  (row.route.includes('explore') && !row.cardLinks.length))) process.exitCode = 1;
