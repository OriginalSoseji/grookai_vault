import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildSealedSchemaApplyPlanV1,
  classifyConcurrentMtgDeltaV1,
  evaluateSealedAttributableWritesV1,
  evaluateSealedSchemaReadbackV1,
  SEALED_SCHEMA_APPLY_APPROVAL_ENV,
  SEALED_SCHEMA_APPLY_VERSION,
  SEALED_SCHEMA_CANDIDATE_PATH,
  SEALED_SCHEMA_PATH,
  SEALED_SCHEMA_PLAN_PATH,
  SEALED_SCHEMA_PREFLIGHT_SUMMARY_PATH,
  sealedSchemaApplySha256V1,
  stableJsonSealedSchemaApplyV1,
  stripSealedMigrationTransactionWrapperV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs";
import {
  SEALED_PROTECTED_RELATIONS_V1,
  SEALED_TABLES_V1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_preflight_v1.mjs";
import {
  environmentFingerprint,
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_PLAN_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "cross_tcg_sealed_product_schema_apply_v1",
  "schema_apply_plan_v1",
);

function parseArgs(argv) {
  const args = {
    mode: "plan",
    envFile: path.join("C:\\grookai_vault", ".env.local"),
    outDir: DEFAULT_PLAN_DIR,
    expectedHeadSha: "",
  };
  for (const arg of argv) {
    if (arg === "--plan-only") args.mode = "plan";
    else if (arg === "--execute-schema-apply") args.mode = "execute";
    else if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (args.mode === "execute" && !/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required for execution");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? "";
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

async function readText(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), "utf8");
}

async function loadFrozenInputs() {
  const [migrationSql, candidateSql, preflightText] = await Promise.all([
    readText(SEALED_SCHEMA_PATH),
    readText(SEALED_SCHEMA_CANDIDATE_PATH),
    readText(SEALED_SCHEMA_PREFLIGHT_SUMMARY_PATH),
  ]);
  if (!Buffer.from(migrationSql).equals(Buffer.from(candidateSql))) {
    throw new Error("Checked-in migration is not byte-identical to the candidate");
  }
  const preflightSummary = JSON.parse(preflightText);
  const plan = buildSealedSchemaApplyPlanV1({ migrationSql, preflightSummary });
  return { migrationSql, candidateSql, preflightSummary, plan };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function planReport(plan) {
  return `# Cross-TCG Sealed Product Schema Apply Plan V1\n\n` +
    `- Status: **FROZEN / NOT EXECUTED**\n` +
    `- Migration: \`${plan.migration_version}_${plan.migration_name}.sql\`\n` +
    `- Migration SHA-256: \`${plan.migration_sha256}\`\n` +
    `- Preflight fingerprint: \`${plan.preflight_fingerprint_sha256}\`\n` +
    `- Migration-plan fingerprint: \`${plan.migration_plan_fingerprint_sha256}\`\n` +
    `- Apply-plan fingerprint: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
    `- Ledger fingerprint: \`${plan.ledger_fingerprint_sha256}\`\n` +
    `- Ledger statements: \`${plan.ledger_statement_count}\`\n` +
    `- Sealed tables: \`${plan.inventory.tables.length}\`\n` +
    `- Sealed data rows authorized: \`0\`\n\n` +
    `## Boundary\n\n` +
    `This gate authorizes only one atomic schema migration and its exact migration-ledger row. ` +
    `It authorizes no sealed data, canonical/card/Vault/pricing/MTG rows, Storage, app access, ` +
    `publication, or deployment. The writer is fail-closed and has no global db-push path.\n\n` +
    `## Guard Token\n\n\`\`\`text\n${plan.guard_token}\n\`\`\`\n`;
}

async function writePlanArtifacts({ plan, outDir }) {
  await fs.mkdir(outDir, { recursive: true });
  const planBody = await writeJson(path.join(outDir, "plan.json"), plan);
  const reportBody = planReport(plan);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  const boundFiles = [
    SEALED_SCHEMA_PATH,
    SEALED_SCHEMA_CANDIDATE_PATH,
    SEALED_SCHEMA_PREFLIGHT_SUMMARY_PATH,
    "backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs",
    "scripts/audits/cross_tcg_sealed_product_schema_apply_v1.mjs",
  ];
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "plan.json", bytes: Buffer.byteLength(planBody),
        sha256: sealedSchemaApplySha256V1(planBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sealedSchemaApplySha256V1(reportBody) },
    ],
    bound_inputs: await Promise.all(boundFiles.map(async (entry) => {
      const content = await fs.readFile(path.join(ROOT, entry));
      return { path: entry, bytes: content.length,
        sha256: sealedSchemaApplySha256V1(content) };
    })),
  });
}

