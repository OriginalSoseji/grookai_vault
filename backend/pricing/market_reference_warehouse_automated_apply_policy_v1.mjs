import { createHash } from "node:crypto";

import { getMarketEvidenceSourceV1 } from "./market_evidence_source_registry_v1.mjs";

export const MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_PACKAGE_ID =
  "MEE-REFERENCE-WAREHOUSE-AUTOMATED-APPLY-V1";

export const MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_CONTRACT_VERSION =
  "MEE_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_POLICY_V1";

export const AUTOMATED_REFERENCE_SOURCES_V1 = Object.freeze([
  "tcgdex_tcgplayer_reference",
  "tcgdex_cardmarket_reference",
  "pokemontcg_io_reference",
  "tcgcsv_reference",
]);

export const AUTOMATED_REFERENCE_TABLES_V1 = Object.freeze([
  "market_reference_acquisition_runs",
  "market_reference_raw_snapshots",
  "market_reference_candidates",
  "market_reference_normalized_evidence",
  "market_reference_coverage_reports",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

export function sha256MarketReferenceAutomatedApplyV1(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function assertSourceSafe(source) {
  const registry = getMarketEvidenceSourceV1(source);
  if (!registry) {
    throw new Error(`[mee-reference-warehouse-apply] unregistered source: ${source}`);
  }
  if (registry.source_type !== "reference_price") {
    throw new Error(`[mee-reference-warehouse-apply] source is not a reference price source: ${source}`);
  }
  if (registry.can_publish_price_directly !== false) {
    throw new Error(`[mee-reference-warehouse-apply] source can publish directly: ${source}`);
  }
  if (registry.requires_review_before_truth !== true) {
    throw new Error(`[mee-reference-warehouse-apply] source is not review gated: ${source}`);
  }
  return registry;
}

export function buildMarketReferenceWarehouseAutomatedApplyPlanV1({
  generatedAt = new Date().toISOString(),
  sources = AUTOMATED_REFERENCE_SOURCES_V1,
} = {}) {
  const uniqueSources = [...new Set(sources.map((source) => String(source ?? "").trim()).filter(Boolean))];
  if (uniqueSources.length === 0) {
    throw new Error("[mee-reference-warehouse-apply] at least one source is required");
  }

  const sourcePolicies = uniqueSources.map((source) => {
    const registry = assertSourceSafe(source);
    return {
      source,
      label: registry.label,
      acquisition_mode: registry.acquisition_mode,
      source_type: registry.source_type,
      truth_role: registry.truth_role,
      can_publish_price_directly: false,
      requires_review_before_truth: true,
      accepted_input_artifacts: source.startsWith("tcgdex_")
        ? ["mee_tcgdex_reference_pricing_audit_*.json"]
        : source === "pokemontcg_io_reference"
          ? ["mee_06a_pokemontcg_io_reference_evidence_*.json", "mee_06c_normalized_reference_evidence_*.json"]
          : ["mee_06b_tcgcsv_reference_evidence_*.json", "mee_06c_normalized_reference_evidence_*.json"],
    };
  });

  const lifecycleStages = [
    {
      stage: "artifact_discovery",
      writes: false,
      rule: "Select the newest successful reference refresh artifacts for each source and record hashes before planning rows.",
    },
    {
      stage: "warehouse_preflight",
      writes: false,
      rule: "Verify source constraints, service-role RLS, public-boundary flags, and duplicate natural keys before insert planning.",
    },
    {
      stage: "row_projection",
      writes: false,
      rule: "Project acquisition, raw snapshot, candidate, normalized evidence, and coverage rows locally with stable hashes.",
    },
    {
      stage: "missing_row_insert",
      writes: true,
      rule: "Future automation may insert only missing rows by natural key. Existing evidence rows are never updated, upserted, deleted, or merged.",
    },
    {
      stage: "assignment_queue_refresh",
      writes: false,
      rule: "Read internal assignment and quality views after warehouse writes; uncertain rows remain queued.",
    },
    {
      stage: "internal_signal_rollup_refresh",
      writes: true,
      rule: "Future automation may append a new internal rollup_version only when all rollup rows remain review-gated and non-public.",
    },
    {
      stage: "publication_gate_recheck",
      writes: false,
      rule: "Re-read publication gate and bridge views. This package never writes public pricing or app-visible rollups.",
    },
  ];

  const idempotency = {
    acquisition_runs: "run_key unique; skip already-present run_key",
    raw_snapshots: "source + source_object_type + source_object_id + payload_hash unique; skip exact duplicate raw payloads",
    candidates: "source + candidate_hash unique; skip exact duplicate candidate rows",
    normalized_evidence: "candidate_id + normalizer_version unique; insert only after candidate_id is resolved",
    coverage_reports: "report_key unique; skip already-present report_key",
    rollups: "rollup_version must be new; preserve old versions for replay",
  };

  const failureGuards = [
    "unsupported_source_constraint",
    "source_registry_boundary_failed",
    "artifact_hash_mismatch",
    "candidate_hash_duplicate_inside_package",
    "raw_snapshot_key_duplicate_inside_package",
    "missing_candidate_id_for_normalized_row",
    "direct_publish_flag_detected",
    "needs_review_false_detected",
    "public_boundary_leak_detected",
    "identity_table_write_detected",
    "price_publication_write_detected",
    "rollup_version_already_exists",
    "readback_count_mismatch",
  ];

  const plan = {
    package_id: MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_PACKAGE_ID,
    generated_at: generatedAt,
    contract_version: MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_CONTRACT_VERSION,
    mode: "plan_only_no_remote_apply",
    objective:
      "Define the nightly-safe path from refreshed free/reference artifacts into internal market_reference warehouse rows, internal assignment/quality views, and non-public signal rollups.",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      remote_apply: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      card_prints_writes: false,
      card_printings_writes: false,
      vault_writes: false,
      image_storage_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    future_automation_boundary: {
      allowed_internal_writes_after_separate_apply_contract: AUTOMATED_REFERENCE_TABLES_V1,
      allowed_rollup_write: "append-only market_reference_signal_rollups with new rollup_version",
      disallowed_forever_in_this_package: [
        "pricing_observations",
        "ebay_active_prices_latest",
        "public pricing views",
        "identity tables",
        "card_prints/card_printings",
        "vault tables",
        "image/storage tables",
      ],
    },
    sources: sourcePolicies,
    lifecycle_stages: lifecycleStages,
    idempotency,
    failure_guards: failureGuards,
    required_readbacks: [
      "docs/sql/mee_reference_warehouse_automated_apply_v1_preflight.sql",
      "docs/sql/mee_reference_warehouse_automated_apply_v1_readback.sql",
      "public.v_market_evidence_normalization_assignment_queue_v1",
      "public.v_market_evidence_candidate_quality_scores_v1",
      "public.v_market_evidence_publication_gate_candidates_v1",
      "public.v_market_evidence_publication_bridge_candidates_v1",
    ],
    nightly_order: [
      "grookai-mee-reference-refresh.timer",
      "future_reference_warehouse_apply_phase",
      "grookai-mee-nightly.timer",
      "grookai-mee-post-ingest.timer",
    ],
    proofs: {
      all_sources_registered: sourcePolicies.length === uniqueSources.length,
      all_sources_review_gated: sourcePolicies.every((source) => source.requires_review_before_truth === true),
      no_source_can_publish_directly: sourcePolicies.every((source) => source.can_publish_price_directly === false),
      no_public_boundary_write_in_plan: true,
      coverage_strategy_outside_contract: true,
    },
  };

  return {
    ...plan,
    package_fingerprint_sha256: sha256MarketReferenceAutomatedApplyV1(plan),
  };
}
