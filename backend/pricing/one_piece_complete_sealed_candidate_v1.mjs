import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_ST01_UUID_NAMESPACE,
} from "./one_piece_st01_canonical_promotion_v1.mjs";

export const ONE_PIECE_COMPLETE_SEALED_CANDIDATE_VERSION =
  "ONE_PIECE_COMPLETE_SEALED_CANDIDATE_WAREHOUSE_V1";
export const ONE_PIECE_COMPLETE_SEALED_EXPECTED = Object.freeze({
  source_products: 403,
  english_products: 400,
  japanese_products: 3,
  current_release_products: 393,
  future_or_presale_products: 10,
  products_with_price_lanes: 363,
  products_without_price_lanes: 40,
  candidate_rows: 403,
  family_rows: 0,
  variant_rows: 0,
  review_rows: 0,
  mapping_rows: 0,
  evidence_rows: 0,
  pricing_rows: 0,
  release_rows: 0,
  release_member_rows: 0,
  release_pointer_rows: 0,
});
export const ONE_PIECE_COMPLETE_SEALED_PINNED_INPUTS = Object.freeze({
  source_manifest_gzip_sha256:
    "973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e",
  reconciliation_summary_sha256:
    "830418974b7eea09ce92f9197d0b39f643b40bd79029fcc4a84ed4e1f09d72f3",
  sealed_lane_sha256:
    "c2516e5396745c8b37ecc979b32c2045033656510479a60cc686be25259f54c4",
});

function candidateId(row) {
  return deterministicUuidV5(
    `one-piece:sealed-candidate:${row.source_product_id}:${row.source_payload_hash}`,
    ONE_PIECE_ST01_UUID_NAMESPACE,
  );
}

function buildCandidate(row) {
  const ambiguity = ["human_review_required_before_canonical_family_or_variant_promotion"];
  if (row.language?.normalized !== "en") ambiguity.push("explicit_non_english_source");
  if (row.release?.future_release || row.release?.explicit_presale) {
    ambiguity.push("future_or_presale_source");
  }
  return {
    id: candidateId(row),
    source_provider: "tcgplayer",
    source_category_id: Number(row.source_category_id),
    source_group_id: Number(row.source_group_id),
    source_product_id: Number(row.source_product_id),
    source_product_name: row.source_product_name,
    source_payload_hash: row.source_payload_hash,
    classifier_version: ONE_PIECE_COMPLETE_SEALED_CANDIDATE_VERSION,
    classification: "sealed_candidate",
    confidence: 0.9,
    evidence: [{
      evidence_class: "source_manifest_classification",
      classification_reasons: row.classification_reasons,
      sealed_signals: row.product_signals?.sealed ?? [],
      source_active: row.source_active,
    }, {
      evidence_class: "source_locale_and_release",
      language: row.language,
      release: row.release,
    }, {
      evidence_class: "reference_only_assets_and_price_lanes",
      source_image_reference_only: row.source_image_reference,
      source_image_pointer_authorized: false,
      source_price_lanes: row.source_price_lanes,
      pricing_publication_authorized: false,
    }],
    candidate_identity: {
      game_key: "one_piece",
      source_product_identity: {
        provider: "tcgplayer",
        category_id: Number(row.source_category_id),
        group_id: Number(row.source_group_id),
        group_name: row.source_group_name,
        product_id: Number(row.source_product_id),
        product_name: row.source_product_name,
      },
      language: row.language,
      release: row.release,
      sealed_signals: row.product_signals?.sealed ?? [],
      canonical_family: null,
      canonical_variant: null,
    },
    ambiguity_reasons: ambiguity,
    requires_review: true,
    promotion_eligible: false,
    canonical_authority: false,
    publication_authority: false,
  };
}