async function queryRows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

async function captureProtectedSchemaContract(client) {
  const values = [SEALED_PROTECTED_RELATIONS_V1];
  const relations = await queryRows(client, `
    with expected(relation_name) as (select unnest($1::text[]))
    select expected.relation_name,
           relation.oid is not null as present,
           relation.relkind as relation_kind,
           coalesce(relation.relrowsecurity, false) as rls_enabled,
           coalesce(relation.relforcerowsecurity, false) as rls_forced
      from expected
      left join pg_namespace namespace on namespace.nspname = 'public'
      left join pg_class relation
        on relation.relnamespace = namespace.oid
       and relation.relname = expected.relation_name
     order by expected.relation_name`, values);
  const columns = await queryRows(client, `
    select table_name, column_name, data_type, udt_name, is_nullable
      from information_schema.columns
     where table_schema = 'public' and table_name = any($1::text[])
     order by table_name, ordinal_position`, values);
  const constraints = await queryRows(client, `
    select relation.relname as table_name, constraint_row.conname,
           constraint_row.contype,
           pg_get_constraintdef(constraint_row.oid) as definition
      from pg_constraint constraint_row
      join pg_class relation on relation.oid = constraint_row.conrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public'
       and relation.relname = any($1::text[])
     order by relation.relname, constraint_row.conname`, values);
  const indexes = await queryRows(client, `
    select tablename as table_name, indexname, indexdef
      from pg_indexes
     where schemaname = 'public' and tablename = any($1::text[])
     order by tablename, indexname`, values);
  const grants = await queryRows(client, `
    select table_name, grantee, privilege_type, is_grantable
      from information_schema.role_table_grants
     where table_schema = 'public' and table_name = any($1::text[])
       and grantee = any(array['anon', 'authenticated', 'service_role'])
     order by table_name, grantee, privilege_type`, values);
  return { relations, columns, constraints, indexes, grants };
}

async function captureMtgState(client) {
  return (await client.query(`select
    (select count(*)::integer from public.games where code = 'mtg') as game_count,
    (select count(*)::integer from public.sets where game = 'mtg') as set_count,
    (select count(*)::integer from public.card_prints card
      join public.games game on game.id = card.game_id where game.code = 'mtg') as card_count,
    (select count(*)::integer from public.card_printings printing
      join public.card_prints card on card.id = printing.card_print_id
      join public.games game on game.id = card.game_id where game.code = 'mtg') as printing_count,
    (select count(*)::integer from public.mtg_canonical_import_batches) as import_batch_count,
    (select count(*)::integer from public.mtg_canonical_import_rows) as import_row_count,
    (select release_status from public.catalog_game_release_controls
      where game_code = 'mtg') as release_status`)).rows[0];
}

