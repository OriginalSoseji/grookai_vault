import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
  EXPECTED_MEE_11L_OBSERVATION_MANIFEST_HASH,
  EXPECTED_MEE_11L_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_11L_RAW_SNAPSHOT_MANIFEST_HASH,
  EXPECTED_MEE_11L_REQUEST_RESULTS_MANIFEST_HASH,
  MARKET_LISTING_ACQUISITION_DAILY_BATCH_BACKFILL_PLAN_VERSION,
  buildMarketListingAcquisitionDailyBatchBackfillPlanV1,
} from "../../backend/pricing/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs";

function writeJsonl(filePath, rows) {
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function fetchArtifact(dir) {
  const requestResults = path.join(dir, "request_results.jsonl");
  const rawSnapshots = path.join(dir, "raw_snapshots.jsonl");
  const observations = path.join(dir, "projected_observations.jsonl");
  writeJsonl(requestResults, [
    {
      query_key: "query-1",
      query_text: "Pokemon Pikachu PSA 10",
      gv_id: "GV-PK-TEST-1",
      strategy: "strict_identity",
      fetch_status: "fetched_success",
      fetched_item_count: 1,
      payload_hash: "payload-hash",
    },
  ]);
  writeJsonl(observations, [
    {
      source: "ebay_active",
      source_listing_id: "v1|1|0",
      listing_title: "Pokemon Pikachu PSA 10 Graded Card",
      listing_format: "fixed_price",
      ask_price: 100,
      shipping_price: 5,
      total_ask_price: 105,
      currency: "USD",
      condition_text: "Graded",
      seller_key: "seller1",
      observed_at: "2026-06-25T00:00:00.000Z",
      listing_evidence_class: "slab",
      listing_evidence_tags: ["slab", "grader_psa", "grade_10"],
      slab_features: { is_slab: true, graders: ["psa"], grade: "10" },
      ingestion_exclusion_flags: [],
      target: { card_print_id: "00000000-0000-0000-0000-000000000001", gv_id: "GV-PK-TEST-1" },
    },
  ]);
  writeJsonl(rawSnapshots, [
    {
      query_key: "query-1",
      source: "ebay_active",
      provider_route: "ebay_browse_api",
      provider_total: 1,
      payload_hash: "payload-hash",
      gv_id: "GV-PK-TEST-1",
      strategy: "strict_identity",
      raw_payload: {
        itemSummaries: [
          {
            itemId: "v1|1|0",
            title: "Pokemon Pikachu PSA 10 Graded Card",
            itemWebUrl: "https://www.ebay.com/itm/1",
            price: { value: "100", currency: "USD" },
            shippingOptions: [{ shippingCost: { value: "5", currency: "USD" } }],
            condition: "Graded",
            seller: { username: "seller1", feedbackScore: 10, feedbackPercentage: "100" },
            itemLocation: { country: "US" },
          },
        ],
      },
      projected_observations: [
        {
          source_listing_id: "v1|1|0",
          listing_title: "Pokemon Pikachu PSA 10 Graded Card",
          listing_format: "fixed_price",
          ask_price: 100,
          shipping_price: 5,
          total_ask_price: 105,
          currency: "USD",
          condition_text: "Graded",
          seller_key: "seller1",
          observed_at: "2026-06-25T00:00:00.000Z",
          listing_evidence_class: "slab",
          listing_evidence_tags: ["slab", "grader_psa", "grade_10"],
          slab_features: { is_slab: true, graders: ["psa"], grade: "10" },
          ingestion_exclusion_flags: [],
          target: { card_print_id: "00000000-0000-0000-0000-000000000001", gv_id: "GV-PK-TEST-1" },
        },
      ],
    },
  ]);

  return {
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1",
    package_fingerprint_sha256: EXPECTED_MEE_11L_PACKAGE_FINGERPRINT,
    request_results_manifest_hash_sha256: EXPECTED_MEE_11L_REQUEST_RESULTS_MANIFEST_HASH,
    raw_snapshot_manifest_hash_sha256: EXPECTED_MEE_11L_RAW_SNAPSHOT_MANIFEST_HASH,
    projected_observation_manifest_hash_sha256: EXPECTED_MEE_11L_OBSERVATION_MANIFEST_HASH,
    schema_migration_hash_sha256: EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
    generated_at: "2026-06-25T00:00:00.000Z",
    ready_for_local_db_backfill_plan: true,
    boundary: { db_writes: false },
    summary: {
      approved_request_count: 1,
      attempted_request_count: 1,
      projected_observation_count: 1,
      fetch_status_counts: { fetched_success: 1 },
    },
    artifacts: {
      request_results_jsonl: requestResults,
      raw_snapshots_jsonl: rawSnapshots,
      projected_observations_jsonl: observations,
    },
  };
}

test("MEE-11M prepares streamed daily batch warehouse rows without writes", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mee-11m-"));
  try {
    const plan = await buildMarketListingAcquisitionDailyBatchBackfillPlanV1({
      fetchArtifact: fetchArtifact(dir),
      outputDir: path.join(dir, "rows"),
      generatedAt: "2026-06-25T00:00:00.000Z",
    });

    assert.equal(plan.version, MARKET_LISTING_ACQUISITION_DAILY_BATCH_BACKFILL_PLAN_VERSION);
    assert.equal(plan.ready_for_apply_approval, true);
    assert.equal(plan.proposed_table_row_counts.market_listing_observations, 1);
    assert.equal(plan.proposed_table_row_counts.market_listing_card_candidates, 0);
    assert.equal(plan.proposed_table_row_counts.market_listing_rollups, 0);
    assert.equal(plan.summary.evidence_class_counts.slab, 1);
    assert.equal(plan.boundary.db_writes, false);
    assert.match(readFileSync(plan.row_files.priceEventRows, "utf8"), /"listing_evidence_class":"slab"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MEE-11M blocks mismatched fetch artifact hashes", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mee-11m-"));
  try {
    const plan = await buildMarketListingAcquisitionDailyBatchBackfillPlanV1({
      fetchArtifact: {
        ...fetchArtifact(dir),
        package_fingerprint_sha256: "wrong",
      },
      outputDir: path.join(dir, "rows"),
    });

    assert.equal(plan.ready_for_apply_approval, false);
    assert.ok(plan.findings.includes("package_fingerprint_mismatch"));
    assert.equal(plan.proposed_table_row_counts.market_listing_observations, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MEE-11M allows dynamic nightly fetch hashes only when explicitly requested", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mee-11m-"));
  try {
    const plan = await buildMarketListingAcquisitionDailyBatchBackfillPlanV1({
      fetchArtifact: {
        ...fetchArtifact(dir),
        package_fingerprint_sha256: "dynamic-package",
        request_results_manifest_hash_sha256: "dynamic-request-results",
        raw_snapshot_manifest_hash_sha256: "dynamic-raw",
        projected_observation_manifest_hash_sha256: "dynamic-observations",
      },
      outputDir: path.join(dir, "rows"),
      allowDynamicPlan: true,
    });

    assert.equal(plan.ready_for_apply_approval, true);
    assert.deepEqual(plan.findings, []);
    assert.equal(plan.proposed_table_row_counts.market_listing_observations, 1);
    assert.equal(plan.proposed_table_row_counts.market_listing_price_events, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
