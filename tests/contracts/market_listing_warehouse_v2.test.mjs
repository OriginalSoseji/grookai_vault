import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildMarketListingAcquisitionWarehouseBackfillPlanV2 } from "../../backend/pricing/market_listing_acquisition_warehouse_backfill_plan_v2.mjs";
import { buildMarketListingAcquisitionWarehouseFetchV2 } from "../../backend/pricing/market_listing_acquisition_warehouse_fetch_v2.mjs";
import { buildMarketListingAcquisitionWarehousePlanV2 } from "../../backend/pricing/market_listing_acquisition_warehouse_plan_v2.mjs";
import { classifyMarketListingProductKindV2 } from "../../backend/pricing/market_listing_product_kind_v2.mjs";
import { buildMarketListingProviderCategoryRegistryV2 } from "../../backend/pricing/market_listing_provider_category_registry_v2.mjs";
import { buildEbayBrowseSearchUrl } from "../../backend/pricing/market_listing_acquisition_smoke_fetch_v1.mjs";
import {
  discoverMarketListingProviderCategoriesV2,
  sealedCategoryRouteFromReviewedDiscoveryV2,
} from "../../backend/pricing/market_listing_provider_category_discovery_v2.mjs";

function reviewedRegistry() {
  return buildMarketListingProviderCategoryRegistryV2({
    categoryTreeVersion: "test-tree-version",
    sealedRoute: {
      category_ids: ["TEST-SEALED-CATEGORY"],
      category_names: ["Test sealed trading card products"],
      query_suffixes: ["sealed"],
      provenance: "test_fixture_only",
      reviewed: true,
    },
    generatedAt: "2026-08-03T00:00:00.000Z",
  });
}

function oneSetTargets() {
  return [{ set_code: "sv-test", set_name: "Test Set", release_date: "2026-07-01", card_print_id: "ignored" }];
}

test("product-kind V2 preserves raw, graded, and sealed as separate warehouse families", () => {
  const raw = classifyMarketListingProductKindV2({
    title: "Pokemon Pikachu 58/102 Pack Fresh Single Card",
    conditionText: "Ungraded",
    conditionId: "4000",
    acquisitionCategoryIds: ["183454"],
  });
  const graded = classifyMarketListingProductKindV2({
    title: "Pokemon Charizard ETB Promo PSA 10",
    conditionText: "Graded",
    conditionId: "2750",
    acquisitionCategoryIds: ["183454"],
  });
  const sealed = classifyMarketListingProductKindV2({
    title: "Pokemon Test Set Factory Sealed Elite Trainer Box",
    acquisitionProductKind: "sealed_product",
    itemCategories: [{ categoryId: "TEST-SEALED-CATEGORY", categoryName: "Sealed Trading Card Products" }],
  });

  assert.equal(raw.product_kind, "raw_single");
  assert.equal(raw.packaging_state, "not_observed");
  assert.equal(raw.canonical_assignment_status, "deferred");
  assert.equal(graded.product_kind, "graded_single");
  assert.equal(graded.listing_evidence_class, "slab");
  assert.equal(sealed.product_kind, "sealed_product");
  assert.equal(sealed.packaging_state, "sealed");
  assert.equal(sealed.assignment_domain, "sealed_product");
  assert.equal(sealed.warehouse_eligible, true);
  assert.equal(sealed.pricing_publication_eligible, false);
});

test("product-kind V2 does not mistake card titles or freshness language for sealed inventory", () => {
  const suspiciousFoodTin = classifyMarketListingProductKindV2({
    title: "Suspicious Food Tin 80/73 Pokemon Card",
    acquisitionCategoryIds: ["183454"],
  });
  const etbPromo = classifyMarketListingProductKindV2({
    title: "Pokemon Center ETB Promo Card Sealed",
    acquisitionCategoryIds: ["183454"],
  });
  assert.equal(suspiciousFoodTin.product_kind, "raw_single");
  assert.equal(etbPromo.product_kind, "raw_single");
  assert.equal(etbPromo.packaging_state, "sealed");
});

