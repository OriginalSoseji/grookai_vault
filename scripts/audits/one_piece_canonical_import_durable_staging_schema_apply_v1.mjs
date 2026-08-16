import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildOnePieceSchemaApplyPlanV1,
  classifyOnePieceConcurrentMtgDeltaV1,
  evaluateOnePieceAttributableWritesV1,
  evaluateOnePieceSchemaReadbackV1,
  ONE_PIECE_SCHEMA_APPLY_APPROVAL_ENV,
  ONE_PIECE_SCHEMA_APPLY_EXPECTED,
  ONE_PIECE_SCHEMA_APPLY_VERSION,
  ONE_PIECE_SCHEMA_CANDIDATE_PATH,
  ONE_PIECE_SCHEMA_PATH,
  ONE_PIECE_SCHEMA_PLAN_PATH,
  ONE_PIECE_SCHEMA_PREFLIGHT_SUMMARY_PATH,
  splitMigrationStatementsV1,
  stripMigrationTransactionWrapperV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME,
  ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
  sha256OnePiecePreflightV1,
  stableJsonOnePiecePreflightV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_preflight_v1.mjs";
import {
  environmentFingerprint,
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_PLAN_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_staging_schema_apply_v1",
  "schema_apply_plan_v1");

function parseArgs(argv) {
  const args = {
    mode: "plan",
    envFile: "C:\\grookai_vault\\.env.local",
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
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? "";
}

function rootPath(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

async function readText(relativePath) {
  return fs.readFile(rootPath(relativePath), "utf8");
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function loadFrozenInputs() {
  const [migrationSql, candidateSql, preflightText] = await Promise.all([
    readText(ONE_PIECE_SCHEMA_PATH),
    readText(ONE_PIECE_SCHEMA_CANDIDATE_PATH),
    readText(ONE_PIECE_SCHEMA_PREFLIGHT_SUMMARY_PATH),
  ]);
  if (!Buffer.from(migrationSql).equals(Buffer.from(candidateSql))) {
    throw new Error("Checked-in migration is not byte-identical to its candidate");
  }
  const preflightSummary = JSON.parse(preflightText);
  const plan = buildOnePieceSchemaApplyPlanV1({ migrationSql, preflightSummary });
  return { migrationSql, candidateSql, preflightSummary, plan };
}

function planReport(plan) {
  return `# One Piece Durable Staging Schema Apply Plan V1\n\n` +
    `- Status: **FROZEN / NOT EXECUTED**\n` +
    `- Migration: \`${plan.migration_version}_${plan.migration_name}.sql\`\n` +
    `- Migration SHA-256: \`${plan.migration_sha256}\`\n` +
    `- Preflight fingerprint: \`${plan.preflight_fingerprint_sha256}\`\n` +
    `- Apply-plan fingerprint: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
    `- Ledger fingerprint: \`${plan.ledger_fingerprint_sha256}\`\n` +
    `- Ledger statements: \`${plan.ledger_statement_count}\`\n` +
    `- Tables: \`${plan.inventory.tables.length}\`\n` +
    `- One Piece staging rows authorized: \`0\`\n\n` +
    `## Boundary\n\nOnly the exact schema and ledger row are authorized. ` +
    `No One Piece payload, canonical, pricing, sealed, Vault, Storage, ` +
    `publication, deployment, or app-visible write is authorized.\n\n` +
    `## Guard Token\n\n\`\`\`text\n${plan.guard_token}\n\`\`\`\n`;
}

async function writePlanArtifacts({ plan, outDir }) {
  await fs.mkdir(outDir, { recursive: true });
  const planBody = await writeJson(path.join(outDir, "plan.json"), plan);
  const reportBody = planReport(plan);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  const boundFiles = [
    ONE_PIECE_SCHEMA_PATH,
    ONE_PIECE_SCHEMA_CANDIDATE_PATH,
    ONE_PIECE_SCHEMA_PREFLIGHT_SUMMARY_PATH,
    "backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs",
    "scripts/audits/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs",
  ];
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "plan.json", bytes: Buffer.byteLength(planBody),
        sha256: sha256OnePiecePreflightV1(planBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sha256OnePiecePreflightV1(reportBody) },
    ],
    bound_inputs: await Promise.all(boundFiles.map(async (entry) => {
      const content = await fs.readFile(rootPath(entry));
      return { path: entry, bytes: content.length,
        sha256: sha256OnePiecePreflightV1(content) };
    })),
  });
}

async function queryRows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

