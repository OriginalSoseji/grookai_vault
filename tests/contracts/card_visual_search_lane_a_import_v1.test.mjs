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
  "docs/manifests/card_visual_search_v1_selective_source_import_manifest.json",
);
const AUDIT_DIR = path.join(
  REPO_ROOT,
  "docs/audits/card_visual_search_lane_a_import/2026-07-28_lane_a_import_a911c260",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function payloadHash(record, hashField) {
  const { [hashField]: actualHash, ...payload } = record;
  const expectedHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return { actualHash, expectedHash };
}

function laneAFiles(manifest) {
  return manifest.components
    .filter((component) => component.decision === "import_now")
    .flatMap((component) => component.files)
    .sort((left, right) => left.source_path.localeCompare(right.source_path));
}

test("Lane A import plan is frozen before the transfer", () => {
  const manifest = readJson(MANIFEST_PATH);
  const plan = readJson(path.join(AUDIT_DIR, "import_plan.json"));
  const hashes = payloadHash(plan, "plan_payload_sha256");

  assert.equal(hashes.actualHash, hashes.expectedHash);
  assert.equal(plan.import_version, "CARD_VISUAL_SEARCH_LANE_A_IMPORT_V1");
  assert.equal(plan.pre_import_head_sha, "a911c260a1b333c3528edfb78b879138023d820a");
  assert.equal(plan.governed_source_sha, manifest.governed_source.commit_sha);
  assert.equal(plan.manifest_payload_sha256, manifest.manifest_payload_sha256);
  assert.equal(plan.selected_file_count, 38);
  assert.deepEqual(
    plan.selected_files.map((file) => file.source_path),
    laneAFiles(manifest).map((file) => file.source_path),
  );
});

test("Lane A import reconciliation proves exact file and hash agreement", () => {
  const manifest = readJson(MANIFEST_PATH);
  const reconciliation = readJson(path.join(AUDIT_DIR, "import_reconciliation.json"));
  const hashes = payloadHash(reconciliation, "reconciliation_payload_sha256");
  const expectedByPath = new Map(
    laneAFiles(manifest).map((file) => [file.destination_path, file.source_sha256]),
  );

  assert.equal(hashes.actualHash, hashes.expectedHash);
  assert.equal(reconciliation.status, "reconciled");
  assert.equal(reconciliation.planned_file_count, 38);
  assert.equal(reconciliation.written_file_count, 38);
  assert.equal(reconciliation.matching_file_count, 38);
  assert.equal(reconciliation.mismatched_file_count, 0);
  assert.equal(reconciliation.missing_file_count, 0);
  assert.equal(reconciliation.extra_imported_file_count, 0);
  assert.equal(reconciliation.outcomes.length, 38);

  for (const outcome of reconciliation.outcomes) {
    assert.equal(outcome.hash_match, true, outcome.destination_path);
    assert.equal(
      outcome.expected_sha256,
      expectedByPath.get(outcome.destination_path),
      outcome.destination_path,
    );
    assert.equal(outcome.destination_sha256, outcome.expected_sha256, outcome.destination_path);
  }
});

test("Lane A plan preserves all no-write and no-activation boundaries", () => {
  const plan = readJson(path.join(AUDIT_DIR, "import_plan.json"));
  assert.deepEqual(plan.boundaries, {
    exact_source_blobs_only: true,
    manual_source_edits_during_import: false,
    database_writes_authorized: false,
    migration_apply_authorized: false,
    provider_calls_authorized: false,
    embeddings_authorized: false,
    public_search_activation_authorized: false,
    lane_b_import_authorized: false,
    pricing_changes_authorized: false,
  });
});

test("permanent Lane A artifacts match the recorded SHA-256 manifest", () => {
  const hashManifest = readJson(path.join(AUDIT_DIR, "artifact_hashes.json"));
  assert.equal(hashManifest.hash_algorithm, "sha256");
  assert.equal(hashManifest.artifacts.length, 3);

  for (const artifact of hashManifest.artifacts) {
    const artifactPath = path.join(REPO_ROOT, artifact.path);
    const actualHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(artifactPath))
      .digest("hex");
    assert.equal(actualHash, artifact.sha256, artifact.path);
  }
});
