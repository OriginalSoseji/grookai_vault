import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

import "../../backend/env.mjs";
import {
  buildMtgFreshScryfallFinishPlanV1,
  canonicalChildSupportsFinishV1,
  MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1,
  mtgFreshScryfallDatabaseConfigV1,
  scryfallLinkSupportsFinishV1,
} from "../../backend/pricing/mtg_fresh_scryfall_finish_backfill_policy_v1.mjs";
import {
  commitMappingTransaction,
  mappingTransactionState,
  rollbackMappingTransaction,
} from "../../backend/pricing/exact_mapping_execution_guard_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  connectVerifiedDbClient,
  targetBindingFromEnvironment,
} from "./japanese_master_index_v4/image_pointer_apply_db_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSION = MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1;
const MTG_GAME_ID = "4d544700-0000-4000-8000-000000000001";
const APPROVAL_ENV = "MTG_FRESH_SCRYFALL_FINISH_MAPPING_APPROVAL";
const BATCH_SIZE = 500;

function parseArgs(argv) {
  const args = {
    mode: "plan",
    outDir: null,
    scryfallJsonlGz: null,
    expectedSourceSha256: null,
    sourceUpdatedAt: null,
    pricingRunId: null,
    expectedHeadSha: null,
  };
  for (const arg of argv) {
    if (arg === "--plan") args.mode = "plan";
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--scryfall-jsonl-gz=")) args.scryfallJsonlGz = path.resolve(arg.slice("--scryfall-jsonl-gz=".length));
    else if (arg.startsWith("--expected-source-sha256=")) args.expectedSourceSha256 = arg.slice("--expected-source-sha256=".length).toLowerCase();
    else if (arg.startsWith("--source-updated-at=")) args.sourceUpdatedAt = arg.slice(20);
    else if (arg.startsWith("--pricing-run-id=")) args.pricingRunId = arg.slice(17);
    else if (arg.startsWith("--expected-head-sha=")) args.expectedHeadSha = arg.slice(20).toLowerCase();
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.outDir) throw new Error("--out-dir is required");
  if (!args.scryfallJsonlGz) throw new Error("--scryfall-jsonl-gz is required");
  if (!/^[a-f0-9]{64}$/.test(args.expectedSourceSha256 ?? "")) {
    throw new Error("--expected-source-sha256 must be a SHA-256 hash");
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(args.sourceUpdatedAt ?? "")) {
    throw new Error("--source-updated-at must be an ISO timestamp");
  }
  if (!/^[a-f0-9-]{36}$/.test(args.pricingRunId ?? "")) {
    throw new Error("--pricing-run-id must be a UUID");
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

async function fileSha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function chunks(rows, size = BATCH_SIZE) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

function subtypeToFinish(subtype) {
  if (subtype === "normal") return "normal";
  if (subtype === "foil") return "foil";
  return null;
}

async function targetRows(client, pricingRunId) {
  const result = await client.query(`
    with target_products as (
      select distinct candidate.source_product_id
        from public.market_price_qualification_decisions candidate
        join public.tcgcsv_source_products candidate_product
          on candidate_product.product_id = candidate.source_product_id
       where candidate.run_id = $1::uuid
         and candidate_product.category_id = 1
         and candidate.decision <> 'publish'
         and candidate.reason_codes[1] = 'missing_active_source_mapping'
         and candidate.evidence ->> 'product_scope_result' = 'in_scope'
    )
    select decision.source_product_id::text as product_id,
           decision.source_observation_id::text,
           product.group_id::integer,
           source_group.name as group_name,
           product.name as product_name,
           lower(decision.source_subtype_name) as subtype
      from public.market_price_qualification_decisions decision
      join public.tcgcsv_source_products product
        on product.product_id = decision.source_product_id
      join public.tcgcsv_source_groups source_group
        on source_group.group_id = product.group_id
      join target_products target
        on target.source_product_id = decision.source_product_id
     where decision.run_id = $1::uuid
       and product.category_id = 1
     order by decision.source_product_id::bigint, lower(decision.source_subtype_name)
  `, [pricingRunId]);
  return result.rows;
}

async function readScryfallLinks(sourcePath, targetIds) {
  const linksByProduct = new Map();
  const input = createReadStream(sourcePath).pipe(createGunzip());
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let objectCount = 0;
  let eligiblePrintCount = 0;
  let linkedPrintCount = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    objectCount += 1;
    const card = JSON.parse(line);
    if (card.lang !== "en" || card.digital === true || !(card.games ?? []).includes("paper")) continue;
    eligiblePrintCount += 1;
    const ids = [];
    if (Number.isInteger(card.tcgplayer_id) && card.tcgplayer_id > 0) {
      ids.push({ product_id: String(card.tcgplayer_id), role: "standard" });
    }
    if (Number.isInteger(card.tcgplayer_etched_id) && card.tcgplayer_etched_id > 0) {
      ids.push({ product_id: String(card.tcgplayer_etched_id), role: "etched" });
    }
    if (ids.length > 0) linkedPrintCount += 1;
    for (const id of ids) {
      if (!targetIds.has(id.product_id)) continue;
      const rows = linksByProduct.get(id.product_id) ?? [];
      rows.push({
        ...id,
        scryfall_id: String(card.id),
        finishes: [...new Set((card.finishes ?? []).map((value) => String(value).toLowerCase()))].sort(),
      });
      linksByProduct.set(id.product_id, rows);
    }
  }
  return { linksByProduct, objectCount, eligiblePrintCount, linkedPrintCount };
}

async function canonicalRows(client, scryfallIds) {
  const byScryfall = new Map();
  for (const batch of chunks([...scryfallIds], 1_000)) {
    const result = await client.query(`
      select mapping.external_id as scryfall_id,
             mapping.card_print_id::text,
             printing.id::text as card_printing_id,
             lower(printing.finish_key) as finish,
             finish.is_active as finish_is_active,
             public.catalog_card_print_visible_to_request_v1(mapping.card_print_id) as card_is_visible,
             printing.is_provisional,
             (select count(*)::integer
                from public.card_print_identity exact_identity
               where exact_identity.card_print_id = mapping.card_print_id
                 and exact_identity.is_active
                 and exact_identity.identity_domain = 'mtg_eng_paper_print') as exact_identity_count,
             (select count(*)::integer
                from public.card_printing_truth_reviews review
               where review.card_printing_id = printing.id
                 and review.active
                 and review.public_visibility in ('hidden_pending_review','hidden_unsupported')) as hidden_review_count
        from public.external_mappings mapping
        join public.card_prints card on card.id = mapping.card_print_id
        join public.card_printings printing on printing.card_print_id = mapping.card_print_id
        join public.finish_keys finish
          on finish.key = printing.finish_key
         and finish.is_active = true
       where mapping.source = 'scryfall'
         and mapping.active = true
         and mapping.external_id = any($1::text[])
         and card.game_id = $2::uuid
         and public.catalog_card_print_visible_to_request_v1(mapping.card_print_id)
       order by mapping.external_id, mapping.card_print_id, printing.finish_key
    `, [batch, MTG_GAME_ID]);
    for (const row of result.rows) {
      const existing = byScryfall.get(row.scryfall_id) ?? [];
      existing.push(row);
      byScryfall.set(row.scryfall_id, existing);
    }
  }
  return byScryfall;
}

async function existingRows(client, externalIds) {
  const byExternalId = new Map();
  for (const batch of chunks([...externalIds], 1_000)) {
    const result = await client.query(`
      select id::text, external_id, card_printing_id::text, active
        from public.external_printing_mappings
       where source = 'tcgplayer_market'
         and external_id = any($1::text[])
       order by external_id, id
    `, [batch]);
    for (const row of result.rows) {
      const values = byExternalId.get(row.external_id) ?? [];
      values.push(row);
      byExternalId.set(row.external_id, values);
    }
  }
  return byExternalId;
}

function buildLaneRows(targets, scryfall, canonical, existing) {
  return targets.map((target) => {
    const finish = subtypeToFinish(target.subtype);
    const candidates = new Map();
    for (const link of scryfall.linksByProduct.get(target.product_id) ?? []) {
      if (!scryfallLinkSupportsFinishV1(link, finish)) continue;
      for (const row of canonical.get(link.scryfall_id) ?? []) {
        if (!canonicalChildSupportsFinishV1(row, finish)) continue;
        const candidate = candidates.get(row.card_printing_id) ?? {
          card_print_id: row.card_print_id,
          card_printing_id: row.card_printing_id,
          supporting_scryfall_print_ids: [],
        };
        candidate.supporting_scryfall_print_ids.push(link.scryfall_id);
        candidate.supporting_scryfall_print_ids = [...new Set(candidate.supporting_scryfall_print_ids)].sort();
        candidates.set(row.card_printing_id, candidate);
      }
    }
    const externalId = finish ? `${target.product_id}:${finish}` : `${target.product_id}:unsupported`;
    return {
      ...target,
      finish,
      child_candidates: [...candidates.values()],
      existing_mappings: existing.get(externalId) ?? [],
    };
  });
}

async function protectedCounts(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'total_printing_mapping_count', count(*),
      'tcgplayer_market_printing_mapping_count', count(*) filter (where mapping.source = 'tcgplayer_market'),
      'mtg_tcgplayer_market_printing_mapping_count', count(*) filter (
        where mapping.source = 'tcgplayer_market'
          and exists (
            select 1
              from public.card_printings printing
              join public.card_print_identity identity_row
                on identity_row.card_print_id = printing.card_print_id
               and identity_row.is_active
               and identity_row.identity_domain = 'mtg_eng_paper_print'
             where printing.id = mapping.card_printing_id
          )
      )
    ) as value
      from public.external_printing_mappings mapping
  `);
  return result.rows[0].value;
}

async function insertRows(client, rows, authority) {
  let inserted = 0;
  for (const batch of chunks(rows)) {
    const result = await client.query(`
      insert into public.external_printing_mappings (
        card_printing_id, source, external_id, active, meta
      )
      select payload.card_printing_id,
             'tcgplayer_market',
             payload.external_id,
             true,
             jsonb_build_object(
               'contract_version', $2::text,
               'mapping_method', 'fresh_scryfall_exact_printing_crosswalk_v1',
               'confidence', '1.0000',
               'source_product_id', payload.source_product_id,
               'normalized_finish', payload.finish,
               'source_observation_id', payload.source_observation_id,
               'supporting_scryfall_print_ids', payload.supporting_scryfall_print_ids,
               'scryfall_bulk_sha256', $3::text,
               'scryfall_bulk_updated_at', $4::text,
               'pricing_run_id', $5::text
             )
        from jsonb_to_recordset($1::jsonb) as payload(
          source_product_id text,
          source_observation_id uuid,
          finish text,
          external_id text,
          card_printing_id uuid,
          supporting_scryfall_print_ids jsonb
        )
      returning id
    `, [JSON.stringify(batch), VERSION, authority.source_sha256,
      authority.source_updated_at, authority.pricing_run_id]);
    inserted += result.rowCount;
  }
  return inserted;
}

async function exactReadback(client, rows, authority) {
  let matched = 0;
  for (const batch of chunks(rows)) {
    const result = await client.query(`
      select count(*)::integer as matched
        from jsonb_to_recordset($1::jsonb) as expected(
          external_id text,
          card_printing_id uuid
        )
        join public.external_printing_mappings mapping
          on mapping.source = 'tcgplayer_market'
         and mapping.external_id = expected.external_id
         and mapping.card_printing_id = expected.card_printing_id
         and mapping.active = true
         and mapping.meta ->> 'contract_version' = $2
         and mapping.meta ->> 'scryfall_bulk_sha256' = $3
    `, [JSON.stringify(batch), VERSION, authority.source_sha256]);
    matched += Number(result.rows[0].matched);
  }
  return matched;
}

async function buildPlan(client, args, repository, sourceSha256) {
  const targets = await targetRows(client, args.pricingRunId);
  const targetIds = new Set(targets.map((row) => row.product_id));
  const scryfall = await readScryfallLinks(args.scryfallJsonlGz, targetIds);
  const scryfallIds = new Set(
    [...scryfall.linksByProduct.values()].flatMap((rows) => rows.map((row) => row.scryfall_id)),
  );
  const canonical = await canonicalRows(client, scryfallIds);
  const externalIds = new Set(targets.map((row) => {
    const finish = subtypeToFinish(row.subtype);
    return finish ? `${row.product_id}:${finish}` : `${row.product_id}:unsupported`;
  }));
  const existing = await existingRows(client, externalIds);
  const authority = {
    pricing_run_id: args.pricingRunId,
    source_file_name: path.basename(args.scryfallJsonlGz),
    source_sha256: sourceSha256,
    source_updated_at: args.sourceUpdatedAt,
    source_format: "gzip_jsonl",
    scryfall_bulk_object_count: scryfall.objectCount,
    eligible_english_paper_print_count: scryfall.eligiblePrintCount,
    linked_print_count: scryfall.linkedPrintCount,
  };
  return buildMtgFreshScryfallFinishPlanV1(
    buildLaneRows(targets, scryfall, canonical, existing),
    repository,
    authority,
  );
}

async function writeArtifacts(outDir, status, mode, plan, extra = {}) {
  await fs.mkdir(outDir, { recursive: true });
  const { insert_rows, already_exact_rows, review_only_rows, unsafe_rows, ...summaryPlan } = plan;
  const summary = { status, mode, ...extra, plan: summaryPlan };
  await Promise.all([
    fs.writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`),
    fs.writeFile(path.join(outDir, "insert_rows.json"), `${JSON.stringify(insert_rows, null, 2)}\n`),
    fs.writeFile(path.join(outDir, "already_exact_rows.json"), `${JSON.stringify(already_exact_rows, null, 2)}\n`),
    fs.writeFile(path.join(outDir, "review_only_rows.json"), `${JSON.stringify(review_only_rows, null, 2)}\n`),
    fs.writeFile(path.join(outDir, "unsafe_rows.json"), `${JSON.stringify(unsafe_rows, null, 2)}\n`),
  ]);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const actualSourceSha256 = await fileSha256(args.scryfallJsonlGz);
  if (actualSourceSha256 !== args.expectedSourceSha256) {
    throw new Error(`Scryfall source hash mismatch expected=${args.expectedSourceSha256} actual=${actualSourceSha256}`);
  }
  const headSha = git(["rev-parse", "HEAD"]);
  const repository = { commit_sha: headSha, branch: git(["branch", "--show-current"]) };
  if (args.expectedHeadSha && args.expectedHeadSha !== headSha) {
    throw new Error(`Frozen commit mismatch expected=${args.expectedHeadSha} actual=${headSha}`);
  }
  if (args.mode === "apply" && git(["status", "--porcelain", "--untracked-files=no"])) {
    throw new Error("Tracked worktree must be clean for apply");
  }

  const databaseUrl = marketEvidenceDbUrl();
  if (!databaseUrl) throw new Error("SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required");
  mtgFreshScryfallDatabaseConfigV1(databaseUrl);
  const targetBinding = await targetBindingFromEnvironment();
  const client = await connectVerifiedDbClient(targetBinding);
  const transaction = mappingTransactionState();
  try {
    await client.query(args.mode === "plan" ? "begin transaction read only" : "begin");
    if (args.mode !== "plan") {
      await client.query("select pg_advisory_xact_lock(hashtext('grookai:mtg:fresh_scryfall_finish_backfill_v1'))");
      await client.query("set local lock_timeout = '10s'");
      await client.query("set local statement_timeout = '900s'");
    }
    const plan = await buildPlan(client, args, repository, actualSourceSha256);
    if (plan.blocking_unsafe_count > 0) {
      throw new Error(`Conflicting existing mappings detected: ${plan.blocking_unsafe_count}`);
    }
    if (args.mode === "plan") {
      await rollbackMappingTransaction(client, transaction);
      await writeArtifacts(args.outDir, "planned", args.mode, plan, { database_writes: false });
      return;
    }
    if (args.mode === "apply" && process.env[APPROVAL_ENV] !== plan.required_approval) {
      throw new Error(`Exact ${APPROVAL_ENV} acknowledgement is required`);
    }
    const before = await protectedCounts(client);
    const inserted = await insertRows(client, plan.insert_rows, plan.authority);
    if (inserted !== plan.selected_insert_count) {
      throw new Error(`Insert reconciliation mismatch expected=${plan.selected_insert_count} actual=${inserted}`);
    }
    const transactionReadback = await exactReadback(client, plan.insert_rows, plan.authority);
    if (transactionReadback !== inserted) throw new Error("Transaction readback mismatch");
    const transactionCounts = await protectedCounts(client);
    if (
      Number(transactionCounts.total_printing_mapping_count) - Number(before.total_printing_mapping_count) !== inserted ||
      Number(transactionCounts.tcgplayer_market_printing_mapping_count) - Number(before.tcgplayer_market_printing_mapping_count) !== inserted ||
      Number(transactionCounts.mtg_tcgplayer_market_printing_mapping_count) - Number(before.mtg_tcgplayer_market_printing_mapping_count) !== inserted
    ) throw new Error("Transaction protected-count reconciliation failed");

    if (args.mode === "dry-run") {
      await rollbackMappingTransaction(client, transaction);
      const afterRollback = await protectedCounts(client);
      if (JSON.stringify(afterRollback) !== JSON.stringify(before)) {
        throw new Error("Dry-run rollback did not restore protected counts");
      }
      await writeArtifacts(args.outDir, "rollback_verified", args.mode, plan, {
        inserted_in_transaction: inserted,
        transaction_readback: transactionReadback,
        before,
        transaction_counts: transactionCounts,
        after_rollback: afterRollback,
      });
      return;
    }

    await commitMappingTransaction(client, transaction);
    const durableReadback = await exactReadback(client, plan.insert_rows, plan.authority);
    const after = await protectedCounts(client);
    if (durableReadback !== inserted) throw new Error("Durable readback mismatch");
    if (
      Number(after.total_printing_mapping_count) - Number(before.total_printing_mapping_count) !== inserted ||
      Number(after.tcgplayer_market_printing_mapping_count) - Number(before.tcgplayer_market_printing_mapping_count) !== inserted ||
      Number(after.mtg_tcgplayer_market_printing_mapping_count) - Number(before.mtg_tcgplayer_market_printing_mapping_count) !== inserted
    ) throw new Error("Durable protected-count reconciliation failed");
    await writeArtifacts(args.outDir, "applied_and_verified", args.mode, plan, {
      inserted,
      transaction_readback: transactionReadback,
      durable_readback: durableReadback,
      before,
      after,
      transaction,
    });
  } finally {
    if (!transaction.rollback_attempted && !transaction.commit_attempted) {
      await rollbackMappingTransaction(client, transaction).catch(() => {});
    }
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