async function captureProtectedSchemaContract(client) {
  const relations = await queryRows(client, `with expected(relation_name) as
    (select unnest($1::text[])) select expected.relation_name,
    relation.oid is not null as present, relation.relkind,
    coalesce(relation.relrowsecurity,false) as rls_enabled,
    coalesce(relation.relforcerowsecurity,false) as rls_forced
    from expected left join pg_namespace n on n.nspname='public'
    left join pg_class relation on relation.relnamespace=n.oid
      and relation.relname=expected.relation_name
    order by expected.relation_name`, [ONE_PIECE_SCHEMA_APPLY_EXPECTED.protected_relations]);
  const grants = await queryRows(client, `select table_name, grantee,
    privilege_type from information_schema.role_table_grants
    where table_schema='public' and table_name=any($1::text[])
      and grantee=any(array['anon','authenticated','service_role'])
    order by table_name,grantee,privilege_type`,
  [ONE_PIECE_SCHEMA_APPLY_EXPECTED.protected_relations]);
  return { relations, grants };
}

async function captureMtgState(client) {
  return (await client.query(`select
    (select count(*)::integer from public.games where code='mtg') as game_count,
    (select count(*)::integer from public.sets where game='mtg') as set_count,
    (select count(*)::integer from public.card_prints c join public.games g
      on g.id=c.game_id where g.code='mtg') as card_count,
    (select count(*)::integer from public.card_printings p
      join public.card_prints c on c.id=p.card_print_id
      join public.games g on g.id=c.game_id where g.code='mtg') as printing_count,
    (select count(*)::integer from public.mtg_canonical_import_batches)
      as import_batch_count,
    (select count(*)::integer from public.mtg_canonical_import_rows)
      as import_row_count,
    (select release_status from public.catalog_game_release_controls
      where game_code='mtg') as release_status`)).rows[0];
}

async function captureProtectedCounts(client) {
  const counts = {};
  for (const table of ONE_PIECE_SCHEMA_APPLY_EXPECTED.protected_relations) {
    counts[table] = Number((await client.query(
      `select count(*)::integer as value from public.${table}`)).rows[0].value);
  }
  return counts;
}

