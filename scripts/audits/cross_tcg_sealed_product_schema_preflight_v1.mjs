import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateSealedSchemaSecurityPreflightV1,
  SEALED_FUNCTIONS_V1,
  SEALED_INDEXES_V1,
  SEALED_MIGRATION_PLAN_FINGERPRINT,
  SEALED_MIGRATION_SHA256,
  SEALED_POLICIES_V1,
  SEALED_PROTECTED_RELATIONS_V1,
  SEALED_REQUIRED_EXTENSIONS_V1,
  SEALED_REQUIRED_ROLES_V1,
  SEALED_RESERVED_MIGRATION_NAME,
  SEALED_RESERVED_MIGRATION_VERSION,
  SEALED_ROLLBACK_SHA256,
  SEALED_SCHEMA_PREFLIGHT_VERSION,
  SEALED_TABLES_V1,
  SEALED_TRIGGERS_V1,
  sealedPreflightSha256V1,
  stableJsonSealedPreflightV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_preflight_v1.mjs";
import {
  assertReadOnlySql,
  environmentFingerprint,
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const STARTING_SHA = "6ddc84135521c7fc2531668d1614b751354b82fb";
const MIGRATION_PATH = path.join(
  ROOT,
  "docs",
  "sql",
  "cross_tcg_sealed_product_domain_v1_migration_candidate.sql",
);
const ROLLBACK_PATH = path.join(
  ROOT,
  "docs",
  "sql",
  "cross_tcg_sealed_product_domain_v1_schema_only_rollback_candidate.sql",
);
const PLAN_SUMMARY_PATH = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "cross_tcg_sealed_product_domain_v1",
  "2026-08-14T05-44-31-490Z_migration_plan",
  "summary.json",
);
const CONTRACT_PATH = path.join(
  ROOT,
  "docs",
  "contracts",
  "CROSS_TCG_SEALED_PRODUCT_SCHEMA_SECURITY_PREFLIGHT_V1.md",
);

function parseArgs(argv) {
  const args = {
    envFile: path.join("C:\\grookai_vault", ".env.local"),
    outRoot: path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "cross_tcg_sealed_product_schema_security_preflight_v1",
    ),
    expectedHeadSha: "",
  };
  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--out-root=")) args.outRoot = path.resolve(arg.slice(11));
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? "";
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

async function readText(file) {
  return fs.readFile(file, "utf8");
}

async function captureLocal(args) {
  const branch = git("branch", "--show-current");
  const headSha = git("rev-parse", "HEAD");
  const status = git("status", "--porcelain");
  if (branch !== "agent/sealed-catalog-readiness-v1") {
    throw new Error(`Unexpected branch: ${branch}`);
  }
  if (headSha !== args.expectedHeadSha) {
    throw new Error(`HEAD ${headSha} does not match expected producer ${args.expectedHeadSha}`);
  }
  if (status !== "") throw new Error("Preflight producer worktree must be clean");

  const [migration, rollback, planText] = await Promise.all([
    readText(MIGRATION_PATH),
    readText(ROLLBACK_PATH),
    readText(PLAN_SUMMARY_PATH),
  ]);
  const plan = JSON.parse(planText);
  const migrationDirectory = path.join(ROOT, "supabase", "migrations");
  const migrationFiles = (await fs.readdir(migrationDirectory))
    .filter((name) => /^\d{14}_.+\.sql$/.test(name))
    .sort();
  const versions = migrationFiles.map((name) => name.slice(0, 14));
  const duplicateVersions = versions.filter(
    (version, index) => versions.indexOf(version) !== index,
  );
  return {
    branch,
    producer_commit_sha: headSha,
    starting_commit_sha: STARTING_SHA,
    migration_sha256: sha256(migration),
    rollback_sha256: sha256(rollback),
    migration_plan_fingerprint: plan.migration_plan_fingerprint,
    candidate_in_applied_migration_path: migrationFiles.some((name) =>
      name.includes(SEALED_RESERVED_MIGRATION_NAME)),
    duplicate_migration_versions: new Set(duplicateVersions).size,
    migration_file_count: migrationFiles.length,
    latest_migration_version: versions.at(-1) ?? null,
    reserved_migration_version: SEALED_RESERVED_MIGRATION_VERSION,
    reserved_migration_name: SEALED_RESERVED_MIGRATION_NAME,
    migration_relative_path: relative(MIGRATION_PATH),
    rollback_relative_path: relative(ROLLBACK_PATH),
  };
}

