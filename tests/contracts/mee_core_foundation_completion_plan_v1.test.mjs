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

const packageId = "MEE-CORE-FOUNDATION-COMPLETION-PLAN-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-FOUNDATION-COMPLETION-PLAN-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-FOUNDATION-COMPLETION-PLAN-V1.md";
const planMdPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1.md";
const readbackSqlPath = "docs/sql/mee_core_foundation_completion_plan_v1_readback.sql";
const scriptPath = "scripts/audits/market_evidence_foundation_completion_plan_v1.mjs";

function loadReport() {
  return JSON.parse(read(reportPath));
}

test("MEE core foundation completion plan freezes work because foundation is not complete", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_foundation_completion_freeze_and_next_sequence");
  assert.equal(report.package_fingerprint_sha256, "4ca99f94bb3f6e1e9668858e8b722748761fbf91f0b6ee82b9534193e0c67f49");
  assert.equal(report.foundation_status, "not_complete");
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.freeze, {
    acquisition_frozen_until_foundation_complete: true,
    public_pricing_frozen_until_publish_gate: true,
    app_visible_pricing_frozen_until_publish_gate: true,
    pricing_observations_writes_allowed: false,
    ebay_active_prices_latest_writes_allowed: false,
    identity_vault_image_writes_allowed: false,
  });
});

test("MEE core foundation completion plan records completed foundation pieces", () => {
  const report = loadReport();

  assert.deepEqual(
    report.completed.map((item) => item.id),
    [
      "core_lifecycle_contract",
      "lifecycle_tables_and_read_models",
      "review_dispositions",
      "review_action_audit_trail",
      "low_signal_internal_cleanup",
      "classification_blocked_routing",
      "high_signal_queue_audit",
    ],
  );
  assert.equal(report.completed.every((item) => item.status === "complete"), true);
  assert.match(report.completed.find((item) => item.id === "lifecycle_tables_and_read_models").proof, /119628/);
  assert.match(report.completed.find((item) => item.id === "review_action_audit_trail").proof, /399/);
  assert.match(report.completed.find((item) => item.id === "classification_blocked_routing").proof, /0 pending/);
});

test("MEE core foundation completion plan records blocking work in order", () => {
  const report = loadReport();

  assert.deepEqual(
    report.blockers.map((item) => item.id),
    [
      "post_ingest_review_orchestrator",
      "lane_policy_contract",
      "batch_review_action_workflow",
      "publish_gate_contract",
      "runbook",
    ],
  );
  assert.equal(report.blockers.every((item) => item.status === "blocking"), true);
  assert.deepEqual(report.next_sequence, [
    "MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1 plan only",
    "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1 plan only",
    "MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1 schema/plan only if needed",
    "MEE-CORE-PUBLISH-GATE-CONTRACT-V1 plan only",
    "MEE-CORE-DAILY-RUNBOOK-V1",
  ]);
});

test("MEE core foundation completion plan captures current review queues and public boundary", () => {
  const report = loadReport();
  const remainingByLane = Object.fromEntries(
    report.readback.disposition_status.map((row) => [
      `${row.review_lane}:${row.review_status}:${row.review_disposition}:needs_review=${row.needs_review}`,
      row.rows,
    ]),
  );

  assert.equal(remainingByLane["candidate_review:pending:review_pending_candidate:needs_review=true"], 1536);
  assert.equal(remainingByLane["classification_review:blocked:review_reclassify:needs_review=false"], 19);
  assert.equal(remainingByLane["high_signal_review:pending:review_pending_high_signal:needs_review=true"], 213);
  assert.equal(remainingByLane["low_signal_monitor:resolved:monitor_only:needs_review=false"], 380);
  assert.equal(remainingByLane["reference_only_review:pending:review_pending_reference_only:needs_review=true"], 4);
  assert.deepEqual(report.readback.public_boundary, {
    app_visible_rows: 0,
    can_publish_price_directly_rows: 0,
    market_truth_rows: 0,
    publication_gate_candidate_rows: 0,
    publishable_rows: 0,
  });
  assert.deepEqual(report.readback.object_counts, {
    lifecycle_event_rows: 837396,
    lifecycle_observation_rows: 119628,
    pricing_observations_count: 0,
    public_pricing_view_market_evidence_references: 0,
    review_action_event_rows: 399,
    review_disposition_rows: 2152,
  });
});

test("MEE core foundation completion plan hashes and artifacts are stable", () => {
  const report = loadReport();

  assert.equal(report.hashes.readback_sql_sha256, "1448f11574734fc6125c4ec0c4c782e46a1f3be90204768508fc2a494cf03275");
  assert.equal(sha256(read(readbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.deepEqual(report.source_hashes, {
    classification_post_apply: "365e64aa7690ff855a59c8b7d2afb8b103ff595c9e84e579059c904dd9b5f0a8",
    core_checkpoint: "7b85b2f7b1dd2ee7264a86e6b13315309b7a6b7d19c8cfcd17673d48000e8b92",
    high_signal_audit: "0b54d01f757ae769a093de2bc2bf9233c59d9a35a918f36a91c80cb32eaea258",
  });

  for (const artifactPath of [reportPath, reportMdPath, planMdPath, checkpointPath, readbackSqlPath, scriptPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});

test("MEE core foundation completion plan generator stays read-only", () => {
  const report = loadReport();
  const script = read(scriptPath);
  const sql = read(readbackSqlPath);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.match(script, /db_writes: false/);
  assert.match(script, /function_invocation: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /public_price_rollups: false/);
  assert.match(sql, /MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1/);
  assert.match(sql, /pricing_observations_count/);
  assert.match(sql, /public_pricing_view_market_evidence_references/);

  for (const content of [script, sql]) {
    assert.doesNotMatch(content, /\binsert\s+into\b/i);
    assert.doesNotMatch(content, /\bupdate\s+public\./i);
    assert.doesNotMatch(content, /\bdelete\s+from\b/i);
    assert.doesNotMatch(content, /\bmerge\s+into\b/i);
    assert.doesNotMatch(content, /\bon\s+conflict\b/i);
    assert.doesNotMatch(content, /\bebay_active_prices_latest\b/i);
  }
});