export function buildOnePieceCompleteSealedCandidatePlanV1(input) {
  if (stableJson(input.inputHashes) !==
      stableJson(ONE_PIECE_COMPLETE_SEALED_PINNED_INPUTS)) {
    throw new Error("Pinned sealed candidate inputs changed");
  }
  const rows = (input.manifestRows ?? []).filter((row) =>
    row.classification === "sealed_product_candidate").sort((left, right) =>
    Number(left.source_product_id) - Number(right.source_product_id));
  const laneIds = (input.sealedLane ?? []).map((row) =>
    Number(row.source_product_id)).sort((a, b) => a - b);
  if (stableJson(laneIds) !== stableJson(rows.map((row) =>
    Number(row.source_product_id)))) {
    throw new Error("Sealed reconciliation lane does not match source manifest");
  }
  const candidates = rows.map(buildCandidate);
  const counts = {
    source_products: rows.length,
    english_products: rows.filter((row) => row.language?.normalized === "en").length,
    japanese_products: rows.filter((row) => row.language?.normalized === "ja").length,
    current_release_products: rows.filter((row) =>
      row.release?.current_release_eligible).length,
    future_or_presale_products: rows.filter((row) =>
      row.release?.future_release || row.release?.explicit_presale).length,
    products_with_price_lanes: rows.filter((row) =>
      (row.source_price_lanes ?? []).length > 0).length,
    products_without_price_lanes: rows.filter((row) =>
      (row.source_price_lanes ?? []).length === 0).length,
    candidate_rows: candidates.length,
    family_rows: 0,
    variant_rows: 0,
    review_rows: 0,
    mapping_rows: 0,
    evidence_rows: 0,
    pricing_rows: 0,
    release_rows: 0,
    release_member_rows: 0,
    release_pointer_rows: 0,
  };
  const payload = { candidates };
  const core = {
    version: ONE_PIECE_COMPLETE_SEALED_CANDIDATE_VERSION,
    repository: input.repository,
    input_hashes: input.inputHashes,
    counts,
    payload_fingerprint_sha256: sha256(stableJson(payload)),
    payload,
    boundaries: {
      candidate_warehouse_only: true,
      database_connections: 0,
      database_writes: 0,
      family_writes: 0,
      variant_writes: 0,
      review_writes: 0,
      mapping_writes: 0,
      evidence_writes: 0,
      pricing_writes: 0,
      release_writes: 0,
      release_pointer_writes: 0,
      card_writes: 0,
      storage_writes: 0,
      publication_writes: 0,
      app_visibility_enabled: false,
    },
  };
  return { ...core, plan_fingerprint_sha256: sha256(stableJson(core)) };
}

export function validateOnePieceCompleteSealedCandidatePlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_COMPLETE_SEALED_CANDIDATE_VERSION,
    "version_mismatch");
  add(plan?.plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "plan_fingerprint_mismatch");
  add(plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload)),
    "payload_fingerprint_mismatch");
  add(stableJson(plan?.input_hashes) !==
    stableJson(ONE_PIECE_COMPLETE_SEALED_PINNED_INPUTS), "input_hashes_mismatch");
  add(stableJson(plan?.counts) !== stableJson(ONE_PIECE_COMPLETE_SEALED_EXPECTED),
    "counts_mismatch");
  const candidates = plan?.payload?.candidates ?? [];
  for (const [label, values] of [
    ["candidate_id", candidates.map((row) => row.id)],
    ["source_product", candidates.map((row) => row.source_product_id)],
    ["source_payload", candidates.map((row) =>
      `${row.source_product_id}:${row.source_payload_hash}`)],
  ]) add(new Set(values).size !== candidates.length, `duplicate_${label}`);
  for (const row of candidates) {
    const prefix = String(row.source_product_id);
    add(row.source_provider !== "tcgplayer" ||
      row.classification !== "sealed_candidate", `source_shape:${prefix}`);
    add(row.requires_review !== true || row.promotion_eligible !== false ||
      row.canonical_authority !== false || row.publication_authority !== false,
    `authority_overclaim:${prefix}`);
    add(row.candidate_identity?.canonical_family !== null ||
      row.candidate_identity?.canonical_variant !== null,
    `canonical_identity_present:${prefix}`);
    add(row.evidence?.[2]?.source_image_pointer_authorized !== false ||
      row.evidence?.[2]?.pricing_publication_authorized !== false,
    `downstream_authority_present:${prefix}`);
  }
  const boundaries = plan?.boundaries ?? {};
  add(boundaries.candidate_warehouse_only !== true ||
    boundaries.app_visibility_enabled !== false ||
    Object.entries(boundaries).some(([key, value]) =>
      !["candidate_warehouse_only", "app_visibility_enabled"].includes(key) &&
      value !== 0), "boundaries_mismatch");
  return { valid: findings.length === 0, findings };
}

export function expectedOnePieceCompleteSealedCandidateWritesV1() {
  return { sealed_product_candidates: 403 };
}

export const ONE_PIECE_COMPLETE_SEALED_TABLES = Object.freeze([
  "sealed_product_families",
  "sealed_product_variants",
  "sealed_product_candidates",
  "sealed_product_candidate_reviews",
  "sealed_product_source_mappings",
  "sealed_product_variant_evidence",
  "sealed_product_pricing_lane_qualifications",
  "sealed_product_releases",
  "sealed_product_release_members",
  "sealed_product_release_pointer",
]);

