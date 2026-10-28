import { expect, test } from "@playwright/test";

/* The gallery uses recorded mapping evidence; resolver tests exercise the real async loader. */
test.beforeEach(async ({ page }) => {
  await page.route(
    "**/functions/v1/card-marketplace-links-v1",
    async (route) =>
      route.fulfill({
        json: {
          link: {
            card_print_id: "a36f8d8a-353f-4cca-ba89-912eb7f10c3a",
            card_printing_id: "2395183d-ab12-4f9d-9014-9abda113e7d6",
            finish: "Holofoil",
            language: "English",
            conditions: [
              ["NM", "Near Mint"],
              ["LP", "Lightly Played"],
              ["MP", "Moderately Played"],
              ["HP", "Heavily Played"],
              ["DMG", "Damaged"],
            ].map(([code, label]) => ({
              code,
              label,
              url:
                `https://www.tcgplayer.com/product/610758?${new URLSearchParams(
                  {
                    Condition: label,
                    Printing: "Holofoil",
                    Language: "English",
                  },
                )}`,
            })),
          },
        },
      }),
  );
});

for (const width of [384, 1280]) {
  for (const theme of ["light", "dark"]) {
    test(`marketplace exact links and return state ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/visual-fixtures/collector-refinement?view=marketplace");
      await page.evaluate(
        (dark) => document.documentElement.classList.toggle("gv-dark", dark),
        theme === "dark",
      );
      const direct = page.getByRole("link", { name: "View LP on TCGplayer" });
      await expect(direct).toHaveAttribute("href", /Condition=Lightly\+Played/);
      await page.getByRole("button", { name: "TCGplayer · choose condition" })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByRole("link")).toHaveCount(5);
      await expect(page.getByRole("dialog")).toContainText(
        "Scarlet & Violet Promos · 173",
      );
      const artwork = page.getByRole("dialog").locator("img");
      await expect(artwork).toBeVisible();
      await expect.poll(() =>
        artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)
      ).toBeGreaterThan(0);
      await page.screenshot({
        path: `test-results/collector-marketplace-${width}-${theme}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      expect(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= window.innerWidth
        ),
      ).toBeTruthy();
    });
  }
}

