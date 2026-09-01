import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { Client } from "pg";

import { buildMtgCanonicalCandidateV1 } from
  "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import { sha256 } from "../../backend/catalog/universal_catalog_discovery_v1.mjs";
import {
  buildMtgCanaryPayloadV1,
} from "../audits/mtg_canonical_catalog_canary_plan_v1.mjs";
import { buildMtgCanonicalSetPromotionContractV1 } from
  "../audits/mtg_canonical_catalog_set_promotion_contract_v1.mjs";
import {
  captureMtgPromotionCollisionsV1,
  captureMtgPromotionExactReadbackV1,
  insertMtgPromotionRowsV1,
} from "../audits/mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";

export const MTG_INCREMENTAL_PROMOTION_VERSION = "MTG_INCREMENTAL_PROMOTION_V1";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const options = {
    mode: "plan",
    asOf: new Date().toISOString().slice(0, 10),
    setCode: "hob",
    expectedHeadSha: null,
    expectedPayloadFingerprint: null,
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
    outDir: path.join("docs", "audits", "mtg_incremental_promotion_v1", stamp),
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else if (token.startsWith("--set-code=")) options.setCode = token.slice(11).toLowerCase();
    else if (token.startsWith("--expected-head-sha=")) options.expectedHeadSha = token.slice(20);
    else if (token.startsWith("--expected-payload-fingerprint=")) {
      options.expectedPayloadFingerprint = token.slice(31);
    }
    else if (token.startsWith("--db-url=")) options.databaseUrl = token.slice(9);
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!new Set(["plan", "dry-run", "apply"]).has(options.mode)) {
    throw new Error("--mode must be plan, dry-run, or apply");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  if (!/^[a-z0-9]+$/.test(options.setCode)) throw new Error("Invalid --set-code");
  if (!options.databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  if (options.mode === "apply" && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha ?? "")) {
    throw new Error("Apply requires --expected-head-sha");
  }
  if (options.mode === "apply" &&
      !/^[0-9a-f]{64}$/.test(options.expectedPayloadFingerprint ?? "")) {
    throw new Error("Apply requires --expected-payload-fingerprint");
  }
  return options;
}

