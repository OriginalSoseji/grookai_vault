import {test, expect, type BrowserContext} from "@playwright/test";
import fs from "node:fs";

let cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
test.beforeAll(async ({browser}, testInfo) => {
  const file = process.env.VENDOR_WORKSPACE_USER_FILE;
  if (!file) throw Error("Prepare a local vendor fixture and set VENDOR_WORKSPACE_USER_FILE.");
  const user = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(user.email).toMatch(/^vendor-home-.*@fixture\.invalid$/);
  const page = await browser.newPage({baseURL: String(testInfo.project.use.baseURL)});
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  await page.goto("/login?next=%2Faccount%2Fvendor");
  expect(runtimeErrors).toEqual([]);
  await page.getByRole("textbox", {name: "Email", exact: true}).fill(user.email);
  await page.getByRole("textbox", {name: "Password", exact: true}).fill(user.password);
  await page.getByRole("button", {name: "Sign in", exact: true}).click();
  await expect(page).toHaveURL(/\/account\/vendor$/);
  cookies = await page.context().cookies();
  await page.close();
});
test.beforeEach(async ({context}) => {await context.addCookies(cookies);});

const production = {id: "local-connection", environment: "production", status: "connected", locationId: "local-location", autoSync: true};
const commerce = {id: production.id, autoEnroll: true, sellOnSquare: true, pending: 2, reviews: 0};
const workspace = (connection = production, preferences = commerce) => ({catalogEnabled: true, connections: [connection], commerce: {enabled: true, connections: [preferences]}});

test("phone and desktop navigation stays readable, selected, and out of label output", async ({page}) => {
  await page.route("**/api/square", route => route.fulfill({json: {catalogEnabled: true, connections: []}}));
  for (const [width, theme] of [[320, "dark"], [375, "light"], [1366, "dark"]] as const) {
    await page.setViewportSize({width, height: 900});
    await page.emulateMedia({colorScheme: theme});
    await page.goto("/account/vendor");
    const changeTheme = page.getByRole("button", {name: `Use ${theme} mode`, exact: true});
    if (await changeTheme.isVisible()) await changeTheme.click();
    await expect(page.getByRole("button", {name: `Use ${theme === "dark" ? "light" : "dark"} mode`, exact: true})).toBeVisible();
    await expect(page.getByRole("heading", {name: "Vendor Mode", exact: true})).toBeVisible();
    const nav = page.getByRole("navigation", {name: "Vendor workspace"});
    for (const name of ["Inventory", "Pricing", "Labels", "Square"]) await expect(nav.getByRole("link", {name, exact: true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("link", {name: "Add card", exact: true})).toHaveAttribute("href", "/explore");
    if (process.env.VENDOR_WORKSPACE_ARTIFACTS_DIR) await page.screenshot({path: `${process.env.VENDOR_WORKSPACE_ARTIFACTS_DIR}/vendor-home-${width}-${theme}.png`, fullPage: true});
  }
  await page.goto("/account/pricing");
  await expect(page.getByRole("navigation", {name: "Vendor workspace"}).getByRole("link", {name: "Pricing", exact: true})).toHaveAttribute("aria-current", "page");
  await page.goto("/vault/labels");
  const labelsNav = page.getByRole("navigation", {name: "Vendor workspace"});
  await expect(labelsNav.getByRole("link", {name: "Labels", exact: true})).toHaveAttribute("aria-current", "page");
  await page.emulateMedia({media: "print"});
  await expect(labelsNav).toBeHidden();
});

test("a sandbox link cannot claim live selling readiness", async ({page}) => {
  await page.route("**/api/square", route => route.fulfill({json: workspace({...production, environment: "sandbox"})}));
  await page.goto("/account/vendor");
  await expect(page.getByText("Connect Square", {exact: true})).toBeVisible();
  await expect(page.getByText("Automatic Square sync is enabled", {exact: true})).toHaveCount(0);
});

test("a paused server cannot claim live selling readiness", async ({page}) => {
  await page.route("**/api/square", route => route.fulfill({json: {...workspace(), catalogEnabled: false}}));
  await page.goto("/account/vendor");
  await expect(page.getByText("Finish Square setup", {exact: true})).toBeVisible();
});

test("confirmed settings still distinguish pending cards from ready checkout", async ({page}) => {
  await page.route("**/api/square", route => route.fulfill({json: workspace()}));
  await page.goto("/account/vendor");
  await expect(page.getByText("Automatic Square sync is enabled", {exact: true})).toBeVisible();
  await expect(page.getByText("2 pending · 0 need review. Check each card’s confirmed sync before checkout.", {exact: true})).toBeVisible();
});

test("review warnings and failed status reads stay visible and recoverable", async ({page}) => {
  let fail = true;
  await page.route("**/api/square", route => route.fulfill(fail ? {status: 503, json: {error: "local fixture failure"}} : {json: workspace(production, {...commerce, reviews: 1})}));
  await page.goto("/account/vendor");
  await expect(page.getByText("Square status is unavailable", {exact: true})).toBeVisible();
  fail = false;
  await page.getByRole("button", {name: "Check again", exact: true}).click();
  await expect(page.getByText("Square needs attention", {exact: true})).toBeVisible();
});
