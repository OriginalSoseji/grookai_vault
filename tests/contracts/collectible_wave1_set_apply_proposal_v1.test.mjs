import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED,
  COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
  COLLECTIBLE_WAVE1_SET_APPLY_UUID_NAMESPACE,
  COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT,
  buildCollectibleWave1SetApplyProposalV1,
  buildCollectibleWave1SetRollbackContractV1,
  canonicalWave1SetCodeV1,
  canonicalWave1SetIdV1,
  evaluateCollectibleWave1SetDatabasePreflightV1,
} from "../../backend/catalog/collectible_wave1_set_apply_proposal_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function proposalId(game, identity) {
  const digest = crypto.createHash("sha256").update(`${game}:${identity}`).digest("hex");
  return `${game}:set-proposal:${digest.slice(0, 24)}`;
}

function readyRow(game, index) {
  const sourceCode = index.toString(36).toUpperCase().padStart(4, "0");
  const sourceName = `${game} Fixture Set ${index}`;
  return {
    proposal_version: "COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_V1",
    set_proposal_id: proposalId(game, `${sourceName}:${sourceCode}`),
    game,
    source_id: game === "yugioh"
      ? "yugioh_ygoprodeck_api_v7"
      : "gundam_gcg_api_v1",
    source_manifest_sha256: game === "yugioh" ? "a".repeat(64) : "b".repeat(64),
    source_manifest_row_number: index + 1,
    source_set_name: sourceName,
    source_set_code: sourceCode,
    source_card_count: 10 + index,
    source_release_date: game === "yugioh" ? "2026-01-01" : null,
    mapping_method: game === "yugioh"
      ? "exact_source_set_name"
      : "exact_source_set_code",
    canonical_code_proposed: false,
    canonical_authority: false,
    write_authority: false,
    matching_candidate_count: 10 + index,
    observed_candidate_set_names: [sourceName],
    observed_candidate_set_codes: [sourceCode],
    observed_candidate_languages: ["en"],
    proposal_status: "review_ready",
    reason_codes: [],
    review_required: false,
  };
}

function excludedRow(index) {
  const row = readyRow("yugioh", 600 + index);
  return {
    ...row,
    proposal_status: "shared_source_code",
    reason_codes: ["shared_source_code"],
    review_required: true,
  };
}

function frozenRows() {
  return [
    ...Array.from({ length: 500 }, (_, index) => readyRow("yugioh", index)),
    ...Array.from({ length: 5 }, (_, index) => readyRow("gundam", 500 + index)),
    ...Array.from({ length: 551 }, (_, index) => excludedRow(index)),
  ];
}

function validDatabaseReadback() {
  return {
    transaction_read_only: true,
    latest_migration: "20260828024500",
    planned_row_count: 505,
    games: [
      {
        id: "47434700-0000-4000-8000-000000000001",
        code: "gundam",
        name: "Gundam Card Game",
        slug: "gundam-card-game",
      },
      {
        id: "59474f00-0000-4000-8000-000000000001",
        code: "yugioh",
        name: "Yu-Gi-Oh!",
        slug: "yu-gi-oh",
      },
    ],
    release_controls: [
      {
        game_code: "gundam",
        release_status: "hidden",
        release_version: "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1",
      },
      {
        game_code: "yugioh",
        release_status: "hidden",
        release_version: "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1",
      },
    ],
    existing_wave1_set_count: 0,
    planned_id_collision_count: 0,
    planned_code_collision_count: 0,
    planned_source_proposal_collision_count: 0,
    planned_game_name_collision_count: 0,
    conflicting_lock_count: 0,
    sets_rls_enabled: true,
    sets_force_rls: false,
    sets_columns: [
      "id", "game", "code", "name", "release_date", "source", "printed_total",
      "printed_set_abbrev", "set_role", "identity_domain_default", "identity_model",
      "logo_url", "symbol_url", "hero_image_url", "hero_image_source",
    ],
    set_unique_definitions: [
      "UNIQUE (game, code)",
      "CREATE UNIQUE INDEX uq_sets_code ON public.sets USING btree (code)",
    ],
  };
}

