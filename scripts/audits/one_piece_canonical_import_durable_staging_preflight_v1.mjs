import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceDurableStagingPreflightV1,
  ONE_PIECE_DURABLE_STAGING_FUNCTIONS,
  ONE_PIECE_DURABLE_STAGING_INDEXES,
  ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME,
  ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
  ONE_PIECE_DURABLE_STAGING_POLICIES,
  ONE_PIECE_DURABLE_STAGING_PREFLIGHT_VERSION,
  ONE_PIECE_DURABLE_STAGING_TABLES,
  ONE_PIECE_DURABLE_STAGING_TRIGGERS,
  ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS,
  sha256OnePiecePreflightV1,
  stableJsonOnePiecePreflightV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_preflight_v1.mjs";
import {
  assertReadOnlySql,
  environmentFingerprint,
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = path.join(ROOT, "docs", "sql",
  "one_piece_canonical_import_durable_staging_schema_v1_migration_candidate.sql");
const ROLLBACK = path.join(ROOT, "docs", "sql",
  "one_piece_canonical_import_durable_staging_schema_v1_rollback_candidate.sql");
const OFFLINE_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_staging_schema_v1", "offline_design_v1",
  "schema_apply_plan.json");

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outRoot: path.join(ROOT, "docs", "audits", "pricing",
      "one_piece_canonical_import_durable_staging_preflight_v1"),
  };
  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--out-root=")) args.outRoot = path.resolve(arg.slice(11));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function captureLocal(args) {
  const branch = git("branch", "--show-current");
  const headSha = git("rev-parse", "HEAD");
  if (branch !== "agent/one-piece-ingestion-readiness-v1") {
    throw new Error(`Unexpected branch: ${branch}`);
  }
  if (headSha !== args.expectedHeadSha) {
    throw new Error(`HEAD ${headSha} does not match expected ${args.expectedHeadSha}`);
  }
  if (git("status", "--porcelain") !== "") {
    throw new Error("Preflight producer worktree must be clean");
  }
  const [migration, rollback, planText] = await Promise.all([
    fs.readFile(MIGRATION, "utf8"),
    fs.readFile(ROLLBACK, "utf8"),
    fs.readFile(OFFLINE_PLAN, "utf8"),
  ]);
  const migrationFiles = (await fs.readdir(path.join(ROOT, "supabase", "migrations")))
    .filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort();
  const versions = migrationFiles.map((name) => name.slice(0, 14));
  const duplicateVersions = versions.filter((version, index) =>
    versions.indexOf(version) !== index);
  return {
    branch,
    producer_commit_sha: headSha,
    migration_sha256: sha256OnePiecePreflightV1(migration),
    rollback_sha256: sha256OnePiecePreflightV1(rollback),
    plan_fingerprint_sha256: JSON.parse(planText).plan_fingerprint_sha256,
    target_migration_present: migrationFiles.includes(
      `${ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION}_` +
      `${ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME}.sql`),
    duplicate_migration_versions: new Set(duplicateVersions).size,
    latest_migration_version: versions.at(-1) ?? null,
  };
}

async function queryRows(query, sql, values = []) {
  return (await query(sql, values)).rows;
}

