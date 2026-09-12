import { expect, test, type Locator, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { expectedCollectorImageCounts, installCollectorFixtureRoutes } from "./fixtureSetup";

const fixturePath = "/visual-fixtures/collector";
const primary = [
  ["Pulse", "/network"], ["Wall", "/wall"], ["Scan", "/scan"],
  ["Vault", "/vault"], ["Search", "/explore"],
] as const;
const secondary = [
  ["Sets", "/sets"], ["Dex", "/dex"], ["Compare", "/compare"],
  ["Binders", "/binders"], ["Messages", "/network/inbox"],
] as const;

test.beforeEach(async ({ context, baseURL }) => {
  await installCollectorFixtureRoutes(context, baseURL);
});

async function openFixture(page: Page, view: keyof typeof expectedCollectorImageCounts = "pulse") {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${fixturePath}?view=${view}`, { waitUntil: "networkidle" });
  expect(response?.status(), "Start the gated fixture dev server before this suite").toBe(200);
  await expect(page.locator("[data-collector-fixture-root]")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/gv-collector/);
  await expect(page.getByRole("heading", { name: "Pulse", exact: true })).toBeVisible();
  await expect(page.locator("main img")).toHaveCount(expectedCollectorImageCounts[view]);
  expect(errors).toEqual([]);
  return errors;
}

async function assertLinks(scope: Locator, links: ReadonlyArray<readonly [string, string]>) {
  for (const [name, href] of links) {
    await expect(scope.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
}

async function assertImage(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => {
    const img = element as HTMLImageElement;
    return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
  })).toBe(true);
  const result = await image.evaluate((element) => {
    const img = element as HTMLImageElement;
    const rect = img.getBoundingClientRect();
    return { fit: getComputedStyle(img).objectFit, width: rect.width, height: rect.height };
  });
  expect(result.fit).toBe("contain");
  expect(result.width).toBeGreaterThan(60);
  expect(result.height).toBeGreaterThan(80);
  // Rendered pixels avoid the tainted-canvas restriction on intercepted public URL images.
  const { data: pixels } = PNG.sync.read(await image.screenshot());
  const colors = new Set<string>();
  for (let offset = 0; offset < pixels.length; offset += 16) {
    if (pixels[offset + 3] > 0) colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
  }
  expect(colors.size, "Card artwork must contain actual nonblank rendered pixels").toBeGreaterThan(30);
}

async function assertImages(images: Locator, expected: number) {
  await expect(images).toHaveCount(expected);
  for (const image of await images.all()) await assertImage(image);
  await expect(images).toHaveCount(expected);
}

test("real shell retains all primary, secondary, account and Pulse Discover links", async ({ page }, testInfo) => {
  await openFixture(page);
  const phone = testInfo.project.name.startsWith("phone");
  const nav = phone ? page.locator("[data-mobile-parity-dock]") : page.locator("[data-desktop-primary-navigation]");
  await expect(nav).toBeVisible();
  await assertLinks(nav, primary);
  await expect(nav.getByRole("link")).toHaveCount(5);
  const tools = phone ? page.locator(".gv-collector-mobile-tools") : page.locator("[data-desktop-secondary-navigation]");
  if (phone) {
    await expect(page.locator(".gv-collector-mobile-menu")).toHaveAttribute("aria-busy", "false");
    await expect(tools).not.toBeVisible();
    await page.getByLabel("More navigation", { exact: true }).click();
  }
  await expect(tools).toBeVisible();
  await assertLinks(tools, secondary);
  if (phone) {
    await expect(tools.getByRole("link", { name: "Account", exact: true })).toHaveAttribute("href", "/account");
    await page.keyboard.press("Escape");
    await expect(tools).not.toBeVisible();
    await expect(page.getByLabel("More navigation", { exact: true })).toBeFocused();
  } else {
    await page.locator(".gv-desktop-account-menu summary").click();
    await assertLinks(page.locator(".gv-desktop-account-menu"), [
      ["Public profile", "/u/fixture-collector-a"], ["Account settings", "/account"], ["Support", "/support"],
    ]);
    await page.locator(".gv-desktop-account-menu summary").click();
  }
  const pulseNav = page.getByRole("navigation", { name: "Pulse sections" });
  await assertLinks(pulseNav, [["Cards", "/network"], ["Discover", "/network/discover"]]);
  await expect(pulseNav.getByRole("link", { name: "Cards", exact: true })).toHaveAttribute("aria-current", "page");
  await pulseNav.getByRole("link", { name: "Discover", exact: true }).focus();
  await expect(pulseNav.getByRole("link", { name: "Discover", exact: true })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Your collector space" })).not.toBeVisible();
  await page.locator("summary").filter({ hasText: "Your collector space" }).click();
  await assertLinks(page.getByRole("navigation", { name: "Your collector space" }), [
    ["My Wall", "/wall"], ["My Vault", "/vault"], ["Messages", "/network/inbox"],
  ]);
});

test("real Pulse cards retain visible identity, copy disclosure and signed-out contact routes", async ({ page }, testInfo) => {
  const errors = await openFixture(page);
  const feed = page.locator("[data-fixture-pulse]");
  await expect(feed.locator("[data-pulse-event-card]")).toHaveCount(2);
  await expect(feed.getByText("Printing: Holofoil", { exact: true }).first()).toBeVisible();
  await expect(feed.locator('a[href="/card/GV-FIXTURE-CHARIZARD-199"]').first()).toBeVisible();
  await expect(feed.locator('a[href="/u/fixture-collector-a"]').first()).toBeVisible();
  await feed.getByText("View copies (2)", { exact: true }).click();
  const groupedCopies = feed.locator("[data-pulse-event-card]").nth(1);
  await expect(groupedCopies.getByRole("link", { name: "Sign in to message", exact: true })).toHaveCount(2);
  for (const link of await groupedCopies.getByRole("link", { name: "Sign in to message", exact: true }).all()) {
    await expect(link).toHaveAttribute("href", "/login?next=%2Fnetwork");
  }
  await assertImages(feed.locator("img"), 2);
  await testInfo.attach("pulse", { body: await feed.screenshot(), contentType: "image/png" });
  await assertImages(page.locator("main img"), expectedCollectorImageCounts.pulse);
  await page.evaluate(() => window.scrollTo(0, 0));
  await testInfo.attach("full-pulse-integration", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  expect(errors).toEqual([]);
});

test("Discover stays inside Pulse and uses actual collector rows and follow login links", async ({ page }, testInfo) => {
  const errors = await openFixture(page, "discover");
  const nav = page.getByRole("navigation", { name: "Pulse sections" });
  await expect(nav.getByRole("link", { name: "Discover", exact: true })).toHaveAttribute("aria-current", "page");
  const collectors = page.locator("[data-fixture-collectors]");
  await expect(collectors.locator('a[href="/u/fixture-collector-a"]')).toBeVisible();
  await expect(collectors.locator('a[href="/u/fixture-collector-b"]')).toBeVisible();
  await expect(collectors.getByRole("link", { name: "Follow", exact: true })).toHaveCount(2);
  for (const link of await collectors.getByRole("link", { name: "Follow", exact: true }).all()) {
    await expect(link).toHaveAttribute("href", "/login?next=%2Fnetwork%2Fdiscover");
  }
  await testInfo.attach("discover", { body: await page.locator(".gv-network-page").screenshot(), contentType: "image/png" });
  expect(errors).toEqual([]);
});

test("real card grid has contained artwork, stable missing-art geometry and canonical links", async ({ page }, testInfo) => {
  await openFixture(page);
  const grid = page.locator("[data-fixture-card-grid]");
  await expect(grid.locator(".gv-collector-product")).toHaveCount(4);
  await assertImages(grid.locator("img"), 3);
  await expect(grid.getByText("Image unavailable", { exact: true })).toBeVisible();
  for (const id of ["CHARIZARD-199", "BLASTOISE-200", "VENUSAUR-198"]) {
    await expect(grid.locator(`a[href="/card/GV-FIXTURE-${id}"]`)).toHaveCount(2);
  }
  const stages = await grid.locator(".gv-visual-card-image").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(Math.max(...stages) - Math.min(...stages)).toBeLessThanOrEqual(2);
  await testInfo.attach("card-grid", { body: await grid.screenshot(), contentType: "image/png" });
});

test("real set and binder covers render provided art, honest fallbacks, progress and routes", async ({ page }, testInfo) => {
  await openFixture(page);
  const sets = page.locator("[data-fixture-sets]");
  const binders = page.locator("[data-fixture-binders]");
  await expect(sets.locator(".gv-collector-set-tile")).toHaveCount(3);
  await expect(binders.locator(".gv-collector-binder-tile")).toHaveCount(3);
  for (const scope of [sets, binders]) {
    await assertImages(scope.locator("img"), 2);
    await expect(scope.getByText("Cover artwork unavailable", { exact: true })).toBeVisible();
  }
  await expect(sets.locator('a[href="/sets/sv03.5"]')).toBeVisible();
  for (const id of ["personal", "shared", "no-cover"]) {
    await expect(binders.locator(`a[href="/binders/fixture-${id}"]`)).toBeVisible();
  }
  const progress = binders.getByRole("progressbar");
  await expect(progress).toHaveCount(3);
  await expect(progress.nth(0)).toHaveAttribute("aria-valuenow", "42");
  await expect(progress.nth(0)).toHaveAttribute("aria-valuemax", "165");
  await expect(progress.nth(2)).toHaveAttribute("aria-valuenow", "0");
  await expect(progress.nth(2)).toHaveAttribute("aria-valuemax", "0");
  await testInfo.attach("sets", { body: await sets.screenshot(), contentType: "image/png" });
  await testInfo.attach("binders", { body: await binders.screenshot(), contentType: "image/png" });
});

test("actual catalog discovery composes real featured cards, set tiles and discovery links", async ({ page }, testInfo) => {
  const errors = await openFixture(page);
  const discovery = page.locator("[data-fixture-discovery]");
  await expect(discovery.locator("[data-feature-position]")).toHaveCount(3);
  await expect(discovery.locator(".gv-collector-discovery-product")).toHaveCount(3);
  await expect(discovery.locator(".gv-collector-set-tile")).toHaveCount(3);
  await expect(discovery.getByRole("button", { name: "Add to compare", exact: true })).toHaveCount(4);
  await expect(discovery.getByRole("link", { name: "Browse sets", exact: true })).toHaveAttribute("href", "/sets");
  await expect(discovery.getByRole("link", { name: "All sets", exact: true })).toHaveAttribute("href", "/sets");
  await expect(discovery.locator(".gv-collector-discovery-pokemon-link")).toHaveCount(8);
  await expect(discovery.locator(".gv-collector-discovery-family")).toHaveCount(6);
  await expect(discovery.getByRole("link", { name: "Pikachu", exact: true })).toHaveAttribute("href", "/explore?q=Pikachu&view=thumb");
  await expect(discovery.getByRole("link", { name: "Stamped cards", exact: true })).not.toBeVisible();
  await discovery.locator("summary").filter({ hasText: "Explore stamps and variants" }).click();
  await expect(discovery.getByRole("link", { name: "Stamped cards", exact: true })).toHaveAttribute("href", "/explore?identity=stamped");
  await expect(discovery.getByText("Cover artwork unavailable", { exact: true })).toBeVisible();
  await assertImages(discovery.locator("img"), 8);
  await testInfo.attach("catalog-discovery", { body: await discovery.screenshot(), contentType: "image/png" });
  expect(errors).toEqual([]);
});

test("phone and desktop theme, content geometry and long labels remain readable", async ({ page }, testInfo) => {
  await openFixture(page, "discover");
  const dark = testInfo.project.name.endsWith("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", dark ? "dark" : "light");
  const overflow = await page.locator("main").evaluate((main) => {
    const issues: string[] = [];
    for (const element of main.querySelectorAll<HTMLElement>("section, article, h1, h2, h3, p, [data-collector-card-facts]")) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.left < -1 || rect.right > window.innerWidth + 1) issues.push(`outside viewport: ${element.tagName} ${element.className}`);
      const style = getComputedStyle(element);
      if (style.overflowX === "visible" && element.scrollWidth > element.clientWidth + 2) issues.push(`overflow: ${element.tagName} ${element.className}`);
    }
    return issues;
  });
  expect(overflow).toEqual([]);
  const regions = page.locator("main > .gv-page-container > section");
  const boxes = await regions.evaluateAll((elements) => elements.map((element) => {
    const { top, bottom } = element.getBoundingClientRect();
    return { top, bottom };
  }));
  for (let index = 1; index < boxes.length; index++) expect(boxes[index].top).toBeGreaterThanOrEqual(boxes[index - 1].bottom - 1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await testInfo.attach("first-viewport", { body: await page.screenshot(), contentType: "image/png" });
  await assertImages(page.locator("main img"), expectedCollectorImageCounts.discover);
  await page.evaluate(() => window.scrollTo(0, 0));
  await testInfo.attach("full-component-integration", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  const toggle = page.getByRole("button", { name: dark ? "Use light mode" : "Use dark mode", exact: true }).filter({ visible: true }).first();
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", dark ? "light" : "dark");
});

test("empty Pulse keeps Discover available and invalid fixture views are unavailable", async ({ page }) => {
  await openFixture(page, "empty");
  await expect(page.getByRole("heading", { name: "No cards available right now" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Pulse sections" }).getByRole("link", { name: "Discover" })).toHaveAttribute("href", "/network/discover");
  const response = await page.goto(`${fixturePath}?view=not-a-fixture`);
  // Next may stream notFound as HTTP 200, but must never render the fixture.
  expect([200, 404]).toContain(response?.status());
  await expect(page.locator("[data-collector-fixture-root]")).toHaveCount(0);
});
