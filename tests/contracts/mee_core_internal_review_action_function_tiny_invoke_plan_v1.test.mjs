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

const packageId = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1";
const targetDispositionId = "008c3618-9ee5-4ba0-8e60-e829d67f0002";
const rowManifestHash = "7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567";

test("MEE core tiny invoke plan report captures exactly one safe target", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1/report.json"),
  );

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_tiny_review_action_function_invoke");
  assert.deepEqual(report.findings, []);

  assert.deepEqual(report.target, {
    disposition_id: targetDispositionId,
    card_print_id: "7371ad81-a1e3-4f4a-950c-1a0d20a46720",
    gv_id: "GV-PK-MCD-2016-5",
    review_lane: "low_signal_monitor",
    evidence_lane: "raw_single",
    review_status: "resolved",
    review_disposition: "monitor_only",
    updated_at: "2026-06-26 19:45:24.907445+00",
    action_name: "confirm_monitor_only",
  });

  assert.equal(report.hashes.row_manifest_sha256, rowManifestHash);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core tiny invoke plan hashes match generated artifacts", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1/report.json"),
  );
  const rowManifest = read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1/row_manifest.jsonl");
  const applySql = read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_apply_candidate.sql");
  const rollbackSql = read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_rollback_candidate.sql");
  const readbackSql = read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_readback.sql");
  const preflightSql = read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_preflight.sql");

  assert.equal(sha256(rowManifest), report.hashes.row_manifest_sha256);
  assert.equal(sha256(applySql), report.hashes.apply_sql_sha256);
  assert.equal(sha256(rollbackSql), report.hashes.rollback_sql_sha256);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(sha256(preflightSql), report.hashes.preflight_sql_sha256);
  assert.equal(report.hashes.apply_sql_sha256, "da4f5ed45a177da85ab073e22dc535e2be68c1ddd4ca9da3629eb8e115b54543");
  assert.equal(report.hashes.rollback_sql_sha256, "c7bb96ca9111aa3a5bfe63b30d697b21636989a785b04f7aa1f15e54e6c1f7fa");
  assert.equal(report.hashes.readback_sql_sha256, "b7f460d45aa1ffd9e7657a1b1ad46c7d0d3494f0ccb399af65ede7350c637200");
  assert.equal(report.hashes.preflight_sql_sha256, "4a6c72de078c59e665d43240d669fb457dc68ac2f396bf1547b074099ddb45e2");
});

test("MEE core tiny invoke apply candidate invokes exactly one approved function call", () => {
  const sql = stripSqlComments(read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_apply_candidate.sql"));
  const matches = sql.match(/public\.apply_market_evidence_review_action_v1\s*\(/gi) ?? [];

  assert.equal(matches.length, 1);
  assert.match(sql, /^\s*begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, new RegExp(`${targetDispositionId}'::uuid`));
  assert.match(sql, /'confirm_monitor_only'::text/);
  assert.match(sql, /'system_tiny_invoke_plan'::text/);
  assert.match(sql, /null::text/);
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

test("MEE core tiny invoke rollback and readback are package-scoped", () => {
  const rollback = stripSqlComments(read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_rollback_candidate.sql"));
  const readback = stripSqlComments(read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_readback.sql"));
  const preflight = stripSqlComments(read("docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_preflight.sql"));

  assert.match(rollback, /delete\s+from\s+public\.market_evidence_review_action_events/i);
  assert.match(rollback, /update\s+public\.market_evidence_review_dispositions/i);
  assert.match(rollback, new RegExp(`id\\s+=\\s+'${targetDispositionId}'::uuid`));
  assert.match(rollback, new RegExp(`action_payload\\s*->>\\s*'package_id'\\s*=\\s*'${packageId}'`));
  assert.match(rollback, new RegExp(`action_payload\\s*->>\\s*'row_manifest_sha256'\\s*=\\s*'${rowManifestHash}'`));
  assert.match(rollback, /publishable\s+=\s+false/i);
  assert.match(rollback, /app_visible\s+=\s+false/i);
  assert.match(rollback, /market_truth\s+=\s+false/i);
  assert.doesNotMatch(rollback, /\bpricing_observations\b/i);
  assert.doesNotMatch(rollback, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(rollback, /\bv_card_pricing_ui_v1\b/i);

  assert.match(readback, new RegExp(`package_id'\\s*=\\s*'${packageId}'`));
  assert.match(readback, new RegExp(`row_manifest_sha256'\\s*=\\s*'${rowManifestHash}'`));
  assert.match(readback, /target_public_flag_rows/i);
  assert.match(readback, /pricing_observations_count/i);
  assert.match(readback, /public_pricing_view_references/i);

  assert.match(preflight, /eligible_target_rows/i);
  assert.match(preflight, /updated_at\s+is\s+not\s+distinct\s+from\s+'2026-06-26 19:45:24\.907445\+00'::timestamptz/i);
  assert.match(preflight, /review_lane\s+=\s+'low_signal_monitor'/i);
  assert.match(preflight, /review_status\s+=\s+'resolved'/i);
  assert.match(preflight, /review_disposition\s+=\s+'monitor_only'/i);
});

test("MEE core tiny invoke generator stays plan-only", () => {
  const script = read("scripts/audits/market_evidence_review_action_function_tiny_invoke_plan_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1/);
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
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1/report.json",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1/row_manifest.jsonl",
    "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_apply_candidate.sql",
    "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_rollback_candidate.sql",
    "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_readback.sql",
    "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_preflight.sql",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
