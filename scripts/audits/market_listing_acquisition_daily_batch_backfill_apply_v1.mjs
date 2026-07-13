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

const TABLE_WRITE_CONTRACTS = {
  market_listing_acquisition_runs: {
    columns: [
      "id",
      "run_key",
      "contract_version",
      "source",
      "provider_route",
      "acquisition_strategy",
      "status",
      "requested_call_ceiling",
      "consumed_call_count",
      "requested_listing_ceiling",
      "observed_listing_count",
      "cached_query_count",
      "error_count",
      "options",
      "summary",
      "artifact_paths",
      "artifact_hashes",
      "started_at",
      "finished_at",
      "created_at",
    ],
    conflict: "id",
    updateColumns: [
      "status",
      "requested_call_ceiling",
      "consumed_call_count",
      "requested_listing_ceiling",
      "observed_listing_count",
      "cached_query_count",
      "error_count",
      "options",
      "summary",
      "artifact_paths",
      "artifact_hashes",
      "finished_at",
    ],
  },
  market_listing_query_cache: {
    columns: [
      "id",
      "acquisition_run_id",
      "source",
      "provider_route",
      "query_key",
      "query_text",
      "query_filters",
      "target_hints",
      "page_cursor",
      "result_count",
      "response_hash",
      "cache_status",
      "observed_at",
      "expires_at",
      "created_at",
    ],
    conflict: "id",
    updateColumns: [
      "acquisition_run_id",
      "query_text",
      "query_filters",
      "target_hints",
      "result_count",
      "response_hash",
      "cache_status",
      "observed_at",
      "expires_at",
    ],
  },
  market_listing_raw_snapshots: {
    columns: [
      "id",
      "acquisition_run_id",
      "query_cache_id",
      "source",
      "provider_route",
      "source_listing_id",
      "source_url",
      "raw_payload",
      "payload_hash",
      "observed_at",
      "ingested_at",
      "created_at",
    ],
    conflict: null,
    updateColumns: [],
  },
  market_listing_observations: {
    columns: [
      "id",
      "raw_snapshot_id",
      "acquisition_run_id",
      "query_cache_id",
      "source",
      "source_listing_id",
      "listing_url",
      "listing_title",
      "listing_status",
      "listing_format",
      "ask_price",
      "shipping_price",
      "total_ask_price",
      "currency",
      "quantity_available",
      "quantity_sold",
      "condition_text",
      "item_location",
      "seller_key",
      "observed_at",
      "created_at",
    ],
    conflict: null,
    updateColumns: [],
  },
  market_listing_seller_snapshots: {
    columns: [
      "id",
      "acquisition_run_id",
      "raw_snapshot_id",
      "source",
      "seller_key",
      "seller_username",
      "feedback_score",
      "feedback_percentage",
      "seller_location",
      "store_name",
      "observed_at",
      "created_at",
    ],
    conflict: null,
    updateColumns: [],
  },
  market_listing_price_events: {
    columns: [
      "id",
      "observation_id",
      "source",
      "source_listing_id",
      "event_type",
      "previous_observation_id",
      "previous_total_ask_price",
      "current_total_ask_price",
      "currency",
      "event_payload",
      "observed_at",
      "created_at",
    ],
    conflict: null,
    updateColumns: [],
  },
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

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function tableWriteContract(table) {
  const contract = TABLE_WRITE_CONTRACTS[table];
  if (!contract) throw new Error(`[market-listing-daily-backfill-apply] no write contract for ${table}`);
  return contract;
}

function directDbUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function pgSslConfig(connectionString) {
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

async function connectApplyPgClient() {
  const connectionString = directDbUrl();
  if (!connectionString) {
    throw new Error("[market-listing-daily-backfill-apply] SUPABASE_DB_URL is required for idempotent apply");
  }
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    ssl: pgSslConfig(connectionString),
  });
  await client.connect();
  return client;
}

