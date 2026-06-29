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

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-POST-APPLY-AUDIT-V1";
const sourcePackageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1";
const sourcePackageFingerprint = "943a5382c847ae807de876c72ca6871a6dfac4792961a72659b9270217e836cb";
const sourceRowManifestHash = "14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-POST-APPLY-AUDIT-V1/report.json";
const readbackSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_10_batch_post_apply_audit_v1_readback.sql";

function loadReport() {
  return JSON.parse(read(reportPath));
}

test("MEE core low-signal 10 batch post-apply audit proves the batch result", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_low_signal_10_batch_post_apply_audit_read_only");
  assert.equal(report.package_fingerprint_sha256, "787507074d4c0ac920aa16e619999d7d38a3f4d1a3d9fd379bf9ab67442d4b37");
  assert.deepEqual(report.findings, []);

  assert.deepEqual(report.source, {
    package_id: sourcePackageId,
    package_fingerprint_sha256: sourcePackageFingerprint,
    row_manifest_sha256: sourceRowManifestHash,
  });

  assert.deepEqual(report.audit.package_event_counts, {
    distinct_event_disposition_rows: 10,
    package_event_rows: 10,
    public_flag_event_rows: 0,
  });

  assert.deepEqual(report.audit.disposition_counts, {
    public_flag_disposition_rows: 0,
    target_disposition_rows: 10,
    updated_target_rows: 10,
  });

  assert.deepEqual(report.audit.dashboard_counts, {
    dashboard_rows: 10,
    dashboard_updated_rows: 10,
    public_flag_dashboard_rows: 0,
  });

  assert.deepEqual(report.audit.boundary, {
    package_event_public_flag_rows: 0,
    pricing_observations_count: 0,
    public_pricing_view_references: 0,
    target_public_flag_rows: 0,
  });
});

test("MEE core low-signal 10 batch post-apply audit preserves exact targets and event ids", () => {
  const report = loadReport();

  assert.equal(report.audit.event_ids.length, 10);
  assert.equal(new Set(report.audit.event_ids).size, 10);
  assert.deepEqual(report.audit.target_disposition_ids, [
    "00b58c53-3228-4bfd-a55b-2c16ec1be124",
    "01296bdf-16f7-4e2d-839b-a110993ca257",
    "022501fd-56d0-4873-8ed4-e66a9ee404bd",
    "0251b0b3-1bf9-4020-90ec-bafd66c95ef4",
    "03d769b0-1fa7-4b34-be98-5fa4db2e766a",
    "0450f3e0-ffb3-47e2-959c-066ef72cd1f5",
    "0489c268-59ae-472d-97a9-17fc3983deac",
    "04f4b24b-c685-4451-9206-5aed2c6eafae",
    "05b52775-4f83-45c8-a6bc-eacdaa03b3e2",
    "06009615-630b-4ac4-947f-6be2e8db0e3f",
  ]);
  assert.deepEqual(report.audit.target_gv_ids, [
    "GV-PK-TK-tk-bw-e-20",
    "GV-PK-TK-tk-bw-z-2",
    "GV-PK-MEP-002",
    "GV-PK-BWP-40-STAFF-STAMP",
    "GV-PK-WCD-2018-DRAGONES_Y_SOMBRAS-21-ENERGY-21-LIGHTNING_ENERGY",
    "GV-PK-WCD-2007-FLYVEES-05-EX_DELTA_SPECIES-109-JOLTEON_EX",
    "GV-PK-TK-tk-bw-z-13",
    "GV-PK-WCD-2004-ROCKY_BEACH-05-EX_TEAM_MAGMA_VS-94-SUICUNE_EX",
    "GV-PK-MCD-2014-3",
    "GV-PK-MEP-004-STAFF-STAMP",
  ]);
});

test("MEE core low-signal 10 batch post-apply audit recommends the next safe batch", () => {
  const report = loadReport();

  assert.deepEqual(report.next_batch_recommendation, {
    recommended_next_batch_size: 50,
    lane: "low_signal_monitor",
    action_name: "confirm_monitor_only",
    reason:
      "The 10-row batch produced exactly ten package events, exactly ten target updates, and no pricing/public leakage. Scale to a 50-row controlled batch next.",
    eligible_low_signal_monitor_rows: 369,
    require_preflight_before_apply: true,
    keep_public_flags_false: true,
  });
});

test("MEE core low-signal 10 batch post-apply audit hashes and artifacts are stable", () => {
  const report = loadReport();
  const readbackSql = read(readbackSqlPath);

  assert.equal(report.hashes.source_row_manifest_sha256, sourceRowManifestHash);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.readback_sql_sha256, "3d9f10f0b560f66b9db71637a667c631f0f74309d28d9d11a4f5a0fb789f9e23");

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-POST-APPLY-AUDIT-V1.md",
    reportPath,
    readbackSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_10_BATCH_POST_APPLY_AUDIT_V1.md",
    "scripts/audits/market_evidence_review_action_function_low_signal_10_batch_post_apply_audit_v1.mjs",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core low-signal 10 batch post-apply audit generator stays read-only", () => {
  const report = loadReport();
  const script = read("scripts/audits/market_evidence_review_action_function_low_signal_10_batch_post_apply_audit_v1.mjs");

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-POST-APPLY-AUDIT-V1/);
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
