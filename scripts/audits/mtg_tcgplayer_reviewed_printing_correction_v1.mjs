import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  connectVerifiedDbClient,
  targetBindingFromEnvironment,
} from "./japanese_master_index_v4/image_pointer_apply_db_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const VERSION = "MTG_REVIEWED_PRINTING_CORRECTION_V1";
const APPROVAL_ENV = "MTG_REVIEWED_PRINTING_CORRECTION_APPROVAL";
const LOCK_KEY = "grookai:mtg:reviewed_printing_correction_v1";
const MIGRATION_PATH = path.join(
  ROOT,
  "supabase/migrations/20261020220000_mtg_reviewed_printing_correction_bridge_v1.sql",
);
export const SCOPE = Object.freeze({
  product_id: 269823,
  group_id: 3026,
  product_name: "Treasure Token (017)",
  subtype: "Normal",
  finish: "normal",
  number: "17",
  parent_mapping_id: 306816,
  printing_mapping_id: "07751bc7-c883-49bd-9857-ca52d67e6037",
  source_parent_id: "1cbf7bdc-8486-598d-a58c-c4177ec19f00",
  source_printing_id: "f5b2f8ba-34fc-58ab-9368-4a56c310e954",
  target_parent_id: "34df9367-1d9e-5c13-ab31-5f47d0d4cfc9",
  target_printing_id: "b0f575e1-4529-5bc0-bc66-4ca1cc19ad98",
  target_scryfall_id: "93116d98-2dad-4b80-a3af-9e36e34da6d4",
  target_gv_id: "GV-MTG-SF-93116D98-2DAD-4B80-A3AF-9E36E34DA6D4",
  target_printing_gv_id: "GV-MTG-SF-93116D98-2DAD-4B80-A3AF-9E36E34DA6D4-NORMAL",
});

function parseArgs(argv) {
  const args = { mode: "plan", outDir: null, sourceSyncRunId: null, expectedHeadSha: null };
  for (const arg of argv) {
    if (arg === "--plan") args.mode = "plan";
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--schema-rehearsal") args.mode = "schema-rehearsal";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--source-sync-run-id=")) args.sourceSyncRunId = arg.slice(21);
    else if (arg.startsWith("--expected-head-sha=")) args.expectedHeadSha = arg.slice(20).toLowerCase();
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.outDir) throw new Error("--out-dir is required");
  if (!/^[a-f0-9-]{36}$/.test(args.sourceSyncRunId ?? "")) {
    throw new Error("--source-sync-run-id must be a UUID");
  }
  if (args.expectedHeadSha && !/^[a-f0-9]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a full commit SHA");
  }
  if (args.mode === "apply" && !args.expectedHeadSha) {
    throw new Error("--expected-head-sha is required for apply");
  }
  return args;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertEqual(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    throw new Error(`${label} drift expected=${expected} actual=${actual}`);
  }
}

