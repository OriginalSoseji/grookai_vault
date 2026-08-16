import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_CANARY_PREFLIGHT_V1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = { payload: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  return args;
}

function duplicates(values) {
  const seen = new Set();
  const result = new Set();
  for (const value of values) {
    if (seen.has(value)) result.add(value);
    seen.add(value);
  }
  return [...result].sort();
}

export function verifyMtgCanaryPayloadIntegrityV1(payload) {
  const { writer_payload_fingerprint: fingerprint, ...core } = payload;
  const issues = [];
  if (sha256(JSON.stringify(core)) !== fingerprint) issues.push("writer_payload_fingerprint_mismatch");
  const rows = payload.rows ?? {};
  for (const [name, expected] of Object.entries({
    sets: payload.counts?.sets,
    card_prints: payload.counts?.card_prints,
    card_print_identity: payload.counts?.card_print_identity,
    card_printings: payload.counts?.card_printings,
    external_mappings: payload.counts?.external_mappings,
    external_printing_mappings: payload.counts?.external_printing_mappings,
  })) {
    if (!Array.isArray(rows[name]) || rows[name].length !== expected) {
      issues.push(`${name}_count_mismatch`);
    }
  }
  const parentIds = new Set((rows.card_prints ?? []).map((row) => row.id));
  const printingIds = new Set((rows.card_printings ?? []).map((row) => row.id));
  if ((rows.card_print_identity ?? []).some((row) => !parentIds.has(row.card_print_id))) {
    issues.push("identity_parent_reference_missing");
  }
  if ((rows.card_printings ?? []).some((row) => !parentIds.has(row.card_print_id))) {
    issues.push("printing_parent_reference_missing");
  }
  if ((rows.external_mappings ?? []).some((row) => !parentIds.has(row.card_print_id))) {
    issues.push("parent_mapping_reference_missing");
  }
  if (
    (rows.external_printing_mappings ?? []).some(
      (row) => !printingIds.has(row.card_printing_id),
    )
  ) {
    issues.push("printing_mapping_reference_missing");
  }
  const uniquenessChecks = {
    card_print_ids: (rows.card_prints ?? []).map((row) => row.id),
    parent_gv_ids: (rows.card_prints ?? []).map((row) => row.gv_id),
    identity_hashes: (rows.card_print_identity ?? []).map((row) => row.identity_key_hash),
    printing_ids: (rows.card_printings ?? []).map((row) => row.id),
    printing_gv_ids: (rows.card_printings ?? []).map((row) => row.printing_gv_id),
    parent_external_ids: (rows.external_mappings ?? []).map(
      (row) => `${row.source}:${row.external_id}`,
    ),
    printing_external_ids: (rows.external_printing_mappings ?? []).map(
      (row) => `${row.source}:${row.external_id}`,
    ),
  };
  for (const [name, values] of Object.entries(uniquenessChecks)) {
    if (duplicates(values).length > 0) issues.push(`${name}_duplicates`);
  }
  if ((rows.card_prints ?? []).some((row) => row.tcgplayer_id !== null)) {
    issues.push("parent_tcgplayer_id_must_be_null");
  }
  if ((rows.card_prints ?? []).some((row) => row.image_url !== null)) {
    issues.push("parent_image_pointer_must_be_null");
  }
  if ((rows.card_printings ?? []).some((row) => row.image_url !== null)) {
    issues.push("printing_image_pointer_must_be_null");
  }
  if (payload.boundaries?.database_writes !== false) issues.push("database_write_boundary_missing");
  if (payload.boundaries?.apply_target !== "service_only_mtg_import_staging") {
    issues.push("service_only_staging_boundary_missing");
  }
  if (payload.boundaries?.pokemon_mutation !== false) issues.push("pokemon_boundary_missing");
  return { ok: issues.length === 0, issues };
}

async function queryCollisionCount(client, table, column, values, cast) {
  if (values.length === 0) return 0;
  const result = await client.query(
    `select count(*)::integer as count from public.${table} where ${column} = any($1::${cast}[])`,
    [values],
  );
  return result.rows[0].count;
}

