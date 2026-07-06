import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE core internal review workflow report defines the current review queue safely", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1");
  assert.equal(report.mode, "plan_only_internal_review_workflow");
  assert.deepEqual(report.findings, []);

  assert.equal(report.audit.card_count, 2152);
  assert.deepEqual(report.audit.lane_counts, {
    candidate_review: 1536,
    low_signal_monitor: 380,
    high_signal_review: 213,
    classification_review: 19,
    reference_only_review: 4,
  });
  assert.deepEqual(report.audit.source_mix, {
    active_only: 1159,
    both_reference_and_active: 78,
    neither: 0,
    reference_only: 915,
  });
  assert.equal(report.audit.internal_rollup_candidate_rows, 1749);
  assert.equal(report.audit.mixed_raw_slab_rows, 574);
  assert.equal(report.audit.publishable_rows, 0);
  assert.equal(report.audit.app_visible_rows, 0);
  assert.equal(report.audit.market_truth_rows, 0);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core internal review workflow contract has required lanes and hard blockers", () => {
  const contract = read("docs/contracts/MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md");

  for (const lane of [
    "high_signal_review",
    "candidate_review",
    "classification_review",
    "reference_only_review",
    "low_signal_monitor",
  ]) {
    assert.match(contract, new RegExp(`### ${lane}`));
  }

  assert.match(contract, /raw_single_count and slab_count must never be combined/);
  assert.match(contract, /Reference-only cards cannot become market truth or public pricing/);
  assert.match(contract, /active listings are labeled as asking-price evidence only/);
  assert.match(contract, /Publication-gate minimums are explicitly out of scope/);
  assert.match(contract, /This is not a public pricing contract/);
});

test("MEE core internal review workflow SQL readback stays read-only and internal", () => {
  const sql = read("docs/sql/mee_core_internal_review_workflow_v1_readback.sql");

  assert.match(sql, /v_market_evidence_card_review_queue_v1/);
  assert.match(sql, /v_market_evidence_card_signal_summary_v1/);
  assert.match(sql, /publishable_count/);
  assert.match(sql, /app_visible_count/);
  assert.match(sql, /market_truth_count/);
  assert.match(sql, /mixed_raw_slab_cards/);

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bv_card_pricing_ui_v1\b/i);
});

test("MEE core internal review workflow generator and artifacts are local-plan only", () => {
  const script = read("scripts/audits/market_evidence_internal_review_workflow_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1/);
  assert.match(script, /db_writes: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /public_price_rollups: false/);

  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /https\.request/);

  for (const artifactPath of [
    "docs/contracts/MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1/report.json",
    "docs/sql/mee_core_internal_review_workflow_v1_readback.sql",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
