import { createHash } from "node:crypto";

import {
  fetchEbayBrowseSummary,
  MAX_EBAY_BROWSE_RESULT_LIMIT,
} from "./market_listing_acquisition_smoke_fetch_v1.mjs";
import { classifyMarketListingEvidence } from "./market_listing_evidence_classification_v1.mjs";

export const MARKET_LISTING_BROAD_INTAKE_SMOKE_VERSION = "MEE_11F_MARKET_LISTING_BROAD_INTAKE_SMOKE_V1";

export const DEFAULT_BROAD_QUERIES = Object.freeze([
  "pokemon card single -bulk -lot -proxy -custom -jumbo -code",
  "pokemon holo card -bulk -lot -proxy -custom -jumbo -code",
  "pokemon promo card -bulk -lot -proxy -custom -jumbo -code",
  "pokemon trainer card -bulk -lot -proxy -custom -jumbo -code",
  "pokemon ex card -bulk -lot -proxy -custom -jumbo -code",
  "pokemon graded card psa cgc bgs -bulk -lot -proxy -custom -jumbo -code",
]);

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

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function requestForQuery(queryText, ordinal, { offset = 0, resultLimit = 5 } = {}) {
  const queryKey = sha256({
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    strategy: "broad_pokemon_single_card_intake",
    query_text: queryText,
    offset,
    result_limit: resultLimit,
  });
  return {
    ordinal,
    query_key: queryKey,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    card_print_id: null,
    gv_id: `BROAD-POKEMON-INTAKE-${String(ordinal).padStart(3, "0")}`,
    strategy: "broad_pokemon_single_card_intake",
    query_text: queryText,
    offset,
    needs_review: true,
    can_publish_price_directly: false,
    market_truth: false,
    app_visible: false,
  };
}

function buildPagedRequests(queries, requestLimit, resultLimit) {
  const requests = [];
  const pageCount = Math.ceil(requestLimit / queries.length);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const offset = pageIndex * resultLimit;
    for (const queryText of queries) {
      if (requests.length >= requestLimit) return requests;
      requests.push(requestForQuery(queryText, requests.length + 1, { offset, resultLimit }));
    }
  }
  return requests;
}