async function fetchScryfallSetCards(setCode) {
  let url = new URL("https://api.scryfall.com/cards/search");
  url.searchParams.set("q", `set:${setCode} game:paper lang:en`);
  url.searchParams.set("unique", "prints");
  url.searchParams.set("include_extras", "true");
  const cards = [];
  const snapshots = [];
  while (url) {
    const response = await fetch(url, {
      headers: { "User-Agent": "GrookaiVaultMtgPromotion/1.0 catalog-ops@grookai.com" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Scryfall returned HTTP ${response.status}`);
    const body = await response.text();
    const payload = JSON.parse(body);
    snapshots.push({
      request_url: url.toString(),
      final_url: response.url,
      fetched_at: new Date().toISOString(),
      http_status: response.status,
      byte_size: Buffer.byteLength(body),
      body_sha256: sha256(body),
      page_card_count: payload.data?.length ?? 0,
    });
    cards.push(...(payload.data ?? []));
    url = payload.has_more && payload.next_page ? new URL(payload.next_page) : null;
    if (url) await new Promise((resolve) => setTimeout(resolve, 125));
  }
  return { cards, snapshots };
}

function candidateCollisionRows(candidates) {
  const owners = new Map();
  for (const candidate of candidates) {
    for (const link of candidate.exact_source_links) {
      for (const subtype of link.expected_source_subtypes) {
        const identity = `${link.product_id}:${subtype}`;
        const values = owners.get(identity) ?? [];
        values.push(candidate.card.source_print_id);
        owners.set(identity, values);
      }
    }
  }
  return new Set([...owners.entries()].filter(([, values]) =>
    new Set(values).size !== 1).map(([identity]) => identity));
}

async function loadDatabase(client, setCode, candidates) {
  const set = await client.query(`
    select s.id::text, s.code, count(cp.id)::int as card_count
    from public.sets s
    left join public.card_prints cp on cp.set_id=s.id
    where s.game='mtg' and lower(s.code)=$1
    group by s.id,s.code
  `, [setCode]);
  const productIds = [...new Set(candidates.flatMap((candidate) =>
    candidate.exact_source_links.map((link) => link.product_id)))];
  const warehouse = productIds.length ? await client.query(`
    select product_id,
           array_agg(distinct subtype_name_normalized order by subtype_name_normalized)
             as subtypes,
           array_agg(distinct subtype_name_normalized order by subtype_name_normalized)
             filter (where market_price > 0) as positive_subtypes
    from public.tcgcsv_source_price_daily_observations
    where category_id=1 and product_id=any($1::int[])
    group by product_id
  `, [productIds]) : { rows: [] };
  return {
    setRows: set.rows,
    warehouseProducts: new Map(warehouse.rows.map((row) => [Number(row.product_id), {
      product_id: Number(row.product_id),
      subtypes: new Set(row.subtypes ?? []),
      positive_market_subtypes: new Set(row.positive_subtypes ?? []),
    }])),
  };
}

async function fileHash(relativePath) {
  return sha256(await fs.readFile(path.resolve(relativePath)));
}

function exactReadbackMatches(result, counts) {
  for (const [name, expected] of Object.entries(counts)) {
    const row = result[name];
    if (!row || Number(row.planned_count) !== expected ||
        Number(row.actual_count) !== expected || Number(row.exact_count) !== expected) {
      return false;
    }
  }
  return true;
}

function exactReadbackAbsent(result) {
  return Object.values(result).every((row) => Number(row.actual_count) === 0);
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean: git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (options.mode === "apply" && (repository.commit_sha !== options.expectedHeadSha ||
      !repository.tracked_worktree_clean)) {
    throw new Error("Apply requires the exact clean frozen commit");
  }
  const runPlan = {
    version: MTG_INCREMENTAL_PROMOTION_VERSION,
    mode: options.mode,
    as_of: options.asOf,
    set_code: options.setCode,
    repository,
    boundaries: {
      complete_absent_released_sets_only: true,
      insert_only: true,
      updates: 0,
      deletes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
    },
  };
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  const source = await fetchScryfallSetCards(options.setCode);
  const candidates = source.cards.map(buildMtgCanonicalCandidateV1)
    .filter((row) => row.status === "candidate");
  if (!candidates.length) throw new Error("Scryfall set has no English paper candidates");
  if (candidates.length !== source.cards.length) {
    throw new Error("Scryfall query returned ineligible rows inside the exact set scope");
  }
  const selectedSet = candidates[0].set;
  if (candidates.some((row) => row.set.source_set_id !== selectedSet.source_set_id)) {
    throw new Error("Scryfall response spans multiple set identities");
  }
  const releaseEligible = !selectedSet.released_at || selectedSet.released_at <= options.asOf;
  const client = new Client({
    connectionString: options.databaseUrl,
    ssl: { rejectUnauthorized: false },
    application_name: `mtg-incremental-promotion-v1-${options.mode}`,
    connectionTimeoutMillis: 20_000,
    statement_timeout: 300_000,
    query_timeout: 300_000,
  });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query(options.mode === "plan"
      ? "begin transaction isolation level repeatable read read only"
      : "begin transaction isolation level serializable");
    transactionOpen = true;
    const database = await loadDatabase(client, options.setCode, candidates);
    const existingCount = database.setRows.length === 1
      ? Number(database.setRows[0].card_count) : 0;
    if (database.setRows.length > 1) throw new Error("Duplicate MTG set code in canonical database");
    const databaseState = database.setRows.length === 0
      ? "absent"
      : existingCount === candidates.length
        ? "exact_complete"
        : "partial_or_drifted";
    if (databaseState === "partial_or_drifted") {
      throw new Error(`Partial MTG set requires bounded repair: ${existingCount}/${candidates.length}`);
    }
    const sourceBulkSha256 = sha256(JSON.stringify(source.snapshots.map((row) => row.body_sha256)));
    const payload = buildMtgCanaryPayloadV1({
      candidates,
      warehouseProducts: database.warehouseProducts,
      collisionSourceRows: candidateCollisionRows(candidates),
      sourceBulkSha256,
      stagingMigrationSha256: await fileHash("supabase/migrations/20260813185000_mtg_canonical_import_staging_v1.sql"),
      foundationMigrationSha256: await fileHash("supabase/migrations/20260813190000_mtg_canonical_catalog_foundation_v1.sql"),
      repository,
    }, {
      plan_version: "MTG_CANONICAL_CATALOG_SET_BATCH_V1",
      require_expansion: false,
      quality_flag: "mtg_incremental_promotion_v1",
      include_source_card_release_evidence: true,
    });
    if (options.expectedPayloadFingerprint &&
        options.expectedPayloadFingerprint !== payload.writer_payload_fingerprint) {
      throw new Error("Expected payload fingerprint does not match the frozen MTG plan");
    }
    const promotion = buildMtgCanonicalSetPromotionContractV1(payload);
    const shouldMutate = releaseEligible && databaseState === "absent";
    let transactionResult = {
      action: shouldMutate ? "plan_only" : "no_op",
      reason: !releaseEligible ? "future_release" : "already_exact_complete",
    };
    let collisions = null;
    if (shouldMutate) {
      collisions = await captureMtgPromotionCollisionsV1(client, promotion.rows);
      if (Object.values(collisions).some((count) => Number(count) !== 0)) {
        throw new Error(`MTG collision preflight failed: ${JSON.stringify(collisions)}`);
      }
      if (options.mode !== "plan") {
        const inserted = await insertMtgPromotionRowsV1(client, promotion.rows);
        if (JSON.stringify(inserted) !== JSON.stringify(promotion.row_counts)) {
          throw new Error(`MTG inserted count mismatch: ${JSON.stringify(inserted)}`);
        }
        const exact = await captureMtgPromotionExactReadbackV1(client, promotion.rows);
        if (!exactReadbackMatches(exact, promotion.row_counts)) {
          throw new Error("MTG exact transaction readback mismatch");
        }
        if (options.mode === "dry-run") {
          await client.query("rollback");
          transactionOpen = false;
          const absent = await captureMtgPromotionExactReadbackV1(client, promotion.rows);
          if (!exactReadbackAbsent(absent)) throw new Error("MTG rollback absence proof failed");
          transactionResult = { action: "rolled_back", inserted, exact_readback: exact, post_rollback: absent };
        } else {
          await client.query("commit");
          transactionOpen = false;
          const durable = await captureMtgPromotionExactReadbackV1(client, promotion.rows);
          if (!exactReadbackMatches(durable, promotion.row_counts)) {
            throw new Error("MTG durable exact readback mismatch");
          }
          transactionResult = { action: "committed", inserted, durable_readback: durable };
        }
      }
    }
    if (transactionOpen) {
      await client.query("rollback");
      transactionOpen = false;
    }
    const summary = {
      version: MTG_INCREMENTAL_PROMOTION_VERSION,
      mode: options.mode,
      target: `mtg:${options.setCode}`,
      source_set_id: selectedSet.source_set_id,
      release_date: selectedSet.released_at,
      release_eligible: releaseEligible,
      database_state: databaseState,
      source_card_count: candidates.length,
      promotion_row_counts: promotion.row_counts,
      source_snapshot_count: source.snapshots.length,
      source_bulk_sha256: sourceBulkSha256,
      writer_payload_fingerprint: payload.writer_payload_fingerprint,
      transaction_result: transactionResult,
      boundaries: runPlan.boundaries,
    };
    const artifacts = {
      "payload.json": await writeJson(path.join(options.outDir, "payload.json"), payload),
      "promotion_plan.json": await writeJson(path.join(options.outDir, "promotion_plan.json"), {
        ...promotion,
        collisions,
        transaction_result: transactionResult,
      }),
      "source_snapshots.json": await writeJson(path.join(options.outDir, "source_snapshots.json"), source.snapshots),
      "summary.json": await writeJson(path.join(options.outDir, "summary.json"), summary),
    };
    await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
      algorithm: "sha256",
      artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
        path: artifactPath,
        bytes: body.length,
        sha256: sha256(body),
      })),
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
