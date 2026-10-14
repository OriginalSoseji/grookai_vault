import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const scenarios = [
  "search-vault-bridge",
  "search-result-hierarchy",
  "card-detail-hierarchy",
  "card-pricing-error",
  "card-pricing-locked",
  "vault-loaded",
  "vault-empty",
  "vault-private",
  "vault-partial-error",
  "vault-duplicate-copy",
  "vault-offline",
  "vault-exact-copy",
  "pulse-event",
  "pulse-empty",
  "pulse-partial-error",
  "social-loading",
  "wall-collection",
  "wall-private",
  "profile-collector",
  "profile-blocked",
  "profile-deleted",
  "desktop-shell-wide",
  "desktop-shell-narrow",
  "desktop-shell-signed-out",
  "desktop-shell-unread",
  "desktop-shell-wall-unavailable",
  "desktop-shell-pushed-route",
  "binders-library",
  "binder-invite-unavailable",
  "messages-thread",
  "messages-empty",
  "login-scan-continuity",
  "import-exact-review",
  "information-page",
  "error-state",
  "private-state",
] as const;

async function openScenario(page: import("@playwright/test").Page, scenario: typeof scenarios[number]) {
  const response = await page.goto(`/visual-fixtures/release-convergence/${scenario}`, {
    waitUntil: "networkidle",
  });
  expect(response?.ok()).toBe(true);
  await expect(page.locator("[data-release-convergence-root]")).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);
}

for (const scenario of scenarios) {
  test(`${scenario} is accessible and does not overflow`, async ({ page }) => {
    if (scenario.startsWith("desktop-shell-")) {
      await page.setViewportSize({ width: 1024, height: 900 });
    }
    await openScenario(page, scenario);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.filter((result) => result.impact === "critical" || result.impact === "serious")).toEqual([]);
  });
}

test("desktop shell preserves the five primary pillars and separates tools", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScenario(page, "desktop-shell-wide");

  await expect(page.locator("[data-desktop-primary-navigation] a")).toHaveText([
    "Pulse",
    "Wall",
    "Scan",
    "Vault",
    "Search",
  ]);
  await expect(page.locator("[data-desktop-secondary-navigation] a")).toHaveText([
    "Sets",
    "Dex",
    "Compare (2)",
    "Binders",
    "Messages",
  ]);
  await expect(page.getByRole("link", { name: "Vault", exact: true })).toHaveAttribute("aria-current", "page");
});

test("desktop signed-out shell hides private tools and exposes Login", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await openScenario(page, "desktop-shell-signed-out");

  await expect(page.getByRole("link", { name: "Login", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Binders", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Messages", exact: true })).toHaveCount(0);
  await expect(page.locator("summary", { hasText: "Account" })).toHaveCount(0);
});

test("desktop unread and Wall availability states remain explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await openScenario(page, "desktop-shell-unread");
  await expect(page.getByLabel("7 unread")).toHaveCount(2);

  await openScenario(page, "desktop-shell-wall-unavailable");
  await expect(page.getByText("Wall status unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wall", exact: true })).toHaveAttribute("aria-current", "page");
});

