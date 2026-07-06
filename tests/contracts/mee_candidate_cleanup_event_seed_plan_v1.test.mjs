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

const packageDir = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1";
const markdownPath = `${packageDir}.md`;
const reportPath = `${packageDir}/report.json`;
const rowManifestPath = `${packageDir}/row_manifest.json`;
const hashesPath = `${packageDir}/hashes.json`;
const preflightPath = "docs/sql/mee_candidate_cleanup_event_seed_v1_preflight.sql";
const readbackPath = "docs/sql/mee_candidate_cleanup_event_seed_v1_readback.sql";
const rollbackPath = "docs/sql/mee_candidate_cleanup_event_seed_v1_rollback_candidate.sql";
const applyDriverPath = "docs/sql/mee_candidate_cleanup_event_seed_v1/mee_candidate_cleanup_event_seed_v1_apply_candidate.sql";

test("candidate cleanup event seed package is plan-only", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1");
  assert.equal(report.remote_apply, false);
  assert.equal(report.db_writes, false);
  assert.equal(report.cleanup_event_inserts, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.source_fetches, false);
  assert.equal(report.function_invocation, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.equal(report.public_price_rollups, false);
});

test("candidate cleanup event seed rows match expected counts", () => {
  const manifest = loadJson(rowManifestPath);

  assert.equal(manifest.total_rows, 52630);
  assert.equal(manifest.distinct_candidate_ids, 52630);
  assert.equal(manifest.duplicate_candidate_id_rows, 0);
  assert.equal(manifest.public_boundary_rows, 0);
  assert.deepEqual(manifest.cleanup_action_counts, {
    require_special_lane_policy: 39180,
    quarantine_candidate: 1671,
    require_matcher_reclassify: 9610,
    require_high_value_review: 2169,
  });
  assert.deepEqual(manifest.evidence_lane_counts, {
    raw_single: 46743,
    slab: 5887,
  });
});

test("seed chunks cover all rows and are hashed", () => {
  const manifest = loadJson(rowManifestPath);
  const hashes = loadJson(hashesPath);
  const chunkRowTotal = manifest.chunks.reduce((sum, chunk) => sum + chunk.rows, 0);

  assert.equal(manifest.chunk_count, 11);
  assert.equal(chunkRowTotal, 52630);
  for (const chunk of manifest.chunks) {
    assert.equal(existsSync(new URL(`../../${chunk.path}`, import.meta.url)), true, chunk.path);
    assert.equal(sha256(read(chunk.path)), chunk.sha256);
    assert.equal(hashes.artifact_hashes_sha256[chunk.path], chunk.sha256);
  }
});

test("seed apply chunks only insert into cleanup events", () => {
  const manifest = loadJson(rowManifestPath);
  const applySql = [read(applyDriverPath), ...manifest.chunks.map((chunk) => read(chunk.path))].join("\n");

  assert.match(applySql, /insert\s+into\s+public\.market_listing_candidate_cleanup_events/i);
  assert.doesNotMatch(applySql, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(applySql, /\binsert\s+into\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(applySql, /\bupdate\s+public\./i);
  assert.doesNotMatch(applySql, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(applySql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(applySql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(applySql, /apply_market_evidence_review_action_v1\s*\(/i);
});

test("preflight and readback SQL are read-only", () => {
  const sql = `${read(preflightPath)}\n${read(readbackPath)}`;

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /apply_market_evidence_review_action_v1\s*\(/i);
});

test("rollback candidate is explicitly rollback scoped", () => {
  const sql = read(rollbackPath);

  assert.match(sql, /delete\s+from\s+public\.market_listing_candidate_cleanup_events/i);
  assert.match(sql, /MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1/);
  assert.match(sql, /rollback;\s*$/i);
  assert.doesNotMatch(sql, /commit;/i);
});

test("seed package artifacts exist and hash", () => {
  for (const artifactPath of [
    markdownPath,
    reportPath,
    rowManifestPath,
    hashesPath,
    preflightPath,
    readbackPath,
    rollbackPath,
    applyDriverPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});
