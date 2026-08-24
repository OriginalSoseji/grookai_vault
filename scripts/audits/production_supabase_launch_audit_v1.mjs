import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const PACKAGE_ID = "PRODUCTION_SUPABASE_LAUNCH_AUDIT_V1";
const DEFAULT_OUT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "production_backend_launch_v1",
  "supabase",
);

function parseArgs(argv) {
  const outArg = argv.find((arg) => arg.startsWith("--out-dir="));
  return {
    outDir: path.resolve(outArg?.slice("--out-dir=".length) || DEFAULT_OUT_DIR),
  };
}

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? null;
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function numericEnv(name) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function safeError(error) {
  return {
    code: error?.code ?? null,
    message: error?.message ?? String(error),
  };
}

async function section(client, name, sql) {
  try {
    const result = await client.query(sql);
    return { name, status: "measured", rows: result.rows };
  } catch (error) {
    return { name, status: "unmeasured", rows: [], error: safeError(error) };
  }
}

function utilization(used, capacity) {
  if (!capacity) return null;
  return Number(used) / Number(capacity);
}

function finding(severity, code, detail, evidence = {}) {
  return { severity, code, detail, evidence };
}

function evaluate(sections, capacities) {
  const byName = Object.fromEntries(sections.map((item) => [item.name, item]));
  const findings = [];
  for (const item of sections.filter((candidate) => candidate.status === "unmeasured")) {
    findings.push(finding("unmeasured", `${item.name}_unmeasured`, item.error?.message ?? "Section could not be measured."));
  }

  const database = byName.database?.rows?.[0] ?? {};
  const connectionRatio = utilization(database.connection_count, database.max_connections);
  if (connectionRatio !== null && connectionRatio >= 0.8) {
    findings.push(finding("high", "database_connections_above_80_percent", "Database connections exceed the launch warning threshold.", { ratio: connectionRatio }));
  } else if (connectionRatio !== null && connectionRatio >= 0.7) {
    findings.push(finding("medium", "database_connections_above_70_percent", "Database connections exceed the launch target.", { ratio: connectionRatio }));
  }

  const databaseCapacityRatio = utilization(database.database_bytes, capacities.databaseBytes);
  if (databaseCapacityRatio === null) {
    findings.push(finding("unmeasured", "database_capacity_limit_unmeasured", "SUPABASE_DATABASE_CAPACITY_BYTES is not configured; absolute utilization cannot be computed."));
  } else if (databaseCapacityRatio >= 0.8) {
    findings.push(finding("high", "database_capacity_above_80_percent", "Database capacity exceeds the launch warning threshold.", { ratio: databaseCapacityRatio }));
  } else if (databaseCapacityRatio >= 0.7) {
    findings.push(finding("medium", "database_capacity_above_70_percent", "Database capacity exceeds the launch target.", { ratio: databaseCapacityRatio }));
  }

  const cacheRatio = Number(database.cache_hit_ratio);
  if (Number.isFinite(cacheRatio) && cacheRatio < 0.99) {
    findings.push(finding("medium", "database_cache_hit_below_99_percent", "Database cache-hit ratio is below the initial launch target.", { ratio: cacheRatio }));
  }

  const storage = byName.storage?.rows?.[0] ?? {};
  const storageCapacityRatio = utilization(storage.storage_bytes, capacities.storageBytes);
  if (storageCapacityRatio === null) {
    findings.push(finding("unmeasured", "storage_capacity_limit_unmeasured", "SUPABASE_STORAGE_CAPACITY_BYTES is not configured; absolute utilization cannot be computed."));
  } else if (storageCapacityRatio >= 0.8) {
    findings.push(finding("high", "storage_capacity_above_80_percent", "Storage capacity exceeds the launch warning threshold.", { ratio: storageCapacityRatio }));
  } else if (storageCapacityRatio >= 0.7) {
    findings.push(finding("medium", "storage_capacity_above_70_percent", "Storage capacity exceeds the launch target.", { ratio: storageCapacityRatio }));
  }

  const scalarChecks = [
    ["locks", "waiting_lock_count", "high", "database_waiting_locks", "Database sessions are waiting on locks."],
    ["long_queries", "long_query_count", "high", "database_long_queries", "Database queries have exceeded five minutes."],
    ["invalid_indexes", "invalid_index_count", "high", "database_invalid_indexes", "Invalid or not-ready indexes are present."],
    ["rls", "exposed_without_rls_count", "critical", "exposed_tables_without_rls", "Anon or authenticated roles can access public tables without RLS."],
    ["functions", "unsafe_definer_count", "high", "unsafe_security_definer_functions", "Security-definer functions without a fixed search_path are present."],
  ];
  for (const [sectionName, key, severity, code, detail] of scalarChecks) {
    const value = Number(byName[sectionName]?.rows?.[0]?.[key] ?? 0);
    if (value > 0) findings.push(finding(severity, code, detail, { count: value }));
  }

  findings.push(finding("unmeasured", "managed_backup_restore_unmeasured", "Managed backup retention, PITR, and restore exercise require control-plane verification."));
  const blockers = findings.filter((item) => ["critical", "high"].includes(item.severity));
  const warnings = findings.filter((item) => item.severity === "medium");
  const unmeasured = findings.filter((item) => item.severity === "unmeasured");
  return {
    status: blockers.length ? "failed" : warnings.length || unmeasured.length ? "incomplete" : "healthy",
    findings,
    summary: {
      critical: findings.filter((item) => item.severity === "critical").length,
      high: findings.filter((item) => item.severity === "high").length,
      medium: warnings.length,
      unmeasured: unmeasured.length,
    },
    metrics: {
      connection_utilization: connectionRatio,
      database_capacity_utilization: databaseCapacityRatio,
      storage_capacity_utilization: storageCapacityRatio,
    },
  };
}

