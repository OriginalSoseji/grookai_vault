import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  expandCandidateGameAliasesV1,
  reconcileCollectibleCandidateV1,
  reconcileCollectibleCandidatesV1,
  validateCanonicalSnapshotV1,
} from "../../backend/catalog/collectible_wave1_canonical_reconciliation_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PARSER_FIXTURES = path.join(
  ROOT, "tests", "fixtures", "collectible_shadow_parser_wave1",
);
const RECONCILIATION_FIXTURES = path.join(
  ROOT, "tests", "fixtures", "collectible_wave1_canonical_reconciliation",
);

function canonicalSnapshot() {
  return JSON.parse(fs.readFileSync(
    path.join(RECONCILIATION_FIXTURES, "canonical_snapshot.json"), "utf8",
  ));
}

function candidate(overrides = {}) {
  return {
    shadow_candidate_id: "gundam_official_v1:GX01-001",
    source_candidate_id: "GX01-001",
    source_evidence_sha256: "a".repeat(64),
    candidate_source: { source_id: "gundam_gcg_api_v1" },
    identity_coordinates: {
      game: "gundam",
      language: "en",
      set_or_product: "Fixture Gundam Set One",
      set_code: "GX01",
      collector_number: "GX01-001",
      card_name: "Fixture Unit Alpha",
      rarity: "R",
    },
    ...overrides,
  };
}

test("canonical snapshot validates domain-specific coordinates", () => {
  assert.deepEqual(validateCanonicalSnapshotV1(canonicalSnapshot()), {
    game_count: 2,
    set_count: 3,
    card_count: 4,
  });
});

test("game aliases are deterministic and canonical cards require game ownership", () => {
  assert.deepEqual(expandCandidateGameAliasesV1(["yugioh", "gundam"]), [
    "gundam",
    "gundam-card-game",
    "gundam_card_game",
    "yu-gi-oh",
    "yu_gi_oh",
    "yugioh",
  ]);
  const invalid = canonicalSnapshot();
  invalid.cards[0].game_id = "99999999-9999-4999-8999-999999999999";
  assert.throws(
    () => validateCanonicalSnapshotV1(invalid),
    /canonical card references an unknown game/,
  );
  const crossGame = canonicalSnapshot();
  crossGame.cards[0].game_id = crossGame.games[1].id;
  assert.throws(
    () => validateCanonicalSnapshotV1(crossGame),
    /canonical card and set game ownership disagree/,
  );
});

test("numberless canonical cards remain safely unmatchable", () => {
  const snapshot = canonicalSnapshot();
  const numberless = {
    ...snapshot.cards.at(-1),
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddd99",
    number: null,
    mappings: [{
      source: "gcg-api",
      external_id: "numberless-source-row",
      active: true,
    }],
  };
  snapshot.cards.push(numberless);

  assert.equal(validateCanonicalSnapshotV1(snapshot).card_count, 5);
  assert.equal(
    reconcileCollectibleCandidateV1(candidate(), snapshot).decision,
    "exact_existing_identity",
  );

  const mapped = reconcileCollectibleCandidateV1(candidate({
    source_candidate_id: "numberless-source-row",
  }), snapshot);
  assert.equal(mapped.decision, "conflicting_candidate");
  assert.ok(mapped.reason_codes.includes("source_mapping_coordinate_conflict"));
});

test("exact mapping plus exact coordinates resolves one canonical identity", () => {
  const row = reconcileCollectibleCandidateV1(candidate(), canonicalSnapshot());
  assert.equal(row.decision, "exact_existing_identity");
  assert.deepEqual(row.canonical_match_ids, [
    "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
  ]);
  assert.deepEqual(row.reason_codes, ["exact_source_mapping_and_coordinates"]);
  assert.equal(row.canonical_authority, false);
  assert.equal(row.write_authority, false);
});

