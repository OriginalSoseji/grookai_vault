import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVE_LISTING_SCHEMA_MIGRATION_HASH,
  PACKAGE_ID,
  SOURCE_BACKFILL_PLAN_FINGERPRINT,
  buildRemainingSingleSourceExactSourceBackfillApplyReportV1,
} from "../../scripts/audits/market_reference_remaining_single_source_exact_source_backfill_apply_v1.mjs";
import {
  EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_09Q_CANDIDATE_COUNT,
  EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
} from "../../backend/pricing/market_reference_remaining_single_source_exact_source_backfill_plan_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function candidate(index) {
  return {
    card_print_id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
    gv_id: `GV-PK-TEST-${index}`,
    source: "ebay_active",
    source_type: "active_listing",
    source_url: `https://www.ebay.com/itm/${1000 + index}`,
    raw_title: `Pokemon Test Active Listing ${index}`,
    raw_price: 100 + index,
    currency: "USD",
    condition_hint: "Ungraded",
    finish_hint: null,
    observed_at: "2026-06-25T00:00:00.000Z",
    match_confidence_hint: "exact_candidate",
    exclusion_flags: ["manual_review_required"],
    needs_review: true,
    can_publish_price_directly: false,
    raw_payload: {
      provider: "ebay_browse",
      item_id: `v1|${1000 + index}|0`,
    },
  };
}

function fetchArtifact(overrides = {}) {
  return {
    ready_for_review_backfill_plan: true,
    findings: [],
    candidate_evidence_manifest_hash_sha256: EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
    source_package_fingerprint_sha256: EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
    candidate_evidence: Array.from({ length: EXPECTED_MEE_09Q_CANDIDATE_COUNT }, (_, index) => candidate(index + 1)),
    ...overrides,
  };
}

test("MEE-10C dry-run report is ready but does not write DB", async () => {
  const { report } = await buildRemainingSingleSourceExactSourceBackfillApplyReportV1({
    fetchArtifact: fetchArtifact(),
    remoteCollision: { checked: true, candidate_hashes_checked: 15, candidate_hash_collisions: 0 },
    remoteSchema: { checked: true },
    remoteRowCounts: { checked: true, ebay_active_candidate_rows: 0 },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.package_id, PACKAGE_ID);
  assert.equal(report.source_backfill_plan_fingerprint_sha256, SOURCE_BACKFILL_PLAN_FINGERPRINT);
  assert.equal(report.active_listing_schema_migration_hash_sha256, ACTIVE_LISTING_SCHEMA_MIGRATION_HASH);
  assert.equal(report.ready_for_apply, true);
  assert.equal(report.applied, false);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.proposed_table_row_counts.market_reference_candidates, 15);
  assert.equal(report.proposed_table_row_counts.market_reference_normalized_evidence, 0);
  assert.match(report.approval_prompt_for_apply, /insert 15 reviewed ebay_active active-listing candidate rows/);
});

test("MEE-10C apply blocks without exact approval", async () => {
  const { report } = await buildRemainingSingleSourceExactSourceBackfillApplyReportV1({
    fetchArtifact: fetchArtifact(),
    remoteCollision: { checked: true, candidate_hashes_checked: 15, candidate_hash_collisions: 0 },
    apply: true,
    approvalText: "next step",
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.ready_for_apply, false);
  assert.equal(report.approval_text_matched, false);
  assert.ok(report.findings.includes("approval_text_mismatch"));
});

test("MEE-10C blocks remote candidate hash collisions", async () => {
  const { report } = await buildRemainingSingleSourceExactSourceBackfillApplyReportV1({
    fetchArtifact: fetchArtifact(),
    remoteCollision: { checked: true, candidate_hashes_checked: 15, candidate_hash_collisions: 1 },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.ready_for_apply, false);
  assert.ok(report.findings.includes("remote_candidate_hash_collisions_detected"));
});

test("MEE-10C apply script only targets internal candidate warehouse writes", () => {
  const script = source("scripts/audits/market_reference_remaining_single_source_exact_source_backfill_apply_v1.mjs");

  assert.match(script, /insertChunked\(supabase,\s*["']market_reference_candidates["']/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_prints["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.from\(["']card_printings["']\)/);
  assert.doesNotMatch(script, /\.from\(["']market_reference_normalized_evidence["']\)\.insert/);
  assert.doesNotMatch(script, /\.from\(["']market_reference_raw_snapshots["']\)\.insert/);
  assert.doesNotMatch(script, /\.upsert\s*\(|\.delete\s*\(/);
});
