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

const packageId = "MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1";
const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1/report.json";
const manifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1/row_manifest.jsonl";
const applySqlPath = "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_apply_candidate.sql";
const preflightSqlPath = "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_preflight.sql";
const readbackSqlPath = "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_readback.sql";
const rollbackSqlPath = "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_rollback_candidate.sql";
const applyAuditPath =
  "docs/audits/market_evidence_engine_v1/MEE_CORE_QUALITY_GATE_REMAINING_CANDIDATE_ACTIONS_APPLY_V1.md";
const scriptPath = "scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs";

test("MEE quality gate remaining candidate actions package is clean no-op when queue is empty", () => {
  const report = loadJson(reportPath);
  const manifestRows = read(manifestPath).trim().split("\n").filter(Boolean);

  assert.equal(report.package_id, packageId);
  assert.equal(report.package_fingerprint_sha256, "7ee3665f81581f71d7a8a071cf5b58d9d002e996068c8bafbca8d69ebb495a3f");
  assert.equal(report.package_status, "noop_no_pending_candidate_rows");
  assert.equal(report.target_disposition_rows, 0);
  assert.equal(manifestRows.length, 0);
  assert.deepEqual(report.findings, []);
});

test("MEE quality gate remaining candidate actions reports no current policy rows", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.action_summary, []);
  assert.deepEqual(report.evidence_summary, {
    candidate_evidence_rows: 0,
    exclude_rows: 0,
    reclassify_lane_rows: 0,
    manual_policy_rows: 0,
    identity_confidence_rows: 0,
    quality_rollup_eligible_rows: 0,
  });
});

test("MEE quality gate remaining candidate actions hashes are stable", () => {
  const report = loadJson(reportPath);

  assert.equal(sha256(read(manifestPath)), report.row_manifest_sha256);
  assert.equal(sha256(read(applySqlPath)), report.apply_sql_sha256);
  assert.equal(sha256(read(preflightSqlPath)), report.preflight_sql_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.readback_sql_sha256);
  assert.equal(sha256(read(rollbackSqlPath)), report.rollback_sql_sha256);
});

test("MEE quality gate remaining candidate actions preserves public boundaries", () => {
  const report = loadJson(reportPath);
  const applySql = read(applySqlPath);
  const readbackSql = read(readbackSqlPath);

  assert.doesNotMatch(applySql, /confirm_internal_candidate/i);
  assert.match(readbackSql, /forbidden_confirm_event_rows/);
  assert.match(readbackSql, /remaining_pending_candidate_rows/);
  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE quality gate remaining candidate action artifacts are present", () => {
  for (const artifactPath of [
    reportPath,
    manifestPath,
    applySqlPath,
    preflightSqlPath,
    readbackSqlPath,
    rollbackSqlPath,
    applyAuditPath,
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
