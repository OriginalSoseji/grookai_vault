import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;

export default defineConfig({
  ...base,
  testMatch: "logo-themes.spec.ts",
  outputDir: "./test-results/logo-themes",
  reporter: [["list"]],
  webServer: server ? {
    ...server,
    url: `${base.use?.baseURL}/brand-preview`,
    env: { ...server.env, GROOKAI_VISUAL_TEST_MODE: "0" },
  } : undefined,
});
