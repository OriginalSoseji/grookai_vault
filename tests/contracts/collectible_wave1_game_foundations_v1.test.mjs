import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION,
  COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION,
  COLLECTIBLE_WAVE1_GAMES,
  compareWave1ProtectedCountsV1,
  evaluateWave1FoundationBaselineV1,
  evaluateWave1FoundationTransientV1,
} from "../../backend/catalog/collectible_wave1_game_foundations_v1.mjs";
import { parseArgs } from "../../scripts/audits/collectible_wave1_game_foundations_rollback_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MIGRATION = fs.readFileSync(path.join(
  ROOT,
  "supabase",
  "migrations",
  `${COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION}_collectible_wave1_game_foundations_v1.sql`,
), "utf8");
const RUNNER = fs.readFileSync(path.join(
  ROOT,
  "scripts",
  "audits",
  "collectible_wave1_game_foundations_rollback_v1.mjs",
), "utf8");
const AUDIT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_game_foundations_v1",
  "production_rollback_v1",
);

function baseline(overrides = {}) {
  return {
    transaction_read_only: true,
    latest_migration: "20260828021500",
    candidate_migration_count: 0,
    candidate_game_code_count: 0,
    candidate_game_id_count: 0,
    candidate_game_slug_count: 0,
    candidate_release_control_count: 0,
    conflicting_lock_count: 0,
    games_rls_enabled: true,
    release_controls_rls_enabled: true,
    anon_release_control_select: false,
    authenticated_release_control_select: false,
    service_release_control_select: true,
    service_release_control_insert: true,
    visibility_function_count: 4,
    ...overrides,
  };
}

test("foundation seeds exactly two deterministic hidden games", () => {
  assert.deepEqual(COLLECTIBLE_WAVE1_GAMES.map((row) => row.code).sort(), [
    "gundam",
    "yugioh",
  ]);
  assert.equal(new Set(COLLECTIBLE_WAVE1_GAMES.map((row) => row.id)).size, 2);
  assert.equal((MIGRATION.match(/insert into public\.games/g) ?? []).length, 1);
  assert.equal(
    (MIGRATION.match(/insert into public\.catalog_game_release_controls/g) ?? []).length,
    1,
  );
  assert.match(MIGRATION, /'hidden'/);
  assert.match(MIGRATION, new RegExp(COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION));
  assert.match(
    MIGRATION,
    /release_version = 'COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1'[\s\S]*?and evidence = jsonb_build_object/,
  );
});

test("migration cannot mutate catalog, identity, product, or user data", () => {
  assert.match(MIGRATION, /^-- COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1/);
  assert.match(MIGRATION, /\bbegin;/i);
  assert.match(MIGRATION, /\bcommit;/i);
  assert.doesNotMatch(MIGRATION, /\b(?:update|delete|truncate|alter|drop|create)\b/i);
  for (const table of [
    "sets",
    "card_prints",
    "card_print_identity",
    "card_printings",
    "external_mappings",
    "external_printing_mappings",
    "sealed_product",
    "storage.objects",
    "vault_items",
    "market_price",
  ]) {
    assert.doesNotMatch(MIGRATION, new RegExp(`insert into public\\.${table}`, "i"));
  }
});

test("clean production-shaped baseline passes and collisions fail closed", () => {
  assert.deepEqual(evaluateWave1FoundationBaselineV1(baseline()), []);
  assert.deepEqual(
    evaluateWave1FoundationBaselineV1(baseline({ candidate_game_slug_count: 1 })),
    ["candidate_game_slug_count_not_zero"],
  );
});

