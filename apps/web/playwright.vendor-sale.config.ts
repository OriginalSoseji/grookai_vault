import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/vendor-sale', workers: 1, fullyParallel: false,
  timeout: 240000, expect: {timeout: 30000}, reporter: 'line',
  outputDir: process.env.VENDOR_SALE_ARTIFACTS_DIR ?? 'test-results/vendor-sale',
  use: {baseURL: 'http://127.0.0.1:61916', viewport: {width: 1365, height: 900},
    colorScheme: 'dark', contextOptions: {reducedMotion: 'reduce'}, serviceWorkers: 'block', trace: 'off'},
});
