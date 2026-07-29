import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../..");
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs/manifests/card_visual_search_corpus_release_v1.json",
);
const AUDIT_DIR = path.join(
  REPO_ROOT,
  "docs/audits/card_visual_search_corpus_release_v1/2026-07-29_release_20260721",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function verifyPayloadHash(record, field) {
  const { [field]: actualHash, ...payload } = record;
  const expectedHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  assert.equal(actualHash, expectedHash);
}

test("corpus release manifest is immutable and internally reconciled", () => {
  const manifest = readJson(MANIFEST_PATH);
  verifyPayloadHash(manifest, "release_manifest_payload_sha256");

  assert.equal(manifest.release_version, "CARD_VISUAL_SEARCH_CORPUS_RELEASE_V1");
  assert.equal(manifest.release_id, "card_visual_search_corpus_release_v1_20260721");
  assert.equal(manifest.governed_source_sha, "c5bbbba5dea998fcd51d0d8602601737356a1494");
  assert.equal(manifest.file_count, 41);
  assert.equal(new Set(manifest.files.map((file) => file.relative_path)).size, 41);
  assert.equal(
    manifest.files.reduce((sum, file) => sum + file.bytes, 0),
    manifest.total_bytes,
  );
  assert.equal(manifest.total_bytes, 708245401);
  for (const file of manifest.files) assert.match(file.sha256, /^[a-f0-9]{64}$/u);
});

test("corpus release preserves locked semantic counts and holdout seal", () => {
  const counts = readJson(MANIFEST_PATH).semantic_counts;
  assert.deepEqual(counts, {
    source_rows: 11000,
    valid_fact_graphs: 10376,
    source_gaps: 624,
    search_eligible_printings: 9702,
    tier_a: 2687,
    tier_b: 7015,
    tier_c: 1298,
    artwork_groups: 9532,
    artwork_memberships: 9702,
    projection_documents: 28596,
    concept_evidence_entries: 357413,
    projection_exclusions: 168046,
    projection_failures: 0,
    calibration_queries: 200,
    sealed_holdout_queries: 50,
    holdout_executed: false,
    indexed_entries: 321937,
  });
});

test("external release copy reconciles all planned files and bytes", () => {
  const reconciliation = readJson(path.join(AUDIT_DIR, "release_reconciliation.json"));
  verifyPayloadHash(reconciliation, "reconciliation_payload_sha256");

  assert.equal(reconciliation.status, "reconciled");
  assert.equal(reconciliation.planned_files, 41);
  assert.equal(reconciliation.copied_files, 41);
  assert.equal(reconciliation.matching_files, 41);
  assert.equal(reconciliation.missing_files, 0);
  assert.equal(reconciliation.mismatched_files, 0);
  assert.equal(reconciliation.extra_files, 0);
  assert.equal(reconciliation.copied_bytes, 708245401);
  assert.equal(reconciliation.outcomes.every((outcome) => outcome.hash_match), true);
});

test("release plan forbids Git bulk evidence and all runtime mutations", () => {
  const plan = readJson(path.join(AUDIT_DIR, "release_plan.json"));
  verifyPayloadHash(plan, "plan_payload_sha256");
  assert.deepEqual(plan.boundaries, {
    git_bulk_evidence_commit: false,
    provider_calls: false,
    database_connection: false,
    database_writes: false,
    embeddings: false,
    holdout_execution: false,
    public_search_activation: false,
    pricing_changes: false,
  });
});

test("permanent release artifacts match their SHA-256 manifest", () => {
  const hashManifest = readJson(path.join(AUDIT_DIR, "artifact_hashes.json"));
  for (const artifact of hashManifest.artifacts) {
    const actualHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(REPO_ROOT, artifact.path)))
      .digest("hex");
    assert.equal(actualHash, artifact.sha256, artifact.path);
  }
});