test("transient readback requires exact rows and hidden visibility for every role", () => {
  const releaseControls = COLLECTIBLE_WAVE1_GAMES.map((row) => ({
    game_code: row.code,
    release_status: "hidden",
    release_version: COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION,
    evidence: {
      default: "fail_closed",
      canonical_promotion_authorizes_visibility: false,
      price_publication_authorizes_visibility: false,
      storage_upload_authorizes_visibility: false,
      foundation_scope: "game_metadata_only",
    },
  }));
  const visibility = Object.fromEntries(["anon", "authenticated", "service_role"].map(
    (role) => [role, { yugioh: false, gundam: false }],
  ));
  const valid = {
    games: COLLECTIBLE_WAVE1_GAMES.map((row) => ({ ...row })),
    release_controls: releaseControls,
    visibility,
  };
  assert.deepEqual(evaluateWave1FoundationTransientV1(valid), []);
  const leaked = structuredClone(valid);
  leaked.visibility.authenticated.yugioh = true;
  assert.deepEqual(evaluateWave1FoundationTransientV1(leaked), [
    "game_not_hidden:authenticated:yugioh",
  ]);
});

test("protected count comparison permits only explicit deltas", () => {
  const before = { games: 4, release_controls: 2, cards: 100 };
  const after = { games: 6, release_controls: 4, cards: 100 };
  assert.deepEqual(compareWave1ProtectedCountsV1(before, after, {
    games: 2,
    release_controls: 2,
  }), []);
  assert.match(
    compareWave1ProtectedCountsV1(before, { ...after, cards: 101 }, {
      games: 2,
      release_controls: 2,
    })[0],
    /protected_count_mismatch:cards/,
  );
});

test("rollback runner is inert without exact execution guards", () => {
  assert.throws(() => parseArgs([]), /execute-rollback-only/);
  assert.throws(() => parseArgs(["--execute-rollback-only"]), /expected-head-sha/);
  const options = parseArgs([
    "--execute-rollback-only",
    `--expected-head-sha=${"a".repeat(40)}`,
  ]);
  assert.equal(options.execute, true);
  assert.equal(options.expectedHeadSha, "a".repeat(40));
});

test("rollback runner writes the plan before connecting and never commits", () => {
  const runPlanWrite = RUNNER.indexOf("writeJson(path.join(options.outDir, \"run_plan.json\"");
  const connectionLookup = RUNNER.indexOf("marketEvidenceDbUrl()");
  assert.ok(runPlanWrite > 0 && runPlanWrite < connectionLookup);
  assert.match(RUNNER, /await client\.query\("rollback"\)/);
  assert.doesNotMatch(RUNNER, /client\.query\(["'`]commit/i);
  assert.match(RUNNER, /durable_database_writes:\s*0/);
  assert.match(RUNNER, /identity_domain_constraint_changes:\s*0/);
});

test("production rollback artifacts reconcile and prove exact restoration", () => {
  const hashes = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, "artifact_hashes.json")));
  for (const artifact of hashes.artifacts) {
    const body = fs.readFileSync(path.join(AUDIT_DIR, artifact.artifact_path));
    assert.equal(
      crypto.createHash("sha256").update(body).digest("hex"),
      artifact.sha256,
      artifact.artifact_path,
    );
    assert.doesNotMatch(body.toString("utf8"), /(?:postgres(?:ql)?:\/\/|password|SUPABASE_DB_URL)/i);
  }

  const summary = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, "summary.json")));
  const before = fs.readFileSync(path.join(AUDIT_DIR, "protected_before.json"), "utf8");
  const after = fs.readFileSync(path.join(AUDIT_DIR, "post_rollback_readback.json"), "utf8");
  const transaction = JSON.parse(fs.readFileSync(
    path.join(AUDIT_DIR, "transaction_proof.json"),
  ));
  assert.equal(summary.status, "rollback_canary_passed_zero_durable_change");
  assert.equal(
    summary.migration.sha256,
    crypto.createHash("sha256").update(MIGRATION).digest("hex"),
  );
  assert.equal(summary.rollback_succeeded, true);
  assert.equal(summary.findings.length, 0);
  assert.equal(before, after);
  assert.equal(transaction.transient_readback.games.length, 2);
  assert.equal(transaction.transient_readback.release_controls.length, 2);
  assert.equal(transaction.findings.length, 0);
  assert.deepEqual(transaction.transient_readback.visibility, {
    anon: { gundam: false, yugioh: false },
    authenticated: { gundam: false, yugioh: false },
    service_role: { gundam: false, yugioh: false },
  });
});
