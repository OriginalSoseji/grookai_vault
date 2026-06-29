import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
  EXPECTED_MEE_11F_OBSERVATION_MANIFEST_HASH,
  EXPECTED_MEE_11F_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_11F_RAW_SNAPSHOT_MANIFEST_HASH,
  MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_VERSION,
  buildMarketListingBroadIntakeBackfillPlanV1,
} from "../../backend/pricing/market_listing_broad_intake_backfill_plan_v1.mjs";

function smokeArtifact(overrides = {}) {
  return {
    package_id: "MARKET-LISTING-BROAD-INTAKE-SMOKE-V1",
    package_fingerprint_sha256: EXPECTED_MEE_11F_PACKAGE_FINGERPRINT,
    raw_snapshot_manifest_hash_sha256: EXPECTED_MEE_11F_RAW_SNAPSHOT_MANIFEST_HASH,
    projected_observation_manifest_hash_sha256: EXPECTED_MEE_11F_OBSERVATION_MANIFEST_HASH,
    generated_at: "2026-06-25T00:00:00.000Z",
    ready_for_broad_backfill_plan: true,
    findings: [],
    summary: {
      query_count: 1,
      request_limit: 1,
      result_limit: 2,
      projected_observation_count: 2,
      unique_listing_count: 2,
      clean_observation_count: 1,
      exclusion_flag_counts: { bulk: 1 },
    },
    request_results: [
      {
        query_key: "query-1",
        query_text: "pokemon card single -bulk",
        strategy: "broad_pokemon_single_card_intake",
        fetched_item_count: 2,
        payload_hash: "response-hash",
      },
    ],
    raw_snapshots: [
      {
        query_key: "query-1",
        source: "ebay_active",
        provider_route: "ebay_browse_api",
        provider_total: 2,
        payload_hash: "response-hash",
        raw_payload: {
          itemSummaries: [
            {
              itemId: "v1|1|0",
              title: "Pokemon Pikachu Holo Card",
              itemWebUrl: "https://www.ebay.com/itm/1",
              price: { value: "10", currency: "USD" },
              condition: "Ungraded",
              seller: { username: "seller1", feedbackScore: 100, feedbackPercentage: "99.5" },
              itemLocation: { country: "US" },
            },
            {
              itemId: "v1|2|0",
              title: "Pokemon Bulk Lot 100 Cards",
              itemWebUrl: "https://www.ebay.com/itm/2",
              price: { value: "20", currency: "USD" },
              condition: "Ungraded",
              seller: { username: "seller2", feedbackScore: 200, feedbackPercentage: "99.0" },
              itemLocation: { country: "US" },
            },
          ],
        },
      },
    ],
    projected_observations: [
      {
        source: "ebay_active",
        source_listing_id: "v1|1|0",
        source_url: "https://www.ebay.com/itm/1",
        listing_title: "Pokemon Pikachu Holo Card",
        listing_format: "fixed_price",
        ask_price: 10,
        shipping_price: null,
        total_ask_price: 10,
        currency: "USD",
        condition_text: "Ungraded",
        seller_key: "seller1",
        observed_at: "2026-06-25T00:00:00.000Z",
        ingestion_exclusion_flags: [],
        listing_evidence_class: "raw_single",
        listing_evidence_tags: [],
        slab_features: { is_slab: false, graders: [], grade: null },
      },
      {
        source: "ebay_active",
        source_listing_id: "v1|2|0",
        source_url: "https://www.ebay.com/itm/2",
        listing_title: "Pokemon Bulk Lot 100 Cards",
        listing_format: "fixed_price",
        ask_price: 20,
        shipping_price: null,
        total_ask_price: 20,
        currency: "USD",
        condition_text: "Ungraded",
        seller_key: "seller2",
        observed_at: "2026-06-25T00:00:00.000Z",
        ingestion_exclusion_flags: ["bulk"],
        listing_evidence_class: "excluded_or_ambiguous",
        listing_evidence_tags: [],
        slab_features: { is_slab: false, graders: [], grade: null },
      },
    ],
    ...overrides,
  };
}

test("MEE-11G prepares broad intake warehouse rows without card candidates or writes", () => {
  const plan = buildMarketListingBroadIntakeBackfillPlanV1({
    smokeArtifact: smokeArtifact(),
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(plan.version, MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_VERSION);
  assert.equal(plan.ready_for_apply_approval, true);
  assert.deepEqual(plan.proposed_table_row_counts, {
    market_listing_acquisition_runs: 1,
    market_listing_query_cache: 1,
    market_listing_raw_snapshots: 2,
    market_listing_observations: 2,
    market_listing_seller_snapshots: 2,
    market_listing_price_events: 2,
    market_listing_card_candidates: 0,
    market_listing_rollups: 0,
  });
  assert.equal(plan.rows.cardCandidateRows.length, 0);
  assert.equal(plan.rows.rollupRows.length, 0);
  assert.equal(plan.rows.priceEventRows[0].event_payload.listing_evidence_class, "raw_single");
  assert.deepEqual(plan.rows.priceEventRows[0].event_payload.listing_evidence_tags, []);
  assert.equal(plan.boundary.provider_calls, false);
  assert.equal(plan.boundary.source_fetches, false);
  assert.equal(plan.boundary.db_writes, false);
  assert.equal(plan.boundary.pricing_observations_writes, false);
  assert.equal(plan.boundary.ebay_active_prices_latest_writes, false);
});

test("MEE-11G blocks mismatched smoke manifests", () => {
  const plan = buildMarketListingBroadIntakeBackfillPlanV1({
    smokeArtifact: smokeArtifact(),
    packageFingerprint: "wrong",
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(plan.ready_for_apply_approval, false);
  assert.ok(plan.findings.includes("package_fingerprint_mismatch"));
});

test("MEE-11G scripts do not fetch sources, write DB tables, or publish prices", () => {
  const moduleSource = readFileSync(new URL("../../backend/pricing/market_listing_broad_intake_backfill_plan_v1.mjs", import.meta.url), "utf8");
  const scriptSource = readFileSync(new URL("../../scripts/audits/market_listing_broad_intake_backfill_plan_v1.mjs", import.meta.url), "utf8");
  const combined = `${moduleSource}\n${scriptSource}`;

  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /\bcreateBackendClient\b|\bsupabase\.from\s*\(|\bclient\.from\s*\(|\b(?:supabase|client|query)\.(?:insert|update|upsert|delete|rpc)\s*\(/);
  assert.doesNotMatch(combined, /\bdelete\s+from\b|\bupdate\s+public\.|\binsert\s+into\b/i);
  assert.doesNotMatch(combined, /\.from\s*\(["']pricing_observations["']\)|\.from\s*\(["']ebay_active_prices_latest["']\)/);
});
