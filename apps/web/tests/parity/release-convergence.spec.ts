import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const scenarios = ["search-vault-bridge", "error-state", "private-state"] as const;

async function openScenario(page: import("@playwright/test").Page, scenario: typeof scenarios[number]) {
  const response = await page.goto(`/visual-fixtures/release-convergence/${scenario}`, {
    waitUntil: "networkidle",
  });
  expect(response?.ok()).toBe(true);
  await expect(page.locator("[data-release-convergence-root]")).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);
}

for (const scenario of scenarios) {
  test(`${scenario} is accessible and does not overflow`, async ({ page }) => {
    await openScenario(page, scenario);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.filter((result) => result.impact === "critical" || result.impact === "serious")).toEqual([]);
  });
}

test("Search card keeps identity context and bridges to exact Vault actions", async ({ page }) => {
  await openScenario(page, "search-vault-bridge");

  await expect(page.getByText("Reverse Holo", { exact: true })).toBeVisible();
  await expect(page.getByText("Scarlet & Violet 151 · #025", { exact: true })).toBeVisible();
  const vaultAction = page.getByRole("link", { name: /Choose a version of Pikachu to add to your Vault/ });
  await expect(vaultAction).toHaveAttribute("href", "/card/GV-FIXTURE-PIKACHU#vault-actions");

  const cardArt = page.getByText("Stable 5:7 card artwork").locator("..");
  const box = await cardArt.boundingBox();
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(5 / 7, 2);
});