test("selection reports unpriced coverage, reviews GVVIs and retains private trade draft", async ({ page }) => {
  await page.goto("/visual-fixtures/collector-refinement?view=workspace");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(2).check();
  await expect(
    page.getByText(
      "2 selected · 1 priced · 1 without a qualified raw reference",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review bulk intent" }).click();
  await expect(page.getByRole("dialog")).toContainText("GVVI-FIXTURE-000001");
  await expect(page.getByRole("dialog")).toContainText("GVVI-FIXTURE-000003");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByRole("button", { name: "Trade workspace", exact: true })
    .click();
  await page.getByLabel("Agreed value · USD").nth(0).fill("10.07");
  await page.getByLabel("Agreed value · USD").nth(1).fill("4.23");
  await page.getByRole("button", { name: "Save trade draft" }).click();
  await page.reload();
  await expect(page.getByRole("checkbox").nth(0)).toBeChecked();
  await page.screenshot({
    path: "test-results/collector-selection-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Trade workspace", exact: true })
    .click();
  await expect(page.getByLabel("Agreed value · USD").nth(0)).toHaveValue(
    "10.07",
  );
  await page.screenshot({
    path: "test-results/collector-workspace-mobile.png",
    fullPage: true,
  });
});

test("binder can move a card across pages with keyboard-accessible pocket controls", async ({ page }) => {
  await page.goto("/visual-fixtures/collector-refinement?view=binder");
  await page.getByRole("button", { name: "Pocket 1: Eevee", exact: true })
    .click();
  await page.getByRole("button", { name: "Next binder page" }).click();
  await page.getByRole("button", {
    name: "Pocket 11: Pikachu, move selected card here",
  }).click();
  await expect(
    page.getByRole("button", { name: "Pocket 11: Eevee", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/collector-binder-mobile.png",
    fullPage: true,
  });
});

test("reviewed add supports unknown cost, quantity and raw/slab choice", async ({ page }) => {
  await page.goto("/visual-fixtures/collector-refinement?view=add");
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await expect(page.getByText(/3 × Holofoil/)).toBeVisible();
  await page.getByLabel("Acquired on", {exact:true}).fill("2020-01-15");
  await expect(page.locator('input[name="acquired_at"]')).toHaveValue("2020-01-15T07:00:00.000Z");
  await expect(page.locator('input[name="acquired_utc_offset_minutes"]')).toHaveValue("-420");
  await page.getByText("Acquisition cost", { exact: false }).first().click();
  await expect(page.getByLabel("Total paid · USD (optional)")).toHaveValue("");
  await page.getByRole("checkbox", {
    name: "I reviewed the printing, copies and cost.",
  }).check();
  await page.getByRole("dialog").getByRole("button", {
    name: "Add to Vault",
    exact: true,
  }).click();
  await expect(page.getByText("3 exact copies saved.")).toBeVisible();
  await page.screenshot({ path: "test-results/collector-add-mobile-dark.png" });
  await page.getByRole("button", { name: /Add graded copy Verify a PSA/ })
    .click();
  await expect(page.getByLabel(/Certification number/).first()).toBeVisible();
});

for (const width of [384, 1280]) {
  for (const theme of ["light", "dark"]) {
    test(`card and add sheet render artwork ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/visual-fixtures/collector-refinement?view=card");
      await page.evaluate(
        (dark) => document.documentElement.classList.toggle("gv-dark", dark),
        theme === "dark",
      );
      const artwork = page.getByRole("img", {
        name: "Eevee 173, Scarlet & Violet Promos",
      });
      await expect.poll(() =>
        artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)
      ).toBeGreaterThan(0);
      const soldLink = page.getByRole("link", {
        name: "Search eBay sold listings",
      });
      const activeLink = page.getByRole("link", {
        name: "Search eBay active listings",
      });
      const sold = new URL((await soldLink.getAttribute("href"))!);
      const active = new URL((await activeLink.getAttribute("href"))!);
      expect(sold.origin).toBe("https://www.ebay.com");
      expect(sold.searchParams.get("_nkw")).toBe(
        "Eevee Scarlet & Violet Promos 173 Holofoil",
      );
      expect(sold.searchParams.get("LH_Sold")).toBe("1");
      expect(sold.searchParams.get("LH_Complete")).toBe("1");
      expect(active.searchParams.get("_nkw")).toBe(
        sold.searchParams.get("_nkw"),
      );
      expect(active.searchParams.has("LH_Sold")).toBeFalsy();
      expect(active.searchParams.has("LH_Complete")).toBeFalsy();
      await page.screenshot({
        path: `test-results/collector-card-${width}-${theme}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: /Add to Vault/ }).first().click();
      await page.getByRole("button", { name: "LP", exact: true }).click();
      await page.getByRole("button", { name: "Add one copy" }).click();
      await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue(
        "2",
      );
      await page.screenshot({
        path: `test-results/collector-add-${width}-${theme}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(page.getByRole("button", { name: /Add to Vault/ }).first())
        .toBeFocused();
      expect(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
      ).toBeTruthy();
    });
  }
}

test("marketplace loader uses exact identity and rejects a mismatched printing", async ({ page }) => {
  await page.goto("/visual-fixtures/collector-refinement?view=resolver");
  await expect(page.getByRole("link", { name: /View LP on TCGplayer/ }))
    .toHaveAttribute("href", /Condition=Lightly\+Played/);
  await page.route(
    "**/functions/v1/card-marketplace-links-v1",
    (route) =>
      route.fulfill({
        json: {
          link: {
            card_print_id: "a36f8d8a-353f-4cca-ba89-912eb7f10c3a",
            card_printing_id: "different-printing",
            conditions: [],
          },
        },
      }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "TCGplayer · choose condition" }),
  ).toBeDisabled();
  await expect(page.getByRole("link", { name: /View LP on TCGplayer/ }))
    .toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "No exact listing available",
  );
});
