import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error("Expected one isolated preview");
export default defineConfig({
  ...base,
  testMatch: "account-recovery.spec.ts",
  outputDir: "./test-results/account-recovery",
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    ...server,
    // Use the existing local staging boundary with dummy keys and intercepted Auth.
    env: { ...server.env, NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY: "false",
      NEXT_PUBLIC_COLLECTOR_STAGING: "true" },
  },
});
