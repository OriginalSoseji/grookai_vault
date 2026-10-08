import {defineConfig} from '@playwright/test';
import base from './playwright.vendor-workspace.config';
export default defineConfig({...base,testMatch:['cost-review.spec.ts','vendor-inventory.spec.ts'],outputDir:'./test-results/cost-review'});
