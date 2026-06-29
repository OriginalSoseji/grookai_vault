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

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-PLAN-V1";
const rowManifestHash = "7d0db97a1aadebc1929c0b81b43610d61f53305edaa52e81c0375d143f85f21e";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-PLAN-V1/report.json";
const rowManifestPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-PLAN-V1/row_manifest.jsonl";
const applySqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_50_batch_v1_apply_candidate.sql";
const rollbackSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_50_batch_v1_rollback_candidate.sql";
const readbackSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_50_batch_v1_readback.sql";
const preflightSqlPath = "docs/sql/mee_core_internal_review_action_function_low_signal_50_batch_v1_preflight.sql";

function loadReport() {
  return JSON.parse(read(reportPath));
}

function loadManifestRows() {
  return read(rowManifestPath)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("MEE core low-signal 50 batch plan captures exactly fifty safe targets", () => {
  const report = loadReport();
  const rows = loadManifestRows();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_low_signal_50_batch_review_action_function_invoke");
  assert.deepEqual(report.findings, []);
  assert.equal(report.package_fingerprint_sha256, "efa823f4b29c0de2852b82b397b3b450fe034704acfb177e2d51c4922020f1ad");
  assert.equal(report.batch.size, 50);
  assert.equal(report.batch.action_name, "confirm_monitor_only");
  assert.equal(report.batch.review_actor, "system_low_signal_50_batch_plan");
  assert.equal(report.batch.lane, "low_signal_monitor");
  assert.equal(report.hashes.row_manifest_sha256, rowManifestHash);
  assert.equal(rows.length, 50);

  const dispositionIds = new Set();
  for (const [index, row] of rows.entries()) {
    assert.equal(row.package_id, packageId);
    assert.equal(row.batch_index, index + 1);
    assert.equal(row.action_name, "confirm_monitor_only");
    assert.equal(row.review_actor, "system_low_signal_50_batch_plan");
    assert.equal(row.reason_code, null);
    assert.equal(row.before.review_lane, "low_signal_monitor");
    assert.equal(row.before.review_status, "resolved");
    assert.equal(row.before.review_disposition, "monitor_only");
    assert.equal(row.before.needs_review, true);
    assert.equal(row.before.publishable, false);
    assert.equal(row.before.app_visible, false);
    assert.equal(row.before.market_truth, false);
    assert.equal(row.before.can_publish_price_directly, false);
    assert.equal(row.expected_after.needs_review, false);
    assert.equal(row.expected_after.publishable, false);
    assert.equal(row.expected_after.app_visible, false);
    assert.equal(row.expected_after.market_truth, false);
    assert.equal(row.expected_after.can_publish_price_directly, false);
    assert.equal(row.expected_after.action_event_delta, 1);
    dispositionIds.add(row.before.id);
  }

  assert.equal(dispositionIds.size, 50);
  assert.deepEqual(report.batch.target_disposition_ids, rows.map((row) => row.before.id));
  assert.deepEqual(report.batch.target_gv_ids, rows.map((row) => row.before.gv_id));

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core low-signal 50 batch plan hashes match generated artifacts", () => {
  const report = loadReport();
  const rowManifest = read(rowManifestPath);
  const applySql = read(applySqlPath);
  const rollbackSql = read(rollbackSqlPath);
  const readbackSql = read(readbackSqlPath);
  const preflightSql = read(preflightSqlPath);

  assert.equal(sha256(rowManifest), report.hashes.row_manifest_sha256);
  assert.equal(sha256(applySql), report.hashes.apply_sql_sha256);
  assert.equal(sha256(rollbackSql), report.hashes.rollback_sql_sha256);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(sha256(preflightSql), report.hashes.preflight_sql_sha256);
  assert.equal(report.hashes.apply_sql_sha256, "d2e55ee90118c5569277a425986dfd1e5fb8d9b3c1a36387ad6e72a3b2a760d5");
  assert.equal(report.hashes.rollback_sql_sha256, "f4bee8d1cc2c57c76e55893b6f442d556b1ad4dd3eb7ae87318a856de5755e40");
  assert.equal(report.hashes.readback_sql_sha256, "cb23bdb1b31ea14d67ae83c5dbbb02ad9386a40186f55b7f87f65c3863370ff2");
  assert.equal(report.hashes.preflight_sql_sha256, "ab1a7eca07641f1e0d3d57004b78e8b193bb04389da5581e06fcb556854ca238");
});

test("MEE core low-signal 50 apply candidate invokes exactly fifty approved function calls", () => {
  const sql = stripSqlComments(read(applySqlPath));
  const rows = loadManifestRows();
  const matches = sql.match(/public\.apply_market_evidence_review_action_v1\s*\(/gi) ?? [];

  assert.equal(matches.length, 50);
  assert.match(sql, /^\s*begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /'confirm_monitor_only'::text/);
  assert.match(sql, /'system_low_signal_50_batch_plan'::text/);
  assert.match(sql, new RegExp(`"package_id":"${packageId}"`));
  assert.match(sql, new RegExp(`"row_manifest_sha256":"${rowManifestHash}"`));

  for (const row of rows) {
    assert.match(sql, new RegExp(`${row.before.id}'::uuid`));
  }

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bv_card_pricing_ui_v1\b/i);
});

test("MEE core low-signal 50 rollback, preflight, and readback are package scoped", () => {
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
  assert.doesNotMatch(rollback, /\bpricing_observations\b/i);
  assert.doesNotMatch(rollback, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(rollback, /\bv_card_pricing_ui_v1\b/i);

  for (const row of rows) {
    assert.match(rollback, new RegExp(`'${row.before.id}'::uuid`));
    assert.match(preflight, new RegExp(`${row.before.id}'::uuid`));
  }

  assert.match(readback, new RegExp(`package_id'\\s*=\\s*'${packageId}'`));
  assert.match(readback, new RegExp(`row_manifest_sha256'\\s*=\\s*'${rowManifestHash}'`));
  assert.match(readback, /matching_action_event_rows/i);
  assert.match(readback, /updated_target_rows/i);
  assert.match(readback, /target_public_flag_rows/i);
  assert.match(readback, /pricing_observations_count/i);
  assert.match(readback, /public_pricing_view_references/i);

  assert.match(preflight, /eligible_target_rows/i);
  assert.match(preflight, /review_lane\s+=\s+'low_signal_monitor'/i);
  assert.match(preflight, /review_status\s+=\s+'resolved'/i);
  assert.match(preflight, /review_disposition\s+=\s+'monitor_only'/i);
});

test("MEE core low-signal 50 batch generator stays plan-only", () => {
  const script = read("scripts/audits/market_evidence_review_action_function_low_signal_50_batch_plan_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-PLAN-V1/);
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
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-50-BATCH-PLAN-V1.md",
    reportPath,
    rowManifestPath,
    applySqlPath,
    rollbackSqlPath,
    readbackSqlPath,
    preflightSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_50_BATCH_PLAN_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