async function captureProtectedCounts(client) {
  return (await client.query(`select jsonb_build_object(
    'card_prints', (select count(*) from public.card_prints),
    'card_printings', (select count(*) from public.card_printings),
    'vault_item_instances', (select count(*) from public.vault_item_instances),
    'vault_owners', (select count(*) from public.vault_owners),
    'market_price_pipeline_runs', (select count(*) from public.market_price_pipeline_runs),
    'market_price_publication_sets', (select count(*) from public.market_price_publication_sets),
    'market_price_current_publication', (select count(*) from public.market_price_current_publication),
    'market_price_publication_snapshots', (select count(*) from public.market_price_publication_snapshots),
    'market_price_qualification_decisions', (select count(*) from public.market_price_qualification_decisions),
    'catalog_game_release_controls', (select count(*) from public.catalog_game_release_controls),
    'games', (select count(*) from public.games),
    'sets', (select count(*) from public.sets),
    'mtg_canonical_import_batches', (select count(*) from public.mtg_canonical_import_batches),
    'mtg_canonical_import_rows', (select count(*) from public.mtg_canonical_import_rows)
  ) as value`)).rows[0].value;
}

async function captureSealedTables(client) {
  const metadata = await queryRows(client, `
    select relation.relname as table_name,
           pg_get_userbyid(relation.relowner) as owner_name,
           relation.relrowsecurity as rls_enabled,
           relation.relforcerowsecurity as rls_forced
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public'
       and relation.relname = any($1::text[])
       and relation.relkind in ('r', 'p')
     order by relation.relname`, [SEALED_TABLES_V1]);
  const counts = new Map();
  for (const table of SEALED_TABLES_V1) {
    const result = await client.query(`select count(*)::integer as value from public.${table}`);
    counts.set(table, result.rows[0].value);
  }
  return metadata.map((row) => ({ ...row, row_count: counts.get(row.table_name) }));
}

