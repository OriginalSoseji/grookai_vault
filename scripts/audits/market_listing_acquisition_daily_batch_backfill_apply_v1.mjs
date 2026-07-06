import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1";
export const EXPECTED_PLAN_PACKAGE_FINGERPRINT = "2ebd59a1c8b56e8f613ebd7c5a616a82c655bb0b2eed9899b71d309ba2226c44";
export const EXPECTED_ROW_MANIFEST_HASH = "92b002b5831f77b75c4ede1445a5dd2993bbee7df1a41ae78f83b539b185704a";
export const EXPECTED_SOURCE_PACKAGE_FINGERPRINT = "58975dc5090431a83ca4b513fa3d8be97fc182c541580d796a63260a4808514a";
export const EXPECTED_REQUEST_RESULTS_MANIFEST_HASH = "69f37f83fad3afffd897c7b3fee45fd53d070ad16ac1c07408b83eaca47bad0c";
export const EXPECTED_RAW_SNAPSHOT_MANIFEST_HASH = "27cf71b55eebc84ce5444871435bee61dfafdd7fd17fe1a6182a9628bfec131a";
export const EXPECTED_OBSERVATION_MANIFEST_HASH = "85abe190326dadf92ccbccd041ef4e76043a984868c468f337660b6630247a2a";
export const EXPECTED_SCHEMA_MIGRATION_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const PLAN_PREFIX = "mee_11m_market_listing_acquisition_daily_batch_backfill_plan_";
const { Client } = pg;

const APPLY_ORDER = [
  ["market_listing_acquisition_runs", "acquisitionRunRows", "market_listing_acquisition_runs"],
  ["market_listing_query_cache", "queryCacheRows", "market_listing_query_cache"],
  ["market_listing_raw_snapshots", "rawSnapshotRows", "market_listing_raw_snapshots"],
  ["market_listing_observations", "observationRows", "market_listing_observations"],
  ["market_listing_seller_snapshots", "sellerSnapshotRows", "market_listing_seller_snapshots"],
  ["market_listing_price_events", "priceEventRows", "market_listing_price_events"],
];

