import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  collectibleShadowParserWave1SourcesV1,
  parseGundamGcgApiCandidatesV1,
  parseYugiohYgoprodeckCandidatesV1,
} from "../../backend/catalog/collectible_shadow_parser_wave1_v1.mjs";
import {
  sanitizeSnapshotUrlV1,
} from "../../scripts/workers/collectible_shadow_parser_wave1_v1.mjs";
import {
  validateCollectibleShadowAdapterRegistryV1,
} from "../../backend/catalog/collectible_shadow_adapter_registry_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const FIXTURES = path.join(ROOT, "tests", "fixtures", "collectible_shadow_parser_wave1");
const EVIDENCE_HASH = "a".repeat(64);

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

function assertCandidateBoundary(candidate) {
  assert.equal(candidate.authority, "shadow_evidence_not_canonical");
  assert.equal(candidate.canonical_authority, false);
  assert.equal(candidate.image_republication_authorized, false);
  assert.match(candidate.source_evidence_sha256, /^[0-9a-f]{64}$/);
  assert.ok(candidate.source_candidate_id);
  assert.ok(candidate.identity_coordinates.card_name);
  const serialized = JSON.stringify(candidate);
  assert.doesNotMatch(serialized, /"(?:desc|effect|card_prices|set_price|image_url|rulings)"/i);
  assert.doesNotMatch(serialized, /images\.invalid/i);
}

test("Wave 1 registers exactly two terms-classified parser sources", () => {
  const registry = validateCollectibleShadowAdapterRegistryV1();
  assert.equal(registry.parser_source_count, 2);
  const bindings = collectibleShadowParserWave1SourcesV1();
  assert.deepEqual(bindings.map((row) => row.source.source_id), [
    "yugioh_ygoprodeck_api_v7",
    "gundam_gcg_api_v1",
  ]);
  assert.equal(bindings[0].adapter.catalog_key, "yugioh");
  assert.equal(bindings[1].adapter.catalog_key, "gundam");
  assert.equal(bindings[0].source.catalog_extraction, "documented_public_api_internal_metadata");
  assert.equal(bindings[1].source.data_license, "ODbL-1.0");
  for (const { source } of bindings) {
    assert.equal(source.allowed_persistence, "internal_shadow_identity_metadata_only");
    assert.equal(source.image_republication, "not_authorized");
    assert.equal(source.self_hosting, "not_authorized");
  }
});

test("Yu-Gi-Oh parser emits deterministic printing candidates only", () => {
  const parsed = parseYugiohYgoprodeckCandidatesV1(
    readJson("yugioh_ygoprodeck_api_v7.data.json"),
    EVIDENCE_HASH,
  );
  assert.equal(parsed.candidates.length, 3);
  assert.equal(parsed.failures.length, 0);
  assert.equal(parsed.metrics.source_card_count, 3);
  assert.equal(parsed.metrics.source_printing_entry_count, 4);
  assert.equal(parsed.metrics.exact_duplicate_count, 1);
  assert.equal(parsed.metrics.cards_without_printing_evidence, 1);
  assert.equal(parsed.metrics.cards_with_unresolved_alternative_artwork, 1);
  assert.deepEqual(parsed.candidates.map((row) => row.shadow_candidate_id),
    [...parsed.candidates.map((row) => row.shadow_candidate_id)].sort());
  for (const candidate of parsed.candidates) assertCandidateBoundary(candidate);
});

test("Gundam parser preserves product-level identity and strips content", () => {
  const rows = fs.readFileSync(
    path.join(FIXTURES, "gundam_gcg_api_v1.data.ndjson"),
    "utf8",
  ).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const parsed = parseGundamGcgApiCandidatesV1(rows, EVIDENCE_HASH);
  assert.equal(parsed.candidates.length, 2);
  assert.equal(parsed.failures.length, 0);
  assert.deepEqual(parsed.candidates.map((row) => row.source_candidate_id), [
    "GX01-001",
    "GX02-002-SP",
  ]);
  assert.equal(parsed.candidates[1].identity_coordinates.collector_number, "GX02-002");
  for (const candidate of parsed.candidates) assertCandidateBoundary(candidate);
});

