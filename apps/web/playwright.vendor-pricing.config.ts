import {defineConfig, devices} from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "vendor-pricing-workflow.local.spec.ts",
  fullyParallel: false, workers: 1,
  outputDir: "C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/playwright-results-v8",
  use: {baseURL: "http://127.0.0.1:62580", ...devices["Desktop Chrome"], screenshot: "only-on-failure"},
});
