import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION,
  COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION,
  COLLECTIBLE_WAVE1_GAMES,
  compareWave1ProtectedCountsV1,
  evaluateWave1FoundationBaselineV1,
  evaluateWave1FoundationTransientV1,
  wave1FoundationFingerprintV1,
} from "../../backend/catalog/collectible_wave1_game_foundations_v1.mjs";
import {
  splitSealedMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "feature/collectible-wave1-game-foundations-v1";
const EXECUTOR_VERSION = "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_ROLLBACK_V1";
const MIGRATION_PATH = path.join(
  ROOT,
  "supabase",
  "migrations",
  `${COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION}_collectible_wave1_game_foundations_v1.sql`,
);
const DEFAULT_OUT = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_game_foundations_v1",
  "production_rollback_v1",
);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const options = {
    execute: false,
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument === "--execute-rollback-only") options.execute = true;
    else if (argument.startsWith("--env-file=")) {
      options.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      options.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!options.execute) throw new Error("--execute-rollback-only is required");
  if (!/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return options;
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

function cleanError(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 4000);
}

async function writeJson(filePath, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, body, "utf8");
  return body;
}

const PROTECTED_COUNTS_SQL = `jsonb_build_object(
  'games', (select count(*) from public.games),
  'release_controls', (select count(*) from public.catalog_game_release_controls),
  'sets', (select count(*) from public.sets),
  'card_prints', (select count(*) from public.card_prints),
  'identity_rows', (select count(*) from public.card_print_identity),
  'printing_rows', (select count(*) from public.card_printings),
  'external_mappings', (select count(*) from public.external_mappings),
  'external_printing_mappings', (select count(*) from public.external_printing_mappings),
  'sealed_families', (select count(*) from public.sealed_product_families),
  'sealed_variants', (select count(*) from public.sealed_product_variants),
  'storage_objects', (select count(*) from storage.objects),
  'vault_items', (select count(*) from public.vault_items),
  'vault_item_instances', (select count(*) from public.vault_item_instances)
)`;

