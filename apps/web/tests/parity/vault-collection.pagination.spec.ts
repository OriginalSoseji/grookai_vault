import { expect, test } from "@playwright/test";

const FIXTURE_PATH = "/visual-fixtures/vault-collection";

test.describe("Vault collection pagination", () => {
  const pageErrors: string[] = [];
  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.clock.setFixedTime(new Date("2026-10-27T18:00:00.000Z"));
  });
  test.afterEach(() => {
    expect(pageErrors).toEqual([]);
  });
  test("desktop keeps the collection bounded and preserves state in the URL", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(FIXTURE_PATH, { waitUntil: "networkidle" });

    const visibleCards = page.locator("[data-vault-page-items] .gv-visual-card:visible");
    await expect(visibleCards).toHaveCount(24);
    await expect(page.getByText("Showing 1–24 of 56")).toBeVisible();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of 3")).toBeVisible();
    await expect(visibleCards).toHaveCount(24);
    await expect(visibleCards.first().locator('a[href^="/card/"]').first()).toHaveAttribute(
      "href",
      /from=%2Fvault%3Fpage%3D2/,
    );

    await page.getByRole("searchbox", { name: "Search your Vault" }).fill("Pikachu ex");
    await expect(page).not.toHaveURL(/page=/);
    await expect(page).toHaveURL(/q=Pikachu(?:\+|%20)ex/);
    await expect(visibleCards).toHaveCount(7);
    await expect(visibleCards.first().locator('a[href^="/card/"]').first()).toHaveAttribute(
      "href",
      /from=%2Fvault%3Fq%3DPikachu(?:%2B|%2520)ex/,
    );
  });

  test("Samsung viewport keeps controls usable without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 384, height: 824 });
    await page.goto(FIXTURE_PATH, { waitUntil: "networkidle" });

    await expect(page.locator("[data-vault-page-items] .gv-visual-card:visible")).toHaveCount(24);
    await expect(page.getByRole("navigation", { name: "Vault card pages" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
