import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const packageId = "MEE-CORE-QUALITY-FLAG-TAXONOMY-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-FLAG-TAXONOMY-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-FLAG-TAXONOMY-V1.md";
const contractPath = "docs/contracts/MEE_CORE_QUALITY_FLAG_TAXONOMY_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_QUALITY_FLAG_TAXONOMY_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_CORE_QUALITY_FLAG_TAXONOMY_V1.md";
const sqlPath = "docs/sql/mee_core_quality_flag_taxonomy_v1_readback.sql";
const conditionPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-FLAG-TAXONOMY-V1/condition_summary.json";
const scriptPath = "scripts/audits/market_evidence_quality_flag_taxonomy_v1.mjs";

test("MEE quality flag taxonomy captures current candidate evidence gates", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_quality_flag_taxonomy");
  assert.equal(report.package_fingerprint_sha256, "9df93c01b147687a1dce409a779da9d3883ba37a70840dc4fb3b30014d8c342c");
  assert.equal(report.taxonomy_status, "ready_for_quality_scoring_model");
  assert.equal(report.candidate_evidence_rows, 25989);
  assert.equal(report.review_required_rows, 25989);
  assert.equal(report.low_confidence_rows, 25989);
  assert.equal(report.lane_mismatch_rows, 2052);
  assert.equal(report.exclusion_flagged_rows, 909);
  assert.deepEqual(report.findings, []);
});

test("MEE quality flag taxonomy separates hard and manual-policy exclusions", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.hard_exclusion_flags, [
    "lot",
    "sealed",
    "choose_your_card",
    "jumbo",
    "menu_listing",
    "sleeve_accessory",
  ]);
  assert.deepEqual(report.manual_policy_flags, ["foreign_language"]);
  assert.equal(report.taxonomy.some((row) => row.quality_flag === "low_match_confidence"), true);
  assert.equal(report.taxonomy.some((row) => row.quality_flag === "lane_mismatch_raw_vs_slab"), true);
  assert.equal(report.taxonomy.some((row) => row.quality_flag === "explicit_exclusion_flag"), true);
  assert.equal(report.taxonomy.some((row) => row.quality_flag === "review_required_without_exclusion"), true);
});

test("MEE quality flag taxonomy identifies lane contamination", () => {
  const report = loadJson(reportPath);
  const classSummary = Object.fromEntries(
    report.class_summary.map((row) => [`${row.evidence_lane}:${row.listing_evidence_class}`, row.rows]),
  );

  assert.equal(classSummary["raw_single:raw_single"], 22178);
  assert.equal(classSummary["raw_single:slab"], 1499);
  assert.equal(classSummary["slab:slab"], 1759);
  assert.equal(classSummary["slab:raw_single"], 553);
});

test("MEE quality flag taxonomy keeps all public and write boundaries blocked", () => {
  const report = loadJson(reportPath);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE quality flag taxonomy artifacts are present and read-only", () => {
  const script = read(scriptPath);
  const sql = read(sqlPath);

  for (const artifactPath of [
    reportPath,
    reportMdPath,
    contractPath,
    planPath,
    checkpointPath,
    sqlPath,
    conditionPath,
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }

  for (const content of [script, sql]) {
    assert.doesNotMatch(content, /\binsert\s+into\b/i);
    assert.doesNotMatch(content, /\bupdate\s+public\./i);
    assert.doesNotMatch(content, /\bdelete\s+from\b/i);
    assert.doesNotMatch(content, /\bmerge\s+into\b/i);
    assert.doesNotMatch(content, /\bon\s+conflict\b/i);
    assert.doesNotMatch(content, /\bebay_active_prices_latest\b/i);
  }
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
});
