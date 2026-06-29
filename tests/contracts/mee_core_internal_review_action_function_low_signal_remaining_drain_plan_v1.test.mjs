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

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1";
const packageFingerprint = "b21c27179f29d96b26fcad410753a1b9555c23ae236d7e5616f3172c29b3f031";
const rowManifestHash = "c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050";
const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1/report.json";
const rowManifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1/row_manifest.jsonl";
const applySqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_remaining_drain_v1_apply_candidate.sql";
const rollbackSqlPath =
  "docs/sql/mee_core_internal_review_action_function_low_signal_remaining_drain_v1_rollback_candidate.sql";
const readbackSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_remaining_drain_v1_readback.sql";
const preflightSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_remaining_drain_v1_preflight.sql";

function loadReport() {
  return JSON.parse(read(reportPath));
}

function loadManifestRows() {
  return read(rowManifestPath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

test("MEE core low-signal remaining-drain plan captures all currently eligible safe targets", () => {
  const report = loadReport();
  const rows = loadManifestRows();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_low_signal_remaining_drain_review_action_function_invoke");
  assert.equal(report.package_fingerprint_sha256, packageFingerprint);
  assert.deepEqual(report.findings, []);
  assert.equal(report.batch.size, 219);
  assert.equal(report.batch.action_name, "confirm_monitor_only");
  assert.equal(report.batch.review_actor, "system_low_signal_remaining_drain_plan");
  assert.equal(report.batch.lane, "low_signal_monitor");
  assert.equal(report.hashes.row_manifest_sha256, rowManifestHash);
  assert.equal(rows.length, 219);
  assert.equal(new Set(rows.map((row) => row.before.id)).size, 219);
  assert.deepEqual(report.batch.target_disposition_ids, rows.map((row) => row.before.id));
  assert.deepEqual(report.batch.target_gv_ids, rows.map((row) => row.before.gv_id));

  for (const [index, row] of rows.entries()) {
    assert.equal(row.package_id, packageId);
    assert.equal(row.batch_index, index + 1);
    assert.equal(row.action_name, "confirm_monitor_only");
    assert.equal(row.review_actor, "system_low_signal_remaining_drain_plan");
    assert.equal(row.before.review_lane, "low_signal_monitor");
    assert.equal(row.before.review_status, "resolved");
    assert.equal(row.before.review_disposition, "monitor_only");
    assert.equal(row.before.needs_review, true);
    assert.equal(row.before.publication_gate_candidate, false);
    assert.equal(row.before.can_publish_price_directly, false);
    assert.equal(row.before.publishable, false);
    assert.equal(row.before.app_visible, false);
    assert.equal(row.before.market_truth, false);
    assert.equal(row.expected_after.needs_review, false);
    assert.equal(row.expected_after.publication_gate_candidate, false);
    assert.equal(row.expected_after.can_publish_price_directly, false);
    assert.equal(row.expected_after.publishable, false);
    assert.equal(row.expected_after.app_visible, false);
    assert.equal(row.expected_after.market_truth, false);
    assert.equal(row.expected_after.action_event_delta, 1);
  }

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core low-signal remaining-drain plan hashes match generated artifacts", () => {
  const report = loadReport();

  assert.equal(sha256(read(rowManifestPath)), report.hashes.row_manifest_sha256);
  assert.equal(sha256(read(applySqlPath)), report.hashes.apply_sql_sha256);
  assert.equal(sha256(read(rollbackSqlPath)), report.hashes.rollback_sql_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.equal(sha256(read(preflightSqlPath)), report.hashes.preflight_sql_sha256);
  assert.equal(report.hashes.apply_sql_sha256, "cae9e8fefe41648d39a28ce4d7dcd4a6d1367a2bc392e9cce2c05c3e65183cb3");
  assert.equal(report.hashes.rollback_sql_sha256, "23ad90f30a4c234686cdd501b06ca3aaa47453abd8862fdbcdb8e2b243df9d7f");
  assert.equal(report.hashes.readback_sql_sha256, "3bfdf3405662d9c56372f07d949d4ceaa4414d35911dc9299fa2cba17ddeab0e");
  assert.equal(report.hashes.preflight_sql_sha256, "aea3eb51c29d02134be325bc4701b64ac93199308d0c562e46485dafe91dc331");
});

test("MEE core low-signal remaining-drain apply candidate invokes exactly the remaining approved function calls", () => {
  const sql = stripSqlComments(read(applySqlPath));
  const matches = sql.match(/public\.apply_market_evidence_review_action_v1\s*\(/gi) ?? [];

  assert.equal(matches.length, 219);
  assert.match(sql, /^\s*begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /'confirm_monitor_only'::text/);
  assert.match(sql, /'system_low_signal_remaining_drain_plan'::text/);
  assert.match(sql, new RegExp(`"package_id":"${packageId}"`));
  assert.match(sql, new RegExp(`"row_manifest_sha256":"${rowManifestHash}"`));
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bv_card_pricing_ui_v1\b/i);
});

test("MEE core low-signal remaining-drain rollback, preflight, and readback are package scoped", () => {
  const rollback = stripSqlComments(read(rollbackSqlPath));
  const readback = stripSqlComments(read(readbackSqlPath));
  const preflight = stripSqlComments(read(preflightSqlPath));
  const rows = loadManifestRows();

  assert.match(rollback, /delete\s+from\s+public\.market_evidence_review_action_events/i);
  assert.match(rollback, /update\s+public\.market_evidence_review_dispositions/i);
  assert.match(rollback, new RegExp(`action_payload\\s*->>\\s*'package_id'\\s*=\\s*'${packageId}'`));
  assert.match(rollback, new RegExp(`action_payload\\s*->>\\s*'row_manifest_sha256'\\s*=\\s*'${rowManifestHash}'`));
  assert.match(rollback, /publishable\s+=\s+false/i);
  assert.match(rollback, /app_visible\s+=\s+false/i);
  assert.match(rollback, /market_truth\s+=\s+false/i);
  assert.match(readback, /matching_action_event_rows/i);
  assert.match(readback, /updated_target_rows/i);
  assert.match(readback, /target_public_flag_rows/i);
  assert.match(readback, /pricing_observations_count/i);
  assert.match(readback, /remaining_eligible_low_signal_rows/i);
  assert.match(preflight, /expected_target_rows/i);
  assert.match(preflight, /eligible_target_rows/i);
  assert.match(preflight, /review_lane\s+=\s+'low_signal_monitor'/i);
  assert.match(preflight, /review_status\s+=\s+'resolved'/i);
  assert.match(preflight, /review_disposition\s+=\s+'monitor_only'/i);

  for (const row of rows) {
    assert.match(rollback, new RegExp(`'${row.before.id}'::uuid`));
    assert.match(preflight, new RegExp(`${row.before.id}'::uuid`));
  }
});

test("MEE core low-signal remaining-drain generator stays plan-only", () => {
  const script = read("scripts/audits/market_evidence_review_action_function_low_signal_remaining_drain_plan_v1.mjs");

  assert.match(script, new RegExp(packageId));
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

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1.md",
    reportPath,
    rowManifestPath,
    applySqlPath,
    rollbackSqlPath,
    readbackSqlPath,
    preflightSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_REMAINING_DRAIN_PLAN_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
