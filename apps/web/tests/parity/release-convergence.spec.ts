import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const scenarios = [
  "search-vault-bridge",
  "search-result-hierarchy",
  "card-detail-hierarchy",
  "error-state",
  "private-state",
] as const;

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

test("Search result hierarchy keeps version, price, action, and evidence distinct", async ({ page }) => {
  await openScenario(page, "search-result-hierarchy");

  await expect(page.getByText("Scarlet & Violet 151 • #025 • Common", { exact: true })).toBeVisible();
  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$3.42", { exact: true })).toBeVisible();

  const evidence = page.getByText("Why this result", { exact: true });
  await expect(evidence).toBeVisible();
  await expect(page.getByText("Exact name and reverse-holo finish match", { exact: true })).toBeHidden();
  await evidence.click();
  await expect(page.getByText("Exact name and reverse-holo finish match", { exact: true })).toBeVisible();
});

test("Card detail hierarchy puts the collection action before expanded context", async ({ page }) => {
  await openScenario(page, "card-detail-hierarchy");

  const action = page.locator("#vault-actions");
  const versionContext = page.getByText("Why this version matters +", { exact: true });
  const [actionBox, contextBox] = await Promise.all([action.boundingBox(), versionContext.boundingBox()]);
  expect(actionBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(contextBox?.y ?? Number.NEGATIVE_INFINITY);
  await expect(page.getByText("Grookai ID GV-FIXTURE-PIKACHU", { exact: true })).toBeHidden();
});

test("P0 Search result hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "search-result-hierarchy");
  await expect(page).toHaveScreenshot("p0-search-result-mobile.png", { fullPage: true });
});

test("P0 Card Detail hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "card-detail-hierarchy");
  await expect(page).toHaveScreenshot("p0-card-detail-mobile.png", { fullPage: true });
});

test("P0 Search result hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "search-result-hierarchy");
  await expect(page).toHaveScreenshot("p0-search-result-desktop.png", { fullPage: true });
});

test("P0 Card Detail hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "card-detail-hierarchy");
  await expect(page).toHaveScreenshot("p0-card-detail-desktop.png", { fullPage: true });
});