test("desktop pushed routes preserve parent context and active ownership pillar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScenario(page, "desktop-shell-pushed-route");

  await expect(page.locator("[data-desktop-route-context]")).toContainText("Binder workspace");
  await expect(page.getByRole("link", { name: "Back to Binders" })).toHaveAttribute("href", "/binders");
  await expect(page.getByRole("link", { name: "Vault", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Binders", exact: true })).toHaveAttribute("aria-current", "page");
});

test("Binder library keeps goals, collaboration role, and progress distinct", async ({ page }) => {
  await openScenario(page, "binders-library");
  await expect(page.getByRole("main").getByRole("heading", { name: "Binders", exact: true })).toBeVisible();
  await expect(page.getByText("owner · species", { exact: true })).toBeVisible();
  await expect(page.getByText("18 of 32 card prints", { exact: true })).toBeVisible();
  await expect(page.getByText("2 members", { exact: true })).toBeVisible();
});

test("expired Binder invitation exposes no private token or backend detail", async ({ page }) => {
  await openScenario(page, "binder-invite-unavailable");
  await expect(page.getByText("Invitation unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "My Binders" })).toHaveAttribute("href", "/binders");
  await expect(page.getByText(/inviteToken|supabase|postgres/i)).toHaveCount(0);
});

test("Messages preserve exact card and collector context", async ({ page }) => {
  await openScenario(page, "messages-thread");
  await expect(page.locator("[data-card-message-thread]")).toHaveCount(1);
  await expect(page.getByText("Pikachu — Reverse Holo", { exact: true })).toBeVisible();
  await expect(page.getByText("Scarlet & Violet 151 • #025", { exact: true })).toBeVisible();
  await expect(page.getByText("With Fixture Collector", { exact: true })).toBeVisible();
});

test("empty Messages keeps a collector-facing recovery path", async ({ page }) => {
  await openScenario(page, "messages-empty");
  await expect(page.getByText("No active messages", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse collectors" })).toHaveAttribute("href", "/network");
});

test("signed-out Scan continuity names the destination", async ({ page }) => {
  await openScenario(page, "login-scan-continuity");
  await expect(page.getByRole("heading", { name: "Sign in to Scan" })).toBeVisible();
  await expect(page.getByText("continue directly to the card scanner", { exact: false })).toBeVisible();
});

test("Vault import separates exact matches from ambiguous rows", async ({ page }) => {
  await openScenario(page, "import-exact-review");
  await expect(page.getByText("Exact card matched", { exact: true })).toBeVisible();
  await expect(page.getByText("2 possible exact cards — not imported", { exact: true })).toBeVisible();
});

test("information routes share one readable dark-mode template", async ({ page }) => {
  await openScenario(page, "information-page");
  await expect(page.getByRole("heading", { name: "Support", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Information links" })).toBeVisible();
});

test("desktop account menu supports keyboard focus without exposing private links early", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await openScenario(page, "desktop-shell-wide");

  const accountSummary = page.locator("summary", { hasText: "Account" });
  await accountSummary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Public profile", exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Public profile", exact: true })).toBeFocused();
});

test("desktop shell begins at the canonical 900px boundary", async ({ page }) => {
  await page.setViewportSize({ width: 899, height: 900 });
  await openScenario(page, "desktop-shell-narrow");
  await expect(page.locator("[data-desktop-application-shell]")).toBeHidden();

  await page.setViewportSize({ width: 900, height: 900 });
  await expect(page.locator("[data-desktop-application-shell]")).toBeVisible();
});

test("Search card keeps identity context and bridges to exact Vault actions", async ({ page }) => {
  await openScenario(page, "search-vault-bridge");

  await expect(page.getByText("Reverse Holo", { exact: true })).toBeVisible();
  await expect(page.getByText("Scarlet & Violet 151 · #025", { exact: true })).toBeVisible();
  const vaultAction = page.getByRole("link", { name: /Choose a version of Pikachu to add to your Vault/ });
  await expect(vaultAction).toHaveAttribute("href", "/card/GV-FIXTURE-PIKACHU#vault-actions");

  const cardArt = page.getByText("Stable 5:7 card artwork").locator("..");
  const box = await cardArt.boundingBox();
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(5 / 7, 2);
});

test("Search result hierarchy keeps version, price, action, and evidence distinct", async ({ page }) => {
  await openScenario(page, "search-result-hierarchy");

  await expect(page.getByText("Scarlet & Violet 151 • #025 • Common", { exact: true })).toBeVisible();
  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$3.42", { exact: true })).toBeVisible();

  const evidence = page.getByText("Why this result", { exact: true });
  await expect(evidence).toBeVisible();
  await expect(page.getByText("Exact name and reverse-holo finish match", { exact: true })).toBeHidden();
  await evidence.click();
  await expect(page.getByText("Exact name and reverse-holo finish match", { exact: true })).toBeVisible();
});

test("Card detail hierarchy puts the collection action before expanded context", async ({ page }) => {
  await openScenario(page, "card-detail-hierarchy");

  await expect(page.locator("[data-mobile-pushed-route-header]")).toBeVisible();
  await expect(page.getByRole("link", { name: "Results" })).toHaveAttribute(
    "href",
    "/explore?q=Pikachu&finish=reverse",
  );
  await expect(page.locator("[data-mobile-parity-dock]")).toHaveCount(0);
  const action = page.locator("#vault-actions");
  const versionContext = page.getByText("Why this version matters +", { exact: true });
  const [actionBox, contextBox] = await Promise.all([action.boundingBox(), versionContext.boundingBox()]);
  expect(actionBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(contextBox?.y ?? Number.NEGATIVE_INFINITY);
  await expect(page.getByText("Grookai ID GV-FIXTURE-PIKACHU", { exact: true })).toBeHidden();
});

test("Card pricing keeps the market summary primary and evidence disclosed", async ({ page }) => {
  await openScenario(page, "card-detail-hierarchy");

  await expect(page.getByText("$3.42", { exact: true })).toBeVisible();
  await expect(page.getByText("TCGPlayer Market", { exact: true })).toBeVisible();
  await expect(page.getByText("reverse holo printing", { exact: false })).toBeVisible();
  await expect(page.getByText("Lowest exact-printing eBay active ask", { exact: false })).toBeHidden();

  const evidence = page.locator("[data-market-evidence-disclosure] summary");
  await evidence.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Lowest exact-printing eBay active ask", { exact: false })).toBeVisible();
  await expect(page.getByText("Asking-price evidence, not a sale or market close.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "View Market History" })).toHaveAttribute(
    "href",
    "/card/GV-FIXTURE-PIKACHU/market",
  );
});

test("Card pricing exposes an actionable failure and recovers on retry", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/card-pricing?**", async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.fulfill({ status: 503, body: "unavailable" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        pricingRecords: [{
          pricing_scope: "card_printing",
          card_print_id: "fixture-card-print-pikachu",
          card_printing_id: "fixture-printing-reverse",
          printing_gv_id: "GV-PRINT-FIXTURE-PIKACHU-REVERSE",
          finish_key: "reverse_holo",
          status: "available",
          currency: "USD",
          market_close: 3.42,
          source_name: "tcgplayer",
          source_label: "TCGPlayer Market",
          observed_at: "2026-10-12T18:15:00.000Z",
          published_at: "2026-10-12T18:20:00.000Z",
          freshness: "fresh",
          is_from_price: false,
          eligible_printing_count: 1,
          provenance_id: "fixture-tcgplayer-pikachu-reverse",
          primary_price: 3.42,
          primary_source: "tcgplayer_market",
          display_label: "TCGPlayer Market",
          pricing_basis: "tcgplayer_market_exact",
        }],
        marketIntelligenceRecords: [],
      }),
    });
  });

  await openScenario(page, "card-pricing-error");
  await expect(page.getByRole("status")).toContainText("Pricing couldn’t refresh");
  const retry = page.getByRole("button", { name: "Retry Pricing" });
  expect((await retry.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await retry.click();
  await expect(page.getByText("$3.42", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("Signed-out card pricing has a clear full-size sign-in action", async ({ page }) => {
  await openScenario(page, "card-pricing-locked");
  await expect(page.getByText("Sign in to view pricing", { exact: true })).toBeVisible();
  const signIn = page.getByRole("link", { name: "Sign in", exact: true });
  await expect(signIn).toHaveAttribute("href", "/login?next=%2Fcard%2FGV-FIXTURE-PIKACHU");
  expect((await signIn.boundingBox())?.height).toBeGreaterThanOrEqual(44);
});

test("Card detail Add to Vault keeps version choice, action, and success feedback together", async ({ page }) => {
  await openScenario(page, "card-detail-hierarchy");

  const flow = page.locator("[data-add-to-vault-flow]");
  await expect(flow.getByText("1. Choose version", { exact: true })).toBeVisible();
  await expect(flow.locator("[data-selected-printing='fixture-printing-reverse']")).toBeVisible();

  await flow.getByRole("button", { name: "Normal", exact: true }).click();
  await expect(flow.locator("[data-selected-printing='fixture-printing-normal']")).toBeVisible();
  await expect(flow.getByText("Variant Image Pending", { exact: true })).toBeVisible();
  await expect(flow.locator("input[name='card_printing_id']")).toHaveValue("fixture-printing-normal");

  await flow.getByRole("button", { name: "Add to Vault", exact: true }).click();
  await expect(flow.getByRole("status")).toContainText("Added to Vault");
  await expect(flow.getByRole("link", { name: "View exact copy" })).toHaveAttribute(
    "href",
    "/vault/gvvi/GV-VI-FIXTURE-PIKACHU-NEW",
  );
});

test("Card detail keeps graded copies secondary and reveals a verified two-step flow", async ({ page }) => {
  await page.route("**/api/slabs/verify/psa", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        grader: "PSA",
        cert_number: "12345678",
        verified: true,
        grade: "10",
        title: "2023 Pokemon Pikachu 025",
        parser_status: "verified",
      }),
    });
  });
  await openScenario(page, "card-detail-hierarchy");

  const flow = page.locator("[data-add-slab-flow]");
  await expect(flow.getByRole("button", { name: /Add graded copy/ })).toHaveAttribute("aria-expanded", "false");
  await expect(flow.getByLabel("PSA grade")).toBeHidden();

  await flow.getByRole("button", { name: /Add graded copy/ }).click();
  await expect(flow.getByText("1. Verify certification", { exact: true })).toBeVisible();
  await expect(flow.getByText("2. Confirm and add", { exact: true })).toBeHidden();

  await flow.getByLabel("Certification number", { exact: true }).fill("12345678");
  await flow.getByLabel("Confirm certification number", { exact: true }).fill("87654321");
  await flow.getByRole("button", { name: "Verify PSA certification", exact: true }).click();
  await expect(flow.getByRole("alert")).toContainText("Certification numbers must match exactly");

  await flow.getByLabel("Confirm certification number", { exact: true }).fill("12345678");
  await flow.getByRole("button", { name: "Verify PSA certification", exact: true }).click();

  await expect(flow.getByRole("status")).toContainText("PSA verified");
  await expect(flow.getByText("2. Confirm and add", { exact: true })).toBeVisible();
  const addButton = flow.getByRole("button", { name: "Add graded copy to Vault", exact: true });
  await expect(addButton).toBeDisabled();
  await flow.getByLabel(/I own this slab/).check();
  await expect(addButton).toBeEnabled();

  const expandedResults = await new AxeBuilder({ page })
    .include("[data-add-slab-flow]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    expandedResults.violations.filter((result) => result.impact === "critical" || result.impact === "serious"),
  ).toEqual([]);
  await page.addStyleTag({
    content: ".gv-skip-link, [data-mobile-pushed-route-header] { display: none !important; }",
  });
  await expect(flow).toHaveScreenshot("p0-card-detail-slab-expanded-mobile.png");

  await addButton.click();

  await expect(flow.getByText("Graded copy added", { exact: true })).toBeVisible();
  await expect(flow.getByRole("link", { name: "View exact copy" })).toHaveAttribute(
    "href",
    "/vault/gvvi/GV-VI-FIXTURE-PIKACHU-PSA10",
  );
});

