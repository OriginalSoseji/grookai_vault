import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const scenarios = [
  "search-vault-bridge",
  "search-result-hierarchy",
  "card-detail-hierarchy",
  "vault-loaded",
  "vault-empty",
  "vault-private",
  "vault-partial-error",
  "vault-duplicate-copy",
  "vault-offline",
  "vault-exact-copy",
  "pulse-event",
  "pulse-empty",
  "pulse-partial-error",
  "social-loading",
  "wall-collection",
  "wall-private",
  "profile-collector",
  "profile-blocked",
  "profile-deleted",
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

test("Vault families keep exact finish context visible without collapsing mixed copies", async ({ page }) => {
  await openScenario(page, "vault-loaded");

  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2 copies • Mixed finishes", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("GV-VI-FIXTURE-PIKACHU-RH", { exact: false })).toBeHidden();
});

test("Duplicate family reveals each exact copy and keeps evidence disclosed", async ({ page }) => {
  await openScenario(page, "vault-duplicate-copy");

  await expect(page.getByText("NM • Holofoil • Raw", { exact: true })).toBeVisible();
  await expect(page.getByText("LP • Reverse Holo • Raw", { exact: true })).toBeVisible();
  const evidence = page.getByText("Copy evidence", { exact: true }).first();
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-CHARIZARD-NORMAL", { exact: true })).toBeHidden();
  await evidence.click();
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-CHARIZARD-NORMAL", { exact: true })).toBeVisible();
});

test("Exact-copy hierarchy shows version before provenance", async ({ page }) => {
  await openScenario(page, "vault-exact-copy");

  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NM", { exact: true })).toBeVisible();
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-PIKACHU-RH", { exact: true })).toBeHidden();
});

test("Partial Vault failure preserves loaded ownership context", async ({ page }) => {
  await openScenario(page, "vault-partial-error");
  await expect(page.getByText("Your cards are still here", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pikachu", exact: true })).toBeVisible();
  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
});

test("Pulse separates collector activity from exact card identity", async ({ page }) => {
  await openScenario(page, "pulse-event");

  await expect(page.getByText("Fixture Collector", { exact: true })).toBeVisible();
  await expect(page.getByText(/marked a copy for trade/i)).toBeVisible();
  await expect(page.getByText("Illustration Rare", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NM", { exact: true })).toBeVisible();
  await expect(page.getByText("Card ID: GV-FIXTURE-PIKACHU-IR", { exact: true })).toBeHidden();
});

test("Wall collection display keeps version context primary and provenance disclosed", async ({ page }) => {
  await openScenario(page, "wall-collection");

  await expect(page.locator("[data-wall-collection-card]")).toHaveCount(1);
  await expect(page.getByText("Illustration Rare", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Raw copy", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View exact copy" })).toHaveAttribute("href", "/gvvi/GV-VI-FIXTURE-PIKACHU-IR-NM");
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-PIKACHU-IR-NM", { exact: true })).toBeHidden();
});

test("Collector profile keeps relationship actions separate from collection cards", async ({ page }) => {
  await openScenario(page, "profile-collector");

  await expect(page.locator("[data-collector-profile-header]")).toHaveCount(1);
  await expect(page.getByText("24 followers", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
  await expect(page.locator("[data-wall-collection-card]")).toHaveCount(1);
});

test("social degraded states are explicit and do not expose backend errors", async ({ page }) => {
  for (const [scenario, title] of [
    ["pulse-empty", "You are caught up"],
    ["pulse-partial-error", "Some activity is unavailable"],
    ["wall-private", "This Wall is private"],
    ["profile-blocked", "This collector is unavailable"],
    ["profile-deleted", "Collector profile not found"],
  ] as const) {
    await openScenario(page, scenario);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByText(/supabase|postgres|error code/i)).toHaveCount(0);
  }
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

test("P0 Vault hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "vault-loaded");
  await expect(page).toHaveScreenshot("p0-vault-loaded-mobile.png", { fullPage: true });
});

test("P0 exact-copy hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "vault-exact-copy");
  await expect(page).toHaveScreenshot("p0-vault-exact-copy-mobile.png", { fullPage: true });
});

test("P0 Vault hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "vault-loaded");
  await expect(page).toHaveScreenshot("p0-vault-loaded-desktop.png", { fullPage: true });
});

test("P0 exact-copy hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "vault-exact-copy");
  await expect(page).toHaveScreenshot("p0-vault-exact-copy-desktop.png", { fullPage: true });
});

for (const scenario of ["pulse-event", "wall-collection", "profile-collector"] as const) {
  test(`P0 ${scenario} remains visually stable on Samsung`, async ({ page }) => {
    await openScenario(page, scenario);
    await expect(page).toHaveScreenshot(`p0-${scenario}-mobile.png`, { fullPage: true });
  });

  test(`P0 ${scenario} remains visually stable on desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openScenario(page, scenario);
    await expect(page).toHaveScreenshot(`p0-${scenario}-desktop.png`, { fullPage: true });
  });
}
