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

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

test("MEE core internal review dispositions seed plan report is complete and non-public", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1");
  assert.equal(report.mode, "plan_only_internal_review_disposition_seed");
  assert.deepEqual(report.findings, []);

  assert.equal(report.audit.source_view_rows, 2152);
  assert.equal(report.audit.existing_active_disposition_rows, 0);
  assert.equal(report.audit.planned_seed_rows, 2152);
  assert.equal(report.audit.duplicate_package_keys, 0);
  assert.equal(report.audit.existing_active_conflicts, 0);
  assert.equal(report.audit.no_public_flags_in_manifest, true);

  assert.deepEqual(report.audit.lane_counts, {
    candidate_review: 1536,
    classification_review: 19,
    high_signal_review: 213,
    low_signal_monitor: 380,
    reference_only_review: 4,
  });

  assert.deepEqual(report.audit.disposition_counts, {
    review_pending_candidate: 1536,
    review_pending_classification_fix: 19,
    review_pending_high_signal: 213,
    monitor_only: 380,
    review_pending_reference_only: 4,
  });

  assert.deepEqual(report.audit.evidence_lane_counts, {
    mixed_raw_slab: 574,
    raw_single: 378,
    reference_metric: 915,
    slab: 92,
    unknown: 18,
    classification_blocked: 19,
    low_signal: 156,
  });

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core internal review dispositions seed plan hashes match generated artifacts", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1/report.json"),
  );
  const manifest = read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1/row_manifest.jsonl");
  const applySql = read("docs/sql/mee_core_internal_review_dispositions_seed_v1_apply_candidate.sql");
  const readbackSql = read("docs/sql/mee_core_internal_review_dispositions_seed_v1_readback.sql");

  assert.equal(sha256(manifest), report.hashes.row_manifest_sha256);
  assert.equal(sha256(applySql), report.hashes.apply_candidate_sql_sha256);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.row_manifest_sha256, "5bd62cf2b87ed82fdb7bb5c288a62bd5a17aabcb8eab87147b13cb4ff591f406");
  assert.equal(report.hashes.apply_candidate_sql_sha256, "d474eec66b6f39c8fbfe10160f4eec09af2576076af445a85016cc875a05d7c8");
  assert.equal(report.hashes.readback_sql_sha256, "63cecf0838b116d37a205fbdb8d41778ddd8750d69be87c80f7feed0a0e6ff48");
});

test("MEE core internal review dispositions seed manifest has unique keys and no public flags", () => {
  const manifestRows = read(
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1/row_manifest.jsonl",
  )
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));

  assert.equal(manifestRows.length, 2152);
  assert.equal(new Set(manifestRows.map((row) => row.package_key)).size, 2152);

  for (const row of manifestRows) {
    assert.equal(row.needs_review, true);
    assert.equal(row.publication_gate_candidate, false);
    assert.equal(row.can_publish_price_directly, false);
    assert.equal(row.publishable, false);
    assert.equal(row.app_visible, false);
    assert.equal(row.market_truth, false);
    assert.equal(row.review_actor, "system_seed_plan");
    assert.match(row.row_hash, /^[a-f0-9]{64}$/);
  }
});

test("MEE core internal review dispositions seed apply candidate targets only the internal table", () => {
  const stripped = stripSqlComments(read("docs/sql/mee_core_internal_review_dispositions_seed_v1_apply_candidate.sql"));

  assert.match(stripped, /insert\s+into\s+public\.market_evidence_review_dispositions/i);
  assert.match(stripped, /false::boolean\s+as\s+public_price_publication/i);
  assert.match(stripped, /false::boolean\s+as\s+app_visible_pricing/i);
  assert.match(stripped, /false::boolean\s+as\s+public_price_rollup/i);
  assert.match(stripped, /false::boolean\s+as\s+market_truth/i);

  assert.doesNotMatch(stripped, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\binsert\s+into\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bon\s+conflict\b/i);
  assert.doesNotMatch(stripped, /\bv_card_pricing_ui_v1\b/i);
});

test("MEE core internal review dispositions seed generator stays read-only", () => {
  const script = read("scripts/audits/market_evidence_review_dispositions_seed_plan_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1/);
  assert.match(script, /db_writes: false/);
  assert.match(script, /evidence_backfill_apply: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);

  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /https\.request/);

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1/report.json",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1/row_manifest.jsonl",
    "docs/sql/mee_core_internal_review_dispositions_seed_v1_apply_candidate.sql",
    "docs/sql/mee_core_internal_review_dispositions_seed_v1_readback.sql",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_PLAN_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
