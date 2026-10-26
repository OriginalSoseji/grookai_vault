import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "pg";

export const STORAGE_BREAKDOWN_VERSION = "SUPABASE_PRODUCTION_STORAGE_BREAKDOWN_V1";

function argValue(argv, name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function integer(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function buildStorageBreakdownV1({ databaseBytes, relations, tableStats }, collectedAt) {
  const stats = new Map((tableStats ?? []).map((row) => [`${row.schema_name}.${row.relation_name}`, row]));
  const topRelations = (relations ?? []).map((row) => {
    const stat = stats.get(`${row.schema_name}.${row.relation_name}`) ?? {};
    return {
      schema_name: row.schema_name,
      relation_name: row.relation_name,
      relation_kind: row.relation_kind,
      total_bytes: integer(row.total_bytes),
      table_bytes: integer(row.table_bytes),
      index_bytes: integer(row.index_bytes),
      estimated_live_rows: integer(stat.estimated_live_rows),
      estimated_dead_rows: integer(stat.estimated_dead_rows),
      last_autovacuum: stat.last_autovacuum ?? null,
      last_autoanalyze: stat.last_autoanalyze ?? null,
    };
  });
  return {
    schema_version: STORAGE_BREAKDOWN_VERSION,
    collected_at: collectedAt ?? new Date().toISOString(),
    read_only: true,
    database_bytes: integer(databaseBytes),
    listed_relation_bytes: topRelations.reduce((sum, row) => sum + row.total_bytes, 0),
    top_relations: topRelations,
  };
}

export function renderStorageBreakdownMarkdownV1(report) {
  const gib = (bytes) => (bytes / (1024 ** 3)).toFixed(2);
  const lines = [
    "# Supabase Production Storage Breakdown", "",
    `- Collected: \`${report.collected_at}\``,
    `- Database size: \`${gib(report.database_bytes)} GiB\``,
    `- Read only: \`${report.read_only}\``, "",
    "## Largest relations", "",
    "| Relation | Total GiB | Table GiB | Index GiB | Live rows | Dead rows |",
    "|---|---:|---:|---:|---:|---:|",
    ...report.top_relations.map((row) =>
      `| \`${row.schema_name}.${row.relation_name}\` | ${gib(row.total_bytes)} | ${gib(row.table_bytes)} | ${gib(row.index_bytes)} | ${row.estimated_live_rows} | ${row.estimated_dead_rows} |`),
    "", "This report performed no database or control-plane mutation.",
  ];
  return `${lines.join("\n")}\n`;
}

function clientOptions(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const local = new Set(["localhost", "127.0.0.1", "::1"]).has(parsed.hostname);
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return {
    connectionString: databaseUrl,
    application_name: "supabase_production_storage_breakdown_v1",
    ssl: local ? false : { rejectUnauthorized: true, servername: parsed.hostname, ...(ca ? { ca } : {}) },
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  const outputDir = path.resolve(argValue(argv, "output-dir", "audit-artifacts/supabase-production-capacity"));
  const limit = Number(argValue(argv, "limit", "30"));
  if (!databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("--limit must be between 1 and 100");

  const client = new Client(clientOptions(databaseUrl));
  await client.connect();
  let report;
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout = '120s'");
    const database = await client.query("select pg_database_size(current_database())::bigint::text as bytes");
    const relations = await client.query(`
      select n.nspname as schema_name, c.relname as relation_name, c.relkind as relation_kind,
             pg_total_relation_size(c.oid)::bigint::text as total_bytes,
             pg_relation_size(c.oid)::bigint::text as table_bytes,
             pg_indexes_size(c.oid)::bigint::text as index_bytes
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where c.relkind in ('r', 'm', 'p')
         and n.nspname not in ('pg_catalog', 'information_schema')
         and n.nspname not like 'pg_toast%'
       order by pg_total_relation_size(c.oid) desc, n.nspname, c.relname
       limit $1
    `, [limit]);
    const tableStats = await client.query(`
      select schemaname as schema_name, relname as relation_name,
             n_live_tup::bigint::text as estimated_live_rows,
             n_dead_tup::bigint::text as estimated_dead_rows,
             last_autovacuum, last_autoanalyze
        from pg_stat_user_tables
    `);
    report = buildStorageBreakdownV1({ databaseBytes: database.rows[0]?.bytes, relations: relations.rows, tableStats: tableStats.rows });
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "storage_breakdown.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(outputDir, "STORAGE_BREAKDOWN.md"), renderStorageBreakdownMarkdownV1(report), "utf8");
  process.stdout.write(`${JSON.stringify({ database_bytes: report.database_bytes, relation_count: report.top_relations.length })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}