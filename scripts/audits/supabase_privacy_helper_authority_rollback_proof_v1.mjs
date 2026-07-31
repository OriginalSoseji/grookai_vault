import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const PACKAGE_ID = "SUPABASE_PRIVACY_HELPER_AUTHORITY_ROLLBACK_PROOF_V1";
const DEFAULT_MIGRATION =
  "supabase/migrations/20260731210500_security_advisor_privacy_helper_execute_hardening_v1.sql";

const helperCalls = [
  {
    signature: "public.card_events_resolve_visibility_v1(text,uuid,text,jsonb)",
    sql: "select public.card_events_resolve_visibility_v1('vault_added', null::uuid, null::text, '{}'::jsonb)",
  },
  {
    signature: "public.interest_graph_collector_public_v1(uuid)",
    sql: "select public.interest_graph_collector_public_v1(null::uuid)",
  },
  {
    signature: "public.interest_graph_collectors_visible_to_viewer_v1(uuid,uuid,uuid)",
    sql: "select public.interest_graph_collectors_visible_to_viewer_v1(null::uuid, null::uuid, null::uuid)",
  },
  {
    signature: "public.interest_graph_card_event_visible_to_viewer_v1(uuid,uuid,uuid,text)",
    sql: "select public.interest_graph_card_event_visible_to_viewer_v1(null::uuid, null::uuid, null::uuid, 'public')",
  },
  {
    signature: "public.trust_block_exists_between_v1(uuid,uuid)",
    sql: "select public.trust_block_exists_between_v1(null::uuid, null::uuid)",
  },
];

const publicProbes = [
  ...[
    "v_card_stream_v1",
    "v_wall_cards_v1",
    "v_section_cards_v1",
    "v_card_contact_targets_v1",
  ].map((view) => ({
    name: view,
    sql: `
      select coalesce(jsonb_agg(to_jsonb(sample) order by to_jsonb(sample)::text), '[]'::jsonb) as payload
      from (select * from public.${view} limit 3) sample
    `,
  })),
  {
    name: "search_print_identity_v1",
    sql: `
      select coalesce(jsonb_agg(to_jsonb(sample) order by to_jsonb(sample)::text), '[]'::jsonb) as payload
      from (
        select * from public.search_print_identity_v1('pikachu', null, null, null, 5, 0)
      ) sample
    `,
  },
  {
    name: "binder_explore_v1",
    sql: "select public.binder_explore_v1(5, null, null) as payload",
  },
  {
    name: "card_journey_public_counts_v1",
    sql: `
      select coalesce(jsonb_agg(to_jsonb(sample) order by to_jsonb(sample)::text), '[]'::jsonb) as payload
      from (select * from public.card_journey_public_counts_v1($1::uuid)) sample
    `,
    usesCardPrintId: true,
  },
];

function parseArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function loadPg(envPath) {
  const packageRoots = [process.cwd(), path.dirname(envPath)];
  for (const root of packageRoots) {
    const packagePath = path.join(root, "package.json");
    if (!fs.existsSync(packagePath)) continue;
    try {
      return createRequire(packagePath)("pg");
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error("The pg package is required in the current project or env-file project");
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

function stableHash(value) {
  const encoded = JSON.stringify(value ?? null);
  return {
    bytes: Buffer.byteLength(encoded),
    sha256: crypto.createHash("sha256").update(encoded).digest("hex"),
  };
}

async function setAnonContext(client) {
  await client.query("set local role anon");
  await client.query("select set_config('request.jwt.claim.role', 'anon', true)");
  await client.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)");
}

async function resetRole(client) {
  await client.query("reset role");
}

async function readAnonAcl(client) {
  const rows = [];
  for (const helper of helperCalls) {
    const result = await client.query(
      "select has_function_privilege('anon', $1, 'EXECUTE') as allowed",
      [helper.signature],
    );
    rows.push({ signature: helper.signature, allowed: result.rows[0].allowed });
  }
  return rows;
}

async function selectSampleCardPrintId(client) {
  const result = await client.query(`
    select id
    from public.card_prints
    order by id
    limit 1
  `);
  assert.equal(result.rowCount, 1, "card_prints must contain a sample row");
  return result.rows[0].id;
}

async function runPublicProbes(client, cardPrintId) {
  const results = [];
  for (const probe of publicProbes) {
    let result;
    try {
      result = await client.query(probe.sql, probe.usesCardPrintId ? [cardPrintId] : []);
    } catch (error) {
      error.message = `${probe.name}: ${error.message}`;
      throw error;
    }
    assert.equal(result.rowCount, 1, `${probe.name} must return one aggregate probe row`);
    results.push({ name: probe.name, ...stableHash(result.rows[0].payload) });
  }
  return results;
}

async function proveHelperDenials(client) {
  const results = [];
  for (const [index, helper] of helperCalls.entries()) {
    const savepoint = `helper_${index}`;
    await client.query(`savepoint ${savepoint}`);
    try {
      await client.query(helper.sql);
      results.push({ signature: helper.signature, denied: false, sqlstate: null });
    } catch (error) {
      results.push({
        signature: helper.signature,
        denied: error?.code === "42501",
        sqlstate: error?.code ?? null,
      });
    } finally {
      await client.query(`rollback to savepoint ${savepoint}`);
      await client.query(`release savepoint ${savepoint}`);
    }
  }
  return results;
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
  let baselineAcl;
  let finalAcl;

  try {
    await client.connect();
    baselineAcl = await readAnonAcl(client);
    assert.ok(baselineAcl.every((row) => row.allowed), "expected all five live anon grants before proof");

    await client.query("begin isolation level repeatable read read write");
    transactionOpen = true;
    const cardPrintId = await selectSampleCardPrintId(client);

    await setAnonContext(client);
    const before = await runPublicProbes(client, cardPrintId);
    await resetRole(client);

    await client.query(migrationBody(migrationPath));

    await setAnonContext(client);
    const after = await runPublicProbes(client, cardPrintId);
    const currentViewerProbe = await client.query(
      "select public.trust_block_exists_for_current_viewer_v1($1::uuid) as blocked",
      [cardPrintId],
    );
    assert.equal(
      currentViewerProbe.rows[0].blocked,
      false,
      "anonymous current-viewer wrapper must not expose a block relationship",
    );
    const helperDenials = await proveHelperDenials(client);
    await resetRole(client);

    assert.deepEqual(after, before, "public anonymous boundary outputs changed under narrowed grants");
    assert.ok(helperDenials.every((row) => row.denied), "every helper must deny direct anon execution");

    const hardenedAcl = await readAnonAcl(client);
    assert.ok(hardenedAcl.every((row) => !row.allowed), "all five anon grants must be absent in proof state");

    await client.query("rollback");
    transactionOpen = false;
    finalAcl = await readAnonAcl(client);
    assert.deepEqual(finalAcl, baselineAcl, "rollback did not restore the original live grants");

    process.stdout.write(`${JSON.stringify({
      package_id: PACKAGE_ID,
      mode: "rollback_only",
      migration: path.relative(process.cwd(), migrationPath).replaceAll("\\", "/"),
      public_boundaries: before,
      public_boundary_mismatches: 0,
      helper_denials: helperDenials,
      denied_helpers: helperDenials.filter((row) => row.denied).length,
      anonymous_current_viewer_wrapper_result: false,
      rollback_restored_original_acl: true,
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
