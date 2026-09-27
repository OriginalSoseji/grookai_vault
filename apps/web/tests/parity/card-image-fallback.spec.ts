import { expect, test } from "@playwright/test";

// Synthetic pixel: browser delivery evidence, not artwork/finish verification.
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=", "base64");

for (const scenario of ["official fallback", "all images fail", "related image fails", "primary succeeds"] as const) {
  test(scenario, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const officialRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/canon/cards/*/image", (route) => scenario === "primary succeeds"
      ? route.fulfill({ contentType: "image/png", body: pixel })
      : route.fulfill({ status: 404, body: "Fixture primary unavailable" }));
    await page.route("https://www.pokemon-card.com/**", (route) => {
      const url = route.request().url();
      officialRequests.push(url);
      return scenario === "all images fail" || (scenario === "related image fails" && url.includes("fixture-related"))
        ? route.fulfill({ status: 404, body: "Fixture fallback unavailable" })
        : route.fulfill({ contentType: "image/png", body: pixel });
    });
    await page.goto("/visual-fixtures/card-images");
    const detail = page.getByRole("region", { name: "Card detail", exact: true });
    const related = page.getByRole("region", { name: "Related card", exact: true });
    for (const [section, name, fails] of [
      [detail, "Budew card artwork", scenario === "all images fail"],
      [related, "Related card artwork", scenario === "all images fail" || scenario === "related image fails"],
    ] as const) {
      if (fails) {
        await expect(section.getByRole("img", { name: `${name} — image unavailable` })).toBeVisible();
        await expect(section.locator("img")).toHaveCount(0);
      } else {
        const img = section.getByRole("img", { name, exact: true });
        await expect(img).toBeVisible();
        await expect.poll(() => img.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        const source = new URL((await img.getAttribute("src"))!, page.url());
        if (scenario === "primary succeeds") {
          expect(source.origin).toBe(new URL(page.url()).origin);
          expect(source.pathname).toMatch(/^\/api\/canon\/cards\/[^/]+\/image$/);
        } else {
          expect(source.origin).toBe("https://www.pokemon-card.com");
          expect(source.pathname).toMatch(/^\/assets\/images\/card_images\/large\//);
        }
      }
    }
    await expect(detail.getByText("Representative image; exact finish not verified.")).toBeVisible();
    await detail.getByText("Card information", { exact: true }).click();
    await expect(detail.getByText("Fixture identity remains available when artwork fails.")).toBeVisible();
    expect(errors).toEqual([]);
    expect(officialRequests).toHaveLength(scenario === "primary succeeds" ? 0 : 2);
    await page.screenshot({ path: testInfo.outputPath("recovery.png"), fullPage: true });
  });
}