test("active identity coordinates are authoritative with parent fallback only", () => {
  const snapshot = canonicalSnapshot();
  const canonical = snapshot.cards.find((row) => row.id ===
    "dddddddd-dddd-4ddd-8ddd-ddddddddddd1");
  canonical.name = "Legacy Parent Name";
  canonical.number = "LEGACY-001";
  canonical.set_code = "LEGACY";
  canonical.identities = [{
    identity_domain: "gundam_card",
    set_code_identity: "GX01",
    printed_number: "GX01-001",
    normalized_printed_name: "fixture unit alpha",
    is_active: true,
  }];

  const exact = reconcileCollectibleCandidateV1(candidate({
    source_candidate_id: "unmapped-active-identity",
  }), snapshot);
  assert.equal(exact.decision, "exact_existing_identity");
  assert.deepEqual(exact.reason_codes, ["exact_canonical_coordinates"]);

  canonical.name = "Fixture Unit Alpha";
  canonical.number = "GX01-001";
  canonical.set_code = "GX01";
  canonical.identities[0].printed_number = "GX01-099";
  const legacyParentMustNotMatch = reconcileCollectibleCandidateV1(candidate({
    source_candidate_id: "unmapped-parent-fallback",
  }), snapshot);
  assert.equal(legacyParentMustNotMatch.decision, "new_candidate");
});

test("missing game foundation blocks rather than creating a false match", () => {
  const snapshot = canonicalSnapshot();
  const removedGameId = snapshot.games.find((row) => row.code === "gundam").id;
  snapshot.games = snapshot.games.filter((row) => row.code !== "gundam");
  snapshot.sets = snapshot.sets.filter((row) => row.game_id !== removedGameId);
  snapshot.cards = snapshot.cards.filter((row) => row.game_id !== removedGameId);
  const row = reconcileCollectibleCandidateV1(candidate(), snapshot);
  assert.equal(row.decision, "blocked_missing_game_foundation");
  assert.deepEqual(row.canonical_match_ids, []);
});

test("mapping-coordinate conflicts and duplicate owners fail closed", () => {
  const conflict = reconcileCollectibleCandidateV1(candidate({
    identity_coordinates: {
      ...candidate().identity_coordinates,
      card_name: "Different Unit",
    },
  }), canonicalSnapshot());
  assert.equal(conflict.decision, "conflicting_candidate");
  assert.ok(conflict.reason_codes.includes("source_mapping_coordinate_conflict"));

  const snapshot = canonicalSnapshot();
  snapshot.cards.push({
    ...snapshot.cards.at(-1),
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
  });
  const ambiguous = reconcileCollectibleCandidateV1(candidate(), snapshot);
  assert.equal(ambiguous.decision, "ambiguous_candidate");
  assert.equal(ambiguous.canonical_match_ids.length, 2);
});

test("multiple canonical sets matching one candidate are ambiguous", () => {
  const snapshot = canonicalSnapshot();
  snapshot.sets.push({
    ...snapshot.sets.find((row) => row.code === "GX01"),
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    name: "Fixture Gundam Set Duplicate",
  });
  const row = reconcileCollectibleCandidateV1(candidate({
    source_candidate_id: "GX01-999",
    identity_coordinates: {
      ...candidate().identity_coordinates,
      collector_number: "GX01-999",
      card_name: "Unseen Unit",
    },
  }), snapshot);
  assert.equal(row.decision, "ambiguous_candidate");
  assert.ok(row.reason_codes.includes("multiple_canonical_sets_match_candidate_coordinates"));
});

test("rarity and number ownership conflicts are not treated as new cards", () => {
  const rarity = reconcileCollectibleCandidateV1(candidate({
    source_candidate_id: "unmapped-rarity",
    identity_coordinates: {
      ...candidate().identity_coordinates,
      rarity: "SP",
    },
  }), canonicalSnapshot());
  assert.equal(rarity.decision, "conflicting_candidate");
  assert.ok(rarity.reason_codes.includes("canonical_rarity_conflict"));

  const snapshot = canonicalSnapshot();
  const canonical = snapshot.cards.find((row) => row.id ===
    "dddddddd-dddd-4ddd-8ddd-ddddddddddd1");
  canonical.rarity = null;
  const missingCanonicalRarity = reconcileCollectibleCandidateV1(candidate({
    source_candidate_id: "unmapped-missing-canonical-rarity",
  }), snapshot);
  assert.equal(missingCanonicalRarity.decision, "conflicting_candidate");
  assert.ok(missingCanonicalRarity.reason_codes.includes("canonical_rarity_conflict"));

  const name = reconcileCollectibleCandidateV1(candidate({
    source_candidate_id: "unmapped-name",
    identity_coordinates: {
      ...candidate().identity_coordinates,
      card_name: "Different Unit",
    },
  }), canonicalSnapshot());
  assert.equal(name.decision, "conflicting_candidate");
  assert.ok(name.reason_codes.includes("canonical_number_owned_by_different_name"));
});

