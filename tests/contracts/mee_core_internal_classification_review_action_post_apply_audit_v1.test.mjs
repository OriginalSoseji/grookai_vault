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

const packageId = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-POST-APPLY-AUDIT-V1";
const sourcePackageId = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1";
const sourcePackageFingerprint = "18c7e2a590956b473f0989b19b5c9ebc9a88806fd5b0efb2bf8a8f71e0326f00";
const sourceRowManifestHash = "87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc";
const applySqlHash = "cba22496f117b140a32d26b1eac7442a0892497c31eea750053ea6893009f7f7";
const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-POST-APPLY-AUDIT-V1/report.json";
const readbackSqlPath = "docs/sql/mee_core_internal_classification_review_action_plan_v1_readback.sql";
const scriptPath = "scripts/audits/market_evidence_classification_review_action_post_apply_audit_v1.mjs";

function loadReport() {
  return JSON.parse(read(reportPath));
}

test("MEE core classification-review action post-apply audit proves the queue was routed", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_classification_review_action_post_apply_audit_read_only");
  assert.equal(report.package_fingerprint_sha256, "54b8d8cca22208cca3a702e082c064b73277bfa3af15ac2e6f08a569a0912604");
  assert.deepEqual(report.source, {
    package_id: sourcePackageId,
    package_fingerprint_sha256: sourcePackageFingerprint,
    row_manifest_sha256: sourceRowManifestHash,
    apply_sql_sha256: applySqlHash,
  });
  assert.deepEqual(report.findings, []);
  assert.equal(report.audit.expected_target_rows, 19);
  assert.equal(report.audit.matching_action_event_rows, 19);
  assert.equal(report.audit.distinct_event_disposition_rows, 19);
  assert.equal(report.audit.updated_target_rows, 19);
  assert.equal(report.audit.remaining_pending_classification_review_rows, 0);
});

test("MEE core classification-review action post-apply audit proves no public or pricing leakage", () => {
  const report = loadReport();

  assert.equal(report.audit.event_public_flag_rows, 0);
  assert.equal(report.audit.target_public_flag_rows, 0);
  assert.equal(report.audit.pricing_observations_count, 0);
  assert.equal(report.audit.public_pricing_view_references, 0);
  assert.deepEqual(report.audit.classification_status, [
    {
      app_visible: false,
      market_truth: false,
      needs_review: false,
      publishable: false,
      review_disposition: "review_reclassify",
      review_lane: "classification_review",
      review_status: "blocked",
      rows: 19,
    },
  ]);
});

test("MEE core classification-review action post-apply audit preserves remaining queue counts", () => {
  const report = loadReport();
  const remainingByLane = Object.fromEntries(
    report.audit.remaining_review_status.map((row) => [
      `${row.review_lane}:${row.review_status}:${row.review_disposition}:needs_review=${row.needs_review}`,
      row.rows,
    ]),
  );

  assert.equal(remainingByLane["candidate_review:pending:review_pending_candidate:needs_review=true"], 1536);
  assert.equal(remainingByLane["classification_review:blocked:review_reclassify:needs_review=false"], 19);
  assert.equal(remainingByLane["high_signal_review:pending:review_pending_high_signal:needs_review=true"], 213);
  assert.equal(remainingByLane["reference_only_review:pending:review_pending_reference_only:needs_review=true"], 4);
  assert.equal(remainingByLane["low_signal_monitor:resolved:monitor_only:needs_review=false"], 380);
  assert.deepEqual(report.next_recommendation, {
    package_id: "MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1",
    reason:
      "Classification-blocked rows are now routed to reclassification. Audit high-signal review rows next because they are the next closest lane to future publication-gate handoff, while still remaining internal-only.",
    allowed_scope:
      "Read-only audit and plan only for high_signal_review rows; no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  });
});

test("MEE core classification-review action post-apply audit hashes and artifacts are stable", () => {
  const report = loadReport();
  const readbackSql = read(readbackSqlPath);

  assert.equal(report.hashes.source_row_manifest_sha256, sourceRowManifestHash);
  assert.equal(report.hashes.readback_sql_sha256, "bdd01d09326724c7579e31472c294e0b929907048d0d9567223b63a1c38cd33e");
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-POST-APPLY-AUDIT-V1.md",
    reportPath,
    readbackSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_POST_APPLY_AUDIT_V1.md",
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});

test("MEE core classification-review action post-apply audit generator stays read-only", () => {
  const report = loadReport();
  const script = read(scriptPath);

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
  assert.doesNotMatch(script, /\.from\s*\([^)]*\)\s*\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(script, /\bhttps\.request\b/);
});
