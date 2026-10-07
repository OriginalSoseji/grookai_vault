import {defineConfig} from '@playwright/test';
import base from './playwright.vendor-workspace.config';
export default defineConfig({...base,testMatch:['sales-profit.spec.ts','vendor-workspace.spec.ts'],outputDir:'./test-results/profit'});
