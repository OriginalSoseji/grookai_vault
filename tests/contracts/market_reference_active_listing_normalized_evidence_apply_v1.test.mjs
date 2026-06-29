import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVE_LISTING_NORMALIZED_SCHEMA_MIGRATION_HASH,
  PACKAGE_ID,
  buildMarketReferenceActiveListingNormalizedEvidenceApplyReportV1,
} from "../../scripts/audits/market_reference_active_listing_normalized_evidence_apply_v1.mjs";
import { EXPECTED_ACTIVE_LISTING_INPUT_COUNT } from "../../backend/pricing/market_reference_active_listing_normalization_plan_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function candidate(index, overrides = {}) {
  return {
    id: `candidate-${index}`,
    card_print_id: `card-${index}`,
    gv_id: `GV-PK-TEST-${index}`,
    source: "ebay_active",
    source_type: "active_listing",
    source_url: `https://www.ebay.com/itm/${index}`,
    raw_title: `Pokemon Test ${index}`,
    raw_price: 100 + index,
    currency: "USD",
    condition_hint: "Ungraded",
    finish_hint: null,
    observed_at: "2026-06-25T00:00:00.000Z",
    match_confidence_hint: "exact_candidate",
    exclusion_flags: ["manual_review_required"],
    needs_review: true,
    can_publish_price_directly: false,
    ...overrides,
  };
}

function candidates() {
  const rows = Array.from({ length: EXPECTED_ACTIVE_LISTING_INPUT_COUNT }, (_, index) => candidate(index + 1));
  rows[0].condition_hint = "Graded";
  return rows;
}

test("MEE-10I dry-run report is ready and non-publishable", async () => {
  const { report } = await buildMarketReferenceActiveListingNormalizedEvidenceApplyReportV1({
    candidates: candidates(),
    duplicateSummary: { checked: true, duplicate_rows: 0 },
    rowCountSummary: { checked: true, ebay_active_normalized_rows: 0, ebay_active_model_eligible_rows: 0 },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.package_id, PACKAGE_ID);
  assert.equal(report.active_listing_normalized_schema_migration_hash_sha256, ACTIVE_LISTING_NORMALIZED_SCHEMA_MIGRATION_HASH);
  assert.equal(report.ready_for_apply, true);
  assert.equal(report.applied, false);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.proposed_table_row_counts.market_reference_normalized_evidence, 15);
  assert.equal(report.proposed_table_row_counts.model_eligible, 0);
  assert.match(report.approval_prompt_for_apply, /model_eligible=false for every row/);
});

test("MEE-10I blocks duplicate remote normalized rows", async () => {
  const { report } = await buildMarketReferenceActiveListingNormalizedEvidenceApplyReportV1({
    candidates: candidates(),
    duplicateSummary: { checked: true, duplicate_rows: 1 },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.ready_for_apply, false);
  assert.ok(report.findings.includes("remote_duplicate_normalized_rows_detected"));
});

test("MEE-10I blocks apply without exact approval", async () => {
  const { report } = await buildMarketReferenceActiveListingNormalizedEvidenceApplyReportV1({
    candidates: candidates(),
    duplicateSummary: { checked: true, duplicate_rows: 0 },
    apply: true,
    approvalText: "next step",
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.ready_for_apply, false);
  assert.equal(report.approval_text_matched, false);
  assert.ok(report.findings.includes("approval_text_mismatch"));
});

test("MEE-10I apply script only targets normalized evidence writes", () => {
  const script = source("scripts/audits/market_reference_active_listing_normalized_evidence_apply_v1.mjs");

  assert.match(script, /insertChunked\(supabase,\s*["']market_reference_normalized_evidence["']/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_prints["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.from\(["']card_printings["']\)/);
  assert.doesNotMatch(script, /\.from\(["']market_reference_candidates["']\)\.insert/);
  assert.doesNotMatch(script, /\.from\(["']market_reference_raw_snapshots["']\)\.insert/);
  assert.doesNotMatch(script, /\.upsert\s*\(|\.delete\s*\(/);
});
