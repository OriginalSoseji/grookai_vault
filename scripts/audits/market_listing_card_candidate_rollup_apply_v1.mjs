import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import pg from "pg";

import "../../backend/env.mjs";
import {
  meeArtifactReferenceV1,
  resolveMeeArtifactInputV1,
  resolveMeeAuditRootV1,
} from "../../backend/pricing/mee_runtime_artifacts_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

const { Client } = pg;

export const PACKAGE_ID = "MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1";
export const EXPECTED_PACKAGE_FINGERPRINT = "c2c4a7de394de8abbc3b4f6361e648f2741a6995eef03bfc505cda737e2edbd9";
export const EXPECTED_ROW_MANIFEST_HASH = "963575b361071c26c573bbc300163bbe1385df2b8742d048864ddeba324cd9bc";
export const EXPECTED_SOURCE_READBACK_FINGERPRINT = "3ecef7a22b6209c5a68fc591d58d6e63519dd97c0327259b74f39afe7b281d95";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = resolveMeeAuditRootV1(REPO_ROOT);
const PLAN_PREFIX = "mee_11s_market_listing_card_candidate_rollup_plan_";
const DIRECT_TABLE_COLUMNS = {
  market_listing_card_candidates: [
    "id", "observation_id", "raw_snapshot_id", "card_print_id", "gv_id", "source",
    "source_listing_id", "match_version", "match_status", "match_confidence", "title_features",
    "set_features", "number_features", "finish_features", "condition_features", "exclusion_flags",
    "needs_review", "can_publish_price_directly", "candidate_hash", "created_at",
  ],
  market_listing_rollups: [
    "id", "card_print_id", "gv_id", "source", "rollup_version", "rollup_window", "currency",
    "listing_count", "seller_count", "minimum_active_ask", "median_active_ask", "maximum_active_ask",
    "trimmed_low_active_ask", "trimmed_high_active_ask", "stale_listing_count",
    "reviewed_candidate_count", "needs_review", "publishable", "app_visible", "market_truth",
    "exclusion_counts", "rollup_payload", "generated_at", "created_at",
  ],
};

function directDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function pgSslConfig(connectionString) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(connectionString) ? false : { rejectUnauthorized: false };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    readbackOnly: argv.includes("--readback-only"),
    allowDynamicPlan: argv.includes("--allow-dynamic-plan"),
    planPath: argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? null,
  };
}

