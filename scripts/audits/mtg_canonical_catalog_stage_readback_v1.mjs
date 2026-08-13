import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  buildMtgCanaryStageContractV1,
  stableJson,
} from "./mtg_canonical_catalog_canary_stage_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_STAGE_READBACK_V1";

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

export function reconcileMtgStageRowsV1(actualRows, contract) {
  const expected = contract.rows;
  const actual = actualRows
    .map((row) => ({
      id: row.id,
      batch_id: row.batch_id,
      entity_type: row.entity_type,
      row_key: row.row_key,
      row_ordinal: Number(row.row_ordinal),
      payload: row.payload,
      payload_sha256: row.payload_sha256,
    }));
  const findings = [];
  if (actual.length !== expected.length) findings.push("staged_row_count_mismatch");
  const actualById = new Map();
  for (const row of actual) {
    if (actualById.has(row.id)) findings.push(`duplicate_staged_row:${row.id}`);
    actualById.set(row.id, row);
  }
  const actualInContractOrder = [];
  for (const expectedRow of expected) {
    const actualRow = actualById.get(expectedRow.id);
    if (!actualRow) {
      findings.push(`missing_staged_row:${expectedRow.entity_type}:${expectedRow.row_key}`);
      continue;
    }
    actualInContractOrder.push(actualRow);
    if (stableJson(actualRow) !== stableJson(expectedRow)) {
      findings.push(`staged_row_mismatch:${expectedRow.entity_type}:${expectedRow.row_key}`);
    }
  }
  const expectedIds = new Set(expected.map((row) => row.id));
  for (const row of actual) {
    if (!expectedIds.has(row.id)) findings.push(`unexpected_staged_row:${row.id}`);
  }
  const actualHash = sha256(stableJson(actualInContractOrder));
  if (actualHash !== contract.staged_rows_sha256) findings.push("staged_rows_hash_mismatch");
  return { findings, actual_hash_sha256: actualHash, row_count: actual.length };
}

