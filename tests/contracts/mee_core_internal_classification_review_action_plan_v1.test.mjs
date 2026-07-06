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

const packageId = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1";
const sourcePackageId = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1";
const actionName = "request_reclassification";
const reasonCode = "classification_noise";
const reviewActor = "system_classification_review_action_plan";
const targetCount = 19;

const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1/report.json";
const rowManifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1/row_manifest.jsonl";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1.md";
const planMdPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1.md";
const applySqlPath = "docs/sql/mee_core_internal_classification_review_action_plan_v1_apply_candidate.sql";
const rollbackSqlPath = "docs/sql/mee_core_internal_classification_review_action_plan_v1_rollback_candidate.sql";
const readbackSqlPath = "docs/sql/mee_core_internal_classification_review_action_plan_v1_readback.sql";
const preflightSqlPath = "docs/sql/mee_core_internal_classification_review_action_plan_v1_preflight.sql";
const scriptPath = "scripts/audits/market_evidence_classification_review_action_plan_v1.mjs";

function loadReport() {
  return JSON.parse(read(reportPath));
}

function loadManifestRows() {
  return read(rowManifestPath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

test("MEE core classification review action plan has the expected scoped package identity", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_classification_review_request_reclassification_action");
  assert.equal(report.package_fingerprint_sha256, "18c7e2a590956b473f0989b19b5c9ebc9a88806fd5b0efb2bf8a8f71e0326f00");
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.action_plan.expected_transition, {
    from_status: "pending",
    from_disposition: "review_pending_classification_fix",
    to_status: "blocked",
    to_disposition: "review_reclassify",
  });
  assert.equal(report.action_plan.action_name, actionName);
  assert.equal(report.action_plan.reason_code, reasonCode);
  assert.equal(report.action_plan.review_actor, reviewActor);
  assert.equal(report.action_plan.target_count, targetCount);
});

