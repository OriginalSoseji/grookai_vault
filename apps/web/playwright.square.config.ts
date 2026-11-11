import {defineConfig} from '@playwright/test';
export default defineConfig({testDir: './tests/square', testMatch: '*.spec.ts', workers: 1, fullyParallel: false,
  timeout: 120000, expect: {timeout: 30000}, reporter: 'line',
  outputDir: 'C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1/ui-proof',
  use: {baseURL: 'http://127.0.0.1:61850', viewport: {width: 1366, height: 768}, colorScheme: 'dark', contextOptions: {reducedMotion: 'reduce'},
    serviceWorkers: 'block', trace: 'off'}});
