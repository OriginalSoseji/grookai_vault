import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const packageId = "MEE-PRICE-PUBLICATION-CANDIDATE-EXPORT-V1";
const scriptPath = "scripts/audits/market_evidence_price_publication_candidate_export_v1.mjs";
const markdownPath = `docs/audits/market_evidence_engine_v1/${packageId}.md`;
const reportPath = `docs/audits/market_evidence_engine_v1/${packageId}/report.json`;
const csvPath = `docs/audits/market_evidence_engine_v1/${packageId}/future_publication_review_candidates.csv`;

test("MEE price publication candidate export is read-only and internal", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "read_only_internal_future_publication_candidate_export");
  for (const flag of [
    "db_writes",
    "provider_calls",
    "source_fetches",
    "function_invocation",
    "pricing_observations_writes",
    "ebay_active_prices_latest_writes",
    "public_pricing_views",
    "app_visible_pricing",
    "public_price_rollups",
    "identity_table_writes",
    "card_prints_writes",
    "card_printings_writes",
    "vault_writes",
    "image_storage_writes",
    "deletes",
    "upserts",
    "merges",
    "migrations",
    "global_apply",
  ]) {
    assert.equal(report.boundary[flag], false, flag);
  }
});

test("MEE price publication candidate export preserves current review totals", () => {
  const report = loadJson(reportPath);
  const byBand = Object.fromEntries(report.review_band_summary.map((row) => [row.review_band, row.rows]));

  assert.equal(report.candidate_count, 11);
  assert.deepEqual(byBand, {
    standard_candidate: 11,
  });
});

test("MEE price publication candidate export keeps all public flags closed", () => {
  const { public_boundary: publicBoundary, candidates } = loadJson(reportPath);

  assert.deepEqual(publicBoundary, {
    can_publish_price_directly_rows: 0,
    publishable_rows: 0,
    app_visible_rows: 0,
    market_truth_rows: 0,
  });

  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((row) => row.price_policy_decision === "raw_single_policy_candidate"));
  assert.ok(candidates.every((row) => row.source_type === "active_listing"));
  assert.ok(candidates.every((row) => row.evidence_lane === "raw_single"));
  assert.ok(candidates.every((row) => row.confidence_tier === "high_confidence"));
});

test("MEE price publication candidate export CSV is stable", () => {
  const report = loadJson(reportPath);
  const csv = read(csvPath);
  const [header] = csv.split(/\r?\n/);

  assert.equal(report.csv_sha256, "6f517d6fd44143a2efda83a0174cab44ea66d6bd0366c00d7e0f292dab3e2099");
  assert.equal(
    report.package_fingerprint_sha256,
    "8d0953702c4de8c8565592ac2cfa7888a1aeb9f062f8a9461ba9f1e6811032cb",
  );
  assert.match(header, /gv_id,card_name,set_code,number,rarity,currency,candidate_median/);
});

test("MEE price publication candidate export script does not mutate remote pricing state", () => {
  const source = read(scriptPath);

  assert.match(source, /v_market_evidence_price_publication_policy_v1/);
  assert.match(source, /writeFileSync\(CSV_PATH/);
  assert.doesNotMatch(source, /\bclient\.query\(\s*`?\s*(insert|update|delete|merge|truncate|alter|drop|create)\b/i);
  assert.doesNotMatch(source, /\b(insert|update|delete|merge)\s+(into\s+)?(public\.)?pricing_observations\b/i);
  assert.doesNotMatch(source, /\b(insert|update|delete|merge)\s+(into\s+)?(public\.)?ebay_active_prices_latest\b/i);
  assert.doesNotMatch(source, /can_publish_price_directly:\s*true/i);
  assert.doesNotMatch(source, /app_visible:\s*true/i);
  assert.doesNotMatch(source, /market_truth:\s*true/i);
});

test("MEE price publication candidate export artifacts exist", () => {
  for (const artifactPath of [scriptPath, markdownPath, reportPath, csvPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
