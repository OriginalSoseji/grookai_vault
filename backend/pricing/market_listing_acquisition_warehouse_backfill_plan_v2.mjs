import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

export const MARKET_LISTING_ACQUISITION_WAREHOUSE_BACKFILL_PLAN_VERSION = "MEE_MARKET_LISTING_ACQUISITION_WAREHOUSE_BACKFILL_PLAN_V2";

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

function deterministicUuid(value) {
  const hash = sha256(value);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function writeRow(stream, row, hash) {
  const line = JSON.stringify(row);
  stream.write(`${line}\n`);
  hash.update(`${JSON.stringify(stable(row))}\n`);
}

function closeStream(stream) {
  return new Promise((resolve, reject) => stream.end((error) => error ? reject(error) : resolve()));
}

async function* readJsonLines(filePath) {
  const rl = readline.createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line);
}

function sourceListingId(item) {
  return item?.itemId ?? item?.legacyItemId ?? null;
}

function itemPrice(item) {
  return safeNumber(item?.price?.value);
}

function shippingPrice(item) {
  return safeNumber(item?.shippingOptions?.[0]?.shippingCost?.value);
}

function validateFetchArtifact(fetchArtifact) {
  const findings = [];
  if (fetchArtifact?.package_id !== "MARKET-LISTING-ACQUISITION-WAREHOUSE-FETCH-V2") findings.push("unexpected_fetch_package");
  if (fetchArtifact?.ready_for_local_db_backfill_plan !== true) findings.push("fetch_artifact_not_ready");
  if (fetchArtifact?.boundary?.db_writes !== false) findings.push("fetch_artifact_db_write_boundary_failed");
  if (fetchArtifact?.summary?.canonical_assignment_deferred !== true) findings.push("canonical_assignment_not_deferred");
  for (const key of ["request_results_jsonl", "raw_snapshots_jsonl", "projected_observations_jsonl"]) {
    if (!fetchArtifact?.artifacts?.[key]) findings.push(`missing_artifact:${key}`);
  }
  return findings;
}

