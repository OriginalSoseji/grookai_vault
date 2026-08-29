import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  collectibleShadowParserWave1SourcesV1,
  extractYugiohAlternativeArtworkEvidenceV1,
  parseGundamGcgApiCandidatesV1,
  parseYugiohYgoprodeckCandidatesV1,
} from "../../backend/catalog/collectible_shadow_parser_wave1_v1.mjs";
import {
  sanitizeSnapshotUrlV1,
  validateGundamAuxiliaryPayloadsV1,
  validateYugiohAuxiliaryPayloadsV1,
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

test("Yu-Gi-Oh alternative-artwork evidence is source-ID addressable", () => {
  const payload = readJson("yugioh_ygoprodeck_api_v7.data.json");
  const parsed = parseYugiohYgoprodeckCandidatesV1(payload, EVIDENCE_HASH);
  const rows = extractYugiohAlternativeArtworkEvidenceV1(
    payload,
    EVIDENCE_HASH,
    parsed.candidates,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_card_id, "1001");
  assert.deepEqual(rows[0].source_image_ids, ["1001", "1002"]);
  assert.equal(rows[0].source_printing_candidate_count, 2);
  assert.deepEqual(rows[0].source_printing_candidate_ids, [
    "yugioh_official_v1:1001|FSA-EN001|Super Rare",
    "yugioh_official_v1:1001|FSA-EN001|Ultra Rare",
  ]);
  assert.equal(rows[0].mapping_status, "unresolved_artwork_to_printing");
  assert.equal(rows[0].canonical_authority, false);
  assert.equal(rows[0].write_authority, false);
  assert.equal(rows[0].image_content_accessed, false);
  assert.doesNotMatch(JSON.stringify(rows), /image_url|images\.invalid/i);
});

test("alternative-artwork evidence fails closed without distinct stable image IDs", () => {
  const payload = readJson("yugioh_ygoprodeck_api_v7.data.json");
  payload.data[0].card_images[1].id = payload.data[0].card_images[0].id;
  const parsed = parseYugiohYgoprodeckCandidatesV1(payload, EVIDENCE_HASH);
  assert.throws(
    () => extractYugiohAlternativeArtworkEvidenceV1(
      payload,
      EVIDENCE_HASH,
      parsed.candidates,
    ),
    /lacks distinct stable image IDs/,
  );
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

test("auxiliary API error envelopes cannot report a complete source", () => {
  assert.doesNotThrow(() => validateYugiohAuxiliaryPayloadsV1(
    readJson("yugioh_ygoprodeck_api_v7.manifest.json"),
    readJson("yugioh_ygoprodeck_api_v7.sets.json"),
  ));
  assert.throws(
    () => validateYugiohAuxiliaryPayloadsV1({ error: "rate limited" }, []),
    /manifest payload is malformed/,
  );
  assert.throws(
    () => validateYugiohAuxiliaryPayloadsV1(
      readJson("yugioh_ygoprodeck_api_v7.manifest.json"),
      { error: "changed schema" },
    ),
    /set manifest payload is malformed/,
  );
  assert.doesNotThrow(() => validateGundamAuxiliaryPayloadsV1(
    readJson("gundam_gcg_api_v1.manifest.json"),
    readJson("gundam_gcg_api_v1.sets.json"),
  ));
  assert.throws(
    () => validateGundamAuxiliaryPayloadsV1({ error: "unavailable" }, { data: [] }),
    /manifest payload is malformed/,
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

test("fixture worker emits a bounded alternative-artwork index on explicit request", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "collectible-alt-art-wave1-"));
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_shadow_parser_wave1_v1.mjs"),
    `--out-dir=${output}`,
    `--expected-head-sha=${head}`,
    `--fixture-dir=${FIXTURES}`,
    "--source-ids=yugioh_ygoprodeck_api_v7",
    "--emit-yugioh-alt-art-index",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.equal(run.status, 0, run.stderr);
  const rows = fs.readFileSync(
    path.join(output, "alternative_artwork_index.jsonl"),
    "utf8",
  ).trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const summary = JSON.parse(fs.readFileSync(path.join(output, "summary.json"), "utf8"));
  const plan = JSON.parse(fs.readFileSync(path.join(output, "run_plan.json"), "utf8"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_card_id, "1001");
  assert.equal(summary.alternative_artwork_source_card_count, 1);
  assert.equal(summary.alternative_artwork_printing_candidate_reference_count, 2);
  assert.equal(plan.emit_yugioh_alt_art_index, true);
  assert.equal(plan.alt_art_refinement.expected_source_card_count, 1);
  assert.deepEqual(fs.readdirSync(output).sort(), [
    "alternative_artwork_index.jsonl",
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

test("alternative-artwork refinement preserves failure artifacts on source drift", () => {
  const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), "collectible-alt-art-fixtures-"));
  for (const name of fs.readdirSync(FIXTURES)) {
    fs.copyFileSync(path.join(FIXTURES, name), path.join(fixtures, name));
  }
  const cardsPath = path.join(fixtures, "yugioh_ygoprodeck_api_v7.data.json");
  const payload = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
  payload.data[0].name = "Drifted Fixture Name";
  fs.writeFileSync(cardsPath, `${JSON.stringify(payload, null, 2)}\n`);

  const output = fs.mkdtempSync(path.join(os.tmpdir(), "collectible-alt-art-drift-"));
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_shadow_parser_wave1_v1.mjs"),
    `--out-dir=${output}`,
    `--fixture-dir=${fixtures}`,
    "--source-ids=yugioh_ygoprodeck_api_v7",
    "--emit-yugioh-alt-art-index",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.equal(run.status, 1, run.stderr);
  const summary = JSON.parse(fs.readFileSync(path.join(output, "summary.json"), "utf8"));
  const failures = fs.readFileSync(
    path.join(output, "validation_failures.jsonl"),
    "utf8",
  ).trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const snapshots = JSON.parse(fs.readFileSync(
    path.join(output, "source_snapshots.json"),
    "utf8",
  ));
  assert.equal(summary.status, "completed_with_source_failures");
  assert.equal(summary.failed_source_count, 1);
  assert.equal(summary.alternative_artwork_source_card_count, 0);
  assert.equal(failures.length, 1);
  assert.match(failures[0].error.message, /source response drifted/);
  assert.equal(snapshots.length, 3);
  const cardSnapshot = snapshots.find((row) => /cardinfo\.php/.test(row.source_url));
  assert.match(cardSnapshot.response_sha256, /^[0-9a-f]{64}$/);
  assert.notEqual(
    cardSnapshot.response_sha256,
    failures[0].error.evidence.expected_source_sha256,
  );
  assert.equal(
    cardSnapshot.response_sha256,
    failures[0].error.evidence.observed_source_sha256,
  );
  assert.ok(fs.existsSync(path.join(output, "artifact_hashes.json")));
});

test("Wave 1 workflow is daily, exact-SHA, and secret-free", () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "collectible-shadow-parser-wave1.yml"),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /cron:\s*"3 8 \* \* \*"/);
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
  assert.match(contract, /Each execution stops after one bounded shadow run/);
  assert.match(contract, /must not write candidates to production/);
});

test("alternative-artwork refinement workflow is immutable, bounded, and secret-free", () => {
  const workflow = fs.readFileSync(
    path.join(
      ROOT,
      ".github",
      "workflows",
      "collectible-wave1-alt-art-row-addressability.yml",
    ),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /ref:\s*\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /--source-ids=yugioh_ygoprodeck_api_v7/);
  assert.match(workflow, /--emit-yugioh-alt-art-index/);
  assert.match(workflow, /alternative_artwork_source_card_count !== 124/);
  assert.doesNotMatch(
    workflow,
    /SUPABASE|DATABASE_URL|POSTGRES|OPENAI|--apply|--mode=apply|schedule:/,
  );

  const contract = fs.readFileSync(
    path.join(ROOT, "docs", "contracts", "COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_V1.md"),
    "utf8",
  );
  assert.match(contract, /Multi-image source card count: `124`/);
  assert.match(contract, /no database or Storage access/);
  assert.match(contract, /no image download, inspection, self-hosting, or URL persistence/);
  assert.match(contract, /no artwork-to-printing guess/);
});