async function captureCollisions(query) {
  const functionNames = SEALED_FUNCTIONS_V1.map((signature) => signature.split("(")[0]);
  const tables = (await query(
    `select c.relname as object_name, c.relkind as object_kind
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
        and c.relkind in ('r', 'p', 'v', 'm', 'f')
      order by c.relname`,
    [SEALED_TABLES_V1],
  )).rows;
  const functions = (await query(
    `select p.proname as object_name,
            pg_get_function_identity_arguments(p.oid) as identity_arguments,
            p.oid::regprocedure::text as actual_signature
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = any($1::text[])
      order by p.proname, identity_arguments`,
    [functionNames],
  )).rows;
  const indexes = (await query(
    `select c.relname as object_name, pg_get_indexdef(c.oid) as definition
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'i'
        and c.relname = any($1::text[])
      order by c.relname`,
    [SEALED_INDEXES_V1],
  )).rows;
  const policies = (await query(
    `with expected as (
       select * from jsonb_to_recordset($1::jsonb)
         as row(table_name text, policy_name text)
     )
     select policy.schemaname, policy.tablename, policy.policyname,
            policy.roles, policy.cmd, policy.qual, policy.with_check
       from pg_policies policy
       join expected
         on expected.table_name = policy.tablename
        and expected.policy_name = policy.policyname
      where policy.schemaname = 'public'
      order by policy.tablename, policy.policyname`,
    [JSON.stringify(SEALED_POLICIES_V1.map(([table_name, policy_name]) => ({
      table_name,
      policy_name,
    })))],
  )).rows;
  const triggers = (await query(
    `select trigger.tgname as object_name,
            namespace.nspname || '.' || relation.relname as relation_name
       from pg_trigger trigger
       join pg_class relation on relation.oid = trigger.tgrelid
       join pg_namespace namespace on namespace.oid = relation.relnamespace
      where not trigger.tgisinternal
        and trigger.tgname = any($1::text[])
      order by trigger.tgname, relation_name`,
    [SEALED_TRIGGERS_V1],
  )).rows;
  return {
    expected_counts: {
      tables: SEALED_TABLES_V1.length,
      functions: SEALED_FUNCTIONS_V1.length,
      indexes: SEALED_INDEXES_V1.length,
      policies: SEALED_POLICIES_V1.length,
      triggers: SEALED_TRIGGERS_V1.length,
    },
    expected_function_signatures: SEALED_FUNCTIONS_V1,
    tables,
    functions,
    indexes,
    policies,
    triggers,
  };
}

async function captureMigrationHistory(query) {
  const presence = (await query(`select
    to_regnamespace('supabase_migrations') is not null as schema_present,
    to_regclass('supabase_migrations.schema_migrations') is not null as table_present`)).rows[0];
  if (!presence.table_present) {
    return { ...presence, columns: [], duplicate_versions: null };
  }
  const columns = (await query(
    `select column_name
       from information_schema.columns
      where table_schema = 'supabase_migrations'
        and table_name = 'schema_migrations'
      order by ordinal_position`,
  )).rows.map((row) => row.column_name);
  const metrics = (await query(
    `select
       count(*)::integer as row_count,
       max(version) as latest_version,
       count(*) filter (where version = $1)::integer as reserved_version_rows,
       count(*) filter (
         where lower(coalesce(name, '')) like '%sealed_product%'
            or coalesce(statements::text, '') ilike '%sealed_product_%'
       )::integer as sealed_history_rows
     from supabase_migrations.schema_migrations`,
    [SEALED_RESERVED_MIGRATION_VERSION],
  )).rows[0];
  const duplicates = (await query(
    `select count(*)::integer as value
       from (
         select version from supabase_migrations.schema_migrations
         group by version having count(*) > 1
       ) duplicates`,
  )).rows[0].value;
  const recent = (await query(
    `select version, name
       from supabase_migrations.schema_migrations
      order by version desc
      limit 20`,
  )).rows;
  return { ...presence, columns, ...metrics, duplicate_versions: duplicates, recent };
}