async function readScope(client, sourceSyncRunId) {
  const source = (await client.query(`
    select observation.id::text as source_observation_id,
           observation.last_seen_run_id::text as source_sync_run_id,
           observation.product_id, observation.category_id, observation.group_id,
           observation.subtype_name, observation.market_price,
           product.name as product_name, product.extended_data,
           source_run.status as source_status,
           source_run.sync_mode, source_run.failed_count
      from public.tcgcsv_source_price_daily_observations observation
      join public.tcgcsv_source_products product on product.product_id=observation.product_id
      join public.tcgcsv_source_sync_runs source_run on source_run.id=observation.last_seen_run_id
     where observation.last_seen_run_id=$1::uuid
       and observation.product_id=$2
       and observation.subtype_name=$3`,
    [sourceSyncRunId, SCOPE.product_id, SCOPE.subtype])).rows;
  if (source.length !== 1) throw new Error(`source observation count expected=1 actual=${source.length}`);
  const sourceRow = source[0];
  assertEqual("source.category_id", sourceRow.category_id, 1);
  assertEqual("source.group_id", sourceRow.group_id, SCOPE.group_id);
  assertEqual("source.product_name", sourceRow.product_name, SCOPE.product_name);
  assertEqual("source.source_status", sourceRow.source_status, "completed");
  assertEqual("source.sync_mode", sourceRow.sync_mode, "current_full_sync");
  assertEqual("source.failed_count", sourceRow.failed_count, 0);
  if (!(Number(sourceRow.market_price) > 0)) throw new Error("source market price must be positive");
  const printedNumber = (sourceRow.extended_data ?? []).find(
    (field) => String(field?.name).toLowerCase() === "number",
  )?.value;
  assertEqual("source.printed_number", printedNumber, SCOPE.number);

  const cards = (await client.query(`
    select card.id::text,card.gv_id,card.name,card.number,lower(card.set_code) as set_code,
           card.external_ids->>'scryfall' as scryfall_id,
           printing.id::text as printing_id,printing.printing_gv_id,printing.finish_key,
           printing.is_provisional,
           count(identity.id)::integer as active_identity_count,
           count(review.id)::integer as hidden_review_count
      from public.card_prints card
      join public.card_printings printing on printing.card_print_id=card.id
      left join public.card_print_identity identity
        on identity.card_print_id=card.id and identity.is_active
       and identity.identity_domain='mtg_eng_paper_print'
      left join public.card_printing_truth_reviews review
        on review.card_printing_id=printing.id and review.active
       and review.public_visibility in ('hidden_pending_review','hidden_unsupported')
     where printing.id = any($1::uuid[])
     group by card.id,printing.id
     order by printing.id`, [[SCOPE.source_printing_id, SCOPE.target_printing_id]])).rows;
  if (cards.length !== 2) throw new Error(`canonical printing count expected=2 actual=${cards.length}`);
  const target = cards.find((row) => row.printing_id === SCOPE.target_printing_id);
  if (!target) throw new Error("target canonical printing is missing");
  assertEqual("target.parent_id", target.id, SCOPE.target_parent_id);
  assertEqual("target.gv_id", target.gv_id, SCOPE.target_gv_id);
  assertEqual("target.printing_gv_id", target.printing_gv_id, SCOPE.target_printing_gv_id);
  assertEqual("target.name", target.name, "Treasure");
  assertEqual("target.number", target.number, SCOPE.number);
  assertEqual("target.set_code", target.set_code, "tsnc");
  assertEqual("target.scryfall_id", target.scryfall_id, SCOPE.target_scryfall_id);
  assertEqual("target.finish_key", target.finish_key, SCOPE.finish);
  assertEqual("target.is_provisional", target.is_provisional, false);
  assertEqual("target.active_identity_count", target.active_identity_count, 1);
  assertEqual("target.hidden_review_count", target.hidden_review_count, 0);

  const parentMapping = (await client.query(`
    select id,card_print_id::text,source,external_id,active,meta
      from public.external_mappings where id=$1`, [SCOPE.parent_mapping_id])).rows[0];
  const printingMapping = (await client.query(`
    select id::text,card_printing_id::text,source,external_id,active,meta
      from public.external_printing_mappings where id=$1::uuid`, [SCOPE.printing_mapping_id])).rows[0];
  if (!parentMapping || !printingMapping) throw new Error("bounded mapping row is missing");
  assertEqual("parent_mapping.source", parentMapping.source, "tcgplayer");
  assertEqual("parent_mapping.external_id", parentMapping.external_id, String(SCOPE.product_id));
  assertEqual("parent_mapping.active", parentMapping.active, true);
  assertEqual("printing_mapping.source", printingMapping.source, "tcgplayer_market");
  assertEqual("printing_mapping.external_id", printingMapping.external_id, `${SCOPE.product_id}:${SCOPE.finish}`);
  assertEqual("printing_mapping.active", printingMapping.active, true);
  const allowedParents = new Set([SCOPE.source_parent_id, SCOPE.target_parent_id]);
  const allowedPrintings = new Set([SCOPE.source_printing_id, SCOPE.target_printing_id]);
  if (!allowedParents.has(parentMapping.card_print_id)) throw new Error("parent mapping target drift");
  if (!allowedPrintings.has(printingMapping.card_printing_id)) throw new Error("printing mapping target drift");
  return { source: sourceRow, cards, parent_mapping: parentMapping, printing_mapping: printingMapping };
}

export function buildPlan(scope, repository) {
  const parentNeedsUpdate = scope.parent_mapping.card_print_id !== SCOPE.target_parent_id ||
    scope.parent_mapping.meta?.contract_version !== VERSION;
  const printingNeedsUpdate = scope.printing_mapping.card_printing_id !== SCOPE.target_printing_id ||
    scope.printing_mapping.meta?.contract_version !== VERSION;
  const frozen = {
    contract_version: VERSION,
    repository,
    source_sync_run_id: scope.source.source_sync_run_id,
    source_observation_id: scope.source.source_observation_id,
    source_product_id: SCOPE.product_id,
    source_product_name: SCOPE.product_name,
    group_id: SCOPE.group_id,
    printed_number: SCOPE.number,
    normalized_finish: SCOPE.finish,
    parent_mapping_id: SCOPE.parent_mapping_id,
    printing_mapping_id: SCOPE.printing_mapping_id,
    prior_parent_id: scope.parent_mapping.card_print_id,
    prior_printing_id: scope.printing_mapping.card_printing_id,
    target_parent_id: SCOPE.target_parent_id,
    target_printing_id: SCOPE.target_printing_id,
    target_scryfall_id: SCOPE.target_scryfall_id,
    target_gv_id: SCOPE.target_gv_id,
    target_printing_gv_id: SCOPE.target_printing_gv_id,
  };
  const planFingerprint = fingerprint(frozen);
  return {
    ...frozen,
    plan_fingerprint: planFingerprint,
    required_approval: `APPROVE_${VERSION}:${planFingerprint}`,
    selected_parent_updates: parentNeedsUpdate ? 1 : 0,
    selected_printing_updates: printingNeedsUpdate ? 1 : 0,
    selected_update_count: Number(parentNeedsUpdate) + Number(printingNeedsUpdate),
  };
}