async function productionPreflight(payload) {
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is required");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '180s'");
    const schema = await client.query(`
      select jsonb_build_object(
        'transaction_read_only', current_setting('transaction_read_only')::boolean,
        'database_user', current_user,
        'staging_migration_already_applied', exists (
          select 1 from supabase_migrations.schema_migrations where version = '20260813185000'
        ),
        'foundation_migration_already_applied', exists (
          select 1 from supabase_migrations.schema_migrations where version = '20260813190000'
        ),
        'staging_batch_table_present', to_regclass('public.mtg_canonical_import_batches') is not null,
        'staging_row_table_present', to_regclass('public.mtg_canonical_import_rows') is not null,
        'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
        'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
        'mtg_card_print_count', (
          select count(*) from public.card_prints where game_id = '4d544700-0000-4000-8000-000000000001'::uuid
        ),
        'foil_finish_count', (select count(*) from public.finish_keys where key = 'foil'),
        'etched_finish_count', (select count(*) from public.finish_keys where key = 'etched'),
        'pokemon_set_count', (select count(*) from public.sets where game = 'pokemon'),
        'pokemon_jpn_set_count', (select count(*) from public.sets where game = 'pokemon_jpn'),
        'pokemon_card_print_count', (
          select count(*) from public.card_prints card
          join public.games game on game.id = card.game_id
          where game.code = 'pokemon'
        ),
        'identity_domain_constraint', (
          select pg_get_constraintdef(oid)
          from pg_constraint
          where conrelid = 'public.card_print_identity'::regclass
            and conname = 'card_print_identity_identity_domain_check'
        ),
        'image_source_constraint', (
          select pg_get_constraintdef(oid)
          from pg_constraint
          where conrelid = 'public.card_prints'::regclass
            and conname = 'card_prints_image_source_check'
        )
      ) as value
    `);
    const rows = payload.rows;
    let stagingPayloadCollisions = 0;
    if (schema.rows[0].value.staging_batch_table_present) {
      const staged = await client.query(
        `select count(*)::integer as count
         from public.mtg_canonical_import_batches
         where payload_fingerprint_sha256 = $1`,
        [payload.writer_payload_fingerprint],
      );
      stagingPayloadCollisions = staged.rows[0].count;
    }
    const collisions = {
      staging_payloads: stagingPayloadCollisions,
      set_ids: await queryCollisionCount(client, "sets", "id", rows.sets.map((row) => row.id), "uuid"),
      set_codes: await queryCollisionCount(client, "sets", "code", rows.sets.map((row) => row.code), "text"),
      card_print_ids: await queryCollisionCount(client, "card_prints", "id", rows.card_prints.map((row) => row.id), "uuid"),
      parent_gv_ids: await queryCollisionCount(client, "card_prints", "gv_id", rows.card_prints.map((row) => row.gv_id), "text"),
      identity_hashes: await queryCollisionCount(
        client,
        "card_print_identity",
        "identity_key_hash",
        rows.card_print_identity.map((row) => row.identity_key_hash),
        "text",
      ),
      printing_ids: await queryCollisionCount(client, "card_printings", "id", rows.card_printings.map((row) => row.id), "uuid"),
      printing_gv_ids: await queryCollisionCount(
        client,
        "card_printings",
        "printing_gv_id",
        rows.card_printings.map((row) => row.printing_gv_id),
        "text",
      ),
    };
    const parentMappings = await client.query(
      `select count(*)::integer as count from public.external_mappings
       where source = 'scryfall' and external_id = any($1::text[])`,
      [rows.external_mappings.map((row) => row.external_id)],
    );
    collisions.parent_external_mappings = parentMappings.rows[0].count;
    const printingMappings = await client.query(
      `select count(*)::integer as count from public.external_printing_mappings
       where source = 'tcgplayer_market' and external_id = any($1::text[])`,
      [rows.external_printing_mappings.map((row) => row.external_id)],
    );
    collisions.printing_external_mappings = printingMappings.rows[0].count;

    const plannedMarketRows = rows.external_printing_mappings.map((row) => ({
      product_id: Number(row.meta.product_id),
      subtype: row.meta.source_subtype,
    }));
    const source = await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb) as row(product_id integer, subtype text)
       ), latest_day as (
         select observed_on
         from public.tcgcsv_source_price_daily_observations
         where category_id = 1
         order by observed_on desc
         limit 1
       )
       select
         count(*)::integer as planned_count,
         count(observation.id)::integer as source_row_count,
         count(observation.id) filter (where observation.market_price > 0)::integer
           as positive_market_price_count,
         max(observation.observed_on) as observed_on
       from planned
       cross join latest_day
       left join public.tcgcsv_source_price_daily_observations observation
         on observation.category_id = 1
        and observation.observed_on = latest_day.observed_on
        and observation.product_id = planned.product_id
        and observation.subtype_name_normalized = planned.subtype`,
      [JSON.stringify(plannedMarketRows)],
    );
    await client.query("commit");
    return {
      schema: schema.rows[0].value,
      collisions,
      source_readback: source.rows[0],
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function report(result) {
  return `# MTG Canonical Catalog Canary Production Preflight