export async function captureSealedSchemaReadbackV1(client, {
  transactionClosedBeforeArtifacts = false,
} = {}) {
  const tables = await captureSealedTables(client);
  const constraints = await queryRows(client, `
    select relation.relname as table_name, constraint_row.conname as constraint_name,
           constraint_row.contype as constraint_type,
           constraint_row.convalidated as validated,
           pg_get_constraintdef(constraint_row.oid, true) as definition
      from pg_constraint constraint_row
      join pg_class relation on relation.oid = constraint_row.conrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public' and relation.relname = any($1::text[])
     order by relation.relname, constraint_row.conname`, [SEALED_TABLES_V1]);
  const indexes = await queryRows(client, `
    select tablename as table_name, indexname as index_name, indexdef as definition
      from pg_indexes
     where schemaname = 'public' and tablename = any($1::text[])
     order by tablename, indexname`, [SEALED_TABLES_V1]);
  const functions = await queryRows(client, `
    select procedure.proname || '(' ||
             replace(oidvectortypes(procedure.proargtypes), ', ', ',') || ')'
             as signature,
           procedure.proname as function_name,
           pg_get_userbyid(procedure.proowner) as owner_name,
           language.lanname as language_name,
           procedure.prosecdef as security_definer,
           procedure.provolatile as volatility,
           coalesce(procedure.proconfig, array[]::text[]) as configuration,
           pg_get_function_result(procedure.oid) as result_type,
           procedure.prosrc as source
      from pg_proc procedure
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      join pg_language language on language.oid = procedure.prolang
     where namespace.nspname = 'public'
       and procedure.proname = any($1::text[])
     order by signature`, [
    [
      "sealed_product_reject_row_mutation_v1",
      "sealed_product_guard_release_mutation_v1",
      "sealed_product_guard_release_member_insert_v1",
      "sealed_product_freeze_release_v1",
      "sealed_product_set_active_release_v1",
    ],
  ]);
  const triggers = await queryRows(client, `
    select relation.relname as table_name, trigger.tgname as trigger_name,
           pg_get_triggerdef(trigger.oid, true) as definition
      from pg_trigger trigger
      join pg_class relation on relation.oid = trigger.tgrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public'
       and relation.relname = any($1::text[])
       and not trigger.tgisinternal
     order by relation.relname, trigger.tgname`, [SEALED_TABLES_V1]);
  const policies = await queryRows(client, `
    select tablename as table_name, policyname as policy_name,
           permissive, roles::text, cmd as command,
           qual as using_expression, with_check as check_expression
      from pg_policies
     where schemaname = 'public' and tablename = any($1::text[])
     order by tablename, policyname`, [SEALED_TABLES_V1]);
  const tableGrants = await queryRows(client, `
    select table_name, grantee, privilege_type, is_grantable
      from information_schema.role_table_grants
     where table_schema = 'public' and table_name = any($1::text[])
       and grantee = any(array['PUBLIC', 'anon', 'authenticated', 'service_role'])
     order by table_name, grantee, privilege_type`, [SEALED_TABLES_V1]);
  const routineGrants = await queryRows(client, `
    select routine_name, grantee, privilege_type, is_grantable
      from information_schema.role_routine_grants
     where specific_schema = 'public'
       and routine_name = any($1::text[])
       and grantee = any(array['PUBLIC', 'anon', 'authenticated', 'service_role'])
     order by routine_name, grantee, privilege_type`, [
    [
      "sealed_product_reject_row_mutation_v1",
      "sealed_product_guard_release_mutation_v1",
      "sealed_product_guard_release_member_insert_v1",
      "sealed_product_freeze_release_v1",
      "sealed_product_set_active_release_v1",
    ],
  ]);
  const appRolePrivileges = await queryRows(client, `
    select roles.role_name, tables.table_name,
           has_table_privilege(roles.role_name, 'public.' || quote_ident(tables.table_name),
             'SELECT,INSERT,UPDATE,DELETE') as has_any_privilege
      from unnest(array['anon', 'authenticated']) as roles(role_name)
      cross join unnest($1::text[]) as tables(table_name)
     order by roles.role_name, tables.table_name`, [SEALED_TABLES_V1]);
  const migrationLedger = await queryRows(client, `
    select version, name, statements
      from supabase_migrations.schema_migrations
     where version = $1`, ["20260814060000"]);
  const protectedSchema = await captureProtectedSchemaContract(client);
  const mtg = await captureMtgState(client);
  const transactionReadOnly = (await client.query("show transaction_read_only"))
    .rows[0].transaction_read_only;
  return {
    transaction_read_only: transactionReadOnly,
    transaction_closed_before_artifacts: transactionClosedBeforeArtifacts,
    tables,
    constraints,
    indexes,
    functions,
    triggers,
    policies,
    table_grants: tableGrants,
    routine_grants: routineGrants,
    app_role_privileges: appRolePrivileges,
    migration_ledger: migrationLedger,
    protected_schema_contract: protectedSchema,
    protected_schema_fingerprint_sha256: sealedSchemaApplySha256V1(
      stableJsonSealedSchemaApplyV1(protectedSchema),
    ),
    mtg,
  };
}

async function captureAttributableProtectedWrites(client) {
  return queryRows(client, `
    select relation.relname as table_name,
           coalesce(stat.n_tup_ins, 0)::bigint as inserted,
           coalesce(stat.n_tup_upd, 0)::bigint as updated,
           coalesce(stat.n_tup_del, 0)::bigint as deleted,
           coalesce(stat.n_tup_hot_upd, 0)::bigint as hot_updated
      from unnest($1::text[]) expected(table_name)
      join pg_namespace namespace on namespace.nspname = 'public'
      join pg_class relation
        on relation.relnamespace = namespace.oid
       and relation.relname = expected.table_name
      left join pg_stat_xact_user_tables stat on stat.relid = relation.oid
     order by relation.relname`, [SEALED_PROTECTED_RELATIONS_V1]);
}

