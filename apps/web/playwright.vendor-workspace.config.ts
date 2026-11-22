import {defineConfig} from "@playwright/test";

const baseURL = process.env.VENDOR_WORKSPACE_BASE_URL ?? "http://127.0.0.1:61914";
if (new URL(baseURL).hostname !== "127.0.0.1") throw Error("Vendor workspace browser checks require an isolated local server.");
export default defineConfig({
  testDir: "./tests/vendor-workspace", workers: 1, fullyParallel: false,
  timeout: 120000, expect: {timeout: 30000}, reporter: "line",
  outputDir: process.env.VENDOR_WORKSPACE_ARTIFACTS_DIR ?? "test-results/vendor-workspace",
  use: {baseURL, viewport: {width: 1366, height: 900}, colorScheme: "dark", contextOptions: {reducedMotion: "reduce"}, serviceWorkers: "block", trace: "off"},
});
