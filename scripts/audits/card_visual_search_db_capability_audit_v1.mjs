import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

export const CARD_VISUAL_SEARCH_DB_CAPABILITY_AUDIT_VERSION =
  "CARD_VISUAL_SEARCH_DB_CAPABILITY_AUDIT_V1";

const { Client } = pg;
const RELEVANT_TABLE_PATTERN = "%visual%";
const SEARCH_TABLE_PATTERN = "%search%";
const RELEVANT_EXTENSION_NAMES = Object.freeze([
  "btree_gin",
  "btree_gist",
  "pg_trgm",
  "unaccent",
  "vector",
]);

export const READ_ONLY_SQL = Object.freeze({
  transaction_mode:
    "select current_setting('transaction_read_only') as transaction_read_only",
  database:
    "select current_database() as database_name, current_user as database_user, current_setting('server_version') as server_version",
  extensions: `
    select name, default_version, installed_version
    from pg_available_extensions
    where name = any($1::text[])
    order by name
  `,
  extension_schemas: `
    select e.extname as extension_name, n.nspname as schema_name, e.extversion as installed_version
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = any($1::text[])
    order by e.extname
  `,
  tables: `
    select
      n.nspname as schema_name,
      c.relname as table_name,
      c.relkind as relation_kind,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as force_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm')
      and (
        c.relname ilike $1
        or c.relname ilike $2
        or c.relname in ('card_print_visual_descriptions', 'card_visual_description_runs')
      )
    order by c.relname
  `,
  columns: `
    select
      c.table_schema,
      c.table_name,
      c.ordinal_position,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = any($1::text[])
    order by c.table_name, c.ordinal_position
  `,
  indexes: `
    select schemaname as schema_name, tablename as table_name, indexname as index_name, indexdef
    from pg_indexes
    where schemaname = 'public'
      and tablename = any($1::text[])
    order by tablename, indexname
  `,
  policies: `
    select
      schemaname as schema_name,
      tablename as table_name,
      policyname as policy_name,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    from pg_policies
    where schemaname = 'public'
      and tablename = any($1::text[])
    order by tablename, policyname
  `,
  functions: `
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments,
      pg_get_function_result(p.oid) as result_type,
      p.prosecdef as security_definer,
      p.provolatile as volatility,
      p.proacl::text as access_control
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname ilike $1 or p.proname ilike $2)
    order by p.proname, identity_arguments
  `,
  routine_grants: `
    select routine_schema, routine_name, grantee, privilege_type
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and (routine_name ilike $1 or routine_name ilike $2)
    order by routine_name, grantee, privilege_type
  `,
  table_count:
    "select count(*)::bigint as row_count from %TABLE_IDENTIFIER%",
});

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function parseOutputPath(argv) {
  const entry = argv.find((value) => value.startsWith("--output="));
  return entry ? path.resolve(entry.slice("--output=".length)) : null;
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function isMainModule() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

export function assertReadOnlySqlV1(sql) {
  const normalized = String(sql).replace(/\s+/gu, " ").trim().toLowerCase();
  if (
    !normalized.startsWith("select ") &&
    !normalized.startsWith("show ") &&
    !normalized.startsWith("set transaction read only")
  ) {
    throw new Error(`Non-read-only SQL statement rejected: ${normalized.slice(0, 40)}`);
  }
  if (
    /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do)\b/u.test(
      normalized,
    )
  ) {
    throw new Error("Mutation-capable SQL statement rejected");
  }
  return true;
}

async function query(client, sql, params = []) {
  assertReadOnlySqlV1(sql);
  return (await client.query(sql, params)).rows;
}

export async function runCardVisualSearchDbCapabilityAuditV1({
  connectionString = process.env.SUPABASE_DB_URL,
  outputPath,
} = {}) {
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  if (!outputPath) throw new Error("An output path is required");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30_000,
    query_timeout: 30_000,
    application_name: "card_visual_search_db_capability_audit_v1",
  });

  await client.connect();
  try {
    await client.query("begin transaction read only");
    const [databaseRows, modeRows, extensionRows, extensionSchemaRows, tableRows] =
      await Promise.all([
        query(client, READ_ONLY_SQL.database),
        query(client, READ_ONLY_SQL.transaction_mode),
        query(client, READ_ONLY_SQL.extensions, [RELEVANT_EXTENSION_NAMES]),
        query(client, READ_ONLY_SQL.extension_schemas, [RELEVANT_EXTENSION_NAMES]),
        query(client, READ_ONLY_SQL.tables, [
          RELEVANT_TABLE_PATTERN,
          SEARCH_TABLE_PATTERN,
        ]),
      ]);

    const tableNames = tableRows
      .filter((row) => ["r", "p"].includes(row.relation_kind))
      .map((row) => row.table_name);
    const [columns, indexes, policies, functions, routineGrants] =
      await Promise.all([
        tableNames.length
          ? query(client, READ_ONLY_SQL.columns, [tableNames])
          : [],
        tableNames.length
          ? query(client, READ_ONLY_SQL.indexes, [tableNames])
          : [],
        tableNames.length
          ? query(client, READ_ONLY_SQL.policies, [tableNames])
          : [],
        query(client, READ_ONLY_SQL.functions, [
          RELEVANT_TABLE_PATTERN,
          SEARCH_TABLE_PATTERN,
        ]),
        query(client, READ_ONLY_SQL.routine_grants, [
          RELEVANT_TABLE_PATTERN,
          SEARCH_TABLE_PATTERN,
        ]),
      ]);

    const rowCounts = {};
    for (const tableName of tableNames) {
      const tableSql = READ_ONLY_SQL.table_count.replace(
        "%TABLE_IDENTIFIER%",
        `public.${quoteIdentifier(tableName)}`,
      );
      rowCounts[tableName] = Number((await query(client, tableSql))[0].row_count);
    }

    const payload = {
      audit_version: CARD_VISUAL_SEARCH_DB_CAPABILITY_AUDIT_VERSION,
      created_at: new Date().toISOString(),
      transaction_read_only: modeRows[0]?.transaction_read_only === "on",
      database: databaseRows[0],
      extensions: extensionRows,
      extension_schemas: extensionSchemaRows,
      relevant_relations: tableRows,
      columns,
      indexes,
      policies,
      functions,
      routine_grants: routineGrants,
      row_counts: rowCounts,
      boundaries: {
        transaction_mode: "read_only",
        row_data_exported: false,
        provider_calls: false,
        database_writes: false,
        migration_apply: false,
        approvals: false,
        embeddings: false,
        public_search_activation: false,
        pricing_changes: false,
      },
    };
    const report = {
      ...payload,
      audit_payload_sha256: sha256Json(payload),
    };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await client.query("commit");
    return report;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original read failure.
    }
    throw error;
  } finally {
    await client.end();
  }
}

if (isMainModule()) {
  const outputPath = parseOutputPath(process.argv.slice(2));
  const report = await runCardVisualSearchDbCapabilityAuditV1({ outputPath });
  console.log(
    JSON.stringify(
      {
        audit_version: report.audit_version,
        transaction_read_only: report.transaction_read_only,
        extensions: report.extensions.length,
        relevant_relations: report.relevant_relations.length,
        output: outputPath,
        audit_payload_sha256: report.audit_payload_sha256,
      },
      null,
      2,
    ),
  );
}
