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

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function allFiles(manifest) {
  return manifest.components.flatMap((component) =>
    component.files.map((file) => ({
      ...file,
      component_id: component.component_id,
      lane: component.lane,
      decision: component.decision,
      governing_contracts: component.governing_contracts,
      focused_tests: component.focused_tests,
    })),
  );
}

test("manifest is pinned to the governed source and production baseline", () => {
  const manifest = loadManifest();
  assert.equal(manifest.manifest_version, "CARD_VISUAL_SEARCH_SOURCE_IMPORT_MANIFEST_V1");
  assert.equal(manifest.production_baseline.commit_sha, "3c862b815735a4eda93b65ac108fc583f1c62fc9");
  assert.equal(manifest.governed_source.commit_sha, "c5bbbba5dea998fcd51d0d8602601737356a1494");
  assert.equal(manifest.target.branch, "feature/visual-search-v1-productization");
  assert.equal(manifest.target.broad_merge_allowed, false);
});

test("manifest payload hash is stable and valid", () => {
  const manifest = loadManifest();
  const { manifest_payload_sha256: actualHash, ...payload } = manifest;
  const expectedHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  assert.equal(actualHash, expectedHash);
  assert.match(actualHash, /^[a-f0-9]{64}$/u);
});

test("every selected source file has unique provenance and an owner contract/test", () => {
  const manifest = loadManifest();
  const files = allFiles(manifest);
  const paths = files.map((file) => file.source_path);

  assert.equal(new Set(paths).size, paths.length);
  assert.equal(manifest.summary.selected_source_file_count, files.length);
  assert.equal(manifest.summary.duplicate_source_path_count, 0);

  for (const file of files) {
    assert.equal(file.destination_path, file.source_path);
    assert.match(file.source_blob_oid, /^[a-f0-9]{40}$/u);
    assert.match(file.source_sha256, /^[a-f0-9]{64}$/u);
    assert.match(file.source_last_commit_sha, /^[a-f0-9]{40}$/u);
    assert.ok(file.governing_contracts.length > 0, `${file.source_path} is missing a governing contract`);
    assert.ok(file.focused_tests.length > 0, `${file.source_path} is missing focused tests`);
  }
});

test("Lane A contains the complete deterministic search backbone", () => {
  const manifest = loadManifest();
  const laneAComponents = new Set(
    manifest.components
      .filter((component) => component.lane === "A_deterministic_core")
      .map((component) => component.component_id),
  );

  for (const required of [
    "governing_contracts",
    "corpus_inventory",
    "search_eligibility",
    "artwork_grouping",
    "deterministic_projection",
    "query_candidate_core",
  ]) {
    assert.ok(laneAComponents.has(required), `Missing Lane A component: ${required}`);
  }
});

test("import-now files contain no pricing paths, generated audits, or migrations", () => {
  const manifest = loadManifest();
  const importNow = allFiles(manifest).filter((file) => file.decision === "import_now");

  assert.ok(importNow.length > 0);
  for (const file of importNow) {
    assert.doesNotMatch(file.source_path, /pricing/iu);
    assert.equal(file.source_path.startsWith("docs/audits/"), false);
    assert.equal(file.source_path.startsWith("supabase/migrations/"), false);
    assert.equal(file.source_path.includes("card_visual_description_agent_v1"), false);
  }
  assert.equal(manifest.summary.pricing_source_file_count, 0);
  assert.equal(manifest.summary.generated_audit_source_file_count, 0);
});

test("generated portal bundle and superseded contracts are explicitly excluded", () => {
  const manifest = loadManifest();
  const components = new Map(manifest.components.map((component) => [component.component_id, component]));

  assert.equal(components.get("generated_portal_bundle")?.decision, "exclude_generated");
  assert.equal(components.get("superseded_contracts")?.decision, "exclude_superseded");
  assert.ok(
    components
      .get("generated_portal_bundle")
      .files.some((file) => file.source_path.endsWith("CALIBRATION_REVIEW_DASHBOARD.html.br")),
  );
});

test("production runtime, persistence, UI, and embeddings remain rebuild gates", () => {
  const manifest = loadManifest();
  const rebuilds = new Set(manifest.planned_rebuilds.map((component) => component.component_id));

  for (const required of [
    "production_index_migration",
    "governed_visual_search_rpc",
    "collector_visual_search_service",
    "collector_search_ui",
    "embedding_build_pipeline",
  ]) {
    assert.ok(rebuilds.has(required), `Missing production rebuild: ${required}`);
  }
});

test("manifest preserves all no-write and no-activation boundaries", () => {
  const boundaries = loadManifest().boundaries;

  assert.deepEqual(boundaries, {
    database_writes_authorized: false,
    migration_apply_authorized: false,
    embeddings_authorized: false,
    provider_calls_authorized: false,
    public_search_activation_authorized: false,
    energy_cards_included: false,
    pricing_files_allowed: false,
    generated_bulk_evidence_allowed: false,
  });
});
