import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerMarketProductSurfaceProofV1,
  isTcgplayerMarketProductSurfaceRouteV1,
  TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1,
} from "../../backend/pricing/tcgplayer_market_product_surface_proof_policy_v1.mjs";
import {
  parseFlutterPricingProofKeyV1,
} from "../../scripts/audits/tcgplayer_market_flutter_surface_capture_v1.mjs";

const COMMIT = "a".repeat(40);
const HASH = "b".repeat(64);
const CARD_PRINT_ID = "00000000-0000-4000-8000-000000000001";
const CARD_PRINTING_ID = "00000000-0000-4000-8000-000000000002";
const PUBLISHED_AT = "2026-07-28T10:00:00.000Z";
const OBSERVED_AT = "2026-07-28T08:15:00.000Z";
const PROVENANCE_ID = "00000000-0000-4000-8000-000000000003";
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const AUDIT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_product_surface_proof_v1.mjs",
  ),
  "utf8",
);
const CONTRACT = readFileSync(
  path.join(
    ROOT,
    "docs",
    "contracts",
    "TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_V1.md",
  ),
  "utf8",
);
const CARD_RAIL = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "components",
    "pricing",
    "CardPagePricingRail.tsx",
  ),
  "utf8",
);
const VISIBLE_PRICE = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "components",
    "pricing",
    "VisiblePrice.tsx",
  ),
  "utf8",
);
const FLUTTER_PRICE = readFileSync(
  path.join(ROOT, "lib", "widgets", "card_surface_price.dart"),
  "utf8",
);
const WEB_SET_PAGE = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "app",
    "sets",
    "[set_code]",
    "page.tsx",
  ),
  "utf8",
);
const WEB_SET_API = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "app",
    "api",
    "public-set-cards",
    "route.ts",
  ),
  "utf8",
);
const WEB_SET_GRID = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "components",
    "PublicSetCardGrid.tsx",
  ),
  "utf8",
);
const WEB_SET_PRICING = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "lib",
    "pricing",
    "enrichPublicSetCardsWithMarketPricingV1.ts",
  ),
  "utf8",
);
const FLUTTER_COMPARE_SERVICE = readFileSync(
  path.join(ROOT, "lib", "services", "public", "compare_service.dart"),
  "utf8",
);
const FLUTTER_COMPARE_SCREEN = readFileSync(
  path.join(ROOT, "lib", "screens", "compare", "compare_screen.dart"),
  "utf8",
);
const FLUTTER_NETWORK_SCREEN = readFileSync(
  path.join(ROOT, "lib", "screens", "network", "network_screen.dart"),
  "utf8",
);

function readModelRow() {
  return {
    pricing_scope: "card_printing",
    card_print_id: CARD_PRINT_ID,
    card_printing_id: CARD_PRINTING_ID,
    printing_gv_id: "GV-PK-TEST-001-PRINT",
    status: "available",
    currency: "USD",
    market_close: 12.34,
    source_name: "tcgplayer",
    source_label: "TCGPlayer Market",
    observed_at: OBSERVED_AT,
    published_at: PUBLISHED_AT,
    freshness: "fresh",
    is_from_price: false,
    provenance_id: PROVENANCE_ID,
  };
}

