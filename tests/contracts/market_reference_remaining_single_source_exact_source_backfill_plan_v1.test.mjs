import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_09Q_CANDIDATE_COUNT,
  EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
  MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_BACKFILL_PLAN_VERSION,
  buildRemainingSingleSourceExactSourceBackfillPlanV1,
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
    candidate_evidence: Array.from({ length: EXPECTED_MEE_09Q_CANDIDATE_COUNT }, (_, index) => candidate(index + 1)),
    ...overrides,
  };
}

test("MEE-09R prepares active-listing candidate rows but blocks apply against reference-only schema", () => {
  const plan = buildRemainingSingleSourceExactSourceBackfillPlanV1({
    fetchArtifact: fetchArtifact(),
    candidateEvidenceManifestHash: EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
    sourcePackageFingerprint: EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(plan.version, MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_BACKFILL_PLAN_VERSION);
  assert.equal(plan.proposed_table_row_counts.market_reference_candidates_proposed, EXPECTED_MEE_09Q_CANDIDATE_COUNT);
  assert.equal(plan.proposed_table_row_counts.market_reference_normalized_evidence_proposed, 0);
  assert.equal(plan.ready_for_apply_package, false);
  assert.equal(plan.ready_for_schema_extension_plan, true);
  assert.ok(plan.findings.includes("warehouse_schema_does_not_allow_ebay_active_source"));
  assert.ok(plan.findings.includes("warehouse_schema_requires_reference_source_type_only"));
  assert.ok(plan.findings.includes("active_listing_evidence_requires_market_reference_schema_extension"));
  assert.equal(plan.rows.candidateRows[0].needs_review, true);
  assert.equal(plan.rows.candidateRows[0].can_publish_price_directly, false);
  assert.equal(plan.rows.candidateRows[0].source_type, "active_listing");
});

test("MEE-09R blocks mismatched manifests before any apply package", () => {
  const plan = buildRemainingSingleSourceExactSourceBackfillPlanV1({
    fetchArtifact: fetchArtifact(),
    candidateEvidenceManifestHash: "wrong",
    sourcePackageFingerprint: EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(plan.ready_for_apply_package, false);
  assert.equal(plan.ready_for_schema_extension_plan, false);
  assert.ok(plan.findings.includes("candidate_evidence_manifest_hash_mismatch"));
});

test("MEE-09R scripts do not fetch sources, write DB tables, or publish prices", () => {
  const moduleSource = source("backend/pricing/market_reference_remaining_single_source_exact_source_backfill_plan_v1.mjs");
  const scriptSource = source("scripts/audits/market_reference_remaining_single_source_exact_source_backfill_plan_v1.mjs");
  const combined = `${moduleSource}\n${scriptSource}`;

  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /\bcreateBackendClient\b|\bsupabase\.from\s*\(|\bclient\.from\s*\(|\b(?:supabase|client|query)\.(?:insert|update|upsert|delete|rpc)\s*\(/);
  assert.doesNotMatch(combined, /\bdelete\s+from\b|\bupdate\s+public\.|\binsert\s+into\b/i);
  assert.doesNotMatch(combined, /\.from\s*\(["']pricing_observations["']\)|\.from\s*\(["']ebay_active_prices_latest["']\)/);
});