function assertExecutionLocal(args, plan) {
  const branch = git("branch", "--show-current");
  const headSha = git("rev-parse", "HEAD");
  const trackedStatus = git("status", "--porcelain", "--untracked-files=no");
  if (branch !== "agent/sealed-catalog-readiness-v1") {
    throw new Error(`Unexpected branch: ${branch}`);
  }
  if (headSha !== args.expectedHeadSha) {
    throw new Error(`HEAD ${headSha} does not match ${args.expectedHeadSha}`);
  }
  if (trackedStatus !== "") throw new Error("Tracked worktree must be clean");
  if (process.env[SEALED_SCHEMA_APPLY_APPROVAL_ENV] !== plan.guard_token) {
    throw new Error(`Exact guard token missing from ${SEALED_SCHEMA_APPLY_APPROVAL_ENV}`);
  }
  return { branch, head_sha: headSha, tracked_worktree_clean: true };
}

async function captureFreshReadOnly(connectionString) {
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "sealed-product-schema-post-apply-fresh-readback-v1",
  });
  await client.connect();
  let result;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin read only");
    result = await captureSealedSchemaReadbackV1(client);
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  result.transaction_closed_before_artifacts = true;
  return result;
}

async function executeSchemaApply({ args, inputs, connectionString }) {
  const local = assertExecutionLocal(args, inputs.plan);
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "cross-tcg-sealed-product-schema-apply-v1",
  });
  await client.connect();
  let committed = false;
  let before;
  let inside;
  let attributableWrites;
  try {
    const collision = await client.query(`select
      (select count(*) from pg_class relation join pg_namespace namespace
        on namespace.oid = relation.relnamespace
        where namespace.nspname = 'public' and relation.relname = any($1::text[]))::integer
          as sealed_relation_count,
      (select count(*) from supabase_migrations.schema_migrations
        where version = $2)::integer as ledger_count`,
    [SEALED_TABLES_V1, inputs.plan.migration_version]);
    if (Number(collision.rows[0].sealed_relation_count) !== 0 ||
        Number(collision.rows[0].ledger_count) !== 0) {
      throw new Error("Sealed schema or ledger collision appeared after preflight");
    }
    before = {
      protected_counts: await captureProtectedCounts(client),
      mtg: await captureMtgState(client),
      protected_schema: await captureProtectedSchemaContract(client),
    };
    if (sealedSchemaApplySha256V1(stableJsonSealedSchemaApplyV1(
      before.protected_schema)) !== inputs.plan.protected_schema_fingerprint_sha256) {
      throw new Error("Protected schema changed after the frozen preflight");
    }

    await client.query("begin");
    try {
      await client.query(`set local lock_timeout = '${inputs.plan.timeouts.lock_timeout}'`);
      await client.query(
        `set local statement_timeout = '${inputs.plan.timeouts.statement_timeout}'`,
      );
      await client.query(
        `set local idle_in_transaction_session_timeout = ` +
          `'${inputs.plan.timeouts.idle_in_transaction_session_timeout}'`,
      );
      await client.query(stripSealedMigrationTransactionWrapperV1(inputs.migrationSql));
      await client.query(`insert into supabase_migrations.schema_migrations
        (version, statements, name) values ($1, $2::text[], $3)`, [
        inputs.plan.ledger_row.version,
        inputs.plan.ledger_row.statements,
        inputs.plan.ledger_row.name,
      ]);

      inside = await captureSealedSchemaReadbackV1(client);
      const insideFindings = evaluateSealedSchemaReadbackV1({
        plan: inputs.plan,
        readback: inside,
        requireReadOnly: false,
        requireClosed: false,
      });
      attributableWrites = await captureAttributableProtectedWrites(client);
      const writeFindings = evaluateSealedAttributableWritesV1(attributableWrites);
      const findings = [...insideFindings, ...writeFindings];
      if (findings.length) {
        throw new Error(`Inside-transaction verification failed: ${findings.join(",")}`);
      }
      await client.query("commit");
      committed = true;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }

  if (!committed) throw new Error("Schema transaction did not commit");
  const postApply = await captureFreshReadOnly(connectionString);
  const findings = evaluateSealedSchemaReadbackV1({ plan: inputs.plan, readback: postApply });
  if (findings.length) {
    throw new Error(`Fresh post-apply verification failed: ${findings.join(",")}`);
  }
  const mtgDelta = classifyConcurrentMtgDeltaV1(before.mtg, postApply.mtg);
  if (!mtgDelta.nondecreasing || mtgDelta.release_status_after !== "hidden") {
    throw new Error("Concurrent MTG state crossed its hidden/nondecreasing boundary");
  }
  return {
    status: "schema_only_applied_and_fresh_readback_passed",
    local,
    environment: environmentFingerprint(connectionString, "production-schema-only"),
    plan_fingerprint_sha256: inputs.plan.apply_plan_fingerprint_sha256,
    migration_sha256: inputs.plan.migration_sha256,
    committed,
    attributable_protected_writes: attributableWrites,
    protected_write_findings: [],
    protected_counts_before: before.protected_counts,
    protected_schema_before: before.protected_schema,
    inside_transaction_readback: inside,
    fresh_post_apply_readback: postApply,
    concurrent_mtg_progress: mtgDelta,
    boundaries: {
      sealed_data_rows_written: 0,
      protected_table_dml_attributable_to_execution: 0,
      app_access_enabled: false,
      storage_or_publication: false,
      deployment: false,
    },
  };
}

