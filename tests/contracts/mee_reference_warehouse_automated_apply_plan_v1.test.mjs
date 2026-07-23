import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUTOMATED_REFERENCE_SOURCES_V1,
  AUTOMATED_REFERENCE_TABLES_V1,
  buildMarketReferenceWarehouseAutomatedApplyPlanV1,
  MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_PACKAGE_ID,
} from "../../backend/pricing/market_reference_warehouse_automated_apply_policy_v1.mjs";
import {
  buildMarketReferenceWarehouseAutomatedApplyPlanReportV1,
  renderReferenceWarehouseAutomatedApplyPreflightSqlV1,
  renderReferenceWarehouseAutomatedApplyReadbackSqlV1,
} from "../../scripts/audits/market_reference_warehouse_automated_apply_plan_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

test("MEE reference warehouse automated apply plan is plan-only and non-public", () => {
  const plan = buildMarketReferenceWarehouseAutomatedApplyPlanV1({
    generatedAt: "2026-06-28T00:00:00.000Z",
  });

  assert.equal(plan.package_id, MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_PACKAGE_ID);
  assert.equal(plan.mode, "plan_only_no_remote_apply");
  assert.equal(plan.boundary.db_writes, false);
  assert.equal(plan.boundary.remote_apply, false);
  assert.equal(plan.boundary.pricing_observations_writes, false);
  assert.equal(plan.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(plan.boundary.public_pricing_views, false);
  assert.equal(plan.boundary.app_visible_pricing, false);
  assert.equal(plan.boundary.identity_table_writes, false);
  assert.equal(plan.boundary.card_printings_writes, false);
  assert.equal(plan.boundary.deletes, false);
  assert.equal(plan.boundary.upserts, false);
  assert.equal(plan.boundary.merges, false);
  assert.equal(plan.proofs.no_source_can_publish_directly, true);
  assert.equal(plan.proofs.all_sources_review_gated, true);
});

test("MEE reference warehouse automated apply plan covers all free reference sources", () => {
  const plan = buildMarketReferenceWarehouseAutomatedApplyPlanV1({
    generatedAt: "2026-06-28T00:00:00.000Z",
  });

  assert.deepEqual(plan.sources.map((row) => row.source).sort(), [...AUTOMATED_REFERENCE_SOURCES_V1].sort());
  assert.deepEqual(
    plan.future_automation_boundary.allowed_internal_writes_after_separate_apply_contract,
    [...AUTOMATED_REFERENCE_TABLES_V1],
  );
  assert.ok(plan.failure_guards.includes("unsupported_source_constraint"));
  assert.ok(plan.failure_guards.includes("public_boundary_leak_detected"));
  assert.ok(plan.lifecycle_stages.some((stage) => stage.stage === "missing_row_insert" && stage.writes === true));
  assert.ok(plan.lifecycle_stages.some((stage) => stage.stage === "publication_gate_recheck" && stage.writes === false));
});

test("MEE reference warehouse automated apply SQL artifacts are read-only", () => {
  const preflight = stripSqlComments(renderReferenceWarehouseAutomatedApplyPreflightSqlV1());
  const readback = stripSqlComments(renderReferenceWarehouseAutomatedApplyReadbackSqlV1());
  const combined = `${preflight}\n${readback}`;

  assert.match(combined, /market_reference_candidates/);
  assert.match(combined, /market_reference_normalized_evidence/);
  assert.match(combined, /v_market_evidence_publication_bridge_candidates_v1/);
  assert.doesNotMatch(combined, /\binsert\b/i);
  assert.doesNotMatch(combined, /\bupdate\b/i);
  assert.doesNotMatch(combined, /\bdelete\b/i);
  assert.doesNotMatch(combined, /\bupsert\b/i);
  assert.doesNotMatch(combined, /\bdrop\b/i);
  assert.doesNotMatch(combined, /\balter\b/i);
});

test("MEE reference warehouse automated apply script does not contain DB mutation calls", () => {
  const script = source("scripts/audits/market_reference_warehouse_automated_apply_plan_v1.mjs");
  const pkg = source("package.json");
  const report = buildMarketReferenceWarehouseAutomatedApplyPlanReportV1({
    generatedAt: "2026-06-28T00:00:00.000Z",
  });

  assert.match(pkg, /mee:reference-warehouse-automated-apply-plan/);
  assert.match(script, /plan_only_no_remote_apply|buildMarketReferenceWarehouseAutomatedApplyPlanV1/);
  assert.doesNotMatch(script, /createBackendClient/);
  assert.doesNotMatch(script, /\.from\(["'][^"']+["']\)\.(?:insert|update|upsert|delete)/);
  assert.equal(report.artifacts.preflight_sql, "docs/sql/mee_reference_warehouse_automated_apply_v1_preflight.sql");
  assert.equal(report.artifacts.readback_sql, "docs/sql/mee_reference_warehouse_automated_apply_v1_readback.sql");
  assert.equal(typeof report.artifacts.preflight_sql_sha256, "string");
  assert.equal(typeof report.artifacts.readback_sql_sha256, "string");
});

test("MEE source refresh contract points reference adapters to the warehouse apply plan", () => {
  const policy = source("backend/pricing/market_evidence_source_refresh_policy_v1.mjs");

  assert.match(policy, /reference_warehouse_automated_apply_plan/);
  assert.match(policy, /tcgdex_tcgplayer_reference/);
  assert.match(policy, /tcgdex_cardmarket_reference/);
  assert.match(policy, /pokemontcg_io_reference/);
  assert.match(policy, /tcgcsv_reference/);
});
