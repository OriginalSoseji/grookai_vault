import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
  ONE_PIECE_FOUNDATION_VERSION,
  ONE_PIECE_GAME,
  compareFoundationProtectedCountsV1,
  evaluateOnePieceFoundationAppliedStateV1,
  evaluateOnePieceFoundationPreflightV1,
  foundationRunPlanFingerprint,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_v1.mjs";
import {
  splitSealedMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const EXECUTOR_VERSION = "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_ROLLBACK_V1";
const MIGRATION = path.join(ROOT, "supabase", "migrations",
  `${ONE_PIECE_FOUNDATION_MIGRATION_VERSION}_one_piece_canonical_catalog_foundation_v1.sql`);
const PREFLIGHT_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_preflight_v1", "production_read_only_v1");
const PREFLIGHT_SUMMARY = path.join(PREFLIGHT_DIR, "summary.json");
const PREFLIGHT_RUN_PLAN = path.join(PREFLIGHT_DIR, "run_plan.json");
const PINNED_PREFLIGHT_FINGERPRINT =
  "c3dc1ab6bdc2d6d1c434cddbc4c6a47fd447d65d396c1eec6feaf2bfb9978a1b";
const PINNED_PREFLIGHT_SUMMARY_SHA256 =
  "2ed57f833c7baca377d1df04da7185b3c8ace13c3553918b14ed96d60a4b7287";
const PINNED_MIGRATION_SHA256 =
  "a072e55f5bf3362aefcf1056b37e93a4e861b64ffeb529e0fd554d046586fbba";
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_rollback_v1", "production_rollback_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    execute: false,
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument === "--execute-rollback-canary") args.execute = true;
    else if (argument.startsWith("--env-file=")) args.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.execute) throw new Error("--execute-rollback-canary is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function cleanError(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 4000);
}

function verifyInputs({ migrationBody, preflightBody, preflight, preflightRunPlan }) {
  const findings = [];
  if (sha256(migrationBody) !== PINNED_MIGRATION_SHA256) findings.push("migration_hash_mismatch");
  if (sha256(preflightBody) !== PINNED_PREFLIGHT_SUMMARY_SHA256) {
    findings.push("preflight_summary_hash_mismatch");
  }
  if (preflight.status !== "foundation_preflight_passed_no_writes" ||
      preflight.preflight_fingerprint_sha256 !== PINNED_PREFLIGHT_FINGERPRINT ||
      preflight.findings?.length !== 0) {
    findings.push("preflight_not_authoritative");
  }
  if (preflight.migration?.sha256 !== PINNED_MIGRATION_SHA256 ||
      preflightRunPlan.migration?.sha256 !== PINNED_MIGRATION_SHA256) {
    findings.push("preflight_migration_binding_mismatch");
  }
  if (preflightRunPlan.numbered_card_scope?.count !== 17 ||
      preflightRunPlan.numbered_card_scope?.product_ids?.length !== 17 ||
      preflightRunPlan.numbered_card_scope?.gv_ids?.length !== 17) {
    findings.push("preflight_numbered_scope_mismatch");
  }
  return [...new Set(findings)];
}

function clientOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: applicationName,
  };
}