test("MEE core classification review action plan hashes and artifacts are stable", () => {
  const report = loadReport();

  assert.equal(sha256(read(rowManifestPath)), report.hashes.row_manifest_sha256);
  assert.equal(sha256(read(applySqlPath)), report.hashes.apply_sql_sha256);
  assert.equal(sha256(read(rollbackSqlPath)), report.hashes.rollback_sql_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.equal(sha256(read(preflightSqlPath)), report.hashes.preflight_sql_sha256);

  assert.equal(report.hashes.source_row_manifest_sha256, "a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205");
  assert.equal(report.hashes.row_manifest_sha256, "87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc");
  assert.equal(report.hashes.apply_sql_sha256, "cba22496f117b140a32d26b1eac7442a0892497c31eea750053ea6893009f7f7");
  assert.equal(report.hashes.rollback_sql_sha256, "6433d20793d9cffaeadb81d5cc4c2ccca3feeaf31ed391bc47fe6a02789a84d5");
  assert.equal(report.hashes.readback_sql_sha256, "bdd01d09326724c7579e31472c294e0b929907048d0d9567223b63a1c38cd33e");
  assert.equal(report.hashes.preflight_sql_sha256, "dc3e6bd37ac5e278c642e2c602d63b0d6dd590642abcca2802eee8fd008456db");

  for (const artifactPath of [
    reportPath,
    rowManifestPath,
    reportMdPath,
    planMdPath,
    applySqlPath,
    rollbackSqlPath,
    readbackSqlPath,
    preflightSqlPath,
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});

test("MEE core classification review action manifest targets only blocked classification rows", () => {
  const rows = loadManifestRows();

  assert.equal(rows.length, targetCount);
  assert.equal(new Set(rows.map((row) => row.disposition_id)).size, targetCount);
  assert.equal(new Set(rows.map((row) => row.gv_id)).size, targetCount);

  for (const [index, row] of rows.entries()) {
    assert.equal(row.package_id, packageId);
    assert.equal(row.source_package_id, sourcePackageId);
    assert.equal(row.source_row_manifest_sha256, "a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205");
    assert.equal(row.row_index, index + 1);
    assert.equal(row.action_name, actionName);
    assert.equal(row.reason_code, reasonCode);
    assert.equal(row.review_actor, reviewActor);
    assert.match(row.gv_id, /^GV-PK-/);
    assert.match(row.expected_updated_at, /^2026-06-26 19:45:24\.907445\+00$/);

    assert.deepEqual(row.before, {
      review_lane: "classification_review",
      evidence_lane: "classification_blocked",
      review_status: "pending",
      review_disposition: "review_pending_classification_fix",
      needs_review: true,
      publication_gate_candidate: false,
      can_publish_price_directly: false,
      publishable: false,
      app_visible: false,
      market_truth: false,
    });
    assert.deepEqual(row.expected_after, {
      review_status: "blocked",
      review_disposition: "review_reclassify",
      needs_review: false,
      publication_gate_candidate: false,
      can_publish_price_directly: false,
      publishable: false,
      app_visible: false,
      market_truth: false,
      action_event_delta: 1,
    });
    assert.equal(row.source_audit.evidence.active_listing_evidence_count > 0, true);
    assert.equal(row.source_audit.evidence.rollup_eligible_count, 0);
    assert.equal(row.source_audit.evidence.raw_single_count, 0);
    assert.equal(row.source_audit.evidence.slab_count, 0);
    assert.equal(row.source_audit.recommendation.public_pricing_allowed, false);
  }
});

test("MEE core classification review action apply candidate uses only the review action function", () => {
  const applySql = read(applySqlPath);

  assert.match(applySql, /^begin;/m);
  assert.match(applySql, /^commit;/m);
  assert.equal((applySql.match(/from public\.apply_market_evidence_review_action_v1\s*\(/g) ?? []).length, targetCount);
  assert.equal((applySql.match(new RegExp(`'${actionName}'::text`, "g")) ?? []).length, targetCount);
  assert.equal((applySql.match(new RegExp(`'${reasonCode}'::text`, "g")) ?? []).length, targetCount);
  assert.equal((applySql.match(new RegExp(`'${reviewActor}'::text`, "g")) ?? []).length, targetCount);
  assert.match(applySql, new RegExp(packageId));
  assert.match(applySql, /87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc/);

  assert.doesNotMatch(applySql, /\binsert\s+into\b/i);
  assert.doesNotMatch(applySql, /\bupdate\s+public\./i);
  assert.doesNotMatch(applySql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(applySql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(applySql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(applySql, /\bpricing_observations\b/i);
  assert.doesNotMatch(applySql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(applySql, /\bv_card_pricing_ui_v1\b/i);
});

test("MEE core classification review action rollback, preflight, and readback stay package-scoped", () => {
  const rollbackSql = read(rollbackSqlPath);
  const preflightSql = read(preflightSqlPath);
  const readbackSql = read(readbackSqlPath);

  assert.match(rollbackSql, /action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1'/);
  assert.match(rollbackSql, /action_payload ->> 'row_manifest_sha256' = '87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc'/);
  assert.match(rollbackSql, /\bdelete\s+from public\.market_evidence_review_action_events\b/i);
  assert.match(rollbackSql, /\bupdate public\.market_evidence_review_dispositions\b/i);

  assert.match(preflightSql, /eligible_target_rows/);
  assert.match(preflightSql, /review_lane = 'classification_review'/);
  assert.match(preflightSql, /review_disposition = 'review_pending_classification_fix'/);
  assert.match(preflightSql, /needs_review = true/);
  assert.match(preflightSql, /publishable = false/);
  assert.match(preflightSql, /app_visible = false/);
  assert.match(preflightSql, /market_truth = false/);

  assert.match(readbackSql, /matching_action_event_rows/);
  assert.match(readbackSql, /updated_target_rows/);
  assert.match(readbackSql, /remaining_pending_classification_review_rows/);
  assert.match(readbackSql, /pricing_observations_count/);
  assert.match(readbackSql, /public_pricing_view_references/);
});

test("MEE core classification review action generator stays plan-only", () => {
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
  assert.doesNotMatch(script, /\bhttps\.request\s*\(/);
});
