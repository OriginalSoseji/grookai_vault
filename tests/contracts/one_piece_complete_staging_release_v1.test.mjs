import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  buildOnePieceCompleteStagingReleaseV1,
  evaluateOnePieceCompleteStagingCollisionStateV1,
  ONE_PIECE_COMPLETE_STAGING_EXPECTED_COUNTS,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
  ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256,
  ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256,
  ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256,
  validateOnePieceCompleteStagingReleaseV1,
} from "../../backend/pricing/one_piece_complete_staging_release_v1.mjs";

const SOURCE_DIR = "docs/audits/pricing/one_piece_canonical_catalog_readiness_v1/" +
  "current_complete_source_2026-08-14_v1";

let cachedRelease;
async function fixture() {
  if (cachedRelease) return structuredClone(cachedRelease);
  const compressed = await fs.readFile(
    `${SOURCE_DIR}/source_product_manifest.jsonl.gz`);
  const rows = gunzipSync(compressed).toString("utf8").trim()
    .split(/\r?\n/).map(JSON.parse);
  cachedRelease = buildOnePieceCompleteStagingReleaseV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
    },
    asOfDate: "2026-08-14",
    manifestRows: rows,
    manifestLogicalSha256: ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
    manifestCompressedSha256:
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256,
    sourceSummarySha256: ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256,
    schemaProofSha256: ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256,
    priorPayloadProofSha256:
      ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256,
    warehouseSourceGroupCount: 84,
  });
  return structuredClone(cachedRelease);
}

test("complete One Piece staging release preserves all 7,261 source products", async () => {
  const release = await fixture();
  assert.deepEqual(release.plan.aggregate_counts,
    ONE_PIECE_COMPLETE_STAGING_EXPECTED_COUNTS);
  assert.equal(release.batches.length, 83);
  assert.equal(release.batches.flatMap((entry) => entry.staging_rows).length, 7261);
  assert.deepEqual(validateOnePieceCompleteStagingReleaseV1(release), {
    valid: true,
    findings: [],
  });
});

test("empty warehouse group is explicit while every product-bearing group gets a batch", async () => {
  const release = await fixture();
  assert.deepEqual(release.plan.empty_source_group_policy, {
    positive_row_batches_only: true,
    warehouse_group_count: 84,
    materialized_group_count: 83,
    empty_group_count: 1,
    empty_groups_are_source_coverage_diagnostics_not_missing_products: true,
  });
  assert.equal(release.batches.every((entry) => entry.staging_rows.length > 0), true);
});

test("staging preserves numbered, DON, sealed, quarantine, and future holds without authority", async () => {
  const release = await fixture();
  const rows = release.batches.flatMap((entry) => entry.staging_rows);
  assert.equal(rows.filter((row) => row.single_card_kind === "numbered_card").length,
    6627);
  assert.equal(rows.filter((row) => row.single_card_kind === "don_card").length,
    225);
  assert.equal(rows.filter((row) =>
    row.record_class === "sealed_product_candidate").length, 403);
  assert.equal(rows.filter((row) =>
    row.record_class === "ambiguous_quarantine").length, 6);
  assert.equal(rows.filter((row) =>
    row.promotion_state === "future_or_presale_hold").length, 82);
  assert.equal(rows.every((row) => row.payload.publishable === false &&
    row.payload.canonical_write_authorized === false &&
    row.payload.sealed_write_authorized === false), true);
});

test("release identities and fingerprints are deterministic", async () => {
  const first = await fixture();
  const second = await fixture();
  assert.equal(first.plan.plan_fingerprint_sha256,
    second.plan.plan_fingerprint_sha256);
  assert.equal(first.plan.release_payload_fingerprint_sha256,
    second.plan.release_payload_fingerprint_sha256);
  assert.deepEqual(first.plan.batch_index, second.plan.batch_index);
  assert.deepEqual(first.batches.map((entry) => entry.staging_rows[0].id),
    second.batches.map((entry) => entry.staging_rows[0].id));
});

test("payload, authority, ordinal, and aggregate drift fail closed", async () => {
  const release = await fixture();
  release.batches[0].staging_rows[0].payload.source_product_name = "drift";
  release.batches[1].staging_rows[0].row_ordinal = 1;
  release.batches[2].staging_rows[0].payload.publishable = true;
  release.plan.aggregate_counts.source_products = 1;
  const result = validateOnePieceCompleteStagingReleaseV1(release);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("aggregate_counts_mismatch"));
  assert.ok(result.findings.some((value) => value.endsWith(":payload_hash_mismatch")));
  assert.ok(result.findings.some((value) => value.endsWith(":ordinal_mismatch")));
  assert.ok(result.findings.some((value) => value.endsWith(":authority_open")));
  assert.ok(result.findings.includes("plan_fingerprint_mismatch"));
});

test("only identity and fingerprint collisions block a new immutable release", () => {
  assert.deepEqual(evaluateOnePieceCompleteStagingCollisionStateV1({
    batch_ids: 0,
    batch_payload_fingerprints: 0,
    staging_row_ids: 0,
    historical_source_product_overlaps: 21,
  }), { valid: true, findings: [] });
  assert.deepEqual(evaluateOnePieceCompleteStagingCollisionStateV1({
    batch_ids: 1,
    batch_payload_fingerprints: 0,
    staging_row_ids: 2,
    historical_source_product_overlaps: 21,
  }), {
    valid: false,
    findings: ["collision:batch_ids", "collision:staging_row_ids"],
  });
});

test("offline planner has no database or network write path", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_complete_staging_release_plan_v1.mjs", "utf8");
  assert.doesNotMatch(source, /\b(?:pg|postgres|supabaseClient)\b/);
  assert.doesNotMatch(source, /dotenv|SUPABASE_DB_URL|DATABASE_URL/);
  assert.match(source, /--expected-head-sha/);
  assert.match(source, /status", "--porcelain"/);
});

test("durable writer has insert-only staging SQL and an independent verifier", async () => {
  const [helper, apply, verify] = await Promise.all([
    fs.readFile("scripts/audits/one_piece_complete_staging_release_db_v1.mjs",
      "utf8"),
    fs.readFile("scripts/audits/one_piece_complete_staging_release_apply_v1.mjs",
      "utf8"),
    fs.readFile("scripts/audits/one_piece_complete_staging_release_post_apply_v1.mjs",
      "utf8"),
  ]);
  assert.match(helper, /insert into public\.one_piece_canonical_import_batches/);
  assert.match(helper, /insert into public\.one_piece_canonical_import_rows/);
  assert.doesNotMatch(helper, /\b(?:update|delete|truncate)\s+public\.one_piece_canonical_import_/i);
  assert.doesNotMatch(helper, /\bupsert\b/i);
  assert.match(apply, /begin transaction isolation level serializable/);
  assert.match(apply, /pg_advisory_xact_lock/);
  assert.match(apply, /set local role service_role/);
  assert.match(apply, /await client\.query\("commit"\)/);
  assert.match(verify, /repeatable read read only/);
  assert.doesNotMatch(verify, /\b(?:insert|update|delete|truncate)\s+public\./i);
});
