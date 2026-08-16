import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { deterministicUuidV5 } from "./mtg_canonical_catalog_canary_plan_v1.mjs";
import { verifyMtgCanaryPayloadIntegrityV1 } from "./mtg_canonical_catalog_canary_preflight_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_CANARY_STAGE_V1";
const APPROVAL_ENV = "MTG_CANONICAL_CANARY_STAGE_APPROVAL";
const ENTITY_TYPES = Object.freeze([
  "sets",
  "card_prints",
  "card_print_identity",
  "card_printings",
  "external_mappings",
  "external_printing_mappings",
]);

export const STAGING_MUTATION_CONTRACT_V1 = Object.freeze({
  target_tables: [
    "public.mtg_canonical_import_batches",
    "public.mtg_canonical_import_rows",
  ],
  allowed_operations: ["insert"],
  conflict_behavior: "fail_closed",
  canonical_writes: false,
  app_visibility: false,
  storage_writes: false,
  price_publication: false,
  pokemon_mutation: false,
  deletes: false,
  updates: false,
  truncates: false,
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function rowKey(entityType, row) {
  if (["sets", "card_prints", "card_print_identity", "card_printings"].includes(entityType)) {
    return row.id;
  }
  return `${row.source}:${row.external_id}`;
}

export function flattenMtgCanaryStagingRowsV1(payload) {
  const batchId = deterministicUuidV5(
    `mtg:canonical_import_batch:${payload.writer_payload_fingerprint}`,
  );
  const rows = [];
  for (const entityType of ENTITY_TYPES) {
    for (const [rowOrdinal, row] of payload.rows[entityType].entries()) {
      const key = rowKey(entityType, row);
      rows.push({
        id: deterministicUuidV5(`mtg:canonical_import_row:${batchId}:${entityType}:${key}`),
        batch_id: batchId,
        entity_type: entityType,
        row_key: key,
        row_ordinal: rowOrdinal,
        payload: row,
        payload_sha256: sha256(stableJson(row)),
      });
    }
  }
  return { batchId, rows };
}

export function buildMtgCanaryStageContractV1(payload) {
  const integrity = verifyMtgCanaryPayloadIntegrityV1(payload);
  if (!integrity.ok) {
    throw new Error(`Payload integrity failed: ${integrity.issues.join(", ")}`);
  }
  const flattened = flattenMtgCanaryStagingRowsV1(payload);
  const entityCounts = Object.fromEntries(
    ENTITY_TYPES.map((entityType) => [
      entityType,
      flattened.rows.filter((row) => row.entity_type === entityType).length,
    ]),
  );
  const mutationContractHash = sha256(stableJson(STAGING_MUTATION_CONTRACT_V1));
  const stagedRowsHash = sha256(stableJson(flattened.rows));
  const approvalMessage =
    `I approve the service-only MTG canonical staging canary only: ` +
    `staging migration ${payload.staging_migration_sha256}, payload ` +
    `${payload.writer_payload_fingerprint}, mutation contract ${mutationContractHash}, ` +
    `one immutable batch and ${flattened.rows.length} immutable staged rows. ` +
    `I do not approve canonical game, set, card, printing, mapping, image, ` +
    `Storage, pricing, publication, app-visibility, Pokemon, update, delete, ` +
    `truncate, cleanup, or promotion writes.`;
  return {
    version: VERSION,
    batch_id: flattened.batchId,
    staged_row_count: flattened.rows.length,
    entity_counts: entityCounts,
    staged_rows_sha256: stagedRowsHash,
    mutation_contract_sha256: mutationContractHash,
    required_approval_message: approvalMessage,
    rows: flattened.rows,
  };
}

export function stripMigrationTransactionV1(sql) {
  const withoutBegin = sql.replace(/^\s*begin;\s*/i, "");
  const withoutCommit = withoutBegin.replace(/\s*commit;\s*$/i, "");
  if (withoutCommit === sql || /(^|\n)\s*(begin|commit);\s*($|\n)/i.test(withoutCommit)) {
    throw new Error("Staging migration transaction wrapper could not be isolated");
  }
  return withoutCommit;
}

function parseArgs(argv) {
  const args = { mode: "plan", payload: null, outDir: null };
  for (const arg of argv) {
    if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  return args;
}

async function tableState(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'batch_table_present', to_regclass('public.mtg_canonical_import_batches') is not null,
      'row_table_present', to_regclass('public.mtg_canonical_import_rows') is not null,
      'staging_migration_recorded', exists (
        select 1
        from supabase_migrations.schema_migrations
        where version = '20260813185000'
      ),
      'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
      'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
      'pokemon_card_count', (
        select count(*)
        from public.card_prints card
        join public.games game on game.id = card.game_id
        where game.code = 'pokemon'
      )
    ) as value
  `);
  return result.rows[0].value;
}

async function stagedCollisionCount(client, payload, contract) {
  const state = await tableState(client);
  if (!state.batch_table_present || !state.row_table_present) return 0;
  const result = await client.query(
    `select
       (select count(*) from public.mtg_canonical_import_batches
        where id = $1 or payload_fingerprint_sha256 = $2) +
       (select count(*) from public.mtg_canonical_import_rows
        where id = any($3::uuid[])) as count`,
    [contract.batch_id, payload.writer_payload_fingerprint, contract.rows.map((row) => row.id)],
  );
  return Number(result.rows[0].count);
}

async function insertStaging(client, payload, contract) {
  await client.query(
    `insert into public.mtg_canonical_import_batches (
       id, payload_fingerprint_sha256, plan_version, source_bulk_sha256,
       foundation_migration_sha256, producing_commit_sha, producing_branch,
       selected_set_code, selected_set_name, status, row_counts,
       execution_boundaries
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'staged', $10::jsonb, $11::jsonb)`,
    [
      contract.batch_id,
      payload.writer_payload_fingerprint,
      payload.plan_version,
      payload.source_bulk_sha256,
      payload.foundation_migration_sha256,
      payload.repository.commit_sha,
      payload.repository.branch,
      payload.selected_set.code,
      payload.selected_set.name,
      JSON.stringify(payload.counts),
      JSON.stringify(payload.boundaries),
    ],
  );
  await client.query(
    `insert into public.mtg_canonical_import_rows (
       id, batch_id, entity_type, row_key, row_ordinal, payload, payload_sha256
     )
     select id, batch_id, entity_type, row_key, row_ordinal, payload, payload_sha256
     from jsonb_to_recordset($1::jsonb) as row(
       id uuid, batch_id uuid, entity_type text, row_key text,
       row_ordinal integer, payload jsonb, payload_sha256 text
     )`,
    [JSON.stringify(contract.rows)],
  );
}

async function exactReadback(client, payload, contract) {
  const batchResult = await client.query(
    `select * from public.mtg_canonical_import_batches where id = $1`,
    [contract.batch_id],
  );
  const rowsResult = await client.query(
    `select id::text, batch_id::text, entity_type, row_key, row_ordinal,
            payload, payload_sha256
     from public.mtg_canonical_import_rows
     where batch_id = $1
     order by entity_type, row_ordinal`,
    [contract.batch_id],
  );
  const expected = [...contract.rows].sort(
    (left, right) =>
      left.entity_type.localeCompare(right.entity_type) || left.row_ordinal - right.row_ordinal,
  );
  const issues = [];
  if (batchResult.rowCount !== 1) issues.push("batch_readback_count_mismatch");
  if (rowsResult.rowCount !== contract.staged_row_count) issues.push("row_readback_count_mismatch");
  for (let index = 0; index < Math.min(rowsResult.rows.length, expected.length); index += 1) {
    const actual = rowsResult.rows[index];
    const wanted = expected[index];
    if (
      actual.id !== wanted.id ||
      actual.batch_id !== wanted.batch_id ||
      actual.entity_type !== wanted.entity_type ||
      actual.row_key !== wanted.row_key ||
      Number(actual.row_ordinal) !== wanted.row_ordinal ||
      actual.payload_sha256 !== wanted.payload_sha256 ||
      stableJson(actual.payload) !== stableJson(wanted.payload)
    ) {
      issues.push(`row_readback_mismatch:${wanted.entity_type}:${wanted.row_key}`);
      break;
    }
  }
  return { batch_count: batchResult.rowCount, row_count: rowsResult.rowCount, issues };
}

async function stagingSecurityReadback(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'batch_rls_enabled', (
        select relrowsecurity
        from pg_class
        where oid = 'public.mtg_canonical_import_batches'::regclass
      ),
      'row_rls_enabled', (
        select relrowsecurity
        from pg_class
        where oid = 'public.mtg_canonical_import_rows'::regclass
      ),
      'anon_batch_select', has_table_privilege('anon', 'public.mtg_canonical_import_batches', 'select'),
      'authenticated_batch_select', has_table_privilege('authenticated', 'public.mtg_canonical_import_batches', 'select'),
      'anon_row_select', has_table_privilege('anon', 'public.mtg_canonical_import_rows', 'select'),
      'authenticated_row_select', has_table_privilege('authenticated', 'public.mtg_canonical_import_rows', 'select'),
      'service_batch_select', has_table_privilege('service_role', 'public.mtg_canonical_import_batches', 'select'),
      'service_batch_insert', has_table_privilege('service_role', 'public.mtg_canonical_import_batches', 'insert'),
      'service_row_select', has_table_privilege('service_role', 'public.mtg_canonical_import_rows', 'select'),
      'service_row_insert', has_table_privilege('service_role', 'public.mtg_canonical_import_rows', 'insert')
    ) as value
  `);
  return result.rows[0].value;
}

async function executeDatabaseMode({ mode, payload, contract, migrationSql }) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
  });
  await client.connect();
  try {
    const before = await tableState(client);
    if (before.batch_table_present !== before.row_table_present) {
      throw new Error("Partial MTG staging schema detected");
    }
    if (mode === "apply" && (!before.staging_migration_recorded || !before.batch_table_present)) {
      throw new Error("Recorded staging migration is required before apply");
    }
    if ((await stagedCollisionCount(client, payload, contract)) !== 0) {
      throw new Error("Staging payload collision detected");
    }
    await client.query("begin");
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '180s'");
      if (!before.batch_table_present) {
        if (mode !== "dry-run") throw new Error("Apply cannot create an unrecorded staging schema");
        await client.query(stripMigrationTransactionV1(migrationSql));
      }
      await insertStaging(client, payload, contract);
      const inside = await exactReadback(client, payload, contract);
      if (inside.issues.length > 0) throw new Error(inside.issues.join(", "));
      const security = await stagingSecurityReadback(client);
      if (
        security.batch_rls_enabled !== true ||
        security.row_rls_enabled !== true ||
        security.anon_batch_select !== false ||
        security.authenticated_batch_select !== false ||
        security.anon_row_select !== false ||
        security.authenticated_row_select !== false ||
        security.service_batch_select !== true ||
        security.service_batch_insert !== true ||
        security.service_row_select !== true ||
        security.service_row_insert !== true
      ) {
        throw new Error(`Service-only staging boundary failed: ${stableJson(security)}`);
      }
      const insideState = await tableState(client);
      if (
        Number(insideState.mtg_game_count) !== Number(before.mtg_game_count) ||
        Number(insideState.mtg_set_count) !== Number(before.mtg_set_count) ||
        Number(insideState.pokemon_card_count) !== Number(before.pokemon_card_count)
      ) {
        throw new Error("Canonical or Pokemon boundary changed inside staging transaction");
      }
      if (mode === "apply") await client.query("commit");
      else await client.query("rollback");
      const after = await tableState(client);
      let durable = { batch_count: 0, row_count: 0, issues: [] };
      if (mode === "apply") durable = await exactReadback(client, payload, contract);
      else if (before.batch_table_present) {
        const collisionAfter = await stagedCollisionCount(client, payload, contract);
        if (collisionAfter !== 0) durable.issues.push("rollback_left_staged_rows");
      } else if (after.batch_table_present || after.row_table_present) {
        durable.issues.push("rollback_left_staging_schema");
      }
      if (durable.issues.length > 0) throw new Error(durable.issues.join(", "));
      return {
        before,
        transaction_readback: inside,
        transaction_security: security,
        after,
        durable_readback: durable,
      };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(result) {
  return `# MTG Canonical Catalog Service-Only Staging Canary

- Status: **${result.status.toUpperCase()}**
- Mode: \`${result.mode}\`
- Payload fingerprint: \`${result.writer_payload_fingerprint}\`
- Batch ID: \`${result.contract.batch_id}\`
- Staged rows: \`${result.contract.staged_row_count}\`
- Staged rows SHA-256: \`${result.contract.staged_rows_sha256}\`
- Mutation contract SHA-256: \`${result.contract.mutation_contract_sha256}\`
- Durable database writes: \`${result.boundaries.database_writes}\`

## Boundary

Only the service-only MTG import staging tables are in scope. Canonical games, sets, cards, printings, source mappings, images, prices, publication, app visibility, and Pokemon rows remain unchanged.

## Required Apply Approval

\`\`\`text
${result.contract.required_approval_message}
\`\`\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(await fs.readFile(args.payload, "utf8"));
  const contract = buildMtgCanaryStageContractV1(payload);
  if (args.mode === "apply" && process.env[APPROVAL_ENV] !== contract.required_approval_message) {
    throw new Error(`Exact approval missing from ${APPROVAL_ENV}`);
  }
  const migrationFile = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260813185000_mtg_canonical_import_staging_v1.sql",
  );
  const migrationSql = await fs.readFile(migrationFile, "utf8");
  if (sha256(migrationSql) !== payload.staging_migration_sha256) {
    throw new Error("Staging migration hash mismatch");
  }
  const databaseProof =
    args.mode === "plan"
      ? null
      : await executeDatabaseMode({ mode: args.mode, payload, contract, migrationSql });
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    mode: args.mode,
    status:
      args.mode === "plan"
        ? "stage_plan_complete_no_database_access"
        : args.mode === "dry-run"
          ? "rollback_dry_run_passed_no_durable_change"
          : "service_only_staging_applied_and_read_back",
    writer_payload_fingerprint: payload.writer_payload_fingerprint,
    staging_migration_sha256: payload.staging_migration_sha256,
    foundation_migration_sha256: payload.foundation_migration_sha256,
    contract: {
      ...contract,
      rows: undefined,
    },
    database_proof: databaseProof,
    boundaries: {
      database_writes: args.mode === "apply",
      transaction_rolled_back: args.mode === "dry-run",
      canonical_writes: false,
      app_visibility: false,
      storage_writes: false,
      price_publication: false,
      pokemon_mutation: false,
    },
  };
  const outDir =
    args.outDir ?? path.join(path.dirname(args.payload), "service_only_stage");
  await fs.mkdir(outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(
    `${JSON.stringify({ out_dir: outDir, status: result.status, contract: result.contract })}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
