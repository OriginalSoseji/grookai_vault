import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1440]) {
  test(`sets retain upright artwork and readable names at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/visual-fixtures/launch-identity", { waitUntil: "networkidle" });
    // Exercise the production collector cascade as well as the shared launch theme.
    await page.evaluate(() => document.documentElement.classList.add("gv-collector"));
    await page.evaluate(() => document.fonts.ready);
    const preview = page.getByRole("region", { name: "Set layout preview" });
    const tiles = preview.locator(".gv-collector-set-tile");
    await expect(tiles).toHaveCount(6);
    const grid = preview.locator(".gv-collector-set-grid");
    await expect(grid).toHaveCSS("column-gap", "9px");
    await expect(grid).toHaveCSS("row-gap", "9px");
    const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(width >= 1280 ? 6 : 2);
    const first = tiles.first();
    const cover = first.locator(".gv-collector-set-cover");
    await expect(cover).toHaveCSS("border-radius", "10px");
    const bounds = await cover.boundingBox();
    expect(bounds!.width / bounds!.height).toBeCloseTo(5 / 7, 2);
    await expect(first.locator("img")).toHaveCSS("transform", "none");
    await expect(first.locator("img")).toHaveCSS("object-fit", "contain");
    expect(await preview.locator('img[src*="/api/canon/cards/"]').count()).toBe(0);
    const longTitle = preview.getByRole("heading", { name: "A deliberately long set name that wraps onto more than one line" });
    expect((await longTitle.boundingBox())!.height).toBe(38);
    await expect(preview.getByRole("heading", { name: "スターターセット MEGA メガディアンシーex" })).toBeVisible();
    await expect(preview.locator('[lang="ja"]')).toBeVisible();
    await expect(tiles.filter({ hasText: "Missing artwork" }).getByText("Cover artwork unavailable")).toBeVisible();
    await expect(tiles.filter({ hasText: "Broken artwork" }).getByText("Cover artwork unavailable")).toBeVisible();
    await expect(first).toHaveAttribute("href", "/sets/sv1");
    const header = page.locator(".gv-site-header");
    await header.getByRole("button", { name: "Use light mode", exact: true }).filter({ visible: true }).click();
    await expect(header.locator(".gv-brand-text").filter({ visible: true })).toHaveCSS("color", "rgb(8, 11, 9)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
