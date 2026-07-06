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

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

test("MEE core internal review action workflow report captures the current review state", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1");
  assert.equal(report.mode, "plan_only_internal_review_action_workflow");
  assert.deepEqual(report.findings, []);

  assert.deepEqual(report.audit.disposition_status, [
    { review_status: "pending", review_disposition: "review_pending_candidate", row_count: 1536, public_flag_rows: 0 },
    { review_status: "resolved", review_disposition: "monitor_only", row_count: 380, public_flag_rows: 0 },
    { review_status: "pending", review_disposition: "review_pending_high_signal", row_count: 213, public_flag_rows: 0 },
    { review_status: "pending", review_disposition: "review_pending_classification_fix", row_count: 19, public_flag_rows: 0 },
    { review_status: "pending", review_disposition: "review_pending_reference_only", row_count: 4, public_flag_rows: 0 },
  ]);

  assert.deepEqual(report.audit.dashboard_queues, [
    { dashboard_queue: "reference_only_queue", row_count: 915, handoff_candidate_rows: 0, public_flag_rows: 0 },
    { dashboard_queue: "mixed_raw_slab_split_queue", row_count: 574, handoff_candidate_rows: 0, public_flag_rows: 0 },
    { dashboard_queue: "standard_candidate_review", row_count: 460, handoff_candidate_rows: 0, public_flag_rows: 0 },
    { dashboard_queue: "low_signal_monitor", row_count: 156, handoff_candidate_rows: 0, public_flag_rows: 0 },
    { dashboard_queue: "classification_blocked_queue", row_count: 19, handoff_candidate_rows: 0, public_flag_rows: 0 },
    { dashboard_queue: "unknown_evidence_review", row_count: 18, handoff_candidate_rows: 0, public_flag_rows: 0 },
    { dashboard_queue: "high_signal_candidate_queue", row_count: 10, handoff_candidate_rows: 0, public_flag_rows: 0 },
  ]);

  assert.deepEqual(report.audit.handoff_inputs, {
    candidate_rows: 260,
    high_signal_rows: 10,
    potentially_confirmable_rows: 270,
    public_flag_rows: 0,
    raw_single_rows: 234,
    slab_rows: 36,
  });

  assert.equal(report.audit.public_boundary.pricing_observations_count, 0);
  assert.equal(report.audit.public_boundary.public_pricing_view_references, 0);
  assert.equal(report.audit.public_boundary.disposition_public_flag_rows, 0);
  assert.equal(report.audit.public_boundary.dashboard_public_flag_rows, 0);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core internal review action workflow defines safe action and handoff rules", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1/report.json"),
  );

  const actionNames = report.action_contract.actions.map((action) => action.action);
  assert.deepEqual(actionNames, [
    "start_review",
    "confirm_internal_candidate",
    "require_split",
    "block_evidence",
    "block_classification",
    "request_reclassification",
    "defer_more_evidence",
    "reference_crosscheck",
    "defer_active_market_evidence",
    "confirm_monitor_only",
  ]);

  const confirm = report.action_contract.actions.find((action) => action.action === "confirm_internal_candidate");
  assert.deepEqual(confirm.from_statuses, ["pending", "in_review"]);
  assert.equal(confirm.to_status, "resolved");
  assert.equal(confirm.to_disposition, "review_confirmed_internal_candidate");
  assert.deepEqual(confirm.allowed_review_lanes, ["high_signal_review", "candidate_review"]);
  assert.deepEqual(confirm.allowed_evidence_lanes, ["raw_single", "slab"]);
  assert.equal(confirm.requires_reason_code, true);
  assert.equal(confirm.handoff_candidate_after_action, true);

  assert.deepEqual(report.action_contract.handoff_rules, {
    allowed_actions: ["confirm_internal_candidate"],
    allowed_review_lanes: ["high_signal_review", "candidate_review"],
    allowed_evidence_lanes: ["raw_single", "slab"],
    public_flags_must_remain_false: true,
    publication_gate_candidate_is_not_set_by_this_workflow: true,
  });
});

test("MEE core internal review action workflow hashes match generated artifacts", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1/report.json"),
  );
  const contract = read("docs/contracts/MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md");
  const actionPolicySql = read("docs/sql/mee_core_internal_review_action_workflow_v1_action_policy_candidates.sql");
  const readbackSql = read("docs/sql/mee_core_internal_review_action_workflow_v1_readback.sql");

  assert.equal(sha256(contract), report.hashes.contract_md_sha256);
  assert.equal(sha256(actionPolicySql), report.hashes.action_policy_sql_sha256);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.contract_md_sha256, "25808d09ec42fe5151a912bfff568354e468dd19ca2253b6b79994d3bb35d2bb");
  assert.equal(report.hashes.action_policy_sql_sha256, "837f48290b4a476f8437b363973b7f25b4f31e658db5749e94670c70c76200c8");
  assert.equal(report.hashes.readback_sql_sha256, "4a4c05b891b1fe6a123776910ee8a6907d87deb5f43f01c4983d172356f14c4a");
});

test("MEE core internal review action workflow SQL candidates are read-only", () => {
  const actionPolicySql = stripSqlComments(read("docs/sql/mee_core_internal_review_action_workflow_v1_action_policy_candidates.sql"));
  const readbackSql = stripSqlComments(read("docs/sql/mee_core_internal_review_action_workflow_v1_readback.sql"));

  assert.match(actionPolicySql, /with\s+allowed_actions/i);
  assert.match(actionPolicySql, /select\s+\*\s+from\s+allowed_actions/i);
  assert.match(readbackSql, /from\s+public\.market_evidence_review_dispositions/i);
  assert.match(readbackSql, /from\s+public\.v_market_evidence_review_dashboard_queue_v1/i);

  for (const sql of [actionPolicySql, readbackSql]) {
    assert.doesNotMatch(sql, /\binsert\s+into\b/i);
    assert.doesNotMatch(sql, /\bupdate\s+public\./i);
    assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
    assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
    assert.doesNotMatch(sql, /\bcreate\s+(table|view|function|policy|index)\b/i);
    assert.doesNotMatch(sql, /\balter\s+table\b/i);
    assert.doesNotMatch(sql, /\bdrop\s+/i);
  }
});

test("MEE core internal review action workflow generator stays plan-only", () => {
  const script = read("scripts/audits/market_evidence_review_action_workflow_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1/);
  assert.match(script, /remote_migration_apply: false/);
  assert.match(script, /db_writes: false/);
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

  for (const artifactPath of [
    "docs/contracts/MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1/report.json",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md",
    "docs/sql/mee_core_internal_review_action_workflow_v1_action_policy_candidates.sql",
    "docs/sql/mee_core_internal_review_action_workflow_v1_readback.sql",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
