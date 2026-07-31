import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readTree(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return readdirSync(absolutePath)
    .flatMap((name) => {
      const childPath = path.join(absolutePath, name);
      return statSync(childPath).isDirectory()
        ? readTree(path.join(relativePath, name))
        : /\.(?:ts|tsx)$/.test(name)
          ? [readFileSync(childPath, "utf8")]
          : [];
    })
    .join("\n");
}

const helper = read(
  "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts",
);
const readModel = read(
  "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
);
const exploreRows = read("apps/web/src/lib/explore/getExploreRows.ts");
const searchRoute = read(
  "apps/web/src/app/api/resolver/search/route.ts",
);
const explorePage = read("apps/web/src/app/explore/page.tsx");
const exploreClient = read(
  "apps/web/src/components/explore/ExplorePageClient.tsx",
);

test("governed public pricing reads are normalized, bounded, chunked, and deadline-limited", () => {
  const chunkSize = Number(
    helper.match(/PUBLIC_PRICING_QUERY_CHUNK_SIZE\s*=\s*(\d+)/)?.[1],
  );
  const maximumIds = Number(
    helper.match(/PUBLIC_PRICING_MAX_CARD_IDS\s*=\s*(\d+)/)?.[1],
  );
  const discoveryLimit = Number(
    read("apps/web/src/lib/explore/getExploreRows.ts").match(
      /SMART_FILTER_DISCOVERY_LIMIT\s*=\s*(\d+)/,
    )?.[1],
  );

  assert.ok(chunkSize > 0 && chunkSize <= 32);
  assert.ok(maximumIds >= discoveryLimit);
  assert.match(helper, /new Set\([\s\S]*?\.trim\(\)[\s\S]*?\.filter\(Boolean\)[\s\S]*?\.sort\(\)/);
  assert.match(helper, /for \(const idChunk of chunkValues\(/);
  assert.match(
    helper,
    /getMarketPricingReadModelV1\(supabase, \{[\s\S]*?cardPrintIds: idChunk,[\s\S]*?throwOnError: true/,
  );
  assert.match(readModel, /get_market_pricing_read_model_v1/);
  assert.match(helper, /PUBLIC_PRICING_QUERY_BUDGET_MS/);
  assert.match(helper, /withTimeout\(/);
  assert.match(helper, /const getPublicPricingForNormalizedIds = cache\(/);
  assert.doesNotMatch(helper, /Promise\.all\([\s\S]*?chunkValues/);
});

test("pricing safety and correctness gates remain on every governed read-model row", () => {
  assert.match(readModel, /row\.status !== "available"/);
  assert.match(readModel, /row\.currency !== "USD"/);
  assert.match(readModel, /row\.source_name !== "tcgplayer"/);
  assert.match(readModel, /row\.freshness !== "fresh"/);
  assert.match(readModel, /!observedAt/);
  assert.match(readModel, /!publishedAt/);
  assert.match(readModel, /!provenanceId/);
  assert.match(helper, /record\.pricing_scope !== "parent"/);
  assert.match(helper, /raw_price_source: "tcgplayer_market"/);
  assert.match(helper, /price_source: "tcgplayer_market"/);
});

test("value sorting is bounded and rejects partial pricing reads", () => {
  assert.match(
    helper,
    /PUBLIC_PRICING_COMPLETE_SORT_MAX_CARD_IDS = 64/,
  );
  assert.match(helper, /requireComplete\?: boolean/);
  assert.match(helper, /options\.requireComplete && !result\.complete/);
  assert.match(
    helper,
    /throw new PublicPricingSortUnavailableError\([\s\S]*?result\.incompleteReason/,
  );
  assert.match(exploreRows, /VALUE_SORT_CANDIDATE_LIMIT = SEARCH_LIMIT/);
  assert.match(
    exploreRows,
    /if \(valueSort && rows\.length > candidateLimit\)[\s\S]*?candidate_limit_exceeded/,
  );
  assert.match(exploreRows, /assertValueSortPricingEnabled/);
  assert.match(
    exploreRows,
    /rows\.length > 0[\s\S]*?pricing_values_unavailable/,
  );
  assert.match(exploreRows, /requireComplete:\s*valueSort/);
  assert.doesNotMatch(
    exploreRows,
    /includePricing \|\| sortMode === "value_high" \|\| sortMode === "value_low"/,
  );
});

test("value sorting is auth-required and reports its exact applied-sort contract", () => {
  assert.match(
    searchRoute,
    /if \(valueSortRequested && !userId\)[\s\S]*?status: 401[\s\S]*?private, no-store/,
  );
  assert.match(searchRoute, /requested_sort: sortMode/);
  assert.match(searchRoute, /applied_sort: resolved\.degraded \? null : sortMode/);
  assert.match(
    searchRoute,
    /sort_degraded_reason: resolved\.degraded \? "resolver_timeout" : null/,
  );
  assert.match(
    searchRoute,
    /error instanceof PublicPricingSortUnavailableError[\s\S]*?applied_sort: null[\s\S]*?sort_degraded_reason: error\.reason/,
  );
  assert.match(
    searchRoute,
    /sort_degraded_reason: "resolver_timeout"/,
  );
});

test("anonymous Explore UI disables and labels value sorting", () => {
  assert.match(
    exploreClient,
    /<option value="value_high" disabled=\{!effectiveCanViewPricing\}>/,
  );
  assert.match(
    exploreClient,
    /<option value="value_low" disabled=\{!effectiveCanViewPricing\}>/,
  );
  assert.match(exploreClient, /\(sign in required\)/);
  assert.match(
    exploreClient,
    /sortDegradedReason === "authentication_required"[\s\S]*?Sign in to use value sorting/,
  );
});

test("ordinary Explore pricing is auth-gated and deferred until after result limiting", () => {
  const sliceIndex = searchRoute.indexOf(
    "smartFilteredCanonicalResults.slice(0, resultLimit)",
  );
  const deferredReadIndex = searchRoute.indexOf(
    "await getPublicPricingByCardIds(",
  );

  assert.match(
    searchRoute,
    /if \(hasSmartOwnershipIntent \|\| pricingRequested\)/,
  );
  assert.match(
    searchRoute,
    /const authenticatedIncludePricing = pricingRequested && Boolean\(userId\)/,
  );
  assert.match(
    searchRoute,
    /const includePricingDuringResolution =[\s\S]*?authenticatedIncludePricing && valueSortRequested/,
  );
  assert.ok(sliceIndex >= 0 && deferredReadIndex > sliceIndex);
  assert.match(
    searchRoute,
    /pricingRequested \|\| effectiveSmartSearchIntent\.ownedState[\s\S]*?"private, no-store"/,
  );
});

test("public list first paint enriches pricing only for a verified signed-in viewer", () => {
  assert.match(explorePage, /supabase\.auth\.getUser\(\)/);
  assert.match(explorePage, /const canViewPricing = Boolean\(user\)/);
  assert.match(
    explorePage,
    /const featuredPricing = canViewPricing[\s\S]*?getPublicPricingByCardIds\(\s*supabase/,
  );
  assert.match(explorePage, /canViewPricing=\{canViewPricing\}/);
  assert.doesNotMatch(read("apps/web/src/lib/publicSets.ts"), /getPublicPricingByCardIds/);
  assert.doesNotMatch(readTree("apps/web/src/app/network"), /getPublicPricingByCardIds/);

  // Compare is an intentionally price-bearing, bounded detail surface, but
  // anonymous first paint must not read or serialize signed-in-only pricing.
  assert.match(
    read("apps/web/src/lib/cards/getPublicCardsByGvIds.ts"),
    /options\.includePricing[\s\S]*?getPublicPricingByCardIds/,
  );
  const comparePage = read("apps/web/src/app/compare/page.tsx");
  assert.match(comparePage, /const canViewPricing = Boolean\(user\)/);
  assert.match(comparePage, /includePricing: canViewPricing/);
});
