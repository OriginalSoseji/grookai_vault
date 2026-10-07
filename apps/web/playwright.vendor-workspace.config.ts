import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error("Expected one isolated fixture server");

export default defineConfig({
  ...base,
  testMatch: ["vendor-workspace.spec.ts", "vendor-inventory.spec.ts", "vendor-pricing.spec.ts"],
  outputDir: "./test-results/vendor-workspace",
  webServer: { ...server,
    url: `http://127.0.0.1:${process.env.GROOKAI_PLAYWRIGHT_PORT ?? "3100"}/visual-fixtures/vendor-workspace`,
    env: { ...server.env, NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY: "false",
      NEXT_PUBLIC_COLLECTOR_STAGING: "true", NEXT_PUBLIC_SEALED_OWNERSHIP_V1_ENABLED: "true", GROOKAI_DISABLE_TELEMETRY: "1" },
  },
});