async function applyChunkRows(pgClient, table, rows) {
  if (!rows.length) return { inserted: 0, updated: 0, no_op: 0, failed: 0 };
  const contract = tableWriteContract(table);
  const columns = contract.columns;
  const columnSql = columns.map(quoteIdent).join(", ");
  const selectSql = columns.map((column) => quoteIdent(column)).join(", ");
  const tableSql = `public.${quoteIdent(table)}`;
  const inputSql = `select ${selectSql} from jsonb_populate_recordset(null::${tableSql}, $1::jsonb)`;
  let sql;

  if (contract.conflict && contract.updateColumns.length) {
    const updateSql = contract.updateColumns
      .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`)
      .join(", ");
    const diffSql = contract.updateColumns
      .map((column) => `target.${quoteIdent(column)} is distinct from excluded.${quoteIdent(column)}`)
      .join(" or ");
    sql = `
      with input_rows as (
        ${inputSql}
      ),
      applied as (
        insert into ${tableSql} as target (${columnSql})
        select ${selectSql} from input_rows
        on conflict (${quoteIdent(contract.conflict)}) do update
          set ${updateSql}
        where ${diffSql}
        returning (xmax = 0) as inserted
      )
      select
        count(*) filter (where inserted)::int as inserted,
        count(*) filter (where not inserted)::int as updated,
        ($2::int - count(*))::int as no_op
      from applied
    `;
  } else {
    sql = `
      with input_rows as (
        ${inputSql}
      ),
      applied as (
        insert into ${tableSql} (${columnSql})
        select ${selectSql} from input_rows
        on conflict do nothing
        returning 1
      )
      select
        count(*)::int as inserted,
        0::int as updated,
        ($2::int - count(*))::int as no_op
      from applied
    `;
  }

  const result = await pgClient.query(sql, [JSON.stringify(rows), rows.length]);
  const row = result.rows[0] ?? {};
  return {
    inserted: Number(row.inserted ?? 0),
    updated: Number(row.updated ?? 0),
    no_op: Number(row.no_op ?? 0),
    failed: 0,
  };
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
  const connectionString = directDbUrl();
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    ssl: pgSslConfig(connectionString),
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

async function dynamicRawPayloadCollisionDetails(plan) {
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
      if (!existingByKey.has(key)) existingByKey.set(key, row.id);
    }
  }

  const seen = new Map();
  const collisions = [];
  const canonicalIdsByPlannedId = {};
  for (const row of rawRows) {
    const key = `${row.source_listing_id}:${row.payload_hash}`;
    const existingId = existingByKey.get(key);
    if (seen.has(key)) {
      collisions.push(row.planned_id);
      canonicalIdsByPlannedId[row.planned_id] = seen.get(key);
      continue;
    }
    if (existingId && existingId !== row.planned_id) {
      collisions.push(row.planned_id);
      canonicalIdsByPlannedId[row.planned_id] = existingId;
      continue;
    }
    seen.set(key, row.planned_id);
  }
  return { ids: collisions, canonicalIdsByPlannedId };
}

async function dynamicObservationCollisionDetails(plan, rawCanonicalIdsByPlannedId) {
  const observationRows = [];
  const targetRawIds = new Set();
  for await (const row of readJsonLines(plan.row_files.observationRows)) {
    const targetRawId = rawCanonicalIdsByPlannedId[row.raw_snapshot_id] ?? row.raw_snapshot_id;
    if (!targetRawId) continue;
    observationRows.push({
      planned_id: row.id,
      planned_raw_snapshot_id: row.raw_snapshot_id,
      target_raw_snapshot_id: targetRawId,
    });
    targetRawIds.add(targetRawId);
  }

  const existingByRawId = new Map();
  const ids = [...targetRawIds];
  for (let index = 0; index < ids.length; index += 5_000) {
    const chunk = ids.slice(index, index + 5_000);
    const rows = await queryPgRows(
      `select id, raw_snapshot_id
         from public.market_listing_observations
        where raw_snapshot_id = any($1::uuid[])`,
      [chunk],
    );
    for (const row of rows) {
      if (!existingByRawId.has(row.raw_snapshot_id)) existingByRawId.set(row.raw_snapshot_id, row.id);
    }
  }

  const idsWithCanonical = [];
  const canonicalIdsByPlannedId = {};
  for (const row of observationRows) {
    const existingId = existingByRawId.get(row.target_raw_snapshot_id);
    if (existingId && existingId !== row.planned_id) {
      idsWithCanonical.push(row.planned_id);
      canonicalIdsByPlannedId[row.planned_id] = existingId;
    }
  }
  return { ids: idsWithCanonical, canonicalIdsByPlannedId };
}

async function dynamicQueryCacheCollisions(plan) {
  const queryRows = [];
  const queryKeys = new Set();
  for await (const row of readJsonLines(plan.row_files.queryCacheRows)) {
    if (!row.source || !row.provider_route || !row.query_key) continue;
    const pageCursor = row.page_cursor ?? "";
    queryRows.push({
      planned_id: row.id,
      source: row.source,
      provider_route: row.provider_route,
      query_key: row.query_key,
      page_cursor: pageCursor,
    });
    queryKeys.add(row.query_key);
  }

  const existingByKey = new Map();
  const keys = [...queryKeys];
  for (let index = 0; index < keys.length; index += 5_000) {
    const chunk = keys.slice(index, index + 5_000);
    const rows = await queryPgRows(
      `select id, source, provider_route, query_key, coalesce(page_cursor, '') as page_cursor
         from public.market_listing_query_cache
        where source = 'ebay_active'
          and query_key = any($1::text[])`,
      [chunk],
    );
    for (const row of rows) {
      const key = `${row.source}:${row.provider_route}:${row.query_key}:${row.page_cursor ?? ""}`;
      if (!existingByKey.has(key)) existingByKey.set(key, new Set());
      existingByKey.get(key).add(row.id);
    }
  }

  const seen = new Set();
  const collisions = [];
  for (const row of queryRows) {
    const key = `${row.source}:${row.provider_route}:${row.query_key}:${row.page_cursor ?? ""}`;
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
  if (!directDbUrl()) {
    return { checked: false, skipped_for_dynamic_plan: true, reason: "SUPABASE_DB_URL_unavailable" };
  }
  const runId = await firstRowValue(plan.row_files.acquisitionRunRows, (row) => row.id);
  const idCollisions = await dynamicIdCollisions(plan, runId);
  const queryCacheUniqueCollisionPlannedIds = await dynamicQueryCacheCollisions(plan);
  const rawPayloadCollisionDetails = await dynamicRawPayloadCollisionDetails(plan);
  const rawPayloadCollisionPlannedIds = rawPayloadCollisionDetails.ids;
  const observationCollisionDetails = await dynamicObservationCollisionDetails(
    plan,
    rawPayloadCollisionDetails.canonicalIdsByPlannedId,
  );
  const sellerUniqueCollisionPlannedIds = await dynamicSellerCollisions(plan);
  return {
    checked: true,
    dynamic_collision_check: true,
    id_collisions: idCollisions,
    id_collision_count: Object.values(idCollisions).reduce((sum, rows) => sum + rows.length, 0),
    query_cache_unique_collision_count: queryCacheUniqueCollisionPlannedIds.length,
    query_cache_unique_collision_planned_ids: queryCacheUniqueCollisionPlannedIds,
    query_cache_unique_collision_samples: queryCacheUniqueCollisionPlannedIds.slice(0, 10),
    raw_payload_collision_count: rawPayloadCollisionPlannedIds.length,
    raw_payload_collision_planned_ids: rawPayloadCollisionPlannedIds,
    raw_payload_collision_canonical_ids_by_planned_id: rawPayloadCollisionDetails.canonicalIdsByPlannedId,
    raw_payload_collision_samples: rawPayloadCollisionPlannedIds.slice(0, 10),
    observation_raw_snapshot_collision_count: observationCollisionDetails.ids.length,
    observation_raw_snapshot_collision_planned_ids: observationCollisionDetails.ids,
    observation_raw_snapshot_collision_canonical_ids_by_planned_id: observationCollisionDetails.canonicalIdsByPlannedId,
    observation_raw_snapshot_collision_samples: observationCollisionDetails.ids.slice(0, 10),
    seller_unique_collision_count: sellerUniqueCollisionPlannedIds.length,
    seller_unique_collision_planned_ids: sellerUniqueCollisionPlannedIds,
    seller_unique_collision_samples: sellerUniqueCollisionPlannedIds.slice(0, 10),
  };
}

async function insertJsonlRows(pgClient, table, filePath, chunkSize, options = {}) {
  let inserted = 0;
  let updated = 0;
  let noOp = 0;
  let failed = 0;
  let skipped = 0;
  let chunk = [];
  const progressEvery = options.progressEvery ?? 10_000;
  async function flush() {
    if (!chunk.length) return;
    const rowCount = chunk.length;
    let result;
    try {
      result = await applyChunkRows(pgClient, table, chunk);
    } catch (error) {
      failed += rowCount;
      throw new Error(`[market-listing-daily-backfill-apply] idempotent apply failed for ${table}: ${error.message}`);
    }
    inserted += result.inserted;
    updated += result.updated;
    noOp += result.no_op;
    failed += result.failed;
    const processed = inserted + updated + noOp + failed;
    if (processed % progressEvery < rowCount) {
      console.error(`[market-listing-daily-backfill-apply] applied ${processed} into ${table} (inserted=${inserted}, updated=${updated}, no_op=${noOp})`);
    }
    chunk = [];
  }

  for await (const row of readJsonLines(filePath)) {
    if (options.skipRow?.(row)) {
      skipped += 1;
      continue;
    }
    const transformed = options.transformRow ? options.transformRow(row) : row;
    chunk.push(sanitizeRowForTable(table, transformed));
    if (chunk.length >= chunkSize) await flush();
  }
  await flush();
  return { inserted, updated, no_op: noOp, failed, skipped };
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
  const queryCacheIds = new Set(collision.query_cache_unique_collision_planned_ids ?? []);
  const rawCanonicalIdsByPlannedId = new Map(
    Object.entries(collision.raw_payload_collision_canonical_ids_by_planned_id ?? {}),
  );
  const rawSnapshotIdsToSkip = new Set(collision.raw_payload_collision_planned_ids ?? []);
  const rawUnavailableIds = new Set(
    [...rawSnapshotIdsToSkip].filter((id) => !rawCanonicalIdsByPlannedId.has(id)),
  );
  const observationCanonicalIdsByPlannedId = new Map(
    Object.entries(collision.observation_raw_snapshot_collision_canonical_ids_by_planned_id ?? {}),
  );
  const observationIdsToSkip = new Set(collision.observation_raw_snapshot_collision_planned_ids ?? []);
  const observationUnavailableIds = new Set(
    [...observationIdsToSkip].filter((id) => !observationCanonicalIdsByPlannedId.has(id)),
  );
  const sellerIds = new Set(collision.seller_unique_collision_planned_ids ?? []);
  return {
    idCollisions,
    queryCacheIds,
    rawSnapshotIdsToSkip,
    rawUnavailableIds,
    rawCanonicalIdsByPlannedId,
    observationIdsToSkip,
    observationCanonicalIdsByPlannedId,
    observationUnavailableIds,
    sellerIds,
  };
}

function transformRowForTable(table, row, state) {
  if (table === "market_listing_price_events") {
    const canonicalObservationId = state.observationCanonicalIdsByPlannedId.get(row.observation_id);
    const canonicalPreviousObservationId = state.observationCanonicalIdsByPlannedId.get(row.previous_observation_id);
    if (!canonicalObservationId && !canonicalPreviousObservationId) return row;
    return {
      ...row,
      observation_id: canonicalObservationId ?? row.observation_id,
      previous_observation_id: canonicalPreviousObservationId ?? row.previous_observation_id,
    };
  }
  if (table !== "market_listing_observations" && table !== "market_listing_seller_snapshots") return row;
  const canonicalRawId = state.rawCanonicalIdsByPlannedId.get(row.raw_snapshot_id);
  if (!canonicalRawId) return row;
  return {
    ...row,
    raw_snapshot_id: canonicalRawId,
  };
}

function skipRowForTable(table, row, state) {
  if (table === "market_listing_query_cache" && state.queryCacheIds.has(row.id)) return true;
  if (table === "market_listing_raw_snapshots") {
    if (state.rawSnapshotIdsToSkip.has(row.id)) return true;
    if (row.query_cache_id && state.queryCacheIds.has(row.query_cache_id)) {
      state.rawUnavailableIds.add(row.id);
      return true;
    }
  }
  if (table === "market_listing_observations") {
    if (state.observationIdsToSkip.has(row.id)) return true;
    if (
      state.rawUnavailableIds.has(row.raw_snapshot_id)
      || (row.query_cache_id && state.queryCacheIds.has(row.query_cache_id))
    ) {
      state.observationUnavailableIds.add(row.id);
      return true;
    }
  }
  if (table === "market_listing_price_events") {
    if (state.observationUnavailableIds.has(row.observation_id)) return true;
  }
  if (table === "market_listing_seller_snapshots") {
    if (state.sellerIds.has(row.id)) return true;
    if (state.rawCanonicalIdsByPlannedId.has(row.raw_snapshot_id)) return false;
    if (state.rawUnavailableIds.has(row.raw_snapshot_id)) {
      state.sellerIds.add(row.id);
      return true;
    }
  }
  return false;
}

async function applyRows(plan, args, collision) {
  const inserted = {};
  const updated = {};
  const noOp = {};
  const failed = {};
  const skipped = {};
  const dynamicSkipState = args.allowDynamicPlan ? buildDynamicSkipState(collision) : null;
  const pgClient = await connectApplyPgClient();
  try {
    for (const [table, rowsKey] of APPLY_ORDER) {
      const result = await insertJsonlRows(
        pgClient,
        table,
        plan.row_files[rowsKey],
        INSERT_CHUNK_SIZE[table] ?? 500,
        {
          skipRow: dynamicSkipState ? (row) => skipRowForTable(table, row, dynamicSkipState) : null,
          transformRow: dynamicSkipState ? (row) => transformRowForTable(table, row, dynamicSkipState) : null,
        },
      );
      inserted[table] = result.inserted;
      updated[table] = result.updated;
      noOp[table] = result.no_op;
      failed[table] = result.failed;
      skipped[table] = result.skipped;
    }
  } finally {
    await pgClient.end().catch(() => {});
  }
  return { inserted, updated, no_op: noOp, failed, skipped };
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
  if (directDbUrl()) return readbackCountsWithPg(plan);

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
  const connectionString = directDbUrl();
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    ssl: pgSslConfig(connectionString),
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

async function readbackCountsByPlannedIdsWithPg(plan) {
  const client = new Client({
    connectionString: directDbUrl(),
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    ssl: pgSslConfig(directDbUrl()),
  });
  await client.connect();
  try {
    const countIds = async (table, rowsKey) => {
      const ids = await collectColumnFromJsonl(plan.row_files[rowsKey], (row) => row.id);
      let total = 0;
      for (let index = 0; index < ids.length; index += 5_000) {
        const chunk = ids.slice(index, index + 5_000);
        const result = await client.query(
          `select count(*)::int as count from public.${quoteIdent(table)} where id = any($1::uuid[])`,
          [chunk],
        );
        total += Number(result.rows[0]?.count ?? 0);
      }
      return total;
    };

    const result = {};
    for (const [table, rowsKey] of APPLY_ORDER) {
      result[table] = await countIds(table, rowsKey);
    }
    return result;
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
    "## Apply Rows",
    "",
    "| Table | Inserted | Updated | No-op | Failed | Skipped |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...(Object.keys(report.apply_result?.inserted ?? {}).length
      ? Object.keys(report.apply_result.inserted).map((table) => [
          `| \`${table}\``,
          report.apply_result.inserted?.[table] ?? 0,
          report.apply_result.updated?.[table] ?? 0,
          report.apply_result.no_op?.[table] ?? 0,
          report.apply_result.failed?.[table] ?? 0,
          report.apply_result.skipped?.[table] ?? 0,
          "|",
        ].join(" | "))
      : ["| none in this invocation | 0 | 0 | 0 | 0 | 0 |"]),
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
    applyResult = await applyRows(plan.data, args, collision);
    if (args.allowDynamicPlan) {
      expectedReadback = Object.fromEntries(APPLY_ORDER.map(([table]) => [
        table,
        (applyResult.inserted?.[table] ?? 0)
          + (applyResult.updated?.[table] ?? 0)
          + (applyResult.no_op?.[table] ?? 0),
      ]));
    }
    readback = args.allowDynamicPlan
      ? await readbackCountsByPlannedIdsWithPg(plan.data)
      : await readbackCounts(supabase, plan.data);
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
      upserts: Boolean(applyResult),
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
      query_cache_unique_collision_count: collision.query_cache_unique_collision_count,
      raw_payload_collision_count: collision.raw_payload_collision_count,
      seller_unique_collision_count: collision.seller_unique_collision_count,
      query_cache_unique_collision_samples: collision.query_cache_unique_collision_samples,
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