export async function buildMarketListingBroadIntakeSmokeReportV1({
  queries = DEFAULT_BROAD_QUERIES,
  requestsOverride = null,
  requestLimit = 5,
  resultLimit = 5,
  generatedAt = new Date().toISOString(),
  fetchListing = fetchEbayBrowseSummary,
} = {}) {
  const cappedRequestLimit = Math.max(1, Math.min(Number(requestLimit) || 5, 100));
  const cappedResultLimit = Math.max(1, Math.min(Number(resultLimit) || 5, MAX_EBAY_BROWSE_RESULT_LIMIT));
  const requests = Array.isArray(requestsOverride)
    ? requestsOverride.slice(0, cappedRequestLimit)
    : buildPagedRequests(queries, cappedRequestLimit, cappedResultLimit);
  const findings = [];
  const requestResults = [];
  const rawSnapshots = [];
  const projectedObservations = [];

  for (const request of requests) {
    try {
      const response = await fetchListing(request, {
        resultLimit: cappedResultLimit,
        observedAt: generatedAt,
      });
      const observations = response.projected_observations.map((observation) => ({
        ...observation,
        ...classifyMarketListingEvidence({
          title: observation.listing_title,
          conditionText: observation.condition_text,
        }),
        broad_intake_query: request.query_text,
        broad_intake_offset: request.offset,
      }));
      requestResults.push({
        query_key: request.query_key,
        strategy: request.strategy,
        query_text: request.query_text,
        offset: request.offset,
        fetch_status: "fetched_success",
        response_status: response.response_status,
        provider_total: response.provider_total,
        fetched_item_count: response.fetched_item_count,
        payload_hash: response.payload_hash,
      });
      rawSnapshots.push({
        ...response,
        offset: request.offset,
        projected_observations: observations,
      });
      projectedObservations.push(...observations);
    } catch (error) {
      requestResults.push({
        query_key: request.query_key,
        strategy: request.strategy,
        query_text: request.query_text,
        offset: request.offset,
        fetch_status: "fetched_error",
        response_status: error?.status ?? null,
        reason: error?.message ?? String(error),
        provider_total: 0,
        fetched_item_count: 0,
      });
    }
  }

  const rawSnapshotManifestHash = sha256(rawSnapshots.map((snapshot) => ({
    query_key: snapshot.query_key,
    source_fetch_url: snapshot.source_fetch_url,
    response_status: snapshot.response_status,
    provider_total: snapshot.provider_total,
    fetched_item_count: snapshot.fetched_item_count,
    payload_hash: snapshot.payload_hash,
  })));
  const observationManifestHash = sha256(projectedObservations.map((observation) => ({
    source_listing_id: observation.source_listing_id,
    listing_title: observation.listing_title,
    total_ask_price: observation.total_ask_price,
    currency: observation.currency,
    flags: observation.ingestion_exclusion_flags,
    listing_evidence_class: observation.listing_evidence_class,
    listing_evidence_tags: observation.listing_evidence_tags,
  })));
  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-BROAD-INTAKE-SMOKE-V1",
    version: MARKET_LISTING_BROAD_INTAKE_SMOKE_VERSION,
    requests: requests.map((request) => ({
      query_text: request.query_text,
      offset: request.offset,
    })),
    request_limit: cappedRequestLimit,
    result_limit: cappedResultLimit,
    raw_snapshot_manifest_hash: rawSnapshotManifestHash,
    observation_manifest_hash: observationManifestHash,
    boundary: {
      local_artifacts_only: true,
      db_writes: false,
      market_listing_writes: false,
      pricing_observations_writes: false,
      public_pricing: false,
    },
  });

  return {
    package_id: "MARKET-LISTING-BROAD-INTAKE-SMOKE-V1",
    version: MARKET_LISTING_BROAD_INTAKE_SMOKE_VERSION,
    generated_at: generatedAt,
    mode: "broad_provider_fetch_local_artifacts_only",
    package_fingerprint_sha256: packageFingerprint,
    raw_snapshot_manifest_hash_sha256: rawSnapshotManifestHash,
    projected_observation_manifest_hash_sha256: observationManifestHash,
    summary: {
      query_count: requests.length,
      request_limit: cappedRequestLimit,
      result_limit: cappedResultLimit,
      max_offset: Math.max(...requests.map((request) => request.offset)),
      fetch_status_counts: countBy(requestResults, (result) => result.fetch_status),
      provider_total_sum: requestResults.reduce((sum, result) => sum + (result.provider_total ?? 0), 0),
      fetched_item_count: rawSnapshots.reduce((sum, snapshot) => sum + snapshot.fetched_item_count, 0),
      projected_observation_count: projectedObservations.length,
      unique_listing_count: new Set(projectedObservations.map((observation) => observation.source_listing_id).filter(Boolean)).size,
      exclusion_flag_counts: countBy(projectedObservations.flatMap((observation) => observation.ingestion_exclusion_flags), (flag) => flag),
      evidence_class_counts: countBy(projectedObservations, (observation) => observation.listing_evidence_class),
      clean_observation_count: projectedObservations.filter((observation) => observation.ingestion_exclusion_flags.length === 0).length,
      slab_observation_count: projectedObservations.filter((observation) => observation.listing_evidence_class === "slab").length,
    },
    boundary: {
      provider_calls: true,
      source_fetches: true,
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
    request_results: requestResults,
    raw_snapshots: rawSnapshots,
    projected_observations: projectedObservations,
    findings,
    ready_for_broad_backfill_plan: findings.length === 0 && rawSnapshots.length > 0,
  };
}
