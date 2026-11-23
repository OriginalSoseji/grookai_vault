import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const rows = [1, 2].map((index) => ({
  id: `fixture-${index}`, gv_id: `GV-PK-BASE-${index}`, name: `Pikachu ${index}`,
  set_name: "Fixture set", number: String(index), rarity: "Common", image_url: null,
  selected_printing_gv_id: `GV-PK-BASE-${index}-RH`, finish_label: "Reverse Holo",
}));

async function openSearch(page: Page, response = { ok: true, rows }, waitForRelease?: Promise<void>) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return route.abort();
    if (url.pathname === "/api/search/suggestions") {
      if (waitForRelease) await waitForRelease;
      return route.fulfill({ json: response });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { ok: true, rows: [], canonical: [], provisional: [], pagination: { total_count: 0, has_more: false, next_offset: null } } });
    return route.continue();
  });
  await page.goto("/explore?q=x&cards=GV-PK-BASE-3");
  const input = page.locator("main").getByLabel("Search cards, sets, numbers, or grookai ID", { exact: true });
  await expect(input).toBeEnabled();
  return input;
}

async function assertAria(page: Page) {
  const results = await new AxeBuilder({ page }).include('main form[action="/search"]')
    .withRules(["aria-allowed-attr", "aria-required-attr", "aria-required-children", "aria-required-parent", "aria-valid-attr-value"]).analyze();
  expect(results.violations).toEqual([]);
}

async function mockPlayableSearch(page: Page) {
  const requests: URL[] = [];
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return route.abort();
    if (url.pathname === "/api/resolver/search") requests.push(url);
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: {
      ok: true, rows: [], canonical: [], provisional: [],
      pagination: { total_count: 0, has_more: false, next_offset: null },
    } });
    return route.continue();
  });
  return requests;
}