test("conflicting source identity is review-routed instead of overwritten", () => {
  const rows = [
    {
      product_id: "GX01-001",
      card_number: "GX01-001",
      name: "Fixture Unit Alpha",
      set_code: "GX01",
      set_name: "Fixture Set",
      rarity: "R",
    },
    {
      product_id: "GX01-001",
      card_number: "GX01-999",
      name: "Conflicting Fixture Unit",
      set_code: "GX01",
      set_name: "Fixture Set",
      rarity: "R",
    },
  ];
  const parsed = parseGundamGcgApiCandidatesV1(rows, EVIDENCE_HASH);
  assert.equal(parsed.candidates.length, 1);
  assert.equal(parsed.failures.length, 1);
  assert.equal(parsed.failures[0].failure_class, "conflicting_source_identity");
});

test("parser worker has no production, image, or scheduling capability", () => {
  const worker = fs.readFileSync(
    path.join(ROOT, "scripts", "workers", "collectible_shadow_parser_wave1_v1.mjs"),
    "utf8",
  );
  assert.doesNotMatch(worker, /from "pg"|@supabase|SUPABASE_DB_URL|DATABASE_URL/);
  assert.doesNotMatch(
    worker,
    /(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|TRUNCATE\s+(?:TABLE\s+)?)/i,
  );
  assert.match(worker, /database_access: false/);
  assert.match(worker, /database_writes: false/);
  assert.match(worker, /storage_writes: false/);
  assert.match(worker, /image_downloads: false/);
  assert.match(worker, /writer_dispatches: false/);
  assert.match(worker, /request_timeout_ms/);
  assert.match(worker, /new AbortController\(\)/);
  assert.match(worker, /signal: controller\.signal/);
  assert.doesNotMatch(worker, /\.(?:desc|effect|card_prices|set_price|image_url)\b/);
});

test("source snapshots strip signed query and fragment data", () => {
  assert.equal(
    sanitizeSnapshotUrlV1("https://assets.example.test/cards.ndjson?sig=secret&expires=1#fragment"),
    "https://assets.example.test/cards.ndjson",
  );
});

test("fixture worker emits a reconciled candidate-only artifact set", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "collectible-parser-wave1-"));
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_shadow_parser_wave1_v1.mjs"),
    `--out-dir=${output}`,
    `--expected-head-sha=${head}`,
    `--fixture-dir=${FIXTURES}`,
    "--max-response-bytes=1048576",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(fs.readFileSync(path.join(output, "summary.json"), "utf8"));
  const plan = JSON.parse(fs.readFileSync(path.join(output, "run_plan.json"), "utf8"));
  const completeness = JSON.parse(fs.readFileSync(
    path.join(output, "completeness_report.json"), "utf8"));
  const candidates = fs.readFileSync(path.join(output, "candidate_index.jsonl"), "utf8")
    .trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  assert.equal(summary.status, "completed");
  assert.equal(summary.selected_source_count, 2);
  assert.equal(summary.candidate_count, 5);
  assert.equal(summary.validation_failure_count, 0);
  assert.equal(new Set(candidates.map((row) => row.shadow_candidate_id)).size, 5);
  assert.ok(completeness.every((row) => row.review_status === "likely_complete"));
  assert.equal(plan.boundaries.database_access, false);
  assert.equal(plan.boundaries.database_writes, false);
  assert.equal(plan.boundaries.storage_writes, false);
  assert.equal(plan.boundaries.image_downloads, false);
  for (const candidate of candidates) assertCandidateBoundary(candidate);
  assert.deepEqual(fs.readdirSync(output).sort(), [
    "artifact_hashes.json",
    "candidate_index.jsonl",
    "completeness_report.json",
    "run_plan.json",
    "source_snapshots.json",
    "summary.json",
    "validation_failures.jsonl",
  ]);
  const manifest = JSON.parse(fs.readFileSync(path.join(output, "artifact_hashes.json"), "utf8"));
  for (const entry of manifest.artifacts) {
    const actual = crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(output, entry.path))).digest("hex");
    assert.equal(actual, entry.sha256, entry.path);
  }
});

test("Wave 1 workflow is manual, exact-SHA, and secret-free", () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "collectible-shadow-parser-wave1.yml"),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /CATALOG_AUTOMATION_MODE:\s*shadow-only/);
  assert.match(workflow, /ref:\s*\$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /SUPABASE|DATABASE_URL|POSTGRES|--apply|--mode=apply/);
});

test("Wave 1 contract preserves metadata and rights boundaries", () => {
  const contract = fs.readFileSync(
    path.join(ROOT, "docs", "contracts", "COLLECTIBLE_SHADOW_PARSER_WAVE1_V1.md"),
    "utf8",
  );
  assert.match(contract, /documented public API/);
  assert.match(contract, /ODbL 1\.0/);
  assert.match(contract, /must never contain:/);
  assert.match(contract, /Stop after one bounded live shadow run/);
});
