import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Exercise the real components and image normalization without Next routing,
// server actions, an authenticated session, or any database/network access.
function load(relative, overrides = {}) {
  const filename = path.join(srcRoot, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const testModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier in overrides) return overrides[specifier];
    if (specifier === "next/link") {
      return function TestLink({ children, prefetch, ...props }) { return React.createElement("a", props, children); };
    }
    if (specifier === "next/image") {
      return function TestImage({ priority, unoptimized, ...props }) { return React.createElement("img", props); };
    }
    if (specifier === "./BinderForms") return {};
    if (specifier.startsWith("@/")) {
      const base = specifier.slice(2);
      const extension = fs.existsSync(path.join(srcRoot, `${base}.tsx`)) ? ".tsx" : ".ts";
      return load(`${base}${extension}`, overrides);
    }
    return require(specifier);
  };
  vm.runInNewContext(output, {
    exports: testModule.exports, module: testModule, require: localRequire, URL, URLSearchParams,
  }, { filename });
  return testModule.exports;
}

const PublicSetTile = load("components/sets/PublicSetTile.tsx").default;
const { BinderSummaryCard, BinderPublicView, BinderTemplateGrid, BinderDashboardView } =
  load("components/binders/BinderViews.tsx");
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const coverUrl = "https://catalog.example.test/storage/v1/object/public/external-card-images/set-covers/pokemon/example/cover.webp";
const setInfo = {
  game_code: "pokemon", code: "example", name: "Example Set", card_count: 42,
  printed_total: 42, release_year: 2026, hero_image_url: coverUrl,
};
const binder = {
  publicId: "binder/opaque", title: "Example Binder", description: null,
  coverImageUrl: coverUrl, binderType: "set", role: "owner", lifecycle: "active",
  completedSlots: 2, totalSlots: 42, progressUnit: "card_prints", memberCount: 1,
};

