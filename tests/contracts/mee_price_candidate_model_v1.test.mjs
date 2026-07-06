import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-MODEL-V1.md";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-MODEL-V1/report.json";
const remoteApplyReportPath =
  "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-MODEL-V1-REMOTE-SCHEMA-APPLY/report.json";
const remoteApplyMarkdownPath =
  "docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-MODEL-V1-REMOTE-SCHEMA-APPLY.md";
const viewSqlPath = "docs/sql/mee_price_candidate_model_v1_view_candidate.sql";
const readbackSqlPath = "docs/sql/mee_price_candidate_model_v1_readback.sql";

test("MEE price candidate model is internal-only and non-public", () => {
  const markdown = read(markdownPath);
  const report = loadJson(reportPath);

  assert.match(markdown, /This is not public pricing/);
  assert.match(markdown, /not market truth/);
  assert.equal(report.package_id, "MEE-PRICE-CANDIDATE-MODEL-V1");
  assert.equal(report.mode, "readback_only_no_schema_apply");
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.provider_calls, false);
  assert.equal(report.boundary.source_fetches, false);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(report.boundary.public_pricing_views, false);
  assert.equal(report.boundary.app_visible_pricing, false);
  assert.equal(report.boundary.public_price_rollups, false);
  assert.deepEqual(report.findings, []);
});

test("MEE price candidate SQL keeps raw singles, slabs, and references separated", () => {
  const sql = read(viewSqlPath);

  assert.match(sql, /evidence_lane = 'raw_single'/);
  assert.match(sql, /evidence_lane = 'slab'/);
  assert.match(sql, /'reference'::text as evidence_lane/);
  assert.match(sql, /strict_title_filtered/);
  assert.match(sql, /market_listing_rollups/);
  assert.match(sql, /market_reference_signal_rollups/);
});

test("MEE price candidate SQL cannot publish prices", () => {
  const sql = `${read(viewSqlPath)}\n${read(readbackSqlPath)}`;

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /\b(insert|update|delete|merge)\s+(into\s+)?public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\b(insert|update|delete|merge)\s+(into\s+)?public\.ebay_active_prices_latest\b/i);
  assert.match(sql, /false as can_publish_price_directly/);
  assert.match(sql, /false as publishable/);
  assert.match(sql, /false as app_visible/);
  assert.match(sql, /false as market_truth/);
  assert.match(sql, /revoke all on public\.v_market_evidence_price_candidates_v1 from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant select on public\.v_market_evidence_price_candidates_v1 to service_role/i);
});

test("MEE price candidate readback produced non-public internal candidates", () => {
  const report = loadJson(reportPath);
  const readback = report.readback;
  const boundary = readback.public_boundary;

  assert.equal(readback.total_candidate_rows, 16833);
  assert.equal(readback.priced_candidate_rows, 16833);
  assert.equal(boundary.can_publish_price_directly_rows, 0);
  assert.equal(boundary.publishable_rows, 0);
  assert.equal(boundary.app_visible_rows, 0);
  assert.equal(boundary.market_truth_rows, 0);

  const byLaneStatus = Object.fromEntries(
    readback.summary.map((row) => [`${row.source_type}:${row.evidence_lane}:${row.confidence_tier}:${row.candidate_status}`, row.rows]),
  );

  assert.equal(byLaneStatus["active_listing:raw_single:high_confidence:internal_candidate"], 988);
  assert.equal(byLaneStatus["active_listing:slab:high_confidence:internal_candidate"], 820);
  assert.equal(byLaneStatus["reference:reference:low_confidence:reference_only_hold"], 13233);
});

test("MEE price candidate remote view apply is service-role select only", () => {
  const report = loadJson(remoteApplyReportPath);

  assert.equal(report.package_id, "MEE-PRICE-CANDIDATE-MODEL-V1-REMOTE-SCHEMA-APPLY");
  assert.equal(report.mode, "targeted_remote_schema_apply_only_corrected_grants");
  assert.equal(report.applied_object, "public.v_market_evidence_price_candidates_v1");
  assert.deepEqual(report.findings, []);
  assert.equal(report.boundary.pricing_observations_writes, false);
  assert.equal(report.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(report.boundary.public_pricing_views, false);
  assert.equal(report.boundary.app_visible_pricing, false);
  assert.equal(report.readback.total_candidate_rows, 16833);
  assert.equal(report.readback.can_publish_price_directly_rows, 0);
  assert.equal(report.readback.publishable_rows, 0);
  assert.equal(report.readback.app_visible_rows, 0);
  assert.equal(report.readback.market_truth_rows, 0);

  const nonOwnerGrants = report.grants.filter((row) => row.grantee !== "postgres");
  assert.deepEqual(nonOwnerGrants, [{ grantee: "service_role", privilege_type: "SELECT" }]);
});

test("MEE price candidate artifacts exist", () => {
  for (const artifactPath of [
    markdownPath,
    reportPath,
    remoteApplyReportPath,
    remoteApplyMarkdownPath,
    viewSqlPath,
    readbackSqlPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