async function writeExecutionArtifacts({ result, outDir }) {
  await fs.mkdir(outDir, { recursive: true });
  const summary = {
    version: SEALED_SCHEMA_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    ...result,
  };
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), summary);
  const readbackBody = await writeJson(
    path.join(outDir, "fresh_post_apply_readback.json"),
    result.fresh_post_apply_readback,
  );
  const reportBody = `# Cross-TCG Sealed Product Schema Apply V1\n\n` +
    `- Status: **PASS**\n` +
    `- Producing commit: \`${result.local.head_sha}\`\n` +
    `- Migration SHA-256: \`${result.migration_sha256}\`\n` +
    `- Sealed data rows: \`0\`\n` +
    `- Attributable protected-table writes: \`0\`\n` +
    `- App access/publication: \`false\`\n` +
    `- Concurrent MTG attribution: \`${result.concurrent_mtg_progress.attribution}\`\n`;
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "summary.json", bytes: Buffer.byteLength(summaryBody),
        sha256: sealedSchemaApplySha256V1(summaryBody) },
      { path: "fresh_post_apply_readback.json", bytes: Buffer.byteLength(readbackBody),
        sha256: sealedSchemaApplySha256V1(readbackBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sealedSchemaApplySha256V1(reportBody) },
    ],
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputs = await loadFrozenInputs();
  if (args.mode === "plan") {
    await writePlanArtifacts({ plan: inputs.plan, outDir: args.outDir });
    process.stdout.write(`${JSON.stringify({
      status: "frozen_plan_written_no_database_access",
      plan_path: relative(path.join(args.outDir, "plan.json")),
      migration_sha256: inputs.plan.migration_sha256,
      apply_plan_fingerprint_sha256: inputs.plan.apply_plan_fingerprint_sha256,
      guard_token: inputs.plan.guard_token,
    }, null, 2)}\n`);
    return;
  }

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error("Production database URL is missing");
  const checkedInPlan = JSON.parse(await readText(SEALED_SCHEMA_PLAN_PATH));
  if (stableJsonSealedSchemaApplyV1(checkedInPlan) !==
      stableJsonSealedSchemaApplyV1(inputs.plan)) {
    throw new Error("Checked-in apply plan is not the exact regenerated plan");
  }
  const result = await executeSchemaApply({ args, inputs, connectionString });
  await writeExecutionArtifacts({ result, outDir: args.outDir });
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    producing_commit_sha: result.local.head_sha,
    output_dir: args.outDir,
  }, null, 2)}\n`);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
