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

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1";
const dispositionId = "008c3618-9ee5-4ba0-8e60-e829d67f0002";
const actionEventId = "b706c331-ae67-4a46-8098-90d219987a42";

test("MEE core post-apply audit proves the tiny invoke result", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1/report.json"),
  );

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_post_apply_audit_read_only");
  assert.deepEqual(report.findings, []);

  assert.deepEqual(report.target, {
    disposition_id: dispositionId,
    action_event_id: actionEventId,
    tiny_package_id: "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1",
    row_manifest_sha256: "7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567",
  });

  assert.equal(report.audit.event.id, actionEventId);
  assert.equal(report.audit.event.disposition_id, dispositionId);
  assert.equal(report.audit.event.action_name, "confirm_monitor_only");
  assert.equal(report.audit.event.from_status, "resolved");
  assert.equal(report.audit.event.to_status, "resolved");
  assert.equal(report.audit.event.from_disposition, "monitor_only");
  assert.equal(report.audit.event.to_disposition, "monitor_only");
  assert.equal(report.audit.event.review_actor, "system_tiny_invoke_plan");
  assert.equal(report.audit.event.publication_gate_candidate, false);
  assert.equal(report.audit.event.can_publish_price_directly, false);
  assert.equal(report.audit.event.publishable, false);
  assert.equal(report.audit.event.app_visible, false);
  assert.equal(report.audit.event.market_truth, false);

  assert.equal(report.audit.disposition.id, dispositionId);
  assert.equal(report.audit.disposition.gv_id, "GV-PK-MCD-2016-5");
  assert.equal(report.audit.disposition.review_status, "resolved");
  assert.equal(report.audit.disposition.review_disposition, "monitor_only");
  assert.equal(report.audit.disposition.review_actor, "system_tiny_invoke_plan");
  assert.equal(report.audit.disposition.needs_review, false);
  assert.equal(report.audit.disposition.review_payload.last_action_event_id, actionEventId);
  assert.equal(report.audit.disposition.review_payload.last_action_name, "confirm_monitor_only");
});

test("MEE core post-apply audit proves dashboard and boundary state", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1/report.json"),
  );

  assert.equal(report.audit.dashboard.disposition_id, dispositionId);
  assert.equal(report.audit.dashboard.dashboard_queue, "standard_candidate_review");
  assert.equal(report.audit.dashboard.needs_review, false);
  assert.equal(report.audit.dashboard.publication_gate_handoff_candidate, false);
  assert.equal(report.audit.dashboard.publishable, false);
  assert.equal(report.audit.dashboard.app_visible, false);
  assert.equal(report.audit.dashboard.market_truth, false);

  assert.deepEqual(report.audit.package_event_counts, {
    package_event_rows: 1,
    public_flag_event_rows: 0,
    target_event_rows: 1,
  });

  assert.deepEqual(report.audit.boundary, {
    dashboard_public_flag_rows: 0,
    pricing_observations_count: 0,
    public_pricing_view_references: 0,
    target_public_flag_rows: 0,
  });

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core post-apply audit recommends the next safe batch shape", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1/report.json"),
  );

  assert.deepEqual(report.next_batch_recommendation, {
    recommended_next_batch_size: 10,
    lane: "low_signal_monitor",
    action_name: "confirm_monitor_only",
    reason:
      "Tiny invocation produced exactly one event, exactly one target update, and no pricing/public leakage. Use a small 10-row batch next to test batching and rollback ergonomics.",
    eligible_low_signal_monitor_rows: 379,
    require_preflight_before_apply: true,
    keep_public_flags_false: true,
  });
});

test("MEE core post-apply audit hashes and artifacts are stable", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1/report.json"),
  );
  const readbackSql = read("docs/sql/mee_core_internal_review_action_function_post_apply_audit_v1_readback.sql");

  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.readback_sql_sha256, "7a8947d9c6b92449c87667dd94e2b3cf6d27c9c8779b57c1b446fa3cf8bb7165");

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1/report.json",
    "docs/sql/mee_core_internal_review_action_function_post_apply_audit_v1_readback.sql",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1.md",
    "scripts/audits/market_evidence_review_action_function_post_apply_audit_v1.mjs",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core post-apply audit generator stays read-only", () => {
  const script = read("scripts/audits/market_evidence_review_action_function_post_apply_audit_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1/);
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
