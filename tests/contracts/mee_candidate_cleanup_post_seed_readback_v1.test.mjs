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

const packageDir = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-POST-SEED-READBACK-V1";
const markdownPath = `${packageDir}.md`;
const readbackPath = `${packageDir}/readback.json`;
const reportPath = `${packageDir}/report.json`;
const sqlPath = "docs/sql/mee_candidate_cleanup_post_seed_readback_v1.sql";

test("post-seed readback is run-only and non-public", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-CANDIDATE-CLEANUP-POST-SEED-READBACK-V1");
  assert.equal(report.db_writes, false);
  assert.equal(report.cleanup_event_inserts, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.source_fetches, false);
  assert.equal(report.function_invocation, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.equal(report.public_price_rollups, false);
});

test("cleanup seeded rows and current view are fully covered", () => {
  const readback = loadJson(readbackPath);

  assert.deepEqual(readback.summary, {
    cleanup_event_rows: 52630,
    distinct_candidate_ids: 52630,
    distinct_card_prints: 470,
    public_boundary_leak_rows: 0,
  });
  assert.deepEqual(readback.card_summary, {
    card_summary_rows: 470,
    card_summary_public_boundary_leak_rows: 0,
    cleanup_candidate_rows: 52630,
    quarantined_candidate_rows: 1671,
    matcher_reclassify_candidate_rows: 9610,
    special_lane_policy_candidate_rows: 39180,
    high_value_review_candidate_rows: 2169,
    keep_review_candidate_rows: 0,
    deferred_more_evidence_candidate_rows: 0,
  });
});

test("cleanup state matches the held publication-gate rows", () => {
  const readback = loadJson(readbackPath);

  assert.deepEqual(readback.held_review_confirmation, {
    held_rows: 470,
    raw_single_rows: 378,
    slab_rows: 92,
    public_boundary_leak_rows: 0,
  });
  assert.deepEqual(readback.cleanup_vs_held, {
    held_card_rows: 470,
    cleanup_card_rows: 470,
    matched_held_cleanup_rows: 470,
    held_without_cleanup_rows: 0,
  });
});

test("publication gate remains blocked or deferred and non-public", () => {
  const readback = loadJson(readbackPath);
  const totalGateRows = readback.publication_gate.reduce((sum, row) => sum + row.rows, 0);
  const leakRows = readback.publication_gate.reduce((sum, row) => sum + row.public_boundary_leak_rows, 0);

  assert.equal(totalGateRows, 2152);
  assert.equal(leakRows, 0);
  assert.equal(readback.publication_gate.some((row) => row.gate_decision === "defer_review_confirmation" && row.evidence_lane === "raw_single" && row.rows === 378), true);
  assert.equal(readback.publication_gate.some((row) => row.gate_decision === "defer_review_confirmation" && row.evidence_lane === "slab" && row.rows === 92), true);
});

test("post-seed readback SQL is read-only", () => {
  const sql = read(sqlPath);

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /apply_market_evidence_review_action_v1\s*\(/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
});

test("post-seed readback artifacts exist and hash", () => {
  for (const artifactPath of [markdownPath, readbackPath, reportPath, sqlPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});

