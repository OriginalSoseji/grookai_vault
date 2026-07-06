import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
  EXPECTED_MEE_11D_SOURCE_FINGERPRINT,
  EXPECTED_MEE_11K_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_11K_REQUEST_MANIFEST_HASH,
  MARKET_LISTING_ACQUISITION_DAILY_BATCH_FETCH_VERSION,
  buildMarketListingAcquisitionDailyBatchFetchV1,
} from "../../backend/pricing/market_listing_acquisition_daily_batch_fetch_v1.mjs";

function batchPlan() {
  return {
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-PLAN-V1",
    package_fingerprint_sha256: EXPECTED_MEE_11K_PACKAGE_FINGERPRINT,
    request_manifest_hash_sha256: EXPECTED_MEE_11K_REQUEST_MANIFEST_HASH,
    source_package_fingerprint_sha256: EXPECTED_MEE_11D_SOURCE_FINGERPRINT,
    schema_migration_hash_sha256: EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
    ready_for_acquisition_approval: true,
    boundary: {
      provider_calls: false,
      db_writes: false,
    },
    acquisition_requests: [
      {
        ordinal: 1,
        query_key: "query-1",
        source: "ebay_active",
        provider_route: "ebay_browse_api",
        card_print_id: "00000000-0000-0000-0000-000000000001",
        gv_id: "GV-PK-TEST-1",
        strategy: "strict_identity",
        query_text: "Pokemon Pikachu PSA 10",
        query_filters: { limit: 200 },
      },
    ],
  };
}

test("MEE-11L streams approved daily batch fetch artifacts without DB writes", async () => {
  const artifactDir = mkdtempSync(path.join(tmpdir(), "mee-11l-"));
  try {
    const report = await buildMarketListingAcquisitionDailyBatchFetchV1({
      batchPlan: batchPlan(),
      artifactDir,
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
        raw_payload: { total: 1 },
        projected_observations: [
          {
            source: "ebay_active",
            source_listing_id: "v1|1|0",
            listing_title: "Pokemon Pikachu PSA 10 Graded Card",
            total_ask_price: 100,
            currency: "USD",
            listing_evidence_class: "slab",
            listing_evidence_tags: ["slab", "grader_psa", "grade_10"],
            ingestion_exclusion_flags: [],
            observed_at: observedAt,
            target: {
              card_print_id: request.card_print_id,
              gv_id: request.gv_id,
            },
          },
        ],
      }),
    });

    assert.equal(report.version, MARKET_LISTING_ACQUISITION_DAILY_BATCH_FETCH_VERSION);
    assert.equal(report.ready_for_local_db_backfill_plan, true);
    assert.equal(report.summary.attempted_request_count, 1);
    assert.equal(report.summary.slab_observation_count, 1);
    assert.equal(report.boundary.db_writes, false);
    assert.equal(report.boundary.market_listing_writes, false);
    assert.match(readFileSync(report.artifacts.projected_observations_jsonl, "utf8"), /"listing_evidence_class":"slab"/);
  } finally {
    rmSync(artifactDir, { recursive: true, force: true });
  }
});

test("MEE-11L blocks mismatched batch approval hashes", async () => {
  const artifactDir = mkdtempSync(path.join(tmpdir(), "mee-11l-"));
  try {
    const report = await buildMarketListingAcquisitionDailyBatchFetchV1({
      batchPlan: {
        ...batchPlan(),
        package_fingerprint_sha256: "wrong",
      },
      artifactDir,
      fetchListing: async () => {
        throw new Error("should not fetch");
      },
    });

    assert.equal(report.ready_for_local_db_backfill_plan, false);
    assert.ok(report.findings.includes("package_fingerprint_mismatch"));
    assert.equal(report.summary.attempted_request_count, 0);
  } finally {
    rmSync(artifactDir, { recursive: true, force: true });
  }
});

test("MEE-11L allows dynamic nightly batch hashes only when explicitly requested", async () => {
  const artifactDir = mkdtempSync(path.join(tmpdir(), "mee-11l-"));
  try {
    const report = await buildMarketListingAcquisitionDailyBatchFetchV1({
      batchPlan: {
        ...batchPlan(),
        package_fingerprint_sha256: "dynamic-package",
        request_manifest_hash_sha256: "dynamic-request-manifest",
        source_package_fingerprint_sha256: "dynamic-source",
      },
      artifactDir,
      allowDynamicPlan: true,
      fetchListing: async (request) => ({
        query_key: request.query_key,
        source: "ebay_active",
        provider_route: "ebay_browse_api",
        response_status: 200,
        provider_total: 1,
        fetched_item_count: 1,
        payload_hash: "dynamic",
        raw_payload: { total: 1 },
        projected_observations: [
          {
            source: "ebay_active",
            source_listing_id: "v1|dynamic|0",
            listing_title: "Pokemon Pikachu PSA 10 Graded Card",
            total_ask_price: 100,
            currency: "USD",
            listing_evidence_class: "slab",
            listing_evidence_tags: ["slab", "grader_psa", "grade_10"],
            ingestion_exclusion_flags: [],
            target: {
              card_print_id: request.card_print_id,
              gv_id: request.gv_id,
            },
          },
        ],
      }),
    });

    assert.equal(report.mode, "dynamic_approved_provider_fetch_local_artifacts_only");
    assert.equal(report.ready_for_local_db_backfill_plan, true);
    assert.deepEqual(report.findings, []);
    assert.equal(report.summary.attempted_request_count, 1);
  } finally {
    rmSync(artifactDir, { recursive: true, force: true });
  }
});
