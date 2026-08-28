import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION,
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD,
  collectibleWave1SetDatabaseRowsV1,
  compareCollectibleWave1ProtectedCountsV1,
  evaluateCollectibleWave1SetRollbackBaselineV1,
  evaluateCollectibleWave1SetTransientV1,
  parseCollectibleWave1SetPayloadV1,
  renderCollectibleWave1SetFoundationsMigrationV1,
} from "../../backend/catalog/collectible_wave1_set_foundations_v1.mjs";
import { parseArgs } from
  "../../scripts/audits/collectible_wave1_set_foundations_rollback_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PAYLOAD_PATH = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_set_apply_proposal_v1",
  "set_apply_payload.jsonl",
);
const MIGRATION_PATH = path.join(
  ROOT,
  "supabase",
  "migrations",
  `${COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION}_collectible_wave1_set_foundations_v1.sql`,
);
const SCRIPT_PATH = path.join(
  ROOT,
  "scripts",
  "audits",
  "collectible_wave1_set_foundations_rollback_v1.mjs",
);
const WORKFLOW_PATH = path.join(
  ROOT,
  ".github",
  "workflows",
  "collectible-wave1-set-foundations-rollback.yml",
);
const CONTRACT_PATH = path.join(
  ROOT,
  "docs",
  "contracts",
  "COLLECTIBLE_WAVE1_SET_FOUNDATIONS_V1.md",
);
const REVIEWED_MIGRATION_SHA256 =
  "0bef87cb2f487e84729a93aa2ba1bfb9b90cc559a10e981de34dcd1d7a8305fb";

const payloadBody = fs.readFileSync(PAYLOAD_PATH);
const payloadRows = parseCollectibleWave1SetPayloadV1(payloadBody);
const databaseRows = collectibleWave1SetDatabaseRowsV1(payloadRows)
  .sort((left, right) => left.code.localeCompare(right.code));
const migration = fs.readFileSync(MIGRATION_PATH, "utf8");

function baseline(overrides = {}) {
  return {
    transaction_read_only: true,
    latest_migration: "20260828024500",
    candidate_migration_count: 0,
    planned_row_count: 505,
    existing_selected_set_count: 0,
    existing_wave1_set_count: 0,
    planned_id_collision_count: 0,
    planned_code_collision_count: 0,
    planned_source_proposal_collision_count: 0,
    planned_game_name_collision_count: 0,
    conflicting_lock_count: 0,
    sets_rls_enabled: true,
    sets_force_rls: false,
    sets_release_policy: {
      permissive: "RESTRICTIVE",
      roles: ["public"],
      qual: "catalog_game_visible_to_request_v1(game)",
    },
    games: [
      { id: "47434700-0000-4000-8000-000000000001", code: "gundam",
        name: "Gundam Card Game", slug: "gundam-card-game" },
      { id: "59474f00-0000-4000-8000-000000000001", code: "yugioh",
        name: "Yu-Gi-Oh!", slug: "yu-gi-oh" },
    ],
    release_controls: [
      { game_code: "gundam", release_status: "hidden",
        release_version: "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1" },
      { game_code: "yugioh", release_status: "hidden",
        release_version: "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1" },
    ],
    protected_counts: { sets: 100, card_prints: 200, storage_objects: 300 },
    ...overrides,
  };
}

function transient(overrides = {}) {
  return {
    sets: databaseRows,
    migration_count: 0,
    card_print_count: 0,
    legacy_card_count: 0,
    identity_count: 0,
    printing_count: 0,
    external_mapping_count: 0,
    external_printing_mapping_count: 0,
    visibility: {
      anon: { gundam: false, yugioh: false },
      authenticated: { gundam: false, yugioh: false },
      service_role: { gundam: false, yugioh: false },
    },
    rls_visible_set_counts: { anon: 0, authenticated: 0 },
    ...overrides,
  };
}

test("the permanent payload is exact, unique, and authority bounded", () => {
  assert.equal(payloadBody.length, COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.bytes);
  assert.equal(
    crypto.createHash("sha256").update(payloadBody).digest("hex"),
    COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.sha256,
  );
  assert.equal(payloadRows.length, 505);
  assert.equal(new Set(payloadRows.map((row) => row.id)).size, 505);
  assert.equal(new Set(payloadRows.map((row) => row.code)).size, 505);
  assert.deepEqual(
    payloadRows.reduce((counts, row) => ({
      ...counts,
      [row.game]: (counts[row.game] ?? 0) + 1,
    }), {}),
    { gundam: 5, yugioh: 500 },
  );
  assert.ok(payloadRows.every((row) => row.write_authority === false));
  assert.ok(databaseRows.every((row) => row.identity_domain_default === null));
  assert.ok(databaseRows.every((row) => row.printed_total === null));
  assert.ok(databaseRows.every((row) => row.logo_url === null && row.hero_image_url === null));
});

