import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20260807133000_security_advisor_view_authority_hardening_v1.sql",
);
const AUDIT_VERSION = "SECURITY_ADVISOR_VIEW_AUTHORITY_GUARDED_DRY_RUN_V1";
const VIEWS = Object.freeze([
  "v_card_stream_v1",
  "v_wall_cards_v1",
  "v_section_cards_v1",
  "v_card_contact_targets_v1",
  "v_vault_mobile_pricing_targets_v1",
]);
const PUBLIC_VIEWS = Object.freeze(VIEWS.slice(0, 4));
const FUNCTIONS = Object.freeze([
  "card_stream_rows_v2",
  "wall_card_rows_v2",
  "section_card_rows_v2",
  "card_contact_target_rows_for_current_viewer_v2",
  "vault_mobile_pricing_target_rows_for_current_user_v2",
]);

function argValue(name) {
  return (
    process.argv
      .slice(2)
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? ""
  );
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function migrationBody(sql) {
  const lines = sql.split(/\r?\n/);
  const beginIndex = lines.findIndex((line) => line.trim().toLowerCase() === "begin;");
  const commitIndex = lines.findLastIndex(
    (line) => line.trim().toLowerCase() === "commit;",
  );
  if (beginIndex < 0 || commitIndex <= beginIndex) {
    throw new Error("migration must contain one explicit begin/commit envelope");
  }
  if (
    lines.filter((line) => line.trim().toLowerCase() === "begin;").length !== 1 ||
    lines.filter((line) => line.trim().toLowerCase() === "commit;").length !== 1
  ) {
    throw new Error("migration transaction envelope is ambiguous");
  }
  return lines.slice(beginIndex + 1, commitIndex).join("\n");
}

async function viewContracts(client) {
  const result = await client.query(
    `select
       c.relname as view_name,
       coalesce(c.reloptions, array[]::text[]) as reloptions,
       jsonb_agg(
         jsonb_build_object(
           'ordinal_position', cols.ordinal_position,
           'column_name', cols.column_name,
           'udt_name', cols.udt_name,
           'is_nullable', cols.is_nullable
         ) order by cols.ordinal_position
       ) as columns
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     join information_schema.columns cols
       on cols.table_schema = n.nspname
      and cols.table_name = c.relname
     where n.nspname = 'public'
       and c.relkind = 'v'
       and c.relname = any($1::text[])
     group by c.relname, c.reloptions
     order by c.relname`,
    [VIEWS],
  );
  return result.rows;
}

async function viewFingerprints(client) {
  const rows = [];
  for (const view of VIEWS) {
    const result = await client.query(
      `select
         count(*)::integer as row_count,
         md5(coalesce(string_agg(row_hash, '' order by row_hash), '')) as row_fingerprint
       from (
         select md5(row_to_json(source_row)::text) as row_hash
         from public.${view} source_row
       ) hashed`,
    );
    rows.push({ view_name: view, ...result.rows[0] });
  }
  return rows;
}

async function wrapperFunctionPosture(client) {
  const result = await client.query(
    `select
       p.proname as function_name,
       p.prosecdef as security_definer,
       coalesce(p.proconfig, array[]::text[]) as settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = any($1::text[])
       and pg_get_function_identity_arguments(p.oid) = ''
     order by p.proname`,
    [FUNCTIONS],
  );
  return result.rows;
}

async function roleSmoke(client) {
  const publicReads = [];
  await client.query("set local role anon");
  for (const view of PUBLIC_VIEWS) {
    const result = await client.query(
      `select count(*)::integer as bounded_count
       from (select 1 from public.${view} limit 1) sample`,
    );
    publicReads.push({ view_name: view, bounded_count: result.rows[0].bounded_count });
  }
  await client.query("reset role");

  const sample = await client.query(
    `select vii.user_id,
            count(*)::integer as expected_count
     from public.vault_item_instances vii
     where vii.archived_at is null
       and vii.slab_cert_id is null
       and vii.card_print_id is not null
     group by vii.user_id
     order by count(*) desc, vii.user_id
     limit 1`,
  );
  if (sample.rowCount !== 1) {
    throw new Error("no active raw vault owner exists for authenticated pricing smoke");
  }
  const expectedCount = sample.rows[0].expected_count;
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
    sample.rows[0].user_id,
  ]);
  await client.query("set local role authenticated");
  const pricing = await client.query(
    `select count(*)::integer as actual_count
     from public.v_vault_mobile_pricing_targets_v1`,
  );
  await client.query("reset role");

  const privileges = await client.query(
    `select
       has_table_privilege('anon', 'public.v_vault_mobile_pricing_targets_v1', 'SELECT') as anon_pricing_select,
       has_table_privilege('authenticated', 'public.v_vault_mobile_pricing_targets_v1', 'SELECT') as authenticated_pricing_select`,
  );
  return {
    anonymous_public_reads: publicReads,
    anonymous_pricing_select: privileges.rows[0].anon_pricing_select,
    authenticated_pricing_select:
      privileges.rows[0].authenticated_pricing_select,
    authenticated_pricing_expected_count: expectedCount,
    authenticated_pricing_actual_count: pricing.rows[0].actual_count,
  };
}

