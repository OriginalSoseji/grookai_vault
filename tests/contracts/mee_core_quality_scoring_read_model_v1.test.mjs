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

const packageId = "MEE-CORE-QUALITY-SCORING-READ-MODEL-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-SCORING-READ-MODEL-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-SCORING-READ-MODEL-V1.md";
const contractPath = "docs/contracts/MEE_CORE_QUALITY_SCORING_READ_MODEL_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_QUALITY_SCORING_READ_MODEL_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_CORE_QUALITY_SCORING_READ_MODEL_V1.md";
const viewSqlPath = "docs/sql/mee_core_quality_scoring_read_model_v1_view_candidate.sql";
const readbackSqlPath = "docs/sql/mee_core_quality_scoring_read_model_v1_readback.sql";
const scriptPath = "scripts/audits/market_evidence_quality_scoring_read_model_v1.mjs";

test("MEE quality scoring read model scores all candidate evidence rows", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_internal_quality_scoring_read_model_candidate");
  assert.equal(report.package_fingerprint_sha256, "bc3e40eacd56fdde6f8068462df4ddb05ce8e2da72afcf78222442b25fd53296");
  assert.equal(report.read_model_status, "clear_no_pending_candidate_evidence");
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.gate_summary, {
    candidate_evidence_rows: 0,
    hard_exclusion_rows: 0,
    lane_mismatch_rows: 0,
    low_match_confidence_rows: 0,
    manual_policy_rows: 0,
    quality_rollup_eligible_rows: 0,
    review_required_without_exclusion_rows: 0,
  });
});

test("MEE quality scoring read model keeps action lanes separated", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.action_summary, []);
});

test("MEE quality scoring read model cannot auto-confirm or publish", () => {
  const report = loadJson(reportPath);
  const viewSql = read(viewSqlPath);

  assert.deepEqual(report.boundary, {
    auto_confirm_rows: 0,
    public_boundary_block_rows: 0,
    score_public_flag_rows: 0,
  });
  assert.match(viewSql, /false as can_auto_confirm_internal_candidate/);
  assert.match(viewSql, /false as publishable/);
  assert.match(viewSql, /false as app_visible/);
  assert.match(viewSql, /false as market_truth/);
  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE quality scoring read model hashes and artifacts are stable", () => {
  const report = loadJson(reportPath);

  assert.equal(sha256(read(viewSqlPath)), report.view_candidate_sql_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.readback_sql_sha256);
  for (const artifactPath of [
    reportPath,
    reportMdPath,
    contractPath,
    planPath,
    checkpointPath,
    viewSqlPath,
    readbackSqlPath,
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});

test("MEE quality scoring read model generator remains read-only", () => {
  const script = read(scriptPath);
  const readbackSql = read(readbackSqlPath);

  for (const content of [script, readbackSql]) {
    assert.doesNotMatch(content, /\binsert\s+into\b/i);
    assert.doesNotMatch(content, /\bupdate\s+public\./i);
    assert.doesNotMatch(content, /\bdelete\s+from\b/i);
    assert.doesNotMatch(content, /\bmerge\s+into\b/i);
    assert.doesNotMatch(content, /\bon\s+conflict\b/i);
    assert.doesNotMatch(content, /\bebay_active_prices_latest\b/i);
    assert.doesNotMatch(content, /\bpricing_observations\s*\(/i);
  }
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
});
