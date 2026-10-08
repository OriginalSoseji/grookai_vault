import {defineConfig} from '@playwright/test';
import base from './playwright.vendor-workspace.config';
export default defineConfig({...base,testMatch:['vendor-events.spec.ts'],outputDir:process.env.GROOKAI_EVENT_TEST_OUTPUT??'./test-results/vendor-events'});