async function captureTables(client) {
  const metadata = await queryRows(client, `select relation.relname as table_name,
    pg_get_userbyid(relation.relowner) as owner_name,
    relation.relrowsecurity as rls_enabled,
    relation.relforcerowsecurity as rls_forced
    from pg_class relation join pg_namespace n on n.oid=relation.relnamespace
    where n.nspname='public' and relation.relname=any($1::text[])
      and relation.relkind in ('r','p') order by relation.relname`,
  [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const counts = new Map();
  for (const table of ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables) {
    counts.set(table, Number((await client.query(
      `select count(*)::integer as value from public.${table}`)).rows[0].value));
  }
  return metadata.map((row) => ({ ...row, row_count: counts.get(row.table_name) }));
}

export async function captureOnePieceSchemaReadbackV1(client, {
  transactionClosedBeforeArtifacts = false,
} = {}) {
  const tables = await captureTables(client);
  const constraints = await queryRows(client, `select relation.relname as table_name,
    c.conname as constraint_name, c.contype as constraint_type,
    c.convalidated as validated, pg_get_constraintdef(c.oid,true) as definition
    from pg_constraint c join pg_class relation on relation.oid=c.conrelid
    join pg_namespace n on n.oid=relation.relnamespace
    where n.nspname='public' and relation.relname=any($1::text[])
    order by relation.relname,c.conname`, [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const indexes = await queryRows(client, `select table_row.relname as table_name,
    index_row.relname as index_name, index_meta.indisunique as is_unique,
    index_meta.indisprimary as is_primary, pg_get_indexdef(index_row.oid) as definition
    from pg_index index_meta join pg_class index_row on index_row.oid=index_meta.indexrelid
    join pg_class table_row on table_row.oid=index_meta.indrelid
    join pg_namespace n on n.oid=table_row.relnamespace
    where n.nspname='public' and table_row.relname=any($1::text[])
    order by table_row.relname,index_row.relname`, [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const functions = await queryRows(client, `select procedure.proname || '(' ||
    replace(oidvectortypes(procedure.proargtypes),', ',',') || ')' as signature,
    procedure.prosecdef as security_definer,
    coalesce(procedure.proconfig,array[]::text[]) as configuration,
    pg_get_function_result(procedure.oid) as result_type,
    procedure.prosrc as source
    from pg_proc procedure join pg_namespace n on n.oid=procedure.pronamespace
    where n.nspname='public' and procedure.proname=$1 order by signature`,
  ["one_piece_canonical_import_reject_mutation_v1"]);
  const triggers = await queryRows(client, `select relation.relname as table_name,
    trigger.tgname as trigger_name, pg_get_triggerdef(trigger.oid,true) as definition
    from pg_trigger trigger join pg_class relation on relation.oid=trigger.tgrelid
    join pg_namespace n on n.oid=relation.relnamespace
    where n.nspname='public' and relation.relname=any($1::text[])
      and not trigger.tgisinternal order by relation.relname,trigger.tgname`,
  [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const policies = await queryRows(client, `select tablename as table_name,
    policyname as policy_name, roles::text, cmd as command,
    qual as using_expression, with_check as check_expression
    from pg_policies where schemaname='public' and tablename=any($1::text[])
    order by tablename,policyname`, [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const tableGrants = await queryRows(client, `select table_name,grantee,privilege_type,
    is_grantable from information_schema.role_table_grants
    where table_schema='public' and table_name=any($1::text[])
      and grantee=any(array['PUBLIC','anon','authenticated','service_role'])
    order by table_name,grantee,privilege_type`, [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const routineGrants = await queryRows(client, `select routine_name,grantee,
    privilege_type,is_grantable from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name='one_piece_canonical_import_reject_mutation_v1'
      and grantee=any(array['PUBLIC','anon','authenticated','service_role'])
    order by routine_name,grantee,privilege_type`);
  const appRolePrivileges = await queryRows(client, `select roles.role_name,
    tables.table_name, has_table_privilege(roles.role_name,
      'public.'||quote_ident(tables.table_name),'SELECT,INSERT,UPDATE,DELETE')
      as has_any_privilege
    from unnest(array['anon','authenticated']) roles(role_name)
    cross join unnest($1::text[]) tables(table_name)
    order by roles.role_name,tables.table_name`, [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const serviceRoleEffective = await queryRows(client, `select tables.table_name,
    has_table_privilege('service_role','public.'||quote_ident(tables.table_name),'SELECT')
      as has_select,
    has_table_privilege('service_role','public.'||quote_ident(tables.table_name),'INSERT')
      as has_insert,
    has_table_privilege('service_role','public.'||quote_ident(tables.table_name),'UPDATE')
      as has_update,
    has_table_privilege('service_role','public.'||quote_ident(tables.table_name),'DELETE')
      as has_delete,
    has_table_privilege('service_role','public.'||quote_ident(tables.table_name),'TRUNCATE')
      as has_truncate,
    has_table_privilege('service_role','public.'||quote_ident(tables.table_name),'REFERENCES')
      as has_references,
    has_table_privilege('service_role','public.'||quote_ident(tables.table_name),'TRIGGER')
      as has_trigger
    from unnest($1::text[]) tables(table_name) order by tables.table_name`,
  [ONE_PIECE_SCHEMA_APPLY_EXPECTED.tables]);
  const effectiveFunctions = await queryRows(client, `select roles.role_name,
    procedure.proname || '(' || replace(oidvectortypes(procedure.proargtypes),', ',',') || ')'
      as signature, has_function_privilege(roles.role_name,procedure.oid,'EXECUTE')
      as has_execute
    from unnest(array['anon','authenticated','service_role']) roles(role_name)
    cross join pg_proc procedure join pg_namespace n on n.oid=procedure.pronamespace
    where n.nspname='public'
      and procedure.proname='one_piece_canonical_import_reject_mutation_v1'
    order by roles.role_name,signature`);
  const migrationLedger = await queryRows(client, `select version,name,statements
    from supabase_migrations.schema_migrations where version=$1`,
  [ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION]);
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
    service_role_effective_table_privileges: serviceRoleEffective,
    effective_function_privileges: effectiveFunctions,
    migration_ledger: migrationLedger,
    protected_schema_contract: protectedSchema,
    protected_schema_fingerprint_sha256: sha256OnePiecePreflightV1(
      stableJsonOnePiecePreflightV1(protectedSchema)),
    mtg,
  };
}

async function captureAttributableProtectedWrites(client) {
  return queryRows(client, `select relation.relname as table_name,
    coalesce(stat.n_tup_ins,0)::bigint as inserted,
    coalesce(stat.n_tup_upd,0)::bigint as updated,
    coalesce(stat.n_tup_del,0)::bigint as deleted,
    coalesce(stat.n_tup_hot_upd,0)::bigint as hot_updated
    from unnest($1::text[]) expected(table_name)
    join pg_namespace n on n.nspname='public'
    join pg_class relation on relation.relnamespace=n.oid
      and relation.relname=expected.table_name
    left join pg_stat_xact_user_tables stat on stat.relid=relation.oid
    order by relation.relname`, [ONE_PIECE_SCHEMA_APPLY_EXPECTED.protected_relations]);
}

async function captureCollisionState(client, plan) {
  const tablesAndIndexes = await queryRows(client, `select c.relname as object_name
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`, [[
    ...plan.inventory.tables,
    ...plan.inventory.required_indexes,
  ]]);
  const functions = await queryRows(client, `select p.proname as object_name
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='one_piece_canonical_import_reject_mutation_v1'`);
  const policies = await queryRows(client, `select policyname as object_name
    from pg_policies where schemaname='public'
      and policyname=any($1::text[])`,
  [plan.inventory.policies.map((row) => row.policy_name)]);
  const triggers = await queryRows(client, `select tgname as object_name
    from pg_trigger where not tgisinternal and tgname=any($1::text[])`,
  [plan.inventory.triggers]);
  const ledger = (await client.query(`select
    count(*) filter (where version=$1)::integer as version_rows,
    count(*) filter (where name=$2)::integer as name_rows,
    count(*) filter (where version>$1)::integer as later_rows
    from supabase_migrations.schema_migrations`,
  [plan.migration_version, plan.migration_name])).rows[0];
  return { tables_and_indexes: tablesAndIndexes, functions, policies, triggers, ledger };
}

function assertNoCollisions(state) {
  const count = state.tables_and_indexes.length + state.functions.length +
    state.policies.length + state.triggers.length +
    Number(state.ledger.version_rows) + Number(state.ledger.name_rows) +
    Number(state.ledger.later_rows);
  if (count !== 0) {
    throw new Error(`One Piece schema collision appeared after preflight: ${JSON.stringify(state)}`);
  }
}

function assertExecutionLocal(args, plan) {
  const branch = git("branch", "--show-current");
  const headSha = git("rev-parse", "HEAD");
  const trackedStatus = git("status", "--porcelain", "--untracked-files=no");
  if (branch !== "agent/one-piece-ingestion-readiness-v1") {
    throw new Error(`Unexpected branch: ${branch}`);
  }
  if (headSha !== args.expectedHeadSha) {
    throw new Error(`HEAD ${headSha} does not match ${args.expectedHeadSha}`);
  }
  if (trackedStatus !== "") throw new Error("Tracked worktree must be clean");
  if (process.env[ONE_PIECE_SCHEMA_APPLY_APPROVAL_ENV] !== plan.guard_token) {
    throw new Error(`Exact guard token missing from ${ONE_PIECE_SCHEMA_APPLY_APPROVAL_ENV}`);
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
    application_name: "one-piece-schema-post-apply-readback-v1",
  });
  await client.connect();
  let readback;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin read only");
    readback = await captureOnePieceSchemaReadbackV1(client);
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  readback.transaction_closed_before_artifacts = true;
  return readback;
}

async function executeSchemaApply({ args, inputs, connectionString }) {
  const local = assertExecutionLocal(args, inputs.plan);
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "one-piece-durable-staging-schema-apply-v1",
  });
  await client.connect();
  let committed = false;
  let before;
  let inside;
  let attributableWrites;
  let collisionState;
  try {
    collisionState = await captureCollisionState(client, inputs.plan);
    assertNoCollisions(collisionState);
    before = {
      protected_counts: await captureProtectedCounts(client),
      mtg: await captureMtgState(client),
      protected_schema: await captureProtectedSchemaContract(client),
    };
    if (sha256OnePiecePreflightV1(stableJsonOnePiecePreflightV1(
      before.protected_schema)) !== inputs.plan.protected_schema_fingerprint_sha256) {
      throw new Error("Protected schema changed after frozen preflight");
    }
    await client.query("begin");
    try {
      await client.query(`set local lock_timeout='${inputs.plan.timeouts.lock_timeout}'`);
      await client.query(
        `set local statement_timeout='${inputs.plan.timeouts.statement_timeout}'`);
      await client.query(`set local idle_in_transaction_session_timeout=` +
        `'${inputs.plan.timeouts.idle_in_transaction_session_timeout}'`);
      await client.query(stripMigrationTransactionWrapperV1(inputs.migrationSql));
      await client.query(`insert into supabase_migrations.schema_migrations
        (version,statements,name) values ($1,$2::text[],$3)`, [
        inputs.plan.ledger_row.version,
        inputs.plan.ledger_row.statements,
        inputs.plan.ledger_row.name,
      ]);
      inside = await captureOnePieceSchemaReadbackV1(client);
      const insideFindings = evaluateOnePieceSchemaReadbackV1({
        plan: inputs.plan,
        readback: inside,
        requireReadOnly: false,
        requireClosed: false,
      });
      attributableWrites = await captureAttributableProtectedWrites(client);
      const findings = [...insideFindings,
        ...evaluateOnePieceAttributableWritesV1(attributableWrites)];
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
  const findings = evaluateOnePieceSchemaReadbackV1({
    plan: inputs.plan,
    readback: postApply,
  });
  if (findings.length) {
    throw new Error(`Fresh post-apply verification failed: ${findings.join(",")}`);
  }
  const mtgDelta = classifyOnePieceConcurrentMtgDeltaV1(before.mtg, postApply.mtg);
  if (!mtgDelta.nondecreasing || mtgDelta.release_status_after !== "hidden") {
    throw new Error("Concurrent MTG state crossed hidden/nondecreasing boundary");
  }
  return {
    status: "schema_only_applied_and_fresh_readback_passed",
    local,
    environment: environmentFingerprint(connectionString, "production-schema-only"),
    plan_fingerprint_sha256: inputs.plan.apply_plan_fingerprint_sha256,
    migration_sha256: inputs.plan.migration_sha256,
    committed,
    collision_state_before: collisionState,
    attributable_protected_writes: attributableWrites,
    protected_counts_before: before.protected_counts,
    protected_schema_before: before.protected_schema,
    inside_transaction_readback: inside,
    fresh_post_apply_readback: postApply,
    concurrent_mtg_progress: mtgDelta,
    boundaries: {
      one_piece_staging_rows_written: 0,
      protected_table_dml_attributable_to_execution: 0,
      canonical_or_pricing_writes: 0,
      sealed_writes: 0,
      app_access_enabled: false,
      storage_or_publication: false,
      deployment: false,
    },
  };
}

async function writeExecutionArtifacts({ result, outDir }) {
  await fs.mkdir(outDir, { recursive: true });
  const summary = {
    version: ONE_PIECE_SCHEMA_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    ...result,
  };
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), summary);
  const readbackBody = await writeJson(path.join(outDir,
    "fresh_post_apply_readback.json"), result.fresh_post_apply_readback);
  const reportBody = `# One Piece Durable Staging Schema Apply V1\n\n` +
    `- Status: **PASS**\n` +
    `- Producing commit: \`${result.local.head_sha}\`\n` +
    `- Migration SHA-256: \`${result.migration_sha256}\`\n` +
    `- One Piece staging rows: \`0\`\n` +
    `- Attributable protected writes: \`0\`\n` +
    `- App access/publication: \`false\`\n` +
    `- Concurrent MTG attribution: ` +
      `\`${result.concurrent_mtg_progress.attribution}\`\n`;
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "summary.json", bytes: Buffer.byteLength(summaryBody),
        sha256: sha256OnePiecePreflightV1(summaryBody) },
      { path: "fresh_post_apply_readback.json", bytes: Buffer.byteLength(readbackBody),
        sha256: sha256OnePiecePreflightV1(readbackBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sha256OnePiecePreflightV1(reportBody) },
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
      ledger_fingerprint_sha256: inputs.plan.ledger_fingerprint_sha256,
      ledger_statement_count: inputs.plan.ledger_statement_count,
      guard_token: inputs.plan.guard_token,
    }, null, 2)}\n`);
    return;
  }
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error("Production database URL is missing");
  const checkedInPlan = JSON.parse(await readText(ONE_PIECE_SCHEMA_PLAN_PATH));
  if (stableJsonOnePiecePreflightV1(checkedInPlan) !==
      stableJsonOnePiecePreflightV1(inputs.plan)) {
    throw new Error("Checked-in apply plan is not the exact regenerated plan");
  }
  const result = await executeSchemaApply({ args, inputs, connectionString });
  await writeExecutionArtifacts({ result, outDir: args.outDir });
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    producing_commit_sha: result.local.head_sha,
    output_dir: relative(args.outDir),
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

export {
  captureProtectedSchemaContract,
  captureMtgState,
  captureProtectedCounts,
};
