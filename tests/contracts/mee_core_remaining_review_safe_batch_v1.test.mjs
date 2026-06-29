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

function loadJsonl(relativePath) {
  return read(relativePath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const packageId = "MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_CORE_REMAINING_REVIEW_SAFE_BATCH_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_REMAINING_REVIEW_SAFE_BATCH_V1.md";
const manifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1/row_manifest.jsonl";
const applySqlPath = "docs/sql/mee_core_remaining_review_safe_batch_v1_apply_candidate.sql";
const preflightSqlPath = "docs/sql/mee_core_remaining_review_safe_batch_v1_preflight.sql";
const readbackSqlPath = "docs/sql/mee_core_remaining_review_safe_batch_v1_readback.sql";
const rollbackSqlPath = "docs/sql/mee_core_remaining_review_safe_batch_v1_rollback_candidate.sql";
const scriptPath = "scripts/audits/market_evidence_remaining_review_safe_batch_v1.mjs";

test("MEE remaining review safe batch packages all policy-safe rows once", () => {
  const report = loadJson(reportPath);
  const manifest = loadJsonl(manifestPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_safe_internal_remaining_review_batch");
  assert.equal(report.package_fingerprint_sha256, "da9936d9d47a22fe6221fd15fe05fb2729e82d76b40b5fca1d66de873a50deb0");
  assert.equal(report.batch_status, "ready_for_single_safe_internal_apply");
  assert.equal(report.target_rows, 933);
  assert.deepEqual(report.action_counts, {
    defer_more_evidence: 911,
    block_evidence: 18,
    defer_active_market_evidence: 4,
  });
  assert.deepEqual(report.findings, []);
  assert.equal(manifest.length, 933);
});

test("MEE remaining review safe batch excludes raw and slab candidate confirmation", () => {
  const manifest = loadJsonl(manifestPath);

  assert.equal(manifest.some((row) => row.action_name === "confirm_internal_candidate"), false);
  assert.equal(manifest.some((row) => row.evidence_lane === "raw_single"), false);
  assert.equal(manifest.some((row) => row.evidence_lane === "slab"), false);
  assert.equal(manifest.some((row) => row.evidence_lane === "mixed_raw_slab"), false);
  assert.equal(manifest.every((row) => row.public_pricing_allowed === false), true);
});

test("MEE remaining review safe batch hashes are stable", () => {
  const report = loadJson(reportPath);

  assert.equal(sha256(read(manifestPath)), report.hashes.row_manifest_sha256);
  assert.equal(sha256(read(applySqlPath)), report.hashes.apply_sql_sha256);
  assert.equal(sha256(read(preflightSqlPath)), report.hashes.preflight_sql_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.equal(sha256(read(rollbackSqlPath)), report.hashes.rollback_sql_sha256);
  assert.deepEqual(report.hashes, {
    row_manifest_sha256: "107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd",
    apply_sql_sha256: "dd7152efd5ad4bd71d20651d9b28f992624e5894091de12c56420dd0a783c6a3",
    preflight_sql_sha256: "b2848c49b1d08a5feb013e8f0fe8730d85bc02dc89e06f4e411dda106070624b",
    readback_sql_sha256: "7d3a178e1fd2e89ba2554dbb29bd6c5298c794ba2125b67cd50d171b70c93f68",
    rollback_sql_sha256: "4ae0f07fe385a533312e0c65a6d66c1aba65d3407499ccc5b101605fd28c05bf",
  });
});

test("MEE remaining review safe batch artifacts are present and generator is safe", () => {
  const script = read(scriptPath);

  for (const artifactPath of [
    reportPath,
    reportMdPath,
    checkpointPath,
    planPath,
    manifestPath,
    applySqlPath,
    preflightSqlPath,
    readbackSqlPath,
    rollbackSqlPath,
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
  assert.match(script, /supabaseReadOnlyQuery/);
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
  assert.doesNotMatch(script, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(script, /\bpricing_observations\s*\(/i);
});
