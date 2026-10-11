import {defineConfig} from '@playwright/test';
import base from './playwright.vendor-workspace.config';
export default defineConfig({...base,testMatch:['copy-cost.spec.ts','sales-profit.spec.ts','vendor-workspace.spec.ts','vendor-inventory.spec.ts','vendor-pricing.spec.ts'],outputDir:'./test-results/economics'});