test("the bare playable filter opens search instead of the featured catalog", async ({ page }) => {
  const requests = await mockPlayableSearch(page);
  await page.goto("/explore?playable=1");
  await expect(page.getByRole("link", { name: "Remove Playable filter", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A good find starts here." })).toHaveCount(0);
  await expect.poll(() => requests.some(url => url.searchParams.get("playable") === "1")).toBe(true);
  await page.getByRole("link", { name: "Remove Playable filter", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("heading", { name: "A good find starts here." })).toBeVisible();
});

test("applying and clearing filters preserves or removes playable scope deliberately", async ({ page }) => {
  const requests = await mockPlayableSearch(page);
  await page.goto("/explore?q=full-art&playable=1&cards=GV-PK-BASE-3&view=list&lang=en");
  const filters = page.locator("details").filter({ has: page.getByRole("button", { name: "Apply smart filters", exact: true, includeHidden: true }) });
  await filters.locator("summary").click();
  await filters.getByRole("textbox", { name: "From year" }).fill("2020");
  await filters.getByRole("button", { name: "Apply smart filters", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("year_min")).toBe("2020");
  let target = new URL(page.url());
  expect(target.searchParams.get("playable")).toBe("1");
  expect(target.searchParams.get("q")).toBe("full-art");
  expect(target.searchParams.get("cards")).toBe("GV-PK-BASE-3");
  expect(target.searchParams.get("view")).toBe("list");
  expect(target.searchParams.get("lang")).toBe("en");
  await expect.poll(() => requests.some(url => url.searchParams.get("playable") === "1" && url.searchParams.get("year_min") === "2020")).toBe(true);
  await page.getByRole("link", { name: "Clear all", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has("q")).toBe(false);
  target = new URL(page.url());
  for (const key of ["playable", "q", "year_min"]) expect(target.searchParams.has(key)).toBe(false);
  expect(target.searchParams.get("cards")).toBe("GV-PK-BASE-3");
  expect(target.searchParams.get("view")).toBe("list");
  expect(target.searchParams.get("lang")).toBe("en");
  await expect(page.getByRole("link", { name: "Remove Playable filter", exact: true })).toHaveCount(0);
});

test("catalog filters provide a playable entry that retains comparison cards", async ({ page }, testInfo) => {
  const requests = await mockPlayableSearch(page);
  await page.goto("/explore?cards=GV-PK-BASE-3");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const link = page.getByRole("link", { name: "Pokémon playables", exact: true });
  await expect(link).toBeVisible();
  const target = new URL(await link.getAttribute("href") ?? "", page.url());
  expect(target.searchParams.get("playable")).toBe("1");
  expect(target.searchParams.get("cards")).toBe("GV-PK-BASE-3");
  for (const width of [384, 1280]) {
    await page.setViewportSize({ width, height: 824 });
    await page.goto("/explore?cards=GV-PK-BASE-3");
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    for (const colorScheme of ["dark", "light"] as const) {
      const themeToggle = page.getByRole("button", { name: colorScheme === "light" ? "Use light mode" : "Use dark mode", exact: true });
      if (await themeToggle.count()) await themeToggle.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
      await expect(link).toBeVisible();
      await link.click({ trial: true });
      expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`catalog-playables-${width}-${colorScheme}.png`) });
    }
  }
  const accessibility = await new AxeBuilder({ page }).include("#collector-rarity-filters")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations.filter(item => item.impact === "serious" || item.impact === "critical")).toEqual([]);
  await link.click();
  await expect(page.getByRole("link", { name: "Remove Playable filter", exact: true })).toBeVisible();
  await expect.poll(() => requests.some(url => url.searchParams.get("playable") === "1")).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("actual search exposes valid expanded semantics and keyboard printing selection", async ({ page }, testInfo) => {
  const input = await openSearch(page);
  await assertAria(page);
  await expect(input).toHaveAttribute("role", "combobox");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await input.fill("Pikachu");
  const options = page.getByRole("listbox", { name: "Card suggestions" }).getByRole("option");
  await expect(options).toHaveCount(2);
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("status").filter({ hasText: "2 suggestions available" })).toHaveCount(1);
  await expect(page.getByRole("listbox")).toHaveAttribute("id", (await input.getAttribute("aria-controls"))!);
  await assertAria(page);
  await input.press("ArrowDown");
  await expect(input).toBeFocused();
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
  await input.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(input).toHaveAttribute("aria-activedescendant", (await options.nth(1).getAttribute("id"))!);
  await page.screenshot({ path: testInfo.outputPath("keyboard-suggestions.png") });
  const destination = page.waitForRequest(request => new URL(request.url()).pathname === "/card/GV-PK-BASE-2");
  await page.route("**/card/**", route => route.abort());
  await input.press("Enter");
  const target = new URL((await destination).url());
  expect(target.searchParams.get("printing")).toBe("GV-PK-BASE-2-RH");
  expect(target.searchParams.get("cards")).toBe("GV-PK-BASE-3");
});

test("Escape stays dismissed through a delayed response; arrows reopen and Tab dismisses", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const input = await openSearch(page, { ok: true, rows }, gate);
  const request = page.waitForRequest("**/api/search/suggestions?**");
  await input.fill("Pikachu");
  await request;
  await expect(input).toHaveAttribute("aria-busy", "true");
  await input.press("Escape");
  const response = page.waitForResponse("**/api/search/suggestions?**");
  release();
  await response;
  await expect(input).toHaveAttribute("aria-busy", "false");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await input.press("ArrowDown");
  await expect(page.getByRole("listbox", { name: "Card suggestions" }).getByRole("option")).toHaveCount(2);
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await input.press("Escape");
  await expect(input).toHaveValue("Pikachu");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(input).not.toHaveAttribute("aria-activedescendant");
  await input.press("ArrowDown");
  await input.press("Tab");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("empty suggestions do not claim an expanded listbox", async ({ page }) => {
  const input = await openSearch(page, { ok: true, rows: [] });
  const response = page.waitForResponse("**/api/search/suggestions?**");
  await input.fill("Unmatched fixture");
  await response;
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(input).not.toHaveAttribute("aria-activedescendant");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await assertAria(page);
});

test("pointer selection preserves the printing and comparison context", async ({ page }) => {
  const input = await openSearch(page);
  await input.fill("Pikachu");
  const first = page.getByRole("listbox", { name: "Card suggestions" }).getByRole("option").first();
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute("tabindex", "-1");
  const destination = page.waitForRequest(request => new URL(request.url()).pathname === "/card/GV-PK-BASE-1");
  await page.route("**/card/**", route => route.abort());
  await first.click();
  const target = new URL((await destination).url());
  expect(target.searchParams.get("printing")).toBe("GV-PK-BASE-1-RH");
  expect(target.searchParams.get("cards")).toBe("GV-PK-BASE-3");
});

test("search recovers from one incomplete resolver timeout", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return route.abort();
    if (url.pathname === "/api/resolver/search") {
      requests.push(url.toString());
      if (requests.length === 1) return route.fulfill({ status: 503, json: {
        ok: false, sort_degraded_reason: "resolver_timeout",
        error: "Search timed out before the complete matching set could be checked. Please narrow your search or try again.",
      } });
      return route.fulfill({ json: { ok: true, rows, canonical: rows, provisional: [], pagination: { total_count: 2, has_more: false, next_offset: null } } });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { ok: true, rows: [] } });
    return route.continue();
  });
  await page.goto("/explore?q=Pikachu&finish=reverse");
  await expect(page.getByText("Pikachu 1", { exact: true }).first()).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toBe(requests[0]);
  expect(new URL(requests[0]).searchParams.get("finish")).toBe("reverse");
  await expect(page.getByText("Search timed out before the complete matching set could be checked.", { exact: false })).toHaveCount(0);
});

