import { createHash } from "node:crypto";

export const MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_VERSION = "MEE_11G_MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_V1";
export const EXPECTED_MEE_11F_PACKAGE_FINGERPRINT = "52388b720c74445b5ce6dfb48e712dbedddb15347a5497c73a68437e050a2f7a";
export const EXPECTED_MEE_11F_RAW_SNAPSHOT_MANIFEST_HASH = "eeeee0cdaeb616b54ed1c758196ad85d5f502542f85db9c632e026255cfbe455";
export const EXPECTED_MEE_11F_OBSERVATION_MANIFEST_HASH = "60fa0344b78b753b77c7fb3ac7fd3d99eceee428cfba8fd89382bf6aa84ad51f";
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

export function sha256V1(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function deterministicUuid(input) {
  const hash = sha256V1(input);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

function duplicateCount(rows, getKey) {
  const seen = new Set();
  let duplicates = 0;
  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
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
  return item?.seller?.username ?? null;
}

function observationByListingId(smokeArtifact) {
  const byId = new Map();
  for (const observation of smokeArtifact.projected_observations ?? []) {
    if (observation.source_listing_id) byId.set(observation.source_listing_id, observation);
  }
  return byId;
}

function buildRunRow(smokeArtifact, generatedAt) {
  const runKey = `MEE-11F-BROAD-INTAKE-SMOKE-${smokeArtifact.package_fingerprint_sha256.slice(0, 12)}`;
  return {
    id: deterministicUuid(`market_listing_acquisition_run:${runKey}`),
    run_key: runKey,
    contract_version: MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_VERSION,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    acquisition_strategy: "broad_pokemon_single_card_intake_smoke",
    status: "completed",
    requested_call_ceiling: smokeArtifact.summary?.query_count ?? 0,
    consumed_call_count: smokeArtifact.summary?.query_count ?? 0,
    requested_listing_ceiling: (smokeArtifact.summary?.query_count ?? 0) * (smokeArtifact.summary?.result_limit ?? 0),
    observed_listing_count: smokeArtifact.summary?.projected_observation_count ?? 0,
    cached_query_count: 0,
    error_count: smokeArtifact.summary?.fetch_status_counts?.fetched_error ?? 0,
    options: {
      smoke_package_id: smokeArtifact.package_id,
      smoke_package_fingerprint: smokeArtifact.package_fingerprint_sha256,
      raw_snapshot_manifest_hash: smokeArtifact.raw_snapshot_manifest_hash_sha256,
      projected_observation_manifest_hash: smokeArtifact.projected_observation_manifest_hash_sha256,
      request_limit: smokeArtifact.summary?.request_limit ?? null,
      result_limit: smokeArtifact.summary?.result_limit ?? null,
    },
    summary: smokeArtifact.summary ?? {},
    artifact_paths: [],
    artifact_hashes: [
      smokeArtifact.package_fingerprint_sha256,
      smokeArtifact.raw_snapshot_manifest_hash_sha256,
      smokeArtifact.projected_observation_manifest_hash_sha256,
    ].filter(Boolean),
    started_at: smokeArtifact.generated_at ?? generatedAt,
    finished_at: smokeArtifact.generated_at ?? generatedAt,
    created_at: generatedAt,
  };
}

function buildQueryCacheRows(smokeArtifact, acquisitionRunId, generatedAt) {
  return (smokeArtifact.request_results ?? []).map((result) => ({
    id: deterministicUuid(`market_listing_query_cache:${result.query_key}`),
    acquisition_run_id: acquisitionRunId,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    query_key: result.query_key,
    query_text: result.query_text,
    query_filters: {
      category_ids: ["183454"],
      limit: smokeArtifact.summary?.result_limit ?? null,
      fieldgroups: ["MATCHING_ITEMS"],
      negative_terms_in_query: true,
    },
    target_hints: {
      strategy: result.strategy,
      broad_intake: true,
      card_matching_deferred: true,
    },
    page_cursor: null,
    result_count: result.fetched_item_count ?? 0,
    response_hash: result.payload_hash ?? null,
    cache_status: "fresh",
    observed_at: smokeArtifact.generated_at ?? generatedAt,
    expires_at: null,
    created_at: generatedAt,
  }));
}

function buildRowsFromItems(smokeArtifact, acquisitionRunId, queryCacheRows, generatedAt) {
  const observationsById = observationByListingId(smokeArtifact);
  const queryCacheByKey = new Map(queryCacheRows.map((row) => [row.query_key, row]));
  const rawSnapshotRows = [];
  const observationRows = [];
  const sellerRows = [];
  const priceEventRows = [];
  const sellerKeys = new Set();

  for (const response of smokeArtifact.raw_snapshots ?? []) {
    const queryCache = queryCacheByKey.get(response.query_key);
    for (const item of response.raw_payload?.itemSummaries ?? []) {
      const listingId = sourceListingId(item);
      if (!listingId) continue;

      const observation = observationsById.get(listingId);
      const rawSnapshotId = deterministicUuid(`market_listing_raw_snapshot:${response.query_key}:${listingId}:${response.payload_hash}`);
      const observationId = deterministicUuid(`market_listing_observation:${listingId}:${response.query_key}`);
      const observedAt = observation?.observed_at ?? smokeArtifact.generated_at ?? generatedAt;
      const sellerKey = observation?.seller_key ?? sellerKeyFromItem(item);

      rawSnapshotRows.push({
        id: rawSnapshotId,
        acquisition_run_id: acquisitionRunId,
        query_cache_id: queryCache?.id ?? null,
        source: "ebay_active",
        provider_route: "ebay_browse_api",
        source_listing_id: listingId,
        source_url: observation?.source_url ?? itemUrl(item),
        raw_payload: item,
        payload_hash: sha256V1(item),
        observed_at: observedAt,
        ingested_at: generatedAt,
        created_at: generatedAt,
      });

      observationRows.push({
        id: observationId,
        raw_snapshot_id: rawSnapshotId,
        acquisition_run_id: acquisitionRunId,
        query_cache_id: queryCache?.id ?? null,
        source: "ebay_active",
        source_listing_id: listingId,
        listing_url: observation?.source_url ?? itemUrl(item),
        listing_title: observation?.listing_title ?? item?.title ?? "",
        listing_status: "active",
        listing_format: observation?.listing_format ?? "unknown",
        ask_price: observation?.ask_price ?? safeNumber(item?.price?.value),
        shipping_price: observation?.shipping_price ?? shippingPrice(item),
        total_ask_price: observation?.total_ask_price ?? null,
        currency: observation?.currency ?? item?.price?.currency ?? null,
        quantity_available: null,
        quantity_sold: null,
        condition_text: observation?.condition_text ?? item?.condition ?? null,
        item_location: observation?.item_location ?? item?.itemLocation?.country ?? null,
        seller_key: sellerKey,
        observed_at: observedAt,
        created_at: generatedAt,
      });

      if (sellerKey) {
        const sellerUniqueKey = `${sellerKey}:${observedAt}`;
        if (!sellerKeys.has(sellerUniqueKey)) {
          sellerKeys.add(sellerUniqueKey);
          sellerRows.push({
            id: deterministicUuid(`market_listing_seller_snapshot:${sellerUniqueKey}`),
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
          });
        }
      }

      priceEventRows.push({
        id: deterministicUuid(`market_listing_price_event:first_seen:${listingId}:${response.query_key}`),
        observation_id: observationId,
        source: "ebay_active",
        source_listing_id: listingId,
        event_type: "first_seen",
        previous_observation_id: null,
        previous_total_ask_price: null,
        current_total_ask_price: observation?.total_ask_price ?? null,
        currency: observation?.currency ?? item?.price?.currency ?? null,
        event_payload: {
          broad_intake_query: observation?.broad_intake_query ?? null,
          ingestion_exclusion_flags: observation?.ingestion_exclusion_flags ?? [],
          listing_evidence_class: observation?.listing_evidence_class ?? null,
          listing_evidence_tags: observation?.listing_evidence_tags ?? [],
          slab_features: observation?.slab_features ?? null,
          provider_total_for_query: response.provider_total ?? null,
        },
        observed_at: observedAt,
        created_at: generatedAt,
      });
    }
  }

  return {
    rawSnapshotRows,
    observationRows,
    sellerRows,
    priceEventRows,
  };
}

export function buildMarketListingBroadIntakeBackfillPlanRowsV1({
  smokeArtifact,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!smokeArtifact || typeof smokeArtifact !== "object") {
    throw new Error("[market-listing-broad-backfill-plan] smokeArtifact is required");
  }
  if (!Array.isArray(smokeArtifact.raw_snapshots)) {
    throw new Error("[market-listing-broad-backfill-plan] smokeArtifact.raw_snapshots must be an array");
  }

  const acquisitionRunRow = buildRunRow(smokeArtifact, generatedAt);
  const queryCacheRows = buildQueryCacheRows(smokeArtifact, acquisitionRunRow.id, generatedAt);
  const itemRows = buildRowsFromItems(smokeArtifact, acquisitionRunRow.id, queryCacheRows, generatedAt);

  return {
    acquisitionRunRows: [acquisitionRunRow],
    queryCacheRows,
    rawSnapshotRows: itemRows.rawSnapshotRows,
    observationRows: itemRows.observationRows,
    sellerSnapshotRows: itemRows.sellerRows,
    priceEventRows: itemRows.priceEventRows,
    cardCandidateRows: [],
    rollupRows: [],
  };
}

export function buildMarketListingBroadIntakeBackfillPlanV1({
  smokeArtifact,
  packageFingerprint = smokeArtifact?.package_fingerprint_sha256,
  rawSnapshotManifestHash = smokeArtifact?.raw_snapshot_manifest_hash_sha256,
  projectedObservationManifestHash = smokeArtifact?.projected_observation_manifest_hash_sha256,
  schemaMigrationHash = EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
  generatedAt = new Date().toISOString(),
} = {}) {
  const rows = buildMarketListingBroadIntakeBackfillPlanRowsV1({ smokeArtifact, generatedAt });
  const findings = [];

  if (packageFingerprint !== EXPECTED_MEE_11F_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (rawSnapshotManifestHash !== EXPECTED_MEE_11F_RAW_SNAPSHOT_MANIFEST_HASH) findings.push("raw_snapshot_manifest_hash_mismatch");
  if (projectedObservationManifestHash !== EXPECTED_MEE_11F_OBSERVATION_MANIFEST_HASH) findings.push("projected_observation_manifest_hash_mismatch");
  if (schemaMigrationHash !== EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (smokeArtifact?.ready_for_broad_backfill_plan !== true) findings.push("smoke_artifact_not_ready");
  if ((smokeArtifact?.findings ?? []).length > 0) findings.push("smoke_artifact_contains_findings");
  if (rows.rawSnapshotRows.length !== (smokeArtifact?.summary?.projected_observation_count ?? -1)) findings.push("raw_snapshot_listing_count_mismatch");
  if (rows.observationRows.length !== rows.rawSnapshotRows.length) findings.push("observation_count_mismatch");
  if (rows.priceEventRows.length !== rows.observationRows.length) findings.push("price_event_count_mismatch");
  if (duplicateCount(rows.rawSnapshotRows, (row) => `${row.query_cache_id}:${row.source}:${row.source_listing_id}:${row.payload_hash}`) > 0) findings.push("raw_snapshot_duplicate_payloads_detected");
  if (duplicateCount(rows.observationRows, (row) => row.raw_snapshot_id) > 0) findings.push("observation_duplicate_raw_snapshot_detected");
  if (rows.observationRows.some((row) => row.source !== "ebay_active")) findings.push("unexpected_observation_source");
  if (rows.cardCandidateRows.length > 0) findings.push("card_candidates_should_not_be_created_for_broad_intake");
  if (rows.rollupRows.length > 0) findings.push("rollups_should_not_be_created_for_broad_intake");

  const rowManifestHash = sha256V1({
    acquisitionRunRows: rows.acquisitionRunRows,
    queryCacheRows: rows.queryCacheRows,
    rawSnapshotRows: rows.rawSnapshotRows.map((row) => ({
      id: row.id,
      source_listing_id: row.source_listing_id,
      payload_hash: row.payload_hash,
      query_cache_id: row.query_cache_id,
    })),
    observationRows: rows.observationRows.map((row) => ({
      id: row.id,
      source_listing_id: row.source_listing_id,
      listing_title: row.listing_title,
      total_ask_price: row.total_ask_price,
      currency: row.currency,
      raw_snapshot_id: row.raw_snapshot_id,
    })),
    sellerSnapshotRows: rows.sellerSnapshotRows,
    priceEventRows: rows.priceEventRows,
  });

  const packagePlanFingerprint = sha256V1({
    package_id: "MARKET-LISTING-BROAD-INTAKE-BACKFILL-PLAN-V1",
    version: MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_VERSION,
    source_package_fingerprint: packageFingerprint,
    raw_snapshot_manifest_hash: rawSnapshotManifestHash,
    projected_observation_manifest_hash: projectedObservationManifestHash,
    schema_migration_hash: schemaMigrationHash,
    row_manifest_hash: rowManifestHash,
    row_counts: {
      acquisition_run_rows: rows.acquisitionRunRows.length,
      query_cache_rows: rows.queryCacheRows.length,
      raw_snapshot_rows: rows.rawSnapshotRows.length,
      observation_rows: rows.observationRows.length,
      seller_snapshot_rows: rows.sellerSnapshotRows.length,
      price_event_rows: rows.priceEventRows.length,
      card_candidate_rows: rows.cardCandidateRows.length,
      rollup_rows: rows.rollupRows.length,
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      public_pricing: false,
    },
  });

  return {
    package_id: "MARKET-LISTING-BROAD-INTAKE-BACKFILL-PLAN-V1",
    version: MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "db_backfill_plan_only_no_writes",
    source_package_fingerprint_sha256: packageFingerprint,
    expected_source_package_fingerprint_sha256: EXPECTED_MEE_11F_PACKAGE_FINGERPRINT,
    raw_snapshot_manifest_hash_sha256: rawSnapshotManifestHash,
    expected_raw_snapshot_manifest_hash_sha256: EXPECTED_MEE_11F_RAW_SNAPSHOT_MANIFEST_HASH,
    projected_observation_manifest_hash_sha256: projectedObservationManifestHash,
    expected_projected_observation_manifest_hash_sha256: EXPECTED_MEE_11F_OBSERVATION_MANIFEST_HASH,
    schema_migration_hash_sha256: schemaMigrationHash,
    expected_schema_migration_hash_sha256: EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH,
    package_fingerprint_sha256: packagePlanFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    proposed_table_row_counts: {
      market_listing_acquisition_runs: rows.acquisitionRunRows.length,
      market_listing_query_cache: rows.queryCacheRows.length,
      market_listing_raw_snapshots: rows.rawSnapshotRows.length,
      market_listing_observations: rows.observationRows.length,
      market_listing_seller_snapshots: rows.sellerSnapshotRows.length,
      market_listing_price_events: rows.priceEventRows.length,
      market_listing_card_candidates: rows.cardCandidateRows.length,
      market_listing_rollups: rows.rollupRows.length,
    },
    counts: {
      observation_currency_counts: countBy(rows.observationRows, (row) => row.currency),
      observation_condition_counts: countBy(rows.observationRows, (row) => row.condition_text),
      seller_snapshot_count: rows.sellerSnapshotRows.length,
      clean_observation_count: smokeArtifact?.summary?.clean_observation_count ?? null,
      exclusion_flag_counts: smokeArtifact?.summary?.exclusion_flag_counts ?? {},
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
    ready_for_apply_approval: findings.length === 0,
    rows,
  };
}
