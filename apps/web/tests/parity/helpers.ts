import { expect, type Page } from "@playwright/test";
import type { MobileParityScenario } from "../../src/lib/mobileParity/shellManifest";

export const parityScenarios: readonly MobileParityScenario[] = [
  "pulse-empty",
  "wall-populated",
  "scan-ready",
  "vault-populated",
  "search-discovery",
  "menu-open",
];

export async function openParityScenario(
  page: Page,
  scenario: MobileParityScenario,
) {
  const externalRequests: string[] = [];

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const isLocal =
      requestUrl.hostname === "127.0.0.1" ||
      requestUrl.hostname === "localhost" ||
      requestUrl.protocol === "data:";

    if (isLocal) {
      await route.continue();
      return;
    }

    externalRequests.push(route.request().url());
    await route.abort("blockedbyclient");
  });

  const response = await page.goto(`/visual-fixtures/parity/${scenario}`, {
    waitUntil: "networkidle",
  });
  expect(response?.ok(), `fixture ${scenario} should load`).toBe(true);

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  expect(
    externalRequests,
    `fixture ${scenario} must not attempt external requests`,
  ).toEqual([]);
  await expect(page.locator("[data-mobile-parity-root]")).toBeVisible();
}
