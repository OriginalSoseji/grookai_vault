import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const packageId = "MEE-CORE-CANDIDATE-REVIEW-THRESHOLD-CONTRACT-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-CANDIDATE-REVIEW-THRESHOLD-CONTRACT-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-CANDIDATE-REVIEW-THRESHOLD-CONTRACT-V1.md";
const contractPath = "docs/contracts/MEE_CORE_CANDIDATE_REVIEW_THRESHOLD_CONTRACT_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_CANDIDATE_REVIEW_THRESHOLD_CONTRACT_V1.md";
const checkpointPath =
  "docs/checkpoints/market_evidence_engine/MEE_CORE_CANDIDATE_REVIEW_THRESHOLD_CONTRACT_V1.md";
const sqlPath = "docs/sql/mee_core_candidate_review_threshold_contract_v1_readback.sql";
const scriptPath = "scripts/audits/market_evidence_candidate_review_threshold_contract_v1.mjs";

test("MEE candidate review threshold contract blocks auto-confirmation", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_candidate_review_threshold_contract");
  assert.equal(report.package_fingerprint_sha256, "39f67222b3d267a5d68ae36460b840aa5e01fc639aebb1ad089f35562e5fcac6");
  assert.equal(report.contract_status, "manual_or_threshold_required_no_auto_confirm");
  assert.equal(report.total_candidate_rows, 270);
  assert.equal(report.multi_source_family_rows, 46);
  assert.equal(report.zero_quality_flag_rows, 0);
  assert.deepEqual(report.findings, []);
});

test("MEE candidate review threshold contract captures lane summary", () => {
  const report = loadJson(reportPath);
  const summary = Object.fromEntries(
    report.lane_summary.map((row) => [`${row.review_lane}:${row.evidence_lane}`, row]),
  );

  assert.equal(summary["candidate_review:raw_single"].rows, 224);
  assert.equal(summary["candidate_review:slab"].rows, 36);
  assert.equal(summary["high_signal_review:raw_single"].rows, 10);
  assert.equal(summary["candidate_review:raw_single"].median_rollup_eligible, 6);
  assert.equal(summary["candidate_review:slab"].median_rollup_eligible, 4);
  assert.equal(summary["high_signal_review:raw_single"].median_rollup_eligible, 11);
});

test("MEE candidate review threshold contract keeps public and pricing writes blocked", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.public_boundary, {
    app_visible_rows: 0,
    can_publish_price_directly_rows: 0,
    market_truth_rows: 0,
    publication_gate_candidate_rows: 0,
    publishable_rows: 0,
  });
  assert.equal(report.boundary_proof.confirm_internal_candidate_actions, false);
  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE candidate review threshold contract requires missing gates before automation", () => {
  const report = loadJson(reportPath);

  assert.match(report.required_missing_before_automation.join("\n"), /independent-source rule/);
  assert.match(report.required_missing_before_automation.join("\n"), /freshness window/);
  assert.match(report.required_missing_before_automation.join("\n"), /outlier/);
  assert.match(report.required_missing_before_automation.join("\n"), /condition\/grade/);
  assert.match(report.required_missing_before_automation.join("\n"), /identity-confidence/);
  assert.match(report.required_missing_before_automation.join("\n"), /publish-gate handoff/);
  assert.equal(
    report.proposed_thresholds.every((row) => row.allowed_action_without_manual_review === "none"),
    true,
  );
});

test("MEE candidate review threshold contract artifacts are present and generator is safe", () => {
  const script = read(scriptPath);
  const sql = read(sqlPath);

  for (const artifactPath of [reportPath, reportMdPath, contractPath, planPath, checkpointPath, sqlPath, scriptPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
  for (const content of [script, sql]) {
    assert.doesNotMatch(content, /\binsert\s+into\b/i);
    assert.doesNotMatch(content, /\bupdate\s+public\./i);
    assert.doesNotMatch(content, /\bdelete\s+from\b/i);
    assert.doesNotMatch(content, /\bmerge\s+into\b/i);
    assert.doesNotMatch(content, /\bon\s+conflict\b/i);
    assert.doesNotMatch(content, /\bebay_active_prices_latest\b/i);
  }
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
});
