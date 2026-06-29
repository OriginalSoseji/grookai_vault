import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-POST-APPLY-AUDIT-V1";
const sourcePackageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-PLAN-V1";
const sourcePackageFingerprint = "efa823f4b29c0de2852b82b397b3b450fe034704acfb177e2d51c4922020f1ad";
const sourceRowManifestHash = "7d0db97a1aadebc1929c0b81b43610d61f53305edaa52e81c0375d143f85f21e";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-POST-APPLY-AUDIT-V1/report.json";
const readbackSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_50_batch_post_apply_audit_v1_readback.sql";

function loadReport() {
  return JSON.parse(read(reportPath));
}

test("MEE core low-signal 50 batch post-apply audit proves the batch result", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_low_signal_50_batch_post_apply_audit_read_only");
  assert.equal(report.package_fingerprint_sha256, "8aca063d00e10f8ba60e8a388cef2a091062c562266fc1003cc90a12bab9044f");
  assert.deepEqual(report.findings, []);

  assert.deepEqual(report.source, {
    package_id: sourcePackageId,
    package_fingerprint_sha256: sourcePackageFingerprint,
    row_manifest_sha256: sourceRowManifestHash,
  });

  assert.deepEqual(report.audit.package_event_counts, {
    distinct_event_disposition_rows: 50,
    package_event_rows: 50,
    public_flag_event_rows: 0,
  });

  assert.deepEqual(report.audit.disposition_counts, {
    public_flag_disposition_rows: 0,
    target_disposition_rows: 50,
    updated_target_rows: 50,
  });

  assert.deepEqual(report.audit.dashboard_counts, {
    dashboard_rows: 50,
    dashboard_updated_rows: 50,
    public_flag_dashboard_rows: 0,
  });

  assert.deepEqual(report.audit.boundary, {
    package_event_public_flag_rows: 0,
    pricing_observations_count: 0,
    public_pricing_view_references: 0,
    target_public_flag_rows: 0,
  });
});

test("MEE core low-signal 50 batch post-apply audit preserves exact target and event counts", () => {
  const report = loadReport();

  assert.equal(report.audit.event_ids.length, 50);
  assert.equal(new Set(report.audit.event_ids).size, 50);
  assert.equal(report.audit.target_disposition_ids.length, 50);
  assert.equal(new Set(report.audit.target_disposition_ids).size, 50);
  assert.equal(report.audit.target_gv_ids.length, 50);
  assert.equal(report.audit.target_disposition_ids.at(0), "069f3ead-ed73-44fa-bd76-f3df572c3a25");
  assert.equal(report.audit.target_disposition_ids.at(-1), "24dddb1c-3d95-40a0-92de-c6e3870af11f");
  assert.equal(report.audit.target_gv_ids.at(0), "GV-PK-WCD-2012-CMT_DECK-04-DARK-90-TORNADUS_EX");
  assert.equal(report.audit.target_gv_ids.at(-1), "GV-PK-PR-NP-16");
});

test("MEE core low-signal 50 batch post-apply audit recommends the next safe batch", () => {
  const report = loadReport();

  assert.deepEqual(report.next_batch_recommendation, {
    recommended_next_batch_size: 100,
    lane: "low_signal_monitor",
    action_name: "confirm_monitor_only",
    reason:
      "The 50-row batch produced exactly fifty package events, exactly fifty target updates, and no pricing/public leakage. Scale to a 100-row controlled batch next.",
    eligible_low_signal_monitor_rows: 319,
    require_preflight_before_apply: true,
    keep_public_flags_false: true,
  });
});

test("MEE core low-signal 50 batch post-apply audit hashes and artifacts are stable", () => {
  const report = loadReport();
  const readbackSql = read(readbackSqlPath);

  assert.equal(report.hashes.source_row_manifest_sha256, sourceRowManifestHash);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.readback_sql_sha256, "9371f1c2e6abe50f88ee49159e40f589ec3b745dab0227694871a015ae8bbe8c");

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-POST-APPLY-AUDIT-V1.md",
    reportPath,
    readbackSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_50_BATCH_POST_APPLY_AUDIT_V1.md",
    "scripts/audits/market_evidence_review_action_function_low_signal_50_batch_post_apply_audit_v1.mjs",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core low-signal 50 batch post-apply audit generator stays read-only", () => {
  const report = loadReport();
  const script = read("scripts/audits/market_evidence_review_action_function_low_signal_50_batch_post_apply_audit_v1.mjs");

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-POST-APPLY-AUDIT-V1/);
  assert.match(script, /db_writes: false/);
  assert.match(script, /function_invocation: false/);
  assert.match(script, /action_event_inserts: false/);
  assert.match(script, /disposition_updates: false/);
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
});
