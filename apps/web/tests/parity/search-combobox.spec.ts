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
  const input = page.locator("main").getByLabel("Search cards, sets, numbers, or Grookai ID", { exact: true });
  await expect(input).toBeEnabled();
  return input;
}

async function assertAria(page: Page) {
  const results = await new AxeBuilder({ page }).include('main form[action="/search"]')
    .withRules(["aria-allowed-attr", "aria-required-attr", "aria-required-children", "aria-required-parent", "aria-valid-attr-value"]).analyze();
  expect(results.violations).toEqual([]);
}

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
