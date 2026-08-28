import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION,
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD,
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_VERSION,
  collectibleWave1SetDatabaseRowsV1,
  collectibleWave1SetProofFingerprintV1,
  compareCollectibleWave1ProtectedCountsV1,
  evaluateCollectibleWave1SetRollbackBaselineV1,
  evaluateCollectibleWave1SetTransientV1,
  parseCollectibleWave1SetPayloadV1,
  renderCollectibleWave1SetFoundationsMigrationV1,
} from "../../backend/catalog/collectible_wave1_set_foundations_v1.mjs";
import {
  splitSealedMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXECUTOR_VERSION = "COLLECTIBLE_WAVE1_SET_FOUNDATIONS_ROLLBACK_V1";
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
const DEFAULT_OUT = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_set_foundations_v1",
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

function clientOptions(connectionString, applicationName, readOnly = false) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
    application_name: applicationName,
    ...(readOnly ? { options: "-c default_transaction_read_only=on" } : {}),
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
  return Buffer.from(body);
}

const PROTECTED_COUNTS_SQL = `jsonb_build_object(
  'games', (select count(*) from public.games),
  'release_controls', (select count(*) from public.catalog_game_release_controls),
  'sets', (select count(*) from public.sets),
  'card_prints', (select count(*) from public.card_prints),
  'legacy_cards', (select count(*) from public.cards),
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

function plannedRows(databaseRows) {
  return databaseRows.map((row) => ({
    id: row.id,
    game: row.game,
    code: row.code,
    name: row.name,
    source_set_proposal_id: row.source.set_proposal_id,
  }));
}

async function captureBaseline(connectionString, databaseRows, applicationName) {
  const client = new pg.Client(clientOptions(connectionString, applicationName, true));
  await client.connect();
  let open = false;
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const { rows } = await client.query(`
      with planned as materialized (
        select * from jsonb_to_recordset($1::jsonb) as row(
          id uuid, game text, code text, name text, source_set_proposal_id text
        )
      )
      select jsonb_build_object(
        'transaction_read_only', current_setting('transaction_read_only')::boolean,
        'latest_migration', (select max(version) from supabase_migrations.schema_migrations),
        'candidate_migration_count', (select count(*) from supabase_migrations.schema_migrations
          where version = $2),
        'planned_row_count', (select count(*) from planned),
        'games', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'code', code, 'name', name, 'slug', slug
        ) order by code), '[]'::jsonb) from public.games where code in ('gundam', 'yugioh')),
        'release_controls', (select coalesce(jsonb_agg(jsonb_build_object(
          'game_code', game_code, 'release_status', release_status,
          'release_version', release_version, 'evidence', evidence
        ) order by game_code), '[]'::jsonb) from public.catalog_game_release_controls
          where game_code in ('gundam', 'yugioh')),
        'existing_selected_set_count', (select count(*) from public.sets existing
          join planned on planned.id = existing.id),
        'existing_wave1_set_count', (select count(*) from public.sets
          where game in ('gundam', 'yugioh')),
        'planned_id_collision_count', (select count(*) from public.sets existing
          join planned on planned.id = existing.id),
        'planned_code_collision_count', (select count(*) from public.sets existing
          join planned on planned.code = existing.code),
        'planned_source_proposal_collision_count', (select count(*) from public.sets existing
          join planned on planned.source_set_proposal_id = existing.source ->> 'set_proposal_id'),
        'planned_game_name_collision_count', (select count(*) from public.sets existing
          join planned on planned.game = existing.game
            and lower(planned.name) = lower(existing.name)),
        'sets_rls_enabled', (select relrowsecurity from pg_class
          where oid = 'public.sets'::regclass),
        'sets_force_rls', (select relforcerowsecurity from pg_class
          where oid = 'public.sets'::regclass),
        'sets_release_policy', (select jsonb_build_object(
          'permissive', permissive, 'roles', roles, 'qual', qual
        ) from pg_policies where schemaname = 'public' and tablename = 'sets'
          and policyname = 'sets_catalog_release_visibility_v1'),
        'sets_columns', (select jsonb_agg(column_name order by ordinal_position)
          from information_schema.columns where table_schema = 'public' and table_name = 'sets'),
        'set_unique_definitions', (select coalesce(jsonb_agg(definition order by definition),
          '[]'::jsonb) from (
            select pg_get_constraintdef(oid) as definition from pg_constraint
              where conrelid = 'public.sets'::regclass and contype in ('p', 'u')
            union all
            select indexdef from pg_indexes where schemaname = 'public'
              and tablename = 'sets' and indexdef ilike '%unique%'
          ) definitions),
        'conflicting_lock_count', (select count(*) from pg_locks lock
          where not lock.granted and lock.relation = 'public.sets'::regclass),
        'protected_counts', ${PROTECTED_COUNTS_SQL}
      ) as value
    `, [JSON.stringify(plannedRows(databaseRows)), COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION]);
    await client.query("rollback");
    open = false;
    return rows[0].value;
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function roleVisibility(client, role) {
  await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
  const { rows } = await client.query(`
    select game, public.catalog_game_visible_to_request_v1(game) as visible
    from unnest(array['gundam'::text, 'yugioh'::text]) as seed(game)
    order by game
  `);
  return Object.fromEntries(rows.map((row) => [row.game, row.visible]));
}

async function rlsVisibleSetCount(client, role, setIds) {
  if (!new Set(["anon", "authenticated"]).has(role)) throw new Error("Unsupported RLS role");
  try {
    await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
    await client.query(`set local role ${role}`);
    const { rows } = await client.query(
      "select count(*)::integer as count from public.sets where id = any($1::uuid[])",
      [setIds],
    );
    return Number(rows[0].count);
  } finally {
    await client.query("reset role").catch(() => {});
  }
}

async function captureTransient(client, databaseRows) {
  const ids = databaseRows.map((row) => row.id);
  const { rows } = await client.query(`select jsonb_build_object(
    'sets', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'game', game, 'code', code, 'name', name,
      'release_date', release_date, 'source', source, 'printed_total', printed_total,
      'printed_set_abbrev', printed_set_abbrev, 'set_role', set_role,
      'identity_domain_default', identity_domain_default, 'identity_model', identity_model,
      'logo_url', logo_url, 'symbol_url', symbol_url, 'hero_image_url', hero_image_url,
      'hero_image_source', hero_image_source
    ) order by code), '[]'::jsonb) from public.sets where id = any($1::uuid[])),
    'release_controls', (select coalesce(jsonb_agg(jsonb_build_object(
      'game_code', game_code, 'release_status', release_status,
      'release_version', release_version, 'evidence', evidence
    ) order by game_code), '[]'::jsonb) from public.catalog_game_release_controls
      where game_code in ('gundam', 'yugioh')),
    'migration_count', (select count(*) from supabase_migrations.schema_migrations
      where version = $2),
    'card_print_count', (select count(*) from public.card_prints where set_id = any($1::uuid[])),
    'legacy_card_count', (select count(*) from public.cards where set_id = any($1::uuid[])),
    'identity_count', (select count(*) from public.card_print_identity identity_row
      join public.card_prints card on card.id = identity_row.card_print_id
      where card.set_id = any($1::uuid[])),
    'printing_count', (select count(*) from public.card_printings printing
      join public.card_prints card on card.id = printing.card_print_id
      where card.set_id = any($1::uuid[])),
    'external_mapping_count', (select count(*) from public.external_mappings mapping
      join public.card_prints card on card.id = mapping.card_print_id
      where card.set_id = any($1::uuid[])),
    'external_printing_mapping_count', (select count(*)
      from public.external_printing_mappings mapping
      join public.card_printings printing on printing.id = mapping.card_printing_id
      join public.card_prints card on card.id = printing.card_print_id
      where card.set_id = any($1::uuid[])),
    'protected_counts', ${PROTECTED_COUNTS_SQL}
  ) as value`, [ids, COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION]);
  const visibility = {};
  for (const role of ["anon", "authenticated", "service_role"]) {
    visibility[role] = await roleVisibility(client, role);
  }
  const rlsVisibleSetCounts = {};
  for (const role of ["anon", "authenticated"]) {
    rlsVisibleSetCounts[role] = await rlsVisibleSetCount(client, role, ids);
  }
  return { ...rows[0].value, visibility, rls_visible_set_counts: rlsVisibleSetCounts };
}

async function executeRollbackOnly(connectionString, statements, baseline, databaseRows) {
  const client = new pg.Client(clientOptions(
    connectionString,
    "collectible-wave1-set-foundations-rollback-v1",
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
    await client.query("begin transaction isolation level repeatable read");
    proof.transaction_started = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '240s'");
    for (const statement of statements) {
      await client.query(statement);
      proof.statements_executed += 1;
    }
    proof.transient_readback = await captureTransient(client, databaseRows);
    proof.findings.push(...evaluateCollectibleWave1SetTransientV1(
      proof.transient_readback,
      [...databaseRows].sort((left, right) => left.code.localeCompare(right.code)),
    ));
    proof.findings.push(...compareCollectibleWave1ProtectedCountsV1(
      baseline.protected_counts,
      proof.transient_readback.protected_counts,
      { sets: 505 },
    ));
    if (JSON.stringify(proof.transient_readback.release_controls) !==
        JSON.stringify(baseline.release_controls)) {
      proof.findings.push("release_controls_changed");
    }
    if (proof.findings.length) throw new Error("Transient set verification failed");
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
  const findings = evaluateCollectibleWave1SetRollbackBaselineV1(after);
  findings.push(...compareCollectibleWave1ProtectedCountsV1(
    baseline?.protected_counts,
    after?.protected_counts,
  ));
  for (const field of [
    "latest_migration", "candidate_migration_count", "existing_selected_set_count",
    "existing_wave1_set_count", "planned_id_collision_count",
    "planned_code_collision_count", "planned_source_proposal_collision_count",
    "planned_game_name_collision_count", "games", "release_controls",
    "sets_release_policy", "set_unique_definitions",
  ]) {
    if (stableString(after?.[field]) !== stableString(baseline?.[field])) {
      findings.push(`baseline_changed:${field}`);
    }
  }
  return [...new Set(findings)].sort();
}

function stableString(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map(stableObject));
  return JSON.stringify(stableObject(value));
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, stableObject(nested)]));
  }
  return value;
}

async function preserveArtifacts(outDir, artifacts) {
  const bodies = {};
  for (const [name, value] of Object.entries(artifacts)) {
    bodies[name] = await writeJson(path.join(outDir, name), value);
  }
  const summary = artifacts["summary.json"];
  const report = `# Collectible Wave 1 Set Foundations Rollback V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Repository SHA: \`${summary.repository.commit_sha}\`\n` +
    `- Migration SHA-256: \`${summary.migration.sha256}\`\n` +
    `- Payload fingerprint: \`${summary.payload_fingerprint_sha256}\`\n` +
    `- Transient set inserts: \`505\`\n` +
    `- Rollback succeeded: \`${summary.rollback_succeeded}\`\n` +
    `- Durable database writes: \`0\`\n` +
    `- Findings: \`${summary.findings.length}\`\n`;
  bodies["REPORT.md"] = Buffer.from(report);
  await fs.writeFile(path.join(outDir, "REPORT.md"), report, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts: Object.entries(bodies).sort(([a], [b]) => a.localeCompare(b))
      .map(([artifactPath, body]) => ({
        artifact_path: artifactPath,
        bytes: body.length,
        sha256: sha256(body),
      })),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"),
    tracked_worktree_clean: git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== options.expectedHeadSha || !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean rollback-proof producer");
  }
  const payloadBody = await fs.readFile(PAYLOAD_PATH);
  const payloadRows = parseCollectibleWave1SetPayloadV1(payloadBody);
  const databaseRows = collectibleWave1SetDatabaseRowsV1(payloadRows);
  const migrationBody = await fs.readFile(MIGRATION_PATH, "utf8");
  if (migrationBody !== renderCollectibleWave1SetFoundationsMigrationV1(payloadRows)) {
    throw new Error("Committed migration is not the deterministic payload rendering");
  }
  const statements = splitSealedMigrationStatementsV1(
    stripSealedMigrationTransactionWrapperV1(migrationBody),
  );
  const runPlanCore = {
    version: EXECUTOR_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    payload: {
      path: path.relative(ROOT, PAYLOAD_PATH).replaceAll("\\", "/"),
      ...COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD,
      row_count: payloadRows.length,
      selected_by_game: { gundam: 5, yugioh: 500 },
    },
    migration: {
      version: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION,
      path: path.relative(ROOT, MIGRATION_PATH).replaceAll("\\", "/"),
      sha256: sha256(migrationBody),
      statement_count: statements.length,
    },
    exact_scope: {
      set_rows: 505,
      games: ["gundam", "yugioh"],
      release_status: "hidden",
      apply_version: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_VERSION,
    },
    boundaries: {
      execution_mode: "production_rollback_only",
      durable_database_writes: 0,
      migration_ledger_writes: 0,
      release_control_writes: 0,
      card_identity_printing_mapping_writes: 0,
      storage_image_pricing_publication_vault_writes: 0,
      app_visibility_enabled: false,
    },
  };
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: collectibleWave1SetProofFingerprintV1(runPlanCore),
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
      databaseRows,
      "collectible-wave1-set-foundations-baseline-v1",
    );
    const baselineFindings = evaluateCollectibleWave1SetRollbackBaselineV1(baseline);
    if (baselineFindings.length) {
      throw new Error(`Fresh baseline failed: ${baselineFindings.join(", ")}`);
    }
    try {
      transactionProof = await executeRollbackOnly(
        connectionString,
        statements,
        baseline,
        databaseRows,
      );
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
          databaseRows,
          "collectible-wave1-set-foundations-post-rollback-v1",
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
  const uniqueFindings = [...new Set(findings)].sort();
  const summary = {
    version: EXECUTOR_VERSION,
    recorded_at: new Date().toISOString(),
    status: uniqueFindings.length === 0
      ? "rollback_proof_passed_zero_durable_change"
      : "blocked",
    repository,
    payload_fingerprint_sha256:
      COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.fingerprint_sha256,
    migration: runPlan.migration,
    run_plan_fingerprint_sha256: runPlan.run_plan_fingerprint_sha256,
    statements_executed: transactionProof?.statements_executed ?? 0,
    transient_set_count: transactionProof?.transient_readback?.sets?.length ?? 0,
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
  DEFAULT_OUT,
  EXECUTOR_VERSION,
  MIGRATION_PATH,
  PAYLOAD_PATH,
  captureBaseline,
  captureTransient,
  evaluateRestoration,
  parseArgs,
  roleVisibility,
  rlsVisibleSetCount,
};