test("a degraded search is shown as a timeout instead of no matches", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return route.abort();
    if (url.pathname === "/api/resolver/search") {
      return route.fulfill({ json: {
        ok: true, rows: [], provisional: [], sort_degraded_reason: "resolver_timeout",
        meta: { resolverState: "NO_MATCH" }, source: "web_ranked_resolver_v2_degraded_timeout",
      } });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { ok: true, rows: [] } });
    return route.continue();
  });
  await page.goto("/explore?q=Pikachu");
  await expect(page.getByText("Search timed out before results could be checked. Please try again.")).toBeVisible();
  await expect(page.getByText("No card match yet")).toHaveCount(0);
  await expect(page.getByText("No results yet")).toHaveCount(0);
});

test("retry search repeats the same filtered request after both timeout attempts fail", async ({ page }) => {
  const requests: string[] = [];
  let allowSuccess = false;
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return route.abort();
    if (url.pathname === "/api/resolver/search") {
      requests.push(url.toString());
      if (!allowSuccess) return route.fulfill({ status: 503, json: {
        ok: false, sort_degraded_reason: "resolver_timeout",
        error: "Search timed out before the complete matching set could be checked. Please narrow your search or try again.",
      } });
      return route.fulfill({ json: { ok: true, rows, canonical: rows, provisional: [], pagination: { total_count: 2, has_more: false, next_offset: null } } });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { ok: true, rows: [] } });
    return route.continue();
  });
  await page.goto("/explore?q=Pikachu&finish=reverse&year_min=2022&year_max=2024");
  const retry = page.getByRole("button", { name: "Retry search" });
  await expect(retry).toBeVisible();
  expect(requests.length).toBeGreaterThanOrEqual(2);
  await expect(page.getByText("No card match yet")).toHaveCount(0);
  const previousCount = requests.length;
  const failedRequest = requests[requests.length - 1];
  allowSuccess = true;
  await retry.click();
  await expect(page.getByText("Pikachu 1", { exact: true }).first()).toBeVisible();
  expect(requests.length).toBeGreaterThan(previousCount);
  expect(requests[requests.length - 1]).toBe(failedRequest);
  const retried = new URL(requests[requests.length - 1]);
  expect(retried.searchParams.get("finish")).toBe("reverse");
  expect(retried.searchParams.get("year_min")).toBe("2022");
  expect(retried.searchParams.get("year_max")).toBe("2024");
  await expect(retry).toHaveCount(0);
});