test("provider category registry refuses live planning until sealed taxonomy is reviewed", () => {
  const registry = buildMarketListingProviderCategoryRegistryV2({ categoryTreeVersion: "v1" });
  const plan = buildMarketListingAcquisitionWarehousePlanV2({ targets: oneSetTargets(), categoryRegistry: registry });
  assert.equal(registry.ready_for_live_acquisition, false);
  assert.equal(plan.ready_for_acquisition_approval, false);
  assert.ok(plan.findings.includes("missing_reviewed_sealed_category_ids"));
  assert.equal(plan.acquisition_requests.length, 0);
});

test("official taxonomy discovery freezes candidates before a reviewed sealed route can activate", async () => {
  const responses = [
    { categoryTreeId: "0", categoryTreeVersion: "2026-08-03" },
    { categoryTreeId: "0", categoryTreeVersion: "2026-08-03", categorySuggestions: [{ category: { categoryId: "SEALED-1", categoryName: "Sealed Trading Card Products" } }] },
  ];
  const discovery = await discoverMarketListingProviderCategoriesV2({
    accessToken: "test-token",
    queries: ["Pokemon sealed booster box"],
    generatedAt: "2026-08-03T00:00:00.000Z",
    fetchImpl: async () => {
      const payload = responses.shift();
      return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
    },
  });
  assert.equal(discovery.ready_for_human_category_review, true);
  assert.equal(discovery.boundary.category_registry_activation, false);
  const sealedRoute = sealedCategoryRouteFromReviewedDiscoveryV2({ discovery, acceptedCategoryIds: ["SEALED-1"] });
  assert.deepEqual(sealedRoute.category_ids, ["SEALED-1"]);
  assert.match(sealedRoute.provenance, /^ebay_taxonomy:/);
  assert.throws(() => sealedCategoryRouteFromReviewedDiscoveryV2({ discovery, acceptedCategoryIds: ["NOT-IN-DISCOVERY"] }), /not present/);
});

test("warehouse V2 plans category-aware discovery with exact printing assignment deferred", () => {
  const plan = buildMarketListingAcquisitionWarehousePlanV2({
    targets: oneSetTargets(),
    categoryRegistry: reviewedRegistry(),
    providerCallCeiling: 3,
    maxPagesPerFamily: 1,
  });
  assert.equal(plan.ready_for_acquisition_approval, true);
  assert.equal(plan.summary.exact_printing_request_count, 0);
  assert.deepEqual(plan.summary.product_kind_candidate_counts, { graded_single: 4, raw_single: 1, sealed_product: 1 });
  assert.ok(plan.acquisition_requests.every((request) => request.card_print_id === null && request.card_printing_id === null));
  assert.ok(plan.acquisition_requests.every((request) => request.target_hints.card_matching_deferred === true));
  assert.deepEqual(plan.acquisition_requests.find((request) => request.acquisition_product_kind === "sealed_product").query_filters.category_ids, ["TEST-SEALED-CATEGORY"]);
});

test("Browse URL uses request category IDs instead of hardcoded individual-card category", () => {
  const url = buildEbayBrowseSearchUrl({
    query_text: "Pokemon sealed",
    query_filters: { category_ids: ["TEST-A", "TEST-B"], fieldgroups: ["MATCHING_ITEMS"] },
  }, { resultLimit: 200 });
  assert.equal(url.searchParams.get("category_ids"), "TEST-A,TEST-B");
  assert.equal(url.searchParams.get("fieldgroups"), "MATCHING_ITEMS");
});

