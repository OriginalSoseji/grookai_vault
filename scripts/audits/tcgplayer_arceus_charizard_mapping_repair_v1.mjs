import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import pg from "pg";

import "../../backend/env.mjs";

const { Client } = pg;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REPAIR_VERSION = "TCGPLAYER_ARCEUS_CHARIZARD_MAPPING_REPAIR_V1";
const ASSIGNMENT_VERSION = "MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1_1";
const SOURCE_PRODUCT_ID = 84191;
const TCGDEX_EXTERNAL_ID = "pl4-1";
const JUSTTCG_EXTERNAL_ID = "pokemon-arceus-charizard-holo-rare";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "mapping_repairs",
);

function parseArgs(argv) {
  const sourceRunArg = argv.find((arg) => arg.startsWith("--source-run-id="));
  const outRootArg = argv.find((arg) => arg.startsWith("--out-root="));
  const args = {
    apply: argv.includes("--apply"),
    sourceRunId: sourceRunArg?.slice("--source-run-id=".length).trim() ?? null,
    outRoot: path.resolve(
      outRootArg?.slice("--out-root=".length) || DEFAULT_OUT_ROOT,
    ),
  };
  if (!args.sourceRunId) throw new Error("--source-run-id is required");
  return args;
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function git(args) {
  const result = await execFileAsync("git", args, {
    cwd: REPO_ROOT,
    timeout: 15_000,
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function readContext(client, sourceRunId) {
  const context = await client.query(
    `with expected_card as (
       select card.id, card.gv_id, card.name, card.number, set_row.name as set_name
       from public.external_mappings mapping
       join public.card_prints card on card.id = mapping.card_print_id
       join public.sets set_row on set_row.id = card.set_id
       where mapping.source = 'tcgdex'
         and mapping.external_id = $1
         and mapping.active = true
     ),
     source_product as (
       select product.product_id, product.name, product.group_id,
              source_group.name as group_name, product.extended_data
       from public.tcgcsv_source_products product
       join public.tcgcsv_source_groups source_group
         on source_group.category_id = product.category_id
        and source_group.group_id = product.group_id
       where product.category_id = 3
         and product.product_id = $2
     )
     select
       expected_card.id as expected_card_print_id,
       expected_card.gv_id as expected_gv_id,
       expected_card.name as expected_name,
       expected_card.number as expected_number,
       expected_card.set_name as expected_set_name,
       source_product.name as source_product_name,
       source_product.group_name as source_group_name,
       source_product.extended_data as source_extended_data,
       tcgplayer_mapping.id as tcgplayer_mapping_id,
       tcgplayer_mapping.card_print_id as prior_tcgplayer_card_print_id,
       tcgplayer_mapping.meta as prior_tcgplayer_meta,
       justtcg_mapping.id as justtcg_mapping_id,
       justtcg_mapping.card_print_id as prior_justtcg_card_print_id,
       justtcg_mapping.meta as prior_justtcg_meta
     from expected_card
     cross join source_product
     join public.external_mappings tcgplayer_mapping
       on tcgplayer_mapping.source = 'tcgplayer'
      and tcgplayer_mapping.external_id = $2::text
      and tcgplayer_mapping.active = true
     left join public.external_mappings justtcg_mapping
       on justtcg_mapping.source = 'justtcg'
      and justtcg_mapping.external_id = $3
      and justtcg_mapping.active = true`,
    [TCGDEX_EXTERNAL_ID, SOURCE_PRODUCT_ID, JUSTTCG_EXTERNAL_ID],
  );
  if (context.rowCount !== 1) {
    throw new Error(`expected one repair context, found ${context.rowCount}`);
  }

  const observations = await client.query(
    `select
       observation.id,
       observation.subtype_name,
       public.normalize_tcgplayer_market_subtype_v1(
         observation.subtype_name
       ) as normalized_finish_key,
       assignment.id as prior_assignment_id
     from public.tcgcsv_source_sync_runs source_run
     join public.tcgcsv_source_price_daily_observations observation
       on observation.last_seen_run_id = source_run.id
      and observation.observed_on = source_run.observed_on
      and observation.category_id = 3
      and observation.product_id = $2
     left join public.market_evidence_variant_assignments assignment
       on assignment.source_family = 'tcgcsv_market_close'
      and assignment.source_table =
        'tcgcsv_source_price_daily_observations'
      and assignment.source_row_id = observation.id
      and assignment.variant_assignment_version =
        'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1'
     where source_run.id = $1
       and source_run.sync_mode = 'current_full_sync'
       and source_run.status = 'completed'
       and source_run.failed_count = 0
     order by observation.subtype_name`,
    [sourceRunId, SOURCE_PRODUCT_ID],
  );
  return { ...context.rows[0], observations: observations.rows };
}

function assertRepairContext(context) {
  const printedNumber = context.source_extended_data?.find(
    (field) => String(field?.name).toLowerCase() === "number",
  )?.value;
  if (
    context.expected_name !== "Charizard" ||
    context.expected_number !== "1" ||
    context.expected_set_name !== "Arceus" ||
    context.source_product_name !== "Charizard" ||
    context.source_group_name !== "Arceus" ||
    printedNumber !== "1/99"
  ) {
    throw new Error("source and canonical Charizard identity proof failed");
  }
  if (
    context.prior_tcgplayer_meta?.tcgdex_external_id !== TCGDEX_EXTERNAL_ID
  ) {
    throw new Error("TCGplayer mapping lacks the expected TCGdex derivation");
  }
  if (context.observations.length !== 2) {
    throw new Error(
      `expected two current price observations, found ${context.observations.length}`,
    );
  }
  const finishes = context.observations
    .map((row) => row.normalized_finish_key)
    .sort();
  if (finishes.join(",") !== "holo,reverse") {
    throw new Error(`unexpected source finishes: ${finishes.join(",")}`);
  }
  if (context.observations.some((row) => !row.prior_assignment_id)) {
    throw new Error("every correction must supersede an existing assignment");
  }
}

async function applyRepair(client, context) {
  const tcgplayerUpdate = await client.query(
    `update public.external_mappings
        set card_print_id = $1,
            meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
              'mapping_correction_version', $2::text,
              'mapping_correction_reason',
                'TCGdex pl4-1 and TCGCSV Arceus 1/99 identify Charizard',
              'mapping_correction_prior_card_print_id', card_print_id::text
            )
      where id = $3
        and card_print_id = $4`,
    [
      context.expected_card_print_id,
      REPAIR_VERSION,
      context.tcgplayer_mapping_id,
      context.prior_tcgplayer_card_print_id,
    ],
  );

  let justtcgUpdated = 0;
  if (context.justtcg_mapping_id) {
    const justtcgUpdate = await client.query(
      `update public.external_mappings
          set card_print_id = $1,
              meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
                'mapping_correction_version', $2::text,
                'mapping_correction_reason',
                  'JustTCG Arceus Charizard identity follows corrected TCGplayer mapping',
                'mapping_correction_prior_card_print_id', card_print_id::text
              )
        where id = $3
          and card_print_id = $4`,
      [
        context.expected_card_print_id,
        REPAIR_VERSION,
        context.justtcg_mapping_id,
        context.prior_justtcg_card_print_id,
      ],
    );
    justtcgUpdated = justtcgUpdate.rowCount;
  }

  const inserted = await client.query(
    `insert into public.market_evidence_variant_assignments (
       contract_version,
       source_family,
       source_table,
       source_row_id,
       observation_id,
       card_print_id,
       gv_id,
       card_printing_id,
       printing_gv_id,
       source_finish_hint,
       normalized_finish_key,
       assigned_finish_key,
       variant_assignment_status,
       variant_assignment_confidence,
       variant_assignment_version,
       variant_assignment_reason,
       variant_assignment_flags,
       assignment_payload,
       needs_review,
       publishable,
       app_visible,
       market_truth
     )
     select
       'MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1',
       'tcgcsv_market_close',
       'tcgcsv_source_price_daily_observations',
       observation.id,
       observation.id,
       card.id,
       card.gv_id,
       printing.id,
       printing.printing_gv_id,
       observation.subtype_name,
       public.normalize_tcgplayer_market_subtype_v1(
         observation.subtype_name
       ),
       printing.finish_key,
       'exact_child_finish',
       1.0000,
       $3,
       'append-only correction from exact TCGdex and TCGCSV identity evidence',
       array['supersedes_incorrect_arceus_ar1_assignment']::text[],
       jsonb_build_object(
         'repair_version', $4::text,
         'source_mapping_id', mapping.id,
         'source_product_id', observation.product_id,
         'source_subtype_name', observation.subtype_name,
         'source_observation_id', observation.id,
         'superseded_assignment_id', prior_assignment.id
       ),
       false,
       false,
       false,
       false
     from public.tcgcsv_source_sync_runs source_run
     join public.tcgcsv_source_price_daily_observations observation
       on observation.last_seen_run_id = source_run.id
      and observation.observed_on = source_run.observed_on
      and observation.category_id = 3
      and observation.product_id = $2
     join public.external_mappings mapping
       on mapping.source = 'tcgplayer'
      and mapping.external_id = observation.product_id::text
      and mapping.active = true
     join public.card_prints card
       on card.id = mapping.card_print_id
     join public.card_printings printing
       on printing.card_print_id = card.id
      and printing.finish_key =
        public.normalize_tcgplayer_market_subtype_v1(
          observation.subtype_name
        )
     join public.market_evidence_variant_assignments prior_assignment
       on prior_assignment.source_family = 'tcgcsv_market_close'
      and prior_assignment.source_table =
        'tcgcsv_source_price_daily_observations'
      and prior_assignment.source_row_id = observation.id
      and prior_assignment.variant_assignment_version =
        'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1'
     where source_run.id = $1
       and card.id = $5
     on conflict (
       source_family,
       source_row_id,
       variant_assignment_version
     ) do nothing`,
    [
      context.source_run_id,
      SOURCE_PRODUCT_ID,
      ASSIGNMENT_VERSION,
      REPAIR_VERSION,
      context.expected_card_print_id,
    ],
  );

  return {
    tcgplayer_mapping_updated: tcgplayerUpdate.rowCount,
    justtcg_mapping_updated: justtcgUpdated,
    correction_assignments_inserted: inserted.rowCount,
  };
}

async function readback(client, sourceRunId, expectedCardPrintId) {
  const result = await client.query(
    `select jsonb_build_object(
       'tcgplayer_mapping_rows', (
         select count(*)
         from public.external_mappings
         where source = 'tcgplayer'
           and external_id = $2::text
           and active = true
           and card_print_id = $3
       ),
       'justtcg_mapping_rows', (
         select count(*)
         from public.external_mappings
         where source = 'justtcg'
           and external_id = $4
           and active = true
           and card_print_id = $3
       ),
       'correction_assignment_rows', (
         select count(*)
         from public.tcgcsv_source_price_daily_observations observation
         join public.market_evidence_variant_assignments assignment
           on assignment.source_family = 'tcgcsv_market_close'
          and assignment.source_row_id = observation.id
          and assignment.variant_assignment_version = $5
          and assignment.card_print_id = $3
          and assignment.card_printing_id is not null
          and assignment.variant_assignment_status = 'exact_child_finish'
         where observation.last_seen_run_id = $1
           and observation.product_id = $2
       ),
       'candidate_rows', (
         select jsonb_agg(
           jsonb_build_object(
             'source_observation_id', source_observation_id,
             'source_subtype_name', source_subtype_name,
             'gv_id', gv_id,
             'printing_gv_id', printing_gv_id,
             'variant_assignment_version', variant_assignment_version
           )
           order by source_subtype_name
         )
         from public.v_tcgplayer_market_qualification_candidates_v1
         where source_product_id = $2::integer
       )
     ) as proof`,
    [
      sourceRunId,
      SOURCE_PRODUCT_ID,
      expectedCardPrintId,
      JUSTTCG_EXTERNAL_ID,
      ASSIGNMENT_VERSION,
    ],
  );
  return result.rows[0].proof;
}

function assertReadback(proof) {
  if (
    Number(proof.tcgplayer_mapping_rows) !== 1 ||
    Number(proof.justtcg_mapping_rows) !== 1 ||
    Number(proof.correction_assignment_rows) !== 2 ||
    proof.candidate_rows?.length !== 2 ||
    proof.candidate_rows.some(
      (row) =>
        row.gv_id !== "GV-PK-AR-1" ||
        row.variant_assignment_version !== ASSIGNMENT_VERSION ||
        !row.printing_gv_id,
    )
  ) {
    throw new Error("mapping correction readback did not reconcile");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) throw new Error("database URL is required");
  const [commitSha, branch, trackedChanges] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain", "--untracked-files=no"]),
  ]);
  if (args.apply && trackedChanges) {
    throw new Error("apply requires a clean tracked working tree");
  }

  const outDir = path.join(
    args.outRoot,
    `${REPAIR_VERSION}-${args.sourceRunId}`,
  );
  await fs.mkdir(outDir, { recursive: true });
  const runPlan = {
    repair_version: REPAIR_VERSION,
    mode: args.apply ? "apply" : "dry_run",
    commit_sha: commitSha,
    branch,
    source_sync_run_id: args.sourceRunId,
    source_product_id: SOURCE_PRODUCT_ID,
    assignment_version: ASSIGNMENT_VERSION,
    boundaries: {
      external_mapping_correction: args.apply,
      append_only_assignment_correction: args.apply,
      canonical_card_mutation: false,
      source_price_mutation: false,
      qualification_mutation: false,
      snapshot_mutation: false,
      current_publication_activation: false,
      vault_writes: false,
    },
  };
  await writeJson(path.join(outDir, "run_plan.json"), runPlan);

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 10 * 60_000,
    statement_timeout: 10 * 60_000,
  });
  await client.connect();
  try {
    const context = await readContext(client, args.sourceRunId);
    context.source_run_id = args.sourceRunId;
    assertRepairContext(context);
    await client.query("begin");
    const writes = await applyRepair(client, context);
    const proof = await readback(
      client,
      args.sourceRunId,
      context.expected_card_print_id,
    );
    assertReadback(proof);
    if (args.apply) await client.query("commit");
    else await client.query("rollback");

    const result = {
      ...runPlan,
      status: args.apply ? "applied" : "dry_run_rolled_back",
      prior_tcgplayer_card_print_id: context.prior_tcgplayer_card_print_id,
      prior_justtcg_card_print_id: context.prior_justtcg_card_print_id,
      corrected_card_print_id: context.expected_card_print_id,
      corrected_gv_id: context.expected_gv_id,
      writes,
      proof,
    };
    await writeJson(path.join(outDir, "result.json"), result);
    await writeJson(path.join(outDir, "artifact_hashes.json"), {
      run_plan_sha256: sha256(
        await fs.readFile(path.join(outDir, "run_plan.json")),
      ),
      result_sha256: sha256(
        await fs.readFile(path.join(outDir, "result.json")),
      ),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-arceus-charizard-repair] ${error.stack || error}`);
  process.exitCode = 1;
});
