import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { verifyMtgCanaryPayloadIntegrityV1 } from "./mtg_canonical_catalog_canary_preflight_v1.mjs";
import { buildMtgCanaryStageContractV1, stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";
import {
  captureMtgClientVisibilityV1,
  captureMtgPromotionCollisionsV1,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_SET_STAGE_PREFLIGHT_V1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = { payload: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  return args;
}

function nonzeroKeys(value) {
  return Object.entries(value)
    .filter(([, count]) => Number(count) !== 0)
    .map(([key]) => key);
}

export function evaluateMtgSetStagePreflightV1(payload, contract, production) {
  const findings = [];
  if (production.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (!production.schema.staging_migration_present) findings.push("staging_migration_missing");
  if (!production.schema.foundation_migration_present) findings.push("foundation_migration_missing");
  if (!production.schema.visibility_migration_present) findings.push("visibility_migration_missing");
  if (production.schema.release_status !== "hidden") findings.push("mtg_release_not_hidden");
  if (!production.schema.batch_table_present || !production.schema.row_table_present) {
    findings.push("staging_schema_missing");
  }
  if (Number(production.schema.mtg_game_count) !== 1) findings.push("mtg_game_count_mismatch");
  if (Number(production.schema.mtg_set_count) !== 1) findings.push("canonical_set_baseline_mismatch");
  if (Number(production.schema.mtg_card_count) !== 417) {
    findings.push("canonical_card_baseline_mismatch");
  }
  if (Number(production.schema.pokemon_card_count) !== 58769) {
    findings.push("pokemon_service_count_mismatch");
  }
  for (const key of nonzeroKeys(production.canonical_collisions)) {
    findings.push(`canonical_${key}_collision`);
  }
  for (const key of nonzeroKeys(production.staging_collisions)) {
    findings.push(`staging_${key}_collision`);
  }
  if (Number(production.source.planned_count) !== payload.counts.exact_market_lanes) {
    findings.push("source_planned_count_mismatch");
  }
  if (Number(production.source.source_row_count) !== payload.counts.exact_market_lanes) {
    findings.push("source_row_count_mismatch");
  }
  if (
    Number(production.source.positive_market_price_count) !==
    payload.counts.positive_market_lanes
  ) {
    findings.push("positive_market_price_count_mismatch");
  }
  for (const role of ["anon", "authenticated"]) {
    for (const key of [
      "game_count",
      "set_count",
      "card_count",
      "identity_count",
      "printing_count",
      "legacy_search_count",
      "print_search_count",
    ]) {
      if (Number(production.client_visibility[role][key]) !== 0) {
        findings.push(`${role}_${key}_visible`);
      }
    }
  }
  if (Number(production.client_visibility.authenticated.pokemon_card_count) !== 58768) {
    findings.push("pokemon_authenticated_count_mismatch");
  }
  const expectedSecurity = {
    batch_rls_enabled: true,
    row_rls_enabled: true,
    anon_batch_select: false,
    authenticated_batch_select: false,
    anon_row_select: false,
    authenticated_row_select: false,
    service_batch_select: true,
    service_batch_insert: true,
    service_row_select: true,
    service_row_insert: true,
  };
  if (stableJson(production.staging_security) !== stableJson(expectedSecurity)) {
    findings.push("staging_security_mismatch");
  }
  if (production.staging_collisions.batch_id !== 0 || production.staging_collisions.payload !== 0) {
    findings.push("staging_batch_collision");
  }
  if (contract.staged_row_count !== 3089) findings.push("bounded_stage_row_count_mismatch");
  return [...new Set(findings)];
}

async function captureStagingCollisions(client, payload, contract) {
  const rows = payload.rows;
  const result = await client.query(
    `select jsonb_build_object(
       'batch_id', (
         select count(*) from public.mtg_canonical_import_batches where id = $1
       ),
       'payload', (
         select count(*) from public.mtg_canonical_import_batches
         where payload_fingerprint_sha256 = $2
       ),
       'set_ids', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'sets' and payload->>'id' = any($3::text[])
       ),
       'set_codes', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'sets' and lower(payload->>'code') = any($4::text[])
       ),
       'card_print_ids', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'card_prints' and payload->>'id' = any($5::text[])
       ),
       'parent_gv_ids', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'card_prints' and payload->>'gv_id' = any($6::text[])
       ),
       'identity_ids', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'card_print_identity' and payload->>'id' = any($7::text[])
       ),
       'identity_hashes', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'card_print_identity'
           and payload->>'identity_key_hash' = any($8::text[])
       ),
       'printing_ids', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'card_printings' and payload->>'id' = any($9::text[])
       ),
       'printing_gv_ids', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'card_printings' and payload->>'printing_gv_id' = any($10::text[])
       ),
       'parent_mappings', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'external_mappings'
           and concat(payload->>'source', ':', payload->>'external_id') = any($11::text[])
       ),
       'printing_mappings', (
         select count(*) from public.mtg_canonical_import_rows
         where entity_type = 'external_printing_mappings'
           and concat(payload->>'source', ':', payload->>'external_id') = any($12::text[])
       )
     ) as value`,
    [
      contract.batch_id,
      payload.writer_payload_fingerprint,
      rows.sets.map((row) => row.id),
      rows.sets.map((row) => row.code.toLowerCase()),
      rows.card_prints.map((row) => row.id),
      rows.card_prints.map((row) => row.gv_id),
      rows.card_print_identity.map((row) => row.id),
      rows.card_print_identity.map((row) => row.identity_key_hash),
      rows.card_printings.map((row) => row.id),
      rows.card_printings.map((row) => row.printing_gv_id),
      rows.external_mappings.map((row) => `${row.source}:${row.external_id}`),
      rows.external_printing_mappings.map((row) => `${row.source}:${row.external_id}`),
    ],
  );
  return result.rows[0].value;
}

async function captureProduction(payload, contract) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '240s'");
    const schema = await client.query(`
      select jsonb_build_object(
        'staging_migration_present', exists (
          select 1 from supabase_migrations.schema_migrations where version = '20260813185000'
        ),
        'foundation_migration_present', exists (
          select 1 from supabase_migrations.schema_migrations where version = '20260813190000'
        ),
        'visibility_migration_present', exists (
          select 1 from supabase_migrations.schema_migrations where version = '20260813200000'
        ),
        'batch_table_present', to_regclass('public.mtg_canonical_import_batches') is not null,
        'row_table_present', to_regclass('public.mtg_canonical_import_rows') is not null,
        'release_status', (
          select release_status from public.catalog_game_release_controls where game_code = 'mtg'
        ),
        'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
        'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
        'mtg_card_count', (
          select count(*) from public.card_prints
          where game_id = '4d544700-0000-4000-8000-000000000001'::uuid
        ),
        'pokemon_card_count', (
          select count(*) from public.card_prints card
          join public.games game on game.id = card.game_id where game.code = 'pokemon'
        )
      ) as value
    `);
    const canonicalCollisions = await captureMtgPromotionCollisionsV1(client, payload.rows);
    const stagingCollisions = await captureStagingCollisions(client, payload, contract);
    const security = await client.query(`
      select jsonb_build_object(
        'batch_rls_enabled', (
          select relrowsecurity from pg_class
          where oid = 'public.mtg_canonical_import_batches'::regclass
        ),
        'row_rls_enabled', (
          select relrowsecurity from pg_class
          where oid = 'public.mtg_canonical_import_rows'::regclass
        ),
        'anon_batch_select', has_table_privilege(
          'anon', 'public.mtg_canonical_import_batches', 'select'
        ),
        'authenticated_batch_select', has_table_privilege(
          'authenticated', 'public.mtg_canonical_import_batches', 'select'
        ),
        'anon_row_select', has_table_privilege(
          'anon', 'public.mtg_canonical_import_rows', 'select'
        ),
        'authenticated_row_select', has_table_privilege(
          'authenticated', 'public.mtg_canonical_import_rows', 'select'
        ),
        'service_batch_select', has_table_privilege(
          'service_role', 'public.mtg_canonical_import_batches', 'select'
        ),
        'service_batch_insert', has_table_privilege(
          'service_role', 'public.mtg_canonical_import_batches', 'insert'
        ),
        'service_row_select', has_table_privilege(
          'service_role', 'public.mtg_canonical_import_rows', 'select'
        ),
        'service_row_insert', has_table_privilege(
          'service_role', 'public.mtg_canonical_import_rows', 'insert'
        )
      ) as value
    `);
    const source = await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb)
           as row(product_id integer, subtype text)
       ), latest_day as (
         select observed_on from public.tcgcsv_source_price_daily_observations
         where category_id = 1 order by observed_on desc limit 1
       )
       select count(*)::integer as planned_count,
              count(observation.id)::integer as source_row_count,
              count(observation.id) filter (where observation.market_price > 0)::integer
                as positive_market_price_count,
              max(observation.observed_on) as observed_on
       from planned cross join latest_day
       left join public.tcgcsv_source_price_daily_observations observation
         on observation.category_id = 1
        and observation.observed_on = latest_day.observed_on
        and observation.product_id = planned.product_id
        and observation.subtype_name_normalized = planned.subtype`,
      [
        JSON.stringify(
          payload.rows.external_printing_mappings.map((row) => ({
            product_id: Number(row.meta.product_id),
            subtype: row.meta.source_subtype,
          })),
        ),
      ],
    );
    const anon = await captureMtgClientVisibilityV1(client, "anon", payload.selected_set.code);
    const authenticated = await captureMtgClientVisibilityV1(
      client,
      "authenticated",
      payload.selected_set.code,
    );
    const readOnly = await client.query(
      "select current_setting('transaction_read_only')::boolean as value",
    );
    await client.query("rollback");
    return {
      transaction_read_only: readOnly.rows[0].value,
      schema: schema.rows[0].value,
      canonical_collisions: canonicalCollisions,
      staging_collisions: stagingCollisions,
      staging_security: security.rows[0].value,
      source: source.rows[0],
      client_visibility: { anon, authenticated },
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
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
  return `# MTG ${result.selected_set.code.toUpperCase()} Service-Only Stage Preflight

- Status: **${result.status.toUpperCase()}**
- Set: **${result.selected_set.name}** (\`${result.selected_set.code}\`)
- Parent cards: \`${result.counts.card_prints}\`
- Finish printings: \`${result.counts.card_printings}\`
- Exact current price lanes: \`${result.production.source.source_row_count}\`
- Positive current marketPrice lanes: \`${result.production.source.positive_market_price_count}\`
- Canonical collisions: \`${nonzeroKeys(result.production.canonical_collisions).length}\`
- Staging collisions: \`${nonzeroKeys(result.production.staging_collisions).length}\`
- Client-visible MTG rows: \`0\`
- Database writes: \`0\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payloadBody = await fs.readFile(args.payload, "utf8");
  const payload = JSON.parse(payloadBody);
  const integrity = verifyMtgCanaryPayloadIntegrityV1(payload);
  if (!integrity.ok) throw new Error(`Payload integrity failed: ${integrity.issues.join(", ")}`);
  const contract = buildMtgCanaryStageContractV1(payload);
  const production = await captureProduction(payload, contract);
  const findings = evaluateMtgSetStagePreflightV1(payload, contract, production);
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "ready_for_service_only_stage_dry_run" : "blocked",
    payload_sha256: sha256(payloadBody),
    writer_payload_fingerprint: payload.writer_payload_fingerprint,
    selected_set: payload.selected_set,
    counts: payload.counts,
    stage_contract: {
      batch_id: contract.batch_id,
      staged_row_count: contract.staged_row_count,
      staged_rows_sha256: contract.staged_rows_sha256,
      mutation_contract_sha256: contract.mutation_contract_sha256,
      required_approval_message: contract.required_approval_message,
    },
    payload_integrity: integrity,
    production,
    findings,
    boundaries: {
      transaction_read_only: true,
      database_writes: false,
      canonical_writes: false,
      app_visibility: false,
      image_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
    },
  };
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_catalog_set_stage_preflight_v1");
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
  process.stdout.write(`${JSON.stringify({ out_dir: outDir, status: result.status, findings })}\n`);
  if (findings.length > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