function rel(filePath) {
  return meeArtifactReferenceV1(REPO_ROOT, filePath);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseRequest(factory, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await factory();
      if (result?.error && /fetch failed|network|terminated|timeout/i.test(result.error.message ?? "")) {
        lastError = result.error;
        if (attempt === attempts) return result;
        await sleep(500 * attempt);
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function latestPlanPath() {
  const dir = AUDIT_DIR;
  const files = await fs.readdir(dir);
  const candidates = files
    .filter((fileName) => fileName.startsWith(PLAN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-candidate-rollup-apply] no ${PLAN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

async function readPlan(filePath) {
  const resolved = resolveMeeArtifactInputV1(REPO_ROOT, filePath ?? await latestPlanPath());
  const data = JSON.parse(await fs.readFile(resolved, "utf8"));
  data.row_files = Object.fromEntries(Object.entries(data.row_files ?? {})
    .map(([key, value]) => [key, resolveMeeArtifactInputV1(REPO_ROOT, value)]));
  return { path: resolved, data };
}

async function* readJsonLines(filePath) {
  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
  }
}

async function hashJsonlRows(filePath) {
  const hash = createHash("sha256");
  let count = 0;
  for await (const row of readJsonLines(filePath)) {
    hash.update(`${JSON.stringify(stable(row))}\n`);
    count += 1;
  }
  return { count, sha256: hash.digest("hex") };
}

async function verifyPlanFiles(plan) {
  const candidates = await hashJsonlRows(plan.row_files.cardCandidateRows);
  const rollups = await hashJsonlRows(plan.row_files.rollupRows);
  const actualHashes = {
    cardCandidateRows: candidates.sha256,
    rollupRows: rollups.sha256,
  };
  const actualCounts = {
    market_listing_card_candidates: candidates.count,
    market_listing_rollups: rollups.count,
  };
  const actualManifestHash = sha256({
    row_file_hashes: actualHashes,
    candidate_count: candidates.count,
    rollup_count: rollups.count,
    source_run_key: plan.source_run_key,
  });
  const findings = [];
  for (const [key, actual] of Object.entries(actualHashes)) {
    if (actual !== plan.row_file_hashes_sha256?.[key]) findings.push(`${key}_sha256_mismatch`);
  }
  for (const [table, actual] of Object.entries(actualCounts)) {
    if (actual !== plan.proposed_table_row_counts?.[table]) findings.push(`${table}_row_count_mismatch`);
  }
  if (actualManifestHash !== plan.row_manifest_hash_sha256) findings.push("computed_row_manifest_hash_mismatch");
  return {
    verified: findings.length === 0,
    findings,
    actual_row_file_hashes_sha256: actualHashes,
    actual_row_counts: actualCounts,
    actual_row_manifest_hash_sha256: actualManifestHash,
  };
}

async function collectColumn(filePath, getValue) {
  const values = [];
  for await (const row of readJsonLines(filePath)) {
    const value = getValue(row);
    if (value) values.push(value);
  }
  return values;
}

async function existingIds(supabase, table, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id")
      .in("id", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] id collision check failed for ${table}: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found.map((row) => row.id);
}

async function existingCandidateHashes(supabase, hashes) {
  const found = [];
  for (let index = 0; index < hashes.length; index += 100) {
    const chunk = hashes.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from("market_listing_card_candidates")
      .select("id,candidate_hash")
      .eq("source", "ebay_active")
      .in("candidate_hash", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] candidate hash collision check failed: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found;
}

async function existingRollupKeys(supabase, rollupRowsPath) {
  const rows = [];
  for await (const row of readJsonLines(rollupRowsPath)) rows.push(row);
  const cardPrintIds = [...new Set(rows.map((row) => row.card_print_id).filter(Boolean))];
  const found = [];
  for (let index = 0; index < cardPrintIds.length; index += 100) {
    const chunk = cardPrintIds.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from("market_listing_rollups")
      .select("id,source,rollup_version,rollup_window,card_print_id")
      .eq("source", "ebay_active")
      .in("card_print_id", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] rollup key collision check failed: ${error.message}`);
    found.push(...(data ?? []));
  }
  const plannedKeys = new Set(rows.map((row) => `${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`));
  return found.filter((row) => plannedKeys.has(`${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`));
}

async function collisionSummary(supabase, plan) {
  const candidateIds = await collectColumn(plan.row_files.cardCandidateRows, (row) => row.id);
  const rollupIds = await collectColumn(plan.row_files.rollupRows, (row) => row.id);
  const candidateHashes = await collectColumn(plan.row_files.cardCandidateRows, (row) => row.candidate_hash);
  const candidateIdCollisions = await existingIds(supabase, "market_listing_card_candidates", candidateIds);
  const rollupIdCollisions = await existingIds(supabase, "market_listing_rollups", rollupIds);
  const candidateHashCollisions = await existingCandidateHashes(supabase, candidateHashes);
  const rollupKeyCollisions = await existingRollupKeys(supabase, plan.row_files.rollupRows);
  return {
    checked: true,
    candidate_id_collision_count: candidateIdCollisions.length,
    rollup_id_collision_count: rollupIdCollisions.length,
    candidate_hash_collision_count: candidateHashCollisions.length,
    rollup_key_collision_count: rollupKeyCollisions.length,
    candidate_id_collision_ids: candidateIdCollisions,
    rollup_id_collision_ids: rollupIdCollisions,
    candidate_hash_collision_hashes: candidateHashCollisions.map((row) => row.candidate_hash),
    rollup_key_collision_keys: rollupKeyCollisions.map((row) => `${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`),
    candidate_id_collision_samples: candidateIdCollisions.slice(0, 10),
    rollup_id_collision_samples: rollupIdCollisions.slice(0, 10),
    candidate_hash_collision_samples: candidateHashCollisions.slice(0, 10),
    rollup_key_collision_samples: rollupKeyCollisions.slice(0, 10),
  };
}

function validatePlan(plan, collision, args) {
  const findings = [];
  if (!args.allowDynamicPlan) {
    if (plan.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
    if (plan.row_manifest_hash_sha256 !== EXPECTED_ROW_MANIFEST_HASH) findings.push("row_manifest_hash_mismatch");
    if (plan.source_readback_fingerprint_sha256 !== EXPECTED_SOURCE_READBACK_FINGERPRINT) findings.push("source_readback_fingerprint_mismatch");
  }
  if (plan.ready_for_apply_approval !== true) findings.push("plan_not_ready_for_apply");
  if ((plan.findings ?? []).length > 0) findings.push("plan_contains_findings");
  if (!args.allowDynamicPlan) {
    if (!args.readbackOnly && (collision?.candidate_id_collision_count ?? 0) > 0) findings.push("candidate_id_collisions_detected");
    if (!args.readbackOnly && (collision?.rollup_id_collision_count ?? 0) > 0) findings.push("rollup_id_collisions_detected");
    if (!args.readbackOnly && (collision?.candidate_hash_collision_count ?? 0) > 0) findings.push("candidate_hash_collisions_detected");
    if (!args.readbackOnly && (collision?.rollup_key_collision_count ?? 0) > 0) findings.push("rollup_key_collisions_detected");
  }
  if (!args.apply && !args.readbackOnly) findings.push("apply_flag_missing");
  return findings;
}

async function insertJsonlRows(supabase, table, filePath, chunkSize, options = {}) {
  let inserted = 0;
  let skipped = 0;
  let chunk = [];
  const progressEvery = options.progressEvery ?? 10_000;
  async function flush() {
    if (!chunk.length) return;
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .insert(chunk)
      .select("id"));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] insert failed for ${table}: ${error.message}`);
    inserted += data?.length ?? chunk.length;
    if (inserted % progressEvery < chunk.length) {
      console.error(`[market-listing-candidate-rollup-apply] inserted ${inserted} into ${table}`);
    }
    chunk = [];
  }
  for await (const row of readJsonLines(filePath)) {
    if (options.skipRow?.(row)) {
      skipped += 1;
      continue;
    }
    chunk.push(row);
    if (chunk.length >= chunkSize) await flush();
  }
  await flush();
  return { inserted, skipped };
}

function quotedColumns(columns) {
  return columns.map((column) => `"${column}"`).join(", ");
}

async function insertTempChunk(client, tempTable, columns, rows) {
  if (!rows.length) return;
  const values = [];
  const tuples = rows.map((row) => {
    const placeholders = columns.map((column) => {
      values.push(row[column] ?? null);
      return `$${values.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });
  await client.query(
    `insert into ${tempTable} (${quotedColumns(columns)}) values ${tuples.join(", ")}`,
    values,
  );
}

async function loadJsonlIntoTemp(client, tempTable, table, filePath, chunkSize = 500) {
  const columns = DIRECT_TABLE_COLUMNS[table];
  if (!columns) throw new Error(`unsupported direct-apply table: ${table}`);
  let loaded = 0;
  let chunk = [];
  for await (const row of readJsonLines(filePath)) {
    chunk.push(row);
    if (chunk.length < chunkSize) continue;
    await insertTempChunk(client, tempTable, columns, chunk);
    loaded += chunk.length;
    chunk = [];
  }
  await insertTempChunk(client, tempTable, columns, chunk);
  loaded += chunk.length;
  return loaded;
}

async function directCollisionSummary(client) {
  const result = await client.query(
    `select jsonb_build_object(
       'checked', true,
       'candidate_id_collision_count', (select count(*) from tmp_market_listing_card_candidates planned join public.market_listing_card_candidates live using (id)),
       'rollup_id_collision_count', (select count(*) from tmp_market_listing_rollups planned join public.market_listing_rollups live using (id)),
       'candidate_hash_collision_count', (
         select count(*) from tmp_market_listing_card_candidates planned
         join public.market_listing_card_candidates live
           on live.source = planned.source and live.candidate_hash = planned.candidate_hash
       ),
       'rollup_key_collision_count', (
         select count(*) from tmp_market_listing_rollups planned
         join public.market_listing_rollups live
           on live.source = planned.source
          and live.rollup_version = planned.rollup_version
          and live.rollup_window = planned.rollup_window
          and live.card_print_id = planned.card_print_id
       ),
       'candidate_id_collision_samples', coalesce((
         select jsonb_agg(id) from (
           select planned.id from tmp_market_listing_card_candidates planned
           join public.market_listing_card_candidates live using (id) limit 10
         ) sample
       ), '[]'::jsonb),
       'rollup_id_collision_samples', coalesce((
         select jsonb_agg(id) from (
           select planned.id from tmp_market_listing_rollups planned
           join public.market_listing_rollups live using (id) limit 10
         ) sample
       ), '[]'::jsonb)
     ) as summary`,
  );
  return result.rows[0].summary;
}

function hasCollision(collision) {
  return [
    "candidate_id_collision_count",
    "rollup_id_collision_count",
    "candidate_hash_collision_count",
    "rollup_key_collision_count",
  ].some((field) => Number(collision?.[field] ?? 0) > 0);
}

async function directReadbackCounts(client) {
  const result = await client.query(
    `select jsonb_build_object(
       'market_listing_card_candidates', (
         select count(*) from tmp_market_listing_card_candidates planned
         join public.market_listing_card_candidates live using (id)
       ),
       'market_listing_rollups', (
         select count(*) from tmp_market_listing_rollups planned
         join public.market_listing_rollups live using (id)
       )
     ) as counts`,
  );
  return Object.fromEntries(Object.entries(result.rows[0].counts)
    .map(([key, value]) => [key, Number(value)]));
}

async function applyRowsWithPg(plan, args) {
  const connectionString = directDbUrl();
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 1000 * 60 * 35,
    statement_timeout: 1000 * 60 * 30,
    ssl: pgSslConfig(connectionString),
  });
  await client.connect();
  let committed = false;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '10s'");
    await client.query("set local statement_timeout = '30min'");
    await client.query(
      "create temp table tmp_market_listing_card_candidates (like public.market_listing_card_candidates including defaults) on commit preserve rows",
    );
    await client.query(
      "create temp table tmp_market_listing_rollups (like public.market_listing_rollups including defaults) on commit preserve rows",
    );

    const loadedCandidates = await loadJsonlIntoTemp(
      client,
      "tmp_market_listing_card_candidates",
      "market_listing_card_candidates",
      plan.row_files.cardCandidateRows,
    );
    const loadedRollups = await loadJsonlIntoTemp(
      client,
      "tmp_market_listing_rollups",
      "market_listing_rollups",
      plan.row_files.rollupRows,
    );
    if (loadedCandidates !== plan.proposed_table_row_counts.market_listing_card_candidates) {
      throw new Error("candidate temp row count does not match the plan");
    }
    if (loadedRollups !== plan.proposed_table_row_counts.market_listing_rollups) {
      throw new Error("rollup temp row count does not match the plan");
    }

    await client.query("create index tmp_market_listing_card_candidates_id_idx on tmp_market_listing_card_candidates (id)");
    await client.query("create index tmp_market_listing_card_candidates_hash_idx on tmp_market_listing_card_candidates (source, candidate_hash)");
    await client.query("create index tmp_market_listing_rollups_id_idx on tmp_market_listing_rollups (id)");
    await client.query("create index tmp_market_listing_rollups_key_idx on tmp_market_listing_rollups (source, rollup_version, rollup_window, card_print_id)");
    await client.query("analyze tmp_market_listing_card_candidates");
    await client.query("analyze tmp_market_listing_rollups");

    const collision = await directCollisionSummary(client);
    if (!args.allowDynamicPlan && hasCollision(collision)) {
      throw new Error("direct apply found collisions for a fixed plan");
    }

    const candidateColumns = DIRECT_TABLE_COLUMNS.market_listing_card_candidates;
    const rollupColumns = DIRECT_TABLE_COLUMNS.market_listing_rollups;
    const candidateInsert = await client.query(
      `with inserted as (
         insert into public.market_listing_card_candidates (${quotedColumns(candidateColumns)})
         select ${quotedColumns(candidateColumns)} from tmp_market_listing_card_candidates
         on conflict do nothing returning 1
       ) select count(*)::int as count from inserted`,
    );
    const rollupInsert = await client.query(
      `with inserted as (
         insert into public.market_listing_rollups (${quotedColumns(rollupColumns)})
         select ${quotedColumns(rollupColumns)} from tmp_market_listing_rollups
         on conflict do nothing returning 1
       ) select count(*)::int as count from inserted`,
    );
    const precommitReadback = await directReadbackCounts(client);
    const expected = expectedReadbackCounts(plan);
    if (!readbackMatchesExpected(precommitReadback, expected)) {
      throw new Error("direct apply readback does not match the plan; rolling back");
    }
    await client.query("commit");
    committed = true;
    const durableReadback = await directReadbackCounts(client);
    if (!readbackMatchesExpected(durableReadback, expected)) {
      throw new Error("committed direct apply readback does not match the plan");
    }
    return {
      inserted: {
        market_listing_card_candidates: {
          inserted: Number(candidateInsert.rows[0].count),
          skipped: loadedCandidates - Number(candidateInsert.rows[0].count),
        },
        market_listing_rollups: {
          inserted: Number(rollupInsert.rows[0].count),
          skipped: loadedRollups - Number(rollupInsert.rows[0].count),
        },
      },
      readback: durableReadback,
      precommit_readback: precommitReadback,
      collision,
    };
  } catch (error) {
    if (!committed) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function buildDynamicSkipState(collision) {
  const candidateIds = new Set(collision.candidate_id_collision_ids ?? []);
  const rollupIds = new Set(collision.rollup_id_collision_ids ?? []);
  const candidateHashes = new Set(collision.candidate_hash_collision_hashes ?? []);
  const rollupKeys = new Set(collision.rollup_key_collision_keys ?? []);
  return {
    candidateIds,
    candidateHashes,
    rollupIds,
    rollupKeys,
  };
}

function skipRowForTable(table, row, state) {
  if (table === "market_listing_card_candidates") {
    return state.candidateIds.has(row.id) || state.candidateHashes.has(row.candidate_hash);
  }
  if (table === "market_listing_rollups") {
    const key = `${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`;
    return state.rollupIds.has(row.id) || state.rollupKeys.has(key);
  }
  return false;
}

function publicCollisionSummary(collision) {
  const {
    candidate_id_collision_ids,
    rollup_id_collision_ids,
    candidate_hash_collision_hashes,
    rollup_key_collision_keys,
    ...publicSummary
  } = collision ?? {};
  return publicSummary;
}

async function applyRows(supabase, plan, args, collision) {
  const dynamicSkipState = args.allowDynamicPlan ? buildDynamicSkipState(collision) : null;
  return {
    market_listing_card_candidates: await insertJsonlRows(
      supabase,
      "market_listing_card_candidates",
      plan.row_files.cardCandidateRows,
      500,
      {
        skipRow: dynamicSkipState
          ? (row) => skipRowForTable("market_listing_card_candidates", row, dynamicSkipState)
          : null,
      },
    ),
    market_listing_rollups: await insertJsonlRows(
      supabase,
      "market_listing_rollups",
      plan.row_files.rollupRows,
      500,
      {
        skipRow: dynamicSkipState
          ? (row) => skipRowForTable("market_listing_rollups", row, dynamicSkipState)
          : null,
      },
    ),
  };
}

async function countByIds(supabase, table, ids) {
  let total = 0;
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { count, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("id", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] readback failed for ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

async function readbackCounts(supabase, plan) {
  const candidateIds = await collectColumn(plan.row_files.cardCandidateRows, (row) => row.id);
  const rollupIds = await collectColumn(plan.row_files.rollupRows, (row) => row.id);
  return {
    market_listing_card_candidates: await countByIds(supabase, "market_listing_card_candidates", candidateIds),
    market_listing_rollups: await countByIds(supabase, "market_listing_rollups", rollupIds),
  };
}

function expectedReadbackCounts(plan) {
  return {
    market_listing_card_candidates: plan.proposed_table_row_counts.market_listing_card_candidates,
    market_listing_rollups: plan.proposed_table_row_counts.market_listing_rollups,
  };
}

function readbackMatchesExpected(readback, expected) {
  return Object.entries(expected).every(([table, count]) => readback?.[table] === count);
}

function renderMarkdown(report) {
  return [
    "# MEE-11T Market Listing Card Candidate Rollup Apply",
    "",
    `- Applied by this invocation: \`${report.applied}\``,
    `- Remote rows verified: \`${report.remote_rows_verified}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    "",
    "## Inserted Rows",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...(Object.keys(report.apply_result?.inserted ?? {}).length
      ? Object.entries(report.apply_result.inserted).map(([table, count]) => `| \`${table}\` | ${count} |`)
      : ["| none in this invocation | 0 |"]),
    "",
    "## Readback Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.readback_counts ?? {}).map(([table, count]) => `| \`${table}\` | ${count} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const plan = await readPlan(args.planPath);
  const planFileVerification = await verifyPlanFiles(plan.data);
  const supabase = createBackendClient();
  let collision = args.readbackOnly
    ? { checked: false }
    : directDbUrl()
      ? { checked: true, deferred_to_atomic_direct_apply: true }
      : await collisionSummary(supabase, plan.data);
  const findings = [
    ...planFileVerification.findings,
    ...validatePlan(plan.data, collision, args),
  ];
  let applyResult = null;
  let readback = null;
  const expectedReadback = expectedReadbackCounts(plan.data);

  if (args.apply && findings.length === 0) {
    if (directDbUrl()) {
      const directResult = await applyRowsWithPg(plan.data, args);
      applyResult = { inserted: directResult.inserted };
      readback = directResult.readback;
      collision = directResult.collision;
    } else {
      const inserted = await applyRows(supabase, plan.data, args, collision);
      applyResult = { inserted };
      readback = await readbackCounts(supabase, plan.data);
    }
  } else if (args.readbackOnly) {
    readback = await readbackCounts(supabase, plan.data);
  }

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    applied: Boolean(applyResult),
    remote_rows_verified: readbackMatchesExpected(readback, expectedReadback),
    mode: args.apply ? "apply" : args.readbackOnly ? "readback_only" : "dry_run",
    plan_artifact: rel(plan.path),
    package_fingerprint_sha256: plan.data.package_fingerprint_sha256,
    row_manifest_hash_sha256: plan.data.row_manifest_hash_sha256,
    source_readback_fingerprint_sha256: plan.data.source_readback_fingerprint_sha256,
    plan_file_verification: planFileVerification,
    proposed_table_row_counts: plan.data.proposed_table_row_counts,
    expected_readback_counts: expectedReadback,
    remote_collision_summary: publicCollisionSummary(collision),
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: Boolean(applyResult),
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    findings,
    apply_result: applyResult,
    readback_counts: readback,
  };

  const jsonPath = path.join(AUDIT_DIR, `mee_11t_market_listing_card_candidate_rollup_apply_${stamp}.json`);
  const mdPath = path.join(AUDIT_DIR, `mee_11t_market_listing_card_candidate_rollup_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    applied: report.applied,
    remote_rows_verified: report.remote_rows_verified,
    findings: report.findings,
    apply_result: report.apply_result,
    readback_counts: report.readback_counts,
    remote_collision_summary: report.remote_collision_summary,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
  }, null, 2));

  if (!report.applied && !report.remote_rows_verified) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
