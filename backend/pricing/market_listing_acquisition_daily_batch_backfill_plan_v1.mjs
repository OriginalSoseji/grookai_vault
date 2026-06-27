import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import readline from "node:readline";
import path from "node:path";

export const MARKET_LISTING_ACQUISITION_DAILY_BATCH_BACKFILL_PLAN_VERSION = "MEE_11M_MARKET_LISTING_ACQUISITION_DAILY_BATCH_BACKFILL_PLAN_V1";
export const EXPECTED_MEE_11L_PACKAGE_FINGERPRINT = "58975dc5090431a83ca4b513fa3d8be97fc182c541580d796a63260a4808514a";
export const EXPECTED_MEE_11L_REQUEST_RESULTS_MANIFEST_HASH = "69f37f83fad3afffd897c7b3fee45fd53d070ad16ac1c07408b83eaca47bad0c";
export const EXPECTED_MEE_11L_RAW_SNAPSHOT_MANIFEST_HASH = "27cf71b55eebc84ce5444871435bee61dfafdd7fd17fe1a6182a9628bfec131a";
export const EXPECTED_MEE_11L_OBSERVATION_MANIFEST_HASH = "85abe190326dadf92ccbccd041ef4e76043a984868c468f337660b6630247a2a";
export const EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

const ROW_FILE_NAMES = Object.freeze({
  acquisitionRunRows: "market_listing_acquisition_runs.jsonl",
  queryCacheRows: "market_listing_query_cache.jsonl",
  rawSnapshotRows: "market_listing_raw_snapshots.jsonl",
  observationRows: "market_listing_observations.jsonl",
  sellerSnapshotRows: "market_listing_seller_snapshots.jsonl",
  priceEventRows: "market_listing_price_events.jsonl",
});

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

