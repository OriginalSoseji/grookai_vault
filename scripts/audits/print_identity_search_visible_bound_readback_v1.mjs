import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_DIR = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "print_identity_search_visible_bound_v1",
);
const MIGRATION_PATH = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260828021500_print_identity_search_visible_bound_v1.sql",
);
const RECORDED_READBACK_PATH = path.join(AUDIT_DIR, "apply_readback.json");
const FUNCTION_REGPROCEDURE =
  "public.search_print_identity_v1(text,text,text,text,integer,integer)";
const EXPECTED_FUNCTION_SHA256 =
  "18298b24d75efe5fda01c8242ed132ec6e1fc65226d02ac64bbb7f1a54eb5fbd";
const EXPECTED_ACL =
  "{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

async function runProbe(client, role) {
  await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
  const { rows } = await client.query(`
    select
      result.parent_gv_id,
      result.printing_gv_id,
      result.display_name,
      game.code as game_code,
      public.catalog_parent_gv_id_visible_to_request_v1(result.parent_gv_id) as visible
    from public.search_print_identity_v1('golem', null, null, null, 25, 0) result
    join public.card_prints cp on cp.gv_id = result.parent_gv_id
    join public.games game on game.id = cp.game_id
    order by result.rank_score desc, result.display_name, result.parent_gv_id
  `);
  assert.ok(rows.every((row) => row.visible === true), `${role} probe leaked a hidden row`);
  return {
    role,
    row_count: rows.length,
    game_codes: [...new Set(rows.map((row) => row.game_code))].sort(),
    sample_parent_gv_ids: rows.slice(0, 5).map((row) => row.parent_gv_id),
  };
}

async function main() {
  assert.ok(process.argv.includes("--read-only"), "pass --read-only");
  assert.ok(process.env.SUPABASE_DB_URL, "SUPABASE_DB_URL is required");
  const migration = await fs.readFile(MIGRATION_PATH, "utf8");
  const recordedReadback = JSON.parse(
    await fs.readFile(RECORDED_READBACK_PATH, "utf8"),
  );
  const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();

  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout = '120s'");

    const { rows: latestRows } = await client.query(`
      select version, name, coalesce(array_length(statements, 1), 0)::integer as statement_count
      from supabase_migrations.schema_migrations
      order by version desc
      limit 1
    `);
    assert.deepEqual(latestRows[0], {
      version: "20260828021500",
      name: "print_identity_search_visible_bound_v1",
      statement_count: latestRows[0].statement_count,
    });
    assert.ok(latestRows[0].statement_count > 0, "migration statements were not recorded");

    const { rows: ledgerRows } = await client.query(`
      select version, name, statements
      from supabase_migrations.schema_migrations
      where version = '20260828021500'
    `);
    assert.equal(ledgerRows.length, 1, "applied migration ledger row is missing or duplicated");

    const functionState = await readFunctionState(client);
    assert.equal(functionState.definition_sha256, EXPECTED_FUNCTION_SHA256);
    assert.equal(functionState.acl, EXPECTED_ACL);
    assert.match(functionState.comment, /^PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_V1/);

    const probes = [
      await runProbe(client, "anon"),
      await runProbe(client, "authenticated"),
      await runProbe(client, "service_role"),
    ];
    assert.deepEqual(probes[0].game_codes, ["pokemon"]);
    assert.ok(probes[1].game_codes.includes("mtg"));
    assert.ok(probes[2].game_codes.includes("mtg"));

    await client.query("rollback");

    const readback = {
      version: "PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_APPLY_READBACK_V1",
      recorded_at: recordedReadback.recorded_at,
      source_commit: recordedReadback.source_commit,
      execution_mode: "production_read_only",
      migration: {
        version: ledgerRows[0].version,
        name: ledgerRows[0].name,
        file_sha256: sha256(migration),
        ledger_statement_count: ledgerRows[0].statements.length,
        ledger_statement_sha256: ledgerRows[0].statements.map((statement) => sha256(statement)),
      },
      latest_migration: latestRows[0],
      function: functionState,
      probes,
      reconciliation: {
        expected_function_hash_matches: true,
        expected_acl_matches: true,
        expected_comment_matches: true,
        migration_ledger_row_exactly_once: true,
        result_visibility_failures: 0,
      },
      database_writes_during_readback: false,
    };

    assert.deepEqual(
      readback,
      recordedReadback,
      "production readback no longer matches the immutable recorded evidence",
    );
    console.log(JSON.stringify({
      status: "immutable_apply_readback_verified",
      latest_migration: readback.latest_migration,
      function_sha256: functionState.definition_sha256,
      probes: probes.map(({ role, row_count, game_codes }) => ({ role, row_count, game_codes })),
      reconciliation: readback.reconciliation,
    }, null, 2));
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