test("Card detail keeps compare and sharing in one secondary disclosure", async ({ page }) => {
  await openScenario(page, "card-detail-hierarchy");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });

  const utilities = page.locator("[data-card-utility-actions]");
  const summary = utilities.getByText("More card actions", { exact: true });
  await expect(summary).toBeVisible();
  await expect(utilities.getByRole("button", { name: "Add to compare" })).toBeHidden();
  await expect(utilities.getByRole("button", { name: "Copy card link" })).toBeHidden();

  await summary.click();
  const compareButton = utilities.getByRole("button", { name: "Add to compare" });
  const shareButton = utilities.getByRole("button", { name: "Copy card link" });
  await expect(compareButton).toBeVisible();
  await expect(shareButton).toBeVisible();
  const [compareBox, shareBox] = await Promise.all([compareButton.boundingBox(), shareButton.boundingBox()]);
  expect(compareBox?.height).toBeGreaterThanOrEqual(44);
  expect(shareBox?.height).toBeGreaterThanOrEqual(44);

  const expandedResults = await new AxeBuilder({ page })
    .include("[data-card-utility-actions]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    expandedResults.violations.filter((result) => result.impact === "critical" || result.impact === "serious"),
  ).toEqual([]);

  await shareButton.click();
  await expect(utilities.getByRole("button", { name: "Link copied" })).toBeVisible();
  await compareButton.click();
  await expect(page).toHaveURL(/cards=GV-FIXTURE-PIKACHU/);
  await expect(utilities.getByRole("button", { name: "Remove from compare" })).toBeVisible();
});

