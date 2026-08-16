import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { buildMtgCanonicalPromotionContractV1 } from "./mtg_canonical_catalog_promotion_contract_v1.mjs";
import {
  captureMtgClientVisibilityV1,
  captureMtgPromotionExactReadbackV1,
  captureMtgPromotionStateV1,
  MTG_GAME_ID,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";
import { stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";
import { reconcileMtgStageRowsV1 } from "./mtg_canonical_catalog_stage_readback_v1.mjs";
import { buildMtgCanaryStageContractV1 } from "./mtg_canonical_catalog_canary_stage_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_PROMOTION_POST_APPLY_READBACK_V1";
const EXPECTED_LEDGER = Object.freeze([
  { version: "20260813185000", name: "mtg_canonical_import_staging_v1" },
  { version: "20260813190000", name: "mtg_canonical_catalog_foundation_v1" },
  { version: "20260813200000", name: "mtg_catalog_app_visibility_boundary_v1" },
]);

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

export function evaluateMtgCanonicalPostApplyReadbackV1({
  plan,
  applySummary,
  readback,
  stagingReconciliation,
}) {
  const findings = [...stagingReconciliation.findings];
  if (applySummary.status !== "hidden_canonical_promotion_applied_and_read_back") {
    findings.push("apply_artifact_status_mismatch");
  }
  for (const key of [
    "writer_payload_fingerprint",
    "foundation_migration_sha256",
    "visibility_migration_sha256",
    "mutation_contract_sha256",
    "promotion_rows_sha256",
    "promotion_plan_sha256",
  ]) {
    if (applySummary.plan?.[key] !== plan[key]) findings.push(`apply_${key}_mismatch`);
  }
  if (stableJson(readback.ledger) !== stableJson(EXPECTED_LEDGER)) {
    findings.push("migration_ledger_mismatch");
  }
  if (readback.transaction_read_only !== true) findings.push("transaction_not_read_only");

  const state = readback.state;
  if (!state.foundation_migration_present) findings.push("foundation_migration_missing");
  if (!state.visibility_migration_present) findings.push("visibility_migration_missing");
  if (!state.visibility_table_present) findings.push("visibility_table_missing");
  expectNumber(findings, state.staging_batch_count, 1, "staging_batch_count");
  expectNumber(findings, state.staging_row_count, 2866, "staging_row_count");
  expectNumber(findings, state.mtg_game_count, 1, "mtg_game_count");
  expectNumber(findings, state.mtg_set_count, plan.row_counts.sets, "mtg_set_count");
  expectNumber(findings, state.mtg_card_count, plan.row_counts.card_prints, "mtg_card_count");

  for (const [name, expected] of Object.entries(plan.row_counts)) {
    const exact = readback.exact[name];
    if (!exact) {
      findings.push(`${name}_exact_readback_missing`);
      continue;
    }
    expectNumber(findings, exact.planned_count, expected, `${name}_planned_count`);
    expectNumber(findings, exact.actual_count, expected, `${name}_actual_count`);
    expectNumber(findings, exact.exact_count, expected, `${name}_exact_count`);
  }

  const service = readback.service;
  if (service.release_status !== "hidden") findings.push("mtg_release_not_hidden");
  expectNumber(findings, service.mtg_game_count, 1, "service_mtg_game_count");
  expectNumber(findings, service.mtg_set_count, plan.row_counts.sets, "service_mtg_set_count");
  expectNumber(findings, service.mtg_card_count, plan.row_counts.card_prints, "service_mtg_card_count");
  expectNumber(
    findings,
    service.mtg_identity_count,
    plan.row_counts.card_print_identity,
    "service_mtg_identity_count",
  );
  expectNumber(
    findings,
    service.mtg_printing_count,
    plan.row_counts.card_printings,
    "service_mtg_printing_count",
  );
  expectNumber(
    findings,
    service.parent_mapping_count,
    plan.row_counts.external_mappings,
    "service_parent_mapping_count",
  );
  expectNumber(
    findings,
    service.printing_mapping_count,
    plan.row_counts.external_printing_mappings,
    "service_printing_mapping_count",
  );

  const expectedSecurity = {
    release_table_rls: true,
    anon_release_select: false,
    authenticated_release_select: false,
    service_release_select: true,
    service_release_insert: true,
    service_release_update: true,
    restrictive_policy_count: 5,
    internal_search_anon_execute: false,
    internal_search_authenticated_execute: false,
    wrapper_search_anon_execute: true,
    wrapper_search_authenticated_execute: true,
  };
  if (stableJson(readback.security) !== stableJson(expectedSecurity)) {
    findings.push("visibility_security_mismatch");
  }

  for (const role of ["anon", "authenticated"]) {
    const visibility = readback.client_visibility[role];
    for (const key of [
      "game_count",
      "set_count",
      "card_count",
      "identity_count",
      "printing_count",
      "legacy_search_count",
      "print_search_count",
    ]) {
      expectNumber(findings, visibility[key], 0, `${role}_${key}`);
    }
  }

  const appliedDurable = applySummary.database_proof?.durable;
  expectNumber(
    findings,
    service.pokemon_card_count,
    appliedDurable?.service?.pokemon_card_count,
    "pokemon_service_count",
  );
  expectNumber(
    findings,
    readback.client_visibility.authenticated.pokemon_card_count,
    appliedDurable?.client_visibility?.authenticated?.pokemon_card_count,
    "pokemon_authenticated_count",
  );

  for (const [key, value] of Object.entries(readback.image_pointers)) {
    expectNumber(findings, value, 0, key);
  }
  expectNumber(
    findings,
    readback.source.planned_count,
    plan.row_counts.external_printing_mappings,
    "source_planned_count",
  );
  expectNumber(
    findings,
    readback.source.source_row_count,
    plan.row_counts.external_printing_mappings,
    "source_row_count",
  );
  expectNumber(
    findings,
    readback.source.positive_market_price_count,
    plan.row_counts.external_printing_mappings,
    "source_positive_market_price_count",
  );
  if (stagingReconciliation.actual_hash_sha256 !== plan.staging_rows_sha256) {
    findings.push("staging_rows_hash_mismatch");
  }
  return [...new Set(findings)];
}

async function captureSecurity(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'release_table_rls', (
        select relrowsecurity from pg_class
        where oid = 'public.catalog_game_release_controls'::regclass
      ),
      'anon_release_select', has_table_privilege(
        'anon', 'public.catalog_game_release_controls', 'select'
      ),
      'authenticated_release_select', has_table_privilege(
        'authenticated', 'public.catalog_game_release_controls', 'select'
      ),
      'service_release_select', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'select'
      ),
      'service_release_insert', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'insert'
      ),
      'service_release_update', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'update'
      ),
      'restrictive_policy_count', (
        select count(*) from pg_policies
        where schemaname = 'public' and permissive = 'RESTRICTIVE'
          and policyname in (
            'games_catalog_release_visibility_v1',
            'sets_catalog_release_visibility_v1',
            'card_prints_catalog_release_visibility_v1',
            'card_print_identity_catalog_release_visibility_v1',
            'card_printings_catalog_release_visibility_v1'
          )
      ),
      'internal_search_anon_execute', has_function_privilege(
        'anon',
        'public.search_print_identity_unfiltered_internal_v1(text,text,text,text,integer,integer)',
        'execute'
      ),
      'internal_search_authenticated_execute', has_function_privilege(
        'authenticated',
        'public.search_print_identity_unfiltered_internal_v1(text,text,text,text,integer,integer)',
        'execute'
      ),
      'wrapper_search_anon_execute', has_function_privilege(
        'anon', 'public.search_print_identity_v1(text,text,text,text,integer,integer)', 'execute'
      ),
      'wrapper_search_authenticated_execute', has_function_privilege(
        'authenticated',
        'public.search_print_identity_v1(text,text,text,text,integer,integer)',
        'execute'
      )
    ) as value
  `);
  return result.rows[0].value;
}

async function captureService(client, plan) {
  const result = await client.query(
    `select jsonb_build_object(
       'release_status', (
         select release_status from public.catalog_game_release_controls where game_code = 'mtg'
       ),
       'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
       'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
       'mtg_card_count', (select count(*) from public.card_prints where game_id = $1),
       'mtg_identity_count', (
         select count(*) from public.card_print_identity where identity_domain = 'mtg_eng_paper_print'
       ),
       'mtg_printing_count', (
         select count(*) from public.card_printings where card_print_id = any($2::uuid[])
       ),
       'parent_mapping_count', (
         select count(*) from public.external_mappings
         where source = 'scryfall' and external_id = any($3::text[])
       ),
       'printing_mapping_count', (
         select count(*) from public.external_printing_mappings
         where source = 'tcgplayer_market' and external_id = any($4::text[])
       ),
       'pokemon_card_count', (
         select count(*) from public.card_prints card
         join public.games game on game.id = card.game_id
         where game.code = 'pokemon'
       )
     ) as value`,
    [
      MTG_GAME_ID,
      plan.rows.card_prints.map((row) => row.id),
      plan.rows.external_mappings.map((row) => row.external_id),
      plan.rows.external_printing_mappings.map((row) => row.external_id),
    ],
  );
  return result.rows[0].value;
}

async function captureSourceLanes(client, payload) {
  const result = await client.query(
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
  return result.rows[0];
}

async function readProduction(payload, plan, stageContract) {
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
    const ledger = await client.query(
      `select version, name from supabase_migrations.schema_migrations
       where version in ('20260813185000', '20260813190000', '20260813200000')
       order by version`,
    );
    const state = await captureMtgPromotionStateV1(client, plan);
    const exact = await captureMtgPromotionExactReadbackV1(client, plan.rows);
    const security = await captureSecurity(client);
    const service = await captureService(client, plan);
    const anon = await captureMtgClientVisibilityV1(client, "anon", payload.selected_set.code);
    const authenticated = await captureMtgClientVisibilityV1(
      client,
      "authenticated",
      payload.selected_set.code,
    );
    const imagePointers = await client.query(
      `select jsonb_build_object(
         'parent_image_url_count', count(*) filter (where image_url is not null),
         'parent_image_alt_url_count', count(*) filter (where image_alt_url is not null),
         'parent_image_source_count', count(*) filter (where image_source is not null),
         'printing_image_path_count', (
           select count(*) from public.card_printings
           where card_print_id = any($1::uuid[]) and image_path is not null
         ),
         'printing_image_url_count', (
           select count(*) from public.card_printings
           where card_print_id = any($1::uuid[]) and image_url is not null
         ),
         'printing_image_alt_url_count', (
           select count(*) from public.card_printings
           where card_print_id = any($1::uuid[]) and image_alt_url is not null
         )
       ) as value
       from public.card_prints where id = any($1::uuid[])`,
      [plan.rows.card_prints.map((row) => row.id)],
    );
    const stageRows = await client.query(
      `select id::text, batch_id::text, entity_type, row_key, row_ordinal,
              payload, payload_sha256
       from public.mtg_canonical_import_rows
       where batch_id = $1
       order by entity_type, row_ordinal`,
      [stageContract.batch_id],
    );
    const source = await captureSourceLanes(client, payload);
    const transactionReadOnly = await client.query(
      "select current_setting('transaction_read_only')::boolean as value",
    );
    await client.query("rollback");
    return {
      ledger: ledger.rows,
      state,
      exact,
      security,
      service,
      client_visibility: { anon, authenticated },
      image_pointers: imagePointers.rows[0].value,
      stage_rows: stageRows.rows,
      source,
      transaction_read_only: transactionReadOnly.rows[0].value,
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
  return `# MTG DSK Canonical Promotion Independent Readback

