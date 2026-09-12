import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = process.env.COLLECTOR_DETAIL_OUTPUT;
if (!output?.startsWith('C:/grookai_vault_operator_artifacts/collector_polish/')) throw new Error('Use the local operator artifact directory');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [size, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844]]) {
    for (const [version, port] of [['approved', 3163], ['real', 3165]]) {
      const origin = `http://127.0.0.1:${port}`;
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: 'light' });
      await page.route('**/*', route => new URL(route.request().url()).origin === origin && ['GET','HEAD','OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
      await page.goto(`${origin}/card/GV-PK-MEW-199`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Charizard ex', exact: true }).waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('main img')].some(image => image.naturalWidth > 200));
      if (version === 'real') await page.getByRole('heading', { name: 'More cards like this', exact: true }).waitFor();
      for (const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(image => image.complete ? undefined : new Promise(resolve => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }));
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${size}-${version}.png`, fullPage: true });
      results.push({ size, version, headings: await page.locator('h1,h2').allTextContents(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
      await page.close();
    }
  }
} finally { await browser.close(); }
await writeFile(`${output}/comparison.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