test("set renders one contained real cover, never a logo or blurred duplicate", () => {
  const html = render(PublicSetTile, { setInfo, compareCards: [], logoPath: "/logo.png", priority: true });
  assert.equal((html.match(/<img /g) ?? []).length, 1);
  assert.ok(html.includes(`src="${coverUrl}"`));
  assert.match(html, /gv-collector-set-cover-image[^\"]*rotate-\[7deg\][^\"]*object-contain[^\"]*p-6/);
  assert.match(html, /fetchPriority="high"/);
  assert.doesNotMatch(html, /blur|watermark|logo\.png|object-cover/);
  assert.match(html, /2026.*42 cards/);
});

test("set route keeps game and compare identity", () => {
  for (const game of ["pokemon", "one_piece", "mtg"]) {
    const html = render(PublicSetTile, {
      setInfo: { ...setInfo, game_code: game }, compareCards: ["GV-PK-123"],
    });
    const href = html.match(/href="([^\"]*\/sets\/[^\"]+)"/)[1].replaceAll("&amp;", "&");
    const url = new URL(href, "https://example.test");
    assert.equal(url.pathname, "/sets/example");
    assert.equal(url.searchParams.get("game"), game === "pokemon" ? null : game);
    assert.equal(url.searchParams.get("cards"), "GV-PK-123");
  }
});

test("set hero provenance is not reinterpreted as a hit-card guarantee", () => {
  for (const hero_image_url of ["https://catalog.example.test/logo.png", "https://catalog.example.test/package.webp"]) {
    const html = render(PublicSetTile, { setInfo: { ...setInfo, hero_image_url }, compareCards: [] });
    assert.ok(html.includes(`src="${hero_image_url}"`));
    assert.doesNotMatch(html, /hit.card|owned.card/i);
    assert.equal((html.match(/<img /g) ?? []).length, 1);
  }
});

test("missing, blank, and invalid set covers stay honest even with a logo", () => {
  for (const hero_image_url of [undefined, "", "  ", "javascript:alert(1)"]) {
    const html = render(PublicSetTile, {
      setInfo: { ...setInfo, hero_image_url }, compareCards: [], logoPath: "/logo.png",
    });
    assert.doesNotMatch(html, /<img /);
    assert.match(html, /gv-collector-set-cover-empty/);
    assert.match(html, /Cover artwork unavailable/);
    assert.match(html, /example/);
  }
});

test("binder summary uses only its cover and preserves link and progress", () => {
  const html = render(BinderSummaryCard, { binder });
  assert.equal((html.match(/<img /g) ?? []).length, 1);
  assert.ok(html.includes(`src="${coverUrl}"`));
  assert.match(html, /href="\/binders\/binder%2Fopaque"/);
  assert.match(html, /gv-collector-binder-cover-image[^\"]*-rotate-\[7deg\][^\"]*object-contain[^\"]*p-6/);
  assert.match(html, /aria-valuenow="2"/);
  assert.match(html, /aria-valuemax="42"/);
  assert.match(html, /1 member/);
});

test("missing binder cover does not infer cards from progress or extra checklist data", () => {
  const html = render(BinderSummaryCard, {
    binder: { ...binder, coverImageUrl: null, checklist: [{ imageUrl: coverUrl, status: "in_binder" }] },
  });
  assert.doesNotMatch(html, /<img /);
  assert.match(html, /Cover artwork unavailable/);
  assert.match(html, /aria-valuenow="2"/);
});

test("public Binder and templates share the single-cover treatment without inventing art", () => {
  const projection = { ...binder, targetLabel: "Example set", checklist: [], canReport: false, canBlockOwner: false };
  const template = { ...binder, templatePublicId: "template/opaque", version: 1, checklistSlotCount: 42, adoptionCount: null };
  for (const coverImageUrl of [coverUrl, null]) {
    for (const html of [
      render(BinderPublicView, { binder: { ...projection, coverImageUrl }, showTrustSafety: false }),
      render(BinderTemplateGrid, { templates: [{ ...template, coverImageUrl }] }),
    ]) {
      assert.equal((html.match(/<img /g) ?? []).length, coverImageUrl ? 1 : 0);
      assert.match(html, coverImageUrl ? /gv-collector-binder-cover-image/ : /Cover artwork unavailable/);
    }
  }
});

test("suspended memberships never acquire artwork or private details", () => {
  const html = render(BinderDashboardView, {
    sharedEnabled: false,
    dashboard: {
      continueBuilding: [], sharedWithMe: [], invitations: [], completed: [], archived: [], legacyCandidates: [],
      suspended: [{ publicId: "opaque", canLeave: false, canReport: false, coverImageUrl: coverUrl, title: "Private title" }],
    },
  });
  assert.doesNotMatch(html, /<img |Private title/);
  assert.match(html, /Suspended Binder/);
});

test("cover image failure exhausts its single source into an honest placeholder", () => {
  let current;
  let initialized = false;
  const PublicCardImage = load("components/PublicCardImage.tsx", {
    react: {
      useState(initial) {
        if (!initialized) { current = initial; initialized = true; }
        return [current, (next) => { current = next; }];
      },
      useEffect() {},
    },
  }).default;
  const props = { src: coverUrl, alt: "Cover", imageClassName: "art", fallbackClassName: "empty", fallbackLabel: "Cover artwork unavailable" };
  const image = PublicCardImage(props);
  assert.equal(image.props.src, coverUrl);
  image.props.onError();
  const fallback = PublicCardImage(props);
  assert.equal(fallback.type, "div");
  assert.equal(fallback.props.children, "Cover artwork unavailable");
});

test("presentation components add no fetch, RPC, fixture source, or cover candidate queries", () => {
  for (const relative of ["components/sets/PublicSetTile.tsx", "components/binders/BinderViews.tsx"]) {
    const source = fs.readFileSync(path.join(srcRoot, relative), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|\.rpc\s*\(|\.from\s*\(|fallbackSrc=|fallbackSources=|visual-fixtures|collector-site-preview/);
  }
});

const featuredCard = {
  id: "canonical-id", gv_id: "GV-PK-123", name: "Pikachu", display_name: "Pikachu",
  number: "123", set_code: "example", set_name: "Example Set", image_url: coverUrl,
  display_image_kind: "exact", raw_price: 12.5, raw_price_ts: "2026-09-01T00:00:00Z",
  raw_price_published_at: "2026-09-02T00:00:00Z", pricing_provenance_id: "proof-id",
  pricing_source_label: "Governed price", pricing_scope: "card_printing", pricing_is_from_price: true,
};

function discoveryHarness(props = {}) {
  const prices = [];
  const projections = {};
  const Discovery = load("components/explore/ExploreDiscoverySections.tsx", {
    "@/components/pricing/VisiblePrice": function TestPrice(props) {
      prices.push(props);
      return React.createElement("span", { "data-test-price": props.value });
    },
    "@/components/compare/CompareCardButton": function TestCompare({ gvId }) {
      return React.createElement("button", { "data-compare": gvId }, "Compare");
    },
    "@/components/provisional/RecentlyConfirmedDiscoverySection": function TestConfirmed(props) {
      projections.confirmed = props;
      return React.createElement("section", { "data-confirmed": true });
    },
    "@/components/provisional/PublicProvisionalDiscoverySection": function TestProvisional(props) {
      projections.provisional = props;
      return React.createElement("section", { "data-provisional": true });
    },
  }).default;
  const html = render(Discovery, {
    compareCards: ["GV-PK-123"], featuredCards: [featuredCard], notableSets: [setInfo],
    provisionalCards: [], recentlyConfirmedCards: [], currentView: "list", canViewPricing: false,
    ...props,
  });
  return { html, prices, projections };
}

test("discovery retains all featured cards and compare actions in one responsive product grid", () => {
  const featuredCards = Array.from({ length: 12 }, (_, i) => ({ ...featuredCard, gv_id: `GV-PK-${i + 1}` }));
  const { html } = discoveryHarness({ featuredCards });
  assert.equal((html.match(/<article /g) ?? []).length, 12);
  assert.equal((html.match(/data-feature-position=/g) ?? []).length, 3);
  for (const card of featuredCards) assert.ok(html.includes(`data-compare="${card.gv_id}"`));
  assert.doesNotMatch(html, /md:hidden|hidden space-y/);
  assert.match(html, /gv-collector-set-tile/);
});

test("discovery price authorization and all provenance props survive presentation", () => {
  assert.equal(discoveryHarness().prices.length, 0);
  const { prices } = discoveryHarness({ canViewPricing: true });
  assert.equal(prices.length, 2);
  for (const price of prices) {
    assert.equal(price.value, featuredCard.raw_price);
    assert.equal(price.cardPrintId, featuredCard.id);
    assert.equal(price.observedAt, featuredCard.raw_price_ts);
    assert.equal(price.publishedAt, featuredCard.raw_price_published_at);
    assert.equal(price.provenanceId, featuredCard.pricing_provenance_id);
    assert.equal(price.sourceLabel, featuredCard.pricing_source_label);
    assert.equal(price.pricingScope, "card_printing");
    assert.equal(price.isFromPrice, true);
  }
  assert.equal(discoveryHarness({ canViewPricing: true, featuredCards: [{ ...featuredCard, raw_price: undefined }] }).prices.length, 0);
});

test("discovery band excludes blocked or missing art without dropping grid identities", () => {
  const featuredCards = ["blocked", "missing"].map((display_image_kind, i) => ({ ...featuredCard, display_image_kind, gv_id: `GV-PK-${i}` }));
  const { html } = discoveryHarness({ featuredCards });
  assert.doesNotMatch(html, /data-feature-position=/);
  assert.equal((html.match(/<article /g) ?? []).length, 2);
  assert.match(html, /Image Under Review/);
  const empty = discoveryHarness({ featuredCards: [], notableSets: [] }).html;
  assert.doesNotMatch(empty, /<img /);
  assert.match(empty, /Featured cards are being refreshed/);
  assert.match(empty, /Set highlights are being refreshed/);
});

test("discovery preserves image-truth labels in band and grid", () => {
  const { html } = discoveryHarness({ featuredCards: [{ ...featuredCard, display_image_kind: "representative", image_status: "representative_shared_collision" }] });
  assert.equal((html.match(/>Exact Variant Image Pending</g) ?? []).length, 2);
  assert.match(html, /representative image\. Exact variant image pending\./);
});

test("discovery retains all Pokemon, variant families, current view and trust projections", () => {
  const confirmed = [{ id: "confirmed" }];
  const provisional = [{ id: "provisional" }];
  const { html, projections } = discoveryHarness({ recentlyConfirmedCards: confirmed, provisionalCards: provisional });
  assert.equal((html.match(/class="gv-collector-discovery-pokemon-link /g) ?? []).length, 8);
  assert.equal((html.match(/class="gv-collector-discovery-family /g) ?? []).length, 6);
  assert.match(html, /q=Pikachu&amp;view=list&amp;cards=GV-PK-123/);
  assert.match(html, /identity=stamped&amp;cards=GV-PK-123/);
  assert.equal(projections.confirmed.cards, confirmed);
  assert.equal(projections.provisional.cards, provisional);
  assert.ok(html.indexOf("gv-collector-discovery-confirmed") < html.indexOf("gv-collector-discovery-provisional"));
});

test("desktop/mobile presentation smoke with isolated supplied artwork", {
  skip: !process.env.GROOKAI_PRESENTATION_TEST_IMAGE || !process.env.GROOKAI_PRESENTATION_TEST_OUTPUT,
}, async () => {
  const { chromium } = await import("@playwright/test");
  const postcss = require("postcss");
  const tailwindcss = require("tailwindcss");
  const webRoot = path.resolve(srcRoot, "..");
  const output = path.resolve(process.env.GROOKAI_PRESENTATION_TEST_OUTPUT);
  fs.mkdirSync(output, { recursive: true });
  const cssInput = fs.readFileSync(path.join(srcRoot, "app/globals.css"), "utf8") +
    fs.readFileSync(path.join(srcRoot, "app/collector.css"), "utf8");
  const { css } = await postcss([tailwindcss({
    content: [path.join(srcRoot, "**/*.{ts,tsx}").replaceAll("\\", "/")],
    theme: { extend: {} }, plugins: [],
  })]).process(cssInput, { from: path.join(webRoot, "presentation-smoke.css") });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() === "image") {
        await route.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(process.env.GROOKAI_PRESENTATION_TEST_IMAGE) });
      } else await route.abort();
    });
    const featuredCards = Array.from({ length: 6 }, (_, i) => ({ ...featuredCard, gv_id: `GV-PK-${i + 1}` }));
    const cases = {
      discovery: discoveryHarness({ featuredCards }).html,
      covers: `<div class="grid gap-5 sm:grid-cols-2">${render(PublicSetTile, { setInfo, compareCards: [] })}${render(BinderSummaryCard, { binder })}${render(PublicSetTile, { setInfo: { ...setInfo, hero_image_url: undefined }, compareCards: [] })}${render(BinderSummaryCard, { binder: { ...binder, coverImageUrl: null } })}</div>`,
    };
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name, html] of Object.entries(cases)) {
        await page.setContent(`<html class="gv-collector"><head><style>${css}</style></head><body><main style="max-width:1200px;margin:auto;padding:20px">${html}</main></body></html>`);
        await page.locator("img").evaluateAll(async (images) => {
          for (const image of images) { image.loading = "eager"; await image.decode(); }
        });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflows at ${width}`);
        const images = await page.locator("img").evaluateAll((images) => images.map((image) => {
          const style = getComputedStyle(image);
          const rect = image.getBoundingClientRect();
          return { loaded: image.naturalWidth > 0, width: rect.width, height: rect.height, fit: style.objectFit, filter: style.filter };
        }));
        assert.ok(images.length > 0);
        for (const image of images) {
          assert.ok(image.loaded && image.width > 40 && image.height > 40);
          assert.equal(image.fit, "contain");
          assert.ok(!image.filter.includes("blur("));
        }
        await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      }
    }
  } finally {
    await browser.close();
  }
});
