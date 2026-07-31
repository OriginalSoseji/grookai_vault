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
  "docs/audits/card_visual_search_lane_b_import/2026-07-29_lane_b_import_d3e9042c",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function payloadHash(record, hashField) {
  const { [hashField]: actualHash, ...payload } = record;
  return {
    actualHash,
    expectedHash: crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
}

function laneBFiles(manifest) {
  return manifest.components
    .filter((component) => component.decision === "import_later")
    .flatMap((component) => component.files)
    .sort((left, right) => left.source_path.localeCompare(right.source_path));
}

test("Lane B import plan is exact and holdout-safe", () => {
  const manifest = readJson(MANIFEST_PATH);
  const plan = readJson(path.join(AUDIT_DIR, "import_plan.json"));
  const hashes = payloadHash(plan, "plan_payload_sha256");

  assert.equal(hashes.actualHash, hashes.expectedHash);
  assert.equal(plan.import_version, "CARD_VISUAL_SEARCH_LANE_B_IMPORT_V1");
  assert.equal(plan.pre_import_head_sha, "d3e9042cfd4b0d4432cdb91940d615f2d687aeea");
  assert.equal(plan.selected_file_count, 5);
  assert.equal(plan.boundaries.holdout_execution_authorized, false);
  assert.deepEqual(
    plan.selected_files.map((file) => file.source_path),
    laneBFiles(manifest).map((file) => file.source_path),
  );
});

test("Lane B import reconciles all five destination hashes", () => {
  const manifest = readJson(MANIFEST_PATH);
  const reconciliation = readJson(path.join(AUDIT_DIR, "import_reconciliation.json"));
  const hashes = payloadHash(reconciliation, "reconciliation_payload_sha256");
  const expectedByPath = new Map(
    laneBFiles(manifest).map((file) => [file.destination_path, file.source_sha256]),
  );

  assert.equal(hashes.actualHash, hashes.expectedHash);
  assert.equal(reconciliation.status, "reconciled");
  assert.equal(reconciliation.planned_file_count, 5);
  assert.equal(reconciliation.written_file_count, 5);
  assert.equal(reconciliation.matching_file_count, 5);
  assert.equal(reconciliation.mismatched_file_count, 0);
  assert.equal(reconciliation.missing_file_count, 0);
  assert.equal(reconciliation.extra_imported_file_count, 0);

  for (const outcome of reconciliation.outcomes) {
    const destinationPath = path.join(REPO_ROOT, outcome.destination_path);
    const destinationHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(destinationPath))
      .digest("hex");
    assert.equal(outcome.hash_match, true);
    assert.equal(destinationHash, expectedByPath.get(outcome.destination_path));
  }
});

test("permanent Lane B artifacts match the recorded SHA-256 manifest", () => {
  const hashManifest = readJson(path.join(AUDIT_DIR, "artifact_hashes.json"));
  assert.equal(hashManifest.hash_algorithm, "sha256");
  assert.equal(hashManifest.artifacts.length, 3);

  for (const artifact of hashManifest.artifacts) {
    const actualHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(REPO_ROOT, artifact.path)))
      .digest("hex");
    assert.equal(actualHash, artifact.sha256, artifact.path);
  }
});