async function captureFoundationState(connectionString, { productIds, gvIds, applicationName }) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    const result = await client.query(`select jsonb_build_object(
      'transaction_read_only', current_setting('transaction_read_only')::boolean,
      'latest_migration', (select max(version) from supabase_migrations.schema_migrations),
      'candidate_migration_count', (select count(*) from supabase_migrations.schema_migrations
        where version = $1),
      'later_migration_count', (select count(*) from supabase_migrations.schema_migrations
        where version > $1),
      'game_code_count', (select count(*) from public.games where code = $2),
      'game_id_count', (select count(*) from public.games where id = $3::uuid),
      'release_control_table_present', to_regclass('public.catalog_game_release_controls') is not null,
      'release_control_count', (select count(*) from public.catalog_game_release_controls
        where game_code = $2),
      'release_control_rls_enabled', (select relrowsecurity from pg_class
        where oid = 'public.catalog_game_release_controls'::regclass),
      'anon_release_control_select', has_table_privilege(
        'anon', 'public.catalog_game_release_controls', 'select'),
      'authenticated_release_control_select', has_table_privilege(
        'authenticated', 'public.catalog_game_release_controls', 'select'),
      'service_release_control_select', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'select'),
      'service_release_control_insert', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'insert'),
      'visibility_function_count', (select count(*) from pg_proc procedure
        join pg_namespace namespace on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'public' and procedure.proname in (
          'catalog_game_visible_to_request_v1', 'catalog_game_id_visible_to_request_v1',
          'catalog_card_print_visible_to_request_v1',
          'catalog_parent_gv_id_visible_to_request_v1')),
      'visibility_policy_count', (select count(*) from pg_policies
        where schemaname = 'public' and policyname in (
          'games_catalog_release_visibility_v1', 'sets_catalog_release_visibility_v1',
          'card_prints_catalog_release_visibility_v1',
          'card_print_identity_catalog_release_visibility_v1',
          'card_printings_catalog_release_visibility_v1')),
      'normal_finish_count', (select count(*) from public.finish_keys
        where key = 'normal' and is_active),
      'identity_domain_constraint', (select pg_get_constraintdef(oid)
        from pg_constraint where conrelid = 'public.card_print_identity'::regclass
          and conname = 'card_print_identity_identity_domain_check'),
      'staged_total_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189),
      'staged_numbered_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189 and single_card_kind = 'numbered_card'),
      'staged_don_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189 and single_card_kind = 'don_card'),
      'staged_sealed_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189 and record_class = 'sealed_product_candidate'),
      'st01_set_count', (select count(*) from public.sets
        where game = $2 and lower(code) in ('st01', 'st-01')),
      'gv_id_collision_count', (select count(*) from public.card_prints
        where gv_id = any($4::text[])),
      'tcgplayer_id_collision_count', (select count(*) from public.card_prints
        where tcgplayer_id = any($5::text[])),
      'parent_mapping_collision_count', (select count(*) from public.external_mappings
        where source in ('tcgplayer', 'tcgplayer_catalog')
          and external_id = any($5::text[])),
      'conflicting_lock_count', (select count(*) from pg_locks lock
        where not lock.granted and lock.relation in (
          'public.games'::regclass, 'public.catalog_game_release_controls'::regclass,
          'public.card_print_identity'::regclass)),
      'protected_counts', jsonb_build_object(
        'games', (select count(*) from public.games),
        'sets', (select count(*) from public.sets),
        'card_prints', (select count(*) from public.card_prints),
        'identity_rows', (select count(*) from public.card_print_identity),
        'printing_rows', (select count(*) from public.card_printings),
        'external_mappings', (select count(*) from public.external_mappings),
        'external_printing_mappings', (select count(*) from public.external_printing_mappings),
        'sealed_families', (select count(*) from public.sealed_product_families),
        'sealed_variants', (select count(*) from public.sealed_product_variants),
        'sealed_candidates', (select count(*) from public.sealed_product_candidates),
        'sealed_releases', (select count(*) from public.sealed_product_releases),
        'vault_items', (select count(*) from public.vault_items),
        'vault_item_instances', (select count(*) from public.vault_item_instances),
        'vault_owners', (select count(*) from public.vault_owners)
      )
    ) as value`, [
      ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
      ONE_PIECE_GAME.code,
      ONE_PIECE_GAME.id,
      gvIds,
      productIds,
    ]);
    await client.query("rollback");
    return result.rows[0].value;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function captureAppliedState(client) {
  const result = await client.query(`select jsonb_build_object(
    'game_count', (select count(*) from public.games where code = $1),
    'game_row', (select jsonb_build_object('id', id, 'code', code, 'name', name, 'slug', slug)
      from public.games where code = $1),
    'release_control_count', (select count(*) from public.catalog_game_release_controls
      where game_code = $1),
    'release_control_row', (select jsonb_build_object(
      'game_code', game_code, 'release_status', release_status,
      'release_version', release_version)
      from public.catalog_game_release_controls where game_code = $1),
    'identity_domain_constraint', (select pg_get_constraintdef(oid)
      from pg_constraint where conrelid = 'public.card_print_identity'::regclass
        and conname = 'card_print_identity_identity_domain_check'),
    'anon_game_visible', (select set_config('request.jwt.claim.role', 'anon', true)
      is not null and public.catalog_game_visible_to_request_v1($1)),
    'authenticated_game_visible', (select set_config('request.jwt.claim.role', 'authenticated', true)
      is not null and public.catalog_game_visible_to_request_v1($1)),
    'service_game_visible', (select set_config('request.jwt.claim.role', 'service_role', true)
      is not null and public.catalog_game_visible_to_request_v1($1)),
    'canonical_counts', jsonb_build_object(
      'sets', (select count(*) from public.sets where game = $1),
      'cards', (select count(*) from public.card_prints where game_id = $2::uuid),
      'identities', (select count(*) from public.card_print_identity identity
        join public.card_prints card on card.id = identity.card_print_id
        where card.game_id = $2::uuid),
      'printings', (select count(*) from public.card_printings printing
        join public.card_prints card on card.id = printing.card_print_id
        where card.game_id = $2::uuid)
    )
  ) as value`, [ONE_PIECE_GAME.code, ONE_PIECE_GAME.id]);
  return result.rows[0].value;
}

