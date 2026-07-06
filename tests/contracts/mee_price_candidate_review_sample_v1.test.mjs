import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const scriptPath = "scripts/audits/market_evidence_price_candidate_review_sample_v1.mjs";
const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-REVIEW-SAMPLE-V1.md";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-REVIEW-SAMPLE-V1/report.json";

test("MEE price candidate review sample is read-only and internal", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-PRICE-CANDIDATE-REVIEW-SAMPLE-V1");
  assert.equal(report.mode, "read_only_internal_price_candidate_review_sample");
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.provider_calls, false);
  assert.equal(report.boundary.source_fetches, false);
  assert.equal(report.boundary.function_invocation, false);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(report.boundary.public_pricing_views, false);
  assert.equal(report.boundary.app_visible_pricing, false);
  assert.equal(report.boundary.public_price_rollups, false);
});

test("MEE price candidate review sample preserves current queue totals", () => {
  const { readback } = loadJson(reportPath);

  assert.equal(readback.overview.total_rows, 16833);
  assert.equal(readback.overview.reviewer_candidate_rows, 1808);
  assert.equal(readback.overview.active_listing_rows, 2261);
  assert.equal(readback.overview.reference_rows, 14572);
  assert.equal(readback.overview.raw_single_rows, 1198);
  assert.equal(readback.overview.slab_rows, 1063);
  assert.equal(readback.overview.high_value_manual_queue_rows, 142);
  assert.equal(readback.overview.high_value_review_rows, 190);

  assert.equal(readback.public_boundary.can_publish_price_directly_rows, 0);
  assert.equal(readback.public_boundary.publishable_rows, 0);
  assert.equal(readback.public_boundary.app_visible_rows, 0);
  assert.equal(readback.public_boundary.market_truth_rows, 0);
});

test("MEE price candidate review sample keeps review recommendations non-public", () => {
  const { readback } = loadJson(reportPath);
  const samples = [
    ...readback.raw_single_ready_samples,
    ...readback.raw_single_high_value_samples,
    ...readback.slab_ready_samples,
    ...readback.slab_high_value_samples,
    ...readback.spread_risk_samples,
  ];

  assert.ok(samples.length > 0);
  assert.ok(samples.some((row) => row.review_recommendation === "ready_for_internal_policy_review"));
  assert.ok(samples.some((row) => row.review_recommendation === "manual_high_value_review"));
  assert.ok(samples.some((row) => row.review_recommendation === "hold_for_special_lane_policy"));
  assert.ok(samples.some((row) => row.quality_flags.includes("wide_price_spread")));
  assert.ok(samples.every((row) => !["publish", "app_visible", "market_truth"].includes(row.review_recommendation)));
});

test("MEE price candidate review sample script does not mutate remote pricing state", () => {
  const source = read(scriptPath);

  assert.match(source, /v_market_evidence_price_candidate_review_queue_v1/);
  assert.match(source, /writeFileSync\(JSON_PATH/);
  assert.doesNotMatch(source, /\bclient\.query\(\s*`?\s*(insert|update|delete|merge|truncate|alter|drop|create)\b/i);
  assert.doesNotMatch(source, /\b(insert|update|delete|merge)\s+(into\s+)?(public\.)?pricing_observations\b/i);
  assert.doesNotMatch(source, /\b(insert|update|delete|merge)\s+(into\s+)?(public\.)?ebay_active_prices_latest\b/i);
  assert.doesNotMatch(source, /can_publish_price_directly:\s*true/i);
  assert.doesNotMatch(source, /app_visible:\s*true/i);
  assert.doesNotMatch(source, /market_truth:\s*true/i);
});

test("MEE price candidate review sample artifacts exist", () => {
  for (const artifactPath of [scriptPath, markdownPath, reportPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