test("unresolved variant evidence remains an explicit overlay", () => {
  const row = reconcileCollectibleCandidateV1(candidate({
    variant_evidence: { mapping_status: "unresolved" },
  }), canonicalSnapshot());
  assert.equal(row.unresolved_variant_evidence, true);
  assert.ok(row.reason_codes.includes("unresolved_alternative_artwork_mapping"));
});

test("batch reconciliation rejects duplicate candidate IDs", () => {
  assert.throws(
    () => reconcileCollectibleCandidatesV1([candidate(), candidate()], canonicalSnapshot()),
    /duplicate shadow candidate ID/,
  );
});

test("batch reconciliation builds canonical indexes instead of rescanning all cards", () => {
  const module = fs.readFileSync(path.join(
    ROOT, "backend", "catalog", "collectible_wave1_canonical_reconciliation_v1.mjs",
  ), "utf8");
  assert.match(module, /function buildCanonicalIndex/);
  assert.doesNotMatch(module, /snapshot\.cards\.filter/);
});

test("worker is transaction-read-only and has no persistence authority", () => {
  const worker = fs.readFileSync(path.join(
    ROOT, "scripts", "workers", "collectible_wave1_canonical_reconciliation_v1.mjs",
  ), "utf8");
  assert.match(worker, /default_transaction_read_only=on/);
  assert.match(worker, /uselibpqcompat/);
  assert.match(worker, /certificate_authority_verification: "not_configured_for_existing_connection"/);
  assert.match(worker, /begin isolation level repeatable read read only/i);
  assert.match(worker, /transaction_ended_with: "rollback"/);
  assert.match(worker, /from public\.sets s\s+join public\.games g/);
  assert.doesNotMatch(worker, /from public\.sets s\s+left join public\.games g/);
  assert.match(worker, /g\.id = cp\.game_id\s+and \(lower\(g\.code\) = lower\(s\.game\) or lower\(g\.slug\) = lower\(s\.game\)\)/);
  assert.match(worker, /where identity\.card_print_id = cp\.id\s+and identity\.is_active = true/);
  assert.match(worker, /where mapping\.card_print_id = cp\.id\s+and mapping\.active = true/);
  assert.match(worker, /"ambiguous_candidate",\s+"conflicting_candidate",\s+"blocked_missing_game_foundation"/);
  const cardQuery = worker.slice(worker.indexOf("from public.card_prints cp"));
  assert.doesNotMatch(cardQuery, /where lower\(coalesce\(s\.game, ''\)\) = any/);
  assert.match(worker, /database_writes: false/);
  assert.match(worker, /storage_access: false/);
  assert.match(worker, /writer_dispatches: false/);
  assert.doesNotMatch(worker, /(?:insert\s+into|update\s+\w+\s+set|delete\s+from|truncate)/i);
  assert.doesNotMatch(worker, /@supabase\/supabase-js|storage\.from|\.upload\(/i);
});

test("fixture CLI reconciles every parser candidate and hashes every output", () => {
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const parserOut = fs.mkdtempSync(path.join(os.tmpdir(), "collectible-wave1-parser-"));
  const parserRun = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_shadow_parser_wave1_v1.mjs"),
    `--out-dir=${parserOut}`,
    `--expected-head-sha=${head}`,
    `--fixture-dir=${PARSER_FIXTURES}`,
    "--max-response-bytes=1048576",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.equal(parserRun.status, 0, parserRun.stderr);
  const candidateSha = crypto.createHash("sha256")
    .update(fs.readFileSync(path.join(parserOut, "candidate_index.jsonl"))).digest("hex");
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "collectible-wave1-reconcile-"));
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_wave1_canonical_reconciliation_v1.mjs"),
    `--out-dir=${output}`,
    `--expected-head-sha=${head}`,
    `--parser-artifact-dir=${parserOut}`,
    "--parser-run-id=fixture-run",
    `--expected-candidate-sha256=${candidateSha}`,
    `--canonical-fixture=${path.join(RECONCILIATION_FIXTURES, "canonical_snapshot.json")}`,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(fs.readFileSync(path.join(output, "summary.json"), "utf8"));
  assert.equal(summary.selected_candidate_count, 5);
  assert.equal(summary.reconciled_candidate_count, 5);
  assert.equal(summary.decision_bucket_count_sum, 5);
  assert.equal(summary.blocking_decision_count, 0);
  assert.deepEqual(summary.decision_counts, {
    exact_existing_identity: 4,
    new_candidate: 1,
  });
  assert.equal(summary.artifact_limitation_count, 1);
  assert.equal(summary.unresolved_variant_aggregate_source_count, 1);
  assert.equal(summary.unresolved_variant_row_count, 0);
  assert.equal(summary.database_proof.database_access, false);
  const manifest = JSON.parse(fs.readFileSync(
    path.join(output, "artifact_hashes.json"), "utf8",
  ));
  for (const artifact of manifest.artifacts) {
    const actual = crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(output, artifact.path))).digest("hex");
    assert.equal(actual, artifact.sha256, artifact.path);
  }
  const rows = fs.readFileSync(path.join(output, "reconciliation_index.jsonl"), "utf8")
    .trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(rows.length, 5);
  assert.equal(new Set(rows.map((row) => row.shadow_candidate_id)).size, 5);
});

