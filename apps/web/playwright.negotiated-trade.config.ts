import {defineConfig} from '@playwright/test';
import base from './playwright.vendor-workspace.config';
export default defineConfig({...base, testMatch: ['negotiated-trade.spec.ts', 'purchase-desk.spec.ts', 'vendor-workspace.spec.ts'], outputDir: './test-results/negotiated-trade'});
