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
  evaluateCollectibleWave1SetDurableReadbackV1,
  evaluateCollectibleWave1SetRollbackBaselineV1,
  evaluateCollectibleWave1SetTransientV1,
  parseCollectibleWave1SetPayloadV1,
  renderCollectibleWave1SetFoundationsMigrationV1,
} from "../../backend/catalog/collectible_wave1_set_foundations_v1.mjs";
import { parseArgs } from
  "../../scripts/audits/collectible_wave1_set_foundations_rollback_v1.mjs";
import {
  EXECUTION_ACKNOWLEDGEMENT as APPLY_ACKNOWLEDGEMENT,
  migrationVersions,
  parseArgs as parseApplyArgs,
} from "../../scripts/audits/collectible_wave1_set_foundations_apply_v1.mjs";

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
const APPLY_SCRIPT_PATH = path.join(
  ROOT,
  "scripts",
  "audits",
  "collectible_wave1_set_foundations_apply_v1.mjs",
);
const APPLY_WORKFLOW_PATH = path.join(
  ROOT,
  ".github",
  "workflows",
  "collectible-wave1-set-foundations-apply.yml",
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

function durable(overrides = {}) {
  return {
    ...transient(),
    transaction_read_only: true,
    latest_migration: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION,
    migration_count: 1,
    ledger_rows: [{
      version: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION,
      name: "collectible_wave1_set_foundations_v1",
      statement_count: 7,
    }],
    protected_counts: { sets: 605, card_prints: 200, storage_objects: 300 },
    release_controls: baseline().release_controls,
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

test("durable validation requires the exact ledger, rows, hidden RLS, and only 505 sets", () => {
  assert.deepEqual(evaluateCollectibleWave1SetDurableReadbackV1(
    durable(), databaseRows, baseline(),
  ), []);
  assert.ok(evaluateCollectibleWave1SetDurableReadbackV1(
    durable({ migration_count: 0 }), databaseRows, baseline(),
  ).includes("migration_ledger_count_mismatch"));
  assert.ok(evaluateCollectibleWave1SetDurableReadbackV1(
    durable({ sets: databaseRows.slice(1) }), databaseRows, baseline(),
  ).includes("durable_set_rows_mismatch"));
  assert.ok(evaluateCollectibleWave1SetDurableReadbackV1(
    durable({ protected_counts: { sets: 605, card_prints: 201, storage_objects: 300 } }),
    databaseRows, baseline(),
  ).includes("protected_count_mismatch:card_prints:200:201"));
  assert.ok(evaluateCollectibleWave1SetDurableReadbackV1(
    durable({ rls_visible_set_counts: { anon: 1, authenticated: 0 } }),
    databaseRows, baseline(),
  ).includes("sets_visible_through_rls:anon"));
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

test("durable apply runner is inert without the exact mode, SHA, acknowledgement, and logs", () => {
  assert.throws(() => parseApplyArgs([]), /Exactly one/);
  assert.throws(() => parseApplyArgs(["--prepare-apply"]), /expected-head-sha/);
  assert.throws(() => parseApplyArgs([
    "--prepare-apply",
    `--expected-head-sha=${"a".repeat(40)}`,
    "--out-dir=tmp/apply",
  ]), /execution-acknowledgement/);
  const prepared = parseApplyArgs([
    "--prepare-apply",
    `--expected-head-sha=${"a".repeat(40)}`,
    `--execution-acknowledgement=${APPLY_ACKNOWLEDGEMENT}`,
    "--out-dir=tmp/apply",
  ]);
  assert.equal(prepared.mode, "prepare");
  assert.throws(() => parseApplyArgs([
    "--post-apply-readback",
    `--expected-head-sha=${"a".repeat(40)}`,
    `--execution-acknowledgement=${APPLY_ACKNOWLEDGEMENT}`,
    "--out-dir=tmp/apply",
  ]), /CLI evidence logs/);
  assert.deepEqual(migrationVersions(
    "Dry run 20260828063000_collectible_wave1_set_foundations_v1.sql",
  ), [COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION]);
});

test("durable workflow is manual, default-branch-only, exact-SHA, and one-migration-only", () => {
  const workflow = fs.readFileSync(APPLY_WORKFLOW_PATH, "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\b(?:schedule|push|pull_request):/);
  assert.match(workflow, /github\.event\.repository\.default_branch/);
  assert.match(workflow, /DURABLE_APPLY_505_HIDDEN_SETS/);
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_head_sha \}\}/);
  assert.match(workflow, /supabase@2\.90\.0 db push/);
  assert.match(workflow, /--dry-run/);
  assert.match(workflow, /--yes/);
  assert.match(workflow, /post-apply-readback/);
  assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);

  const source = fs.readFileSync(APPLY_SCRIPT_PATH, "utf8");
  assert.ok(source.indexOf('"frozen_execution_plan.json"') <
    source.indexOf("loadDatabaseUrl(options.envFile)"));
  assert.match(source, /captureDurableReadback/);
  assert.match(source, /independent_readback_mismatch/);
  assert.match(source, /remote database is up to date/i);
  assert.doesNotMatch(source, /storage\.from|supabase\.from/);
});

test("contract authorizes only the exact durable apply and preserves every forbidden domain", () => {
  const contract = fs.readFileSync(CONTRACT_PATH, "utf8");
  assert.match(contract, /exactly 505 rows into `public\.sets`/);
  assert.match(contract, /zero direct set rows/);
  assert.match(contract, /exactly one migration-ledger row/);
  assert.match(contract, /Durable Apply Gate/);
  assert.match(
    contract,
    /cards, identit(?:y|ies),\s+printings, mappings, images, pricing,\s+publication/,
  );
});

test("permanent checkpoint preserves and reconciles the production rollback proof", () => {
  const auditDir = path.join(
    ROOT,
    "docs",
    "audits",
    "catalog_discovery",
    "collectible_wave1_set_foundations_v1",
    "production_rollback_v1",
  );
  const reviewed = {
    "artifact_hashes.json": [1018,
      "bee07cf1fb983ce263295eddfe86a301f86eb4fb532a82722b99b94a59708ee4"],
    "post_rollback_readback.json": [2986,
      "96fa13a347c21d1d03c111854d3c91666feedd27e5d385d287ccdefed7840103"],
    "protected_before.json": [2986,
      "96fa13a347c21d1d03c111854d3c91666feedd27e5d385d287ccdefed7840103"],
    "provenance.json": [972,
      "2839e2594680cd56cc6a1470083031e84f4232a49c030b0ee29245ab95011f75"],
    "reconciliation_report.json": [1073,
      "4adee8f2d924dc6aa2b704564078799475155d68d6a67f01e12815ab3cf990f2"],
    "remote_artifact_hashes.json": [1182,
      "457546d96b020c9fb1dc3290f5bd4d08f5355566d5b38cd5e8c3fd8e55534ea6"],
    "REPORT.md": [450,
      "ae2e53369ee96a35ce81af677f7067cdfc66d2f1e55308e6e8fdca099fe3de4f"],
    "run_plan.json": [1526,
      "b877fc377de8565c2c2e94f954adf71c08e6c8f3ce88e4ad6a6652baa359b2ab"],
    "summary.json": [1215,
      "a00d2010a36549797503594129fe673764a1930972eaef9ff858d2112f5ed0c3"],
    "transaction_proof.json": [743226,
      "6c880b9a5d15718186352b725bc3df0c156415f3d07c9f32ea9a85bd5d63ff5e"],
  };
  const preserved = JSON.parse(fs.readFileSync(path.join(
    auditDir,
    "preserved_artifact_hashes.json",
  )));
  assert.equal(preserved.algorithm, "sha256");
  assert.deepEqual(
    preserved.artifacts.map((row) => row.artifact_path).sort(),
    Object.keys(reviewed).sort(),
  );
  for (const [artifactPath, [bytes, digest]] of Object.entries(reviewed)) {
    const body = fs.readFileSync(path.join(auditDir, artifactPath));
    const manifestRow = preserved.artifacts.find((row) => row.artifact_path === artifactPath);
    assert.equal(body.length, bytes, artifactPath);
    assert.equal(manifestRow.bytes, bytes, artifactPath);
    assert.equal(manifestRow.sha256, digest, artifactPath);
    assert.equal(crypto.createHash("sha256").update(body).digest("hex"), digest, artifactPath);
    assert.doesNotMatch(body.toString("utf8"), /postgres(?:ql)?:\/\/|SUPABASE_DB_URL/);
  }

  const provenance = JSON.parse(fs.readFileSync(path.join(auditDir, "provenance.json")));
  assert.equal(provenance.workflow_run_id, 33171480355);
  assert.equal(provenance.workflow_head_sha,
    "51f47be5a79e5e05391f6b2193a30729e53fc2ac");
  assert.equal(provenance.artifact_id, 9685801358);
  assert.equal(provenance.migration_sha256, REVIEWED_MIGRATION_SHA256);
  assert.equal(provenance.database_writes, false);
  assert.equal(provenance.transaction_ended_with, "rollback");

  const summary = JSON.parse(fs.readFileSync(path.join(auditDir, "summary.json")));
  const transaction = JSON.parse(fs.readFileSync(path.join(
    auditDir,
    "transaction_proof.json",
  )));
  const reconciliation = JSON.parse(fs.readFileSync(path.join(
    auditDir,
    "reconciliation_report.json",
  )));
  assert.equal(summary.status, "rollback_proof_passed_zero_durable_change");
  assert.equal(summary.rollback_succeeded, true);
  assert.equal(summary.findings.length, 0);
  assert.equal(transaction.transient_readback.sets.length, 505);
  assert.equal(new Set(transaction.transient_readback.sets.map((row) => row.id)).size, 505);
  assert.equal(new Set(transaction.transient_readback.sets.map((row) => row.code)).size, 505);
  assert.deepEqual(transaction.transient_readback.rls_visible_set_counts,
    { anon: 0, authenticated: 0 });
  assert.equal(
    fs.readFileSync(path.join(auditDir, "protected_before.json"), "utf8"),
    fs.readFileSync(path.join(auditDir, "post_rollback_readback.json"), "utf8"),
  );
  assert.equal(reconciliation.status, "reconciled");
  assert.equal(reconciliation.reconciliation_mismatch_count, 0);
  assert.equal(reconciliation.durable_database_writes, 0);

  const checkpoint = fs.readFileSync(path.join(
    ROOT,
    "docs",
    "checkpoints",
    "catalog_discovery",
    "2026-08-28_COLLECTIBLE_WAVE1_SET_FOUNDATIONS_ROLLBACK_V1.md",
  ), "utf8");
  assert.match(checkpoint, /Stop before durable apply/);
  assert.match(checkpoint, new RegExp(REVIEWED_MIGRATION_SHA256));
  const index = fs.readFileSync(path.join(
    ROOT,
    "docs",
    "checkpoints",
    "catalog_discovery",
    "INDEX.md",
  ), "utf8");
  assert.match(index, /COLLECTIBLE_WAVE1_SET_FOUNDATIONS_ROLLBACK_V1\.md/);
});
