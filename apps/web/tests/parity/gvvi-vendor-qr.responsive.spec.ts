import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { name: "small-mobile", width: 360, height: 800 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`GVVI vendor QR fixture fits ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto("/visual-fixtures/gvvi-vendor-qr", { waitUntil: "networkidle" });
    expect(response?.ok()).toBe(true);
    await expect(page.locator("[data-gvvi-vendor-fixture-root]")).toBeVisible();
    await expect(page.getByText("Vendor price", { exact: true })).toBeVisible();
    await expect(page.getByText("$32.00", { exact: true })).toBeVisible();
    await expect(page.getByText("NM", { exact: true }).first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({
      path: testInfo.outputPath(`gvvi-vendor-qr-${viewport.name}.png`),
      fullPage: true,
    });
  });
}

test("GVVI vendor QR fixture has no serious accessibility violations", async ({ page }) => {
  await page.goto("/visual-fixtures/gvvi-vendor-qr", { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious).toEqual([]);
});
