import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPECTED_MEE_09O_PLAN_HASH,
  EXPECTED_MEE_09P_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_09P_REQUEST_MANIFEST_HASH,
  MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_FETCH_VERSION,
  buildRemainingSingleSourceExactSourceFetchReportV1,
} from "../../backend/pricing/market_reference_remaining_single_source_exact_source_fetch_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const request = (sourceName, ordinal) => ({
  ordinal,
  acquisition_request_key: `request-${ordinal}`,
  card_print_id: `00000000-0000-0000-0000-${String(ordinal).padStart(12, "0")}`,
  gv_id: `GV-PK-TEST-${ordinal}`,
  source: sourceName,
  source_type: sourceName === "ebay_active" ? "active_listing" : "manual_review_candidate",
  query_text: `Pokemon Test ${ordinal}`,
  can_publish_price_directly: false,
  needs_review: true,
});

function plan() {
  return {
    package_fingerprint_sha256: EXPECTED_MEE_09P_PACKAGE_FINGERPRINT,
    acquisition_request_manifest_hash_sha256: EXPECTED_MEE_09P_REQUEST_MANIFEST_HASH,
    exact_plan_hash_sha256: EXPECTED_MEE_09O_PLAN_HASH,
    ready_for_fetch_approval: true,
    acquisition_requests: [
      request("ebay_active", 1),
      request("ebay_sold_candidate", 2),
      request("manual_review_candidate", 3),
    ],
  };
}

test("MEE-09Q fetch report keeps evidence local and non-publishable", async () => {
  const report = await buildRemainingSingleSourceExactSourceFetchReportV1({
    acquisitionPlan: plan(),
    generatedAt: "2026-06-25T00:00:00.000Z",
    fetchActiveListings: async (activeRequest) => ({
      request: activeRequest,
      source_fetch_url: "https://api.ebay.com/buy/browse/v1/item_summary/search?q=Pokemon",
      provider_result_count: 1,
      fetched_item_count: 1,
      candidate_evidence: [{
        card_print_id: activeRequest.card_print_id,
        gv_id: activeRequest.gv_id,
        source: "ebay_active",
        source_type: "active_listing",
        source_url: "https://www.ebay.com/itm/123",
        raw_title: "Pokemon Test Card",
        raw_price: 12.34,
        currency: "USD",
        condition_hint: "Near Mint",
        finish_hint: null,
        observed_at: "2026-06-25T00:00:00.000Z",
        match_confidence_hint: "exact_candidate",
        exclusion_flags: ["manual_review_required"],
        needs_review: true,
        raw_payload: {},
        contract_version: "MARKET_EVIDENCE_OBJECT_CONTRACT_V1",
        can_publish_price_directly: false,
      }],
    }),
  });

  assert.equal(report.version, MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_FETCH_VERSION);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(report.summary.candidate_count, 1);
  assert.equal(report.summary.fetch_status_counts.fetched_success, 1);
  assert.equal(report.summary.fetch_status_counts.not_fetched_no_approved_sold_access_path, 1);
  assert.equal(report.summary.fetch_status_counts.seeded_no_provider_fetch, 1);
  assert.equal(report.candidate_evidence[0].can_publish_price_directly, false);
  assert.equal(report.candidate_evidence[0].needs_review, true);
  assert.equal(report.ready_for_review_backfill_plan, true);
});

test("MEE-09Q blocks mismatched source packages", async () => {
  const badPlan = {
    ...plan(),
    package_fingerprint_sha256: "wrong",
  };
  const report = await buildRemainingSingleSourceExactSourceFetchReportV1({
    acquisitionPlan: badPlan,
    generatedAt: "2026-06-25T00:00:00.000Z",
    fetchActiveListings: async () => {
      throw new Error("should not fetch");
    },
  });

  assert.equal(report.ready_for_review_backfill_plan, false);
  assert.ok(report.findings.includes("package_fingerprint_mismatch"));
  assert.equal(report.summary.candidate_count, 0);
});

test("MEE-09Q scripts do not write DB tables or public pricing outputs", () => {
  const moduleSource = source("backend/pricing/market_reference_remaining_single_source_exact_source_fetch_v1.mjs");
  const scriptSource = source("scripts/audits/market_reference_remaining_single_source_exact_source_fetch_v1.mjs");
  const combined = `${moduleSource}\n${scriptSource}`;

  assert.doesNotMatch(combined, /\bcreateBackendClient\b|\bsupabase\.from\s*\(|\bclient\.from\s*\(|\b(?:supabase|client|query)\.(?:insert|update|upsert|delete|rpc)\s*\(/);
  assert.doesNotMatch(combined, /\bdelete\s+from\b|\bupdate\s+public\.|\binsert\s+into\b/i);
  assert.doesNotMatch(combined, /\.from\s*\(["']pricing_observations["']\)|\.from\s*\(["']ebay_active_prices_latest["']\)/);
});