async function captureRequirements(query) {
  const roles = (await query(
    `select rolname as role_name, rolcanlogin, rolsuper, rolbypassrls
       from pg_roles where rolname = any($1::text[]) order by rolname`,
    [SEALED_REQUIRED_ROLES_V1],
  )).rows;
  const extensions = (await query(
    `select extname as extension_name,
            namespace.nspname as schema_name,
            extversion as version
       from pg_extension extension
       join pg_namespace namespace on namespace.oid = extension.extnamespace
      where extname = any($1::text[]) order by extname`,
    [SEALED_REQUIRED_EXTENSIONS_V1],
  )).rows;
  const capability = (await query(
    `select current_user as database_user,
            to_regprocedure('gen_random_uuid()') is not null as gen_random_uuid_available,
            has_schema_privilege(current_user, 'public', 'create')
              as current_user_can_create_public,
            (select rolsuper from pg_roles where rolname = current_user)
              as current_user_superuser,
            (select rolbypassrls from pg_roles where rolname = current_user)
              as current_user_bypassrls`,
  )).rows[0];
  return { roles, extensions, ...capability };
}

async function captureSecurityBoundary(query) {
  const schemaCreatePrivileges = (await query(
    `with expected_roles(role_name) as (
       values ('anon'), ('authenticated'), ('service_role')
     ), expected_schemas(schema_name) as (
       values ('public'), ('extensions')
     )
     select expected_roles.role_name, expected_schemas.schema_name,
            role.oid is not null as role_exists,
            namespace.oid is not null as schema_exists,
            coalesce(has_schema_privilege(role.oid, namespace.oid, 'create'), false)
              as has_create
       from expected_roles
       cross join expected_schemas
       left join pg_roles role on role.rolname = expected_roles.role_name
       left join pg_namespace namespace on namespace.nspname = expected_schemas.schema_name
      order by expected_roles.role_name, expected_schemas.schema_name`,
  )).rows;
  const candidateObjectGrants = (await query(
    `select 'table' as object_type, table_name as object_name,
            grantee, privilege_type
       from information_schema.role_table_grants
      where table_schema = 'public' and table_name = any($1::text[])
     union all
     select 'function', routine_name, grantee, privilege_type
       from information_schema.role_routine_grants
      where specific_schema = 'public' and routine_name = any($2::text[])
      order by object_type, object_name, grantee, privilege_type`,
    [SEALED_TABLES_V1, SEALED_FUNCTIONS_V1.map((entry) => entry.split("(")[0])],
  )).rows;
  const defaultAcl = (await query(
    `select pg_get_userbyid(default_acl.defaclrole) as owner_name,
            coalesce(namespace.nspname, '*') as schema_name,
            default_acl.defaclobjtype as object_type,
            coalesce(grantee.rolname, 'PUBLIC') as grantee,
            acl.privilege_type, acl.is_grantable
       from pg_default_acl default_acl
       left join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
       cross join lateral aclexplode(default_acl.defaclacl) acl
       left join pg_roles grantee on grantee.oid = acl.grantee
      where (default_acl.defaclnamespace = 0 or namespace.nspname = 'public')
        and coalesce(grantee.rolname, 'PUBLIC') in ('PUBLIC', 'anon', 'authenticated')
      order by owner_name, schema_name, object_type, grantee, privilege_type`,
  )).rows;
  return {
    schema_create_privileges: schemaCreatePrivileges,
    candidate_object_grants: candidateObjectGrants,
    relevant_default_acl: defaultAcl,
  };
}

