import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function authenticate(page: Page) {
  await page.route("http://127.0.0.1:54321/**", route => route.fulfill({ json:
    new URL(route.request().url()).pathname.endsWith("/user") ? {
      id: "00000000-0000-4000-8000-000000000001", aud: "authenticated",
      email: "vendor@example.test", created_at: "2026-10-07T00:00:00Z",
    } : {} }));
}

for (const width of [384, 1440]) test(`pricing evidence stays separate from an unsaved asking price at ${width}px`, async ({ page }) => {
  await authenticate(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/visual-fixtures/vendor-workspace?view=pricing");
  const reference = page.getByRole("region", { name: "Market reference", exact: true });
  await expect(reference.getByText("TCGPlayer Market · USD", { exact: true })).toBeVisible();
  await expect(reference).toContainText("Observed Oct 6, 2026 · Published Oct 7, 2026");
  await expect(reference.getByText("$100.00", { exact: true })).toBeVisible();
  await page.getByRole("spinbutton", { name: "Amount", exact: true }).fill("81.25");
  await page.getByRole("button", { name: "Refresh sample market evidence" }).click();
  await expect(reference.getByText("$125.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Amount", exact: true })).toHaveValue("81.25");
  await expect(page.getByRole("textbox", { name: "Currency", exact: true })).toHaveValue("CAD");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).include('[data-vendor-workspace-fixture]').analyze();
  expect(accessibility.violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
  page.once("dialog", dialog => { expect(dialog.message()).toContain("unsaved pricing"); return dialog.dismiss(); });
  await page.getByRole("link", { name: "Back to sample Inventory" }).click();
  await expect(page).toHaveURL(/view=pricing/);
  await expect(page.getByRole("spinbutton", { name: "Amount", exact: true })).toHaveValue("81.25");
  await page.route("**/visual-fixtures/vendor-workspace?view=inventory", route => route.fulfill({ contentType: "text/html", body: "<h1>Sample Inventory destination</h1>" }));
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("link", { name: "Back to sample Inventory" }).click();
  await expect(page.getByRole("heading", { name: "Sample Inventory destination" })).toBeVisible();
});

for (const evidence of ["slab", "unsupported", "missing"]) test(`pricing fails closed for ${evidence} evidence`, async ({ page }) => {
  await authenticate(page);
  await page.goto(`/visual-fixtures/vendor-workspace?view=pricing&evidence=${evidence}`);
  const reference = page.getByRole("region", { name: "Market reference", exact: true });
  await expect(reference).toContainText("No market reference available");
  await expect(reference.locator('[data-pricing-proof="tcgplayer-market"]')).toHaveCount(0);
  await expect(page.getByRole("spinbutton", { name: "Amount", exact: true })).toHaveValue("80.00");
});
