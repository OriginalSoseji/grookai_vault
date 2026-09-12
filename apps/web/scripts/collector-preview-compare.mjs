import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = process.env.COLLECTOR_COMPARE_OUTPUT || 'C:/grookai_vault_operator_artifacts/collector_polish/preview_fidelity_before';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const rows = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844]]) {
    for (const [version, port] of [['approved', 3163], ['real', 3165]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`http://127.0.0.1:${port}/explore`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.screenshot({ path: `${dir}/${name}-${version}.png`, fullPage: true });
      rows.push({ name, version, headings: await page.locator('h1,h2').allTextContents(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
      await page.close();
    }
  }
} finally { await browser.close(); }
await writeFile(`${dir}/report.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows));
