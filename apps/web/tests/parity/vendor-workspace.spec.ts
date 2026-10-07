import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const owner = "00000000-0000-4000-8000-000000000001";
const user = { id: owner, aud: "authenticated", email: "vendor@example.test", created_at: "2026-10-07T00:00:00Z" };
const receipt = { id: "fixture-receipt", number: "GV-FIXTURE-001", createdAt: new Date().toISOString(),
  customerName: "Sample collector", method: "Cash", items: [{ description: "Sample card", quantity: 1, unitMinor: 1200 }],
  subtotalMinor: 1200, taxMinor: 0, totalMinor: 1200 };
async function fixture(page: Page, delayedBook = false) {
  const actions: string[] = [];
  let releaseBook = () => {};
  const heldBook = new Promise<void>(resolve => { releaseBook = resolve; });
  await page.route("http://127.0.0.1:54321/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith("/user") ? user : {} });
  });
  await page.route("**/api/sales/desk?**", async route => {
    const action = new URL(route.request().url()).searchParams.get("action") ?? "session";
    actions.push(action);
    expect(route.request().method()).toBe("GET");
    if (action === "session") return route.fulfill({ json: { owner, available: true, trades: true, payments: true } });
    if (action === "book") {
      if (delayedBook) await heldBook;
      return route.fulfill({ json: { book: { storeName: "Sample store", customers: [], receipts: [{ receipt }] } } });
    }
    return route.fulfill({ json: { cards: [], next: null } });
  });
  return { actions, releaseBook };
}

for (const width of [384, 768, 1440]) {
  test(`workspace reports fit ${width}px and use receipt reads only`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const proof = await fixture(page);
    await page.goto("/visual-fixtures/vendor-workspace?view=reports");
    await expect(page.getByRole("link", { name: "GV-FIXTURE-001" })).toBeVisible();
    expect(new Set(proof.actions)).toEqual(new Set(["book"]));
    const nav = page.getByRole("navigation", { name: "Vendor workspace" }).filter({ visible: true });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(nav.getByRole("link", { name: "Reports", exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole("link", { name: "Inventory", exact: true })).toHaveAttribute("href", "/account/store?view=inventory");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`reports-${width}.png`), fullPage: true });
    if (width === 384) {
      const result = await new AxeBuilder({ page }).include('[data-vendor-workspace-fixture]').analyze();
      expect(result.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''))).toEqual([]);
    }
  });
}

test("an account change hides a late reports response", async ({ page }) => {
  const proof = await fixture(page, true);
  await page.goto("/visual-fixtures/vendor-workspace?view=reports");
  await expect(page.getByText("Loading saved sales…")).toBeVisible();
  await page.getByRole("button", { name: "Fixture sign out" }).click();
  proof.releaseBook();
  await expect(page.getByRole("heading", { name: "Reports closed" })).toBeVisible();
  await expect(page.getByText("Sample collector")).toHaveCount(0);
});

test("the phone deal action stays above the vendor dock", async ({ page }, info) => {
  await fixture(page);
  await page.goto('/visual-fixtures/vendor-workspace');
  const deal = page.getByRole('link', { name: /View deal/ });
  await expect(deal).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Vendor workspace' }).filter({ visible: true });
  const dealBox = await deal.boundingBox(), navBox = await nav.boundingBox();
  expect(dealBox!.y + dealBox!.height).toBeLessThan(navBox!.y);
  await deal.click();
  await expect(page.getByRole('heading', { name: 'Your deal', exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath('desk-phone.png'), fullPage: true });
});

test("workspace navigation waits for an already requested draft write", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await fixture(page);
  await page.goto("/visual-fixtures/vendor-workspace");
  await expect(page.getByRole("heading", { name: "Sales desk" })).toBeVisible();
  await expect(page.getByLabel("Store name", { exact: true })).toHaveValue("Sample store");
  await page.getByText("Store, tax & receipt note", { exact: true }).click();
  await page.evaluate(() => {
    const request = navigator.locks.request.bind(navigator.locks);
    let release: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    Object.defineProperty(window, '__releaseDraft', { value: () => release(), configurable: true });
    navigator.locks.request = ((...args: Parameters<typeof request>) => held.then(() => request(...args))) as typeof request;
  });
  await page.getByLabel("Store name", { exact: true }).fill("Saved before leaving");
  await page.route("**/account/store/reports**", route => route.fulfill({ contentType: "text/html", body: "<h1>Fixture destination</h1>" }));
  await page.getByRole("navigation", { name: "Vendor workspace" }).filter({ visible: true }).getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page).toHaveURL(/visual-fixtures\/vendor-workspace/);
  await page.evaluate(() => (window as unknown as { __releaseDraft: () => void }).__releaseDraft());
  await expect(page).toHaveURL(/account\/store\/reports/);
  const saved = await page.evaluate(() => Object.values(localStorage).some(value => value.includes('Saved before leaving')));
  expect(saved).toBe(true);
});
