import { getMarketEvidenceSourceV1 } from "./market_evidence_source_registry_v1.mjs";

export const MARKET_EVIDENCE_SOURCE_REFRESH_POLICY_VERSION_V1 =
  "MEE_SOURCE_REFRESH_LAYER_V1";

const SOURCE_REFRESH_ADAPTERS = Object.freeze([
  Object.freeze({
    source: "ebay_active",
    lane: "active_listing",
    cadence: "daily",
    provider_calls: true,
    db_writes: true,
    default_enabled: true,
    command: "node scripts/audits/market_listing_nightly_ingest_run_v1.mjs --run",
    downstream: ["lifecycle_projection", "assignment_queue", "quality_gate"],
  }),
  Object.freeze({
    source: "tcgdex_tcgplayer_reference",
    lane: "free_reference",
    cadence: "daily",
    provider_calls: false,
    db_writes: false,
    default_enabled: true,
    command: "node scripts/audits/market_reference_tcgdex_pricing_audit_v1.mjs --write-row-manifests",
    downstream: ["reference_normalization", "reference_warehouse_automated_apply_plan", "assignment_queue", "quality_gate"],
  }),
  Object.freeze({
    source: "tcgdex_cardmarket_reference",
    lane: "free_reference",
    cadence: "daily",
    provider_calls: false,
    db_writes: false,
    default_enabled: true,
    command: "node scripts/audits/market_reference_tcgdex_pricing_audit_v1.mjs --write-row-manifests",
    downstream: ["reference_normalization", "reference_warehouse_automated_apply_plan", "assignment_queue", "quality_gate"],
  }),
  Object.freeze({
    source: "pokemontcg_io_reference",
    lane: "free_reference",
    cadence: "daily",
    provider_calls: true,
    db_writes: false,
    default_enabled: true,
    command: "node scripts/audits/market_evidence_engine_pokemontcg_io_reference_acquisition_v1.mjs",
    downstream: ["reference_normalization", "reference_warehouse_automated_apply_plan", "assignment_queue", "quality_gate"],
  }),
  Object.freeze({
    source: "tcgcsv_reference",
    lane: "free_reference",
    cadence: "daily",
    provider_calls: true,
    db_writes: false,
    default_enabled: true,
    command: "node scripts/audits/market_evidence_engine_tcgcsv_reference_acquisition_v1.mjs --refresh-cache",
    downstream: ["reference_normalization", "reference_warehouse_automated_apply_plan", "assignment_queue", "quality_gate"],
  }),
  Object.freeze({
    source: "pricecharting_reference",
    lane: "licensed_reference",
    cadence: "operator_supplied",
    provider_calls: false,
    db_writes: false,
    default_enabled: false,
    command: null,
    downstream: ["reference_normalization", "reference_warehouse_automated_apply_plan", "assignment_queue", "quality_gate"],
  }),
]);

const REFERENCE_LIMIT_SOURCES = new Set([
  "pokemontcg_io_reference",
  "tcgcsv_reference",
]);

function normalizeSources(sources) {
  if (sources === null || sources === undefined) {
    return SOURCE_REFRESH_ADAPTERS.filter((adapter) => adapter.default_enabled).map((adapter) => adapter.source);
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error("[mee-source-refresh] sources must be a non-empty array");
  }
  return sources.map((source) => String(source ?? "").trim()).filter(Boolean);
}

function assertAdapterSafe(adapter) {
  const registryEntry = getMarketEvidenceSourceV1(adapter.source);
  if (!registryEntry) {
    throw new Error(`[mee-source-refresh] source is not registered: ${adapter.source}`);
  }
  if (registryEntry.can_publish_price_directly !== false) {
    throw new Error(`[mee-source-refresh] source cannot publish directly: ${adapter.source}`);
  }
  if (registryEntry.requires_review_before_truth !== true) {
    throw new Error(`[mee-source-refresh] source must remain review-gated: ${adapter.source}`);
  }
  return true;
}

export function getMarketEvidenceSourceRefreshAdaptersV1() {
  return SOURCE_REFRESH_ADAPTERS.map((adapter) => ({ ...adapter }));
}

export function buildMarketEvidenceSourceRefreshPlanV1({
  sources,
  generatedAt = new Date().toISOString(),
  allowProviderCalls = false,
  allowDbWrites = false,
  referenceLimit = 5000,
} = {}) {
  if (!Number.isInteger(referenceLimit) || referenceLimit < 1) {
    throw new Error("[mee-source-refresh] referenceLimit must be a positive integer");
  }
  const selectedSources = new Set(normalizeSources(sources));
  const adapters = SOURCE_REFRESH_ADAPTERS
    .filter((adapter) => selectedSources.has(adapter.source))
    .map((adapter) => {
      assertAdapterSafe(adapter);
      const command = adapter.command && REFERENCE_LIMIT_SOURCES.has(adapter.source)
        ? `${adapter.command} --limit=${referenceLimit}`
        : adapter.command;
      return {
        ...adapter,
        command,
        status: adapter.command ? "planned" : "manual_or_licensed_input_required",
        effective_provider_calls: allowProviderCalls && adapter.provider_calls,
        effective_db_writes: allowDbWrites && adapter.db_writes,
        can_publish_price_directly: false,
        requires_review_before_truth: true,
      };
    });

  const unknownSources = [...selectedSources].filter(
    (source) => !SOURCE_REFRESH_ADAPTERS.some((adapter) => adapter.source === source),
  );
  if (unknownSources.length > 0) {
    throw new Error(`[mee-source-refresh] unknown refresh sources: ${unknownSources.join(", ")}`);
  }

  return {
    generated_at: generatedAt,
    package_id: "MEE-SOURCE-REFRESH-LAYER-V1",
    contract: "MARKET_EVIDENCE_ENGINE_CORE_V1",
    policy_version: MARKET_EVIDENCE_SOURCE_REFRESH_POLICY_VERSION_V1,
    mode: "internal_source_refresh_plan",
    boundary: {
      provider_calls: adapters.some((adapter) => adapter.effective_provider_calls),
      source_fetches: adapters.some((adapter) => adapter.effective_provider_calls),
      db_writes: adapters.some((adapter) => adapter.effective_db_writes),
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_storage_writes: false,
      migrations: false,
      global_apply: false,
    },
    summary: {
      adapter_count: adapters.length,
      provider_call_adapter_count: adapters.filter((adapter) => adapter.provider_calls).length,
      db_write_adapter_count: adapters.filter((adapter) => adapter.db_writes).length,
      enabled_free_reference_adapter_count: adapters.filter((adapter) => adapter.lane === "free_reference").length,
      reference_limit: referenceLimit,
    },
    adapters,
    required_downstream_readbacks: [
      "v_market_evidence_normalization_assignment_queue_v1",
      "v_market_evidence_candidate_quality_scores_v1",
      "v_market_evidence_publication_gate_candidates_v1",
    ],
    proofs: {
      all_sources_registered: adapters.every((adapter) => Boolean(getMarketEvidenceSourceV1(adapter.source))),
      all_sources_review_gated: adapters.every((adapter) => adapter.requires_review_before_truth === true),
      no_source_can_publish_directly: adapters.every((adapter) => adapter.can_publish_price_directly === false),
      public_boundary_closed: true,
    },
  };
}