async function functionsPresent(client) {
  const result = await client.query(
    `select count(*)::integer as function_count
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = any($1::text[])
       and pg_get_function_identity_arguments(p.oid) = ''`,
    [FUNCTIONS],
  );
  return result.rows[0].function_count;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error("SUPABASE_DB_URL is required");
  const outPath = argValue("out");
  if (!outPath) throw new Error("--out is required");

  const migrationSql = await fs.readFile(MIGRATION_PATH, "utf8");
  const body = migrationBody(migrationSql);
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let beforeContracts;
  let beforeFingerprints;
  let afterContracts;
  let afterFingerprints;
  let functionPosture;
  let smoke;
  try {
    beforeContracts = await viewContracts(client);
    beforeFingerprints = await viewFingerprints(client);

    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(body);

    afterContracts = await viewContracts(client);
    afterFingerprints = await viewFingerprints(client);
    functionPosture = await wrapperFunctionPosture(client);
    smoke = await roleSmoke(client);
    await client.query("rollback");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original failure.
    }
    throw error;
  }

  const postRollbackContracts = await viewContracts(client);
  const postRollbackFunctionCount = await functionsPresent(client);
  await client.end();

  const beforeColumns = Object.fromEntries(
    beforeContracts.map((row) => [row.view_name, row.columns]),
  );
  const afterColumns = Object.fromEntries(
    afterContracts.map((row) => [row.view_name, row.columns]),
  );
  const beforeRows = Object.fromEntries(
    beforeFingerprints.map((row) => [row.view_name, row]),
  );
  const afterRows = Object.fromEntries(
    afterFingerprints.map((row) => [row.view_name, row]),
  );

  const checks = {
    all_views_present: afterContracts.length === VIEWS.length,
    column_contracts_unchanged:
      JSON.stringify(beforeColumns) === JSON.stringify(afterColumns),
    row_counts_unchanged: VIEWS.every(
      (view) => beforeRows[view].row_count === afterRows[view].row_count,
    ),
    row_fingerprints_unchanged: VIEWS.every(
      (view) =>
        beforeRows[view].row_fingerprint === afterRows[view].row_fingerprint,
    ),
    all_views_security_invoker: afterContracts.every((row) =>
      row.reloptions.includes("security_invoker=true"),
    ),
    all_views_security_barrier: afterContracts.every((row) =>
      row.reloptions.includes("security_barrier=true"),
    ),
    all_wrapper_functions_present: functionPosture.length === FUNCTIONS.length,
    all_wrapper_functions_security_definer: functionPosture.every(
      (row) => row.security_definer === true,
    ),
    all_wrapper_functions_fixed_path: functionPosture.every((row) =>
      row.settings.includes("search_path=pg_catalog, public"),
    ),
    anonymous_public_reads_succeeded:
      smoke.anonymous_public_reads.length === PUBLIC_VIEWS.length,
    anonymous_pricing_denied: smoke.anonymous_pricing_select === false,
    authenticated_pricing_allowed:
      smoke.authenticated_pricing_select === true,
    authenticated_pricing_exact:
      smoke.authenticated_pricing_expected_count ===
      smoke.authenticated_pricing_actual_count,
    rollback_restored_view_contracts:
      JSON.stringify(beforeContracts) === JSON.stringify(postRollbackContracts),
    rollback_removed_wrapper_functions: postRollbackFunctionCount === 0,
  };
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const report = {
    audit_version: AUDIT_VERSION,
    as_of: new Date().toISOString(),
    status: failedChecks.length === 0 ? "passed" : "failed",
    completion_allowed: failedChecks.length === 0,
    migration: path.relative(REPO_ROOT, MIGRATION_PATH).replace(/\\/g, "/"),
    migration_sha256: sha256(migrationSql),
    checks,
    failed_checks: failedChecks,
    view_fingerprints_before: beforeFingerprints,
    view_fingerprints_inside_transaction: afterFingerprints,
    wrapper_function_posture: functionPosture,
    role_smoke: smoke,
    post_rollback: {
      wrapper_function_count: postRollbackFunctionCount,
      original_view_contracts_restored: checks.rollback_restored_view_contracts,
    },
    boundaries: {
      transaction_ended_with_rollback: true,
      persistent_database_writes: false,
      collector_identifiers_emitted: false,
      row_content_emitted: false,
    },
  };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const resolved = path.resolve(outPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, json);
  await fs.writeFile(`${resolved}.sha256`, `${sha256(json)}  ${path.basename(resolved)}\n`);
  process.stdout.write(
    `${JSON.stringify(
      {
        status: report.status,
        completion_allowed: report.completion_allowed,
        failed_checks: report.failed_checks,
        artifact: path.relative(REPO_ROOT, resolved).replace(/\\/g, "/"),
      },
      null,
      2,
    )}\n`,
  );
  if (!report.completion_allowed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[security-advisor-guarded-dry-run] ${error.stack || error.message}`);
  process.exitCode = 1;
});
