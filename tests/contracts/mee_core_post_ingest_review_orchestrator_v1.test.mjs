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

const packageId = "MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1/report.json";
const rowManifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1/row_manifest.jsonl";
const actionPlanPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1/action_plan_manifest.jsonl";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1.md";
const planMdPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_POST_INGEST_REVIEW_ORCHESTRATOR_V1.md";
const readbackSqlPath = "docs/sql/mee_core_post_ingest_review_orchestrator_v1_readback.sql";
const scriptPath = "scripts/audits/market_evidence_post_ingest_review_orchestrator_v1.mjs";

function loadReport() {
  return JSON.parse(read(reportPath));
}

function loadJsonl(relativePath) {
  return read(relativePath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

test("MEE core post-ingest review orchestrator captures one grouped review plan", () => {
  const report = loadReport();
  const rows = loadJsonl(rowManifestPath);
  const actions = loadJsonl(actionPlanPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_post_ingest_review_orchestrator");
  assert.equal(report.package_fingerprint_sha256, "876e629b79ac08463dff8506b5b9a08921179c9f93d7b5afbacfeaa4388e6a8f");
  assert.equal(report.orchestrator_status, "plan_only_ready");
  assert.deepEqual(report.findings, []);
  assert.equal(rows.length, 2152);
  assert.equal(actions.length, 1753);
  assert.equal(new Set(rows.map((row) => row.disposition_id)).size, 2152);
  assert.equal(new Set(actions.map((row) => row.disposition_id)).size, 1753);
});

test("MEE core post-ingest review orchestrator keeps safe actions separate from held actions", () => {
  const report = loadReport();

  assert.deepEqual(report.action_plan.bucket_counts, {
    auto_safe_require_raw_slab_split: 550,
    human_review_internal_candidate: 270,
    policy_hold_unclassified_candidate_review: 732,
    no_action_terminal_or_already_routed: 399,
    policy_hold_reference_metric_high_signal: 197,
    policy_hold_reference_only: 4,
  });
  assert.deepEqual(report.action_plan.plan_status_counts, {
    safe_internal_action: 550,
    hold_for_reviewer_or_lane_policy: 270,
    hold_until_lane_policy_contract: 933,
    no_action: 399,
  });
  assert.deepEqual(report.action_plan.action_counts, {
    require_split: 550,
    confirm_internal_candidate: 270,
    defer_more_evidence: 929,
    defer_active_market_evidence: 4,
  });
  assert.equal(report.action_plan.safe_internal_action_count, 550);
  assert.equal(report.action_plan.held_action_count, 1203);
  assert.equal(report.action_plan.row_count, 1753);
});

test("MEE core post-ingest review orchestrator current status matches review queues", () => {
  const report = loadReport();
  const status = Object.fromEntries(
    report.current_status.map((row) => [
      `${row.review_lane}:${row.evidence_lane}:${row.review_status}:${row.review_disposition}:needs_review=${row.needs_review}`,
      row.rows,
    ]),
  );

  assert.equal(status["candidate_review:mixed_raw_slab:pending:review_pending_candidate:needs_review=true"], 544);
  assert.equal(status["candidate_review:raw_single:pending:review_pending_candidate:needs_review=true"], 224);
  assert.equal(status["candidate_review:reference_metric:pending:review_pending_candidate:needs_review=true"], 714);
  assert.equal(status["candidate_review:slab:pending:review_pending_candidate:needs_review=true"], 36);
  assert.equal(status["candidate_review:unknown:pending:review_pending_candidate:needs_review=true"], 18);
  assert.equal(status["classification_review:classification_blocked:blocked:review_reclassify:needs_review=false"], 19);
  assert.equal(status["high_signal_review:mixed_raw_slab:pending:review_pending_high_signal:needs_review=true"], 6);
  assert.equal(status["high_signal_review:raw_single:pending:review_pending_high_signal:needs_review=true"], 10);
  assert.equal(status["high_signal_review:reference_metric:pending:review_pending_high_signal:needs_review=true"], 197);
  assert.equal(status["low_signal_monitor:low_signal:resolved:monitor_only:needs_review=false"], 156);
  assert.equal(status["low_signal_monitor:mixed_raw_slab:resolved:monitor_only:needs_review=false"], 24);
  assert.equal(status["low_signal_monitor:raw_single:resolved:monitor_only:needs_review=false"], 144);
  assert.equal(status["low_signal_monitor:slab:resolved:monitor_only:needs_review=false"], 56);
  assert.equal(status["reference_only_review:reference_metric:pending:review_pending_reference_only:needs_review=true"], 4);
});

test("MEE core post-ingest review orchestrator action manifest is internal only", () => {
  const actions = loadJsonl(actionPlanPath);
  const safe = actions.filter((row) => row.plan_status === "safe_internal_action");
  const held = actions.filter((row) => row.plan_status !== "safe_internal_action");

  assert.equal(safe.length, 550);
  assert.equal(safe.every((row) => row.action_name === "require_split"), true);
  assert.equal(safe.every((row) => row.reason_code === "mixed_raw_slab_requires_split"), true);
  assert.equal(safe.every((row) => row.public_pricing_allowed === false), true);
  assert.equal(held.length, 1203);
  assert.equal(held.filter((row) => row.action_name === "confirm_internal_candidate").length, 270);
  assert.equal(held.filter((row) => row.action_name === "defer_more_evidence").length, 929);
  assert.equal(held.filter((row) => row.action_name === "defer_active_market_evidence").length, 4);
  assert.equal(held.every((row) => row.public_pricing_allowed === false), true);
});

test("MEE core post-ingest review orchestrator proves no public or pricing leakage", () => {
  const report = loadReport();

  assert.deepEqual(report.public_boundary, {
    app_visible_rows: 0,
    can_publish_price_directly_rows: 0,
    market_truth_rows: 0,
    publication_gate_candidate_rows: 0,
    publishable_rows: 0,
  });
  assert.deepEqual(report.object_counts, {
    lifecycle_event_rows: 837396,
    lifecycle_observation_rows: 119628,
    pricing_observations_count: 0,
    public_pricing_view_market_evidence_references: 0,
    review_action_event_rows: 399,
    review_disposition_rows: 2152,
  });
});

test("MEE core post-ingest review orchestrator hashes and artifacts are stable", () => {
  const report = loadReport();

  assert.equal(sha256(read(rowManifestPath)), report.hashes.row_manifest_sha256);
  assert.equal(sha256(read(actionPlanPath)), report.hashes.action_plan_manifest_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.row_manifest_sha256, "2eff6727cd0b83c1d733c1710d46a00af995a9443fd2d2a94a1e76743b83a7cc");
  assert.equal(report.hashes.action_plan_manifest_sha256, "66b4df441a29821c5008b70610c488f00a3c562e76cea029cbdab10563ac9850");
  assert.equal(report.hashes.readback_sql_sha256, "3c00927384fa6559d88ed0a2093f1558634c0bdf1b3e5c9808d747caf39ee856");

  for (const artifactPath of [
    reportPath,
    rowManifestPath,
    actionPlanPath,
    reportMdPath,
    planMdPath,
    readbackSqlPath,
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});

test("MEE core post-ingest review orchestrator points to lane policy next", () => {
  const report = loadReport();

  assert.deepEqual(report.next_recommendation, {
    package_id: "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1",
    reason:
      "The orchestrator can now classify post-ingest review rows, but lane policy must be explicit before it can generate one approved apply package for recurring use.",
    allowed_scope:
      "Plan only. No acquisition, no provider calls, no DB writes, no public pricing, no pricing_observations, no identity/vault/image writes.",
  });
});

test("MEE core post-ingest review orchestrator generator stays read-only", () => {
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
  assert.match(sql, /MEE_CORE_POST_INGEST_REVIEW_ORCHESTRATOR_V1/);
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
