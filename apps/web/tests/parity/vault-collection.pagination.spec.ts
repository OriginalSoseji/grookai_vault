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

  test("mobile Vault lets collectors choose and retain 2, 3, or 4 card columns", async ({ page }) => {
    await page.setViewportSize({ width: 384, height: 824 });
    await page.goto(FIXTURE_PATH, { waitUntil: "networkidle" });

    const grid = page.locator("[data-vault-grid-columns]").first();
    await expect(grid).toHaveAttribute("data-vault-grid-columns", "2");
    const columnControl = page.getByRole("radiogroup", { name: "Choose Vault grid columns" });
    await columnControl.getByRole("radio", { name: "3", exact: true }).click();
    await expect(grid).toHaveAttribute("data-vault-grid-columns", "3");
    await expect(grid).toHaveCSS("grid-template-columns", /\d+px \d+px \d+px/);

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("[data-vault-grid-columns]").first()).toHaveAttribute("data-vault-grid-columns", "3");
    await columnControl.getByRole("radio", { name: "4", exact: true }).click();
    await expect(page.locator("[data-vault-grid-columns]").first()).toHaveAttribute("data-vault-grid-columns", "4");

    const viewControl = page.getByRole("radiogroup", { name: "Choose vault mobile view" });
    await viewControl.getByRole("radio", { name: "Detail", exact: true }).click();
    await expect(columnControl).toHaveCount(0);
    await viewControl.getByRole("radio", { name: "Grid", exact: true }).click();
    await expect(page.locator("[data-vault-grid-columns]").first()).toHaveAttribute("data-vault-grid-columns", "4");
  });

  test("price filtering and sorting are clear and preserved in the Vault URL", async ({ page }) => {
    await page.setViewportSize({ width: 384, height: 824 });
    await page.goto(FIXTURE_PATH, { waitUntil: "networkidle" });
    const cards = page.locator("[data-vault-page-items] .gv-visual-card:visible");
    await expect(cards).toHaveCount(24);

    await page.getByRole("radiogroup", { name: "Filter Vault by market price" })
      .getByRole("radio", { name: "Unpriced" }).click();
    await expect(page).toHaveURL(/price=unpriced/);
    await expect(cards).toHaveCount(12);

    await page.getByRole("combobox", { name: "Sort Vault cards" }).selectOption("name");
    await expect(page).toHaveURL(/sort=name/);
    await expect(cards.first()).toContainText("Blastoise");

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("radiogroup", { name: "Filter Vault by market price" })
      .getByRole("radio", { name: "Unpriced" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("combobox", { name: "Sort Vault cards" })).toHaveValue("name");
    await expect(cards).toHaveCount(12);
  });

  test("By Set keeps groups contiguous while sort and pagination change", async ({ page }) => {
    await page.setViewportSize({ width: 384, height: 824 });
    await page.goto(`${FIXTURE_PATH}?view=by-set`, { waitUntil: "networkidle" });

    const groups = page.locator("[data-vault-set-group]:visible");
    for (const sort of ["newest", "name", "quantity"] as const) {
      if (sort !== "newest") {
        await page.getByRole("combobox", { name: "Sort Vault cards" }).selectOption(sort);
      }
      for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
        const setCodes = await groups.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-vault-set-group")));
        expect(setCodes.length).toBe(new Set(setCodes).size);
        if (pageIndex < 2) {
          await page.getByRole("button", { name: "Next", exact: true }).click();
        }
      }
      if (sort !== "quantity") {
        await page.getByRole("button", { name: "Previous", exact: true }).click();
        await page.getByRole("button", { name: "Previous", exact: true }).click();
      }
    }
  });
});