for (const viewport of [
  { width: 320, height: 740, name: "320px phone" },
  { width: 384, height: 824, name: "384px Samsung" },
  { width: 412, height: 915, name: "412px phone" },
  { width: 1440, height: 1000, name: "desktop" },
] as const) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`Core journeys fit ${viewport.name} in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      for (const scenario of [
        "search-result-hierarchy",
        "card-detail-hierarchy",
        "vault-loaded",
        "vault-exact-copy",
      ] as const) {
        await openScenario(page, scenario);
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${scenario} overflow at ${viewport.name}/${colorScheme}`).toBeLessThanOrEqual(0);
      }
    });
  }
}

test("Long card identity content wraps without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openScenario(page, "card-detail-hierarchy");
  await page.locator("h1").evaluate((heading) => {
    heading.textContent = "Pikachu With An Intentionally Very Long Collector-Facing Variant Name";
  });
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("Vault families keep exact finish context visible without collapsing mixed copies", async ({ page }) => {
  await openScenario(page, "vault-loaded");

  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2 copies • Mixed finishes", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("GV-VI-FIXTURE-PIKACHU-RH", { exact: false })).toBeHidden();
});

test("Duplicate family reveals each exact copy and keeps evidence disclosed", async ({ page }) => {
  await openScenario(page, "vault-duplicate-copy");

  await expect(page.getByText("NM • Holofoil • Raw", { exact: true })).toBeVisible();
  await expect(page.getByText("LP • Reverse Holo • Raw", { exact: true })).toBeVisible();
  const evidence = page.getByText("Copy evidence", { exact: true }).first();
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-CHARIZARD-NORMAL", { exact: true })).toBeHidden();
  await evidence.click();
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-CHARIZARD-NORMAL", { exact: true })).toBeVisible();
});

test("Exact-copy hierarchy shows version before provenance", async ({ page }) => {
  await openScenario(page, "vault-exact-copy");

  await expect(page.locator("[data-mobile-pushed-route-header]")).toBeVisible();
  await expect(page.getByRole("link", { name: "Vault", exact: true })).toHaveAttribute(
    "href",
    "/vault?view=duplicates&page=2",
  );
  await expect(page.locator("[data-mobile-parity-dock]")).toHaveCount(0);
  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Exact copy details").getByText("NM", { exact: true })).toBeVisible();
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-PIKACHU-RH", { exact: true })).toBeHidden();
});

test("Exact-copy editing puts required details before optional controls", async ({ page }) => {
  await openScenario(page, "vault-exact-copy");

  const settings = page.locator("[data-vault-copy-settings]");
  const pricing = page.locator("[data-vault-copy-pricing]");
  const [settingsBox, pricingBox] = await Promise.all([settings.boundingBox(), pricing.boundingBox()]);
  expect(settingsBox?.y).toBeLessThan(pricingBox?.y ?? Number.POSITIVE_INFINITY);

  await expect(page.getByLabel("Intent")).toHaveValue("hold");
  await expect(page.getByLabel("Condition")).toHaveValue("NM");
  await expect(page.getByLabel("Primary image")).toBeHidden();
  await expect(page.getByRole("button", { name: "Remove from vault" })).toBeHidden();

  await page.getByText("Image preference", { exact: true }).click();
  await expect(page.getByLabel("Primary image")).toBeVisible();

  const pricingMode = page.getByLabel("Mode");
  await expect(page.getByRole("button", { name: "Save pricing" })).toBeDisabled();
  await pricingMode.selectOption("asking");
  await page.getByLabel("Amount").fill("52.40");
  await expect(page.getByRole("button", { name: "Save pricing" })).toBeEnabled();

  await page.getByText("Remove this copy", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove from vault" })).toBeVisible();
});

test("Partial Vault failure preserves loaded ownership context", async ({ page }) => {
  await openScenario(page, "vault-partial-error");
  await expect(page.getByText("Your cards are still here", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pikachu", exact: true })).toBeVisible();
  await expect(page.getByText("Reverse Holo", { exact: true }).first()).toBeVisible();
});

test("Pulse separates collector activity from exact card identity", async ({ page }) => {
  await openScenario(page, "pulse-event");

  await expect(page.getByText("Fixture Collector", { exact: true })).toBeVisible();
  await expect(page.getByText(/marked a copy for trade/i)).toBeVisible();
  await expect(page.getByText("Illustration Rare", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NM", { exact: true })).toBeVisible();
  await expect(page.getByText("Printing: Reverse Holo", { exact: true })).toBeVisible();
  await expect(page.getByText("Card ID: GV-FIXTURE-PIKACHU-IR", { exact: true })).toBeHidden();
});

test("Wall collection display keeps version context primary and provenance disclosed", async ({ page }) => {
  await openScenario(page, "wall-collection");

  await expect(page.locator("[data-wall-collection-card]")).toHaveCount(1);
  await expect(page.getByText("Illustration Rare", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Raw copy", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View exact copy" })).toHaveAttribute("href", "/gvvi/GV-VI-FIXTURE-PIKACHU-IR-NM");
  await expect(page.getByText("Exact copy ID: GV-VI-FIXTURE-PIKACHU-IR-NM", { exact: true })).toBeHidden();
});

test("Collector profile keeps relationship actions separate from collection cards", async ({ page }) => {
  await openScenario(page, "profile-collector");

  await expect(page.locator("[data-collector-profile-header]")).toHaveCount(1);
  await expect(page.getByText("24 followers", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
  await expect(page.locator("[data-wall-collection-card]")).toHaveCount(1);
});

test("social degraded states are explicit and do not expose backend errors", async ({ page }) => {
  for (const [scenario, title] of [
    ["pulse-empty", "You are caught up"],
    ["pulse-partial-error", "Some activity is unavailable"],
    ["wall-private", "This Wall is private"],
    ["profile-blocked", "This collector is unavailable"],
    ["profile-deleted", "Collector profile not found"],
  ] as const) {
    await openScenario(page, scenario);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByText(/supabase|postgres|error code/i)).toHaveCount(0);
  }
});

test("P0 Search result hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "search-result-hierarchy");
  await expect(page).toHaveScreenshot("p0-search-result-mobile.png", { fullPage: true });
});

test("P0 Card Detail hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "card-detail-hierarchy");
  await expect(page).toHaveScreenshot("p0-card-detail-mobile.png", { fullPage: true });
});

test("P0 Search result hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "search-result-hierarchy");
  await expect(page).toHaveScreenshot("p0-search-result-desktop.png", { fullPage: true });
});

test("P0 Card Detail hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "card-detail-hierarchy");
  await expect(page).toHaveScreenshot("p0-card-detail-desktop.png", { fullPage: true });
});

test("P0 Vault hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "vault-loaded");
  await expect(page).toHaveScreenshot("p0-vault-loaded-mobile.png", { fullPage: true });
});

test("P0 exact-copy hierarchy remains visually stable on Samsung", async ({ page }) => {
  await openScenario(page, "vault-exact-copy");
  await expect(page).toHaveScreenshot("p0-vault-exact-copy-mobile.png", { fullPage: true });
});

test("P0 Vault hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "vault-loaded");
  await expect(page).toHaveScreenshot("p0-vault-loaded-desktop.png", { fullPage: true });
});