- Status: **${result.status.toUpperCase()}**
- Payload fingerprint: \`${result.writer_payload_fingerprint}\`
- Staging migration SHA-256: \`${result.staging_migration_sha256}\`
- Foundation migration SHA-256: \`${result.foundation_migration_sha256}\`
- Transaction read-only: \`${result.production.schema.transaction_read_only}\`
- Database writes: \`0\`

## Production Source Readback

- Planned exact lanes: \`${result.production.source_readback.planned_count}\`
- Current source rows found: \`${result.production.source_readback.source_row_count}\`
- Positive marketPrice rows: \`${result.production.source_readback.positive_market_price_count}\`
- Observed on: \`${result.production.source_readback.observed_on}\`

## Collision Readback

${Object.entries(result.production.collisions)
  .map(([key, value]) => `- ${key}: \`${value}\``)
  .join("\n")}

## Decision

${result.status === "ready_for_service_only_stage_apply_approval" ? "The service-only staging migration and frozen one-set payload are collision-free. Canonical promotion remains a separate blocked gate because shared canonical rows can become app-visible." : "The staging apply gate remains blocked. Repair the preflight findings without writing production data."}
`;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(await fs.readFile(args.payload, "utf8"));
  const integrity = verifyMtgCanaryPayloadIntegrityV1(payload);
  if (!integrity.ok) throw new Error(`Payload integrity failed: ${integrity.issues.join(", ")}`);
  const stagingMigrationFile = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260813185000_mtg_canonical_import_staging_v1.sql",
  );
  const foundationMigrationFile = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260813190000_mtg_canonical_catalog_foundation_v1.sql",
  );
  const stagingMigrationSha = sha256(await fs.readFile(stagingMigrationFile));
  const foundationMigrationSha = sha256(await fs.readFile(foundationMigrationFile));
  if (stagingMigrationSha !== payload.staging_migration_sha256) {
    throw new Error("Staging migration hash mismatch");
  }
  if (foundationMigrationSha !== payload.foundation_migration_sha256) {
    throw new Error("Foundation migration hash mismatch");
  }
  const production = await productionPreflight(payload);
  const findings = [];
  if (production.schema.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (
    production.schema.staging_batch_table_present !==
    production.schema.staging_row_table_present
  ) {
    findings.push("partial_staging_schema_present");
  }
  if (production.schema.foundation_migration_already_applied) {
    findings.push("foundation_migration_already_applied");
  }
  if (Number(production.schema.mtg_game_count) !== 0) findings.push("mtg_game_already_present");
  if (Number(production.schema.mtg_set_count) !== 0) findings.push("mtg_sets_already_present");
  if (Number(production.schema.mtg_card_print_count) !== 0) findings.push("mtg_cards_already_present");
  if (Number(production.schema.foil_finish_count) !== 0) findings.push("foil_finish_already_present");
  if (Number(production.schema.etched_finish_count) !== 0) findings.push("etched_finish_already_present");
  for (const [key, value] of Object.entries(production.collisions)) {
    if (Number(value) !== 0) findings.push(`${key}_collision`);
  }
  if (Number(production.source_readback.source_row_count) !== payload.counts.exact_market_lanes) {
    findings.push("source_row_count_mismatch");
  }
  if (
    Number(production.source_readback.positive_market_price_count) !==
    payload.counts.positive_market_lanes
  ) {
    findings.push("positive_market_price_count_mismatch");
  }
  const result = {
    preflight_version: VERSION,
    recorded_at: new Date().toISOString(),
    status:
      findings.length === 0 ? "ready_for_service_only_stage_apply_approval" : "blocked",
    writer_payload_fingerprint: payload.writer_payload_fingerprint,
    staging_migration_sha256: stagingMigrationSha,
    foundation_migration_sha256: foundationMigrationSha,
    payload_integrity: integrity,
    production,
    findings,
    boundaries: {
      database_writes: false,
      staging_migration_apply: false,
      foundation_migration_apply: false,
      staging_payload_apply: false,
      canonical_apply: false,
      storage_writes: false,
      price_publication: false,
    },
  };
  const outDir = args.outDir ?? path.join(path.dirname(args.payload), "production_preflight");
  await fs.mkdir(outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: { "summary.json": sha256(summaryBody), "REPORT.md": sha256(reportBody) },
  });
  process.stdout.write(`${JSON.stringify({ out_dir: outDir, status: result.status, findings })}\n`);
  if (result.status !== "ready_for_service_only_stage_apply_approval") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
