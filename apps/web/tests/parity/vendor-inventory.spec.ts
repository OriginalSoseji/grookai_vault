import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const owner = "00000000-0000-4000-8000-000000000001";
const user = { id: owner, aud: "authenticated", email: "vendor@example.test", created_at: "2026-10-07T00:00:00Z" };
const copies = [
  { instanceId: "copy-one", gvviId: "GVVI-INVENTORY-000001", gv_id: "GV-PK-SAMPLE-001", name: "Pikachu · first printing", set_code: "SAMPLE", number: "1", printing: "Normal", condition: "NM", intent: "hold", askingAmount: 12.34, askingCurrency: "CAD" },
  { instanceId: "copy-two", gvviId: "GVVI-INVENTORY-000002", gv_id: "GV-PK-SAMPLE-001", name: "Pikachu · first printing", set_code: "SAMPLE", number: "1", printing: "Normal", condition: "PSA 10", intent: "sell", askingAmount: null, askingCurrency: null },
  { instanceId: "copy-three", gvviId: "GVVI-INVENTORY-000003", name: "Sample card with a long name that should wrap on a phone", set_code: "SAMPLE", number: "20", printing: "Printing unassigned", condition: "LP", intent: "trade", askingAmount: 0, askingCurrency: "USD" },
];

async function fixture(page: Page, options: { delayMore?: boolean; foreignMore?: boolean } = {}) {
  const reads: URLSearchParams[] = [];
  let failNextRead = false;
  let releaseMore = () => {};
  const held = new Promise<void>(resolve => { releaseMore = resolve; });
  await page.route("http://127.0.0.1:54321/**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/user") ? user : {} }));
  await page.route("**/api/sales/desk?**", async route => {
    const params = new URL(route.request().url()).searchParams;
    reads.push(params);
    expect(route.request().method()).toBe("GET");
    expect(params.get("action")).toBe("stock");
    expect(params.get("view")).toBe("inventory");
    if (failNextRead) { failNextRead = false; return route.fulfill({ status: 503, json: { error: "Unavailable" } }); }
    if (params.has("copyOffset")) {
      if (options.delayMore) await held;
      return route.fulfill({ json: { owner: options.foreignMore ? "other-owner" : owner, cards: copies.slice(1), next: null } });
    }
    const filtered = params.get("price") === "unpriced" ? copies.filter(copy => copy.askingAmount == null) : params.get("price") === "priced" ? copies.filter(copy => copy.askingAmount != null) : copies.slice(0, 2);
    return route.fulfill({ json: { owner, cards: filtered, next: params.get("price") === "all" ? { offset: 0, copyOffset: 48 } : null } });
  });
  return { reads, releaseMore, failNext: () => { failNextRead = true; } };
}

for (const width of [384, 768, 1440]) test(`owner inventory fits ${width}px and preserves exact copies and currencies`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const proof = await fixture(page);
  await page.goto("/visual-fixtures/vendor-workspace?view=inventory");
  const inventory = page.getByRole("region", { name: "Inventory", exact: true });
  await expect(inventory.getByText("CAD 12.34", { exact: true })).toBeVisible();
  await expect(inventory.getByRole("link", { name: /^Edit copy/ })).toHaveCount(2);
  await expect(inventory.getByText("PSA 10 · For sale")).toBeVisible();
  await inventory.getByRole("button", { name: "Load more copies" }).click();
  await expect(inventory.getByRole("link", { name: /^Edit copy/ })).toHaveCount(3);
  await expect(inventory.getByText("USD 0.00", { exact: true })).toBeVisible();
  expect(proof.reads.at(-1)?.get("copyOffset")).toBe("48");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`inventory-${width}.png`), fullPage: true });
  if (width === 384) {
    const result = await new AxeBuilder({ page }).include('[data-vendor-workspace-fixture]').analyze();
    expect(result.violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
    await page.evaluate(() => { document.documentElement.classList.remove("dark", "gv-dark"); document.documentElement.classList.add("light"); });
    const light = await new AxeBuilder({ page }).include('[data-vendor-workspace-fixture]').analyze();
    expect(light.violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
    await page.screenshot({ path: info.outputPath("inventory-light.png"), fullPage: true });
  }
});

test("inventory filters the owner read and carries the search into copy editing", async ({ page }) => {
  const proof = await fixture(page);
  await page.goto("/visual-fixtures/vendor-workspace?view=inventory");
  await expect(page.getByText("CAD 12.34", { exact: true })).toBeVisible();
  await page.getByLabel("Find your copies").fill("Pikachu");
  await page.getByRole("combobox", { name: "Asking price", exact: true }).selectOption("unpriced");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("link", { name: /^Edit copy/ })).toHaveCount(1);
  const href = await page.getByRole("link", { name: /^Edit copy/ }).getAttribute("href");
  const context = new URL(href!, "http://fixture.invalid").searchParams;
  expect(context.get("workspace")).toBe("vendor");
  expect(context.get("inventoryQuery")).toBe("Pikachu");
  expect(context.get("inventoryPrice")).toBe("unpriced");
  expect(proof.reads.at(-1)?.get("price")).toBe("unpriced");
});