export const ONE_PIECE_COMPLETE_SEALED_PREFLIGHT_VERSION =
  "ONE_PIECE_COMPLETE_SEALED_CANDIDATE_PREFLIGHT_V1";
export const ONE_PIECE_COMPLETE_SEALED_APPLY_VERSION =
  "ONE_PIECE_COMPLETE_SEALED_CANDIDATE_APPLY_V1";
export const ONE_PIECE_COMPLETE_SEALED_CARD_BASELINE = Object.freeze({
  sets: 60,
  card_prints: 6730,
  card_print_identity: 6730,
  card_print_identity_source_evidence: 6730,
  external_mappings: 6730,
  card_printings: 14,
  external_printing_mappings: 14,
});
export const ONE_PIECE_COMPLETE_SEALED_EMPTY_BASELINE = Object.freeze(
  Object.fromEntries(ONE_PIECE_COMPLETE_SEALED_TABLES.map((table) => [table, 0])),
);

export function expectedOnePieceCompleteSealedStagingV1(plan) {
  return plan.payload.candidates.map((row) => ({
    source_product_id: row.source_product_id,
    source_group_id: row.source_group_id,
    record_class: "sealed_product_candidate",
    single_card_kind: null,
    language_key: row.candidate_identity.language.normalized,
    promotion_state: "separate_sealed_catalog",
    source_payload_hash: row.source_payload_hash,
  }));
}

export function evaluateOnePieceCompleteSealedPreflightV1({ plan, snapshot }) {
  const findings = validateOnePieceCompleteSealedCandidatePlanV1(plan).findings
    .map((finding) => `plan:${finding}`);
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(snapshot?.transaction_read_only !== true, "transaction_not_read_only");
  add(snapshot?.release_status !== "hidden" ||
    snapshot?.anon_visible !== false ||
    snapshot?.authenticated_visible !== false ||
    snapshot?.service_role_visible !== false, "one_piece_visibility_mismatch");
  add(stableJson(snapshot?.card_baseline) !==
    stableJson(ONE_PIECE_COMPLETE_SEALED_CARD_BASELINE),
  "card_baseline_mismatch");
  add(stableJson(snapshot?.sealed_baseline) !==
    stableJson(ONE_PIECE_COMPLETE_SEALED_EMPTY_BASELINE),
  "sealed_baseline_not_empty");
  for (const table of ONE_PIECE_COMPLETE_SEALED_TABLES) {
    const schema = snapshot?.schema?.[table];
    const expectedServiceInsert = table !== "sealed_product_release_pointer";
    add(schema?.present !== true || schema?.rls_enabled !== true ||
      schema?.rls_forced !== true || schema?.anon_select !== false ||
      schema?.authenticated_select !== false ||
      schema?.service_select !== true ||
      schema?.service_insert !== expectedServiceInsert,
    `sealed_schema_security_mismatch:${table}`);
  }
  add(stableJson(snapshot?.staging_rows) !==
    stableJson(expectedOnePieceCompleteSealedStagingV1(plan)),
  "staging_readback_mismatch");
  add(Object.values(snapshot?.collisions ?? {}).some((value) =>
    Number(value) !== 0), "candidate_collision_detected");
  add((snapshot?.blocking_pids ?? []).length !== 0, "blocking_session_detected");
  return { valid: findings.length === 0, findings };
}

export function buildOnePieceCompleteSealedPreflightFingerprintV1({
  plan,
  snapshot,
}) {
  return sha256(stableJson({ version: ONE_PIECE_COMPLETE_SEALED_PREFLIGHT_VERSION,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256, snapshot }));
}

export function selectOnePieceCompleteSealedCanaryV1(plan) {
  const rows = plan.payload.candidates;
  const selected = [];
  const take = (predicate) => {
    const row = rows.find((candidate) =>
      !selected.includes(candidate) && predicate(candidate));
    if (row) selected.push(row);
  };
  for (const signal of ["starter_deck", "booster_pack", "booster_box",
    "promotion_pack", "gift_collection", "premium_card_collection",
    "double_pack", "special_don_set"]) {
    take((row) => row.candidate_identity.sealed_signals.includes(signal));
  }
  take((row) => row.candidate_identity.language.normalized === "ja");
  take((row) => row.candidate_identity.release.future_release === true);
  if (selected.length !== 10) {
    throw new Error("Unable to select ten sealed candidate canary rows");
  }
  return selected;
}

