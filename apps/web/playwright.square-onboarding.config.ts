import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/square',testMatch:'onboarding.spec.ts',fullyParallel:false,workers:1,retries:0,
  timeout:60000,expect:{timeout:15000},
  use:{baseURL:'http://127.0.0.1:63380',browserName:'chromium',viewport:{width:1280,height:900},trace:'off'},
  outputDir:'C:/grookai_vault_operator_artifacts/square_onboarding_20261112/candidate-v3/web-v2/test-results',reporter:'list',
});
