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
const REVIEWED_MIGRATION_SHA256 =
  "155dbe28f33ea0f44f7f5dd240e5f962fa487cabc7be1809b20ec803d7272e23";
const REVIEWED_APPLY_PLAN_SHA256 =
  "236f134edc8eb264fa2b4645219b3424ccbc07c0606d24ab24a6c4ad2ca37604";
const REVIEWED_APPLY_READBACK_SHA256 =
  "29a4159947ecc7c58e7e345183e58c5c987a7d4876bc91d3b1f434d8ce435d71";
const REVIEWED_MANIFEST_SHA256 = {
  apply: "34cdc963e3bbbf43d0c6be5b4ac4f3c81c0036614dc3e480b7afaa17c706dc34",
  reconciliation: "a813475d6aad596a692a5b4828f066c10d5c857fd045009b28b37c8824a66322",
  rollback: "3003d7a2dcf6103156d3502d1a2640778e00e4f91ceaea417487246a5e85aac8",
};
const REVIEWED_APPLY_ARTIFACT_SHA256 = {
  "apply_execution.json": "147f56120bd267ab4e91c4ffd647113db99994d14ea6edb7c37cbf67bdaa5522",
  "apply_plan.json": "236f134edc8eb264fa2b4645219b3424ccbc07c0606d24ab24a6c4ad2ca37604",
  "apply_readback.json": "29a4159947ecc7c58e7e345183e58c5c987a7d4876bc91d3b1f434d8ce435d71",
};
const REVIEWED_ROLLBACK_ARTIFACT_SHA256 = {
  "post_rollback_readback.json": "4ddbb85904c21662446544ddb70363242532d927c8fd16972becc8e60f0b4113",
  "protected_before.json": "4ddbb85904c21662446544ddb70363242532d927c8fd16972becc8e60f0b4113",
  "REPORT.md": "fa6a0d4db88da37b541094b2bfbd7e5a346a66ebc3f11c92624dea0fd4ccef7c",
  "run_plan.json": "775ace1681b089d412d75653d576419bff36edba5b0ee0c7dbde99ee0c10d24b",
  "summary.json": "f913cc6759f5677a53779a7223ec5d065795bab81ea87619d86c6cf588a77520",
  "transaction_proof.json": "1888b16247e1d6e425301dc5b20dbd6d2a0cc70116cb7b9a980a3f41a492bcbe",
};
const REVIEWED_RECONCILIATION_ARTIFACT_SHA256 = {
  "artifact_limitations.json": "f5e4cc3eb189b6b6e1dc930422ac02a935e5f303160f6b0d861b304f91d51e7d",
  "database_snapshot_summary.json": "5f84f764c5629a2fafcb6c0916bed1029a03d313f582e11731e437bd3ecb7e5c",
  "provenance.json": "888b774aa8581c93aff539a49bc49c7bbfc9fb8ef3521129f4fc276e8b7d938c",
  "remote_artifact_hashes.json": "8e25093f344b778bda55eb18ebe25b4263d7b7ecbd4ce7ab77a7b82fc2d597fe",
  "run_plan.json": "aa7843b47b693aabbcdda82e6cae602be88cc262a15e623e1d0b041ea82b96bb",
  "summary.json": "da5852d8174691581fd51b783fda1615fe8cc1f001473dfef00b690e510b0e1b",
};
const REVIEWED_LEDGER_STATEMENT_SHA256 = [
  "cc1ca0c4e8824501dcfc07a67fd729fac677ee38a9d9306c79197f00bd41510b",
  "901a8f219b041b443972daceaae55f976beebb077e5a3b5b123105240af28d97",
  "2a7dc6e25b6682427164df121630da0e1671c80948018698644f6a683af40d74",
  "8f606d40cd281e9d4d8c56e40f6d555d32163bde2b4c6c72a8b8f60b52656672",
  "54ab0181a94383fbe40425b9b9a88382bddd681e14e2e426c3d0d8aa36d57b60",
  "0e0ccc23d4c763e0cdcb92c0e6bf99f7183f81cfb4e304cf1d92e274aa88c656",
  "2ba373b661cc892a598cd87ff447c424ad78612eee271b3594a11a15e72cb087",
  "9505cacb7c710ed17125fcc6cb3669e8ddca6c8cd8af6a31f6b3cd64604c3098",
];
const FROZEN_RECONCILIATION_CANDIDATE_SHA256 =
  "30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f";
