import { expect, test, type Page } from "@playwright/test";

const ids = ["GV-PK-BASE-1", "GV-PK-BASE-2", "GV-PK-BASE-3", "GV-PK-BASE-4"];
const fixture = "/visual-fixtures/compare-dock";
const selected = (count: number, extra = "") => `${fixture}?q=bulbasaur&cards=${ids.slice(0, count).join(",")}${extra}`;
const tray = (page: Page) => page.getByRole("region", { name: "Selected cards for comparison" });

async function assertReachable(page: Page) {
  for (const control of await tray(page).locator("a,button").all()) {
    await expect(control).toBeInViewport({ ratio: 1 });
    await control.click({ trial: true, timeout: 2000 });
  }
  const bounds = await tray(page).boundingBox();
  const navigation = page.locator("[data-mobile-parity-dock]");
  const dock = await navigation.count() ? await navigation.boundingBox() : null;
  if (dock && bounds) expect(bounds.y + bounds.height).toBeLessThanOrEqual(dock.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

// Capture real pointer/keyboard activation without loading a DB-backed workspace.
// The fixture proves routing intent and reachability, not catalog readback.
async function capturePrimary(page: Page) {
  const primary = tray(page).getByRole("link", { name: /Open Compare|Add 1 more card/ });
  await primary.evaluate((element) => element.addEventListener("click", (event) => {
    event.preventDefault();
    element.setAttribute("data-activated-href", element.getAttribute("href") ?? "");
  }));
  return primary;
}

for (const width of [320, 360, 430, 834, 899, 900, 1440]) {
  test(`Compare controls at ${width}px with one through four cards`, async ({ page, browserName }, testInfo) => {
    await page.setViewportSize({ width, height: width < 900 ? 932 : 1000 });
    for (let count = 1; count <= 4; count++) {
      await page.goto(selected(count));
      await expect(tray(page)).toBeVisible();
      await assertReachable(page);
      const primary = await capturePrimary(page);
      await primary.click();
      const expected = count === 1 ? `${fixture}?adding=1` : `/compare?${new URLSearchParams({ cards: ids.slice(0, count).join(",") })}`;
      await expect(primary).toHaveAttribute("data-activated-href", expected);
      await primary.evaluate((element) => element.removeAttribute("data-activated-href"));
      await tray(page).getByRole("link", { name: "Clear", exact: true }).focus();
      // Check Tab order in Chromium and focused-link activation in WebKit.
      // Actual Safari keyboard preferences remain a device acceptance check.
      if (browserName === "webkit") await primary.focus();
      else await page.keyboard.press("Tab");
      await expect(primary).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(primary).toHaveAttribute("data-activated-href", expected);
      if (count === 4) await page.screenshot({ path: testInfo.outputPath(`compare-${width}.png`) });
      await tray(page).getByRole("button", { name: `Remove ${ids[0]} from compare`, exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get("cards")).toBe(count === 1 ? null : ids.slice(1, count).join(","));
      if (count > 1) await tray(page).getByRole("link", { name: "Clear", exact: true }).click();
      await expect(tray(page)).toHaveCount(0);
      expect(new URL(page.url()).searchParams.get("q")).toBe("bulbasaur");
    }
  });
}

test("Dock resizing, breakpoint changes and unmount release occupied space", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(selected(4));
  await assertReachable(page);
  // Emulate extra safe-area space and larger navigation text using the real dock.
  await page.locator("[data-mobile-parity-dock]").evaluate((element) => {
    (element as HTMLElement).style.paddingBottom = "38px";
    for (const label of element.querySelectorAll<HTMLElement>("[data-dock-label]")) label.style.fontSize = "22px";
  });
  await expect.poll(async () => {
    const region = await tray(page).boundingBox();
    const dock = await page.locator("[data-mobile-parity-dock]").boundingBox();
    return Boolean(region && dock && region.y + region.height <= dock.y + 1);
  }).toBe(true);
  await assertReachable(page);
  await page.setViewportSize({ width: 900, height: 800 });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--gv-bottom-dock-height"))).toBe("0px");
  await assertReachable(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await assertReachable(page);
  // Client navigation exercises cleanup, rather than a full-document reload.
  await page.getByRole("link", { name: "Hide navigation" }).click();
  await expect(page.locator("[data-mobile-parity-dock]")).toHaveCount(0);
  await assertReachable(page);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--gv-bottom-dock-height"))).toBe("");
});

test("Legacy shell dock also leaves Compare controls reachable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(selected(4, "&shell=legacy"));
  await assertReachable(page);
});