function capture(surface, index) {
  const routeBySurface = {
    web_card_detail: "/card/GV-PK-TEST-001",
    web_search: "/explore?q=charizard&sort=relevance",
    web_explore: "/explore",
    web_set_grid: "/sets/base1",
    web_compare: "/compare?cards=GV-PK-TEST-001,GV-PK-TEST-002",
    web_private_vault: "/vault",
    web_public_vault: "/u/test-collector",
    web_vault_item: `/vault/card/${CARD_PRINT_ID}`,
    web_market_history: "/card/GV-PK-TEST-001/market",
    flutter_card_detail: "card_detail",
    flutter_search_or_grid: "search_or_grid",
    flutter_set_grid: "set_grid",
    flutter_compare: "compare",
    flutter_private_vault: "private_vault",
    flutter_public_collector: "public_collector",
    flutter_network: "network",
    flutter_vault_item: "vault_item",
  };
  if (surface.proof_kind === "vault_total") {
    return {
      capture_id: `capture_${String(index).padStart(2, "0")}`,
      surface_id: surface.surface_id,
      client: surface.client,
      proof_kind: "vault_total",
      authenticated: true,
      route: routeBySurface[surface.surface_id],
      captured_at: "2026-07-28T10:05:00.000Z",
      screenshot_sha256: HASH,
      render_evidence_sha256: HASH,
      render_evidence_integrity: true,
      rendered: {
        status: "available",
        vault_market_value_usd: 24.68,
        priced_copy_count: 2,
        unpriced_copy_count: 1,
        currency: "USD",
        source_label: "TCGPlayer Market",
      },
    };
  }
  if (surface.proof_kind === "vault_group_total") {
    return {
      capture_id: `capture_${String(index).padStart(2, "0")}`,
      surface_id: surface.surface_id,
      client: surface.client,
      proof_kind: "vault_group_total",
      authenticated: true,
      route: routeBySurface[surface.surface_id],
      captured_at: "2026-07-28T10:05:00.000Z",
      screenshot_sha256: HASH,
      render_evidence_sha256: HASH,
      render_evidence_integrity: true,
      card_print_id: CARD_PRINT_ID,
      rendered: {
        status: "available",
        vault_market_value_usd: 12.34,
        priced_copy_count: 1,
        unpriced_copy_count: 0,
        currency: "USD",
        source_label: "TCGPlayer Market",
        observed_at: OBSERVED_AT,
        published_at: PUBLISHED_AT,
      },
    };
  }
  return {
    capture_id: `capture_${String(index).padStart(2, "0")}`,
    surface_id: surface.surface_id,
    client: surface.client,
    proof_kind: "price_record",
    authenticated: true,
    route: routeBySurface[surface.surface_id],
    captured_at: "2026-07-28T10:05:00.000Z",
    screenshot_sha256: HASH,
    render_evidence_sha256: HASH,
    render_evidence_integrity: true,
    card_print_id: CARD_PRINT_ID,
    card_printing_id: CARD_PRINTING_ID,
    rendered: {
      status: "available",
      pricing_scope: "card_printing",
      market_close_usd: 12.34,
      currency: "USD",
      source_label: "TCGPlayer Market",
      observed_at: OBSERVED_AT,
      published_at: PUBLISHED_AT,
      provenance_id: PROVENANCE_ID,
      is_from_price: false,
    },
  };
}

function evidence() {
  return {
    expected_commit_sha: COMMIT,
    deployed_commit_sha: COMMIT,
    capture_manifest: {
      schema_version: "TCGPLAYER_MARKET_PRODUCT_SURFACE_CAPTURE_V1",
      deployed_commit_sha: COMMIT,
      environment: "production",
      auth_lane: "authenticated",
      captures: TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1.map(capture),
    },
    read_model_rows: [readModelRow()],
    vault_readback: {
      status: "passed",
      exact_pricing: {
        reconciled_total_usd: 24.68,
        priced_copy_count: 2,
        unpriced_copy_count: 1,
        sample_group: {
          card_print_id: CARD_PRINT_ID,
          priced_copy_count: 1,
          unpriced_copy_count: 0,
          reconciled_total_usd: 12.34,
          independent_total_usd: 12.34,
          latest_observed_at: OBSERVED_AT,
          latest_published_at: PUBLISHED_AT,
        },
      },
    },
  };
}

test("all required authenticated surfaces pass exact source-to-render proof", () => {
  const result = evaluateTcgplayerMarketProductSurfaceProofV1(evidence());
  assert.equal(result.status, "passed");
  assert.deepEqual(result.findings, []);
  assert.equal(
    result.required_surface_count,
    TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1.length,
  );
  assert.equal(result.passed_surface_count, result.required_surface_count);
});

test("missing and duplicate surface captures fail closed", () => {
  const input = evidence();
  input.capture_manifest.captures.shift();
  input.capture_manifest.captures.push({
    ...input.capture_manifest.captures[0],
    capture_id: "capture_duplicate_surface",
  });
  const result = evaluateTcgplayerMarketProductSurfaceProofV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("required_surface_missing:"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("required_surface_duplicated:"),
    ),
  );
});