async function captureProduction(connectionString) {
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "one-piece-durable-staging-preflight-v1",
  });
  await client.connect();
  let opened = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin read only");
    opened = true;
    const query = (sql, values = []) => client.query(assertReadOnlySql(sql), values);
    const transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0].transaction_read_only;
    const defaultReadOnly = (await client.query("show default_transaction_read_only"))
      .rows[0].default_transaction_read_only;

    const tables = await queryRows(query, `select c.relname as object_name
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = any($1::text[])
        and c.relkind in ('r','p','v','m','f') order by c.relname`,
    [ONE_PIECE_DURABLE_STAGING_TABLES]);
    const functions = await queryRows(query, `select p.proname as object_name
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = any($1::text[])
      order by p.proname`, [ONE_PIECE_DURABLE_STAGING_FUNCTIONS]);
    const indexes = await queryRows(query, `select c.relname as object_name
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'i'
        and c.relname = any($1::text[]) order by c.relname`,
    [ONE_PIECE_DURABLE_STAGING_INDEXES]);
    const policies = await queryRows(query, `select policyname as object_name
      from pg_policies where schemaname = 'public'
        and policyname = any($1::text[]) order by policyname`,
    [ONE_PIECE_DURABLE_STAGING_POLICIES]);
    const triggers = await queryRows(query, `select t.tgname as object_name
      from pg_trigger t where not t.tgisinternal and t.tgname = any($1::text[])
      order by t.tgname`, [ONE_PIECE_DURABLE_STAGING_TRIGGERS]);
    const migrationPresence = (await query(`select
      to_regnamespace('supabase_migrations') is not null as schema_present,
      to_regclass('supabase_migrations.schema_migrations') is not null as table_present`))
      .rows[0];
    const migrationMetrics = (await query(`select max(version) as latest_version,
      count(*) filter (where version = $1)::integer as reserved_version_rows,
      count(*) filter (where name = $2)::integer as reserved_name_rows,
      count(*) filter (where version > $1)::integer as later_migration_rows
      from supabase_migrations.schema_migrations`,
    [ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
      ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME])).rows[0];
    const duplicateVersions = Number((await query(`select count(*)::integer as value
      from (select version from supabase_migrations.schema_migrations
        group by version having count(*) > 1) duplicate_versions`)).rows[0].value);
    const roles = await queryRows(query, `select rolname as role_name, rolbypassrls
      from pg_roles where rolname = any($1::text[]) order by rolname`,
    [["anon", "authenticated", "authenticator", "service_role"]]);
    const capability = (await query(`select
      has_schema_privilege(current_user, 'public', 'create')
        as current_user_can_create_public`)).rows[0];
    const schemaCreatePrivileges = await queryRows(query, `select role_name,
      has_schema_privilege(role_name, 'public', 'create') as has_create
      from unnest(array['anon','authenticated','service_role']) role_name
      order by role_name`);
    const candidateObjectGrants = await queryRows(query, `select table_name as object_name,
      grantee, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and table_name = any($1::text[])
      union all select routine_name, grantee, privilege_type
      from information_schema.role_routine_grants
      where specific_schema = 'public' and routine_name = any($2::text[])
      order by object_name, grantee, privilege_type`,
    [ONE_PIECE_DURABLE_STAGING_TABLES, ONE_PIECE_DURABLE_STAGING_FUNCTIONS]);
    const defaultAcl = await queryRows(query, `select
      pg_get_userbyid(d.defaclrole) as owner_name,
      coalesce(n.nspname, '*') as schema_name, d.defaclobjtype as object_type,
      coalesce(r.rolname, 'PUBLIC') as grantee, a.privilege_type
      from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
      cross join lateral aclexplode(d.defaclacl) a
      left join pg_roles r on r.oid = a.grantee
      where d.defaclnamespace = 0 or n.nspname = 'public'
      order by owner_name, schema_name, object_type, grantee, privilege_type`);

    const relationState = await queryRows(query, `with expected(relation_name) as
      (select unnest($1::text[])) select expected.relation_name,
      relation.oid is not null as present, relation.relkind,
      coalesce(relation.relrowsecurity,false) as rls_enabled,
      coalesce(relation.relforcerowsecurity,false) as rls_forced
      from expected left join pg_namespace n on n.nspname='public'
      left join pg_class relation on relation.relnamespace=n.oid
        and relation.relname=expected.relation_name
      order by expected.relation_name`, [ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS]);
    const protectedGrants = await queryRows(query, `select table_name, grantee,
      privilege_type from information_schema.role_table_grants
      where table_schema='public' and table_name=any($1::text[])
        and grantee=any(array['anon','authenticated','service_role'])
      order by table_name,grantee,privilege_type`,
    [ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS]);
    const rowCounts = {};
    for (const table of ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS) {
      if (relationState.find((row) => row.relation_name === table)?.present) {
        rowCounts[table] = Number((await query(
          `select count(*)::integer as value from public.${table}`)).rows[0].value);
      }
    }
    const mtg = (await query(`select
      (select count(*)::integer from public.games where code='mtg') as game_count,
      (select count(*)::integer from public.sets where game='mtg') as set_count,
      (select count(*)::integer from public.card_prints c join public.games g
        on g.id=c.game_id where g.code='mtg') as card_count,
      (select release_status from public.catalog_game_release_controls
        where game_code='mtg') as release_status`)).rows[0];
    const sealedMigrationPresent = Number((await query(`select count(*)::integer as value
      from supabase_migrations.schema_migrations where version='20260814060000'
        and name='cross_tcg_sealed_product_domain_v1'`)).rows[0].value) === 1;
    const onePieceActiveSourceProducts = Number((await query(`select count(*)::integer as value
      from public.tcgcsv_source_products where category_id=68 and source_active`))
      .rows[0].value);
    const activity = (await query(`select
      count(*) filter (where backend_type='client backend')::integer as client_connections,
      count(*) filter (where pid<>pg_backend_pid()
        and xact_start<now()-interval '15 minutes')::integer as long_transactions,
      current_setting('max_connections')::integer as max_connections
      from pg_stat_activity`)).rows[0];
    const locks = (await query(`select
      count(*) filter (where not l.granted)::integer as ungranted_locks,
      count(*) filter (where l.granted and l.mode='AccessExclusiveLock'
        and c.relname=any($1::text[]))::integer as protected_access_exclusive_locks
      from pg_locks l left join pg_class c on c.oid=l.relation`,
    [ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS])).rows[0];
    const preparedTransactions = Number((await query(
      `select count(*)::integer as value from pg_prepared_xacts`)).rows[0].value);
    const schemaContract = { relations: relationState, grants: protectedGrants };
    await client.query("rollback");
    opened = false;
    return {
      environment: environmentFingerprint(connectionString, "production-read-only"),
      guard: {
        transaction_read_only: transactionReadOnly,
        default_transaction_read_only: defaultReadOnly,
        transaction_closed_before_artifacts: true,
      },
      collisions: {
        expected_counts: { tables: 2, functions: 1, indexes: 2, policies: 4, triggers: 2 },
        tables, functions, indexes, policies, triggers,
      },
      migration_history: {
        ...migrationPresence, ...migrationMetrics,
        duplicate_versions: duplicateVersions,
      },
      requirements: { roles, ...capability },
      security_boundary: {
        schema_create_privileges: schemaCreatePrivileges,
        candidate_object_grants: candidateObjectGrants,
        default_acl_captured: true,
        relevant_default_acl: defaultAcl,
      },
      baselines: {
        missing_relations: relationState.filter((row) => !row.present)
          .map((row) => row.relation_name),
        schema_contract: schemaContract,
        schema_fingerprint_sha256: sha256OnePiecePreflightV1(
          stableJsonOnePiecePreflightV1(schemaContract)),
        row_counts: rowCounts,
        mtg,
        sealed_migration_present: sealedMigrationPresent,
        one_piece_active_source_products: onePieceActiveSourceProducts,
      },
      lock_risk: {
        ...activity, ...locks,
        prepared_transactions: preparedTransactions,
        connection_utilization: Number(activity.max_connections) > 0
          ? Number((Number(activity.client_connections) /
            Number(activity.max_connections)).toFixed(6)) : 1,
      },
    };
  } catch (error) {
    if (opened) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const local = await captureLocal(args);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  const production = await captureProduction(connectionString);
  const findings = evaluateOnePieceDurableStagingPreflightV1({ local, production });
  const recordedAt = new Date().toISOString();
  const core = {
    version: ONE_PIECE_DURABLE_STAGING_PREFLIGHT_VERSION,
    recorded_at: recordedAt,
    producer_commit_sha: local.producer_commit_sha,
    migration_version: ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
    migration_name: ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME,
    database_writes: false,
  };
  const fingerprint = sha256OnePiecePreflightV1(stableJsonOnePiecePreflightV1(core));
  const summary = {
    ...core,
    preflight_fingerprint_sha256: fingerprint,
    status: findings.length ? "blocked" : "pass",
    local,
    production,
    findings,
    exact_next_gate: findings.length
      ? "Stop before migration placement or apply. Repair findings and rerun read-only."
      : "Promote the exact migration candidate to its reserved path and create a separately fingerprinted schema-only apply/readback plan. Do not apply or stage data in this gate.",
  };
  const outDir = path.join(args.outRoot,
    `${recordedAt.replace(/[:.]/g, "-")}_production_read_only`);
  await fs.mkdir(outDir, { recursive: true });
  const contents = new Map();
  contents.set("run_plan.json", await writeJson(path.join(outDir, "run_plan.json"), core));
  contents.set("production_readback.json", await writeJson(
    path.join(outDir, "production_readback.json"), production));
  contents.set("summary.json", await writeJson(path.join(outDir, "summary.json"), summary));
  const report = `# One Piece Durable Staging Production Preflight V1\n\n` +
    `- Status: **${summary.status.toUpperCase()}**\n` +
    `- Producer: \`${local.producer_commit_sha}\`\n` +
    `- Fingerprint: \`${fingerprint}\`\n` +
    `- Findings: ${findings.length}\n` +
    `- Database writes: 0\n\n## Exact Next Gate\n\n${summary.exact_next_gate}\n`;
  await fs.writeFile(path.join(outDir, "REPORT.md"), report, "utf8");
  contents.set("REPORT.md", report);
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [...contents].map(([name, body]) => ({
      path: name, bytes: Buffer.byteLength(body),
      sha256: sha256OnePiecePreflightV1(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    out_dir: path.relative(ROOT, outDir).replaceAll("\\", "/"),
    preflight_fingerprint_sha256: fingerprint,
    findings,
  }, null, 2)}\n`);
  if (findings.length) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
