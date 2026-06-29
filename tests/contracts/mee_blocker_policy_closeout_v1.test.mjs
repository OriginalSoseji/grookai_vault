import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const packageDir = "docs/audits/market_evidence_engine_v1/MEE-BLOCKER-POLICY-CLOSEOUT-V1";
const contractPath = "docs/contracts/MEE_BLOCKER_POLICY_CLOSEOUT_V1.md";
const markdownPath = `${packageDir}.md`;
const readbackPath = `${packageDir}/readback.json`;
const reportPath = `${packageDir}/report.json`;
const sqlPath = "docs/sql/mee_blocker_policy_closeout_v1_readback.sql";

test("blocker policy closeout is non-mutating and non-public", () => {
  const report = loadJson(reportPath);
  assert.equal(report.package_id, "MEE-BLOCKER-POLICY-CLOSEOUT-V1");
  assert.equal(report.db_writes, false);
  assert.equal(report.cleanup_event_inserts, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
});

test("all remaining blocker categories are covered", () => {
  const report = loadJson(reportPath);
  assert.deepEqual(report.policy_coverage.special_lanes, {
    trainer_kit: "separate_source_matching_required",
    world_championship_deck: "exact_card_evidence_required",
    mep_black_star_promos: "exact_card_or_program_evidence_required",
    mcdonalds: "exact_card_evidence_required",
    promo_or_alt_distribution: "distribution_lane_review_required",
    base_print_run: "print_run_exactness_required",
  });
  assert.equal(report.policy_coverage.matcher_reclassify, "deterministic_reclassification_required");
  assert.equal(report.policy_coverage.high_value_review, "manual_high_value_review_required");
  assert.equal(report.policy_coverage.quarantine, "excluded_until_reviewed");
});

test("readback counts match the closed blocker foundation", () => {
  const readback = loadJson(readbackPath);
  const specialRows = Object.fromEntries(
    readback.special_by_family.reduce((acc, row) => {
      acc.set(row.family, (acc.get(row.family) || 0) + row.rows);
      return acc;
    }, new Map()),
  );
  assert.deepEqual(specialRows, {
    base_print_run: 252,
    mcdonalds: 3658,
    mep_black_star_promos: 6658,
    promo_or_alt_distribution: 3599,
    trainer_kit: 14306,
    world_championship_deck: 10707,
  });
  assert.deepEqual(readback.publication_gate_totals, {
    rows: 2152,
    would_be_publication_candidate_rows: 0,
    leaks: 0,
  });
});

test("closeout SQL is read-only", () => {
  const sql = read(sqlPath);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
});

test("closeout artifacts exist and hash", () => {
  for (const artifactPath of [contractPath, markdownPath, readbackPath, reportPath, sqlPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});

