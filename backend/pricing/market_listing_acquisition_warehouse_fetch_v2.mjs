import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";

import {
  MAX_EBAY_BROWSE_RESULT_LIMIT,
  fetchEbayBrowseSummary,
} from "./market_listing_acquisition_smoke_fetch_v1.mjs";
import {
  adaptiveRequestFamilyKeyV1,
  shouldSkipAdaptiveRequestV1,
  updateAdaptiveFamilyStateV1,
} from "./market_listing_acquisition_adaptive_yield_v1.mjs";
import { classifyMarketListingProductKindV2 } from "./market_listing_product_kind_v2.mjs";

export const MARKET_LISTING_ACQUISITION_WAREHOUSE_FETCH_VERSION = "MEE_MARKET_LISTING_ACQUISITION_WAREHOUSE_FETCH_V2";
const PRODUCT_KINDS = ["raw_single", "graded_single", "sealed_product"];

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
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function countInto(counts, key, amount = 1) {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + amount;
}

function sortedObject(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function writeJsonLine(stream, row, hash) {
  const line = JSON.stringify(row);
  stream.write(`${line}\n`);
  hash.update(`${JSON.stringify(stable(row))}\n`);
}

function streamClose(stream) {
  return new Promise((resolve, reject) => stream.end((error) => error ? reject(error) : resolve()));
}

function validatePlan(plan) {
  const findings = [];
  if (plan?.package_id !== "MARKET-LISTING-ACQUISITION-WAREHOUSE-PLAN-V2") findings.push("unexpected_warehouse_plan_package");
  if (plan?.ready_for_acquisition_approval !== true) findings.push("warehouse_plan_not_ready");
  if (!Array.isArray(plan?.acquisition_requests)) findings.push("missing_acquisition_requests");
  if (plan?.boundary?.provider_calls !== false) findings.push("plan_provider_call_boundary_failed");
  if (plan?.boundary?.db_writes !== false) findings.push("plan_db_write_boundary_failed");
  if (plan?.summary?.exact_printing_request_count !== 0) findings.push("exact_printing_requests_present");
  if ((plan?.acquisition_requests ?? []).some((request) => request.card_print_id || request.card_printing_id)) findings.push("premature_canonical_assignment_target_detected");
  return findings;
}

function itemByListingId(response) {
  return new Map((response?.raw_payload?.itemSummaries ?? [])
    .map((item) => [item?.itemId ?? item?.legacyItemId, item])
    .filter(([listingId]) => listingId));
}

function classifyResponse(response, request) {
  const items = itemByListingId(response);
  const projectedObservations = (response.projected_observations ?? []).map((observation) => {
    const item = items.get(observation.source_listing_id);
    return {
      ...observation,
      ...classifyMarketListingProductKindV2({
        title: observation.listing_title ?? item?.title,
        conditionText: observation.condition_text ?? item?.condition ?? item?.conditionDescription,
        conditionId: observation.provider_condition_id ?? item?.conditionId,
        itemCategories: item?.categories ?? observation.provider_categories,
        acquisitionProductKind: request.acquisition_product_kind,
        acquisitionCategoryIds: request.query_filters?.category_ids ?? [],
      }),
      target: {
        ...(observation.target ?? {}),
        card_print_id: null,
        card_printing_id: null,
        gv_id: null,
        printing_gv_id: null,
        acquisition_product_kind: request.acquisition_product_kind,
        canonical_assignment_status: "deferred",
        card_matching_deferred: true,
      },
    };
  });
  return { ...response, projected_observations: projectedObservations };
}

function requestQueue(plan, productKind) {
  return plan.acquisition_requests
    .filter((request) => request.acquisition_product_kind === productKind)
    .sort((left, right) => left.offset - right.offset || left.ordinal - right.ordinal);
}

function laneYield(stats, lane) {
  const calls = stats.calls[lane] ?? 0;
  if (calls === 0) return Number.POSITIVE_INFINITY;
  return (stats.uniqueAccepted[lane]?.size ?? 0) / calls;
}

export async function buildMarketListingAcquisitionWarehouseFetchV2({
  warehousePlan,
  artifactDir,
  generatedAt = new Date().toISOString(),
  fetchListing = fetchEbayBrowseSummary,
  progressEvery = 50,
  logger = null,
} = {}) {
  if (!artifactDir) throw new Error("[market-listing-warehouse-fetch-v2] artifactDir is required");
  mkdirSync(artifactDir, { recursive: true });
  const findings = validatePlan(warehousePlan);
  const streams = {
    requestResults: createWriteStream(path.join(artifactDir, "request_results.jsonl"), { encoding: "utf8" }),
    skippedRequests: createWriteStream(path.join(artifactDir, "skipped_requests.jsonl"), { encoding: "utf8" }),
    rawSnapshots: createWriteStream(path.join(artifactDir, "raw_snapshots.jsonl"), { encoding: "utf8" }),
    projectedObservations: createWriteStream(path.join(artifactDir, "projected_observations.jsonl"), { encoding: "utf8" }),
  };
  const hashes = Object.fromEntries(Object.keys(streams).map((key) => [key, createHash("sha256")]));
  const queues = Object.fromEntries(PRODUCT_KINDS.map((kind) => [kind, requestQueue(warehousePlan, kind)]));
  const indexes = Object.fromEntries(PRODUCT_KINDS.map((kind) => [kind, 0]));
  const familyStates = new Map();
  const minimums = warehousePlan?.summary?.minimum_provider_calls_by_product_kind ?? {};
  const ceiling = Math.max(1, Number(warehousePlan?.summary?.provider_call_ceiling) || warehousePlan?.acquisition_requests?.length || 1);
  const stats = {
    calls: Object.fromEntries(PRODUCT_KINDS.map((kind) => [kind, 0])),
    uniqueAccepted: Object.fromEntries(PRODUCT_KINDS.map((kind) => [kind, new Set()])),
  };
  const fetchStatusCounts = {};
  const productKindCounts = {};
  const exclusionFlagCounts = {};
  const skippedReasonCounts = {};
  const uniqueListings = new Set();
  let providerCallCount = 0;
  let processedCandidateCount = 0;
  let fetchedItemCount = 0;
  let projectedObservationCount = 0;

  function nextEligibleRequest(lane) {
    while (indexes[lane] < queues[lane].length) {
      const request = queues[lane][indexes[lane]++];
      processedCandidateCount += 1;
      const familyState = familyStates.get(adaptiveRequestFamilyKeyV1(request));
      const skip = shouldSkipAdaptiveRequestV1({ request, familyState });
      if (!skip) return request;
      countInto(skippedReasonCounts, skip.reason);
      writeJsonLine(streams.skippedRequests, {
        ordinal: request.ordinal,
        query_key: request.query_key,
        acquisition_product_kind: lane,
        query_text: request.query_text,
        offset: request.offset,
        skip_reason: skip.reason,
        known_provider_total: skip.provider_total ?? null,
        provider_call_made: false,
      }, hashes.skippedRequests);
    }
    return null;
  }

  function chooseLane() {
    const available = PRODUCT_KINDS.filter((kind) => indexes[kind] < queues[kind].length);
    if (available.length === 0) return null;
    const belowMinimum = available.filter((kind) => stats.calls[kind] < (minimums[kind] ?? 0));
    if (belowMinimum.length > 0) {
      return belowMinimum.sort((left, right) =>
        (stats.calls[left] / Math.max(1, minimums[left] ?? 1)) - (stats.calls[right] / Math.max(1, minimums[right] ?? 1)))[0];
    }
    const coverage = available.filter((kind) => queues[kind][indexes[kind]]?.offset === 0);
    if (coverage.length > 0) return coverage.sort((left, right) => stats.calls[left] - stats.calls[right])[0];
    return available.sort((left, right) => laneYield(stats, right) - laneYield(stats, left) || stats.calls[left] - stats.calls[right])[0];
  }

  try {
    if (findings.length === 0) {
      while (providerCallCount < ceiling) {
        const lane = chooseLane();
        if (!lane) break;
        const request = nextEligibleRequest(lane);
        if (!request) continue;
        providerCallCount += 1;
        stats.calls[lane] += 1;
        try {
          const limit = Math.max(1, Math.min(Number(request.query_filters?.limit) || MAX_EBAY_BROWSE_RESULT_LIMIT, MAX_EBAY_BROWSE_RESULT_LIMIT));
          const rawResponse = await fetchListing(request, { resultLimit: limit, observedAt: generatedAt });
          const response = classifyResponse(rawResponse, request);
          const familyKey = adaptiveRequestFamilyKeyV1(request);
          const previousState = familyStates.get(familyKey);
          const nextState = updateAdaptiveFamilyStateV1({ request, response, previousState });
          familyStates.set(familyKey, nextState);
          countInto(fetchStatusCounts, "fetched_success");
          fetchedItemCount += response.fetched_item_count ?? 0;
          writeJsonLine(streams.requestResults, {
            ordinal: request.ordinal,
            query_key: request.query_key,
            acquisition_product_kind: lane,
            strategy: request.strategy,
            query_text: request.query_text,
            query_filters: request.query_filters,
            offset: request.offset,
            target_hints: request.target_hints,
            fetch_status: "fetched_success",
            response_status: response.response_status,
            provider_total: response.provider_total,
            fetched_item_count: response.fetched_item_count,
            payload_hash: response.payload_hash,
          }, hashes.requestResults);
          writeJsonLine(streams.rawSnapshots, {
            ...response,
            request_ordinal: request.ordinal,
            acquisition_product_kind: lane,
            strategy: request.strategy,
            query_text: request.query_text,
            query_filters: request.query_filters,
            offset: request.offset,
            target_hints: request.target_hints,
          }, hashes.rawSnapshots);
          if (!nextState.repeated_page) {
            for (const observation of response.projected_observations ?? []) {
              projectedObservationCount += 1;
              if (observation.source_listing_id) {
                uniqueListings.add(observation.source_listing_id);
                stats.uniqueAccepted[lane].add(observation.source_listing_id);
              }
              countInto(productKindCounts, observation.product_kind);
              for (const flag of observation.ingestion_exclusion_flags ?? []) countInto(exclusionFlagCounts, flag);
              writeJsonLine(streams.projectedObservations, observation, hashes.projectedObservations);
            }
          }
        } catch (error) {
          countInto(fetchStatusCounts, "fetched_error");
          writeJsonLine(streams.requestResults, {
            ordinal: request.ordinal,
            query_key: request.query_key,
            acquisition_product_kind: lane,
            strategy: request.strategy,
            query_text: request.query_text,
            query_filters: request.query_filters,
            offset: request.offset,
            target_hints: request.target_hints,
            fetch_status: "fetched_error",
            response_status: error?.status ?? null,
            reason: error?.message ?? String(error),
            provider_total: 0,
            fetched_item_count: 0,
          }, hashes.requestResults);
        }
        if (logger && progressEvery > 0 && providerCallCount % progressEvery === 0) {
          logger(`[market-listing-warehouse-fetch-v2] ${providerCallCount}/${ceiling} provider calls`);
        }
      }
    }
  } finally {
    await Promise.all(Object.values(streams).map(streamClose));
  }

  const artifacts = {
    request_results_jsonl: path.join(artifactDir, "request_results.jsonl"),
    skipped_requests_jsonl: path.join(artifactDir, "skipped_requests.jsonl"),
    raw_snapshots_jsonl: path.join(artifactDir, "raw_snapshots.jsonl"),
    projected_observations_jsonl: path.join(artifactDir, "projected_observations.jsonl"),
  };
  const manifests = {
    request_results: hashes.requestResults.digest("hex"),
    skipped_requests: hashes.skippedRequests.digest("hex"),
    raw_snapshots: hashes.rawSnapshots.digest("hex"),
    projected_observations: hashes.projectedObservations.digest("hex"),
  };
  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-WAREHOUSE-FETCH-V2",
    source_plan_fingerprint: warehousePlan?.package_fingerprint_sha256 ?? null,
    manifests,
  });
  return {
    package_id: "MARKET-LISTING-ACQUISITION-WAREHOUSE-FETCH-V2",
    version: MARKET_LISTING_ACQUISITION_WAREHOUSE_FETCH_VERSION,
    generated_at: generatedAt,
    mode: "approved_provider_fetch_local_artifacts_only",
    source_package_fingerprint_sha256: warehousePlan?.package_fingerprint_sha256 ?? null,
    source_request_manifest_hash_sha256: warehousePlan?.request_manifest_hash_sha256 ?? null,
    schema_migration_hash_sha256: null,
    package_fingerprint_sha256: packageFingerprint,
    request_results_manifest_hash_sha256: manifests.request_results,
    skipped_requests_manifest_hash_sha256: manifests.skipped_requests,
    raw_snapshot_manifest_hash_sha256: manifests.raw_snapshots,
    projected_observation_manifest_hash_sha256: manifests.projected_observations,
    summary: {
      candidate_request_count: warehousePlan?.acquisition_requests?.length ?? 0,
      processed_candidate_count: processedCandidateCount,
      provider_call_ceiling: ceiling,
      provider_call_count: providerCallCount,
      attempted_request_count: Object.values(fetchStatusCounts).reduce((sum, value) => sum + value, 0),
      fetch_status_counts: sortedObject(fetchStatusCounts),
      fetched_item_count: fetchedItemCount,
      projected_observation_count: projectedObservationCount,
      unique_listing_count: uniqueListings.size,
      product_kind_counts: sortedObject(productKindCounts),
      acquisition_lane_call_counts: sortedObject(stats.calls),
      acquisition_lane_unique_yield: Object.fromEntries(PRODUCT_KINDS.map((kind) => [kind, stats.uniqueAccepted[kind].size])),
      skipped_request_count: Object.values(skippedReasonCounts).reduce((sum, value) => sum + value, 0),
      skipped_reason_counts: sortedObject(skippedReasonCounts),
      exclusion_flag_counts: sortedObject(exclusionFlagCounts),
      canonical_assignment_deferred: true,
    },
    artifacts,
    boundary: {
      provider_calls: findings.length === 0,
      source_fetches: findings.length === 0,
      local_artifacts_only: true,
      db_writes: false,
      canonical_assignment_writes: false,
      card_candidate_writes: false,
      sealed_product_identity_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
    findings,
    ready_for_local_db_backfill_plan: findings.length === 0 && projectedObservationCount > 0,
  };
}
