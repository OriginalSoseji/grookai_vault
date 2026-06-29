import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE core internal evidence read model plan is complete and non-public", () => {
  const reportPath =
    "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1/report.json";
  const report = JSON.parse(read(reportPath));

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-EVIDENCE-READ-MODEL-V1");
  assert.equal(report.mode, "plan_only_internal_read_model");
  assert.deepEqual(report.findings, []);

  assert.equal(report.audit.observation_rows_read, 119628);
  assert.equal(report.audit.final_lifecycle_events_read, 119628);
  assert.equal(report.audit.cards_with_evidence, 2088);
  assert.equal(report.audit.cards_with_reference_evidence, 927);
  assert.equal(report.audit.cards_with_active_listing_evidence, 1224);
  assert.equal(report.audit.cards_with_both_reference_and_active, 63);
  assert.equal(report.audit.cards_with_internal_rollup_candidate_flag, 1539);

  assert.equal(report.audit.cards_with_any_publishable_flag, 0);
  assert.equal(report.audit.cards_with_any_app_visible_flag, 0);
  assert.equal(report.audit.cards_with_any_market_truth_flag, 0);

  assert.equal(report.read_model_candidates.length, 2);
  assert.equal(report.read_model_candidates[0].public, false);
  assert.equal(report.read_model_candidates[0].app_visible, false);
  assert.equal(report.read_model_candidates[0].market_truth, false);
  assert.equal(report.read_model_candidates[1].public, false);
  assert.equal(report.read_model_candidates[1].app_visible, false);
  assert.equal(report.read_model_candidates[1].market_truth, false);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1.md",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1.md",
    "docs/sql/mee_core_internal_evidence_read_model_v1_view_candidates.sql",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core internal evidence read model SQL candidate stays read-only and isolated", () => {
  const sql = read("docs/sql/mee_core_internal_evidence_read_model_v1_view_candidates.sql");

  assert.match(sql, /v_market_evidence_card_signal_summary_v1/);
  assert.match(sql, /v_market_evidence_card_review_queue_v1/);
  assert.match(sql, /security_invoker = true/);
  assert.match(sql, /false as publishable/);
  assert.match(sql, /false as app_visible/);
  assert.match(sql, /false as market_truth/);

  assert.doesNotMatch(sql, /\bfrom\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\bjoin\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\bfrom\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bjoin\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /v_card_pricing_ui_v1/i);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
});

test("MEE core internal evidence read model generator has no mutation calls", () => {
  const script = read("scripts/audits/market_evidence_internal_read_model_plan_v1.mjs");

  assert.match(script, /plan_only_internal_read_model/);
  assert.match(script, /db_writes: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);

  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
});