test("warehouse V2 fetch covers all product kinds, classifies evidence, and writes local artifacts only", async () => {
  const artifactDir = mkdtempSync(path.join(tmpdir(), "market-warehouse-v2-fetch-"));
  try {
    const plan = buildMarketListingAcquisitionWarehousePlanV2({
      targets: oneSetTargets(),
      categoryRegistry: reviewedRegistry(),
      providerCallCeiling: 3,
      maxPagesPerFamily: 1,
    });
    const report = await buildMarketListingAcquisitionWarehouseFetchV2({
      warehousePlan: plan,
      artifactDir,
      generatedAt: "2026-08-03T00:00:00.000Z",
      fetchListing: async (request, { observedAt }) => {
        const lane = request.acquisition_product_kind;
        const item = lane === "graded_single"
          ? { itemId: "graded-1", title: "Pokemon Charizard PSA 10", condition: "Graded", conditionId: "2750", categories: [{ categoryId: "183454", categoryName: "CCG Individual Cards" }], price: { value: "100", currency: "USD" } }
          : lane === "sealed_product"
            ? { itemId: "sealed-1", title: "Pokemon Test Set Factory Sealed Booster Box", condition: "New", categories: [{ categoryId: "TEST-SEALED-CATEGORY", categoryName: "Sealed Trading Card Products" }], price: { value: "120", currency: "USD" } }
            : { itemId: "raw-1", title: "Pokemon Pikachu 1/100 Single Card", condition: "Ungraded", conditionId: "4000", categories: [{ categoryId: "183454", categoryName: "CCG Individual Cards" }], price: { value: "5", currency: "USD" } };
        return {
          query_key: request.query_key,
          source: "ebay_active",
          provider_route: "ebay_browse_api",
          source_fetch_url: "https://api.ebay.test/search",
          response_status: 200,
          provider_total: 1,
          fetched_item_count: 1,
          payload_hash: `hash-${lane}`,
          raw_payload: { total: 1, itemSummaries: [item] },
          projected_observations: [{
            source: "ebay_active",
            provider_route: "ebay_browse_api",
            source_listing_id: item.itemId,
            listing_title: item.title,
            condition_text: item.condition,
            provider_condition_id: item.conditionId ?? null,
            provider_categories: item.categories,
            total_ask_price: Number(item.price.value),
            currency: "USD",
            observed_at: observedAt,
            target: {},
          }],
        };
      },
    });

    assert.equal(report.ready_for_local_db_backfill_plan, true);
    assert.equal(report.summary.provider_call_count, 3);
    assert.deepEqual(report.summary.acquisition_lane_call_counts, { graded_single: 1, raw_single: 1, sealed_product: 1 });
    assert.deepEqual(report.summary.product_kind_counts, { graded_single: 1, raw_single: 1, sealed_product: 1 });
    assert.equal(report.boundary.db_writes, false);
    const observations = readFileSync(report.artifacts.projected_observations_jsonl, "utf8").trim().split("\n").map(JSON.parse);
    assert.ok(observations.every((row) => row.target.canonical_assignment_status === "deferred"));
    assert.ok(observations.every((row) => row.target.card_print_id === null));

    const backfillDir = path.join(artifactDir, "backfill");
    const backfill = await buildMarketListingAcquisitionWarehouseBackfillPlanV2({
      fetchArtifact: report,
      outputDir: backfillDir,
      generatedAt: "2026-08-03T00:05:00.000Z",
    });
    assert.equal(backfill.ready_for_apply_approval, true);
    assert.equal(backfill.proposed_table_row_counts.market_listing_observations, 3);
    assert.equal(backfill.proposed_table_row_counts.market_listing_card_candidates, 0);
    assert.deepEqual(backfill.summary.product_kind_counts, { graded_single: 1, raw_single: 1, sealed_product: 1 });
    assert.equal(backfill.boundary.db_writes, false);
    assert.equal(backfill.boundary.canonical_assignment_writes, false);
    const eventRows = readFileSync(backfill.row_files.priceEventRows, "utf8").trim().split("\n").map(JSON.parse);
    assert.ok(eventRows.every((row) => row.event_payload.canonical_assignment_status === "deferred"));
    assert.ok(eventRows.every((row) => row.event_payload.pricing_publication_eligible === false));
  } finally {
    rmSync(artifactDir, { recursive: true, force: true });
  }
});

test("warehouse V2 implementation contains no database write client", () => {
  for (const relativePath of [
    "../../backend/pricing/market_listing_acquisition_warehouse_plan_v2.mjs",
    "../../backend/pricing/market_listing_acquisition_warehouse_fetch_v2.mjs",
    "../../backend/pricing/market_listing_acquisition_warehouse_backfill_plan_v2.mjs",
    "../../backend/pricing/market_listing_provider_category_discovery_v2.mjs",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.doesNotMatch(source, /createClient|\.from\(|\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/i);
  }
});
