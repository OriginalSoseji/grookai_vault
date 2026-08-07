import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const AUDIT_VERSION = "RELEASE_SECURITY_ADVISOR_VIEWS_READBACK_V1";
const TARGET_VIEWS = Object.freeze([
  "v_card_stream_v1",
  "v_wall_cards_v1",
  "v_section_cards_v1",
  "v_card_contact_targets_v1",
  "v_vault_mobile_pricing_targets_v1",
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

async function query(client, text, values = []) {
  return (await client.query({ text, values })).rows;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error("SUPABASE_DB_URL is required");

  const outPath = argValue("out");
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let report;
  try {
    await client.query("begin read only");

    const views = await query(
      client,
      `select
         c.relname as view_name,
         pg_get_userbyid(c.relowner) as owner_name,
         coalesce(c.reloptions, array[]::text[]) as reloptions,
         coalesce(c.relacl::text, '') as acl,
         pg_get_viewdef(c.oid, true) as definition
       from pg_catalog.pg_class c
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relkind = 'v'
         and c.relname = any($1::text[])
       order by c.relname`,
      [TARGET_VIEWS],
    );

    const columns = await query(
      client,
      `select
         table_name as view_name,
         ordinal_position,
         column_name,
         data_type,
         udt_name,
         is_nullable
       from information_schema.columns
       where table_schema = 'public'
         and table_name = any($1::text[])
       order by table_name, ordinal_position`,
      [TARGET_VIEWS],
    );

    const dependencies = await query(
      client,
      `select distinct
         v.relname as view_name,
         dn.nspname as dependency_schema,
         d.relname as dependency_name,
         d.relkind as dependency_kind,
         d.relrowsecurity as rls_enabled,
         d.relforcerowsecurity as rls_forced
       from pg_catalog.pg_class v
       join pg_catalog.pg_namespace vn on vn.oid = v.relnamespace
       join pg_catalog.pg_rewrite rw on rw.ev_class = v.oid
       join pg_catalog.pg_depend dep on dep.objid = rw.oid
       join pg_catalog.pg_class d on d.oid = dep.refobjid
       join pg_catalog.pg_namespace dn on dn.oid = d.relnamespace
       where vn.nspname = 'public'
         and v.relkind = 'v'
         and v.relname = any($1::text[])
         and d.oid <> v.oid
       order by v.relname, dn.nspname, d.relname`,
      [TARGET_VIEWS],
    );

    const dependencyNames = [
      ...new Set(
        dependencies
          .filter((row) => row.dependency_schema === "public")
          .map((row) => row.dependency_name),
      ),
    ].sort();

    const policies = dependencyNames.length
      ? await query(
          client,
          `select
             schemaname,
             tablename,
             policyname,
             permissive,
             roles,
             cmd,
             qual,
             with_check
           from pg_catalog.pg_policies
           where schemaname = 'public'
             and tablename = any($1::text[])
           order by tablename, policyname`,
          [dependencyNames],
        )
      : [];

    const grants = await query(
      client,
      `select
         table_name,
         grantee,
         privilege_type,
         is_grantable
       from information_schema.role_table_grants
       where table_schema = 'public'
         and (table_name = any($1::text[]) or table_name = any($2::text[]))
         and grantee in ('anon', 'authenticated', 'service_role')
       order by table_name, grantee, privilege_type`,
      [TARGET_VIEWS, dependencyNames],
    );

    const securityDefinerFunctionsWithoutFixedPath = await query(
      client,
      `select
         n.nspname as function_schema,
         p.proname as function_name,
         pg_get_function_identity_arguments(p.oid) as identity_arguments
       from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prosecdef = true
         and not exists (
           select 1
           from unnest(coalesce(p.proconfig, array[]::text[])) setting
           where setting like 'search_path=%'
         )
       order by p.proname, pg_get_function_identity_arguments(p.oid)`,
    );

    await client.query("rollback");

    const missingViews = TARGET_VIEWS.filter(
      (target) => !views.some((view) => view.view_name === target),
    );
    const securityDefinerViews = views
      .filter(
        (view) =>
          !view.reloptions.some((option) => option === "security_invoker=true"),
      )
      .map((view) => view.view_name);

    report = {
      audit_version: AUDIT_VERSION,
      as_of: new Date().toISOString(),
      mode: "read_only_metadata",
      status:
        missingViews.length === 0 &&
        securityDefinerViews.length === 0 &&
        securityDefinerFunctionsWithoutFixedPath.length === 0
          ? "passed"
          : "needs_remediation",
      summary: {
        target_view_count: TARGET_VIEWS.length,
        found_view_count: views.length,
        missing_view_count: missingViews.length,
        security_definer_view_count: securityDefinerViews.length,
        security_definer_function_without_fixed_path_count:
          securityDefinerFunctionsWithoutFixedPath.length,
      },
      missing_views: missingViews,
      security_definer_views: securityDefinerViews,
      views,
      columns,
      dependencies,
      policies,
      grants,
      security_definer_functions_without_fixed_path:
        securityDefinerFunctionsWithoutFixedPath,
      boundaries: {
        database_writes: false,
        collector_rows_selected: false,
        credentials_emitted: false,
      },
    };
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

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outPath) {
    const resolved = path.resolve(outPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, json);
    await fs.writeFile(`${resolved}.sha256`, `${sha256(json)}  ${path.basename(resolved)}\n`);
  }
  process.stdout.write(json);
}

main().catch((error) => {
  console.error(`[release-security-advisor-readback] ${error.stack || error.message}`);
  process.exitCode = 1;
});
