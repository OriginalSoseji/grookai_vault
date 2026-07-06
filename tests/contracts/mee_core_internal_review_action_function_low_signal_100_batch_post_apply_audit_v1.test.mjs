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

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-POST-APPLY-AUDIT-V1";
const sourcePackageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1";
const sourcePackageFingerprint = "fa48e0f26db2d375b7d26cd557ed225fcf1bfc6d6702bed7a34dc4dd1e235b2a";
const sourceRowManifestHash = "bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-POST-APPLY-AUDIT-V1/report.json";
const readbackSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_100_batch_post_apply_audit_v1_readback.sql";

function loadReport() {
  return JSON.parse(read(reportPath));
}

test("MEE core low-signal 100 batch post-apply audit proves the batch result", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_low_signal_100_batch_post_apply_audit_read_only");
  assert.equal(report.package_fingerprint_sha256, "1f2760b21600c3509b8c7a04c42ce3b32a52250eacf17fb4f2f01885b2e174fd");
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.source, {
    package_id: sourcePackageId,
    package_fingerprint_sha256: sourcePackageFingerprint,
    row_manifest_sha256: sourceRowManifestHash,
  });
  assert.deepEqual(report.audit.package_event_counts, {
    package_event_rows: 100,
    distinct_event_disposition_rows: 100,
    public_flag_event_rows: 0,
  });
  assert.deepEqual(report.audit.disposition_counts, {
    target_disposition_rows: 100,
    updated_target_rows: 100,
    public_flag_disposition_rows: 0,
  });
  assert.deepEqual(report.audit.dashboard_counts, {
    dashboard_rows: 100,
    dashboard_updated_rows: 100,
    public_flag_dashboard_rows: 0,
  });
  assert.deepEqual(report.audit.boundary, {
    pricing_observations_count: 0,
    public_pricing_view_references: 0,
  });
});

test("MEE core low-signal 100 batch post-apply audit preserves exact counts and recommendation", () => {
  const report = loadReport();

  assert.equal(report.audit.event_ids.length, 100);
  assert.equal(new Set(report.audit.event_ids).size, 100);
  assert.equal(report.audit.target_disposition_ids.length, 100);
  assert.equal(new Set(report.audit.target_disposition_ids).size, 100);
  assert.equal(report.audit.target_gv_ids.length, 100);
  assert.equal(report.audit.target_disposition_ids.at(0), "2696f400-898f-48cc-98f3-4d7c325d85e7");
  assert.equal(report.audit.target_disposition_ids.at(-1), "67a5ccb4-0e23-4d01-bff0-02afda2154f0");
  assert.deepEqual(report.next_batch_recommendation, {
    recommended_next_batch_size: 100,
    lane: "low_signal_monitor",
    action_name: "confirm_monitor_only",
    reason:
      "The 100-row batch produced exactly one hundred package events, exactly one hundred target updates, and no pricing/public leakage. Continue with another controlled batch for the remaining eligible low-signal rows.",
    eligible_low_signal_monitor_rows: 219,
    require_preflight_before_apply: true,
    keep_public_flags_false: true,
  });
});

test("MEE core low-signal 100 batch post-apply audit hashes and artifacts are stable", () => {
  const report = loadReport();
  const readbackSql = read(readbackSqlPath);

  assert.equal(report.hashes.source_row_manifest_sha256, sourceRowManifestHash);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.readback_sql_sha256, "ab0f156339246cd7716eb0915413474af55a279820c2aee8a822bd59218fc74e");

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-POST-APPLY-AUDIT-V1.md",
    reportPath,
    readbackSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_POST_APPLY_AUDIT_V1.md",
    "scripts/audits/market_evidence_review_action_function_low_signal_100_batch_post_apply_audit_v1.mjs",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core low-signal 100 batch post-apply audit generator stays read-only", () => {
  const report = loadReport();
  const script = read("scripts/audits/market_evidence_review_action_function_low_signal_100_batch_post_apply_audit_v1.mjs");

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
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