async function applyCorrection(client, plan) {
  const commonMeta = {
    contract_version: VERSION,
    mapping_method: "reviewed_tcgplayer_printing_correction_v1",
    confidence: "1.0000",
    source_product_id: String(SCOPE.product_id),
    source_product_name: SCOPE.product_name,
    group_id: SCOPE.group_id,
    reviewed_printed_number: SCOPE.number,
    normalized_finish: SCOPE.finish,
    source_observation_id: plan.source_observation_id,
    source_sync_run_id: plan.source_sync_run_id,
    target_scryfall_id: SCOPE.target_scryfall_id,
    source_print_id: SCOPE.target_scryfall_id,
    plan_fingerprint: plan.plan_fingerprint,
  };
  let parentUpdated = 0;
  let printingUpdated = 0;
  if (plan.selected_parent_updates) {
    const result = await client.query(`
      update public.external_mappings
         set card_print_id=$1::uuid,
             meta=coalesce(meta,'{}'::jsonb) || $2::jsonb,
             synced_at=now()
       where id=$3 and source='tcgplayer' and external_id=$4 and active
         and card_print_id=$5::uuid`, [SCOPE.target_parent_id,
      JSON.stringify({ ...commonMeta, prior_card_print_id: plan.prior_parent_id }),
      SCOPE.parent_mapping_id, String(SCOPE.product_id), plan.prior_parent_id]);
    parentUpdated = result.rowCount;
  }
  if (plan.selected_printing_updates) {
    const result = await client.query(`
      update public.external_printing_mappings
         set card_printing_id=$1::uuid,
             meta=coalesce(meta,'{}'::jsonb) || $2::jsonb,
             synced_at=now()
       where id=$3::uuid and source='tcgplayer_market' and external_id=$4 and active
         and card_printing_id=$5::uuid`, [SCOPE.target_printing_id,
      JSON.stringify({ ...commonMeta, prior_card_printing_id: plan.prior_printing_id }),
      SCOPE.printing_mapping_id, `${SCOPE.product_id}:${SCOPE.finish}`, plan.prior_printing_id]);
    printingUpdated = result.rowCount;
  }
  if (parentUpdated !== plan.selected_parent_updates || printingUpdated !== plan.selected_printing_updates) {
    throw new Error(`update reconciliation mismatch parent=${parentUpdated}/${plan.selected_parent_updates} printing=${printingUpdated}/${plan.selected_printing_updates}`);
  }
  return { parent_updated: parentUpdated, printing_updated: printingUpdated };
}

async function exactReadback(client, plan) {
  const mappings = await readScope(client, plan.source_sync_run_id);
  assertEqual("readback.parent", mappings.parent_mapping.card_print_id, SCOPE.target_parent_id);
  assertEqual("readback.parent_contract", mappings.parent_mapping.meta?.contract_version, VERSION);
  assertEqual("readback.printing", mappings.printing_mapping.card_printing_id, SCOPE.target_printing_id);
  assertEqual("readback.printing_contract", mappings.printing_mapping.meta?.contract_version, VERSION);
  assertEqual("readback.printing_source_print", mappings.printing_mapping.meta?.source_print_id, SCOPE.target_scryfall_id);
  const candidate = (await client.query(`
    select source_observation_id::text,source_mapping_id,variant_assignment_id,
           mtg_printing_mapping_id::text,card_print_id::text,card_printing_id::text,
           gv_id,printing_gv_id,finish_key,mapping_method
      from public.v_tcgplayer_market_qualification_candidates_v7
     where source_sync_run_id=$1::uuid and source_product_id=$2
       and source_subtype_name=$3`, [plan.source_sync_run_id, SCOPE.product_id, SCOPE.subtype])).rows;
  if (candidate.length !== 1) throw new Error(`V7 candidate count expected=1 actual=${candidate.length}`);
  const row = candidate[0];
  assertEqual("candidate.observation", row.source_observation_id, plan.source_observation_id);
  assertEqual("candidate.source_mapping_id", row.source_mapping_id, null);
  assertEqual("candidate.variant_assignment_id", row.variant_assignment_id, null);
  assertEqual("candidate.mtg_printing_mapping_id", row.mtg_printing_mapping_id, SCOPE.printing_mapping_id);
  assertEqual("candidate.card_print_id", row.card_print_id, SCOPE.target_parent_id);
  assertEqual("candidate.card_printing_id", row.card_printing_id, SCOPE.target_printing_id);
  assertEqual("candidate.gv_id", row.gv_id, SCOPE.target_gv_id);
  assertEqual("candidate.printing_gv_id", row.printing_gv_id, SCOPE.target_printing_gv_id);
  assertEqual("candidate.finish_key", row.finish_key, SCOPE.finish);
  assertEqual("candidate.mapping_method", row.mapping_method, "exact_external_printing_mapping_v1");
  return { mappings, candidate: row };
}