test("surface proof route identity is bound to the claimed product surface", () => {
  assert.equal(
    isTcgplayerMarketProductSurfaceRouteV1(
      "web_search",
      "/explore?q=charizard&sort=relevance",
    ),
    true,
  );
  assert.equal(
    isTcgplayerMarketProductSurfaceRouteV1("web_search", "/explore"),
    false,
  );
  assert.equal(
    isTcgplayerMarketProductSurfaceRouteV1(
      "web_market_history",
      "/card/GV-PK-TEST-001/market",
    ),
    true,
  );
  assert.equal(
    isTcgplayerMarketProductSurfaceRouteV1(
      "web_set_grid",
      "/card/GV-PK-TEST-001",
    ),
    false,
  );
  assert.equal(
    isTcgplayerMarketProductSurfaceRouteV1(
      "flutter_compare",
      "compare",
    ),
    true,
  );
  assert.equal(
    isTcgplayerMarketProductSurfaceRouteV1(
      "flutter_compare",
      "network",
    ),
    false,
  );

  const input = evidence();
  input.capture_manifest.captures[0].route = "/explore";
  const result = evaluateTcgplayerMarketProductSurfaceProofV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_route_identity_mismatch:"),
    ),
  );
});

test("rendered price, timestamp, provenance, and source must match", () => {
  const input = evidence();
  const rendered = input.capture_manifest.captures[0].rendered;
  rendered.market_close_usd = 99;
  rendered.source_label = "Grookai Value";
  rendered.published_at = "2026-07-27T10:00:00.000Z";
  rendered.provenance_id = "00000000-0000-4000-8000-000000000099";
  const result = evaluateTcgplayerMarketProductSurfaceProofV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_market_close_mismatch:"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_source_label_mismatch:"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_published_at_mismatch:"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_provenance_id_mismatch:"),
    ),
  );
});

test("multi-printing parent summaries preserve the governed From state", () => {
  const input = evidence();
  input.read_model_rows[0].source_label = "From TCGPlayer Market";
  input.read_model_rows[0].is_from_price = true;
  for (const captured of input.capture_manifest.captures) {
    if (captured.proof_kind !== "price_record") {
      continue;
    }
    captured.rendered.source_label = "From TCGPlayer Market";
    captured.rendered.is_from_price = true;
  }
  const result = evaluateTcgplayerMarketProductSurfaceProofV1(input);
  assert.equal(result.status, "passed");
  assert.deepEqual(result.findings, []);
});

test("authentication, screenshot, and render evidence are mandatory", () => {
  const input = evidence();
  const first = input.capture_manifest.captures[0];
  first.authenticated = false;
  first.screenshot_sha256 = "";
  first.render_evidence_sha256 = "";
  first.render_evidence_integrity = false;
  const result = evaluateTcgplayerMarketProductSurfaceProofV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_not_authenticated:"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_screenshot_hash_invalid:"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_render_evidence_hash_invalid:"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.startsWith("surface_render_evidence_integrity_failed:"),
    ),
  );
});

test("capture provenance must identify the exact deployed commit", () => {
  const input = evidence();
  input.capture_manifest.deployed_commit_sha = "c".repeat(40);
  const result = evaluateTcgplayerMarketProductSurfaceProofV1(input);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("capture_commit_sha_mismatch"));
});

test("production surface verifier is read-only, hashed, and fail-closed", () => {
  assert.match(AUDIT, /begin read only/i);
  assert.match(AUDIT, /set local role authenticated/i);
  assert.doesNotMatch(
    AUDIT,
    /\b(insert|update|delete|truncate)\s+public\./i,
  );
  assert.match(AUDIT, /artifact_hashes\.json/);
  assert.match(AUDIT, /customer_identifiers_in_artifacts:\s*false/);
  assert.match(AUDIT, /--capture-manifest is required/);
  assert.match(AUDIT, /--expected-commit-sha is required/);
  assert.match(AUDIT, /--deployed-commit-sha is required/);
  assert.match(AUDIT, /tracked worktree must be clean with --require-pass/);
});

test("contract and shared clients preserve machine-readable render evidence", () => {
  for (const surface of TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1) {
    assert.match(CONTRACT, new RegExp(`\\b${surface.surface_id}\\b`));
  }
  assert.match(CARD_RAIL, /data-pricing-proof="tcgplayer-market"/);
  assert.match(CARD_RAIL, /data-provenance-id=\{pricing\.provenance_id\}/);
  assert.match(VISIBLE_PRICE, /data-card-print-id=\{cardPrintId\}/);
  assert.match(VISIBLE_PRICE, /data-published-at=\{publishedAt\}/);
  assert.match(VISIBLE_PRICE, /\{isFromPrice \? "From " : ""\}/);
  assert.match(VISIBLE_PRICE, /data-source-label=\{sourceLabel\}/);
  assert.match(FLUTTER_PRICE, /identifier:\s*resolvedPricing == null/);
  assert.match(FLUTTER_PRICE, /cardSurfacePricingProofKey/);
});