- Status: **${result.status.toUpperCase()}**
- Promotion plan: \`${result.plan.promotion_plan_sha256}\`
- Apply artifact SHA-256: \`${result.apply_artifact_sha256}\`
- Canonical cards: \`${result.production.service.mtg_card_count}\`
- Finish printings: \`${result.production.service.mtg_printing_count}\`
- Scryfall mappings: \`${result.production.service.parent_mapping_count}\`
- TCGPlayer mappings: \`${result.production.service.printing_mapping_count}\`
- Staged rows: \`${result.staging_reconciliation.row_count}\`
- Source price lanes: \`${result.production.source.source_row_count} / ${result.production.source.planned_count}\`
- Anonymous MTG visibility: \`${result.production.client_visibility.anon.card_count}\`
- Authenticated MTG visibility: \`${result.production.client_visibility.authenticated.card_count}\`
- Non-null MTG image pointers: \`${Object.values(result.production.image_pointers).reduce((sum, value) => sum + Number(value), 0)}\`
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
  const foundationSql = await fs.readFile(
    path.join(
      ROOT,
      "supabase",
      "migrations",
      "20260813190000_mtg_canonical_catalog_foundation_v1.sql",
    ),
    "utf8",
  );
  const visibilitySql = await fs.readFile(
    path.join(
      ROOT,
      "supabase",
      "migrations",
      "20260813200000_mtg_catalog_app_visibility_boundary_v1.sql",
    ),
    "utf8",
  );
  const plan = buildMtgCanonicalPromotionContractV1({
    payload,
    foundationMigrationSha256: sha256(foundationSql),
    visibilityMigrationSha256: sha256(visibilitySql),
  });
  const stageContract = buildMtgCanaryStageContractV1(payload);
  const production = await readProduction(payload, plan, stageContract);
  const stagingReconciliation = reconcileMtgStageRowsV1(production.stage_rows, stageContract);
  delete production.stage_rows;
  const findings = evaluateMtgCanonicalPostApplyReadbackV1({
    plan,
    applySummary,
    readback: production,
    stagingReconciliation,
  });
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "hidden_canonical_apply_verified" : "blocked",
    apply_artifact_sha256: sha256(applySummaryBody),
    payload_sha256: sha256(payloadBody),
    plan: {
      writer_payload_fingerprint: plan.writer_payload_fingerprint,
      staging_rows_sha256: plan.staging_rows_sha256,
      foundation_migration_sha256: plan.foundation_migration_sha256,
      visibility_migration_sha256: plan.visibility_migration_sha256,
      mutation_contract_sha256: plan.mutation_contract_sha256,
      promotion_rows_sha256: plan.promotion_rows_sha256,
      promotion_plan_sha256: plan.promotion_plan_sha256,
      row_counts: plan.row_counts,
    },
    staging_reconciliation: stagingReconciliation,
    production,
    findings,
    boundaries: {
      transaction_read_only: true,
      database_writes: false,
      image_writes: false,
      pricing_writes: false,
      release_status_changes: false,
    },
  };
  const outDir =
    args.outDir ??
    path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "mtg_canonical_catalog_promotion_post_apply_readback_v1",
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