async function writeArtifact(args, status, plan, extra = {}) {
  await fs.mkdir(args.outDir, { recursive: true });
  const summary = { status, mode: args.mode, plan, ...extra };
  await fs.writeFile(path.join(args.outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const headSha = git(["rev-parse", "HEAD"]);
  if (args.expectedHeadSha && args.expectedHeadSha !== headSha) {
    throw new Error(`Frozen commit mismatch expected=${args.expectedHeadSha} actual=${headSha}`);
  }
  if (args.mode === "apply" && git(["status", "--porcelain", "--untracked-files=no"])) {
    throw new Error("Tracked worktree must be clean for apply");
  }
  if (!marketEvidenceDbUrl()) throw new Error("SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required");
  const repository = { commit_sha: headSha, branch: git(["branch", "--show-current"]) };
  const binding = await targetBindingFromEnvironment();
  const client = await connectVerifiedDbClient(binding);
  let committed = false;
  try {
    await client.query(args.mode === "plan" ? "begin transaction read only" : "begin isolation level serializable");
    const viewBefore = (await client.query(
      "select to_regclass('public.v_tcgplayer_market_qualification_candidates_v7')::text as name",
    )).rows[0].name;
    if (args.mode !== "plan") {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
      await client.query("set local lock_timeout='10s'");
      await client.query("set local statement_timeout='300s'");
    }
    if (args.mode === "schema-rehearsal") {
      const migrationSource = await fs.readFile(MIGRATION_PATH, "utf8");
      if (!/^--[\s\S]*?\nbegin;\s*/i.test(migrationSource) || !/commit;\s*$/i.test(migrationSource)) {
        throw new Error("reviewed correction migration transaction wrapper drift");
      }
      const rehearsalSql = migrationSource
        .replace(/^([\s\S]*?\n)begin;\s*/i, "$1")
        .replace(/commit;\s*$/i, "");
      await client.query(rehearsalSql);
    }
    const before = await readScope(client, args.sourceSyncRunId);
    const plan = buildPlan(before, repository);
    if (args.mode === "plan") {
      await client.query("rollback");
      await writeArtifact(args, "planned", plan, { database_writes: false });
      return;
    }
    if (args.mode === "apply" && process.env[APPROVAL_ENV] !== plan.required_approval) {
      throw new Error(`Exact ${APPROVAL_ENV} acknowledgement is required`);
    }
    const updated = await applyCorrection(client, plan);
    const transactionReadback = await exactReadback(client, plan);
    if (args.mode === "dry-run" || args.mode === "schema-rehearsal") {
      await client.query("rollback");
      const rollbackReadback = await readScope(client, args.sourceSyncRunId);
      const viewAfterRollback = (await client.query(
        "select to_regclass('public.v_tcgplayer_market_qualification_candidates_v7')::text as name",
      )).rows[0].name;
      if (JSON.stringify(rollbackReadback.parent_mapping) !== JSON.stringify(before.parent_mapping) ||
          JSON.stringify(rollbackReadback.printing_mapping) !== JSON.stringify(before.printing_mapping)) {
        throw new Error("rollback readback mismatch");
      }
      assertEqual("rollback.view_state", viewAfterRollback, viewBefore);
      await writeArtifact(args, "rollback_verified", plan, {
        updated,
        transaction_readback: transactionReadback,
        view_before: viewBefore,
        view_after_rollback: viewAfterRollback,
      });
      return;
    }
    await client.query("commit");
    committed = true;
    const verifier = await connectVerifiedDbClient(binding);
    try {
      await verifier.query("begin transaction read only");
      const durableReadback = await exactReadback(verifier, plan);
      await verifier.query("rollback");
      await writeArtifact(args, "applied_and_verified", plan, { updated, transaction_readback: transactionReadback, durable_readback: durableReadback });
    } finally { await verifier.end(); }
  } finally {
    if (!committed) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
}