test("builds exactly 505 deterministic namespaced set rows and excludes 551 review rows", () => {
  const proposal = buildCollectibleWave1SetApplyProposalV1(frozenRows());
  assert.equal(proposal.version, COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION);
  assert.equal(proposal.rows.length, 505);
  assert.equal(proposal.excludedRows.length, 551);
  assert.deepEqual(proposal.selected_by_game, { gundam: 5, yugioh: 500 });
  assert.equal(new Set(proposal.rows.map((row) => row.id)).size, 505);
  assert.equal(new Set(proposal.rows.map((row) => row.code)).size, 505);
  assert.ok(proposal.rows.filter((row) => row.game === "yugioh")
    .every((row) => row.code.startsWith("ygo-")));
  assert.ok(proposal.rows.filter((row) => row.game === "gundam")
    .every((row) => row.code.startsWith("gcg-")));
  assert.ok(proposal.rows.every((row) => row.identity_domain_default === null));
  assert.ok(proposal.rows.every((row) => row.printed_total === null));
  assert.ok(proposal.rows.every((row) => row.source.language_code === "en"));
  assert.ok(proposal.rows.every((row) => row.source.canonical_visibility === "hidden"));
  assert.ok(proposal.rows.every((row) => row.write_authority === false));
  assert.doesNotMatch(JSON.stringify(proposal), /https?:\/\//i);
  assert.match(proposal.payload_fingerprint_sha256, /^[0-9a-f]{64}$/);
});

test("canonical IDs and codes are stable without allowing ambiguous source codes", () => {
  const sourceId = "yugioh:set-proposal:0123456789abcdef01234567";
  assert.equal(canonicalWave1SetIdV1(sourceId), canonicalWave1SetIdV1(sourceId));
  assert.match(canonicalWave1SetIdV1(sourceId), /^[0-9a-f-]{36}$/);
  assert.equal(canonicalWave1SetCodeV1("yugioh", "LOB"), "ygo-lob");
  assert.equal(canonicalWave1SetCodeV1("gundam", "ST10"), "gcg-st10");
  assert.throws(() => canonicalWave1SetCodeV1("yugioh", "ABC DEF"), /Unsupported/);
  assert.throws(() => canonicalWave1SetCodeV1("pokemon", "BASE1"), /Unsupported/);
  assert.equal(COLLECTIBLE_WAVE1_SET_APPLY_UUID_NAMESPACE,
    "f6ba1fa1-e377-59a1-995a-58323b4d46f5");
});

test("selection fails closed on language drift and review-ready count drift", () => {
  const languageDrift = frozenRows();
  languageDrift[0] = { ...languageDrift[0], observed_candidate_languages: ["fr"] };
  assert.throws(
    () => buildCollectibleWave1SetApplyProposalV1(languageDrift),
    /outside the English apply boundary/,
  );
  const statusDrift = frozenRows();
  statusDrift[0] = {
    ...statusDrift[0],
    proposal_status: "shared_source_code",
    reason_codes: ["shared_source_code"],
    review_required: true,
  };
  assert.throws(
    () => buildCollectibleWave1SetApplyProposalV1(statusDrift),
    /review-ready partition/,
  );
});

test("production preflight accepts only the exact hidden, collision-free baseline", () => {
  assert.deepEqual(evaluateCollectibleWave1SetDatabasePreflightV1(
    validDatabaseReadback(),
  ), []);
  const collision = validDatabaseReadback();
  collision.planned_code_collision_count = 1;
  collision.release_controls[0].release_status = "signed_in";
  assert.deepEqual(evaluateCollectibleWave1SetDatabasePreflightV1(collision), [
    "hidden_release_control_mismatch:gundam",
    "planned_code_collision_count_not_zero",
  ]);
  const migrationDrift = validDatabaseReadback();
  migrationDrift.latest_migration = "20260828030000";
  assert.deepEqual(evaluateCollectibleWave1SetDatabasePreflightV1(migrationDrift), [
    "migration_history_not_at_expected_parent",
  ]);
});

test("rollback contract is exact, non-executable, and fails closed on partial scope", () => {
  const proposal = buildCollectibleWave1SetApplyProposalV1(frozenRows());
  const rollback = buildCollectibleWave1SetRollbackContractV1(proposal.rows);
  assert.equal(rollback.selector.exact_set_ids.length, 505);
  assert.equal(new Set(rollback.selector.exact_set_ids).size, 505);
  assert.equal(rollback.automatic_execution_authorized, false);
  assert.equal(rollback.forward_fix_required_if_referenced, true);
  assert.throws(
    () => buildCollectibleWave1SetRollbackContractV1(proposal.rows.slice(1)),
    /exact selected set payload/,
  );
});

test("worker is read-only, freezes provenance, and writes the run plan before DB access", () => {
  const worker = fs.readFileSync(path.join(
    ROOT,
    "scripts",
    "workers",
    "collectible_wave1_set_apply_proposal_v1.mjs",
  ), "utf8");
  assert.match(worker, /begin transaction isolation level repeatable read read only/i);
  assert.match(worker, /default_transaction_read_only=on/);
  assert.match(worker, /await writeJson\(path\.join\(options\.outDir, "run_plan\.json"\), runPlan\)/);
  assert.ok(worker.indexOf('"run_plan.json"') <
    worker.indexOf("const databasePreflight = await captureDatabasePreflight"));
  assert.doesNotMatch(worker, /\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
  assert.doesNotMatch(worker, /storage\.from|--apply|writer.*dispatch/i);
  const builder = fs.readFileSync(path.join(
    ROOT,
    "backend",
    "catalog",
    "collectible_wave1_set_apply_proposal_v1.mjs",
  ), "utf8");
  assert.match(builder, /33142767700/);
  assert.match(builder, /382e1a26fc2e3c57766445949c9fc0f0051544eb4f552c88bcf2654bddc320bb/);
});

test("workflow is manual, default-branch-only, frozen-input, and read-only", () => {
  const workflow = fs.readFileSync(path.join(
    ROOT,
    ".github",
    "workflows",
    "collectible-wave1-set-apply-proposal.yml",
  ), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /run-id:\s*"33142767700"/);
  assert.match(workflow, /SUPABASE_DB_URL:\s*\$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.match(workflow, /github\.event\.repository\.default_branch/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.doesNotMatch(workflow, /supabase db push|--apply|schedule:/i);
});

test("governing contract preserves the no-migration and no-write stop boundary", () => {
  assert.equal(COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.selected_set_count, 505);
  assert.equal(COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.excluded_set_count, 551);
  assert.equal(COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.artifact_id, 9674581333);
  const contract = fs.readFileSync(path.join(
    ROOT,
    "docs",
    "contracts",
    "COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_V1.md",
  ), "utf8");
  assert.match(contract, /500 Yu-Gi-Oh sets/);
  assert.match(contract, /5 Gundam Card Game sets/);
  assert.match(contract, /does not generate, register, or execute a migration/i);
  assert.match(contract, /551 source rows remain excluded/);
  assert.match(contract, /Stop after the exact production read-only proposal/);
});