const FROZEN_RECONCILIATION_ROWS_SHA256 =
  "74cd15a1912ffce9b11c8622ffdd4f9597af27f6072fe630fa445423fb2936cd";
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const REQUIRED_APPLY_ARTIFACT_PATHS = [
  "apply_execution.json",
  "apply_plan.json",
  "apply_readback.json",
];
const REQUIRED_RECONCILIATION_ARTIFACT_PATHS = [
  "artifact_limitations.json",
  "database_snapshot_summary.json",
  "provenance.json",
  "remote_artifact_hashes.json",
  "run_plan.json",
  "summary.json",
];
const REMOTE_PRESERVED_RECONCILIATION_ARTIFACT_PATHS = [
  "artifact_limitations.json",
  "database_snapshot_summary.json",
  "run_plan.json",
  "summary.json",
];
const APPLY_CREDENTIAL_PATTERNS = [
  /(?:postgres(?:ql)?:\/\/|SUPABASE_DB_URL|DATABASE_URL|PGPASSWORD|password)/i,
  /SUPABASE_(?:SECRET|SERVICE_ROLE|ANON|PUBLISHABLE)_KEY/i,
  /Authorization["']?\s*:\s*["']?\s*Bearer\s+/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /\b(?:access|refresh)[_-]?token["']?\s*[:=]/i,
  /\b(?:api|secret)[_-]?key["']?\s*[:=]/i,
];
const NO_WRITE_RECONCILIATION_BOUNDARIES = {
  database_writes: false,
  storage_access: false,
  storage_writes: false,
  image_access: false,
  pricing_access: false,
  canonical_writes: false,
  publication_writes: false,
  vault_access: false,
  writer_dispatches: false,
};
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
const APPLY_AUDIT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_game_foundations_v1",
  "production_apply_v1",
);
const RECONCILIATION_AUDIT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_game_foundations_v1",
  "post_foundation_reconciliation_v1",
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
  const hashesBody = fs.readFileSync(path.join(AUDIT_DIR, "artifact_hashes.json"));
  assert.equal(
    crypto.createHash("sha256").update(hashesBody).digest("hex"),
    REVIEWED_MANIFEST_SHA256.rollback,
  );
  const hashes = JSON.parse(hashesBody);
  assert.deepEqual(
    hashes.artifacts.map((artifact) => artifact.artifact_path).sort(),
    Object.keys(REVIEWED_ROLLBACK_ARTIFACT_SHA256).sort(),
  );
  for (const artifact of hashes.artifacts) {
    assert.equal(artifact.sha256, REVIEWED_ROLLBACK_ARTIFACT_SHA256[artifact.artifact_path]);
    const body = fs.readFileSync(path.join(AUDIT_DIR, artifact.artifact_path));
    assert.equal(
      crypto.createHash("sha256").update(body).digest("hex"),
      artifact.sha256,
      artifact.artifact_path,
    );
    for (const credentialPattern of APPLY_CREDENTIAL_PATTERNS) {
      assert.doesNotMatch(body.toString("utf8"), credentialPattern);
    }
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

test("durable apply artifacts reconcile to the authorized four-row foundation", () => {
  const hashesBody = fs.readFileSync(path.join(APPLY_AUDIT_DIR, "artifact_hashes.json"));
  assert.equal(
    crypto.createHash("sha256").update(hashesBody).digest("hex"),
    REVIEWED_MANIFEST_SHA256.apply,
  );
  const hashes = JSON.parse(hashesBody);
  assert.equal(hashes.algorithm, "sha256");
  assert.deepEqual(
    hashes.artifacts.map((artifact) => artifact.artifact_path).sort(),
    REQUIRED_APPLY_ARTIFACT_PATHS,
  );
  for (const artifact of hashes.artifacts) {
    assert.equal(artifact.sha256, REVIEWED_APPLY_ARTIFACT_SHA256[artifact.artifact_path]);
    const body = fs.readFileSync(path.join(APPLY_AUDIT_DIR, artifact.artifact_path));
    assert.equal(
      crypto.createHash("sha256").update(body).digest("hex"),
      artifact.sha256,
      artifact.artifact_path,
    );
    for (const credentialPattern of APPLY_CREDENTIAL_PATTERNS) {
      assert.doesNotMatch(body.toString("utf8"), credentialPattern);
    }
  }

  const planBody = fs.readFileSync(path.join(APPLY_AUDIT_DIR, "apply_plan.json"));
  const plan = JSON.parse(planBody);
  const execution = JSON.parse(fs.readFileSync(
    path.join(APPLY_AUDIT_DIR, "apply_execution.json"),
  ));
  const readbackBody = fs.readFileSync(path.join(APPLY_AUDIT_DIR, "apply_readback.json"));
  const readback = JSON.parse(readbackBody);
  const rollbackBaseline = JSON.parse(fs.readFileSync(
    path.join(AUDIT_DIR, "protected_before.json"),
  ));
  const independentReadOnlyVerification = JSON.parse(fs.readFileSync(
    path.join(RECONCILIATION_AUDIT_DIR, "database_snapshot_summary.json"),
  ));

  const migrationSha256 = crypto.createHash("sha256").update(MIGRATION).digest("hex");
  assert.equal(migrationSha256, REVIEWED_MIGRATION_SHA256);
  assert.equal(plan.migration.sha256, REVIEWED_MIGRATION_SHA256);
  assert.equal(readback.migration_file_sha256, REVIEWED_MIGRATION_SHA256);
  assert.equal(
    crypto.createHash("sha256").update(readbackBody).digest("hex"),
    REVIEWED_APPLY_READBACK_SHA256,
  );
  const applyPlanSha256 = crypto.createHash("sha256").update(planBody).digest("hex");
  assert.equal(applyPlanSha256, REVIEWED_APPLY_PLAN_SHA256);
  assert.equal(execution.apply_plan_sha256, REVIEWED_APPLY_PLAN_SHA256);
  assert.equal(
    execution.apply_plan_sha256,
    applyPlanSha256,
  );
  assert.deepEqual(execution.authorized_durable_changes, plan.authorized_durable_changes);
  assert.deepEqual(execution.forbidden_durable_changes, plan.forbidden_durable_changes);
  assert.equal(execution.command_metadata.secrets_recorded, false);
  assert.equal(execution.result.status, "success");
  assert.deepEqual(execution.result.applied_migrations, [
    "20260828024500_collectible_wave1_game_foundations_v1.sql",
  ]);
  assert.equal(execution.result.other_migrations_applied, 0);
  assert.deepEqual(execution.post_apply_cli_reconciliation, {
    remote_latest_version: "20260828024500",
    pending_migration_count: 0,
    dry_run_result: "remote_database_up_to_date",
  });
  assert.equal(readback.latest_migration, "20260828024500");
  assert.deepEqual(readback.ledger_rows, [{
    name: "collectible_wave1_game_foundations_v1",
    version: "20260828024500",
    statement_count: 8,
  }]);
  assert.deepEqual(readback.ledger_statement_sha256, REVIEWED_LEDGER_STATEMENT_SHA256);
  assert.deepEqual(evaluateWave1FoundationTransientV1({
    games: readback.games,
    release_controls: readback.release_controls,
    visibility: readback.visibility,
  }), []);
  assert.deepEqual(readback.visibility, {
    anon: { gundam: false, yugioh: false },
    authenticated: { gundam: false, yugioh: false },
    service_role: { gundam: false, yugioh: false },
  });
  assert.deepEqual(readback.security, {
    games_rls_enabled: true,
    release_controls_rls_enabled: true,
    release_control_acl: "{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres}",
  });
  assert.deepEqual(readback.new_game_catalog_counts, {
    sets: 0,
    cards: 0,
    printings: 0,
    identities: 0,
  });
  assert.deepEqual(compareWave1ProtectedCountsV1(
    rollbackBaseline.protected_counts,
    readback.protected_counts,
    { games: 2, release_controls: 2 },
  ), []);
  assert.equal(readback.identity_domain_constraint, rollbackBaseline.identity_domain_constraint);
  assert.equal(readback.reconciliation.visibility_failures, 0);
  assert.equal(readback.database_writes_during_readback, false);
  assert.deepEqual(independentReadOnlyVerification, {
    database_access: true,
    database_writes: false,
    transaction_ended_with: "rollback",
    ssl_mode: "require",
    ssl_transport: "encrypted",
    certificate_authority_verification: "not_configured_for_existing_connection",
    default_transaction_read_only: "on",
    transaction_read_only: "on",
    schema: {
      required_column_count: 25,
      missing_columns: [],
    },
    game_count: 2,
    candidate_game_set_count: 0,
    candidate_game_card_count: 0,
    snapshot_sha256: "2b2b7336c2dfc75ea553d44249586472a5702b5b7529c48de3015d20a2a3880c",
  });
});

test("post-foundation reconciliation reaches all candidates without writes", () => {
  const hashesBody = fs.readFileSync(
    path.join(RECONCILIATION_AUDIT_DIR, "preserved_artifact_hashes.json"),
  );
  assert.equal(
    crypto.createHash("sha256").update(hashesBody).digest("hex"),
    REVIEWED_MANIFEST_SHA256.reconciliation,
  );
  const hashes = JSON.parse(hashesBody);
  const remoteArtifactHashes = JSON.parse(fs.readFileSync(
    path.join(RECONCILIATION_AUDIT_DIR, "remote_artifact_hashes.json"),
  ));
  assert.equal(hashes.algorithm, "sha256");
  assert.equal(remoteArtifactHashes.algorithm, "sha256");
  assert.deepEqual(
    hashes.artifacts.map((artifact) => artifact.artifact_path).sort(),
    REQUIRED_RECONCILIATION_ARTIFACT_PATHS,
  );
  for (const artifact of hashes.artifacts) {
    assert.equal(
      artifact.sha256,
      REVIEWED_RECONCILIATION_ARTIFACT_SHA256[artifact.artifact_path],
    );
    const body = fs.readFileSync(path.join(RECONCILIATION_AUDIT_DIR, artifact.artifact_path));
    assert.equal(
      crypto.createHash("sha256").update(body).digest("hex"),
      artifact.sha256,
      artifact.artifact_path,
    );
    for (const credentialPattern of APPLY_CREDENTIAL_PATTERNS) {
      assert.doesNotMatch(body.toString("utf8"), credentialPattern);
    }
  }
  for (const artifactPath of REMOTE_PRESERVED_RECONCILIATION_ARTIFACT_PATHS) {
    const body = fs.readFileSync(path.join(RECONCILIATION_AUDIT_DIR, artifactPath));
    assert.deepEqual(
      remoteArtifactHashes.artifacts.find((artifact) => artifact.path === artifactPath),
      {
        path: artifactPath,
        bytes: body.byteLength,
        sha256: crypto.createHash("sha256").update(body).digest("hex"),
      },
    );
  }
  const summary = JSON.parse(fs.readFileSync(
    path.join(RECONCILIATION_AUDIT_DIR, "summary.json"),
  ));
  const plan = JSON.parse(fs.readFileSync(
    path.join(RECONCILIATION_AUDIT_DIR, "run_plan.json"),
  ));
  const provenance = JSON.parse(fs.readFileSync(
    path.join(RECONCILIATION_AUDIT_DIR, "provenance.json"),
  ));
  const artifactLimitations = JSON.parse(fs.readFileSync(
    path.join(RECONCILIATION_AUDIT_DIR, "artifact_limitations.json"),
  ));
  assert.deepEqual(provenance, {
    version: "COLLECTIBLE_WAVE1_POST_FOUNDATION_RECONCILIATION_PROVENANCE_V1",
    workflow_run_id: 33137460263,
    workflow_url: "https://github.com/OriginalSoseji/grookai_vault/actions/runs/33137460263",
    workflow_head_sha: "06ce213cda46e58244102d744a4835358fcc09eb",
    artifact_id: 9672587771,
    artifact_name: "collectible-wave1-canonical-reconciliation-33137460263",
    artifact_archive_digest:
      "sha256:0e3a4560c782534a9eed05eb04d5869d159b75854135e2ba441a70fa72978518",
    artifact_expires_at: "2026-11-26T02:57:26Z",
    selected_files_preserved_locally: [
      "artifact_limitations.json",
      "database_snapshot_summary.json",
      "remote_artifact_hashes.json",
      "run_plan.json",
      "summary.json",
    ],
    large_row_artifacts_remain_in_github_actions: true,
    database_writes: false,
  });
  assert.equal(plan.actual_head_sha, "06ce213cda46e58244102d744a4835358fcc09eb");
  assert.equal(plan.expected_candidate_sha256, FROZEN_RECONCILIATION_CANDIDATE_SHA256);
  assert.equal(summary.parser_candidate_sha256, FROZEN_RECONCILIATION_CANDIDATE_SHA256);
  for (const artifactPath of ["reconciliation_index.jsonl", "new_candidates.jsonl"]) {
    assert.deepEqual(
      remoteArtifactHashes.artifacts.find((artifact) => artifact.path === artifactPath),
      {
        path: artifactPath,
        bytes: 24992246,
        sha256: FROZEN_RECONCILIATION_ROWS_SHA256,
      },
    );
  }
  for (const artifactPath of [
    "exact_existing_identity.jsonl",
    "ambiguous_candidates.jsonl",
    "conflicting_candidates.jsonl",
    "blocked_candidates.jsonl",
    "unresolved_variants.jsonl",
  ]) {
    assert.deepEqual(
      remoteArtifactHashes.artifacts.find((artifact) => artifact.path === artifactPath),
      {
        path: artifactPath,
        bytes: 0,
        sha256: EMPTY_SHA256,
      },
    );
  }
  assert.equal(summary.selected_candidate_count, 46259);
  assert.equal(summary.reconciled_candidate_count, 46259);
  assert.deepEqual(summary.decision_counts, { new_candidate: 46259 });
  assert.equal(summary.blocking_decision_count, 0);
  assert.equal(summary.status, "completed_with_blockers");
  assert.equal(summary.artifact_limitation_count, 1);
  assert.equal(summary.unresolved_variant_row_count, 0);
  assert.equal(summary.unresolved_variant_aggregate_source_count, 124);
  assert.deepEqual(artifactLimitations, [{
    limitation: "unresolved_alternative_artwork_scope_not_row_addressable",
    aggregate_source_count: 124,
    row_addressable_count: 0,
    decision: "preserve_aggregate_and_block_promotion_until_parser_metadata_refinement",
  }]);
  assert.equal(summary.database_proof.game_count, 2);
  assert.equal(summary.database_proof.candidate_game_set_count, 0);
  assert.equal(summary.database_proof.candidate_game_card_count, 0);
  assert.equal(summary.database_proof.default_transaction_read_only, "on");
  assert.equal(summary.database_proof.transaction_read_only, "on");
  assert.equal(summary.database_proof.transaction_ended_with, "rollback");
  assert.equal(summary.database_proof.database_writes, false);
  assert.deepEqual(plan.boundaries, NO_WRITE_RECONCILIATION_BOUNDARIES);
  assert.deepEqual(summary.boundaries, NO_WRITE_RECONCILIATION_BOUNDARIES);
});