async function runRollbackTransaction(connectionString, { migrationStatements, baseline }) {
  const client = new Client(clientOptions(
    connectionString,
    "one-piece-foundation-rollback-transaction-v1",
  ));
  const proof = {
    transaction_started: false,
    statements_planned: migrationStatements.length,
    statements_executed: 0,
    applied_readback: null,
    applied_findings: [],
    protected_count_findings: [],
    rollback_attempted: false,
    rollback_succeeded: false,
  };
  await client.connect();
  let primaryError = null;
  try {
    await client.query("begin");
    proof.transaction_started = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    await client.query("set local idle_in_transaction_session_timeout = '180s'");
    for (const statement of migrationStatements) {
      await client.query(statement);
      proof.statements_executed += 1;
    }
    proof.applied_readback = await captureAppliedState(client);
    proof.applied_findings = evaluateOnePieceFoundationAppliedStateV1(
      proof.applied_readback,
    ).findings;
    if (Number(proof.applied_readback.canonical_counts?.sets ?? 0) !== 0 ||
        Number(proof.applied_readback.canonical_counts?.cards ?? 0) !== 0 ||
        Number(proof.applied_readback.canonical_counts?.identities ?? 0) !== 0 ||
        Number(proof.applied_readback.canonical_counts?.printings ?? 0) !== 0) {
      proof.applied_findings.push("canonical_rows_created_inside_foundation_transaction");
    }
    const currentCounts = await client.query(`select jsonb_build_object(
      'games', (select count(*) from public.games),
      'sets', (select count(*) from public.sets),
      'card_prints', (select count(*) from public.card_prints),
      'identity_rows', (select count(*) from public.card_print_identity),
      'printing_rows', (select count(*) from public.card_printings),
      'external_mappings', (select count(*) from public.external_mappings),
      'external_printing_mappings', (select count(*) from public.external_printing_mappings),
      'sealed_families', (select count(*) from public.sealed_product_families),
      'sealed_variants', (select count(*) from public.sealed_product_variants),
      'sealed_candidates', (select count(*) from public.sealed_product_candidates),
      'sealed_releases', (select count(*) from public.sealed_product_releases),
      'vault_items', (select count(*) from public.vault_items),
      'vault_item_instances', (select count(*) from public.vault_item_instances),
      'vault_owners', (select count(*) from public.vault_owners)
    ) as value`);
    const expectedCounts = { ...baseline.protected_counts, games: Number(baseline.protected_counts.games) + 1 };
    proof.protected_count_findings = compareFoundationProtectedCountsV1(
      expectedCounts,
      currentCounts.rows[0].value,
    ).findings;
    if (proof.applied_findings.length || proof.protected_count_findings.length) {
      throw new Error("Transaction-local foundation verification failed");
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (proof.transaction_started) {
      proof.rollback_attempted = true;
      try {
        await client.query("rollback");
        proof.rollback_succeeded = true;
      } catch (rollbackError) {
        proof.rollback_error = cleanError(rollbackError);
      }
    }
    await client.end();
  }
  if (primaryError) {
    primaryError.databaseProof = proof;
    throw primaryError;
  }
  return proof;
}

function evaluatePostRollback({ baseline, postRollback }) {
  const findings = [];
  findings.push(...evaluateOnePieceFoundationPreflightV1(postRollback).findings);
  findings.push(...compareFoundationProtectedCountsV1(
    baseline.protected_counts,
    postRollback.protected_counts,
  ).findings);
  for (const key of [
    "candidate_migration_count", "game_code_count", "game_id_count",
    "release_control_count", "st01_set_count", "gv_id_collision_count",
    "tcgplayer_id_collision_count", "parent_mapping_collision_count",
  ]) {
    if (Number(postRollback[key] ?? 0) !== Number(baseline[key] ?? 0)) {
      findings.push(`post_rollback_baseline_changed:${key}`);
    }
  }
  if (postRollback.identity_domain_constraint !== baseline.identity_domain_constraint) {
    findings.push("post_rollback_identity_constraint_changed");
  }
  return [...new Set(findings)];
}

async function preserveArtifacts(outDir, { runPlan, baseline, transactionProof, postRollback,
  summary, failure }) {
  const bodies = {};
  bodies["run_plan.json"] = await fs.readFile(path.join(outDir, "run_plan.json"), "utf8");
  if (baseline) bodies["protected_before.json"] = await writeJson(
    path.join(outDir, "protected_before.json"), baseline);
  if (transactionProof) bodies["transaction_proof.json"] = await writeJson(
    path.join(outDir, "transaction_proof.json"), transactionProof);
  if (postRollback) bodies["post_rollback_readback.json"] = await writeJson(
    path.join(outDir, "post_rollback_readback.json"), postRollback);
  if (failure) bodies["failure.json"] = await writeJson(
    path.join(outDir, "failure.json"), failure);
  bodies["summary.json"] = await writeJson(path.join(outDir, "summary.json"), summary);
  bodies["REPORT.md"] = `# One Piece Canonical Catalog Foundation Rollback V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Repository SHA: \`${summary.repository.commit_sha}\`\n` +
    `- Preflight fingerprint: \`${summary.preflight_fingerprint_sha256}\`\n` +
    `- Migration SHA-256: \`${summary.migration_sha256}\`\n` +
    `- Statements executed: \`${transactionProof?.statements_executed ?? 0}\`\n` +
    `- Rollback succeeded: \`${transactionProof?.rollback_succeeded ?? false}\`\n` +
    `- Fresh post-rollback read-only proof: \`${postRollback?.transaction_read_only ?? false}\`\n` +
    `- Durable database changes: \`0\` required\n` +
    `- Findings: \`${summary.findings.length}\`\n`;
  await fs.writeFile(path.join(outDir, "REPORT.md"), bodies["REPORT.md"], "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(bodies)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([artifactPath, body]) => ({ path: artifactPath, sha256: sha256(body) })),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
  };
  if (repository.commit_sha !== args.expectedHeadSha || repository.branch !== BRANCH ||
      git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Repository is not the exact clean rollback-canary producer");
  }
  const [migrationBody, preflightBody, preflightRunPlanBody] = await Promise.all([
    fs.readFile(MIGRATION),
    fs.readFile(PREFLIGHT_SUMMARY),
    fs.readFile(PREFLIGHT_RUN_PLAN),
  ]);
  const preflight = JSON.parse(preflightBody.toString("utf8"));
  const preflightRunPlan = JSON.parse(preflightRunPlanBody.toString("utf8"));
  const inputFindings = verifyInputs({
    migrationBody,
    preflightBody,
    preflight,
    preflightRunPlan,
  });
  if (inputFindings.length) throw new Error(`Pinned input verification failed: ${inputFindings.join(", ")}`);
  const migrationStatements = splitSealedMigrationStatementsV1(
    stripSealedMigrationTransactionWrapperV1(migrationBody.toString("utf8")),
  );
  const runPlanCore = {
    version: EXECUTOR_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    migration: {
      version: ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
      path: path.relative(ROOT, MIGRATION).replaceAll("\\", "/"),
      sha256: sha256(migrationBody),
      statement_count: migrationStatements.length,
    },
    authority: {
      preflight_summary: path.relative(ROOT, PREFLIGHT_SUMMARY).replaceAll("\\", "/"),
      preflight_summary_sha256: sha256(preflightBody),
      preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    },
    exact_scope: preflightRunPlan.numbered_card_scope,
    boundaries: {
      execution_mode: "rollback_only",
      durable_database_writes: 0,
      migration_ledger_writes: 0,
      canonical_card_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
    },
  };
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: foundationRunPlanFingerprint(runPlanCore),
  };
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  let baseline = null;
  let transactionProof = null;
  let postRollback = null;
  let primaryError = null;
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const readOptions = {
    productIds: runPlan.exact_scope.product_ids,
    gvIds: runPlan.exact_scope.gv_ids,
  };
  try {
    baseline = await captureFoundationState(connectionString, {
      ...readOptions,
      applicationName: "one-piece-foundation-rollback-baseline-v1",
    });
    const baselineEvaluation = evaluateOnePieceFoundationPreflightV1(baseline);
    if (!baselineEvaluation.valid) {
      throw new Error(`Fresh production preflight failed: ${baselineEvaluation.findings.join(", ")}`);
    }
    try {
      transactionProof = await runRollbackTransaction(connectionString, {
        migrationStatements,
        baseline,
      });
    } catch (error) {
      if (error.databaseProof) transactionProof = error.databaseProof;
      throw error;
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (baseline && transactionProof?.rollback_attempted) {
      try {
        postRollback = await captureFoundationState(connectionString, {
          ...readOptions,
          applicationName: "one-piece-foundation-rollback-post-v1",
        });
      } catch (error) {
        primaryError ??= error;
      }
    }
  }
  const findings = [];
  if (transactionProof?.rollback_succeeded !== true) findings.push("rollback_not_proven");
  if (baseline && postRollback) findings.push(...evaluatePostRollback({ baseline, postRollback }));
  else findings.push("fresh_post_rollback_readback_missing");
  if (primaryError) findings.push(cleanError(primaryError));
  const status = findings.length === 0
    ? "rollback_canary_passed_zero_durable_change"
    : "blocked";
  const summaryCore = {
    version: EXECUTOR_VERSION,
    recorded_at: new Date().toISOString(),
    status,
    repository,
    run_plan_fingerprint_sha256: runPlan.run_plan_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    migration_sha256: sha256(migrationBody),
    transaction: {
      statements_planned: migrationStatements.length,
      statements_executed: transactionProof?.statements_executed ?? 0,
      rollback_attempted: transactionProof?.rollback_attempted ?? false,
      rollback_succeeded: transactionProof?.rollback_succeeded ?? false,
    },
    post_rollback: {
      fresh_read_only_connection: postRollback?.transaction_read_only === true,
      candidate_migration_count: Number(postRollback?.candidate_migration_count ?? -1),
      game_count: Number(postRollback?.game_code_count ?? -1),
      release_control_count: Number(postRollback?.release_control_count ?? -1),
    },
    findings: [...new Set(findings)],
    boundaries: runPlan.boundaries,
  };
  const summary = {
    ...summaryCore,
    rollback_proof_sha256: sha256(JSON.stringify(summaryCore)),
  };
  await preserveArtifacts(args.outDir, {
    runPlan,
    baseline,
    transactionProof,
    postRollback,
    summary,
    failure: primaryError ? { error: cleanError(primaryError) } : null,
  });
  process.stdout.write(`${JSON.stringify({
    status,
    rollback_proof_sha256: summary.rollback_proof_sha256,
    findings: summary.findings,
    output_directory: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${cleanError(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  EXECUTOR_VERSION,
  PINNED_MIGRATION_SHA256,
  PINNED_PREFLIGHT_FINGERPRINT,
  PINNED_PREFLIGHT_SUMMARY_SHA256,
  captureFoundationState,
  evaluatePostRollback,
  parseArgs,
  verifyInputs,
};
