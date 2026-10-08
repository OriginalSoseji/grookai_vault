import {defineConfig} from '@playwright/test';
import base from './playwright.vendor-workspace.config';
export default defineConfig({...base,testMatch:['purchase-readers.spec.ts'],outputDir:'./test-results/purchase-readers'});
