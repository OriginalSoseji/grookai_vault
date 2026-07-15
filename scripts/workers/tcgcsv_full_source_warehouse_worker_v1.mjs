import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import pg from "pg";

import "../../backend/env.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1", "tcgcsv_full_source_warehouse_v1");
const DEFAULT_CACHE_DIR = path.join(DEFAULT_OUT_DIR, "cache");
const BASE_URL = "https://tcgcsv.com";
const TCGPLAYER_BASE = `${BASE_URL}/tcgplayer`;
const WORKER_VERSION = "TCGCSV_FULL_SOURCE_WAREHOUSE_WORKER_V1";
const PARSER_VERSION = "TCGCSV_FULL_SOURCE_PARSER_V1";
const SCHEMA_CONTRACT_VERSION = "TCGCSV_FULL_SOURCE_WAREHOUSE_V1";
const DEFAULT_REQUEST_CEILING = 10_000;
const DEFAULT_REQUEST_DELAY_MS = 100;
const DEFAULT_PRICE_OBSERVATION_BATCH_SIZE = 500;
const FIRST_ARCHIVE_DATE = "2024-02-08";
const EMPTY_CATEGORY_IDS = new Set([9, 10, 12, 14, 21, 55, 69, 70]);
const CURL_BIN = os.platform() === "win32" ? "curl.exe" : "curl";
const { Client } = pg;

function positiveIntFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function parseArgs(argv) {
  const args = {
    mode: "current",
    apply: false,
    force: false,
    ignoreLastUpdated: false,
    resumeRunKey: null,
    date: null,
    dateFrom: null,
    dateTo: null,
    outDir: DEFAULT_OUT_DIR,
    cacheDir: DEFAULT_CACHE_DIR,
    requestCeiling: Number.parseInt(process.env.TCGCSV_FULL_SYNC_REQUEST_CEILING ?? String(DEFAULT_REQUEST_CEILING), 10),
    requestDelayMs: Number.parseInt(process.env.TCGCSV_REQUEST_DELAY_MS ?? String(DEFAULT_REQUEST_DELAY_MS), 10),
    includeEmptyCategories: false,
    limitCategories: null,
    limitGroups: null,
  };

  for (const arg of argv) {
    if (arg === "--apply" || arg === "--run") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--force" || arg === "--ignore-last-updated") {
      args.force = true;
      args.ignoreLastUpdated = true;
    } else if (arg.startsWith("--mode=")) args.mode = arg.slice("--mode=".length);
    else if (arg.startsWith("--resume-run-key=")) args.resumeRunKey = arg.slice("--resume-run-key=".length);
    else if (arg.startsWith("--date=")) args.date = arg.slice("--date=".length);
    else if (arg.startsWith("--date-from=")) args.dateFrom = arg.slice("--date-from=".length);
    else if (arg.startsWith("--date-to=")) args.dateTo = arg.slice("--date-to=".length);
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice("--out-dir=".length));
    else if (arg.startsWith("--cache-dir=")) args.cacheDir = path.resolve(arg.slice("--cache-dir=".length));
    else if (arg.startsWith("--request-ceiling=")) args.requestCeiling = Number.parseInt(arg.slice("--request-ceiling=".length), 10);
    else if (arg.startsWith("--request-delay-ms=")) args.requestDelayMs = Number.parseInt(arg.slice("--request-delay-ms=".length), 10);
    else if (arg === "--include-empty-categories") args.includeEmptyCategories = true;
    else if (arg.startsWith("--limit-categories=")) args.limitCategories = Number.parseInt(arg.slice("--limit-categories=".length), 10);
    else if (arg.startsWith("--limit-groups=")) args.limitGroups = Number.parseInt(arg.slice("--limit-groups=".length), 10);
  }

  if (!["current", "historical"].includes(args.mode)) throw new Error("--mode must be current or historical");
  if (!Number.isInteger(args.requestCeiling) || args.requestCeiling < 1) throw new Error("--request-ceiling must be positive");
  if (!Number.isInteger(args.requestDelayMs) || args.requestDelayMs < 0) throw new Error("--request-delay-ms must be non-negative");
  if (args.limitCategories !== null && (!Number.isInteger(args.limitCategories) || args.limitCategories < 1)) {
    throw new Error("--limit-categories must be positive");
  }
  if (args.limitGroups !== null && (!Number.isInteger(args.limitGroups) || args.limitGroups < 1)) {
    throw new Error("--limit-groups must be positive");
  }
  if (args.mode === "historical") {
    if (args.date) {
      args.dateFrom = args.date;
      args.dateTo = args.date;
    }
    if (!args.dateFrom || !args.dateTo) throw new Error("--mode=historical requires --date or --date-from/--date-to");
    if (args.dateFrom < FIRST_ARCHIVE_DATE) throw new Error(`TCGCSV archive starts at ${FIRST_ARCHIVE_DATE}`);
  }
  return args;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(stable(value)));
  return createHash("sha256").update(text).digest("hex");
}