test("P0 exact-copy hierarchy remains visually stable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScenario(page, "vault-exact-copy");
  await expect(page).toHaveScreenshot("p0-vault-exact-copy-desktop.png", { fullPage: true });
});

for (const scenario of ["pulse-event", "wall-collection", "profile-collector"] as const) {
  test(`P0 ${scenario} remains visually stable on Samsung`, async ({ page }) => {
    await openScenario(page, scenario);
    await expect(page).toHaveScreenshot(`p0-${scenario}-mobile.png`, { fullPage: true });
  });

  test(`P0 ${scenario} remains visually stable on desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openScenario(page, scenario);
    await expect(page).toHaveScreenshot(`p0-${scenario}-desktop.png`, { fullPage: true });
  });
}

test("P0 desktop shell remains visually stable at wide desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScenario(page, "desktop-shell-wide");
  await expect(page).toHaveScreenshot("p0-desktop-shell-wide.png", { fullPage: true });
});

test("P0 desktop shell remains visually stable at narrow desktop", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await openScenario(page, "desktop-shell-narrow");
  await expect(page).toHaveScreenshot("p0-desktop-shell-narrow.png", { fullPage: true });
});

test("P0 desktop shell Wall-unavailable state remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await openScenario(page, "desktop-shell-wall-unavailable");
  await expect(page).toHaveScreenshot("p0-desktop-shell-wall-unavailable.png", { fullPage: true });
});

test("P0 desktop shell pushed-route state remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScenario(page, "desktop-shell-pushed-route");
  await expect(page).toHaveScreenshot("p0-desktop-shell-pushed-route.png", { fullPage: true });
});
