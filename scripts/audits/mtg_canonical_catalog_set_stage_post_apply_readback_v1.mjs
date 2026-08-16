import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { buildMtgCanaryStageContractV1, stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";
import { reconcileMtgStageRowsV1 } from "./mtg_canonical_catalog_stage_readback_v1.mjs";
import { captureMtgClientVisibilityV1 } from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_SET_STAGE_POST_APPLY_READBACK_V1";
const DSK_BATCH_ID = "60ea72dd-df1c-5ef8-9270-2dcbefc4adfe";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = { payload: null, applySummary: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--apply-summary=")) {
      args.applySummary = path.resolve(arg.slice(16));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  if (!args.applySummary) throw new Error("--apply-summary=<summary.json> is required");
  return args;
}

function expectNumber(findings, actual, expected, label) {
  if (Number(actual) !== Number(expected)) findings.push(`${label}_mismatch`);
}

export function evaluateMtgSetStagePostApplyReadbackV1({
  payload,
  contract,
  applySummary,
  production,
  reconciliation,
}) {
  const findings = [...reconciliation.findings];
  if (applySummary.status !== "service_only_staging_applied_and_read_back") {
    findings.push("apply_status_mismatch");
  }
  if (applySummary.writer_payload_fingerprint !== payload.writer_payload_fingerprint) {
    findings.push("apply_payload_fingerprint_mismatch");
  }
  for (const key of [
    "batch_id",
    "staged_row_count",
    "staged_rows_sha256",
    "mutation_contract_sha256",
  ]) {
    if (String(applySummary.contract?.[key]) !== String(contract[key])) {
      findings.push(`apply_${key}_mismatch`);
    }
  }
  if (production.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (production.batch.length !== 1) findings.push("batch_readback_count_mismatch");
  else {
    const batch = production.batch[0];
    if (batch.id !== contract.batch_id) findings.push("batch_id_mismatch");
    if (batch.payload_fingerprint_sha256 !== payload.writer_payload_fingerprint) {
      findings.push("batch_payload_fingerprint_mismatch");
    }
    if (batch.plan_version !== payload.plan_version) findings.push("batch_plan_version_mismatch");
    if (batch.source_bulk_sha256 !== payload.source_bulk_sha256) {
      findings.push("batch_source_hash_mismatch");
    }
    if (batch.selected_set_code !== payload.selected_set.code) {
      findings.push("batch_set_code_mismatch");
    }
    if (batch.selected_set_name !== payload.selected_set.name) {
      findings.push("batch_set_name_mismatch");
    }
    if (batch.status !== "staged") findings.push("batch_status_mismatch");
    if (stableJson(batch.row_counts) !== stableJson(payload.counts)) {
      findings.push("batch_row_counts_mismatch");
    }
    if (stableJson(batch.execution_boundaries) !== stableJson(payload.boundaries)) {
      findings.push("batch_boundaries_mismatch");
    }
  }
  if (reconciliation.actual_hash_sha256 !== contract.staged_rows_sha256) {
    findings.push("staged_rows_hash_mismatch");
  }
  expectNumber(findings, reconciliation.row_count, contract.staged_row_count, "staged_row_count");
  expectNumber(findings, production.totals.batch_count, 2, "total_batch_count");
  expectNumber(findings, production.totals.row_count, 5955, "total_staging_row_count");
  expectNumber(findings, production.totals.dsk_batch_count, 1, "dsk_batch_count");
  expectNumber(findings, production.totals.dsk_row_count, 2866, "dsk_row_count");
  expectNumber(findings, production.totals.msh_batch_count, 1, "msh_batch_count");
  expectNumber(findings, production.totals.msh_row_count, 3089, "msh_row_count");

  const canonical = production.canonical;
  if (canonical.release_status !== "hidden") findings.push("mtg_release_not_hidden");
  expectNumber(findings, canonical.mtg_game_count, 1, "mtg_game_count");
  expectNumber(findings, canonical.mtg_set_count, 1, "mtg_set_count");
  expectNumber(findings, canonical.mtg_card_count, 417, "mtg_card_count");
  expectNumber(findings, canonical.mtg_identity_count, 417, "mtg_identity_count");
  expectNumber(findings, canonical.mtg_printing_count, 807, "mtg_printing_count");
  expectNumber(findings, canonical.msh_canonical_set_count, 0, "msh_canonical_set_count");
  expectNumber(findings, canonical.msh_canonical_card_count, 0, "msh_canonical_card_count");
  expectNumber(findings, canonical.pokemon_card_count, 58769, "pokemon_service_count");

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
      expectNumber(findings, production.client_visibility[role][key], 0, `${role}_${key}`);
    }
  }
  expectNumber(
    findings,
    production.client_visibility.authenticated.pokemon_card_count,
    58768,
    "pokemon_authenticated_count",
  );
  expectNumber(
    findings,
    production.source.planned_count,
    payload.counts.exact_market_lanes,
    "source_planned_count",
  );
  expectNumber(
    findings,
    production.source.source_row_count,
    payload.counts.exact_market_lanes,
    "source_row_count",
  );
  expectNumber(
    findings,
    production.source.positive_market_price_count,
    payload.counts.positive_market_lanes,
    "positive_market_price_count",
  );
  return [...new Set(findings)];
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
    const batch = await client.query(
      `select id::text, payload_fingerprint_sha256, plan_version,
              source_bulk_sha256, foundation_migration_sha256,
              producing_commit_sha, producing_branch, selected_set_code,
              selected_set_name, status, row_counts, execution_boundaries
       from public.mtg_canonical_import_batches where id = $1`,
      [contract.batch_id],
    );
    const rows = await client.query(
      `select id::text, batch_id::text, entity_type, row_key, row_ordinal,
              payload, payload_sha256
       from public.mtg_canonical_import_rows where batch_id = $1
       order by entity_type, row_ordinal`,
      [contract.batch_id],
    );
    const totals = await client.query(
      `select jsonb_build_object(
         'batch_count', (select count(*) from public.mtg_canonical_import_batches),
         'row_count', (select count(*) from public.mtg_canonical_import_rows),
         'dsk_batch_count', (
           select count(*) from public.mtg_canonical_import_batches where id = $1
         ),
         'dsk_row_count', (
           select count(*) from public.mtg_canonical_import_rows where batch_id = $1
         ),
         'msh_batch_count', (
           select count(*) from public.mtg_canonical_import_batches where id = $2
         ),
         'msh_row_count', (
           select count(*) from public.mtg_canonical_import_rows where batch_id = $2
         )
       ) as value`,
      [DSK_BATCH_ID, contract.batch_id],
    );
    const canonical = await client.query(`
      select jsonb_build_object(
        'release_status', (
          select release_status from public.catalog_game_release_controls where game_code = 'mtg'
        ),
        'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
        'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
        'mtg_card_count', (
          select count(*) from public.card_prints
          where game_id = '4d544700-0000-4000-8000-000000000001'::uuid
        ),
        'mtg_identity_count', (
          select count(*) from public.card_print_identity
          where identity_domain = 'mtg_eng_paper_print'
        ),
        'mtg_printing_count', (
          select count(*) from public.card_printings printing
          join public.card_prints card on card.id = printing.card_print_id
          where card.game_id = '4d544700-0000-4000-8000-000000000001'::uuid
        ),
        'msh_canonical_set_count', (
          select count(*) from public.sets where game = 'mtg' and code = 'msh'
        ),
        'msh_canonical_card_count', (
          select count(*) from public.card_prints
          where game_id = '4d544700-0000-4000-8000-000000000001'::uuid
            and set_code = 'msh'
        ),
        'pokemon_card_count', (
          select count(*) from public.card_prints card
          join public.games game on game.id = card.game_id where game.code = 'pokemon'
        )
      ) as value
    `);
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
      batch: batch.rows,
      rows: rows.rows,
      totals: totals.rows[0].value,
      canonical: canonical.rows[0].value,
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
  return `# MTG MSH Service-Only Stage Independent Readback

- Status: **${result.status.toUpperCase()}**
- Batch ID: \`${result.contract.batch_id}\`
- Exact MSH staged rows: \`${result.reconciliation.row_count}\`
- Total immutable batches: \`${result.production.totals.batch_count}\`
- Total immutable staged rows: \`${result.production.totals.row_count}\`
- Canonical MTG cards: \`${result.production.canonical.mtg_card_count}\`
- Canonical MSH cards: \`${result.production.canonical.msh_canonical_card_count}\`
- Current source lanes: \`${result.production.source.source_row_count}\`
- Client-visible MTG rows: \`0\`
- Findings: \`${result.findings.length}\`
- Database writes: \`0\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payloadBody = await fs.readFile(args.payload, "utf8");
  const applySummaryBody = await fs.readFile(args.applySummary, "utf8");
  const payload = JSON.parse(payloadBody);
  const applySummary = JSON.parse(applySummaryBody);
  const contract = buildMtgCanaryStageContractV1(payload);
  const production = await captureProduction(payload, contract);
  const reconciliation = reconcileMtgStageRowsV1(production.rows, contract);
  delete production.rows;
  const findings = evaluateMtgSetStagePostApplyReadbackV1({
    payload,
    contract,
    applySummary,
    production,
    reconciliation,
  });
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "service_only_stage_apply_verified" : "blocked",
    payload_sha256: sha256(payloadBody),
    apply_artifact_sha256: sha256(applySummaryBody),
    writer_payload_fingerprint: payload.writer_payload_fingerprint,
    contract: {
      batch_id: contract.batch_id,
      staged_row_count: contract.staged_row_count,
      staged_rows_sha256: contract.staged_rows_sha256,
      mutation_contract_sha256: contract.mutation_contract_sha256,
    },
    reconciliation,
    production,
    findings,
    boundaries: {
      transaction_read_only: true,
      database_writes: false,
      canonical_writes: false,
      app_visibility: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
    },
  };
  const outDir =
    args.outDir ??
    path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "mtg_canonical_catalog_set_stage_post_apply_readback_v1",
    );
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
