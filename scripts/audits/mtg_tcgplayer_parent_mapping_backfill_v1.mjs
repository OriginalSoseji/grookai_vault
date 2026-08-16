import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  buildMtgParentMappingPlanV1,
  MTG_TCGPLAYER_PARENT_MAPPING_BACKFILL_V1,
} from "../../backend/pricing/mtg_tcgplayer_parent_mapping_policy_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSION = MTG_TCGPLAYER_PARENT_MAPPING_BACKFILL_V1;
const APPROVAL_ENV = "MTG_TCGPLAYER_PARENT_MAPPING_APPROVAL";
const BATCH_SIZE = 1_000;

function chunks(rows, size = BATCH_SIZE) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

function parseArgs(argv) {
  const args = { mode: "plan", outDir: null, expectedHeadSha: null };
  for (const arg of argv) {
    if (arg === "--plan") args.mode = "plan";
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.outDir) throw new Error("--out-dir is required");
  if (args.expectedHeadSha && !/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a full commit SHA");
  }
  return args;
}

async function candidateRows(client) {
  const result = await client.query(`
    select source_product_id, card_print_id, canonical_parent_count,
           supporting_printing_mapping_count, existing_mapping_count,
           existing_mapped_parent_count, mapped_card_print_id,
           existing_active_mapping,
           source_category_id, source_active, resolution
      from public.v_mtg_tcgplayer_parent_mapping_candidates_v1
     order by source_product_id::bigint, card_print_id
  `);
  return result.rows.map((row) => ({
    ...row,
    canonical_parent_count: Number(row.canonical_parent_count),
    supporting_printing_mapping_count: Number(row.supporting_printing_mapping_count),
    existing_mapping_count: Number(row.existing_mapping_count),
    existing_mapped_parent_count: Number(row.existing_mapped_parent_count),
    source_category_id: row.source_category_id === null ? null : Number(row.source_category_id),
  }));
}