function normalizeSubtype(value) {
  return String(value ?? "unknown").trim().toLowerCase().replace(/\s+/g, " ");
}

function sourcePriceIdentity(price) {
  return `tcgplayer:${price.productId}:${normalizeSubtype(price.subTypeName)}`;
}

function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function timestampStamp(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

function directDbUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function pgSslConfig(connectionString) {
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

async function gitCommitSha() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, timeout: 10_000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

function dateRange(from, to) {
  const result = [];
  let cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    result.push(isoDate(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return result;
}

async function sleep(ms) {
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

class Fetcher {
  constructor({ requestCeiling, requestDelayMs, artifactRoot }) {
    this.requestCeiling = requestCeiling;
    this.requestDelayMs = requestDelayMs;
    this.artifactRoot = artifactRoot;
    this.requestCount = 0;
    this.artifacts = [];
  }

  async fetchBuffer(url, artifactKind, relativePath, meta = {}) {
    if (this.requestCount + 1 > this.requestCeiling) {
      const err = new Error(`request ceiling exceeded before ${url}`);
      err.code = "REQUEST_CEILING";
      throw err;
    }
    this.requestCount += 1;
    await sleep(this.requestDelayMs);
    const fullPath = path.join(this.artifactRoot, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const headerPath = `${fullPath}.headers`;
    const args = [
      "--ssl-no-revoke",
      "--silent",
      "--show-error",
      "--location",
      "--max-time",
      "180",
      "--user-agent",
      "GrookaiVaultTCGCSVWarehouse/1.0",
      "--dump-header",
      headerPath,
      "--output",
      fullPath,
      url,
    ];
    await execFileAsync(CURL_BIN, args, { timeout: 240_000, maxBuffer: 2 * 1024 * 1024 });
    const buffer = await fs.readFile(fullPath);
    const headersText = await fs.readFile(headerPath, "utf8").catch(() => "");
    const httpStatus = Number(headersText.match(/HTTP\/\S+\s+(\d+)/g)?.at(-1)?.match(/(\d+)$/)?.[1] ?? 200);
    const artifact = {
      artifact_kind: artifactKind,
      request_url: url,
      local_path: path.relative(REPO_ROOT, fullPath).replace(/\\/g, "/"),
      sha256: sha256(buffer),
      byte_size: buffer.byteLength,
      fetched_at: new Date().toISOString(),
      http_status: httpStatus,
      response_headers: { raw: headersText.slice(0, 8000) },
      ...meta,
    };
    this.artifacts.push(artifact);
    return { buffer, artifact };
  }

  async fetchJson(url, artifactKind, relativePath, meta = {}) {
    const { buffer, artifact } = await this.fetchBuffer(url, artifactKind, relativePath, meta);
    return { json: JSON.parse(buffer.toString("utf8")), artifact };
  }

  async fetchText(url, artifactKind, relativePath, meta = {}) {
    const { buffer, artifact } = await this.fetchBuffer(url, artifactKind, relativePath, meta);
    return { text: buffer.toString("utf8").trim(), artifact };
  }
}

function categoryRow(category, runId) {
  return {
    category_id: category.categoryId,
    name: category.name ?? null,
    display_name: category.displayName ?? null,
    seo_category_name: category.seoCategoryName ?? null,
    category_description: category.categoryDescription ?? null,
    category_page_title: category.categoryPageTitle ?? null,
    sealed_label: category.sealedLabel ?? null,
    non_sealed_label: category.nonSealedLabel ?? null,
    condition_guide_url: category.conditionGuideUrl ?? null,
    is_scannable: category.isScannable ?? null,
    popularity: category.popularity ?? null,
    is_direct: category.isDirect ?? null,
    source_modified_on: category.modifiedOn ?? null,
    raw_payload: category,
    payload_hash: sha256(category),
    last_seen_run_id: runId,
  };
}

function groupRow(group, runId) {
  return {
    group_id: group.groupId,
    category_id: group.categoryId,
    name: group.name ?? null,
    abbreviation: group.abbreviation ?? null,
    is_supplemental: group.isSupplemental ?? null,
    published_on: group.publishedOn ?? null,
    source_modified_on: group.modifiedOn ?? null,
    raw_payload: group,
    payload_hash: sha256(group),
    last_seen_run_id: runId,
  };
}

function productRow(product, runId) {
  return {
    product_id: product.productId,
    category_id: product.categoryId ?? null,
    group_id: product.groupId ?? null,
    name: product.name ?? null,
    clean_name: product.cleanName ?? null,
    image_url: product.imageUrl ?? null,
    source_url: product.url ?? null,
    source_modified_on: product.modifiedOn ?? null,
    image_count: product.imageCount ?? null,
    presale_info: product.presaleInfo ?? null,
    extended_data: product.extendedData ?? null,
    raw_payload: product,
    payload_hash: sha256(product),
    last_seen_run_id: runId,
    catalog_metadata_status: "current",
  };
}

function priceObservationRow(price, { observedOn, runId, artifactId = null, artifactPath = null, categoryId = null, groupId = null }) {
  const subtypeName = String(price.subTypeName ?? "Unknown");
  return {
    source_price_row_identity: sourcePriceIdentity(price),
    product_id: price.productId,
    category_id: categoryId ?? price.categoryId ?? null,
    group_id: groupId ?? price.groupId ?? null,
    subtype_name: subtypeName,
    subtype_name_normalized: normalizeSubtype(subtypeName),
    observed_on: observedOn,
    low_price: price.lowPrice ?? null,
    mid_price: price.midPrice ?? null,
    high_price: price.highPrice ?? null,
    market_price: price.marketPrice ?? null,
    direct_low_price: price.directLowPrice ?? null,
    currency: "USD",
    raw_payload: price,
    payload_hash: sha256(price),
    source_archive_path: artifactPath,
    source_artifact_id: artifactId,
    first_seen_run_id: runId,
    last_seen_run_id: runId,
  };
}

async function connectDb() {
  const connectionString = directDbUrl();
  if (!connectionString) throw new Error("SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required for --apply");
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
  });
  await client.connect();
  return client;
}

async function upsertRun(client, run) {
  const result = await client.query(
    `insert into public.tcgcsv_source_sync_runs (
       run_key, sync_mode, status, source_marker, observed_on, date_from, date_to,
       request_count, category_count, group_count, product_count, price_row_count,
       inserted_count, updated_count, no_op_count, failed_count, artifact_root,
       artifact_hash, worker_version, parser_version, schema_contract_version,
       git_commit_sha, started_at, finished_at, error, payload
     ) values (
       $1,$2,$3,$4,$5::date,$6::date,$7::date,
       $8,$9,$10,$11,$12,
       $13,$14,$15,$16,$17,
       $18,$19,$20,$21,
       $22,$23::timestamptz,$24::timestamptz,$25,$26::jsonb
     )
     on conflict (run_key) do update set
       status = excluded.status,
       source_marker = excluded.source_marker,
       request_count = excluded.request_count,
       category_count = excluded.category_count,
       group_count = excluded.group_count,
       product_count = excluded.product_count,
       price_row_count = excluded.price_row_count,
       inserted_count = excluded.inserted_count,
       updated_count = excluded.updated_count,
       no_op_count = excluded.no_op_count,
       failed_count = excluded.failed_count,
       artifact_root = excluded.artifact_root,
       artifact_hash = excluded.artifact_hash,
       finished_at = excluded.finished_at,
       error = excluded.error,
       payload = excluded.payload
     returning id`,
    [
      run.run_key,
      run.sync_mode,
      run.status,
      run.source_marker ?? null,
      run.observed_on ?? null,
      run.date_from ?? null,
      run.date_to ?? null,
      run.request_count ?? 0,
      run.category_count ?? 0,
      run.group_count ?? 0,
      run.product_count ?? 0,
      run.price_row_count ?? 0,
      run.inserted_count ?? 0,
      run.updated_count ?? 0,
      run.no_op_count ?? 0,
      run.failed_count ?? 0,
      run.artifact_root ?? null,
      run.artifact_hash ?? null,
      WORKER_VERSION,
      PARSER_VERSION,
      SCHEMA_CONTRACT_VERSION,
      run.git_commit_sha ?? null,
      run.started_at ?? null,
      run.finished_at ?? null,
      run.error ?? null,
      JSON.stringify(run.payload ?? {}),
    ],
  );
  return result.rows[0].id;
}

async function insertArtifacts(client, runId, runKey, artifacts) {
  let inserted = 0;
  for (const artifact of artifacts) {
    await client.query(
      `insert into public.tcgcsv_source_artifacts (
         sync_run_id, run_key, artifact_kind, request_url, local_path, sha256,
         byte_size, fetched_at, http_status, response_headers, observed_on,
         category_id, group_id, payload
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9,$10::jsonb,$11::date,$12,$13,$14::jsonb
       )
       on conflict (run_key, artifact_kind, local_path, sha256) do nothing`,
      [
        runId,
        runKey,
        artifact.artifact_kind,
        artifact.request_url ?? null,
        artifact.local_path,
        artifact.sha256,
        artifact.byte_size,
        artifact.fetched_at ?? null,
        artifact.http_status ?? null,
        JSON.stringify(artifact.response_headers ?? {}),
        artifact.observed_on ?? null,
        artifact.category_id ?? null,
        artifact.group_id ?? null,
        JSON.stringify(artifact.payload ?? {}),
      ],
    );
    inserted += 1;
  }
  return inserted;
}

async function upsertRows(client, table, rows, pkColumns, setSql, mapParams, extraConflict = "") {
  let inserted = 0;
  let updated = 0;
  let noOp = 0;
  for (const row of rows) {
    const { sql, params } = mapParams(row);
    const result = await client.query(`${sql} returning (xmax = 0) as inserted`, params);
    if (result.rowCount === 0) {
      noOp += 1;
    } else if (result.rows[0].inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }
  return { inserted, updated, noOp, table, pkColumns, setSql, extraConflict };
}

async function upsertCategories(client, rows) {
  return upsertRows(client, "tcgcsv_source_categories", rows, ["category_id"], "", (row) => ({
    sql: `insert into public.tcgcsv_source_categories (
      category_id, name, display_name, seo_category_name, category_description,
      category_page_title, sealed_label, non_sealed_label, condition_guide_url,
      is_scannable, popularity, is_direct, source_modified_on, raw_payload,
      payload_hash, last_seen_run_id, source_active, source_missing_since,
      catalog_metadata_status, last_seen_at, updated_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,true,null,'current',now(),now()
    )
    on conflict (category_id) do update set
      name = excluded.name,
      display_name = excluded.display_name,
      seo_category_name = excluded.seo_category_name,
      category_description = excluded.category_description,
      category_page_title = excluded.category_page_title,
      sealed_label = excluded.sealed_label,
      non_sealed_label = excluded.non_sealed_label,
      condition_guide_url = excluded.condition_guide_url,
      is_scannable = excluded.is_scannable,
      popularity = excluded.popularity,
      is_direct = excluded.is_direct,
      source_modified_on = excluded.source_modified_on,
      raw_payload = excluded.raw_payload,
      payload_hash = excluded.payload_hash,
      last_seen_run_id = excluded.last_seen_run_id,
      source_active = true,
      source_missing_since = null,
      catalog_metadata_status = 'current',
      last_seen_at = now(),
      updated_at = now()`,
    params: [
      row.category_id, row.name, row.display_name, row.seo_category_name, row.category_description,
      row.category_page_title, row.sealed_label, row.non_sealed_label, row.condition_guide_url,
      row.is_scannable, row.popularity, row.is_direct, row.source_modified_on,
      JSON.stringify(row.raw_payload), row.payload_hash, row.last_seen_run_id,
    ],
  }));
}

async function upsertGroups(client, rows) {
  return upsertRows(client, "tcgcsv_source_groups", rows, ["group_id"], "", (row) => ({
    sql: `insert into public.tcgcsv_source_groups (
      group_id, category_id, name, abbreviation, is_supplemental, published_on,
      source_modified_on, raw_payload, payload_hash, last_seen_run_id,
      source_active, source_missing_since, catalog_metadata_status, last_seen_at, updated_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,true,null,'current',now(),now()
    )
    on conflict (group_id) do update set
      category_id = excluded.category_id,
      name = excluded.name,
      abbreviation = excluded.abbreviation,
      is_supplemental = excluded.is_supplemental,
      published_on = excluded.published_on,
      source_modified_on = excluded.source_modified_on,
      raw_payload = excluded.raw_payload,
      payload_hash = excluded.payload_hash,
      last_seen_run_id = excluded.last_seen_run_id,
      source_active = true,
      source_missing_since = null,
      catalog_metadata_status = 'current',
      last_seen_at = now(),
      updated_at = now()`,
    params: [
      row.group_id, row.category_id, row.name, row.abbreviation, row.is_supplemental,
      row.published_on, row.source_modified_on, JSON.stringify(row.raw_payload),
      row.payload_hash, row.last_seen_run_id,
    ],
  }));
}

async function upsertProducts(client, rows) {
  return upsertRows(client, "tcgcsv_source_products", rows, ["product_id"], "", (row) => ({
    sql: `insert into public.tcgcsv_source_products (
      product_id, category_id, group_id, name, clean_name, image_url, source_url,
      source_modified_on, image_count, presale_info, extended_data, raw_payload,
      payload_hash, last_seen_run_id, source_active, source_missing_since,
      catalog_metadata_status, last_seen_at, updated_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,true,null,$15,now(),now()
    )
    on conflict (product_id) do update set
      category_id = excluded.category_id,
      group_id = excluded.group_id,
      name = excluded.name,
      clean_name = excluded.clean_name,
      image_url = excluded.image_url,
      source_url = excluded.source_url,
      source_modified_on = excluded.source_modified_on,
      image_count = excluded.image_count,
      presale_info = excluded.presale_info,
      extended_data = excluded.extended_data,
      raw_payload = excluded.raw_payload,
      payload_hash = excluded.payload_hash,
      last_seen_run_id = excluded.last_seen_run_id,
      source_active = true,
      source_missing_since = null,
      catalog_metadata_status = excluded.catalog_metadata_status,
      last_seen_at = now(),
      updated_at = now()`,
    params: [
      row.product_id, row.category_id, row.group_id, row.name, row.clean_name,
      row.image_url, row.source_url, row.source_modified_on, row.image_count,
      JSON.stringify(row.presale_info ?? null), JSON.stringify(row.extended_data ?? null),
      JSON.stringify(row.raw_payload), row.payload_hash, row.last_seen_run_id,
      row.catalog_metadata_status,
    ],
  }));
}

async function upsertPriceObservations(client, rows) {
  const chunkSize = positiveIntFromEnv("TCGCSV_PRICE_OBSERVATION_BATCH_SIZE", DEFAULT_PRICE_OBSERVATION_BATCH_SIZE);
  let inserted = 0;
  let updated = 0;
  let noOp = 0;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const result = await client.query(
      `with input_rows as (
         select *
         from jsonb_to_recordset($1::jsonb) as x(
           source_price_row_identity text,
           product_id integer,
           category_id integer,
           group_id integer,
           subtype_name text,
           subtype_name_normalized text,
           observed_on date,
           low_price numeric,
           mid_price numeric,
           high_price numeric,
           market_price numeric,
           direct_low_price numeric,
           currency text,
           raw_payload jsonb,
           payload_hash text,
           source_archive_path text,
           source_artifact_id uuid,
           first_seen_run_id uuid,
           last_seen_run_id uuid
         )
       ), upserted as (
         insert into public.tcgcsv_source_price_daily_observations (
           source_price_row_identity, product_id, category_id, group_id, subtype_name,
           subtype_name_normalized, observed_on, low_price, mid_price, high_price,
           market_price, direct_low_price, currency, raw_payload, payload_hash,
           source_archive_path, source_artifact_id, first_seen_run_id, last_seen_run_id,
           first_observed_at, last_observed_at, updated_at
         )
         select
           source_price_row_identity, product_id, category_id, group_id, subtype_name,
           subtype_name_normalized, observed_on, low_price, mid_price, high_price,
           market_price, direct_low_price, coalesce(currency, 'USD'), raw_payload, payload_hash,
           source_archive_path, source_artifact_id, first_seen_run_id, last_seen_run_id,
           now(), now(), now()
         from input_rows
         on conflict (source_price_row_identity, observed_on) do update set
           product_id = excluded.product_id,
           category_id = coalesce(excluded.category_id, public.tcgcsv_source_price_daily_observations.category_id),
           group_id = coalesce(excluded.group_id, public.tcgcsv_source_price_daily_observations.group_id),
           subtype_name = excluded.subtype_name,
           subtype_name_normalized = excluded.subtype_name_normalized,
           low_price = excluded.low_price,
           mid_price = excluded.mid_price,
           high_price = excluded.high_price,
           market_price = excluded.market_price,
           direct_low_price = excluded.direct_low_price,
           raw_payload = excluded.raw_payload,
           payload_hash = excluded.payload_hash,
           source_archive_path = excluded.source_archive_path,
           source_artifact_id = coalesce(excluded.source_artifact_id, public.tcgcsv_source_price_daily_observations.source_artifact_id),
           last_seen_run_id = excluded.last_seen_run_id,
           last_observed_at = now(),
           updated_at = now()
         returning (xmax = 0) as inserted
       )
       select
         count(*) filter (where inserted)::int as inserted,
         count(*) filter (where not inserted)::int as updated
       from upserted`,
      [JSON.stringify(chunk)],
    );
    inserted += Number(result.rows[0]?.inserted ?? 0);
    updated += Number(result.rows[0]?.updated ?? 0);
    const processed = Math.min(offset + chunk.length, rows.length);
    if (processed === rows.length || processed % (chunkSize * 20) === 0) {
      console.error(`[tcgcsv-full] price_observations processed=${processed}/${rows.length} inserted=${inserted} updated=${updated}`);
    }
  }
  return {
    inserted,
    updated,
    noOp,
    table: "tcgcsv_source_price_daily_observations",
    pkColumns: ["source_price_row_identity", "observed_on"],
    setSql: "batched jsonb_to_recordset upsert",
    extraConflict: "",
  };
}

async function markMissingCurrentRows(client, runId) {
  const result = await client.query(
    `with updated_categories as (
       update public.tcgcsv_source_categories
       set source_active = false,
           source_missing_since = coalesce(source_missing_since, now()),
           catalog_metadata_status = 'missing_from_latest_source',
           updated_at = now()
       where source_active = true and (last_seen_run_id is distinct from $1)
       returning 1
     ), updated_groups as (
       update public.tcgcsv_source_groups
       set source_active = false,
           source_missing_since = coalesce(source_missing_since, now()),
           catalog_metadata_status = 'missing_from_latest_source',
           updated_at = now()
       where source_active = true and (last_seen_run_id is distinct from $1)
       returning 1
     ), updated_products as (
       update public.tcgcsv_source_products
       set source_active = false,
           source_missing_since = coalesce(source_missing_since, now()),
           catalog_metadata_status = 'missing_from_latest_source',
           updated_at = now()
       where source_active = true and (last_seen_run_id is distinct from $1)
       returning 1
     )
     select
       (select count(*) from updated_categories)::int as categories_marked_missing,
       (select count(*) from updated_groups)::int as groups_marked_missing,
       (select count(*) from updated_products)::int as products_marked_missing`,
    [runId],
  );
  return result.rows[0];
}

async function ensureHistoricalProducts(client, prices, runId) {
  const productIds = Array.from(new Set(prices.map((row) => Number(row.productId)).filter(Number.isInteger)));
  let inserted = 0;
  for (const productId of productIds) {
    const result = await client.query(
      `insert into public.tcgcsv_source_products (
         product_id, raw_payload, payload_hash, last_seen_run_id, source_active,
         catalog_metadata_status, first_seen_at, last_seen_at, updated_at
       ) values (
         $1, $2::jsonb, $3, $4, false, 'historical_price_only', now(), now(), now()
       )
       on conflict (product_id) do nothing
       returning 1`,
      [
        productId,
        JSON.stringify({ productId, catalog_metadata_status: "historical_price_only" }),
        sha256({ productId, catalog_metadata_status: "historical_price_only" }),
        runId,
      ],
    );
    inserted += result.rowCount;
  }
  return inserted;
}

async function latestCompletedCurrentMarker(client) {
  const result = await client.query(
    `select source_marker
     from public.tcgcsv_source_sync_runs
     where sync_mode = 'current_full_sync'
       and status = 'completed'
       and source_marker is not null
     order by created_at desc, id desc
     limit 1`,
  );
  return result.rows[0]?.source_marker ?? null;
}

async function discover7z() {
  const candidates = os.platform() === "win32" ? ["7z.exe", "7za.exe", "7zz.exe"] : ["7z", "7za", "7zz"];
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["i"], { timeout: 5000, maxBuffer: 1024 * 1024 });
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  throw new Error("7zip executable not found; install 7z/7za/7zz before historical archive backfill");
}

async function extractArchive(archivePath, extractDir) {
  await fs.mkdir(extractDir, { recursive: true });
  const sevenZip = await discover7z();
  await execFileAsync(sevenZip, ["x", "-y", `-o${extractDir}`, archivePath], { timeout: 10 * 60_000, maxBuffer: 20 * 1024 * 1024 });
}

async function findPriceFiles(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name === "prices") files.push(full);
    }
  }
  await walk(root);
  return files;
}