test("workflow is manual, exact-artifact, read-only, and secret-bounded", () => {
  const workflow = fs.readFileSync(path.join(
    ROOT, ".github", "workflows", "collectible-wave1-canonical-reconciliation.yml",
  ), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /if:\s*github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)/);
  assert.match(workflow, /ref:\s*\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /test "\$GITHUB_REF" = "refs\/heads\/\$\{\{ github\.event\.repository\.default_branch \}\}"/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.match(workflow, /run-id:\s*"33118951166"/);
  assert.match(workflow, /30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f/);
  assert.doesNotMatch(workflow, /inputs\./);
  assert.match(workflow, /PGOPTIONS:.*default_transaction_read_only=on/);
  assert.match(workflow, /SUPABASE_DB_URL:\s*\$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.doesNotMatch(workflow, /--apply|SUPABASE_STORAGE|storage\.from|\.upload\(|embeddings/i);
});

test("live worker rejects a caller-substituted artifact tuple before database access", () => {
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_wave1_canonical_reconciliation_v1.mjs"),
    `--out-dir=${fs.mkdtempSync(path.join(os.tmpdir(), "collectible-wave1-frozen-"))}`,
    `--expected-head-sha=${head}`,
    `--parser-artifact-dir=${PARSER_FIXTURES}`,
    "--parser-run-id=99999999999",
    `--expected-candidate-sha256=${"f".repeat(64)}`,
    "--db-url=postgres://invalid:invalid@127.0.0.1:1/invalid",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /does not match the frozen artifact tuple/);
  assert.doesNotMatch(run.stderr, /ECONNREFUSED/);
});

test("contract freezes classifications, aggregate variant limits, and stop boundary", () => {
  const contract = fs.readFileSync(path.join(
    ROOT, "docs", "contracts", "COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_V1.md",
  ), "utf8");
  assert.match(contract, /blocked_missing_game_foundation/);
  assert.match(contract, /exact_existing_identity/);
  assert.match(contract, /Aggregate unresolved-variant evidence/);
  assert.match(contract, /Stop after one exact-artifact/);
  assert.match(contract, /Do not create game foundations/);
});
