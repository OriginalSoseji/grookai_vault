import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
  EXPECTED_MEE_11D_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_11D_REQUEST_MANIFEST_HASH,
  MARKET_LISTING_ACQUISITION_SMOKE_FETCH_VERSION,
  buildMarketListingAcquisitionSmokeFetchReportV1,
} from "../../backend/pricing/market_listing_acquisition_smoke_fetch_v1.mjs";

function dryRunPlan() {
  return {
    package_fingerprint_sha256: EXPECTED_MEE_11D_PACKAGE_FINGERPRINT,
    request_manifest_hash_sha256: EXPECTED_MEE_11D_REQUEST_MANIFEST_HASH,
    schema_migration_hash_sha256: EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
    ready_for_acquisition_approval: true,
    acquisition_requests: [
      {
        query_key: "q1",
        source: "ebay_active",
        provider_route: "ebay_browse_api",
        card_print_id: "00000000-0000-0000-0000-000000000001",
        gv_id: "GV-PK-TEST-1",
        strategy: "strict_identity",
        query_text: "Pokemon Pikachu 1",
      },
    ],
  };
}

test("MEE-11E smoke fetch builds local artifacts without DB writes", async () => {
  const report = await buildMarketListingAcquisitionSmokeFetchReportV1({
    dryRunPlan: dryRunPlan(),
    generatedAt: "2026-06-25T00:00:00.000Z",
    fetchListing: async (request, { observedAt }) => ({
      query_key: request.query_key,
      source: "ebay_active",
      provider_route: "ebay_browse_api",
      source_fetch_url: "https://api.ebay.com/buy/browse/v1/item_summary/search?q=Pokemon",
      response_status: 200,
      provider_total: 1,
      fetched_item_count: 1,
      payload_hash: "payload-hash",
      raw_payload: { total: 1, itemSummaries: [{ itemId: "v1|1|0", title: "Pokemon Pikachu" }] },
      projected_observations: [
        {
          source: "ebay_active",
          provider_route: "ebay_browse_api",
          source_listing_id: "v1|1|0",
          listing_title: "Pokemon Pikachu PSA 9 Graded Card",
          condition_text: "Graded",
          total_ask_price: 5,
          currency: "USD",
          observed_at: observedAt,
          target: {
            card_print_id: request.card_print_id,
            gv_id: request.gv_id,
          },
        },
      ],
    }),
  });

  assert.equal(report.version, MARKET_LISTING_ACQUISITION_SMOKE_FETCH_VERSION);
  assert.equal(report.ready_for_local_db_backfill_plan, true);
  assert.equal(report.summary.attempted_request_count, 1);
  assert.equal(report.summary.fetched_item_count, 1);
  assert.equal(report.summary.projected_observation_count, 1);
  assert.equal(report.projected_observations[0].listing_evidence_class, "slab");
  assert.deepEqual(report.projected_observations[0].listing_evidence_tags, ["slab", "grader_psa", "grade_9"]);
  assert.equal(report.boundary.provider_calls, true);
  assert.equal(report.boundary.local_artifacts_only, true);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.market_listing_writes, false);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(report.boundary.app_visible_pricing, false);
});

test("MEE-11E blocks mismatched dry-run approval hashes", async () => {
  const badPlan = {
    ...dryRunPlan(),
    package_fingerprint_sha256: "wrong",
  };
  const report = await buildMarketListingAcquisitionSmokeFetchReportV1({
    dryRunPlan: badPlan,
    fetchListing: async () => {
      throw new Error("should not fetch");
    },
  });

  assert.equal(report.ready_for_local_db_backfill_plan, false);
  assert.ok(report.findings.includes("package_fingerprint_mismatch"));
  assert.equal(report.summary.attempted_request_count, 0);
});

test("MEE-11E script does not write database or pricing surfaces", () => {
  const script = readFileSync(new URL("../../scripts/audits/market_listing_acquisition_smoke_fetch_v1.mjs", import.meta.url), "utf8");

  assert.doesNotMatch(script, /\.from\(["']market_listing_/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
});
