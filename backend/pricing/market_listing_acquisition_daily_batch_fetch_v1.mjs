import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";

import {
  MAX_EBAY_BROWSE_RESULT_LIMIT,
  fetchEbayBrowseSummary,
} from "./market_listing_acquisition_smoke_fetch_v1.mjs";

export const MARKET_LISTING_ACQUISITION_DAILY_BATCH_FETCH_VERSION = "MEE_11L_MARKET_LISTING_ACQUISITION_DAILY_BATCH_FETCH_V1";
export const EXPECTED_MEE_11K_PACKAGE_FINGERPRINT = "3cf2760ba07840c27f96b6d26511aee8a8b3673334cc870a83171bd5532316d9";
export const EXPECTED_MEE_11K_REQUEST_MANIFEST_HASH = "28bf3a93e49a0732b843b32e7d73e27798f9334639cd9482407b145f7f404bb8";
export const EXPECTED_MEE_11D_SOURCE_FINGERPRINT = "4059ce0f8c2a20b767df2aee0474ffbd7704e6970d8fb876c81f7b87a52cacb6";
export const EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

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

function countInto(counts, key) {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

function sortedObject(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function writeJsonLine(stream, row, hash) {
  const line = JSON.stringify(row);
  stream.write(`${line}\n`);
  hash.update(`${JSON.stringify(stable(row))}\n`);
}

function validatePlan(plan, findings, { allowDynamicPlan = false } = {}) {
  if (plan?.package_id !== "MARKET-LISTING-ACQUISITION-DAILY-BATCH-PLAN-V1") findings.push("unexpected_batch_plan_package");
  if (!allowDynamicPlan) {
    if (plan?.package_fingerprint_sha256 !== EXPECTED_MEE_11K_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
    if (plan?.request_manifest_hash_sha256 !== EXPECTED_MEE_11K_REQUEST_MANIFEST_HASH) findings.push("request_manifest_hash_mismatch");
    if (plan?.source_package_fingerprint_sha256 !== EXPECTED_MEE_11D_SOURCE_FINGERPRINT) findings.push("source_dry_run_fingerprint_mismatch");
  }
  if (plan?.schema_migration_hash_sha256 !== EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (plan?.ready_for_acquisition_approval !== true) findings.push("batch_plan_not_ready");
  if (!Array.isArray(plan?.acquisition_requests)) findings.push("missing_acquisition_requests");
  if (plan?.boundary?.provider_calls !== false) findings.push("source_plan_provider_call_boundary_failed");
  if (plan?.boundary?.db_writes !== false) findings.push("source_plan_db_write_boundary_failed");
}

function streamClose(stream) {
  return new Promise((resolve, reject) => {
    stream.end((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function buildMarketListingAcquisitionDailyBatchFetchV1({
  batchPlan,
  artifactDir,
  generatedAt = new Date().toISOString(),
  fetchListing = fetchEbayBrowseSummary,
  progressEvery = 50,
  logger = null,
  allowDynamicPlan = false,
} = {}) {
  if (!artifactDir) throw new Error("[market-listing-daily-batch-fetch] artifactDir is required");
  mkdirSync(artifactDir, { recursive: true });

  const findings = [];
  validatePlan(batchPlan, findings, { allowDynamicPlan });
  const requests = Array.isArray(batchPlan?.acquisition_requests) ? batchPlan.acquisition_requests : [];

  const requestResultsPath = path.join(artifactDir, "request_results.jsonl");
  const rawSnapshotsPath = path.join(artifactDir, "raw_snapshots.jsonl");
  const projectedObservationsPath = path.join(artifactDir, "projected_observations.jsonl");

  const requestResultsStream = createWriteStream(requestResultsPath, { encoding: "utf8" });
  const rawSnapshotsStream = createWriteStream(rawSnapshotsPath, { encoding: "utf8" });
  const projectedObservationsStream = createWriteStream(projectedObservationsPath, { encoding: "utf8" });

  const requestResultsHash = createHash("sha256");
  const rawSnapshotHash = createHash("sha256");
  const observationHash = createHash("sha256");

  const fetchStatusCounts = {};
  const evidenceClassCounts = {};
  const exclusionFlagCounts = {};
  const strategyCounts = {};
  const uniqueListings = new Set();
  const uniqueTargets = new Set();

  let fetchedItemCount = 0;
  let projectedObservationCount = 0;
  let providerTotalSum = 0;

  if (findings.length === 0) {
    for (const [index, request] of requests.entries()) {
      try {
        const limit = Math.max(1, Math.min(Number(request.query_filters?.limit) || MAX_EBAY_BROWSE_RESULT_LIMIT, MAX_EBAY_BROWSE_RESULT_LIMIT));
        const response = await fetchListing(request, {
          resultLimit: limit,
          observedAt: generatedAt,
        });
        providerTotalSum += response.provider_total ?? 0;
        fetchedItemCount += response.fetched_item_count ?? 0;
        countInto(fetchStatusCounts, "fetched_success");
        countInto(strategyCounts, request.strategy);

        const requestResult = {
          ordinal: request.ordinal,
          query_key: request.query_key,
          gv_id: request.gv_id,
          strategy: request.strategy,
          query_text: request.query_text,
          fetch_status: "fetched_success",
          response_status: response.response_status,
          provider_total: response.provider_total,
          fetched_item_count: response.fetched_item_count,
          payload_hash: response.payload_hash,
        };
        writeJsonLine(requestResultsStream, requestResult, requestResultsHash);
        writeJsonLine(rawSnapshotsStream, {
          ...response,
          request_ordinal: request.ordinal,
          gv_id: request.gv_id,
          strategy: request.strategy,
        }, rawSnapshotHash);

        for (const observation of response.projected_observations ?? []) {
          projectedObservationCount += 1;
          if (observation.source_listing_id) uniqueListings.add(observation.source_listing_id);
          if (observation.target?.card_print_id) uniqueTargets.add(observation.target.card_print_id);
          countInto(evidenceClassCounts, observation.listing_evidence_class);
          for (const flag of observation.ingestion_exclusion_flags ?? []) countInto(exclusionFlagCounts, flag);
          writeJsonLine(projectedObservationsStream, observation, observationHash);
        }
      } catch (error) {
        countInto(fetchStatusCounts, "fetched_error");
        countInto(strategyCounts, request.strategy);
        writeJsonLine(requestResultsStream, {
          ordinal: request.ordinal,
          query_key: request.query_key,
          gv_id: request.gv_id,
          strategy: request.strategy,
          query_text: request.query_text,
          fetch_status: "fetched_error",
          response_status: error?.status ?? null,
          reason: error?.message ?? String(error),
          provider_total: 0,
          fetched_item_count: 0,
        }, requestResultsHash);
      }

      if (logger && progressEvery > 0 && ((index + 1) % progressEvery === 0 || index + 1 === requests.length)) {
        logger(`[market-listing-daily-batch-fetch] ${index + 1}/${requests.length} requests processed`);
      }
    }
  }

  await Promise.all([
    streamClose(requestResultsStream),
    streamClose(rawSnapshotsStream),
    streamClose(projectedObservationsStream),
  ]);

  const requestResultsManifestHash = requestResultsHash.digest("hex");
  const rawSnapshotManifestHash = rawSnapshotHash.digest("hex");
  const observationManifestHash = observationHash.digest("hex");
  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1",
    version: MARKET_LISTING_ACQUISITION_DAILY_BATCH_FETCH_VERSION,
    source_batch_package_fingerprint: batchPlan?.package_fingerprint_sha256 ?? null,
    source_batch_request_manifest_hash: batchPlan?.request_manifest_hash_sha256 ?? null,
    request_results_manifest_hash: requestResultsManifestHash,
    raw_snapshot_manifest_hash: rawSnapshotManifestHash,
    projected_observation_manifest_hash: observationManifestHash,
    request_count: requests.length,
    boundary: {
      db_writes: false,
      market_listing_writes: false,
      pricing_observations_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
  });

  return {
    package_id: "MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1",
    version: MARKET_LISTING_ACQUISITION_DAILY_BATCH_FETCH_VERSION,
    generated_at: generatedAt,
    mode: allowDynamicPlan ? "dynamic_approved_provider_fetch_local_artifacts_only" : "approved_provider_fetch_local_artifacts_only",
    source_package_fingerprint_sha256: batchPlan?.package_fingerprint_sha256 ?? null,
    source_request_manifest_hash_sha256: batchPlan?.request_manifest_hash_sha256 ?? null,
    source_dry_run_fingerprint_sha256: batchPlan?.source_package_fingerprint_sha256 ?? null,
    schema_migration_hash_sha256: batchPlan?.schema_migration_hash_sha256 ?? null,
    package_fingerprint_sha256: packageFingerprint,
    request_results_manifest_hash_sha256: requestResultsManifestHash,
    raw_snapshot_manifest_hash_sha256: rawSnapshotManifestHash,
    projected_observation_manifest_hash_sha256: observationManifestHash,
    summary: {
      approved_request_count: requests.length,
      attempted_request_count: Object.values(fetchStatusCounts).reduce((sum, count) => sum + count, 0),
      fetch_status_counts: sortedObject(fetchStatusCounts),
      provider_total_sum: providerTotalSum,
      fetched_item_count: fetchedItemCount,
      projected_observation_count: projectedObservationCount,
      unique_listing_count: uniqueListings.size,
      unique_target_count_with_results: uniqueTargets.size,
      evidence_class_counts: sortedObject(evidenceClassCounts),
      exclusion_flag_counts: sortedObject(exclusionFlagCounts),
      strategy_counts: sortedObject(strategyCounts),
      slab_observation_count: evidenceClassCounts.slab ?? 0,
      raw_single_observation_count: evidenceClassCounts.raw_single ?? 0,
    },
    artifacts: {
      request_results_jsonl: requestResultsPath,
      raw_snapshots_jsonl: rawSnapshotsPath,
      projected_observations_jsonl: projectedObservationsPath,
    },
    boundary: {
      provider_calls: findings.length === 0,
      source_fetches: findings.length === 0,
      local_artifacts_only: true,
      db_writes: false,
      market_listing_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    findings,
    ready_for_local_db_backfill_plan: findings.length === 0 && projectedObservationCount > 0,
  };
}
