import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL || new URL(baseURL).hostname !== "127.0.0.1") throw new Error("Local verification only");
  await context.route("**/*", (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== new URL(baseURL).origin || !["GET", "HEAD", "OPTIONS"].includes(request.method())) return route.abort();
    return route.continue();
  });
});

test("Home opens the collector workspace and preserves search parameters", async ({ page }) => {
  await page.goto("/?q=Charizard&game=mtg&cards=GV-TEST", { waitUntil: "domcontentloaded" });
  const url = new URL(page.url());
  expect(url.pathname).toBe("/explore");
  expect(url.searchParams.get("q")).toBe("Charizard");
  expect(url.searchParams.get("game")).toBe("mtg");
  expect(url.searchParams.get("cards")).toBe("GV-TEST");
});

test("real Search has one task form, keeps exact query and exposes filters on demand", async ({ page }, testInfo) => {
  await page.goto("/explore?q=Gengar", { waitUntil: "domcontentloaded" });
  const input = page.getByRole("searchbox", { name: "Search cards, sets, numbers, or Grookai ID", exact: true });
  await expect(input).toHaveCount(1);
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();
  await expect(page.locator("header input[type=search]")).toHaveCount(0);
  const options = page.locator("details").filter({ has: page.locator("summary", { hasText: "Display options" }) });
  await expect(options).not.toHaveAttribute("open", "");
  await options.locator("summary").click();
  await expect(options.getByLabel("Image confidence filter")).toBeVisible();
  await options.locator("summary").click();
  const filters = page.locator("details").filter({ has: page.locator("summary", { hasText: /^\s*Filters/ }) });
  await expect(filters).toHaveCount(1);
  await expect(filters).not.toHaveAttribute("open", "");
  await filters.locator("summary").click();
  await expect(filters.locator("form")).toBeVisible();
  await filters.locator("summary").click();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.evaluate(() => innerWidth));
  await testInfo.attach("simplified-search", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await input.fill("Gengar 2000-2024 reverse holo");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("q"), { timeout: 30_000 }).toBe("Gengar 2000-2024 reverse holo");
});

test("real Sets keeps game selection and makes additional controls available without a hero dashboard", async ({ page }, testInfo) => {
  await page.goto("/sets", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Filter sets by game")).toBeEnabled();
  await expect(page.getByLabel("Filter sets by game")).toBeVisible();
  await expect(page.getByLabel("Search sets by name or code")).toBeVisible();
  const filters = page.locator(".gv-collector-set-filters");
  await expect(filters.getByLabel("Filter sets by type")).not.toBeVisible();
  await filters.locator("summary").click();
  await expect(filters.getByLabel("Filter sets by type")).toBeVisible();
  await expect(filters.getByRole("radiogroup", { name: "Set language scope" })).toBeVisible();
  const selected = filters.locator('[role="radio"][aria-checked="true"]');
  const colors = await selected.evaluate((button) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--gv-primary)";
    document.body.append(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();
    return { actual: getComputedStyle(button).backgroundColor, expected };
  });
  expect(colors.actual).toBe(colors.expected);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await testInfo.attach("simplified-sets-filters", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await filters.locator("summary").click();
  await page.getByLabel("Filter sets by game").selectOption("mtg");
  await expect.poll(() => new URL(page.url()).searchParams.get("game"), { timeout: 30_000 }).toBe("mtg");
});