async function protectedCounts(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'pokemon_tcgplayer_mapping_count', count(*) filter (
        where mapping.source = 'tcgplayer'
          and identity.identity_domain = 'pokemon_eng_standard'
      ),
      'non_mtg_mapping_count', count(*) filter (
        where coalesce(identity.identity_domain, '') <> 'mtg_eng_paper_print'
      ),
      'mtg_tcgplayer_mapping_count', count(*) filter (
        where mapping.source = 'tcgplayer'
          and identity.identity_domain = 'mtg_eng_paper_print'
      )
    ) as value
    from public.external_mappings mapping
    left join public.card_print_identity identity
      on identity.card_print_id = mapping.card_print_id
     and identity.is_active = true
  `);
  return result.rows[0].value;
}

async function insertRows(client, rows) {
  let inserted = 0;
  for (const batch of chunks(rows)) {
    const result = await client.query(
      `insert into public.external_mappings (
         card_print_id, source, external_id, active, meta
       )
       select payload.card_print_id, 'tcgplayer', payload.source_product_id,
              true,
              jsonb_build_object(
                'contract_version', $2::text,
                'mapping_method', 'deterministic_mtg_printing_evidence_bridge',
                'derived_from', 'exact_tcgplayer_market_printing_mappings',
                'confidence', '1.0000',
                'source_category_id', 1,
                'supporting_printing_mapping_count',
                  payload.supporting_printing_mapping_count
              )
         from jsonb_to_recordset($1::jsonb) as payload(
           source_product_id text,
           card_print_id uuid,
           supporting_printing_mapping_count integer
         )
       on conflict (source, external_id) do nothing
       returning id`,
      [JSON.stringify(batch), VERSION],
    );
    inserted += result.rowCount;
  }
  return inserted;
}

async function exactReadback(client, rows) {
  let matched = 0;
  for (const batch of chunks(rows)) {
    const result = await client.query(
      `select count(*)::integer as matched
         from jsonb_to_recordset($1::jsonb) as expected(
           source_product_id text,
           card_print_id uuid,
           supporting_printing_mapping_count integer
         )
         join public.external_mappings mapping
           on mapping.source = 'tcgplayer'
          and mapping.external_id = expected.source_product_id
          and mapping.card_print_id = expected.card_print_id
          and mapping.active = true
          and mapping.meta ->> 'contract_version' = $2`,
      [JSON.stringify(batch), VERSION],
    );
    matched += Number(result.rows[0].matched);
  }
  return matched;
}

async function writeArtifacts(outDir, result) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "insert_rows.json"),
    `${JSON.stringify(result.plan.insert_rows, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "review_only_rows.json"),
    `${JSON.stringify(result.plan.review_only_rows, null, 2)}\n`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: process.env.GITHUB_SHA || args.expectedHeadSha || null,
    branch: process.env.GITHUB_REF_NAME || null,
  };
  if (
    args.expectedHeadSha &&
    repository.commit_sha &&
    repository.commit_sha !== args.expectedHeadSha
  ) {
    throw new Error("Frozen commit SHA does not match --expected-head-sha");
  }
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 600_000,
    statement_timeout: 600_000,
  });
  await client.connect();
  let transactionOpen = false;
  try {
    const initialRows = await candidateRows(client);
    const initialPlan = buildMtgParentMappingPlanV1(initialRows, repository);
    if (args.mode === "plan") {
      const result = { status: "planned", mode: args.mode, plan: initialPlan };
      await writeArtifacts(args.outDir, result);
      return;
    }

    await client.query("begin");
    transactionOpen = true;
    await client.query(
      "select pg_advisory_xact_lock(hashtext('grookai:mtg:tcgplayer_parent_mapping_backfill_v1'))",
    );
    await client.query("set local lock_timeout = '10s'");
    await client.query("set local statement_timeout = '600s'");
    const frozenRows = await candidateRows(client);
    const plan = buildMtgParentMappingPlanV1(frozenRows, repository);
    if (plan.blocking_unsafe_count > 0) {
      throw new Error(
        `Conflicting existing mappings detected: ${plan.blocking_unsafe_count}`,
      );
    }
    if (args.mode === "apply" && process.env[APPROVAL_ENV] !== plan.required_approval) {
      throw new Error(`Exact ${APPROVAL_ENV} acknowledgement is required`);
    }
    const before = await protectedCounts(client);
    const inserted = await insertRows(client, plan.insert_rows);
    if (inserted !== plan.selected_insert_count) {
      throw new Error(
        `Insert reconciliation mismatch expected=${plan.selected_insert_count} inserted=${inserted}`,
      );
    }
    const transactionReadback = await exactReadback(client, plan.insert_rows);
    if (transactionReadback !== inserted) {
      throw new Error(
        `Transaction readback mismatch inserted=${inserted} matched=${transactionReadback}`,
      );
    }
    const transactionCounts = await protectedCounts(client);
    if (
      Number(transactionCounts.non_mtg_mapping_count) !==
      Number(before.non_mtg_mapping_count)
    ) {
      throw new Error("Protected non-MTG external mappings changed");
    }

    if (args.mode === "dry-run") {
      await client.query("rollback");
      transactionOpen = false;
      const after = await protectedCounts(client);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        throw new Error("Dry-run rollback did not restore exact mapping counts");
      }
      const result = {
        status: "rollback_verified",
        mode: args.mode,
        plan,
        inserted_in_transaction: inserted,
        transaction_readback: transactionReadback,
        before,
        transaction_counts: transactionCounts,
        after_rollback: after,
      };
      await writeArtifacts(args.outDir, result);
      return;
    }

    await client.query("commit");
    transactionOpen = false;
    const durableReadback = await exactReadback(client, plan.insert_rows);
    const after = await protectedCounts(client);
    if (durableReadback !== inserted) {
      throw new Error(
        `Durable readback mismatch inserted=${inserted} matched=${durableReadback}`,
      );
    }
    if (
      Number(after.non_mtg_mapping_count) !== Number(before.non_mtg_mapping_count) ||
      Number(after.mtg_tcgplayer_mapping_count) -
        Number(before.mtg_tcgplayer_mapping_count) !== inserted
    ) {
      throw new Error("Durable protected-count reconciliation failed");
    }
    const result = {
      status: "applied_and_verified",
      mode: args.mode,
      plan,
      inserted,
      transaction_readback: transactionReadback,
      durable_readback: durableReadback,
      before,
      after,
    };
    await writeArtifacts(args.outDir, result);
  } finally {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