const INSERT_CHUNK_SIZE = {
  market_listing_acquisition_runs: 1,
  market_listing_query_cache: 500,
  market_listing_raw_snapshots: 100,
  market_listing_observations: 500,
  market_listing_seller_snapshots: 500,
  market_listing_price_events: 500,
};

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    readbackOnly: argv.includes("--readback-only"),
    allowDynamicPlan: argv.includes("--allow-dynamic-plan"),
    planPath: argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? null,
  };
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
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
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const files = await fs.readdir(dir);
  const candidates = files
    .filter((fileName) => fileName.startsWith(PLAN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-daily-backfill-apply] no ${PLAN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

async function readPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? await latestPlanPath());
  const data = JSON.parse(await fs.readFile(resolved, "utf8"));
  data.row_files = Object.fromEntries(Object.entries(data.row_files ?? {})
    .map(([key, value]) => [key, path.resolve(REPO_ROOT, value)]));
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

async function collectColumnFromJsonl(filePath, getValue) {
  const values = [];
  for await (const row of readJsonLines(filePath)) {
    const value = getValue(row);
    if (value) values.push(value);
  }
  return values;
}

async function existingIds(supabase, table, ids) {
  if (!ids.length) return [];
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id")
      .in("id", chunk));
    if (error) throw new Error(`[market-listing-daily-backfill-apply] collision check failed for ${table}: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found.map((row) => row.id);
}

async function existingRawPayloadKeys(supabase, rawRowsPath) {
  const keys = new Map();
  for await (const row of readJsonLines(rawRowsPath)) {
    if (row.source_listing_id && row.payload_hash) {
      keys.set(`${row.source}:${row.source_listing_id}:${row.payload_hash}`, {
        planned_id: row.id,
        source: row.source,
        source_listing_id: row.source_listing_id,
        payload_hash: row.payload_hash,
      });
    }
  }

  const listingIds = [...new Set([...keys.values()].map((row) => row.source_listing_id))];
  const found = [];
  for (let index = 0; index < listingIds.length; index += 100) {
    const chunk = listingIds.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from("market_listing_raw_snapshots")
      .select("id,source,source_listing_id,payload_hash")
      .eq("source", "ebay_active")
      .in("source_listing_id", chunk));
    if (error) throw new Error(`[market-listing-daily-backfill-apply] raw payload collision check failed: ${error.message}`);
    for (const row of data ?? []) {
      const planned = keys.get(`${row.source}:${row.source_listing_id}:${row.payload_hash}`);
      if (planned) found.push({ ...row, planned_id: planned.planned_id });
    }
  }
  return found;
}

async function existingSellerKeys(supabase, sellerRowsPath) {
  const keys = new Map();
  for await (const row of readJsonLines(sellerRowsPath)) {
    if (row.source && row.seller_key && row.observed_at) {
      keys.set(`${row.source}:${row.seller_key}:${row.observed_at}`, {
        planned_id: row.id,
        ...row,
      });
    }
  }

  const sellerKeys = [...new Set([...keys.values()].map((row) => row.seller_key))];
  const found = [];
  for (let index = 0; index < sellerKeys.length; index += 100) {
    const chunk = sellerKeys.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from("market_listing_seller_snapshots")
      .select("id,source,seller_key,observed_at")
      .eq("source", "ebay_active")
      .in("seller_key", chunk));
    if (error) throw new Error(`[market-listing-daily-backfill-apply] seller collision check failed: ${error.message}`);
    for (const row of data ?? []) {
      const planned = keys.get(`${row.source}:${row.seller_key}:${row.observed_at}`);
      if (planned) found.push({ ...row, planned_id: planned.planned_id });
    }
  }
  return found;
}

async function collisionSummary(supabase, plan) {
  const idCollisions = {};
  for (const [table, rowsKey] of APPLY_ORDER) {
    const ids = await collectColumnFromJsonl(plan.row_files[rowsKey], (row) => row.id);
    idCollisions[table] = await existingIds(supabase, table, ids);
  }
  const rawPayloadCollisions = await existingRawPayloadKeys(supabase, plan.row_files.rawSnapshotRows);
  const sellerCollisions = await existingSellerKeys(supabase, plan.row_files.sellerSnapshotRows);
  return {
    checked: true,
    id_collisions: idCollisions,
    id_collision_count: Object.values(idCollisions).reduce((sum, rows) => sum + rows.length, 0),
    raw_payload_collision_count: rawPayloadCollisions.length,
    raw_payload_collision_planned_ids: rawPayloadCollisions.map((row) => row.planned_id).filter(Boolean),
    raw_payload_collision_samples: rawPayloadCollisions.slice(0, 10),
    seller_unique_collision_count: sellerCollisions.length,
    seller_unique_collision_planned_ids: sellerCollisions.map((row) => row.planned_id).filter(Boolean),
    seller_unique_collision_samples: sellerCollisions.slice(0, 10),
  };
}

function validatePlan(plan, collision, args) {
  const findings = [];
  if (!args.allowDynamicPlan) {
    if (plan.package_fingerprint_sha256 !== EXPECTED_PLAN_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
    if (plan.row_manifest_hash_sha256 !== EXPECTED_ROW_MANIFEST_HASH) findings.push("row_manifest_hash_mismatch");
    if (plan.source_package_fingerprint_sha256 !== EXPECTED_SOURCE_PACKAGE_FINGERPRINT) findings.push("source_package_fingerprint_mismatch");
    if (plan.request_results_manifest_hash_sha256 !== EXPECTED_REQUEST_RESULTS_MANIFEST_HASH) findings.push("request_results_manifest_hash_mismatch");
    if (plan.raw_snapshot_manifest_hash_sha256 !== EXPECTED_RAW_SNAPSHOT_MANIFEST_HASH) findings.push("raw_snapshot_manifest_hash_mismatch");
    if (plan.projected_observation_manifest_hash_sha256 !== EXPECTED_OBSERVATION_MANIFEST_HASH) findings.push("projected_observation_manifest_hash_mismatch");
  }
  if (plan.schema_migration_hash_sha256 !== EXPECTED_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (plan.ready_for_apply_approval !== true) findings.push("plan_not_ready_for_apply");
  if ((plan.findings ?? []).length > 0) findings.push("plan_contains_findings");
  if (!args.allowDynamicPlan) {
    if (!args.readbackOnly && (collision?.id_collision_count ?? 0) > 0) findings.push("remote_id_collisions_detected");
    if (!args.readbackOnly && (collision?.raw_payload_collision_count ?? 0) > 0) findings.push("remote_raw_payload_collisions_detected");
    if (!args.readbackOnly && (collision?.seller_unique_collision_count ?? 0) > 0) findings.push("remote_seller_unique_collisions_detected");
  }
  if (!args.apply && !args.readbackOnly) findings.push("apply_flag_missing");
  return findings;
}

async function firstRowValue(filePath, getValue) {
  for await (const row of readJsonLines(filePath)) return getValue(row);
  return null;
}

async function queryPgRows(sql, params) {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function dynamicIdCollisions(plan, runId) {
  const result = Object.fromEntries(APPLY_ORDER.map(([table]) => [table, []]));
  const tableQueries = [
    [
      "market_listing_acquisition_runs",
      "select id from public.market_listing_acquisition_runs where id = $1",
      [runId],
    ],
    ...APPLY_ORDER
      .filter(([table]) => table !== "market_listing_acquisition_runs" && table !== "market_listing_price_events")
      .map(([table]) => [
        table,
        `select id from public.${table} where acquisition_run_id = $1`,
        [runId],
      ]),
    [
      "market_listing_price_events",
      `select pe.id
         from public.market_listing_price_events pe
         join public.market_listing_observations o on o.id = pe.observation_id
        where o.acquisition_run_id = $1`,
      [runId],
    ],
  ];

  for (const [table, sql, params] of tableQueries) {
    result[table] = (await queryPgRows(sql, params)).map((row) => row.id);
  }
  return result;
}

async function dynamicRawPayloadCollisions(plan) {
  const rawRows = [];
  const listingIds = new Set();
  for await (const row of readJsonLines(plan.row_files.rawSnapshotRows)) {
    if (!row.source_listing_id || !row.payload_hash) continue;
    rawRows.push({
      planned_id: row.id,
      source_listing_id: row.source_listing_id,
      payload_hash: row.payload_hash,
    });
    listingIds.add(row.source_listing_id);
  }

  const existingByKey = new Map();
  const ids = [...listingIds];
  for (let index = 0; index < ids.length; index += 5_000) {
    const chunk = ids.slice(index, index + 5_000);
    const rows = await queryPgRows(
      `select id, source_listing_id, payload_hash
         from public.market_listing_raw_snapshots
        where source = 'ebay_active'
          and source_listing_id = any($1::text[])`,
      [chunk],
    );
    for (const row of rows) {
      const key = `${row.source_listing_id}:${row.payload_hash}`;
      if (!existingByKey.has(key)) existingByKey.set(key, new Set());
      existingByKey.get(key).add(row.id);
    }
  }

  const seen = new Set();
  const collisions = [];
  for (const row of rawRows) {
    const key = `${row.source_listing_id}:${row.payload_hash}`;
    const existingIds = existingByKey.get(key);
    if (seen.has(key) || (existingIds && !existingIds.has(row.planned_id))) {
      collisions.push(row.planned_id);
      continue;
    }
    seen.add(key);
  }
  return collisions;
}

async function dynamicSellerCollisions(plan) {
  const seen = new Set();
  const collisions = [];
  for await (const row of readJsonLines(plan.row_files.sellerSnapshotRows)) {
    if (!row.source || !row.seller_key || !row.observed_at) continue;
    const key = `${row.source}:${row.seller_key}:${row.observed_at}`;
    if (seen.has(key)) {
      collisions.push(row.id);
      continue;
    }
    seen.add(key);
  }
  return collisions;
}

async function dynamicCollisionSummary(plan) {
  if (!process.env.SUPABASE_DB_URL) {
    return { checked: false, skipped_for_dynamic_plan: true, reason: "SUPABASE_DB_URL_unavailable" };
  }
  const runId = await firstRowValue(plan.row_files.acquisitionRunRows, (row) => row.id);
  const idCollisions = await dynamicIdCollisions(plan, runId);
  const rawPayloadCollisionPlannedIds = await dynamicRawPayloadCollisions(plan);
  const sellerUniqueCollisionPlannedIds = await dynamicSellerCollisions(plan);
  return {
    checked: true,
    dynamic_collision_check: true,
    id_collisions: idCollisions,
    id_collision_count: Object.values(idCollisions).reduce((sum, rows) => sum + rows.length, 0),
    raw_payload_collision_count: rawPayloadCollisionPlannedIds.length,
    raw_payload_collision_planned_ids: rawPayloadCollisionPlannedIds,
    raw_payload_collision_samples: rawPayloadCollisionPlannedIds.slice(0, 10),
    seller_unique_collision_count: sellerUniqueCollisionPlannedIds.length,
    seller_unique_collision_planned_ids: sellerUniqueCollisionPlannedIds,
    seller_unique_collision_samples: sellerUniqueCollisionPlannedIds.slice(0, 10),
  };
}

async function insertJsonlRows(supabase, table, filePath, chunkSize, options = {}) {
  let inserted = 0;
  let skipped = 0;
  let chunk = [];
  const progressEvery = options.progressEvery ?? 10_000;
  async function flush() {
    if (!chunk.length) return;
    const rowCount = chunk.length;
    const { error } = await supabaseRequest(() => supabase
      .from(table)
      .insert(chunk));
    if (error) throw new Error(`[market-listing-daily-backfill-apply] insert failed for ${table}: ${error.message}`);
    inserted += rowCount;
    if (inserted % progressEvery < rowCount) {
      console.error(`[market-listing-daily-backfill-apply] inserted ${inserted} into ${table}`);
    }
    chunk = [];
  }

  for await (const row of readJsonLines(filePath)) {
    if (options.skipRow?.(row)) {
      skipped += 1;
      continue;
    }
    chunk.push(sanitizeRowForTable(table, row));
    if (chunk.length >= chunkSize) await flush();
  }
  await flush();
  return { inserted, skipped };
}

function sanitizeRowForTable(table, row) {
  if (table !== "market_listing_seller_snapshots") return row;

  const sanitized = { ...row };
  if (typeof sanitized.feedback_score === "number" && sanitized.feedback_score < 0) {
    sanitized.feedback_score = null;
  }
  if (
    typeof sanitized.feedback_percentage === "number"
    && (sanitized.feedback_percentage < 0 || sanitized.feedback_percentage > 100)
  ) {
    sanitized.feedback_percentage = null;
  }
  return sanitized;
}

function buildDynamicSkipState(collision) {
  const idCollisions = Object.fromEntries(
    Object.entries(collision.id_collisions ?? {}).map(([table, ids]) => [table, new Set(ids)]),
  );
  const rawSnapshotIdCollisions = idCollisions.market_listing_raw_snapshots ?? new Set();
  const rawUnavailableIds = new Set(
    (collision.raw_payload_collision_planned_ids ?? [])
      .filter((id) => !rawSnapshotIdCollisions.has(id)),
  );
  const observationUnavailableIds = new Set();
  const sellerIds = new Set([
    ...(idCollisions.market_listing_seller_snapshots ?? []),
    ...(collision.seller_unique_collision_planned_ids ?? []),
  ]);
  return {
    idCollisions,
    rawUnavailableIds,
    observationUnavailableIds,
    sellerIds,
  };
}

function skipRowForTable(table, row, state) {
  if ((state.idCollisions[table] ?? new Set()).has(row.id)) return true;
  if (table === "market_listing_raw_snapshots" && state.rawUnavailableIds.has(row.id)) return true;
  if (table === "market_listing_observations") {
    if (state.rawUnavailableIds.has(row.raw_snapshot_id)) {
      state.observationUnavailableIds.add(row.id);
      return true;
    }
  }
  if (table === "market_listing_price_events") {
    if (state.observationUnavailableIds.has(row.observation_id)) return true;
  }
  if (table === "market_listing_seller_snapshots") {
    if (state.sellerIds.has(row.id)) return true;
    if (state.rawUnavailableIds.has(row.raw_snapshot_id)) {
      state.sellerIds.add(row.id);
      return true;
    }
  }
  return false;
}

async function applyRows(supabase, plan, args, collision) {
  const inserted = {};
  const skipped = {};
  const dynamicSkipState = args.allowDynamicPlan ? buildDynamicSkipState(collision) : null;
  for (const [table, rowsKey] of APPLY_ORDER) {
    const result = await insertJsonlRows(
      supabase,
      table,
      plan.row_files[rowsKey],
      INSERT_CHUNK_SIZE[table] ?? 500,
      {
        skipRow: dynamicSkipState ? (row) => skipRowForTable(table, row, dynamicSkipState) : null,
      },
    );
    inserted[table] = result.inserted;
    skipped[table] = result.skipped;
  }
  return { inserted, skipped };
}

async function firstRow(filePath) {
  for await (const row of readJsonLines(filePath)) return row;
  return null;
}

async function countByIn(supabase, table, column, values) {
  let total = 0;
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    const { count, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, chunk));
    if (error) throw new Error(`[market-listing-daily-backfill-apply] readback failed for ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

async function readbackCounts(supabase, plan) {
  if (process.env.SUPABASE_DB_URL) return readbackCountsWithPg(plan);

  const acquisitionRun = await firstRow(plan.row_files.acquisitionRunRows);
  const runId = acquisitionRun?.id;
  const observationIds = await collectColumnFromJsonl(plan.row_files.observationRows, (row) => row.id);
  const result = {};
  for (const [table] of APPLY_ORDER) {
    if (table === "market_listing_price_events") {
      result[table] = await countByIn(supabase, table, "observation_id", observationIds);
      continue;
    }
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    query = table === "market_listing_acquisition_runs"
      ? query.eq("id", runId)
      : query.eq("acquisition_run_id", runId);
    const { count, error } = await supabaseRequest(() => query);
    if (error) throw new Error(`[market-listing-daily-backfill-apply] readback failed for ${table}: ${error.message}`);
    result[table] = count ?? 0;
  }
  return result;
}

async function readbackCountsWithPg(plan) {
  const acquisitionRun = await firstRow(plan.row_files.acquisitionRunRows);
  const runId = acquisitionRun?.id;
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const count = async (sql, params) => {
      const result = await client.query(sql, params);
      return Number(result.rows[0]?.count ?? 0);
    };
    return {
      market_listing_acquisition_runs: await count(
        "select count(*)::int as count from public.market_listing_acquisition_runs where id = $1",
        [runId],
      ),
      market_listing_query_cache: await count(
        "select count(*)::int as count from public.market_listing_query_cache where acquisition_run_id = $1",
        [runId],
      ),
      market_listing_raw_snapshots: await count(
        "select count(*)::int as count from public.market_listing_raw_snapshots where acquisition_run_id = $1",
        [runId],
      ),
      market_listing_observations: await count(
        "select count(*)::int as count from public.market_listing_observations where acquisition_run_id = $1",
        [runId],
      ),
      market_listing_seller_snapshots: await count(
        "select count(*)::int as count from public.market_listing_seller_snapshots where acquisition_run_id = $1",
        [runId],
      ),
      market_listing_price_events: await count(
        `select count(*)::int as count
           from public.market_listing_price_events pe
           join public.market_listing_observations o on o.id = pe.observation_id
          where o.acquisition_run_id = $1`,
        [runId],
      ),
    };
  } finally {
    await client.end();
  }
}

function expectedReadbackCounts(plan) {
  return {
    market_listing_acquisition_runs: plan.proposed_table_row_counts.market_listing_acquisition_runs,
    market_listing_query_cache: plan.proposed_table_row_counts.market_listing_query_cache,
    market_listing_raw_snapshots: plan.proposed_table_row_counts.market_listing_raw_snapshots,
    market_listing_observations: plan.proposed_table_row_counts.market_listing_observations,
    market_listing_seller_snapshots: plan.proposed_table_row_counts.market_listing_seller_snapshots,
    market_listing_price_events: plan.proposed_table_row_counts.market_listing_price_events,
  };
}

function readbackMatchesExpected(readback, expected) {
  return Object.entries(expected).every(([table, count]) => readback?.[table] === count);
}

function readbackCoversExpected(readback, expected) {
  return Object.entries(expected).every(([table, count]) => (readback?.[table] ?? 0) >= count);
}

function renderMarkdown(report) {
  return [
    "# MEE-11N Market Listing Acquisition Daily Batch Backfill Apply",
    "",
    `- Package: \`${report.package_id}\``,
    `- Applied by this invocation: \`${report.applied}\``,
    `- Remote rows verified: \`${report.remote_rows_verified}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Plan artifact: \`${report.plan_artifact}\``,
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
    "| Table | Rows for acquisition run |",
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
  const supabase = createBackendClient();
  const collision = args.readbackOnly
    ? { checked: false }
    : args.allowDynamicPlan
      ? await dynamicCollisionSummary(plan.data)
      : await collisionSummary(supabase, plan.data);
  const findings = validatePlan(plan.data, collision, args);
  let applyResult = null;
  let readback = null;
  let expectedReadback = expectedReadbackCounts(plan.data);

  if (args.apply && findings.length === 0) {
    applyResult = await applyRows(supabase, plan.data, args, collision);
    if (args.allowDynamicPlan) expectedReadback = applyResult.inserted;
    readback = await readbackCounts(supabase, plan.data);
  } else if (args.readbackOnly) {
    readback = await readbackCounts(supabase, plan.data);
  }
  const remoteRowsVerified = args.allowDynamicPlan && applyResult
    ? readbackCoversExpected(readback, expectedReadback)
    : readbackMatchesExpected(readback, expectedReadback);

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    applied: Boolean(applyResult),
    remote_rows_verified: remoteRowsVerified,
    mode: args.apply ? (args.allowDynamicPlan ? "dynamic_idempotent_apply" : "apply") : args.readbackOnly ? "readback_only" : "dry_run",
    plan_artifact: rel(plan.path),
    package_fingerprint_sha256: plan.data.package_fingerprint_sha256,
    row_manifest_hash_sha256: plan.data.row_manifest_hash_sha256,
    source_package_fingerprint_sha256: plan.data.source_package_fingerprint_sha256,
    request_results_manifest_hash_sha256: plan.data.request_results_manifest_hash_sha256,
    raw_snapshot_manifest_hash_sha256: plan.data.raw_snapshot_manifest_hash_sha256,
    projected_observation_manifest_hash_sha256: plan.data.projected_observation_manifest_hash_sha256,
    schema_migration_hash_sha256: plan.data.schema_migration_hash_sha256,
    proposed_table_row_counts: plan.data.proposed_table_row_counts,
    expected_readback_counts: expectedReadback,
    remote_collision_summary: collision,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: Boolean(applyResult),
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      card_candidate_writes: false,
      rollup_writes: false,
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

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11n_market_listing_acquisition_daily_batch_backfill_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11n_market_listing_acquisition_daily_batch_backfill_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    applied: report.applied,
    remote_rows_verified: report.remote_rows_verified,
    findings: report.findings,
    apply_result: report.apply_result,
    readback_counts: report.readback_counts,
    remote_collision_summary: {
      id_collision_count: collision.id_collision_count,
      raw_payload_collision_count: collision.raw_payload_collision_count,
      seller_unique_collision_count: collision.seller_unique_collision_count,
      raw_payload_collision_samples: collision.raw_payload_collision_samples,
      seller_unique_collision_samples: collision.seller_unique_collision_samples,
    },
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
