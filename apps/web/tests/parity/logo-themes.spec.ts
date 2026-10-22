import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";
import AxeBuilder from "@axe-core/playwright";

// Classify the rendered emblem against its flat surface so color variants can
// be compared by silhouette, without freezing any seasonal palette in a golden.
function silhouette(png: PNG) {
  const background = [png.data[0], png.data[1], png.data[2]];
  return Array.from({ length: png.width * png.height }, (_, pixel) =>
    background.some((channel, c) => Math.abs(png.data[pixel * 4 + c] - channel) > 18),
  );
}

for (const width of [320, 390, 1440]) {
  test(`seasonal colors preserve the original logo at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/brand-preview", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "One logo. Every season." })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    let reference: boolean[] | undefined;
    let previous: Buffer | undefined;

    for (const name of ["Original", "Lime", "Autumn", "Halloween", "Winter", "Celebration"]) {
      const button = page.getByRole("button", { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      const emblem = page.getByRole("img", { name: `${name} grookai logo`, exact: true });
      // Compare the original mark independently of decorative avatar motion.
      const pixels = PNG.sync.read(await emblem.locator(".gv-brand-emblem").screenshot({
        path: testInfo.outputPath(`${name.toLowerCase()}-mark.png`),
        style: ".gv-brand-avatar { background: #101310 !important; border-color: transparent !important; } [data-seasonal-effects] { display: none !important; }",
      }));
      const outline = silhouette(pixels);
      expect(outline.filter(Boolean).length).toBeGreaterThan(500);
      if (reference) {
        const union = outline.filter((filled, i) => filled || reference![i]).length;
        const intersection = outline.filter((filled, i) => filled && reference![i]).length;
        expect(intersection / union).toBeGreaterThan(0.97);
        expect(pixels.data.equals(previous!)).toBe(false);
      } else {
        reference = outline;
      }
      previous = pixels.data;
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    }
    await page.screenshot({ path: testInfo.outputPath(`logo-themes-${width}.png`), fullPage: true });
    const lockup = page.locator(".gv-brand-lockup").filter({ visible: true }).first();
    await expect(lockup.locator(".gv-brand-emblem")).toHaveCSS("width", "64px");
    await expect(lockup.locator(".gv-brand-text")).toHaveCSS("font-size", "20px");
  });
}

test("Halloween and Winter avatars animate, pause, and honor reduced motion", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/brand-preview", { waitUntil: "networkidle" });
  for (const [name, movingSelector] of [["Halloween", ".gv-logo-spider-hang-one"], ["Winter", ".gv-logo-snowflake"]]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("button", { name, exact: true }).click();
    const avatar = page.getByRole("img", { name: `${name} grookai logo`, exact: true });
    await expect(avatar).toHaveCSS("overflow", "hidden");
    const moving = avatar.locator(movingSelector).first();
    const initial = await moving.evaluate((el) => getComputedStyle(el).transform);
    await expect.poll(() => moving.evaluate((el) => getComputedStyle(el).transform)).not.toBe(initial);
    await page.getByRole("button", { name: "Pause animation", exact: true }).click();
    expect(await avatar.evaluate((el) => el.getAnimations({ subtree: true }).every((animation) => animation.playState === "paused"))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${name.toLowerCase()}-avatar.png`), fullPage: true });
    await page.getByRole("button", { name: "Play animation", exact: true }).click();
    expect(await avatar.evaluate((el) => el.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"))).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => avatar.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.getByRole("button", { name: "Pause animation", exact: true })).toBeHidden();
  }
});

for (const width of [320, 390, 1440]) {
  test(`live header uses Halloween and bundled Roboto at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/brand-preview", { waitUntil: "networkidle" });
    const header = page.locator(".gv-site-header");
    const lockup = header.locator(".gv-brand-lockup").filter({ visible: true });
    await expect(lockup).toHaveCount(1);
    await expect(lockup.locator(".gv-brand-avatar")).toHaveAttribute("data-avatar-theme", "halloween");
    await expect(lockup.locator(".gv-brand-avatar")).toHaveCSS("width", "64px");
    await expect(lockup.locator(".gv-brand-text")).toHaveText("grookai");
    await expect(lockup.locator(".gv-brand-text")).toHaveCSS("font-weight", "900");
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => [...document.fonts].filter((font) => font.status === "loaded").map((font) => ({ family: font.family, weight: font.weight })));
    expect(fonts.some((font) => /roboto/i.test(font.family) && font.weight === "900")).toBe(true);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 11, 9)");
    await expect(page.locator("html")).toHaveAttribute("data-brand-accent", "#ff8a33");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--gv-primary").trim())).toBe("#ff8a33");
    const primaryAction = width >= 900 ? header.locator('[data-primary-action="scan"]') : page.locator('[data-mobile-parity-dock] [data-dock-label="Scan"]');
    await expect(primaryAction).toBeVisible();
    if (width >= 900) await expect(primaryAction).toHaveCSS("background-color", "rgb(255, 138, 51)");
    const avatar = lockup.locator(".gv-brand-avatar");
    await expect.poll(() => avatar.evaluate((el) => el.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"))).toBe(true);
    await header.getByRole("button", { name: "Pause logo animation", exact: true }).filter({ visible: true }).click();
    await expect.poll(() => avatar.evaluate((el) => el.getAnimations({ subtree: true }).every((animation) => animation.playState === "paused"))).toBe(true);
    await page.reload({ waitUntil: "networkidle" });
    await expect(header.getByRole("button", { name: "Play logo animation", exact: true }).filter({ visible: true })).toBeVisible();
    await header.getByRole("button", { name: "Use light mode", exact: true }).filter({ visible: true }).click();
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(244, 245, 237)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await header.getByRole("button", { name: "Use dark mode", exact: true }).filter({ visible: true }).click();
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(8, 11, 9)");
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(audit.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`halloween-header-${width}.png`), fullPage: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => avatar.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(header.getByRole("button", { name: "Play logo animation", exact: true }).filter({ visible: true })).toHaveCount(0);
  });
}

for (const width of [390, 1440]) {
  test(`public home retains search and navigation at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/", { waitUntil: "networkidle" });
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the exact card.");
    await expect(page.getByRole("link", { name: "Explore the catalog", exact: true })).toHaveAttribute("href", "/explore");
    await expect(page.locator(".gv-home-search").getByRole("combobox", { name: /Search cards/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(audit.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`halloween-home-${width}.png`), fullPage: true });
  });
}