function markdown(report) {
  return [
    `# ${PACKAGE_ID}`,
    "",
    `- Observed: \`${report.observed_at}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Fingerprint: \`${report.report_fingerprint_sha256}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((item) => `- **${item.severity.toUpperCase()} ${item.code}:** ${item.detail}`)
      : ["- none"]),
    "",
    "## Boundaries",
    "",
    "- Database transaction: read only",
    "- Database writes: none",
    "- Storage writes: none",
    "- RLS or grants changed: no",
    "- Backup/PITR state inferred from SQL: no",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) throw new Error("SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required");
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    application_name: "production_supabase_launch_audit_v1",
  });
  await client.connect();
  let sections;
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout = '30s'");
    await client.query("set local lock_timeout = '5s'");
    sections = await Promise.all([
      section(client, "database", `
        select pg_database_size(current_database())::bigint as database_bytes,
               current_setting('max_connections')::integer as max_connections,
               (select count(*)::integer from pg_stat_activity) as connection_count,
               case when (blks_hit + blks_read) = 0 then null
                    else round(blks_hit::numeric / (blks_hit + blks_read), 6) end as cache_hit_ratio,
               xact_commit::bigint,
               xact_rollback::bigint,
               deadlocks::bigint,
               temp_bytes::bigint
          from pg_stat_database
         where datname = current_database()`),
      section(client, "locks", `
        select count(*)::integer as waiting_lock_count
          from pg_stat_activity
         where pid <> pg_backend_pid()
           and wait_event_type = 'Lock'`),
      section(client, "long_queries", `
        select count(*)::integer as long_query_count
          from pg_stat_activity
         where pid <> pg_backend_pid()
           and state <> 'idle'
           and query_start < now() - interval '5 minutes'`),
      section(client, "invalid_indexes", `
        select count(*)::integer as invalid_index_count
          from pg_index
         where not indisvalid or not indisready`),
      section(client, "rls", `
        select count(*)::integer as exposed_without_rls_count
          from pg_class relation
          join pg_namespace namespace on namespace.oid = relation.relnamespace
         where namespace.nspname = 'public'
           and relation.relkind in ('r', 'p')
           and not relation.relrowsecurity
           and (
             has_table_privilege('anon', relation.oid, 'select,insert,update,delete')
             or has_table_privilege('authenticated', relation.oid, 'select,insert,update,delete')
           )`),
      section(client, "functions", `
        select count(*)::integer as unsafe_definer_count
          from pg_proc function_row
          join pg_namespace namespace on namespace.oid = function_row.pronamespace
         where namespace.nspname = 'public'
           and function_row.prosecdef
           and not exists (
             select 1 from unnest(coalesce(function_row.proconfig, array[]::text[])) setting
              where setting like 'search_path=%'
           )`),
      section(client, "storage", `
        select count(*)::bigint as storage_object_count,
               coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)::bigint as storage_bytes,
               count(distinct bucket_id)::integer as storage_bucket_count
          from storage.objects`),
      section(client, "largest_relations", `
        select namespace.nspname as schema_name,
               relation.relname as relation_name,
               pg_total_relation_size(relation.oid)::bigint as total_bytes,
               pg_relation_size(relation.oid)::bigint as table_bytes,
               pg_indexes_size(relation.oid)::bigint as index_bytes
          from pg_class relation
          join pg_namespace namespace on namespace.oid = relation.relnamespace
         where relation.relkind in ('r', 'p', 'm')
           and namespace.nspname in ('public', 'storage', 'auth')
         order by pg_total_relation_size(relation.oid) desc
         limit 30`),
      section(client, "table_health", `
        select schemaname as schema_name,
               relname as relation_name,
               n_live_tup::bigint,
               n_dead_tup::bigint,
               case when n_live_tup = 0 then null
                    else round(n_dead_tup::numeric / n_live_tup, 6) end as dead_tuple_ratio,
               last_autovacuum,
               last_autoanalyze
          from pg_stat_user_tables
         order by n_dead_tup desc
         limit 30`),
      section(client, "migration_head", `
        select version, name
          from supabase_migrations.schema_migrations
         order by version desc
         limit 10`),
    ]);
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  const observedAt = new Date().toISOString();
  const capacities = {
    databaseBytes: numericEnv("SUPABASE_DATABASE_CAPACITY_BYTES"),
    storageBytes: numericEnv("SUPABASE_STORAGE_CAPACITY_BYTES"),
  };
  const evaluation = evaluate(sections, capacities);
  const body = {
    package_id: PACKAGE_ID,
    observed_at: observedAt,
    ...evaluation,
    capacities: {
      database_bytes: capacities.databaseBytes,
      storage_bytes: capacities.storageBytes,
    },
    sections,
    boundaries: {
      database_transaction_read_only: true,
      database_writes: false,
      storage_writes: false,
      authority_changes: false,
      user_data_writes: false,
    },
  };
  const report = {
    ...body,
    report_fingerprint_sha256: sha256(body),
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, "production_supabase_launch_audit_v1.json");
  const markdownPath = path.join(args.outDir, "PRODUCTION_SUPABASE_LAUNCH_AUDIT_V1.md");
  await Promise.all([
    fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(markdownPath, markdown(report)),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(`${JSON.stringify(report, null, 2)}\n`)}  ${path.basename(jsonPath)}\n`),
  ]);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    summary: report.summary,
    metrics: report.metrics,
    report_fingerprint_sha256: report.report_fingerprint_sha256,
    artifacts: { json: jsonPath, markdown: markdownPath },
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[production-supabase-launch-audit] ${error.stack || error.message}`);
  process.exitCode = 1;
});