function deterministicUuid(input) {
  const hash = sha256(input);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countInto(counts, key) {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

function sortedObject(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sourceListingId(item) {
  return item?.itemId ?? item?.legacyItemId ?? null;
}

function itemUrl(item) {
  return item?.itemWebUrl ?? item?.itemAffiliateWebUrl ?? null;
}

function shippingPrice(item) {
  return safeNumber(item?.shippingOptions?.[0]?.shippingCost?.value);
}

function sellerKeyFromItem(item) {
  return item?.seller?.username ?? item?.seller?.sellerAccountType ?? null;
}

function itemPrice(item) {
  return safeNumber(item?.price?.value);
}

function totalPrice(item, observation) {
  if (observation?.total_ask_price !== undefined && observation?.total_ask_price !== null) return observation.total_ask_price;
  const price = itemPrice(item);
  if (price === null) return null;
  return price + (shippingPrice(item) ?? 0);
}

function validateFetchArtifact(fetchArtifact, findings, { allowDynamicPlan = false } = {}) {
  if (fetchArtifact?.package_id !== "MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1") findings.push("unexpected_fetch_package");
  if (!allowDynamicPlan) {
    if (fetchArtifact?.package_fingerprint_sha256 !== EXPECTED_MEE_11L_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
    if (fetchArtifact?.request_results_manifest_hash_sha256 !== EXPECTED_MEE_11L_REQUEST_RESULTS_MANIFEST_HASH) findings.push("request_results_manifest_hash_mismatch");
    if (fetchArtifact?.raw_snapshot_manifest_hash_sha256 !== EXPECTED_MEE_11L_RAW_SNAPSHOT_MANIFEST_HASH) findings.push("raw_snapshot_manifest_hash_mismatch");
    if (fetchArtifact?.projected_observation_manifest_hash_sha256 !== EXPECTED_MEE_11L_OBSERVATION_MANIFEST_HASH) findings.push("projected_observation_manifest_hash_mismatch");
  }
  if (fetchArtifact?.schema_migration_hash_sha256 !== EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (fetchArtifact?.ready_for_local_db_backfill_plan !== true) findings.push("fetch_artifact_not_ready");
  if (fetchArtifact?.boundary?.db_writes !== false) findings.push("fetch_artifact_db_write_boundary_failed");
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

function writeRow(stream, row, hash) {
  stream.write(`${JSON.stringify(row)}\n`);
  hash.update(`${JSON.stringify(stable(row))}\n`);
}

function closeStream(stream) {
  return new Promise((resolve, reject) => {
    stream.end((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function buildAcquisitionRunRow(fetchArtifact, generatedAt) {
  const runKey = `MEE-11L-DAILY-BATCH-${fetchArtifact.package_fingerprint_sha256.slice(0, 12)}`;
  return {
    id: deterministicUuid(`market_listing_acquisition_run:${runKey}`),
    run_key: runKey,
    contract_version: MARKET_LISTING_ACQUISITION_DAILY_BATCH_BACKFILL_PLAN_VERSION,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    acquisition_strategy: "targeted_daily_batch_with_slab_classification",
    status: "completed",
    requested_call_ceiling: fetchArtifact.summary?.approved_request_count ?? 0,
    consumed_call_count: fetchArtifact.summary?.attempted_request_count ?? 0,
    requested_listing_ceiling: (fetchArtifact.summary?.approved_request_count ?? 0) * 200,
    observed_listing_count: fetchArtifact.summary?.projected_observation_count ?? 0,
    cached_query_count: 0,
    error_count: fetchArtifact.summary?.fetch_status_counts?.fetched_error ?? 0,
    options: {
      fetch_package_id: fetchArtifact.package_id,
      fetch_package_fingerprint: fetchArtifact.package_fingerprint_sha256,
      request_results_manifest_hash: fetchArtifact.request_results_manifest_hash_sha256,
      raw_snapshot_manifest_hash: fetchArtifact.raw_snapshot_manifest_hash_sha256,
      projected_observation_manifest_hash: fetchArtifact.projected_observation_manifest_hash_sha256,
      slab_classification_preserved: true,
    },
    summary: fetchArtifact.summary ?? {},
    artifact_paths: Object.values(fetchArtifact.artifacts ?? {}).filter(Boolean),
    artifact_hashes: [
      fetchArtifact.package_fingerprint_sha256,
      fetchArtifact.request_results_manifest_hash_sha256,
      fetchArtifact.raw_snapshot_manifest_hash_sha256,
      fetchArtifact.projected_observation_manifest_hash_sha256,
    ].filter(Boolean),
    started_at: fetchArtifact.generated_at ?? generatedAt,
    finished_at: fetchArtifact.generated_at ?? generatedAt,
    created_at: generatedAt,
  };
}

function buildQueryCacheRow(result, acquisitionRunId, fetchArtifact, generatedAt) {
  return {
    id: deterministicUuid(`market_listing_query_cache:${result.query_key}`),
    acquisition_run_id: acquisitionRunId,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    query_key: result.query_key,
    query_text: result.query_text,
    query_filters: {
      category_ids: ["183454"],
      limit: 200,
      fieldgroups: ["MATCHING_ITEMS"],
      strategy: result.strategy,
      targeted_batch: true,
    },
    target_hints: {
      gv_id: result.gv_id,
      strategy: result.strategy,
      card_matching_deferred: false,
    },
    page_cursor: null,
    result_count: result.fetched_item_count ?? 0,
    response_hash: result.payload_hash ?? null,
    cache_status: result.fetch_status === "fetched_success" ? "fresh" : "blocked",
    observed_at: fetchArtifact.generated_at ?? generatedAt,
    expires_at: null,
    created_at: generatedAt,
  };
}

function buildRowsForItem({ item, observation, response, acquisitionRunId, queryCacheId, generatedAt }) {
  const listingId = sourceListingId(item);
  const rawSnapshotId = deterministicUuid(`market_listing_raw_snapshot:${response.query_key}:${listingId}:${sha256(item)}`);
  const observationId = deterministicUuid(`market_listing_observation:${rawSnapshotId}`);
  const observedAt = observation?.observed_at ?? response.generated_at ?? generatedAt;
  const sellerKey = observation?.seller_key ?? sellerKeyFromItem(item);
  const total = totalPrice(item, observation);

  return {
    rawSnapshotRow: {
      id: rawSnapshotId,
      acquisition_run_id: acquisitionRunId,
      query_cache_id: queryCacheId,
      source: "ebay_active",
      provider_route: "ebay_browse_api",
      source_listing_id: listingId,
      source_url: observation?.source_url ?? itemUrl(item),
      raw_payload: item,
      payload_hash: sha256(item),
      observed_at: observedAt,
      ingested_at: generatedAt,
      created_at: generatedAt,
    },
    observationRow: {
      id: observationId,
      raw_snapshot_id: rawSnapshotId,
      acquisition_run_id: acquisitionRunId,
      query_cache_id: queryCacheId,
      source: "ebay_active",
      source_listing_id: listingId,
      listing_url: observation?.source_url ?? itemUrl(item),
      listing_title: observation?.listing_title ?? item?.title ?? "",
      listing_status: "active",
      listing_format: observation?.listing_format ?? "unknown",
      ask_price: observation?.ask_price ?? itemPrice(item),
      shipping_price: observation?.shipping_price ?? shippingPrice(item),
      total_ask_price: total,
      currency: observation?.currency ?? item?.price?.currency ?? null,
      quantity_available: null,
      quantity_sold: null,
      condition_text: observation?.condition_text ?? item?.condition ?? null,
      item_location: observation?.item_location ?? item?.itemLocation?.country ?? null,
      seller_key: sellerKey,
      observed_at: observedAt,
      created_at: generatedAt,
    },
    sellerRow: sellerKey
      ? {
          id: deterministicUuid(`market_listing_seller_snapshot:${sellerKey}:${observedAt}`),
          acquisition_run_id: acquisitionRunId,
          raw_snapshot_id: rawSnapshotId,
          source: "ebay_active",
          seller_key: sellerKey,
          seller_username: item?.seller?.username ?? sellerKey,
          feedback_score: safeNumber(item?.seller?.feedbackScore),
          feedback_percentage: safeNumber(item?.seller?.feedbackPercentage),
          seller_location: item?.itemLocation?.country ?? null,
          store_name: null,
          observed_at: observedAt,
          created_at: generatedAt,
        }
      : null,
    priceEventRow: {
      id: deterministicUuid(`market_listing_price_event:first_seen:${observationId}`),
      observation_id: observationId,
      source: "ebay_active",
      source_listing_id: listingId,
      event_type: "first_seen",
      previous_observation_id: null,
      previous_total_ask_price: null,
      current_total_ask_price: total,
      currency: observation?.currency ?? item?.price?.currency ?? null,
      event_payload: {
        query_key: response.query_key,
        gv_id: response.gv_id,
        strategy: response.strategy,
        listing_evidence_class: observation?.listing_evidence_class ?? null,
        listing_evidence_tags: observation?.listing_evidence_tags ?? [],
        slab_features: observation?.slab_features ?? null,
        ingestion_exclusion_flags: observation?.ingestion_exclusion_flags ?? [],
        target: observation?.target ?? null,
        provider_total_for_query: response.provider_total ?? null,
      },
      observed_at: observedAt,
      created_at: generatedAt,
    },
  };
}

export async function buildMarketListingAcquisitionDailyBatchBackfillPlanV1({
  fetchArtifact,
  outputDir,
  generatedAt = new Date().toISOString(),
  allowDynamicPlan = false,
} = {}) {
  if (!fetchArtifact || typeof fetchArtifact !== "object") {
    throw new Error("[market-listing-daily-backfill-plan] fetchArtifact is required");
  }
  if (!outputDir) {
    throw new Error("[market-listing-daily-backfill-plan] outputDir is required");
  }

  const findings = [];
  validateFetchArtifact(fetchArtifact, findings, { allowDynamicPlan });
  mkdirSync(outputDir, { recursive: true });

  const rowFiles = Object.fromEntries(Object.entries(ROW_FILE_NAMES).map(([key, fileName]) => [key, path.join(outputDir, fileName)]));
  const streams = Object.fromEntries(Object.entries(rowFiles).map(([key, filePath]) => [key, createWriteStream(filePath, { encoding: "utf8" })]));
  const rowHashes = Object.fromEntries(Object.keys(rowFiles).map((key) => [key, createHash("sha256")]));
  const rowCounts = Object.fromEntries(Object.keys(rowFiles).map((key) => [key, 0]));

  const evidenceClassCounts = {};
  const exclusionFlagCounts = {};
  const dedupeSummary = {
    duplicate_raw_payload_rows_skipped: 0,
    duplicate_seller_rows_skipped: 0,
  };

  try {
    if (findings.length === 0) {
      const acquisitionRunRow = buildAcquisitionRunRow(fetchArtifact, generatedAt);
      writeRow(streams.acquisitionRunRows, acquisitionRunRow, rowHashes.acquisitionRunRows);
      rowCounts.acquisitionRunRows += 1;

      for await (const result of readJsonLines(fetchArtifact.artifacts.request_results_jsonl)) {
        const row = buildQueryCacheRow(result, acquisitionRunRow.id, fetchArtifact, generatedAt);
        writeRow(streams.queryCacheRows, row, rowHashes.queryCacheRows);
        rowCounts.queryCacheRows += 1;
      }

      const rawKeys = new Set();
      const sellerKeys = new Set();
      for await (const response of readJsonLines(fetchArtifact.artifacts.raw_snapshots_jsonl)) {
        const queryCacheId = deterministicUuid(`market_listing_query_cache:${response.query_key}`);
        const observationsByListingId = new Map((response.projected_observations ?? [])
          .map((observation) => [observation.source_listing_id, observation]));

        for (const item of response.raw_payload?.itemSummaries ?? []) {
          const listingId = sourceListingId(item);
          if (!listingId) continue;
          const payloadHash = sha256(item);
          const rawKey = `${response.source}:${listingId}:${payloadHash}`;
          if (rawKeys.has(rawKey)) {
            dedupeSummary.duplicate_raw_payload_rows_skipped += 1;
            continue;
          }
          rawKeys.add(rawKey);

          const observation = observationsByListingId.get(listingId);
          const rows = buildRowsForItem({
            item,
            observation,
            response,
            acquisitionRunId: acquisitionRunRow.id,
            queryCacheId,
            generatedAt,
          });

          writeRow(streams.rawSnapshotRows, rows.rawSnapshotRow, rowHashes.rawSnapshotRows);
          writeRow(streams.observationRows, rows.observationRow, rowHashes.observationRows);
          writeRow(streams.priceEventRows, rows.priceEventRow, rowHashes.priceEventRows);
          rowCounts.rawSnapshotRows += 1;
          rowCounts.observationRows += 1;
          rowCounts.priceEventRows += 1;

          countInto(evidenceClassCounts, rows.priceEventRow.event_payload.listing_evidence_class);
          for (const flag of rows.priceEventRow.event_payload.ingestion_exclusion_flags) countInto(exclusionFlagCounts, flag);

          if (rows.sellerRow) {
            const sellerKey = `${rows.sellerRow.source}:${rows.sellerRow.seller_key}:${rows.sellerRow.observed_at}`;
            if (sellerKeys.has(sellerKey)) {
              dedupeSummary.duplicate_seller_rows_skipped += 1;
            } else {
              sellerKeys.add(sellerKey);
              writeRow(streams.sellerSnapshotRows, rows.sellerRow, rowHashes.sellerSnapshotRows);
              rowCounts.sellerSnapshotRows += 1;
            }
          }
        }
      }
    }
  } finally {
    await Promise.all(Object.values(streams).map(closeStream));
  }

  const rowFileHashes = Object.fromEntries(Object.entries(rowHashes).map(([key, hash]) => [key, hash.digest("hex")]));
  const rowManifestHash = sha256({
    row_file_hashes: rowFileHashes,
    row_counts: rowCounts,
    dedupe_summary: dedupeSummary,
  });
  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1",
    version: MARKET_LISTING_ACQUISITION_DAILY_BATCH_BACKFILL_PLAN_VERSION,
    source_package_fingerprint: fetchArtifact.package_fingerprint_sha256,
    request_results_manifest_hash: fetchArtifact.request_results_manifest_hash_sha256,
    raw_snapshot_manifest_hash: fetchArtifact.raw_snapshot_manifest_hash_sha256,
    projected_observation_manifest_hash: fetchArtifact.projected_observation_manifest_hash_sha256,
    row_manifest_hash: rowManifestHash,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
  });

  return {
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1",
    version: MARKET_LISTING_ACQUISITION_DAILY_BATCH_BACKFILL_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "db_backfill_plan_only_no_writes",
    source_package_fingerprint_sha256: fetchArtifact.package_fingerprint_sha256,
    request_results_manifest_hash_sha256: fetchArtifact.request_results_manifest_hash_sha256,
    raw_snapshot_manifest_hash_sha256: fetchArtifact.raw_snapshot_manifest_hash_sha256,
    projected_observation_manifest_hash_sha256: fetchArtifact.projected_observation_manifest_hash_sha256,
    schema_migration_hash_sha256: fetchArtifact.schema_migration_hash_sha256,
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    row_file_hashes_sha256: rowFileHashes,
    proposed_table_row_counts: {
      market_listing_acquisition_runs: rowCounts.acquisitionRunRows,
      market_listing_query_cache: rowCounts.queryCacheRows,
      market_listing_raw_snapshots: rowCounts.rawSnapshotRows,
      market_listing_observations: rowCounts.observationRows,
      market_listing_seller_snapshots: rowCounts.sellerSnapshotRows,
      market_listing_price_events: rowCounts.priceEventRows,
      market_listing_card_candidates: 0,
      market_listing_rollups: 0,
    },
    summary: {
      source_projected_observation_count: fetchArtifact.summary?.projected_observation_count ?? null,
      deduped_observation_count: rowCounts.observationRows,
      evidence_class_counts: sortedObject(evidenceClassCounts),
      exclusion_flag_counts: sortedObject(exclusionFlagCounts),
      dedupe_summary: dedupeSummary,
    },
    row_files: rowFiles,
    apply_order: [
      "market_listing_acquisition_runs",
      "market_listing_query_cache",
      "market_listing_raw_snapshots",
      "market_listing_observations",
      "market_listing_seller_snapshots",
      "market_listing_price_events",
    ],
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
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
    ready_for_apply_approval: findings.length === 0 && rowCounts.observationRows > 0,
  };
}