function parseCategoryGroupFromPricePath(filePath, observedOn) {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const dateIndex = parts.lastIndexOf(observedOn);
  if (dateIndex < 0) return { categoryId: null, groupId: null };
  return {
    categoryId: Number.parseInt(parts[dateIndex + 1], 10),
    groupId: Number.parseInt(parts[dateIndex + 2], 10),
  };
}

async function runCurrentSync(args, runKey, artifactRoot) {
  const fetcher = new Fetcher({ requestCeiling: args.requestCeiling, requestDelayMs: args.requestDelayMs, artifactRoot });
  const observedOn = isoDate();
  const { text: sourceMarker } = await fetcher.fetchText(`${BASE_URL}/last-updated.txt`, "last_updated", "last-updated.txt");

  let client = null;
  let existingMarker = null;
  if (args.apply) {
    client = await connectDb();
    existingMarker = await latestCompletedCurrentMarker(client);
    if (!args.force && !args.ignoreLastUpdated && existingMarker && existingMarker === sourceMarker) {
      const run = {
        run_key: runKey,
        sync_mode: "current_full_sync",
        status: "skipped_no_change",
        source_marker: sourceMarker,
        observed_on: observedOn,
        request_count: fetcher.requestCount,
        artifact_root: path.relative(REPO_ROOT, artifactRoot).replace(/\\/g, "/"),
        git_commit_sha: await gitCommitSha(),
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        payload: { existing_marker: existingMarker },
      };
      const runId = await upsertRun(client, run);
      await insertArtifacts(client, runId, runKey, fetcher.artifacts);
      await client.end();
      return { run, summary: { skipped: true }, artifacts: fetcher.artifacts };
    }
  }

  const { json: categoriesPayload } = await fetcher.fetchJson(`${TCGPLAYER_BASE}/categories`, "categories", "categories.json");
  let categories = categoriesPayload.results ?? [];
  if (!args.includeEmptyCategories) categories = categories.filter((category) => !EMPTY_CATEGORY_IDS.has(Number(category.categoryId)));
  if (args.limitCategories) categories = categories.slice(0, args.limitCategories);

  const allGroups = [];
  const allProducts = [];
  const allPrices = [];
  const failedFetches = [];

  for (const category of categories) {
    const categoryId = Number(category.categoryId);
    try {
      const { json: groupsPayload } = await fetcher.fetchJson(
        `${TCGPLAYER_BASE}/${categoryId}/groups`,
        "groups",
        `current/${categoryId}/groups.json`,
        { category_id: categoryId },
      );
      let groups = groupsPayload.results ?? [];
      if (args.limitGroups) groups = groups.slice(0, args.limitGroups);
      allGroups.push(...groups);
      for (const group of groups) {
        const groupId = Number(group.groupId);
        try {
          const { json: productsPayload } = await fetcher.fetchJson(
            `${TCGPLAYER_BASE}/${categoryId}/${groupId}/products`,
            "products",
            `current/${categoryId}/${groupId}/products.json`,
            { category_id: categoryId, group_id: groupId },
          );
          const products = productsPayload.results ?? [];
          allProducts.push(...products);
          const { json: pricesPayload } = await fetcher.fetchJson(
            `${TCGPLAYER_BASE}/${categoryId}/${groupId}/prices`,
            "prices",
            `current/${categoryId}/${groupId}/prices.json`,
            { category_id: categoryId, group_id: groupId },
          );
          const prices = (pricesPayload.results ?? []).map((price) => ({ ...price, categoryId, groupId }));
          allPrices.push(...prices);
        } catch (error) {
          failedFetches.push({ category_id: categoryId, group_id: groupId, error: error.message });
        }
      }
    } catch (error) {
      failedFetches.push({ category_id: categoryId, group_id: null, error: error.message });
    }
  }

  const run = {
    run_key: runKey,
    sync_mode: "current_full_sync",
    status: failedFetches.length > 0 ? "partial_success" : "completed",
    source_marker: sourceMarker,
    observed_on: observedOn,
    request_count: fetcher.requestCount,
    category_count: categories.length,
    group_count: allGroups.length,
    product_count: allProducts.length,
    price_row_count: allPrices.length,
    failed_count: failedFetches.length,
    artifact_root: path.relative(REPO_ROOT, artifactRoot).replace(/\\/g, "/"),
    artifact_hash: sha256(fetcher.artifacts.map((artifact) => ({ path: artifact.local_path, sha256: artifact.sha256 }))),
    git_commit_sha: await gitCommitSha(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    payload: { failed_fetches: failedFetches, skipped_empty_categories: args.includeEmptyCategories ? [] : Array.from(EMPTY_CATEGORY_IDS) },
  };

  if (args.apply) {
    try {
      const runId = await upsertRun(client, { ...run, status: "running", finished_at: null });
      const artifactCount = await insertArtifacts(client, runId, runKey, fetcher.artifacts);
      const categoriesResult = await upsertCategories(client, categories.map((row) => categoryRow(row, runId)));
      const groupsResult = await upsertGroups(client, allGroups.map((row) => groupRow(row, runId)));
      const productsResult = await upsertProducts(client, allProducts.map((row) => productRow(row, runId)));
      const priceResult = await upsertPriceObservations(client, allPrices.map((row) => priceObservationRow(row, {
        observedOn,
        runId,
        artifactPath: path.relative(REPO_ROOT, artifactRoot).replace(/\\/g, "/"),
        categoryId: row.categoryId,
        groupId: row.groupId,
      })));
      const missing = failedFetches.length === 0 ? await markMissingCurrentRows(client, runId) : null;
      const inserted = categoriesResult.inserted + groupsResult.inserted + productsResult.inserted + priceResult.inserted + artifactCount;
      const updated = categoriesResult.updated + groupsResult.updated + productsResult.updated + priceResult.updated + Number(missing?.categories_marked_missing ?? 0) + Number(missing?.groups_marked_missing ?? 0) + Number(missing?.products_marked_missing ?? 0);
      const noOp = categoriesResult.noOp + groupsResult.noOp + productsResult.noOp + priceResult.noOp;
      run.inserted_count = inserted;
      run.updated_count = updated;
      run.no_op_count = noOp;
      run.payload = { ...run.payload, missing_marked: missing, apply_results: { categoriesResult, groupsResult, productsResult, priceResult, artifactCount } };
      await upsertRun(client, run);
    } finally {
      await client.end().catch(() => {});
    }
  }

  return { run, summary: { categories: categories.length, groups: allGroups.length, products: allProducts.length, prices: allPrices.length, failedFetches }, artifacts: fetcher.artifacts };
}

async function runHistoricalSync(args, runKey, artifactRoot) {
  const fetcher = new Fetcher({ requestCeiling: args.requestCeiling, requestDelayMs: args.requestDelayMs, artifactRoot });
  const dates = dateRange(args.dateFrom, args.dateTo);
  const allPrices = [];
  const failedDates = [];
  const extractedRoots = [];

  for (const observedOn of dates) {
    try {
      const archiveName = `prices-${observedOn}.ppmd.7z`;
      const { artifact } = await fetcher.fetchBuffer(
        `${BASE_URL}/archive/tcgplayer/${archiveName}`,
        "historical_archive",
        `archive/${archiveName}`,
        { observed_on: observedOn },
      );
      const archivePath = path.join(REPO_ROOT, artifact.local_path);
      const extractDir = path.join(artifactRoot, "extracted", observedOn);
      await extractArchive(archivePath, extractDir);
      extractedRoots.push(extractDir);
      const priceFiles = await findPriceFiles(extractDir);
      for (const file of priceFiles) {
        const text = await fs.readFile(file, "utf8");
        const payload = JSON.parse(text);
        const { categoryId, groupId } = parseCategoryGroupFromPricePath(file, observedOn);
        const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
        const fileArtifact = {
          artifact_kind: "historical_extracted_prices",
          request_url: null,
          local_path: rel,
          sha256: sha256(text),
          byte_size: Buffer.byteLength(text),
          fetched_at: new Date().toISOString(),
          http_status: null,
          response_headers: {},
          observed_on: observedOn,
          category_id: Number.isInteger(categoryId) ? categoryId : null,
          group_id: Number.isInteger(groupId) ? groupId : null,
          payload: { archive_path: artifact.local_path },
        };
        fetcher.artifacts.push(fileArtifact);
        for (const price of payload.results ?? []) {
          allPrices.push({ ...price, categoryId, groupId, observedOn, archivePath: rel });
        }
      }
    } catch (error) {
      failedDates.push({ observed_on: observedOn, error: error.message });
    }
  }

  const run = {
    run_key: runKey,
    sync_mode: "historical_archive_backfill",
    status: failedDates.length > 0 ? "partial_success" : "completed",
    date_from: args.dateFrom,
    date_to: args.dateTo,
    request_count: fetcher.requestCount,
    price_row_count: allPrices.length,
    failed_count: failedDates.length,
    artifact_root: path.relative(REPO_ROOT, artifactRoot).replace(/\\/g, "/"),
    artifact_hash: sha256(fetcher.artifacts.map((artifact) => ({ path: artifact.local_path, sha256: artifact.sha256 }))),
    git_commit_sha: await gitCommitSha(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    payload: { failed_dates: failedDates, extracted_roots: extractedRoots.map((root) => path.relative(REPO_ROOT, root).replace(/\\/g, "/")) },
  };

  if (args.apply) {
    const client = await connectDb();
    try {
      const runId = await upsertRun(client, { ...run, status: "running", finished_at: null });
      const artifactCount = await insertArtifacts(client, runId, runKey, fetcher.artifacts);
      const placeholderProducts = await ensureHistoricalProducts(client, allPrices, runId);
      const priceRows = allPrices.map((row) => priceObservationRow(row, {
        observedOn: row.observedOn,
        runId,
        artifactPath: row.archivePath,
        categoryId: row.categoryId,
        groupId: row.groupId,
      }));
      const priceResult = await upsertPriceObservations(client, priceRows);
      run.inserted_count = artifactCount + placeholderProducts + priceResult.inserted;
      run.updated_count = priceResult.updated;
      run.no_op_count = priceResult.noOp;
      run.payload = { ...run.payload, apply_results: { artifactCount, placeholderProducts, priceResult } };
      await upsertRun(client, run);
    } finally {
      await client.end().catch(() => {});
    }
  }

  return { run, summary: { dates: dates.length, prices: allPrices.length, failedDates }, artifacts: fetcher.artifacts };
}

async function writeSummary(outDir, runKey, result) {
  await fs.mkdir(outDir, { recursive: true });
  const fullPath = path.join(outDir, `${runKey}_summary.json`);
  await fs.writeFile(fullPath, `${JSON.stringify(result, null, 2)}\n`);
  return fullPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runKey = args.resumeRunKey ?? `TCGCSV-FULL-${args.mode.toUpperCase()}-${timestampStamp()}`;
  const artifactRoot = path.join(args.outDir, runKey);
  await fs.mkdir(artifactRoot, { recursive: true });

  let result;
  try {
    result = args.mode === "current"
      ? await runCurrentSync(args, runKey, artifactRoot)
      : await runHistoricalSync(args, runKey, artifactRoot);
  } catch (error) {
    if (error?.code === "REQUEST_CEILING") {
      result = {
        run: {
          run_key: runKey,
          sync_mode: args.mode === "current" ? "current_full_sync" : "historical_archive_backfill",
          status: "aborted_request_ceiling",
          request_count: args.requestCeiling,
          error: error.message,
          artifact_root: path.relative(REPO_ROOT, artifactRoot).replace(/\\/g, "/"),
          worker_version: WORKER_VERSION,
          parser_version: PARSER_VERSION,
          schema_contract_version: SCHEMA_CONTRACT_VERSION,
          git_commit_sha: await gitCommitSha(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        summary: { error: error.message },
        artifacts: [],
      };
      if (args.apply) {
        const client = await connectDb();
        try {
          await upsertRun(client, result.run);
        } finally {
          await client.end().catch(() => {});
        }
      }
    } else {
      throw error;
    }
  }

  const summaryPath = await writeSummary(artifactRoot, runKey, {
    boundary: {
      db_writes: args.apply,
      public_pricing_writes: false,
      identity_writes: false,
      vault_writes: false,
      app_visible_pricing: false,
    },
    run: result.run,
    summary: result.summary,
    artifact_count: result.artifacts.length,
  });

  console.log(`[tcgcsv-full] mode=${args.mode} apply=${args.apply}`);
  console.log(`[tcgcsv-full] status=${result.run.status}`);
  console.log(`[tcgcsv-full] requests=${result.run.request_count ?? 0}`);
  console.log(`[tcgcsv-full] categories=${result.run.category_count ?? 0}`);
  console.log(`[tcgcsv-full] groups=${result.run.group_count ?? 0}`);
  console.log(`[tcgcsv-full] products=${result.run.product_count ?? 0}`);
  console.log(`[tcgcsv-full] price_rows=${result.run.price_row_count ?? 0}`);
  console.log(`[tcgcsv-full] summary=${path.relative(REPO_ROOT, summaryPath).replace(/\\/g, "/")}`);
}

await main();