async function captureBaseline(connectionString, applicationName) {
  const client = new pg.Client(clientOptions(connectionString, applicationName));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const { rows } = await client.query(`select jsonb_build_object(
      'transaction_read_only', current_setting('transaction_read_only')::boolean,
      'latest_migration', (select max(version) from supabase_migrations.schema_migrations),
      'candidate_migration_count', (select count(*) from supabase_migrations.schema_migrations
        where version = $1),
      'candidate_game_code_count', (select count(*) from public.games
        where code = any($2::text[])),
      'candidate_game_id_count', (select count(*) from public.games
        where id = any($3::uuid[])),
      'candidate_game_slug_count', (select count(*) from public.games
        where slug = any($4::text[])),
      'candidate_release_control_count', (select count(*)
        from public.catalog_game_release_controls where game_code = any($2::text[])),
      'games_rls_enabled', (select relrowsecurity from pg_class
        where oid = 'public.games'::regclass),
      'release_controls_rls_enabled', (select relrowsecurity from pg_class
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
          'catalog_game_visible_to_request_v1',
          'catalog_game_id_visible_to_request_v1',
          'catalog_card_print_visible_to_request_v1',
          'catalog_parent_gv_id_visible_to_request_v1'
        )),
      'identity_domain_constraint', (select pg_get_constraintdef(oid)
        from pg_constraint where conrelid = 'public.card_print_identity'::regclass
          and conname = 'card_print_identity_identity_domain_check'),
      'conflicting_lock_count', (select count(*) from pg_locks lock
        where not lock.granted and lock.relation in (
          'public.games'::regclass,
          'public.catalog_game_release_controls'::regclass
        )),
      'protected_counts', ${PROTECTED_COUNTS_SQL}
    ) as value`, [
      COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION,
      COLLECTIBLE_WAVE1_GAMES.map((row) => row.code),
      COLLECTIBLE_WAVE1_GAMES.map((row) => row.id),
      COLLECTIBLE_WAVE1_GAMES.map((row) => row.slug),
    ]);
    await client.query("rollback");
    return rows[0].value;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function roleVisibility(client, role) {
  await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
  const { rows } = await client.query(`
    select code, public.catalog_game_visible_to_request_v1(code) as visible
    from unnest($1::text[]) as seed(code)
    order by code
  `, [COLLECTIBLE_WAVE1_GAMES.map((row) => row.code)]);
  return Object.fromEntries(rows.map((row) => [row.code, row.visible]));
}

async function captureTransient(client) {
  const { rows: stateRows } = await client.query(`select jsonb_build_object(
      'games', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'code', code, 'name', name, 'slug', slug
      ) order by code), '[]'::jsonb) from public.games where code = any($1::text[])),
      'release_controls', (select coalesce(jsonb_agg(jsonb_build_object(
        'game_code', game_code,
        'release_status', release_status,
        'release_version', release_version,
        'evidence', evidence
      ) order by game_code), '[]'::jsonb) from public.catalog_game_release_controls
        where game_code = any($1::text[])),
      'migration_count', (select count(*) from supabase_migrations.schema_migrations
        where version = $2),
      'identity_domain_constraint', (select pg_get_constraintdef(oid)
        from pg_constraint where conrelid = 'public.card_print_identity'::regclass
          and conname = 'card_print_identity_identity_domain_check'),
      'protected_counts', ${PROTECTED_COUNTS_SQL}
    ) as value`, [
      COLLECTIBLE_WAVE1_GAMES.map((row) => row.code),
      COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION,
    ]);
  const anon = await roleVisibility(client, "anon");
  const authenticated = await roleVisibility(client, "authenticated");
  const serviceRole = await roleVisibility(client, "service_role");
  return {
    ...stateRows[0].value,
    visibility: { anon, authenticated, service_role: serviceRole },
  };
}

async function executeRollbackOnly(connectionString, statements, baseline) {
  const client = new pg.Client(clientOptions(
    connectionString,
    "collectible-wave1-game-foundations-rollback-v1",
  ));
  const proof = {
    transaction_started: false,
    statements_planned: statements.length,
    statements_executed: 0,
    transient_readback: null,
    findings: [],
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
    for (const statement of statements) {
      await client.query(statement);
      proof.statements_executed += 1;
    }
    proof.transient_readback = await captureTransient(client);
    proof.findings.push(...evaluateWave1FoundationTransientV1(proof.transient_readback));
    proof.findings.push(...compareWave1ProtectedCountsV1(
      baseline.protected_counts,
      proof.transient_readback.protected_counts,
      { games: 2, release_controls: 2 },
    ));
    if (Number(proof.transient_readback.migration_count) !== 0) {
      proof.findings.push("migration_ledger_changed_inside_rollback_canary");
    }
    if (proof.transient_readback.identity_domain_constraint !==
        baseline.identity_domain_constraint) {
      proof.findings.push("identity_domain_constraint_changed");
    }
    if (proof.findings.length) throw new Error("Transient foundation verification failed");
  } catch (error) {
    primaryError = error;
  } finally {
    proof.rollback_attempted = proof.transaction_started;
    if (proof.transaction_started) {
      try {
        await client.query("rollback");
        proof.rollback_succeeded = true;
      } catch (error) {
        proof.findings.push(`rollback_failed:${cleanError(error)}`);
      }
    }
    await client.end();
  }
  if (primaryError) {
    primaryError.rollbackProof = proof;
    throw primaryError;
  }
  return proof;
}

function evaluateRestoration(baseline, after) {
  const findings = [];
  findings.push(...evaluateWave1FoundationBaselineV1(after));
  findings.push(...compareWave1ProtectedCountsV1(
    baseline.protected_counts,
    after.protected_counts,
  ));
  for (const field of [
    "latest_migration",
    "candidate_migration_count",
    "candidate_game_code_count",
    "candidate_game_id_count",
    "candidate_game_slug_count",
    "candidate_release_control_count",
    "identity_domain_constraint",
  ]) {
    if (after[field] !== baseline[field]) findings.push(`baseline_changed:${field}`);
  }
  return [...new Set(findings)];
}

async function preserveArtifacts(outDir, artifacts) {
  const bodies = {};
  for (const [name, value] of Object.entries(artifacts)) {
    bodies[name] = await writeJson(path.join(outDir, name), value);
  }
  const report = `# Collectible Wave 1 Game Foundations Rollback V1\n\n` +
    `- Status: \`${artifacts["summary.json"].status}\`\n` +
    `- Repository SHA: \`${artifacts["summary.json"].repository.commit_sha}\`\n` +
    `- Migration SHA-256: \`${artifacts["summary.json"].migration.sha256}\`\n` +
    `- Transient game inserts: \`2\`\n` +
    `- Transient hidden control inserts: \`2\`\n` +
    `- Rollback succeeded: \`${artifacts["summary.json"].rollback_succeeded}\`\n` +
    `- Durable database writes: \`0\`\n` +
    `- Findings: \`${artifacts["summary.json"].findings.length}\`\n`;
  bodies["REPORT.md"] = report;
  await fs.writeFile(path.join(outDir, "REPORT.md"), report, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts: Object.entries(bodies)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([artifactPath, body]) => ({ artifact_path: artifactPath, sha256: sha256(body) })),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"),
  };
  if (repository.branch !== BRANCH ||
      repository.commit_sha !== options.expectedHeadSha ||
      git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Repository is not the exact clean rollback-canary producer");
  }
  const migrationBody = await fs.readFile(MIGRATION_PATH, "utf8");
  const statements = splitSealedMigrationStatementsV1(
    stripSealedMigrationTransactionWrapperV1(migrationBody),
  );
  const runPlanCore = {
    version: EXECUTOR_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    migration: {
      version: COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_MIGRATION_VERSION,
      path: path.relative(ROOT, MIGRATION_PATH).replaceAll("\\", "/"),
      sha256: sha256(migrationBody),
      statement_count: statements.length,
    },
    exact_scope: {
      games: COLLECTIBLE_WAVE1_GAMES,
      release_status: "hidden",
      release_version: COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION,
      game_rows: 2,
      release_control_rows: 2,
    },
    boundaries: {
      execution_mode: "production_rollback_only",
      durable_database_writes: 0,
      migration_ledger_writes: 0,
      set_card_identity_printing_mapping_writes: 0,
      storage_image_pricing_publication_vault_writes: 0,
      identity_domain_constraint_changes: 0,
      app_visibility_enabled: false,
    },
  };
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: wave1FoundationFingerprintV1(runPlanCore),
  };
  await fs.mkdir(options.outDir, { recursive: true });
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: options.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");

  let baseline = null;
  let transactionProof = null;
  let postRollback = null;
  let primaryError = null;
  try {
    baseline = await captureBaseline(
      connectionString,
      "collectible-wave1-game-foundations-baseline-v1",
    );
    const baselineFindings = evaluateWave1FoundationBaselineV1(baseline);
    if (baselineFindings.length) {
      throw new Error(`Fresh baseline failed: ${baselineFindings.join(", ")}`);
    }
    try {
      transactionProof = await executeRollbackOnly(connectionString, statements, baseline);
    } catch (error) {
      transactionProof = error.rollbackProof ?? transactionProof;
      throw error;
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (baseline && transactionProof?.rollback_attempted) {
      try {
        postRollback = await captureBaseline(
          connectionString,
          "collectible-wave1-game-foundations-post-rollback-v1",
        );
      } catch (error) {
        primaryError ??= error;
      }
    }
  }

  const findings = [...(transactionProof?.findings ?? [])];
  if (transactionProof?.rollback_succeeded !== true) findings.push("rollback_not_proven");
  if (baseline && postRollback) findings.push(...evaluateRestoration(baseline, postRollback));
  else findings.push("fresh_post_rollback_readback_missing");
  if (primaryError) findings.push(cleanError(primaryError));
  const uniqueFindings = [...new Set(findings)];
  const summary = {
    version: EXECUTOR_VERSION,
    recorded_at: new Date().toISOString(),
    status: uniqueFindings.length === 0
      ? "rollback_canary_passed_zero_durable_change"
      : "blocked",
    repository,
    migration: runPlan.migration,
    run_plan_fingerprint_sha256: runPlan.run_plan_fingerprint_sha256,
    statements_executed: transactionProof?.statements_executed ?? 0,
    rollback_succeeded: transactionProof?.rollback_succeeded ?? false,
    post_rollback_read_only: postRollback?.transaction_read_only === true,
    findings: uniqueFindings,
    boundaries: runPlan.boundaries,
  };
  await preserveArtifacts(options.outDir, {
    "run_plan.json": runPlan,
    "protected_before.json": baseline,
    "transaction_proof.json": transactionProof,
    "post_rollback_readback.json": postRollback,
    "summary.json": summary,
    ...(primaryError ? { "failure.json": { error: cleanError(primaryError) } } : {}),
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    run_plan_fingerprint_sha256: summary.run_plan_fingerprint_sha256,
    migration_sha256: summary.migration.sha256,
    findings: summary.findings,
    output_directory: path.relative(ROOT, options.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (uniqueFindings.length) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${cleanError(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  BRANCH,
  EXECUTOR_VERSION,
  MIGRATION_PATH,
  captureBaseline,
  evaluateRestoration,
  parseArgs,
};