test("the committed migration is the deterministic exact payload rendering", () => {
  assert.equal(migration, renderCollectibleWave1SetFoundationsMigrationV1(payloadRows));
  assert.equal(
    crypto.createHash("sha256").update(migration).digest("hex"),
    REVIEWED_MIGRATION_SHA256,
  );
  assert.equal((migration.match(/insert into public\.sets/gi) ?? []).length, 1);
  assert.doesNotMatch(migration, /insert into public\.(?!sets\b)/i);
  assert.doesNotMatch(migration, /\b(?:update|delete from|truncate|alter table) public\./i);
  assert.match(migration, /create temporary table collectible_wave1_set_seed_v1/i);
  assert.match(migration, /on conflict \(code\) do nothing/i);
  assert.match(migration, /globally namespaced set code collision/i);
  assert.match(migration, /source proposal collision/i);
  assert.match(migration, /same-game set name collision/i);
  assert.doesNotMatch(migration, /insert into public\.catalog_game_release_controls/i);
  assert.doesNotMatch(migration, /public\.(?:card_prints|card_print_identity|card_printings|external_mappings)/i);
});

test("baseline validation fails closed on history, collision, release, or RLS drift", () => {
  assert.deepEqual(evaluateCollectibleWave1SetRollbackBaselineV1(baseline()), []);
  assert.ok(evaluateCollectibleWave1SetRollbackBaselineV1(baseline({
    latest_migration: "20260828063000",
  })).includes("migration_history_not_at_expected_parent"));
  assert.ok(evaluateCollectibleWave1SetRollbackBaselineV1(baseline({
    planned_code_collision_count: 1,
  })).includes("planned_code_collision_count_not_zero"));
  assert.ok(evaluateCollectibleWave1SetRollbackBaselineV1(baseline({
    release_controls: [],
  })).includes("hidden_release_control_mismatch:yugioh"));
  assert.ok(evaluateCollectibleWave1SetRollbackBaselineV1(baseline({
    sets_release_policy: { permissive: "PERMISSIVE", qual: "true" },
  })).includes("sets_release_policy_mismatch"));
});

test("transient validation requires exact rows, no dependencies, and hidden RLS", () => {
  assert.deepEqual(evaluateCollectibleWave1SetTransientV1(transient(), databaseRows), []);
  assert.ok(evaluateCollectibleWave1SetTransientV1(transient({
    sets: databaseRows.slice(1),
  }), databaseRows).includes("transient_set_rows_mismatch"));
  assert.ok(evaluateCollectibleWave1SetTransientV1(transient({
    identity_count: 1,
  }), databaseRows).includes("identity_count_not_zero"));
  assert.ok(evaluateCollectibleWave1SetTransientV1(transient({
    rls_visible_set_counts: { anon: 1, authenticated: 0 },
  }), databaseRows).includes("sets_visible_through_rls:anon"));
  assert.ok(evaluateCollectibleWave1SetTransientV1(transient({
    visibility: {
      anon: { gundam: false, yugioh: true },
      authenticated: { gundam: false, yugioh: false },
      service_role: { gundam: false, yugioh: false },
    },
  }), databaseRows).includes("game_not_hidden:anon:yugioh"));
});

test("protected counts permit only the 505 transient set rows", () => {
  assert.deepEqual(compareCollectibleWave1ProtectedCountsV1(
    { sets: 100, cards: 200, vault_items: 10 },
    { sets: 605, cards: 200, vault_items: 10 },
    { sets: 505 },
  ), []);
  assert.deepEqual(compareCollectibleWave1ProtectedCountsV1(
    { sets: 100, cards: 200 },
    { sets: 605, cards: 201 },
    { sets: 505 },
  ), ["protected_count_mismatch:cards:200:201"]);
});

test("rollback runner is inert without exact execution guards", () => {
  assert.throws(() => parseArgs([]), /execute-rollback-only/);
  assert.throws(() => parseArgs(["--execute-rollback-only"]), /expected-head-sha/);
  const parsed = parseArgs([
    "--execute-rollback-only",
    `--expected-head-sha=${"a".repeat(40)}`,
    "--out-dir=tmp/proof",
  ]);
  assert.equal(parsed.execute, true);
  assert.equal(parsed.expectedHeadSha, "a".repeat(40));
});

test("rollback runner freezes evidence before access and always rolls back", () => {
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");
  assert.ok(source.indexOf('writeJson(path.join(options.outDir, "run_plan.json"), runPlan)') <
    source.indexOf("marketEvidenceDbUrl()"));
  assert.match(source, /Committed migration is not the deterministic payload rendering/);
  assert.match(source, /begin transaction isolation level repeatable read/);
  assert.match(source, /await client\.query\("rollback"\)/);
  assert.match(source, /rollback_proof_passed_zero_durable_change/);
  assert.doesNotMatch(source, /\bcommit\b/);
  assert.doesNotMatch(source, /db push|storage\.from|supabase\.from/);
});

test("workflow is manual, default-branch-only, exact-SHA, and rollback-only", () => {
  const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\b(?:schedule|push|pull_request):/);
  assert.match(workflow, /github\.event\.repository\.default_branch/);
  assert.match(workflow, /ROLLBACK_ONLY_505_SETS/);
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_head_sha \}\}/);
  assert.match(workflow, /--execute-rollback-only/);
  assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.doesNotMatch(workflow, /db push|--yes|apply/);
});

test("contract stops before durable apply and preserves every forbidden domain", () => {
  const contract = fs.readFileSync(CONTRACT_PATH, "utf8");
  assert.match(contract, /exactly 505 rows into `public\.sets`/);
  assert.match(contract, /zero direct set rows/);
  assert.match(contract, /Stop after the rollback-only production proof/);
  assert.match(contract, /Durable apply requires a separate decision/);
  assert.match(
    contract,
    /cards, identit(?:y|ies),\s+printings, mappings, images, pricing,\s+publication/,
  );
});
