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

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-POST-APPLY-AUDIT-V1";
const sourcePackageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1";
const sourcePackageFingerprint = "b21c27179f29d96b26fcad410753a1b9555c23ae236d7e5616f3172c29b3f031";
const sourceRowManifestHash = "c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050";
const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-POST-APPLY-AUDIT-V1/report.json";
const readbackSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_remaining_drain_v1_readback.sql";

function loadReport() {
  return JSON.parse(read(reportPath));
}

test("MEE core low-signal remaining-drain post-apply audit proves the full queue clear", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_low_signal_remaining_drain_post_apply_audit_read_only");
  assert.equal(report.package_fingerprint_sha256, "86624490cc820546639aea3528fc97941264409d285d74ff2a98d30136eddbd1");
  assert.deepEqual(report.source, {
    package_id: sourcePackageId,
    package_fingerprint_sha256: sourcePackageFingerprint,
    row_manifest_sha256: sourceRowManifestHash,
  });
  assert.deepEqual(report.findings, []);
  assert.equal(report.audit.expected_target_rows, 219);
  assert.equal(report.audit.matching_action_event_rows, 219);
  assert.equal(report.audit.distinct_event_disposition_rows, 219);
  assert.equal(report.audit.updated_target_rows, 219);
  assert.equal(report.audit.remaining_eligible_low_signal_rows, 0);
});

test("MEE core low-signal remaining-drain post-apply audit proves no public or pricing leakage", () => {
  const report = loadReport();

  assert.equal(report.audit.event_public_flag_rows, 0);
  assert.equal(report.audit.target_public_flag_rows, 0);
  assert.equal(report.audit.pricing_observations_count, 0);
  assert.equal(report.audit.public_pricing_view_references, 0);
  assert.deepEqual(report.audit.low_signal_status, [
    {
      app_visible: false,
      market_truth: false,
      needs_review: false,
      publishable: false,
      review_disposition: "monitor_only",
      review_lane: "low_signal_monitor",
      review_status: "resolved",
      rows: 380,
    },
  ]);
});

test("MEE core low-signal remaining-drain post-apply audit preserves remaining queue counts", () => {
  const report = loadReport();
  const remainingByLane = Object.fromEntries(
    report.audit.remaining_review_status.map((row) => [
      `${row.review_lane}:${row.review_status}:${row.review_disposition}:needs_review=${row.needs_review}`,
      row.rows,
    ]),
  );

  assert.equal(remainingByLane["candidate_review:pending:review_pending_candidate:needs_review=true"], 1536);
  assert.equal(
    remainingByLane["classification_review:pending:review_pending_classification_fix:needs_review=true"],
    19,
  );
  assert.equal(remainingByLane["high_signal_review:pending:review_pending_high_signal:needs_review=true"], 213);
  assert.equal(remainingByLane["reference_only_review:pending:review_pending_reference_only:needs_review=true"], 4);
  assert.equal(remainingByLane["low_signal_monitor:resolved:monitor_only:needs_review=false"], 380);
  assert.deepEqual(report.next_recommendation, {
    package_id: "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1",
    reason:
      "Low-signal monitor rows are fully resolved. Audit classification_review next because classification defects should be blocked or corrected before high-signal or publication-gate work.",
    allowed_scope:
      "Read-only audit and plan only for classification_review rows; no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  });
});

test("MEE core low-signal remaining-drain post-apply audit hashes and artifacts are stable", () => {
  const report = loadReport();
  const readbackSql = read(readbackSqlPath);

  assert.equal(report.hashes.source_row_manifest_sha256, sourceRowManifestHash);
  assert.equal(report.hashes.readback_sql_sha256, "3bfdf3405662d9c56372f07d949d4ceaa4414d35911dc9299fa2cba17ddeab0e");
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-POST-APPLY-AUDIT-V1.md",
    reportPath,
    readbackSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_REMAINING_DRAIN_POST_APPLY_AUDIT_V1.md",
    "scripts/audits/market_evidence_review_action_function_low_signal_remaining_drain_post_apply_audit_v1.mjs",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core low-signal remaining-drain post-apply audit generator stays read-only", () => {
  const report = loadReport();
  const script = read(
    "scripts/audits/market_evidence_review_action_function_low_signal_remaining_drain_post_apply_audit_v1.mjs",
  );

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