test("an account change discards a late inventory page and earlier copies", async ({ page }) => {
  const proof = await fixture(page, { delayMore: true });
  await page.goto("/visual-fixtures/vendor-workspace?view=inventory");
  await page.getByRole("button", { name: "Load more copies" }).click();
  await page.getByRole("button", { name: "Fixture sign out" }).click();
  proof.releaseMore();
  await expect(page.getByRole("heading", { name: "Inventory closed" })).toBeVisible();
  await expect(page.getByText("CAD 12.34", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Edit copy/ })).toHaveCount(0);
});

test("a changed response owner closes inventory even before a session event", async ({ page }) => {
  await fixture(page, { foreignMore: true });
  await page.goto("/visual-fixtures/vendor-workspace?view=inventory");
  await page.getByRole("button", { name: "Load more copies" }).click();
  await expect(page.getByRole("heading", { name: "Inventory closed" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Edit copy/ })).toHaveCount(0);
});

test("retrying a failed refresh requests the first page, not the next page", async ({ page }) => {
  const proof = await fixture(page);
  await page.goto("/visual-fixtures/vendor-workspace?view=inventory");
  await expect(page.getByText("CAD 12.34", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
  proof.failNext();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  const inventory = page.getByRole("region", { name: "Inventory", exact: true });
  await expect(inventory.getByRole("alert")).toContainText("could not refresh");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(inventory.getByRole("alert")).toHaveCount(0);
  expect(proof.reads.at(-1)?.get("copyOffset")).toBeNull();
  await expect(page.getByRole("link", { name: /^Edit copy/ })).toHaveCount(2);
});

test("vendor navigation protects unsaved Store details and only leaves after discard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page);
  let writes = 0;
  await page.route("**/api/stores/owner", route => {
    if (route.request().method() !== "GET") writes++;
    return route.fulfill({ json: { store: null, inventory: null, sections: [],
      capabilities: { store_app: true, store_web: false }, rollout: { app_enabled: true, web_enabled: false, custom_enabled: false },
      profile: { slug: "sample-owner", display_name: "Sample owner", public_profile_enabled: false, vault_sharing_enabled: false } } });
  });
  await page.goto("/visual-fixtures/vendor-workspace?view=store");
  await page.getByRole("button", { name: "Store details", exact: true }).click();
  await page.getByLabel("Store name", { exact: true }).fill("Keep my unsaved store");
  const inventory = page.getByRole("navigation", { name: "Vendor workspace" }).filter({ visible: true }).getByRole("link", { name: "Inventory", exact: true });
  page.once("dialog", dialog => dialog.dismiss());
  await inventory.click();
  await expect(page).toHaveURL(/view=store/);
  await expect(page.getByLabel("Store name", { exact: true })).toHaveValue("Keep my unsaved store");
  await page.route("**/account/store/inventory", route => route.fulfill({ contentType: "text/html", body: "<h1>Inventory destination</h1>" }));
  page.once("dialog", dialog => dialog.accept());
  await inventory.click();
  await expect(page.getByRole("heading", { name: "Inventory destination" })).toBeVisible();
  expect(writes).toBe(0);
});

test("sealed tab uses the existing owner read and clears its copies on sign-out", async ({ page }) => {
  await fixture(page);
  let reads = 0;
  await page.route("**/rest/v1/rpc/get_owned_sealed_inventory_v1", route => {
    reads++;
    expect(route.request().postDataJSON().p_owner_id).toBe(owner);
    return route.fulfill({ json: [{ object_kind: "sealed", instance_id: "00000000-0000-4000-8000-000000000011",
      owner_id: owner, gv_vi_id: "GVVI-SEALED-000001", sealed_product_variant_id: "00000000-0000-4000-8000-000000000012",
      game_key: "pokemon", name: "Sample sealed booster box", package_form: "booster_box", language_code: "en",
      region_code: null, edition: null, wave: null, seal_state: "factory_sealed", package_condition: "undamaged",
      intent: "hold", section_ids: [], reference_market_price: null, owned_market_price: null, market_currency: null,
      asking_price_amount: 120, asking_price_currency: "CAD", image_storage_bucket: null, image_object_path: null }] });
  });
  await page.goto("/visual-fixtures/vendor-workspace?view=inventory");
  await page.getByRole("navigation", { name: "Inventory type" }).getByRole("link", { name: "Sealed products" }).click();
  const sealed = page.getByRole("region", { name: "Owned sealed products" });
  await expect(sealed.getByRole("link", { name: "Sample sealed booster box - booster box - EN", exact: true })).toBeVisible();
  expect(reads).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: /^Edit copy/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Fixture sign out" }).click();
  await expect(page.getByRole("heading", { name: "Inventory closed" })).toBeVisible();
  await expect(sealed).toHaveCount(0);
});
