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
const AUDIT_VERSION = "SECURITY_ADVISOR_VIEW_AUTHORITY_PRODUCTION_READBACK_V1";
const MIGRATION_VERSION = "20260807133000";
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

async function viewContracts(client) {
  const result = await client.query(
    `select
       c.relname as view_name,
       coalesce(c.reloptions, array[]::text[]) as reloptions,
       cols.ordinal_position,
       cols.column_name,
       cols.data_type,
       cols.udt_name,
       cols.is_nullable
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     join information_schema.columns cols
       on cols.table_schema = n.nspname
      and cols.table_name = c.relname
     where n.nspname = 'public'
       and c.relkind = 'v'
       and c.relname = any($1::text[])
     order by c.relname, cols.ordinal_position`,
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

async function functionPosture(client) {
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
  await client.query("begin read only");
  try {
    const publicReads = [];
    await client.query("set local role anon");
    for (const view of PUBLIC_VIEWS) {
      const result = await client.query(
        `select count(*)::integer as bounded_count
         from (select 1 from public.${view} limit 1) sample`,
      );
      publicReads.push({
        view_name: view,
        bounded_count: result.rows[0].bounded_count,
      });
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
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      sample.rows[0].user_id,
    ]);
    await client.query("set local role authenticated");
    const pricing = await client.query(
      "select count(*)::integer as actual_count from public.v_vault_mobile_pricing_targets_v1",
    );
    await client.query("reset role");
    const privileges = await client.query(
      `select
         has_table_privilege('anon', 'public.v_vault_mobile_pricing_targets_v1', 'SELECT') as anon_pricing_select,
         has_table_privilege('authenticated', 'public.v_vault_mobile_pricing_targets_v1', 'SELECT') as authenticated_pricing_select`,
    );
    await client.query("rollback");
    return {
      anonymous_public_reads: publicReads,
      anonymous_pricing_select: privileges.rows[0].anon_pricing_select,
      authenticated_pricing_select:
        privileges.rows[0].authenticated_pricing_select,
      authenticated_pricing_expected_count: sample.rows[0].expected_count,
      authenticated_pricing_actual_count: pricing.rows[0].actual_count,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error("SUPABASE_DB_URL is required");
  const outPath = argValue("out");
  const commitSha = argValue("commit-sha");
  const preApplyPath = path.resolve(argValue("pre-apply"));
  const dryRunPath = path.resolve(argValue("dry-run"));
  if (!outPath) throw new Error("--out is required");
  if (!commitSha) throw new Error("--commit-sha is required");
  if (!argValue("pre-apply")) throw new Error("--pre-apply is required");
  if (!argValue("dry-run")) throw new Error("--dry-run is required");

  const preApply = JSON.parse(await fs.readFile(preApplyPath, "utf8"));
  const dryRun = JSON.parse(await fs.readFile(dryRunPath, "utf8"));
  const expectedFingerprints = Object.fromEntries(
    dryRun.view_fingerprints_before.map((row) => [row.view_name, row]),
  );

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  let contracts;
  let fingerprints;
  let functions;
  let smoke;
  let migrationRows;
  let unsafeFunctions;
  let grants;
  try {
    await client.query("begin read only");
    contracts = await viewContracts(client);
    fingerprints = await viewFingerprints(client);
    functions = await functionPosture(client);
    migrationRows = (
      await client.query(
        `select version
         from supabase_migrations.schema_migrations
         where version = $1`,
        [MIGRATION_VERSION],
      )
    ).rows;
    unsafeFunctions = (
      await client.query(
        `select p.proname
         from pg_catalog.pg_proc p
         join pg_catalog.pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.prosecdef = true
           and not exists (
             select 1
             from unnest(coalesce(p.proconfig, array[]::text[])) setting
             where setting like 'search_path=%'
           )`,
      )
    ).rows;
    grants = (
      await client.query(
        `select table_name, grantee, privilege_type
         from information_schema.role_table_grants
         where table_schema = 'public'
           and table_name = any($1::text[])
           and grantee in ('anon', 'authenticated', 'service_role')
         order by table_name, grantee, privilege_type`,
        [VIEWS],
      )
    ).rows;
    await client.query("rollback");
    smoke = await roleSmoke(client);
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original failure.
    }
    throw error;
  } finally {
    await client.end();
  }

  const currentColumns = contracts.map(
    ({ reloptions: _reloptions, ...column }) => column,
  );
  const currentFingerprints = Object.fromEntries(
    fingerprints.map((row) => [row.view_name, row]),
  );
  const expectedGrantKeys = new Set([
    ...PUBLIC_VIEWS.flatMap((view) =>
      ["anon", "authenticated", "service_role"].map(
        (role) => `${view}:${role}:SELECT`,
      ),
    ),
    "v_vault_mobile_pricing_targets_v1:authenticated:SELECT",
    "v_vault_mobile_pricing_targets_v1:service_role:SELECT",
  ]);
  const actualGrantKeys = new Set(
    grants.map(
      (grant) =>
        `${grant.table_name}:${grant.grantee}:${grant.privilege_type}`,
    ),
  );

  const checks = {
    migration_history_exact: migrationRows.length === 1,
    all_views_present:
      new Set(contracts.map((row) => row.view_name)).size === VIEWS.length,
    pre_apply_column_contract_preserved:
      JSON.stringify(preApply.columns) === JSON.stringify(currentColumns),
    all_views_security_invoker: contracts.every((row) =>
      row.reloptions.includes("security_invoker=true"),
    ),
    all_views_security_barrier: contracts.every((row) =>
      row.reloptions.includes("security_barrier=true"),
    ),
    pre_apply_row_counts_preserved: VIEWS.every(
      (view) =>
        expectedFingerprints[view].row_count ===
        currentFingerprints[view].row_count,
    ),
    pre_apply_row_fingerprints_preserved: VIEWS.every(
      (view) =>
        expectedFingerprints[view].row_fingerprint ===
        currentFingerprints[view].row_fingerprint,
    ),
    all_wrapper_functions_present: functions.length === FUNCTIONS.length,
    all_wrapper_functions_security_definer: functions.every(
      (row) => row.security_definer === true,
    ),
    all_wrapper_functions_fixed_path: functions.every((row) =>
      row.settings.includes("search_path=pg_catalog, public"),
    ),
    no_public_definer_function_without_fixed_path: unsafeFunctions.length === 0,
    exact_view_grants:
      actualGrantKeys.size === expectedGrantKeys.size &&
      [...expectedGrantKeys].every((key) => actualGrantKeys.has(key)),
    anonymous_public_reads_succeeded:
      smoke.anonymous_public_reads.length === PUBLIC_VIEWS.length,
    anonymous_pricing_denied: smoke.anonymous_pricing_select === false,
    authenticated_pricing_allowed:
      smoke.authenticated_pricing_select === true,
    authenticated_pricing_exact:
      smoke.authenticated_pricing_expected_count ===
      smoke.authenticated_pricing_actual_count,
  };
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const report = {
    audit_version: AUDIT_VERSION,
    as_of: new Date().toISOString(),
    status: failedChecks.length === 0 ? "passed" : "failed",
    completion_allowed: failedChecks.length === 0,
    frozen_commit_sha: commitSha,
    migration_version: MIGRATION_VERSION,
    checks,
    failed_checks: failedChecks,
    view_fingerprints: fingerprints,
    wrapper_function_posture: functions,
    view_grants: grants,
    role_smoke: smoke,
    evidence_inputs: {
      pre_apply_readback_sha256: sha256(await fs.readFile(preApplyPath)),
      guarded_dry_run_sha256: sha256(await fs.readFile(dryRunPath)),
    },
    boundaries: {
      database_writes: false,
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
  console.error(`[security-advisor-production-readback] ${error.stack || error.message}`);
  process.exitCode = 1;
});
