import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildMarketReferenceWarehouseBackfillManifestV1,
  referenceCandidateHashV1,
} from "../../backend/pricing/market_reference_warehouse_backfill_manifest_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const batch = {
  summary: { target_count: 1 },
};

const candidate = {
  card_print_id: "11111111-1111-1111-1111-111111111111",
  gv_id: "GV-PK-BS-4",
  source: "tcgcsv_reference",
  source_type: "reference_price",
  source_url: "https://www.tcgplayer.com/product/1",
  raw_title: "Charizard marketPrice",
  raw_price: 100,
  currency: "USD",
  condition_hint: "tcgcsv:marketPrice",
  finish_hint: "holo",
  observed_at: "2026-06-25T00:00:00.000Z",
  match_confidence_hint: "high",
  exclusion_flags: ["manual_review_required"],
  needs_review: true,
  can_publish_price_directly: false,
  raw_payload: {
    group_id: 604,
    product_id: 1,
    subtype_name: "Holofoil",
    metric: "marketPrice",
  },
};

const acquisition = {
  generated_at: "2026-06-25T00:00:00.000Z",
  phase: "MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1",
  summary: { candidate_evidence_count: 1 },
  candidate_evidence: [candidate],
};

const normalized = {
  generated_at: "2026-06-25T00:01:00.000Z",
  phase: "MEE-06C_NORMALIZED_REFERENCE_EVIDENCE_V1",
  input_summary: { source_phase: "MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1" },
  counts: { source_counts: { tcgcsv_reference: 1 } },
  summary: { normalized_evidence_count: 1 },
  normalized_evidence: [{
    ...candidate,
    raw_price: undefined,
    normalized_price: 100,
    normalized_currency: "USD",
    metric_key: "marketprice",
    metric_family: "reference_market_bucket",
    model_disposition: "reference_model_candidate",
    model_eligible: true,
    evidence_quality_score: 0.82,
    weight_hint: 0.82,
    quality_flags: [],
    normalizer_version: "MEE_06C_REFERENCE_NORMALIZER_V1",
  }],
};

const coverageReport = {
  generated_at: "2026-06-25T00:02:00.000Z",
  phase: "MEE-06D_FREE_REFERENCE_COVERAGE_GAP_V1",
  summary: {
    target_count: 1,
    covered_target_count: 1,
    uncovered_target_count: 0,
  },
  sources: {},
  counts: {},
  samples: {},
};

test("MEE-08A builds a warehouse backfill manifest without DB writes", () => {
  const manifest = buildMarketReferenceWarehouseBackfillManifestV1({
    batch,
    acquisitions: [acquisition],
    normalizedArtifacts: [normalized],
    coverageReport,
    generatedAt: "2026-06-25T00:03:00.000Z",
  });

  assert.equal(manifest.mode, "artifact_only_backfill_manifest_no_db_writes");
  assert.equal(manifest.boundary.provider_calls, false);
  assert.equal(manifest.boundary.source_fetches, false);
  assert.equal(manifest.boundary.db_writes, false);
  assert.equal(manifest.boundary.pricing_observations_writes, false);
  assert.equal(manifest.boundary.public_price_publication, false);
  assert.deepEqual(manifest.proposed_table_row_counts, {
    market_reference_acquisition_runs: 3,
    market_reference_raw_snapshots: 1,
    market_reference_candidates: 1,
    market_reference_normalized_evidence: 1,
    market_reference_coverage_reports: 1,
  });
  assert.equal(manifest.ready_for_db_backfill_apply_plan, true);
  assert.deepEqual(manifest.findings, []);
});

test("MEE-08A candidate hashes match acquisition and normalized rows", () => {
  const acquisitionHash = referenceCandidateHashV1(candidate);
  const normalizedHash = referenceCandidateHashV1(normalized.normalized_evidence[0]);

  assert.equal(acquisitionHash, normalizedHash);
});

test("MEE-08A script and plan stay non-writing and non-publishing", () => {
  const moduleSource = source("backend/pricing/market_reference_warehouse_backfill_manifest_v1.mjs");
  const scriptSource = source("scripts/audits/market_reference_warehouse_backfill_manifest_v1.mjs");
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_08A_MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_V1.md");
  const combined = `${moduleSource}\n${scriptSource}`;

  assert.match(plan, /No database writes/);
  assert.match(plan, /write `pricing_observations`/);
  assert.match(plan, /write `ebay_active_prices_latest`/);
  assert.doesNotMatch(combined, /createBackendClient|fetch\s*\(|axios|https\.request|curl\.exe|execFile/);
  assert.doesNotMatch(combined, /createBackendClient|createClient|supabase\.from|\.insert\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