test("web Set grids use exact child-printing pricing for initial and paginated rows", () => {
  assert.match(
    WEB_SET_PAGE,
    /enrichPublicSetCardsWithMarketPricingV1\(\s*supabase,\s*initialCardsWithOwnership/s,
  );
  assert.match(
    WEB_SET_PAGE,
    /const initialCardsWithPricing = user\?\.id/,
  );
  assert.match(
    WEB_SET_API,
    /enrichPublicSetCardsWithMarketPricingV1\(\s*supabase,\s*itemsWithOwnership/s,
  );
  assert.match(WEB_SET_API, /const items = user\?\.id/);
  assert.match(
    WEB_SET_PRICING,
    /indexExactMarketPricingByCardPrintingId/,
  );
  assert.match(WEB_SET_PRICING, /cardPrintingIds/);
  assert.doesNotMatch(WEB_SET_PRICING, /cardPrintIds/);
  assert.match(WEB_SET_GRID, /selectedPrinting\?\.pricing/);
  assert.match(WEB_SET_GRID, /cardPrintingId=\{selectedPrinting\?\.id\}/);
  assert.match(WEB_SET_GRID, /pricingScope=\{selectedPricing\.pricing_scope\}/);
  assert.doesNotMatch(WEB_SET_GRID, /pricingScope=["']parent["']/);
});

test("Flutter Compare and Network preserve governed pricing render evidence", () => {
  assert.match(
    FLUTTER_COMPARE_SERVICE,
    /final CardSurfacePricingData\? pricing;/,
  );
  assert.match(FLUTTER_COMPARE_SERVICE, /pricing:\s*priceRow,/);
  assert.doesNotMatch(FLUTTER_COMPARE_SERVICE, /rawPrice(?:Source|Timestamp)?/);
  assert.match(
    FLUTTER_COMPARE_SCREEN,
    /CardSurfacePriceText\(\s*pricing:\s*card\.pricing,/s,
  );
  assert.match(
    FLUTTER_NETWORK_SCREEN,
    /_NetworkSupportingInfo\([\s\S]*?pricing:\s*row\.pricing,/,
  );
  assert.match(
    FLUTTER_NETWORK_SCREEN,
    /CardSurfacePriceText\(\s*pricing:\s*pricing,/s,
  );
  assert.doesNotMatch(
    FLUTTER_NETWORK_SCREEN,
    /values\.add\(_formatPrice\(visiblePrice\)\)/,
  );
});

test("Flutter semantics proof keys preserve price and Vault total meaning", () => {
  const price = parseFlutterPricingProofKeyV1(
    [
      "tcgplayer-market-v1",
      "parent",
      CARD_PRINT_ID,
      "",
      "",
      "12.34",
      OBSERVED_AT,
      PUBLISHED_AT,
      PROVENANCE_ID,
      "From TCGPlayer Market",
      "from",
      "",
      "",
    ].join("|"),
  );
  assert.equal(price.proof_kind, "price_record");
  assert.equal(price.rendered.market_close_usd, 12.34);
  assert.equal(price.rendered.source_label, "From TCGPlayer Market");
  assert.equal(price.rendered.is_from_price, true);

  const grouped = parseFlutterPricingProofKeyV1(
    [
      "tcgplayer-market-v1",
      "vault_exact_total",
      CARD_PRINT_ID,
      "",
      "",
      "24.68",
      OBSERVED_AT,
      PUBLISHED_AT,
      "",
      "TCGPlayer Market",
      "exact",
      "2",
      "1",
    ].join("|"),
  );
  assert.equal(grouped.proof_kind, "vault_group_total");
  assert.equal(grouped.rendered.vault_market_value_usd, 24.68);
  assert.equal(grouped.rendered.priced_copy_count, 2);
  assert.equal(grouped.rendered.unpriced_copy_count, 1);

  const vault = parseFlutterPricingProofKeyV1(
    [
      "tcgplayer-market-vault-total-v1",
      "50.25",
      "4",
      "2",
      OBSERVED_AT,
      PUBLISHED_AT,
    ].join("|"),
  );
  assert.equal(vault.proof_kind, "vault_total");
  assert.equal(vault.rendered.vault_market_value_usd, 50.25);
  assert.equal(vault.rendered.priced_copy_count, 4);
});
