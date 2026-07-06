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

const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-REVIEW-DASHBOARD-V1.md";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-REVIEW-DASHBOARD-V1/report.json";
const viewSqlPath = "docs/sql/mee_price_candidate_review_dashboard_v1_view_candidates.sql";
const readbackSqlPath = "docs/sql/mee_price_candidate_review_dashboard_v1_readback.sql";

test("MEE price candidate review dashboard remote apply is internal-only", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-PRICE-CANDIDATE-REVIEW-DASHBOARD-V1");
  assert.equal(report.mode, "targeted_remote_schema_apply_internal_review_views");
  assert.deepEqual(report.findings, []);
  assert.equal(report.boundary.provider_calls, false);
  assert.equal(report.boundary.source_fetches, false);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(report.boundary.public_pricing_views, false);
  assert.equal(report.boundary.app_visible_pricing, false);
  assert.equal(report.boundary.public_price_rollups, false);
});

test("MEE price candidate review dashboard readback has expected queue counts", () => {
  const { readback } = loadJson(reportPath);

  assert.equal(readback.total_queue_rows, 16833);
  assert.equal(readback.reviewer_candidate_rows, 1808);
  assert.equal(readback.high_value_review_rows, 190);
  assert.equal(readback.public_boundary.can_publish_price_directly_rows, 0);
  assert.equal(readback.public_boundary.publishable_rows, 0);
  assert.equal(readback.public_boundary.app_visible_rows, 0);
  assert.equal(readback.public_boundary.market_truth_rows, 0);

  const byQueue = Object.fromEntries(
    readback.queue_summary.map((row) => [`${row.review_queue}:${row.source_type}:${row.evidence_lane}:${row.candidate_status}`, row.rows]),
  );

  assert.equal(byQueue["raw_single_ready_review:active_listing:raw_single:internal_candidate"], 952);
  assert.equal(byQueue["raw_single_high_value_review:active_listing:raw_single:internal_candidate"], 36);
  assert.equal(byQueue["slab_ready_review:active_listing:slab:internal_candidate"], 714);
  assert.equal(byQueue["slab_high_value_review:active_listing:slab:internal_candidate"], 106);
  assert.equal(byQueue["reference_only_hold:reference:reference:reference_only_hold"], 13233);
});

test("MEE price candidate review dashboard grants are service-role select only", () => {
  const { readback, applied_objects } = loadJson(reportPath);
  const appliedTableNames = applied_objects.map((name) => name.split(".").at(-1));

  for (const tableName of appliedTableNames) {
    const nonOwnerGrants = readback.grants.filter((row) => row.table_name === tableName && row.grantee !== "postgres");
    assert.deepEqual(nonOwnerGrants, [{ table_name: tableName, grantee: "service_role", privilege_type: "SELECT" }]);
  }
});

test("MEE price candidate review dashboard SQL cannot publish or mutate prices", () => {
  const stripped = stripSqlComments(`${read(viewSqlPath)}\n${read(readbackSqlPath)}`);

  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_price_candidate_review_queue_v1/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_price_candidate_review_summary_v1/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_price_candidate_high_value_review_v1/i);
  assert.match(stripped, /revoke\s+all\s+on\s+public\.v_market_evidence_price_candidate_review_queue_v1\s+from\s+public,\s+anon,\s+authenticated,\s+service_role/i);
  assert.match(stripped, /grant\s+select\s+on\s+public\.v_market_evidence_price_candidate_review_queue_v1\s+to\s+service_role/i);
  assert.match(stripped, /false\s+as\s+can_publish_price_directly/i);
  assert.match(stripped, /false\s+as\s+publishable/i);
  assert.match(stripped, /false\s+as\s+app_visible/i);
  assert.match(stripped, /false\s+as\s+market_truth/i);

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bon\s+conflict\b/i);
  assert.doesNotMatch(stripped, /\b(insert|update|delete|merge)\s+(into\s+)?public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\b(insert|update|delete|merge)\s+(into\s+)?public\.ebay_active_prices_latest\b/i);
});

test("MEE price candidate review dashboard artifacts exist", () => {
  for (const artifactPath of [markdownPath, reportPath, viewSqlPath, readbackSqlPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