async function captureBaselines(query, migrationHistory) {
  const relationState = (await query(
    `with expected(relation_name) as (select unnest($1::text[]))
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
      order by expected.relation_name`,
    [SEALED_PROTECTED_RELATIONS_V1],
  )).rows;
  const missingRelations = relationState.filter((row) => !row.present)
    .map((row) => row.relation_name);
  const columns = (await query(
    `select table_name, column_name, data_type, udt_name, is_nullable
       from information_schema.columns
      where table_schema = 'public' and table_name = any($1::text[])
      order by table_name, ordinal_position`,
    [SEALED_PROTECTED_RELATIONS_V1],
  )).rows;
  const constraints = (await query(
    `select relation.relname as table_name, constraint.conname,
            constraint.contype, pg_get_constraintdef(constraint.oid) as definition
       from pg_constraint constraint
       join pg_class relation on relation.oid = constraint.conrelid
       join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = any($1::text[])
      order by relation.relname, constraint.conname`,
    [SEALED_PROTECTED_RELATIONS_V1],
  )).rows;
  const indexes = (await query(
    `select tablename as table_name, indexname, indexdef
       from pg_indexes
      where schemaname = 'public' and tablename = any($1::text[])
      order by tablename, indexname`,
    [SEALED_PROTECTED_RELATIONS_V1],
  )).rows;
  const grants = (await query(
    `select table_name, grantee, privilege_type, is_grantable
       from information_schema.role_table_grants
      where table_schema = 'public' and table_name = any($1::text[])
        and grantee = any(array['anon', 'authenticated', 'service_role'])
      order by table_name, grantee, privilege_type`,
    [SEALED_PROTECTED_RELATIONS_V1],
  )).rows;
  const schemaContract = { relations: relationState, columns, constraints, indexes, grants };
  if (missingRelations.length > 0) {
    return {
      missing_relations: missingRelations,
      schema_contract: schemaContract,
      schema_fingerprint_sha256: sealedPreflightSha256V1(
        stableJsonSealedPreflightV1(schemaContract)),
      rows: {},
      row_fingerprint_sha256: null,
      mtg: {},
    };
  }
  const rowResult = (await query(`select jsonb_build_object(
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
  const mtg = (await query(`select
    (select count(*)::integer from public.games where code = 'mtg') as game_count,
    (select count(*)::integer from public.sets where game = 'mtg') as set_count,
    (select count(*)::integer from public.card_prints card
      join public.games game on game.id = card.game_id where game.code = 'mtg') as card_count,
    (select count(*)::integer from public.card_printings printing
      join public.card_prints card on card.id = printing.card_print_id
      join public.games game on game.id = card.game_id where game.code = 'mtg') as printing_count,
    (select release_status from public.catalog_game_release_controls
      where game_code = 'mtg') as release_status`)).rows[0];
  mtg.required_migrations = Object.fromEntries(
    ["20260813185000", "20260813190000", "20260813200000"].map((version) => [
      version,
      migrationHistory.recent?.some((row) => row.version === version) ?? false,
    ]),
  );
  return {
    missing_relations: [],
    schema_contract: schemaContract,
    schema_fingerprint_sha256: sealedPreflightSha256V1(
      stableJsonSealedPreflightV1(schemaContract)),
    rows: rowResult,
    row_fingerprint_sha256: sealedPreflightSha256V1(
      stableJsonSealedPreflightV1({ rows: rowResult, mtg })),
    mtg,
  };
}

async function captureLockRisk(query) {
  const activity = (await query(`select
    count(*) filter (where backend_type = 'client backend')::integer as client_connections,
    count(*) filter (where wait_event_type is not null)::integer as waiting_sessions,
    count(*) filter (
      where pid <> pg_backend_pid() and xact_start < now() - interval '15 minutes'
    )::integer as long_transactions,
    current_setting('max_connections')::integer as max_connections
  from pg_stat_activity`)).rows[0];
  const locks = (await query(
    `select
       count(*) filter (where not lock.granted)::integer as ungranted_locks,
       count(*) filter (
         where lock.granted and lock.mode = 'AccessExclusiveLock'
           and relation.relname = any($1::text[])
       )::integer as protected_access_exclusive_locks
     from pg_locks lock
     left join pg_class relation on relation.oid = lock.relation`,
    [SEALED_PROTECTED_RELATIONS_V1],
  )).rows[0];
  const prepared = Number((await query(
    `select count(*)::integer as value from pg_prepared_xacts`,
  )).rows[0].value);
  const clientConnections = Number(activity.client_connections);
  const maxConnections = Number(activity.max_connections);
  return {
    ...activity,
    ...locks,
    prepared_transactions: prepared,
    connection_utilization: maxConnections > 0
      ? Number((clientConnections / maxConnections).toFixed(6))
      : 1,
    thresholds: {
      long_transaction_minutes: 15,
      connection_utilization_block: 0.8,
    },
  };
}

async function captureProduction(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: pgSslConfig(databaseUrl),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "sealed-product-schema-security-preflight-v1",
  });
  let transactionStarted = false;
  let production;
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin read only");
    transactionStarted = true;
    const query = (sql, values = []) => client.query(assertReadOnlySql(sql), values);
    const transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0].transaction_read_only;
    const defaultReadOnly = (await client.query("show default_transaction_read_only"))
      .rows[0].default_transaction_read_only;
    if (transactionReadOnly !== "on" || defaultReadOnly !== "on") {
      throw new Error("Could not prove read-only production transaction and session");
    }
    const migrationHistory = await captureMigrationHistory(query);
    production = {
      environment: environmentFingerprint(databaseUrl, "production-read-only"),
      guard: {
        transaction_read_only: transactionReadOnly,
        default_transaction_read_only: defaultReadOnly,
        transaction_closed_before_artifacts: false,
      },
      migration_history: migrationHistory,
      collisions: await captureCollisions(query),
      requirements: await captureRequirements(query),
      security_boundary: await captureSecurityBoundary(query),
      baselines: await captureBaselines(query, migrationHistory),
      lock_risk: await captureLockRisk(query),
    };
  } finally {
    if (transactionStarted) await client.query("rollback").catch(() => {});
    await client.end();
  }
  production.guard.transaction_closed_before_artifacts = true;
  return production;
}

function report(summary) {
  const collisionCounts = Object.fromEntries(
    ["tables", "functions", "indexes", "policies", "triggers"]
      .map((key) => [key, summary.production.collisions[key].length]),
  );
  return `# Sealed Product Schema/Security Production Preflight V1\n\n` +
    `- Result: **${summary.status.toUpperCase()}**\n` +
    `- Producer SHA: \`${summary.producer_commit_sha}\`\n` +
    `- Migration SHA-256: \`${summary.local.migration_sha256}\`\n` +
    `- Migration-plan fingerprint: \`${summary.local.migration_plan_fingerprint}\`\n` +
    `- Reserved migration: \`${SEALED_RESERVED_MIGRATION_VERSION}_${SEALED_RESERVED_MIGRATION_NAME}.sql\`\n` +
    `- Transaction read-only: \`${summary.production.guard.transaction_read_only}\`\n` +
    `- Transaction closed before artifacts: \`${summary.production.guard.transaction_closed_before_artifacts}\`\n` +
    `- Candidate collisions: \`${JSON.stringify(collisionCounts)}\`\n` +
    `- Protected schema fingerprint: \`${summary.production.baselines.schema_fingerprint_sha256}\`\n` +
    `- Protected row fingerprint: \`${summary.production.baselines.row_fingerprint_sha256}\`\n` +
    `- Findings: \`${summary.findings.length}\`\n\n` +
    `## Findings\n\n${summary.findings.length ? summary.findings.map((item) => `- ${item}`).join("\n") : "- None"}\n\n` +
    `## Boundaries\n\nNo DDL, migration apply/history write, canonical write, pricing/Vault/MTG write, Storage, publication, deployment, or app visibility occurred.\n\n` +
    `## Exact Next Gate\n\n${summary.exact_next_gate}\n`;
}

async function writeJson(file, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, content, "utf8");
  return content;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const local = await captureLocal(args);
  dotenv.config({ path: args.envFile, quiet: true });
  const databaseUrl = connectionString();
  if (!databaseUrl) throw new Error("Production database URL is missing");

  const production = await captureProduction(databaseUrl);
  const findings = evaluateSealedSchemaSecurityPreflightV1({ local, production });
  const status = findings.length === 0 ? "pass" : "blocked";
  const exactNextGate = status === "pass"
    ? "Create the reserved Supabase migration from the exact candidate bytes, produce a schema-only apply plan bound to this preflight, and request explicit approval for one atomic schema apply plus schema/RLS/grant readback. Do not run the no-publication data canary."
    : "Stop before migration apply. Resolve the reported preflight findings, rerun this exact read-only gate from a new frozen producer, and do not create the reserved migration file yet.";
  const recordedAt = new Date().toISOString();
  const preflightCore = {
    version: SEALED_SCHEMA_PREFLIGHT_VERSION,
    recorded_at: recordedAt,
    producer_commit_sha: local.producer_commit_sha,
    reserved_migration_version: SEALED_RESERVED_MIGRATION_VERSION,
    migration_sha256: SEALED_MIGRATION_SHA256,
    rollback_sha256: SEALED_ROLLBACK_SHA256,
    migration_plan_fingerprint: SEALED_MIGRATION_PLAN_FINGERPRINT,
    boundaries: {
      database_transaction_read_only: true,
      database_writes: false,
      ddl_or_migration_apply: false,
      storage_or_publication: false,
      deployment_or_app_visibility: false,
      active_mtg_worktree_touched: false,
    },
  };
  const preflightFingerprint = sealedPreflightSha256V1(
    stableJsonSealedPreflightV1(preflightCore));
  const summary = {
    ...preflightCore,
    preflight_fingerprint_sha256: preflightFingerprint,
    status,
    local,
    production,
    findings,
    exact_next_gate: exactNextGate,
  };

  const outDir = path.join(args.outRoot, `${stamp()}_production_read_only`);
  await fs.mkdir(outDir, { recursive: true });
  const runPlan = {
    ...preflightCore,
    preflight_fingerprint_sha256: preflightFingerprint,
    expected_collision_inventory: production.collisions.expected_counts,
    protected_relations: SEALED_PROTECTED_RELATIONS_V1,
  };
  const contents = new Map();
  contents.set("run_plan.json", await writeJson(path.join(outDir, "run_plan.json"), runPlan));
  contents.set("production_readback.json", await writeJson(
    path.join(outDir, "production_readback.json"), production));
  contents.set("summary.json", await writeJson(path.join(outDir, "summary.json"), summary));
  const reportBody = report(summary);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  contents.set("REPORT.md", reportBody);

  const boundFiles = [
    MIGRATION_PATH,
    ROLLBACK_PATH,
    PLAN_SUMMARY_PATH,
    CONTRACT_PATH,
    fileURLToPath(import.meta.url),
    path.join(ROOT, "backend", "pricing", "cross_tcg_sealed_product_schema_preflight_v1.mjs"),
  ];
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [...contents].map(([name, content]) => ({
      path: name,
      bytes: Buffer.byteLength(content),
      sha256: sha256(content),
    })),
    bound_inputs: await Promise.all(boundFiles.map(async (file) => {
      const content = await fs.readFile(file);
      return { path: relative(file), bytes: content.byteLength, sha256: sha256(content) };
    })),
  });

  process.stdout.write(`${JSON.stringify({
    out_dir: relative(outDir),
    status,
    findings,
    preflight_fingerprint_sha256: preflightFingerprint,
  }, null, 2)}\n`);
  if (status !== "pass") process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
