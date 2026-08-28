import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION_PATH = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260828021500_print_identity_search_visible_bound_v1.sql",
);
const AUDIT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "print_identity_search_visible_bound_v1",
);
const EXECUTE_FLAG = "--execute-rollback-only";
const FUNCTION_REGPROCEDURE =
  "public.search_print_identity_v1(text,text,text,text,integer,integer)";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function migrationBodyForRollback(migration) {
  const begin = migration.match(/\nbegin;\s*\n/i);
  assert.ok(begin, "migration begin boundary is missing");
  const body = migration.slice(begin.index + begin[0].length).replace(/\ncommit;\s*$/i, "");
  assert.doesNotMatch(body, /\bcommit\s*;/i, "rollback smoke cannot contain commit");
  assert.match(body, /create or replace function public\.search_print_identity_v1/i);
  return body;
}

async function readFunctionState(client) {
  const { rows } = await client.query(`
    select
      pg_get_function_identity_arguments(p.oid) as identity_arguments,
      pg_get_function_result(p.oid) as result_type,
      pg_get_functiondef(p.oid) as definition,
      p.proacl::text as acl,
      obj_description(p.oid, 'pg_proc') as comment
    from pg_proc p
    where p.oid = $1::regprocedure
  `, [FUNCTION_REGPROCEDURE]);
  assert.equal(rows.length, 1, "search function is missing");
  const row = rows[0];
  return {
    identity_arguments: row.identity_arguments,
    result_type: row.result_type,
    definition_sha256: sha256(row.definition),
    definition_bytes: Buffer.byteLength(row.definition),
    acl: row.acl,
    comment: row.comment,
  };
}

async function readLatestMigration(client) {
  const { rows } = await client.query(`
    select version, name
    from supabase_migrations.schema_migrations
    order by version desc
    limit 1
  `);
  assert.equal(rows.length, 1, "production migration ledger is empty");
  return rows[0];
}

async function selectProbe(client) {
  const { rows } = await client.query(`
    with classified as (
      select
        lower(cp.name) as query,
        count(*) filter (
          where lower(coalesce(game.code, '')) = 'pokemon'
             or control.release_status = 'public'
        )::integer as anonymous_visible,
        count(*) filter (
          where lower(coalesce(game.code, '')) <> 'pokemon'
            and coalesce(control.release_status, 'hidden') <> 'public'
        )::integer as anonymous_hidden
      from public.card_prints cp
      join public.games game on game.id = cp.game_id
      left join public.catalog_game_release_controls control
        on lower(control.game_code) = lower(game.code)
      where cp.gv_id is not null
        and cp.name is not null
        and length(trim(cp.name)) >= 3
      group by lower(cp.name)
    )
    select query, anonymous_visible, anonymous_hidden
    from classified
    where anonymous_visible > 0
      and anonymous_hidden > 0
    order by anonymous_hidden desc, anonymous_visible desc, query
    limit 1
  `);
  return rows[0] ?? {
    query: "Pikachu",
    anonymous_visible: null,
    anonymous_hidden: null,
    fallback: true,
  };
}

async function runProbe(client, query, role) {
  await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
  const { rows } = await client.query(`
    select
      result.parent_gv_id,
      result.printing_gv_id,
      result.display_name,
      game.code as game_code,
      public.catalog_parent_gv_id_visible_to_request_v1(result.parent_gv_id) as visible
    from public.search_print_identity_v1($1, null, null, null, 25, 0) result
    join public.card_prints cp on cp.gv_id = result.parent_gv_id
    join public.games game on game.id = cp.game_id
    order by result.rank_score desc, result.display_name, result.parent_gv_id
  `, [query]);
  assert.ok(rows.every((row) => row.visible === true), `${role} probe leaked a hidden row`);
  return {
    role,
    row_count: rows.length,
    game_codes: [...new Set(rows.map((row) => row.game_code))].sort(),
    sample: rows.slice(0, 5).map((row) => ({
      parent_gv_id: row.parent_gv_id,
      printing_gv_id: row.printing_gv_id,
      display_name: row.display_name,
      game_code: row.game_code,
    })),
  };
}

async function main() {
  assert.ok(process.argv.includes(EXECUTE_FLAG), `pass ${EXECUTE_FLAG}`);
  assert.ok(process.env.SUPABASE_DB_URL, "SUPABASE_DB_URL is required");

  const migration = await fs.readFile(MIGRATION_PATH, "utf8");
  const migrationBody = migrationBodyForRollback(migration);
  const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
  const startedAt = new Date().toISOString();

  await client.connect();
  let transactionOpen = false;
  try {
    const before = await readFunctionState(client);
    const ledgerBefore = await readLatestMigration(client);
    const probe = await selectProbe(client);

    await client.query("begin");
    transactionOpen = true;
    await client.query("set local statement_timeout = '120s'");
    await client.query(migrationBody);

    const transient = await readFunctionState(client);
    assert.match(transient.comment, /PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_V1/);
    assert.equal(transient.identity_arguments, before.identity_arguments);
    assert.equal(transient.result_type, before.result_type);
    assert.equal(transient.acl, before.acl);

    const probes = [
      await runProbe(client, probe.query, "anon"),
      await runProbe(client, probe.query, "authenticated"),
    ];

    await client.query("rollback");
    transactionOpen = false;

    const afterRollback = await readFunctionState(client);
    const ledgerAfter = await readLatestMigration(client);
    assert.deepEqual(afterRollback, before, "function state changed after rollback");
    assert.deepEqual(ledgerAfter, ledgerBefore, "migration ledger changed during rollback smoke");

    const proof = {
      version: "PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_ROLLBACK_PROOF_V1",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      execution_mode: "production_rollback_only",
      migration_path: path.relative(ROOT, MIGRATION_PATH).replaceAll("\\", "/"),
      migration_sha256: sha256(migration),
      migration_applied: false,
      durable_database_writes: false,
      transaction_rolled_back: true,
      ledger_before: ledgerBefore,
      ledger_after: ledgerAfter,
      function_before: before,
      function_transient: transient,
      function_after_rollback: afterRollback,
      probe_selection: probe,
      probes,
      boundaries: {
        table_writes: false,
        release_control_writes: false,
        storage_access: false,
        pricing_writes: false,
        publication_writes: false,
        vault_writes: false,
      },
    };

    await fs.mkdir(AUDIT_DIR, { recursive: true });
    const proofText = `${JSON.stringify(proof, null, 2)}\n`;
    await fs.writeFile(path.join(AUDIT_DIR, "rollback_proof.json"), proofText, "utf8");
    await fs.writeFile(
      path.join(AUDIT_DIR, "artifact_hashes.json"),
      `${JSON.stringify({
        version: proof.version,
        algorithm: "sha256",
        artifacts: [{ path: "rollback_proof.json", sha256: sha256(proofText) }],
      }, null, 2)}\n`,
      "utf8",
    );

    console.log(JSON.stringify({
      status: "rollback_proof_passed",
      migration_sha256: proof.migration_sha256,
      proof_sha256: sha256(proofText),
      query: probe.query,
      probes: probes.map(({ role, row_count, game_codes }) => ({ role, row_count, game_codes })),
      ledger_unchanged: true,
      function_restored: true,
    }, null, 2));
  } finally {
    if (transactionOpen) {
      await client.query("rollback").catch(() => {});
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