export function evaluateOnePieceCompleteSealedCandidateReadbackV1({
  candidates,
  readback,
}) {
  return stableJson(readback) === stableJson(candidates)
    ? []
    : ["candidate_readback_mismatch"];
}

export function evaluateOnePieceCompleteSealedCandidateWritesV1(rows, canary = false) {
  const expected = [{ table_name: "sealed_product_candidates",
    inserted: canary ? 10 : 403, updated: 0, deleted: 0, hot_updated: 0 }];
  const actual = (rows ?? []).map((row) => ({ table_name: row.table_name,
    inserted: Number(row.inserted), updated: Number(row.updated),
    deleted: Number(row.deleted), hot_updated: Number(row.hot_updated) }));
  return stableJson(actual) === stableJson(expected)
    ? []
    : ["attributable_writes_mismatch"];
}

export function buildOnePieceCompleteSealedApplyPlanV1({
  repository,
  candidatePlan,
  preflightSummary,
  canarySummary,
  proofHashes,
}) {
  if (!validateOnePieceCompleteSealedCandidatePlanV1(candidatePlan).valid ||
      preflightSummary?.status !== "production_read_only_preflight_passed" ||
      preflightSummary?.plan_fingerprint_sha256 !==
        candidatePlan.plan_fingerprint_sha256 ||
      preflightSummary?.findings?.length !== 0 ||
      canarySummary?.status !== "production_rollback_canary_passed" ||
      canarySummary?.plan_fingerprint_sha256 !==
        candidatePlan.plan_fingerprint_sha256 ||
      canarySummary?.findings?.length !== 0) {
    throw new Error("Sealed candidate apply proof chain is not eligible");
  }
  const rows = candidatePlan.payload.candidates;
  const core = { version: ONE_PIECE_COMPLETE_SEALED_APPLY_VERSION,
    repository, proof_hashes: proofHashes,
    target_binding: {
      plan_fingerprint_sha256: candidatePlan.plan_fingerprint_sha256,
      payload_fingerprint_sha256: candidatePlan.payload_fingerprint_sha256,
      preflight_fingerprint_sha256:
        preflightSummary.preflight_fingerprint_sha256,
      canary_fingerprint_sha256: canarySummary.canary_fingerprint_sha256,
      candidate_rows: rows.length,
      candidate_ids_sha256: sha256(stableJson(rows.map((row) => row.id))),
      source_product_ids_sha256: sha256(stableJson(rows.map((row) =>
        row.source_product_id))),
    },
    execution: { chunk_size: 100, lock_timeout: "5s",
      statement_timeout: "300s",
      advisory_lock_key: "one_piece_complete_sealed_candidate_apply_v1" },
    boundaries: { candidate_insert_only: true, updates: 0, deletes: 0,
      family_writes: 0, variant_writes: 0, review_writes: 0,
      mapping_writes: 0, evidence_writes: 0, pricing_writes: 0,
      release_writes: 0, release_pointer_writes: 0, card_writes: 0,
      storage_writes: 0, publication_writes: 0,
      app_visibility_enabled: false } };
  return { ...core, apply_plan_fingerprint_sha256: sha256(stableJson(core)) };
}

export function validateOnePieceCompleteSealedApplyPlanV1(plan, candidatePlan) {
  const findings = [];
  const { apply_plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  if (plan?.version !== ONE_PIECE_COMPLETE_SEALED_APPLY_VERSION) {
    findings.push("version_mismatch");
  }
  if (plan?.apply_plan_fingerprint_sha256 !== sha256(stableJson(core))) {
    findings.push("apply_plan_fingerprint_mismatch");
  }
  if (plan?.target_binding?.plan_fingerprint_sha256 !==
      candidatePlan?.plan_fingerprint_sha256 ||
      plan?.target_binding?.payload_fingerprint_sha256 !==
      candidatePlan?.payload_fingerprint_sha256 ||
      plan?.target_binding?.candidate_rows !== 403) {
    findings.push("candidate_binding_mismatch");
  }
  if (plan?.boundaries?.candidate_insert_only !== true ||
      plan?.boundaries?.app_visibility_enabled !== false ||
      Object.entries(plan?.boundaries ?? {}).some(([key, value]) =>
        !["candidate_insert_only", "app_visibility_enabled"].includes(key) &&
        value !== 0)) {
    findings.push("boundaries_mismatch");
  }
  return { valid: findings.length === 0, findings };
}
