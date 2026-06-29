import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-PUBLICATION-POLICY-V1/report.json";
const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-PUBLICATION-POLICY-V1.md";
const remoteApplyReportPath =
  "docs/audits/market_evidence_engine_v1/MEE-PRICE-PUBLICATION-POLICY-V1-REMOTE-SCHEMA-APPLY/report.json";
const remoteApplyMarkdownPath =
  "docs/audits/market_evidence_engine_v1/MEE-PRICE-PUBLICATION-POLICY-V1-REMOTE-SCHEMA-APPLY.md";
const contractPath = "docs/contracts/MEE_PRICE_PUBLICATION_POLICY_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_PRICE_PUBLICATION_POLICY_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_PRICE_PUBLICATION_POLICY_V1.md";
const viewSqlPath = "docs/sql/mee_price_publication_policy_v1_view_candidate.sql";
const readbackSqlPath = "docs/sql/mee_price_publication_policy_v1_readback.sql";
const scriptPath = "scripts/audits/market_evidence_price_publication_policy_v1.mjs";

test("MEE price publication policy is plan-only and non-public", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-PRICE-PUBLICATION-POLICY-V1");
  assert.equal(report.mode, "plan_only_internal_price_publication_policy");
  assert.equal(report.remote_migration_apply, false);
  assert.equal(report.db_writes, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.source_fetches, false);
  assert.equal(report.function_invocation, false);
  assert.equal(report.pricing_observations_writes, false);
  assert.equal(report.ebay_active_prices_latest_writes, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.equal(report.public_price_rollups, false);
  assert.deepEqual(report.findings, []);
});

test("MEE price publication policy keeps all public flags closed", () => {
  const report = loadJson(reportPath);
  const sql = read(viewSqlPath);

  assert.deepEqual(report.boundary, {
    can_publish_price_directly: false,
    publishable: false,
    app_visible: false,
    market_truth: false,
  });
  assert.equal(report.readback.public_boundary.can_publish_price_directly_rows, 0);
  assert.equal(report.readback.public_boundary.publishable_rows, 0);
  assert.equal(report.readback.public_boundary.app_visible_rows, 0);
  assert.equal(report.readback.public_boundary.market_truth_rows, 0);
  assert.match(sql, /false as can_publish_price_directly/i);
  assert.match(sql, /false as publishable/i);
  assert.match(sql, /false as app_visible/i);
  assert.match(sql, /false as market_truth/i);
});

test("MEE price publication policy produces expected current decision counts", () => {
  const { readback } = loadJson(reportPath);

  assert.equal(readback.total_policy_rows, 16833);
  assert.equal(readback.internal_price_policy_candidate_rows, 329);
  assert.equal(readback.future_publication_review_candidate_rows, 11);

  const byDecision = Object.fromEntries(
    readback.summary.map((row) => [`${row.price_policy_decision}:${row.source_type}:${row.evidence_lane}`, row.rows]),
  );

  assert.equal(byDecision["raw_single_policy_candidate:active_listing:raw_single"], 271);
  assert.equal(byDecision["raw_single_review_candidate:active_listing:raw_single"], 58);
  assert.equal(byDecision["hold_slab_grade_policy:active_listing:slab"], 391);
  assert.equal(byDecision["hold_reference_context_only:reference:reference"], 14572);
  assert.equal(byDecision["hold_special_lane_policy:active_listing:raw_single"], 599);
  assert.equal(byDecision["hold_special_lane_policy:active_listing:slab"], 429);
});

test("MEE price publication policy contract holds risky lanes", () => {
  const contract = read(contractPath);
  const sql = read(viewSqlPath);

  assert.match(contract, /all slab rows until grade-specific policy exists/i);
  assert.match(contract, /all reference-only rows/i);
  assert.match(contract, /World Championship, McDonald's, Trainer Kit, Base Set first edition, Shadowless, and 1999-2000 special lanes/i);
  assert.match(sql, /hold_slab_grade_policy/);
  assert.match(sql, /hold_reference_context_only/);
  assert.match(sql, /hold_special_lane_policy/);
  assert.match(sql, /hold_high_value_manual_review/);
  assert.match(sql, /hold_outlier_review/);
});

test("MEE price publication policy SQL cannot mutate or publish prices", () => {
  const stripped = stripSqlComments(`${read(viewSqlPath)}\n${read(readbackSqlPath)}`);

  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_price_publication_policy_v1/i);
  assert.match(stripped, /revoke\s+all\s+on\s+public\.v_market_evidence_price_publication_policy_v1\s+from\s+public,\s+anon,\s+authenticated,\s+service_role/i);
  assert.match(stripped, /grant\s+select\s+on\s+public\.v_market_evidence_price_publication_policy_v1\s+to\s+service_role/i);

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bon\s+conflict\b/i);
  assert.doesNotMatch(stripped, /\b(insert|update|delete|merge)\s+(into\s+)?public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\b(insert|update|delete|merge)\s+(into\s+)?public\.ebay_active_prices_latest\b/i);
});

test("MEE price publication policy remote apply is service-role select only", () => {
  const report = loadJson(remoteApplyReportPath);

  assert.equal(report.package_id, "MEE-PRICE-PUBLICATION-POLICY-V1-REMOTE-SCHEMA-APPLY");
  assert.equal(report.source_package_id, "MEE-PRICE-PUBLICATION-POLICY-V1");
  assert.equal(report.mode, "targeted_remote_schema_apply_internal_service_role_view");
  assert.equal(report.applied_object, "public.v_market_evidence_price_publication_policy_v1");
  assert.deepEqual(report.findings, []);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(report.boundary.public_pricing_views, false);
  assert.equal(report.boundary.app_visible_pricing, false);
  assert.equal(report.readback.total_policy_rows, 16833);
  assert.equal(report.readback.internal_price_policy_candidate_rows, 329);
  assert.equal(report.readback.future_publication_review_candidate_rows, 11);
  assert.equal(report.readback.public_boundary.can_publish_price_directly_rows, 0);
  assert.equal(report.readback.public_boundary.publishable_rows, 0);
  assert.equal(report.readback.public_boundary.app_visible_rows, 0);
  assert.equal(report.readback.public_boundary.market_truth_rows, 0);

  const nonOwnerGrants = report.grants.filter((row) => row.grantee !== "postgres");
  assert.deepEqual(nonOwnerGrants, [{ grantee: "service_role", privilege_type: "SELECT" }]);
});

test("MEE price publication policy artifacts exist", () => {
  for (const artifactPath of [
    reportPath,
    markdownPath,
    remoteApplyReportPath,
    remoteApplyMarkdownPath,
    contractPath,
    planPath,
    checkpointPath,
    viewSqlPath,
    readbackSqlPath,
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
