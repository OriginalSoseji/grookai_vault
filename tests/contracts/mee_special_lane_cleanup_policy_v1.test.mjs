import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const packageDir = "docs/audits/market_evidence_engine_v1/MEE-SPECIAL-LANE-CLEANUP-POLICY-V1";
const contractPath = "docs/contracts/MEE_SPECIAL_LANE_CLEANUP_POLICY_V1.md";
const markdownPath = `${packageDir}.md`;
const summaryPath = `${packageDir}/special_lane_summary.json`;
const reportPath = `${packageDir}/report.json`;
const readbackSqlPath = "docs/sql/mee_special_lane_cleanup_policy_v1_readback.sql";

test("special-lane cleanup policy is plan-only", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-SPECIAL-LANE-CLEANUP-POLICY-V1");
  assert.equal(report.db_writes, false);
  assert.equal(report.cleanup_event_inserts, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.source_fetches, false);
  assert.equal(report.function_invocation, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.equal(report.public_price_rollups, false);
});

test("special-lane cleanup audit covers expected rows and families", () => {
  const summary = loadJson(summaryPath);

  assert.equal(summary.total_rows, 39180);
  assert.equal(summary.distinct_candidate_ids, 39180);
  assert.equal(summary.distinct_card_prints, 338);
  assert.equal(summary.public_boundary_leak_rows, 0);
  assert.deepEqual(summary.rows_by_family, {
    base_print_run: 252,
    mcdonalds: 3658,
    mep_black_star_promos: 6658,
    promo_or_alt_distribution: 3599,
    trainer_kit: 14306,
    world_championship_deck: 10707,
  });
});

test("special-lane policy maps each family to a handling rule", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.family_handling, {
    base_print_run: "print_run_exactness_required",
    mcdonalds: "exact_card_evidence_required",
    mep_black_star_promos: "exact_card_or_program_evidence_required",
    promo_or_alt_distribution: "distribution_lane_review_required",
    trainer_kit: "separate_source_matching_required",
    world_championship_deck: "exact_card_evidence_required",
  });
});

test("special-lane readback SQL is read-only", () => {
  const sql = read(readbackSqlPath);

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /apply_market_evidence_review_action_v1\s*\(/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
});

test("special-lane cleanup artifacts exist and hash", () => {
  for (const artifactPath of [contractPath, markdownPath, summaryPath, reportPath, readbackSqlPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});
