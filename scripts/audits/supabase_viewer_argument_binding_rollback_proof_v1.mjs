import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const PACKAGE_ID = "SUPABASE_VIEWER_ARGUMENT_BINDING_ROLLBACK_PROOF_V1";
const DEFAULT_MIGRATION =
  "supabase/migrations/20260731211500_security_advisor_viewer_argument_binding_v1.sql";

const signatures = [
  "public.interest_graph_collectors_visible_to_viewer_v1(uuid,uuid,uuid)",
  "public.interest_graph_card_event_visible_to_viewer_v1(uuid,uuid,uuid,text)",
  "public.card_events_resolve_visibility_v1(text,uuid,text,jsonb)",
  "public.local_community_collector_visible_to_viewer_v1(uuid,uuid)",
  "public.trust_block_exists_between_v1(uuid,uuid)",
  "public.binder_card_event_visible_to_viewer_v1(uuid,text,uuid,uuid,uuid,text,jsonb,text)",
];

function parseArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function loadPg(envPath) {
  for (const root of [process.cwd(), path.dirname(envPath)]) {
    const packagePath = path.join(root, "package.json");
    if (!fs.existsSync(packagePath)) continue;
    try {
      return createRequire(packagePath)("pg");
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error("The pg package is required");
}

function migrationBody(migrationPath) {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const beginIndex = sql.search(/\bbegin\s*;/i);
  const commitIndex = sql.search(/\bcommit\s*;\s*$/i);
  assert.ok(beginIndex >= 0 && commitIndex > beginIndex, "migration must have one outer transaction");
  return sql
    .slice(sql.indexOf(";", beginIndex) + 1, commitIndex)
    .replace(/notify\s+pgrst\s*,\s*'reload schema'\s*;/gi, "")
    .trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

async function readFunctionHashes(client) {
  const hashes = {};
  for (const signature of signatures) {
    const result = await client.query(
      "select pg_get_functiondef($1::regprocedure) as definition",
      [signature],
    );
    hashes[signature] = sha256(result.rows[0].definition);
  }
  return hashes;
}

async function selectUsers(client) {
  const result = await client.query(`
    select user_id
    from public.public_profiles
    order by user_id
    limit 3
  `);
  assert.ok(result.rowCount >= 2, "at least two public profile users are required");
  return {
    viewer: result.rows[0].user_id,
    actor: result.rows[1].user_id,
    spoofedViewer: result.rows[2]?.user_id ?? "00000000-0000-4000-8000-000000000003",
  };
}

async function setAuthenticatedContext(client, userId) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await client.query(
    "select set_config('request.jwt.claims', $1, true)",
    [JSON.stringify({ role: "authenticated", sub: userId })],
  );
}

async function resetRole(client) {
  await client.query("reset role");
}

async function runOwnViewerProbes(client, users) {
  const result = await client.query(
    `select
      public.interest_graph_collectors_visible_to_viewer_v1($1, $2, null) as collectors_visible,
      public.interest_graph_card_event_visible_to_viewer_v1($1, $2, null, 'public') as event_visible,
      public.local_community_collector_visible_to_viewer_v1($1, $2) as local_visible,
      public.trust_block_exists_between_v1($1, $2) as blocked,
      public.card_events_resolve_visibility_v1('vault_added', $1, null, '{}'::jsonb) as resolved_visibility,
      public.binder_card_event_visible_to_viewer_v1(
        $1, 'vault_added', null, $2, null, 'public', '{}'::jsonb, null
      ) as binder_event_visible`,
    [users.viewer, users.actor],
  );
  return result.rows[0];
}

async function runSpoofedViewerProbes(client, users) {
  const result = await client.query(
    `select
      public.interest_graph_collectors_visible_to_viewer_v1($1, $2, null) as collectors_visible,
      public.interest_graph_card_event_visible_to_viewer_v1($1, $2, null, 'public') as event_visible,
      public.local_community_collector_visible_to_viewer_v1($1, $2) as local_visible,
      public.trust_block_exists_between_v1($1, $2) as blocked,
      public.card_events_resolve_visibility_v1('collector_followed', $1, null, '{}'::jsonb) as resolved_visibility,
      public.binder_card_event_visible_to_viewer_v1(
        $1, 'vault_added', null, $2, null, 'public', '{}'::jsonb, null
      ) as binder_event_visible`,
    [users.spoofedViewer, users.actor],
  );
  return result.rows[0];
}

async function main() {
  const envPath = path.resolve(parseArg("env-file") ?? ".env.local");
  const migrationPath = path.resolve(parseArg("migration") ?? DEFAULT_MIGRATION);
  process.loadEnvFile(envPath);
  const connectionString =
    process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  assert.ok(connectionString, "SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required");

  const { Client } = loadPg(envPath);
  const client = new Client({ connectionString });
  let transactionOpen = false;
  try {
    await client.connect();
    const baselineHashes = await readFunctionHashes(client);
    await client.query("begin isolation level repeatable read read write");
    transactionOpen = true;
    const users = await selectUsers(client);

    await setAuthenticatedContext(client, users.viewer);
    const before = await runOwnViewerProbes(client, users);
    await resetRole(client);

    await client.query(migrationBody(migrationPath));

    await setAuthenticatedContext(client, users.viewer);
    const after = await runOwnViewerProbes(client, users);
    const spoofed = await runSpoofedViewerProbes(client, users);
    await resetRole(client);

    assert.deepEqual(after, before, "current-viewer behavior changed after hardening");
    assert.equal(spoofed.collectors_visible, false);
    assert.equal(spoofed.event_visible, false);
    assert.equal(spoofed.local_visible, false);
    assert.equal(spoofed.blocked, true, "unrelated block probe must fail closed");
    assert.equal(spoofed.resolved_visibility, "private");
    assert.equal(spoofed.binder_event_visible, false);

    await client.query("rollback");
    transactionOpen = false;
    const finalHashes = await readFunctionHashes(client);
    assert.deepEqual(finalHashes, baselineHashes, "rollback did not restore function definitions");

    process.stdout.write(`${JSON.stringify({
      package_id: PACKAGE_ID,
      mode: "rollback_only",
      migration: path.relative(process.cwd(), migrationPath).replaceAll("\\", "/"),
      current_viewer_behavior_unchanged: true,
      spoofed_viewer_results: spoofed,
      function_definitions_restored: true,
      persistent_database_changes: 0,
      verdict: "pass",
    }, null, 2)}\n`);
  } finally {
    if (transactionOpen) {
      await resetRole(client).catch(() => {});
      await client.query("rollback").catch(() => {});
    }
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  process.stderr.write(`${PACKAGE_ID}: ${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
