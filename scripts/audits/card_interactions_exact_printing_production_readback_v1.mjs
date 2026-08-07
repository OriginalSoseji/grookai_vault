import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const MIGRATION_VERSION = "20260806220000";
const MIGRATION_PATH = path.join(
  "supabase",
  "migrations",
  `${MIGRATION_VERSION}_card_interactions_exact_printing_v1.sql`,
);
const OUTPUT_PATH = path.join(
  "docs",
  "audits",
  "release_completion_v1",
  "card_interactions_exact_printing_production_readback_v1.json",
);

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DB_URL is required");
}

const migrationBytes = await fs.readFile(MIGRATION_PATH);
const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function rows(query, values = []) {
  const result = await client.query(query, values);
  return result.rows;
}

try {
  await client.connect();
  await client.query("begin read only");

  const migrationHistory = await rows(
      `select version, name
       from supabase_migrations.schema_migrations
       where version = $1`,
      [MIGRATION_VERSION],
    );
  const columns = await rows(
      `select table_name, column_name, data_type, is_nullable
       from information_schema.columns
       where table_schema = 'public'
         and table_name in (
           'card_interactions',
           'card_interaction_group_states',
           'v_card_contact_targets_v1'
         )
         and column_name = 'card_printing_id'
       order by table_name`,
    );
  const constraints = await rows(
      `select c.conname as constraint_name,
              c.contype as constraint_type,
              pg_get_constraintdef(c.oid) as definition
       from pg_constraint c
       join pg_class r on r.oid = c.conrelid
       join pg_namespace n on n.oid = r.relnamespace
       where n.nspname = 'public'
         and r.relname in ('card_interactions', 'card_interaction_group_states')
         and (
           c.conname like '%card_printing%'
           or c.conname = 'card_interaction_group_states_identity_key'
         )
       order by r.relname, c.conname`,
    );
  const triggers = await rows(
      `select event_object_table as table_name,
              trigger_name,
              action_timing,
              event_manipulation
       from information_schema.triggers
       where trigger_schema = 'public'
         and event_object_table in (
           'card_interactions',
           'card_interaction_group_states'
         )
         and trigger_name not like 'RI_ConstraintTrigger_%'
       order by table_name, trigger_name, event_manipulation`,
    );
  const functions = await rows(
      `select p.proname as function_name,
              obj_description(p.oid, 'pg_proc') as comment,
              encode(sha256(pg_get_functiondef(p.oid)::bytea), 'hex') as definition_sha256
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname in (
           'card_interactions_enforce_printing_parent_v1',
           'sync_card_interaction_group_states_v1'
         )
       order by p.proname`,
    );
  const grants = await rows(
      `select table_name, grantee, privilege_type
       from information_schema.role_table_grants
       where table_schema = 'public'
         and table_name in (
           'card_interactions',
           'card_interaction_group_states',
           'v_card_contact_targets_v1'
         )
         and grantee in ('anon', 'authenticated')
       order by table_name, grantee, privilege_type`,
    );
  const policies = await rows(
      `select tablename, policyname, roles, cmd
       from pg_policies
       where schemaname = 'public'
         and tablename in ('card_interactions', 'card_interaction_group_states')
       order by tablename, policyname`,
    );
  const relationSecurity = await rows(
      `select relname as relation_name,
              relrowsecurity as rls_enabled,
              relforcerowsecurity as rls_forced
       from pg_class
       join pg_namespace on pg_namespace.oid = pg_class.relnamespace
       where pg_namespace.nspname = 'public'
         and relname in ('card_interactions', 'card_interaction_group_states')
       order by relname`,
    );
  const rowCounts = await rows(
      `select
         (select count(*)::int from public.card_interactions) as interactions_total,
         (select count(*)::int from public.card_interactions where card_printing_id is not null) as interactions_exact,
         (select count(*)::int from public.card_interactions where card_printing_id is null) as interactions_legacy_or_unassigned,
         (select count(*)::int from public.card_interaction_group_states) as group_states_total,
         (select count(*)::int from public.card_interaction_group_states where card_printing_id is not null) as group_states_exact,
         (select count(*)::int from public.card_interaction_group_states where card_printing_id is null) as group_states_legacy_or_unassigned`,
    );
  const integrity = await rows(
      `select
         (select count(*)::int
          from public.card_interactions ci
          join public.card_printings cp on cp.id = ci.card_printing_id
          where ci.card_printing_id is not null
            and cp.card_print_id is distinct from ci.card_print_id) as invalid_interaction_parent_links,
         (select count(*)::int
          from public.card_interaction_group_states gs
          join public.card_printings cp on cp.id = gs.card_printing_id
          where gs.card_printing_id is not null
            and cp.card_print_id is distinct from gs.card_print_id) as invalid_group_state_parent_links,
         (select count(*)::int
          from (
            select user_id, card_print_id, card_printing_id, counterpart_user_id
            from public.card_interaction_group_states
            group by user_id, card_print_id, card_printing_id, counterpart_user_id
            having count(*) > 1
          ) duplicates) as duplicate_group_state_identity_tuples`,
    );
  const contactTargets = await rows(
      `select
         count(*)::int as contact_targets_total,
         count(*) filter (where card_printing_id is not null)::int as contact_targets_with_exact_printing
       from public.v_card_contact_targets_v1`,
    );

  await client.query("rollback");

  const proof = {
    schema_version: "CARD_INTERACTIONS_EXACT_PRINTING_PRODUCTION_READBACK_V1",
    recorded_at: new Date().toISOString(),
    source_commit_sha: commitSha,
    migration: {
      version: MIGRATION_VERSION,
      path: MIGRATION_PATH.replaceAll("\\", "/"),
      sha256: crypto.createHash("sha256").update(migrationBytes).digest("hex"),
      history: migrationHistory,
    },
    columns,
    constraints,
    triggers,
    functions,
    grants,
    policies,
    relation_security: relationSecurity,
    row_counts: rowCounts[0] ?? null,
    integrity: integrity[0] ?? null,
    contact_targets: contactTargets[0] ?? null,
    boundaries: {
      transaction_mode: "read_only",
      existing_rows_updated: 0,
      legacy_printing_identity_inferred: false,
      canonical_identity_mutated: false,
      vault_ownership_mutated: false,
      pricing_mutated: false,
    },
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(proof, null, 2));
} catch (error) {
  try {
    await client.query("rollback");
  } catch {}
  throw error;
} finally {
  await client.end();
}