function acquisitionRunRow(fetchArtifact, generatedAt) {
  const runKey = `MEE-WAREHOUSE-V2-${fetchArtifact.package_fingerprint_sha256.slice(0, 16)}`;
  return {
    id: deterministicUuid(`market_listing_acquisition_run:${runKey}`),
    run_key: runKey,
    contract_version: MARKET_LISTING_ACQUISITION_WAREHOUSE_BACKFILL_PLAN_VERSION,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    acquisition_strategy: "warehouse_first_product_kind_discovery_v2",
    status: "completed",
    requested_call_ceiling: fetchArtifact.summary?.provider_call_ceiling ?? 0,
    consumed_call_count: fetchArtifact.summary?.provider_call_count ?? 0,
    requested_listing_ceiling: (fetchArtifact.summary?.provider_call_ceiling ?? 0) * 200,
    observed_listing_count: fetchArtifact.summary?.projected_observation_count ?? 0,
    cached_query_count: 0,
    error_count: fetchArtifact.summary?.fetch_status_counts?.fetched_error ?? 0,
    options: {
      fetch_package_id: fetchArtifact.package_id,
      fetch_package_fingerprint: fetchArtifact.package_fingerprint_sha256,
      product_kind_classification_preserved: true,
      canonical_assignment_status: "deferred",
      card_matching_deferred: true,
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

function queryCacheRow(result, runId, fetchArtifact, generatedAt) {
  return {
    id: deterministicUuid(`market_listing_query_cache:${result.query_key}`),
    acquisition_run_id: runId,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    query_key: result.query_key,
    query_text: result.query_text,
    query_filters: {
      ...(result.query_filters ?? {}),
      strategy: result.strategy,
      acquisition_product_kind: result.acquisition_product_kind,
      warehouse_first: true,
    },
    target_hints: {
      ...(result.target_hints ?? {}),
      card_print_id: null,
      card_printing_id: null,
      gv_id: null,
      printing_gv_id: null,
      canonical_assignment_status: "deferred",
      card_matching_deferred: true,
    },
    page_cursor: result.offset ? String(result.offset) : null,
    result_count: result.fetched_item_count ?? 0,
    response_hash: result.payload_hash ?? null,
    cache_status: result.fetch_status === "fetched_success" ? "fresh" : "blocked",
    observed_at: fetchArtifact.generated_at ?? generatedAt,
    expires_at: null,
    created_at: generatedAt,
  };
}

function rowsForItem({ item, observation, response, runId, queryCacheId, generatedAt }) {
  const listingId = sourceListingId(item);
  const rawSnapshotId = deterministicUuid(`market_listing_raw_snapshot:${response.query_key}:${listingId}:${sha256(item)}`);
  const observationId = deterministicUuid(`market_listing_observation:${rawSnapshotId}`);
  const observedAt = observation?.observed_at ?? response.generated_at ?? generatedAt;
  const sellerKey = observation?.seller_key ?? item?.seller?.username ?? null;
  const ask = observation?.ask_price ?? itemPrice(item);
  const shipping = observation?.shipping_price ?? shippingPrice(item);
  const total = observation?.total_ask_price ?? (ask === null ? null : ask + (shipping ?? 0));
  const rawSnapshotRow = {
    id: rawSnapshotId,
    acquisition_run_id: runId,
    query_cache_id: queryCacheId,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    source_listing_id: listingId,
    source_url: observation?.source_url ?? item?.itemWebUrl ?? item?.itemAffiliateWebUrl ?? null,
    raw_payload: item,
    payload_hash: sha256(item),
    observed_at: observedAt,
    ingested_at: generatedAt,
    created_at: generatedAt,
  };
  return {
    rawSnapshotRow,
    observationRow: {
      id: observationId,
      raw_snapshot_id: rawSnapshotId,
      acquisition_run_id: runId,
      query_cache_id: queryCacheId,
      source: "ebay_active",
      source_listing_id: listingId,
      listing_url: rawSnapshotRow.source_url,
      listing_title: observation?.listing_title ?? item?.title ?? "",
      listing_status: "active",
      listing_format: observation?.listing_format ?? "unknown",
      ask_price: ask,
      shipping_price: shipping,
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
    sellerRow: sellerKey ? {
      id: deterministicUuid(`market_listing_seller_snapshot:${sellerKey}:${observedAt}`),
      acquisition_run_id: runId,
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
    } : null,
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
        strategy: response.strategy,
        acquisition_product_kind: response.acquisition_product_kind,
        product_kind_version: observation?.product_kind_version ?? null,
        product_kind: observation?.product_kind ?? "unknown",
        product_kind_confidence: observation?.product_kind_confidence ?? null,
        product_kind_evidence: observation?.product_kind_evidence ?? [],
        assignment_domain: observation?.assignment_domain ?? null,
        canonical_assignment_status: "deferred",
        warehouse_eligible: observation?.warehouse_eligible !== false,
        pricing_publication_eligible: false,
        listing_evidence_class: observation?.listing_evidence_class ?? null,
        listing_evidence_tags: observation?.listing_evidence_tags ?? [],
        slab_features: observation?.slab_features ?? null,
        provider_condition_id: observation?.provider_condition_id ?? null,
        provider_categories: observation?.provider_categories ?? [],
        packaging_state: observation?.packaging_state ?? "not_observed",
        packaging_state_confidence: observation?.packaging_state_confidence ?? null,
        packaging_state_evidence: observation?.packaging_state_evidence ?? [],
        ingestion_exclusion_flags: observation?.ingestion_exclusion_flags ?? [],
        target: observation?.target ?? null,
        provider_total_for_query: response.provider_total ?? null,
      },
      observed_at: observedAt,
      created_at: generatedAt,
    },
  };
}

export async function buildMarketListingAcquisitionWarehouseBackfillPlanV2({
  fetchArtifact,
  outputDir,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!outputDir) throw new Error("[market-listing-warehouse-backfill-v2] outputDir is required");
  const findings = validateFetchArtifact(fetchArtifact);
  mkdirSync(outputDir, { recursive: true });
  const rowFiles = Object.fromEntries(Object.entries(ROW_FILE_NAMES).map(([key, fileName]) => [key, path.join(outputDir, fileName)]));
  const streams = Object.fromEntries(Object.entries(rowFiles).map(([key, filePath]) => [key, createWriteStream(filePath, { encoding: "utf8" })]));
  const hashes = Object.fromEntries(Object.keys(rowFiles).map((key) => [key, createHash("sha256")]));
  const counts = Object.fromEntries(Object.keys(rowFiles).map((key) => [key, 0]));
  const productKindCounts = {};
  const rawKeys = new Set();
  const sellerKeys = new Set();
  let duplicateRawRowsSkipped = 0;

  try {
    if (findings.length === 0) {
      const run = acquisitionRunRow(fetchArtifact, generatedAt);
      writeRow(streams.acquisitionRunRows, run, hashes.acquisitionRunRows);
      counts.acquisitionRunRows += 1;
      for await (const result of readJsonLines(fetchArtifact.artifacts.request_results_jsonl)) {
        writeRow(streams.queryCacheRows, queryCacheRow(result, run.id, fetchArtifact, generatedAt), hashes.queryCacheRows);
        counts.queryCacheRows += 1;
      }
      for await (const response of readJsonLines(fetchArtifact.artifacts.raw_snapshots_jsonl)) {
        const observations = new Map((response.projected_observations ?? []).map((observation) => [observation.source_listing_id, observation]));
        const queryCacheId = deterministicUuid(`market_listing_query_cache:${response.query_key}`);
        for (const item of response.raw_payload?.itemSummaries ?? []) {
          const listingId = sourceListingId(item);
          if (!listingId) continue;
          const rawKey = `${response.source}:${listingId}:${sha256(item)}`;
          if (rawKeys.has(rawKey)) {
            duplicateRawRowsSkipped += 1;
            continue;
          }
          rawKeys.add(rawKey);
          const rows = rowsForItem({ item, observation: observations.get(listingId), response, runId: run.id, queryCacheId, generatedAt });
          for (const [streamKey, row] of [["rawSnapshotRows", rows.rawSnapshotRow], ["observationRows", rows.observationRow], ["priceEventRows", rows.priceEventRow]]) {
            writeRow(streams[streamKey], row, hashes[streamKey]);
            counts[streamKey] += 1;
          }
          const kind = rows.priceEventRow.event_payload.product_kind;
          productKindCounts[kind] = (productKindCounts[kind] ?? 0) + 1;
          if (rows.sellerRow) {
            const sellerKey = `${rows.sellerRow.source}:${rows.sellerRow.seller_key}:${rows.sellerRow.observed_at}`;
            if (!sellerKeys.has(sellerKey)) {
              sellerKeys.add(sellerKey);
              writeRow(streams.sellerSnapshotRows, rows.sellerRow, hashes.sellerSnapshotRows);
              counts.sellerSnapshotRows += 1;
            }
          }
        }
      }
    }
  } finally {
    await Promise.all(Object.values(streams).map(closeStream));
  }

  const rowFileHashes = Object.fromEntries(Object.entries(hashes).map(([key, hash]) => [key, hash.digest("hex")]));
  const rowManifestHash = sha256({ row_file_hashes: rowFileHashes, row_counts: counts, duplicate_raw_rows_skipped: duplicateRawRowsSkipped });
  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-WAREHOUSE-BACKFILL-PLAN-V2",
    source_package_fingerprint: fetchArtifact?.package_fingerprint_sha256 ?? null,
    row_manifest_hash: rowManifestHash,
  });
  return {
    package_id: "MARKET-LISTING-ACQUISITION-WAREHOUSE-BACKFILL-PLAN-V2",
    version: MARKET_LISTING_ACQUISITION_WAREHOUSE_BACKFILL_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "db_backfill_plan_only_no_writes",
    source_package_fingerprint_sha256: fetchArtifact?.package_fingerprint_sha256 ?? null,
    request_results_manifest_hash_sha256: fetchArtifact?.request_results_manifest_hash_sha256 ?? null,
    raw_snapshot_manifest_hash_sha256: fetchArtifact?.raw_snapshot_manifest_hash_sha256 ?? null,
    projected_observation_manifest_hash_sha256: fetchArtifact?.projected_observation_manifest_hash_sha256 ?? null,
    schema_migration_hash_sha256: fetchArtifact?.schema_migration_hash_sha256 ?? null,
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    row_file_hashes_sha256: rowFileHashes,
    row_files: rowFiles,
    proposed_table_row_counts: {
      market_listing_acquisition_runs: counts.acquisitionRunRows,
      market_listing_query_cache: counts.queryCacheRows,
      market_listing_raw_snapshots: counts.rawSnapshotRows,
      market_listing_observations: counts.observationRows,
      market_listing_seller_snapshots: counts.sellerSnapshotRows,
      market_listing_price_events: counts.priceEventRows,
      market_listing_card_candidates: 0,
      market_listing_rollups: 0,
    },
    summary: {
      source_projected_observation_count: fetchArtifact?.summary?.projected_observation_count ?? null,
      deduped_observation_count: counts.observationRows,
      product_kind_counts: Object.fromEntries(Object.entries(productKindCounts).sort(([left], [right]) => left.localeCompare(right))),
      duplicate_raw_rows_skipped: duplicateRawRowsSkipped,
      canonical_assignment_deferred: true,
    },
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
      card_candidate_writes: false,
      canonical_assignment_writes: false,
      sealed_product_identity_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
      migrations: false,
      deletes: false,
    },
    findings,
    ready_for_apply_approval: findings.length === 0 && counts.observationRows > 0,
  };
}