async function readProduction(payload, contract) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '180s'");
    const ledger = await client.query(
        `select version, name
         from supabase_migrations.schema_migrations
         where version in ('20260813185000', '20260813190000')
         order by version`,
      );
    const batch = await client.query(
        `select id::text, payload_fingerprint_sha256, plan_version,
                source_bulk_sha256, foundation_migration_sha256,
                producing_commit_sha, producing_branch, selected_set_code,
                selected_set_name, status, row_counts, execution_boundaries
         from public.mtg_canonical_import_batches
         where id = $1`,
        [contract.batch_id],
      );
    const rows = await client.query(
        `select id::text, batch_id::text, entity_type, row_key, row_ordinal,
                payload, payload_sha256
         from public.mtg_canonical_import_rows
         where batch_id = $1
         order by entity_type, row_ordinal`,
        [contract.batch_id],
      );
    const boundaries = await client.query(`
        select jsonb_build_object(
          'transaction_read_only', current_setting('transaction_read_only')::boolean,
          'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
          'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
          'mtg_card_count', (
            select count(*) from public.card_prints
            where game_id = '4d544700-0000-4000-8000-000000000001'::uuid
          ),
          'pokemon_card_count', (
            select count(*)
            from public.card_prints card
            join public.games game on game.id = card.game_id
            where game.code = 'pokemon'
          ),
          'anon_batch_select', has_table_privilege('anon', 'public.mtg_canonical_import_batches', 'select'),
          'authenticated_batch_select', has_table_privilege('authenticated', 'public.mtg_canonical_import_batches', 'select'),
          'anon_row_select', has_table_privilege('anon', 'public.mtg_canonical_import_rows', 'select'),
          'authenticated_row_select', has_table_privilege('authenticated', 'public.mtg_canonical_import_rows', 'select')
        ) as value
      `);
    const appSearch = await client.query(
        `select jsonb_build_object(
           'legacy_search_count', (
             select count(*) from public.search_card_prints_v1(null, $1, null, 1000, 0)
           ),
           'print_identity_search_count', (
             select count(*) from public.search_print_identity_v1(null, $1, null, null, 1000, 0)
           )
         ) as value`,
        [payload.selected_set.code],
      );
    const source = await client.query(
        `with planned as (
           select * from jsonb_to_recordset($1::jsonb)
             as row(product_id integer, subtype text)
         ), latest_day as (
           select observed_on
           from public.tcgcsv_source_price_daily_observations
           where category_id = 1
           order by observed_on desc
           limit 1
         )
         select count(*)::integer as planned_count,
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
        [
          JSON.stringify(
            payload.rows.external_printing_mappings.map((row) => ({
              product_id: Number(row.meta.product_id),
              subtype: row.meta.source_subtype,
            })),
          ),
        ],
      );
    await client.query("rollback");
    return {
      ledger: ledger.rows,
      batch: batch.rows,
      rows: rows.rows,
      boundaries: boundaries.rows[0].value,
      app_search: appSearch.rows[0].value,
      source: source.rows[0],
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
  return `# MTG Canonical Staging Post-Apply Readback

- Status: **${result.status.toUpperCase()}**
- Payload fingerprint: \`${result.writer_payload_fingerprint}\`
- Batch ID: \`${result.contract.batch_id}\`
- Staged rows: \`${result.reconciliation.row_count}\`
- Staged row hash: \`${result.reconciliation.actual_hash_sha256}\`
- Source lanes: \`${result.production.source.source_row_count} / ${result.production.source.planned_count}\`
- Positive marketPrice lanes: \`${result.production.source.positive_market_price_count}\`
- Legacy app search rows for DSK: \`${result.production.app_search.legacy_search_count}\`
- Print-identity app search rows for DSK: \`${result.production.app_search.print_identity_search_count}\`
- Canonical MTG cards: \`${result.production.boundaries.mtg_card_count}\`
- Database writes in this readback: \`0\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(await fs.readFile(args.payload, "utf8"));
  const contract = buildMtgCanaryStageContractV1(payload);
  const production = await readProduction(payload, contract);
  const reconciliation = reconcileMtgStageRowsV1(production.rows, contract);
  const findings = [...reconciliation.findings];
  if (
    production.ledger.length !== 1 ||
    production.ledger[0].version !== "20260813185000" ||
    production.ledger[0].name !== "mtg_canonical_import_staging_v1"
  ) {
    findings.push("migration_ledger_mismatch");
  }
  if (production.batch.length !== 1) findings.push("staging_batch_count_mismatch");
  else {
    const batch = production.batch[0];
    if (batch.payload_fingerprint_sha256 !== payload.writer_payload_fingerprint) {
      findings.push("staging_batch_fingerprint_mismatch");
    }
    if (batch.source_bulk_sha256 !== payload.source_bulk_sha256) {
      findings.push("staging_batch_source_hash_mismatch");
    }
    if (batch.foundation_migration_sha256 !== payload.foundation_migration_sha256) {
      findings.push("staging_batch_foundation_hash_mismatch");
    }
  }
  const boundary = production.boundaries;
  if (boundary.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (Number(boundary.mtg_game_count) !== 0) findings.push("canonical_mtg_game_present");
  if (Number(boundary.mtg_set_count) !== 0) findings.push("canonical_mtg_set_present");
  if (Number(boundary.mtg_card_count) !== 0) findings.push("canonical_mtg_card_present");
  if (Number(boundary.pokemon_card_count) !== 58769) findings.push("pokemon_card_count_changed");
  if (
    boundary.anon_batch_select ||
    boundary.authenticated_batch_select ||
    boundary.anon_row_select ||
    boundary.authenticated_row_select
  ) {
    findings.push("client_staging_access_present");
  }
  if (
    Number(production.app_search.legacy_search_count) !== 0 ||
    Number(production.app_search.print_identity_search_count) !== 0
  ) {
    findings.push("staged_dsk_visible_in_app_search");
  }
  if (
    Number(production.source.source_row_count) !== payload.counts.exact_market_lanes ||
    Number(production.source.positive_market_price_count) !== payload.counts.positive_market_lanes
  ) {
    findings.push("source_lane_readback_mismatch");
  }
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "staging_apply_verified" : "blocked",
    writer_payload_fingerprint: payload.writer_payload_fingerprint,
    contract: {
      batch_id: contract.batch_id,
      staged_row_count: contract.staged_row_count,
      staged_rows_sha256: contract.staged_rows_sha256,
    },
    reconciliation,
    production: {
      ledger: production.ledger,
      batch: production.batch,
      boundaries: production.boundaries,
      app_search: production.app_search,
      source: production.source,
    },
    findings,
    boundaries: {
      database_writes: false,
      canonical_writes: false,
      app_visibility: false,
      storage_writes: false,
      pricing_writes: false,
    },
  };
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_catalog_stage_readback_v1");
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
