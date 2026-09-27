import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error("Expected a single isolated web server");

export default defineConfig({
  ...base,
  testMatch: "search-combobox.spec.ts",
  outputDir: "./test-results/search-combobox",
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    ...server,
    // Exercise the normal collector shell as well as the actual search route.
    // Keep the inherited credential stripping and loopback preview environment.
    env: { ...server.env, GROOKAI_VISUAL_TEST_MODE: "0" },
    url: String(server.url).replace("/visual-fixtures/parity/pulse-empty", "/explore?q=x"),
  },
});
