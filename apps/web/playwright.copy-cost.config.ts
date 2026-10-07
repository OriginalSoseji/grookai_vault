import {defineConfig} from '@playwright/test';
import base from './playwright.vendor-workspace.config';
export default defineConfig({...base,testMatch:['copy-cost.spec.ts'],outputDir:'./test-results/copy-cost'});
