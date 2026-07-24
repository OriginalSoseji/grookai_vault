import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import geometry from "./canonical.geometry.json";
import { openParityScenario, parityScenarios } from "./helpers";

for (const scenario of parityScenarios) {
  test(`${scenario} has no serious or critical accessibility violations`, async ({
    page,
  }) => {
    await openParityScenario(page, scenario);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    );

    expect(
      blocking,
      blocking
        .map(
          (violation) =>
            `${violation.id}: ${violation.help}\n${violation.nodes
              .map((node) => node.target.join(" > "))
              .join("\n")}`,
        )
        .join("\n\n"),
    ).toEqual([]);
  });

  test(`${scenario} does not overflow horizontally`, async ({ page }) => {
    await openParityScenario(page, scenario);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("primary dock order, destinations, selection, and targets match the contract", async ({
  page,
}) => {
  await openParityScenario(page, "search-discovery");
  const items = page.locator("[data-mobile-parity-dock] [data-dock-label]");

  await expect(items).toHaveCount(5);
  await expect(items).toHaveText([
    /Pulse/,
    /Wall/,
    /Scan/,
    /Vault/,
    /Search/,
  ]);

  const labels = await items.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-dock-label")),
  );
  expect(labels).toEqual(["Pulse", "Wall", "Scan", "Vault", "Search"]);

  const hrefs = await items.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href")),
  );
  expect(hrefs).toEqual([
    "/network",
    "/wall",
    "/scan",
    "/vault",
    "/explore",
  ]);

  await expect(items.filter({ hasText: "Search" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(items.filter({ hasText: "Scan" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  for (const item of await items.all()) {
    const box = await item.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("fullscreen Scan suppresses the primary dock", async ({ page }) => {
  await openParityScenario(page, "scan-ready");
  await expect(page.locator("[data-mobile-parity-dock]")).toHaveCount(0);
});

test("Vault exposes the gated Binder collection-goal destination", async ({
  page,
}) => {
  await openParityScenario(page, "vault-populated");

  const binders = page.locator("[data-parity-vault-binders]");
  await expect(binders).toHaveCount(1);
  await expect(binders).toBeVisible();
  await expect(binders).toHaveAttribute("href", "/binders");
  await expect(binders).toHaveAttribute(
    "data-parity-feature-gate",
    "binders",
  );
  await expect(binders).toHaveAccessibleName(
    /Binders\s+What you’re building/,
  );

  const box = await binders.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(
    geometry.binder_action_panel.min_height,
  );
});

test("canonical shell geometry stays within the frozen manifest", async ({
  page,
}) => {
  await openParityScenario(page, "vault-populated");

  expect(page.viewportSize()).toEqual(geometry.viewport);

  const appBar = await page.locator("[data-parity-app-bar]").boundingBox();
  expect(appBar?.height ?? 0).toBeCloseTo(geometry.app_bar.height, 0);

  const dock = page.locator("[data-mobile-parity-dock]");
  const dockBox = await dock.boundingBox();
  expect(dockBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
    geometry.dock.max_width,
  );
  const dockRadius = await dock.evaluate(
    (node) => Number.parseFloat(getComputedStyle(node).borderRadius),
  );
  expect(dockRadius).toBe(geometry.dock.radius);

  const cardArt = page.locator("[data-parity-card-art]").first();
  const artBox = await cardArt.boundingBox();
  const renderedAspect = (artBox?.width ?? 0) / (artBox?.height ?? 1);
  expect(renderedAspect).toBeCloseTo(geometry.card_art.aspect_ratio, 2);
  const artRadius = await cardArt.evaluate(
    (node) => Number.parseFloat(getComputedStyle(node).borderRadius),
  );
  expect(artRadius).toBe(geometry.card_art.radius);

  const binderPanel = page.locator("[data-parity-vault-binders]");
  const binderRadius = await binderPanel.evaluate(
    (node) => Number.parseFloat(getComputedStyle(node).borderRadius),
  );
  expect(binderRadius).toBe(geometry.binder_action_panel.radius);

  const binderIcon = page.locator("[data-parity-vault-binders-icon]");
  const binderIconBox = await binderIcon.boundingBox();
  expect(binderIconBox?.width ?? 0).toBe(
    geometry.binder_action_panel.icon_size,
  );
  expect(binderIconBox?.height ?? 0).toBe(
    geometry.binder_action_panel.icon_size,
  );
});

test("keyboard focus remains visible", async ({ page }) => {
  await openParityScenario(page, "search-discovery");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      style: style.outlineStyle,
      width: style.outlineWidth,
    };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).not.toBe("0px");
});
