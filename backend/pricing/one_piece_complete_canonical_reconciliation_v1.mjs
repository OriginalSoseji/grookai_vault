import {
  ONE_PIECE_COMPLETE_STAGING_EXPECTED_COUNTS,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
} from "./one_piece_complete_staging_release_v1.mjs";
import {
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";

export const ONE_PIECE_COMPLETE_CANONICAL_RECONCILIATION_VERSION =
  "ONE_PIECE_COMPLETE_CANONICAL_RECONCILIATION_V1";
export const ONE_PIECE_COMPLETE_CANONICAL_RECONCILIATION_EXPECTED =
  Object.freeze({
    source_products: 7261,
    current_numbered_products: 6547,
    current_don_products: 223,
    future_numbered_products: 80,
    future_don_products: 2,
    sealed_products: 403,
    quarantined_products: 6,
    current_numbered_set_families: 59,
    existing_st01_products: 17,
    proposed_new_numbered_products: 6530,
  });

const CLOSED_BOUNDARIES = Object.freeze({
  database_connections: 0,
  database_writes: 0,
  canonical_writes: 0,
  mapping_writes: 0,
  don_writes: 0,
  sealed_writes: 0,
  storage_writes: 0,
  image_pointer_writes: 0,
  pricing_writes: 0,
  publication_writes: 0,
  vault_writes: 0,
  app_visibility_enabled: false,
});

function clean(value) {
  return String(value ?? "").trim();
}

function numeric(left, right) {
  return Number(left) - Number(right);
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function unique(values) {
  return [...new Set(values)];
}

export function onePieceSetCodeFromCardNumberV1(cardNumber) {
  const normalized = clean(cardNumber).toUpperCase();
  const match = normalized.match(/^((?:OP|ST|EB|PRB)\d{2}|P)-\d{3}$/);
  if (!match) return null;
  return match[1];
}

function sourceBinding(row) {
  return {
    staging_row_id: row.staging_row_id ?? row.id ?? null,
    staging_batch_id: row.staging_batch_id ?? row.batch_id ?? null,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
    source_group_name: row.source_group_name,
    source_payload_hash: row.source_payload_hash,
    staging_payload_sha256: row.staging_payload_sha256 ?? null,
  };
}

function sourceProductCandidate(row, existingByProduct) {
  const productId = Number(row.source_product_id);
  const cardNumber = row.card_evidence?.number ?? null;
  const setCode = onePieceSetCodeFromCardNumberV1(cardNumber);
  const existing = existingByProduct.get(productId) ?? null;
  return {
    source_product_id: productId,
    source_product_name: row.source_product_name,
    source_group_id: Number(row.source_group_id),
    source_group_name: row.source_group_name,
    source_active: row.source_active === true,
    promotion_state: row.promotion_state,
    card_number: cardNumber,
    set_code: setCode,
    card_number_format: row.card_evidence?.number_format ?? null,
    card_type: row.card_evidence?.card_type ?? null,
    rarity: row.card_evidence?.rarity ?? null,
    language: row.language,
    treatment_claims: row.product_signals?.treatments ?? [],
    release: row.release,
    parent_gv_id: row.parent_gv_id,
    exact_source_product_mapping: row.exact_source_product_mapping,
    source_price_lanes: row.source_price_lanes ?? [],
    source_image_reference: row.source_image_reference,
    source_image_policy: row.source_image_policy,
    source_identity_key_hash: row.identity_key_hash,
    source_identity_payload: row.identity_payload,
    source_binding: sourceBinding(row),
    existing_canonical: existing,
    reconciliation_action: existing
      ? "retain_existing_exact_canonical_binding"
      : "propose_new_parent_after_official_authority",
    official_authority_status: existing
      ? "already_bound_by_st01_official_authority"
      : "pending_official_number_name_authority",
    canonical_promotion_eligible: false,
    publishable: false,
  };
}

function buildSetFamilies(currentNumbered) {
  const families = new Map();
  for (const row of currentNumbered) {
    const setCode = onePieceSetCodeFromCardNumberV1(row.card_evidence?.number);
    if (!setCode) continue;
    const family = families.get(setCode) ?? {
      set_code: setCode,
      source_product_ids: [],
      printed_numbers: new Set(),
      source_groups: new Map(),
    };
    family.source_product_ids.push(Number(row.source_product_id));
    family.printed_numbers.add(row.card_evidence.number);
    const groupId = Number(row.source_group_id);
    const group = family.source_groups.get(groupId) ?? {
      source_group_id: groupId,
      source_group_name: row.source_group_name,
      product_count: 0,
      printed_numbers: new Set(),
      released_on: row.release?.released_on ?? null,
    };
    group.product_count += 1;
    group.printed_numbers.add(row.card_evidence.number);
    family.source_groups.set(groupId, group);
    families.set(setCode, family);
  }
  return [...families.values()].map((family) => {
    const sourceGroups = [...family.source_groups.values()].map((group) => ({
      source_group_id: group.source_group_id,
      source_group_name: group.source_group_name,
      product_count: group.product_count,
      unique_printed_number_count: group.printed_numbers.size,
      released_on: group.released_on,
    })).sort((left, right) =>
      right.unique_printed_number_count - left.unique_printed_number_count ||
      right.product_count - left.product_count ||
      numeric(left.source_group_id, right.source_group_id));
    const strongest = sourceGroups[0] ?? null;
    const second = sourceGroups[1] ?? null;
    const ownerStatus = strongest && (!second ||
      strongest.unique_printed_number_count > second.unique_printed_number_count)
      ? "single_strongest_source_group_diagnostic"
      : "source_group_owner_tied_or_ambiguous";
    return {
      set_code: family.set_code,
      current_product_count: family.source_product_ids.length,
      unique_printed_number_count: family.printed_numbers.size,
      source_group_count: sourceGroups.length,
      strongest_source_group_diagnostic: strongest,
      strongest_source_group_status: ownerStatus,
      source_groups: sourceGroups,
      canonical_set_name_status: family.set_code === "ST01"
        ? "existing_canonical_set"
        : "pending_official_series_authority",
      canonical_set_write_eligible: false,
    };
  }).sort((left, right) => compareText(left.set_code, right.set_code));
}

function collisionRows(candidates, key, code) {
  const owners = new Map();
  for (const candidate of candidates) {
    const value = candidate[key];
    if (value === null || value === undefined || value === "") continue;
    const list = owners.get(String(value)) ?? [];
    list.push(candidate.source_product_id);
    owners.set(String(value), list);
  }
  return [...owners.entries()]
    .filter(([, productIds]) => productIds.length > 1)
    .map(([value, productIds]) => ({
      collision_class: code,
      value,
      source_product_ids: productIds.sort(numeric),
    }));
}

function expectedExisting(existingCanonicalRows) {
  const map = new Map();
  for (const row of existingCanonicalRows ?? []) {
    map.set(Number(row.source_product_id), {
      source_product_id: Number(row.source_product_id),
      card_number: row.card_number,
      card_print_id: row.card_print?.id,
      card_print_identity_id: row.identity?.id,
      external_mapping_source: row.external_mapping?.source,
      external_mapping_id: row.external_mapping?.external_id,
      gv_id: row.card_print?.gv_id,
      authority: "one_piece_st01_canonical_promotion_v1",
    });
  }
  return map;
}

function classifyRows(rows) {
  const currentNumbered = [];
  const currentDon = [];
  const futureHolds = [];
  const sealed = [];
  const quarantine = [];
  for (const row of rows) {
    if (row.promotion_state === "future_or_presale_hold") {
      futureHolds.push(row);
    } else if (row.classification === "sealed_product_candidate") {
      sealed.push(row);
    } else if (row.classification === "ambiguous_quarantine") {
      quarantine.push(row);
    } else if (row.classification === "exact_single_card_candidate" &&
        row.single_card_kind === "numbered_card" &&
        row.promotion_state === "current_candidate") {
      currentNumbered.push(row);
    } else if (row.classification === "exact_single_card_candidate" &&
        row.single_card_kind === "don_card" &&
        row.promotion_state === "current_candidate") {
      currentDon.push(row);
    } else {
      quarantine.push({
        ...row,
        reconciliation_quarantine_reason: "unrecognized_partition",
      });
    }
  }
  return { currentNumbered, currentDon, futureHolds, sealed, quarantine };
}

export function buildOnePieceCompleteCanonicalReconciliationV1(input, options = {}) {
  const expected = options.expected ??
    ONE_PIECE_COMPLETE_CANONICAL_RECONCILIATION_EXPECTED;
  if (options.allowFixture !== true && input.manifestLogicalSha256 !==
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256) {
    throw new Error("Frozen One Piece manifest hash changed");
  }
  if (input.repository?.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !/^[0-9a-f]{40}$/.test(input.repository?.commit_sha ?? "")) {
    throw new Error("Exact One Piece repository identity is required");
  }
  const rows = structuredClone(input.manifestRows ?? []).sort((left, right) =>
    numeric(left.source_product_id, right.source_product_id));
  const existingByProduct = expectedExisting(input.existingCanonicalRows);
  const partitions = classifyRows(rows);
  const numberedCandidates = partitions.currentNumbered.map((row) =>
    sourceProductCandidate(row, existingByProduct));
  const setFamilies = buildSetFamilies(partitions.currentNumbered);
  const futureHolds = partitions.futureHolds.map((row) => ({
    ...sourceBinding(row),
    source_product_name: row.source_product_name,
    single_card_kind: row.single_card_kind,
    card_number: row.card_evidence?.number ?? null,
    released_on: row.release?.released_on ?? null,
    hold_reason: row.release?.explicit_presale
      ? "explicit_presale"
      : "future_release",
    canonical_promotion_eligible: false,
  }));
  const donLane = partitions.currentDon.map((row) => ({
    ...sourceBinding(row),
    source_product_name: row.source_product_name,
    source_price_lanes: row.source_price_lanes ?? [],
    source_image_reference: row.source_image_reference,
    lane: "separate_don_identity_reconciliation_required",
    canonical_promotion_eligible: false,
  }));
  const sealedLane = partitions.sealed.map((row) => ({
    ...sourceBinding(row),
    source_product_name: row.source_product_name,
    sealed_signals: row.product_signals?.sealed ?? [],
    source_price_lanes: row.source_price_lanes ?? [],
    source_image_reference: row.source_image_reference,
    lane: "separate_sealed_catalog_required",
    canonical_promotion_eligible: false,
  }));
  const quarantine = partitions.quarantine.map((row) => ({
    ...sourceBinding(row),
    source_product_name: row.source_product_name,
    classification_reasons: row.classification_reasons ?? [],
    quarantine_reason: row.reconciliation_quarantine_reason ??
      "ambiguous_source_classification",
    canonical_promotion_eligible: false,
  }));

  const collisions = [
    ...collisionRows(numberedCandidates, "source_product_id",
      "duplicate_source_product_id"),
    ...collisionRows(numberedCandidates, "parent_gv_id", "duplicate_parent_gv_id"),
    ...collisionRows(numberedCandidates, "exact_source_product_mapping",
      "duplicate_exact_source_mapping"),
    ...collisionRows(numberedCandidates, "source_identity_key_hash",
      "duplicate_source_identity_key_hash"),
  ];
  const invalidNumbers = numberedCandidates.filter((row) => !row.set_code)
    .map((row) => row.source_product_id);
  const existingRows = numberedCandidates.filter((row) => row.existing_canonical);
  const existingMismatches = existingRows.filter((row) =>
    row.existing_canonical.card_number !== row.card_number ||
    row.existing_canonical.external_mapping_source !== "tcgplayer" ||
    row.existing_canonical.external_mapping_id !== String(row.source_product_id) ||
    row.existing_canonical.gv_id !== row.parent_gv_id);
  const counts = {
    source_products: rows.length,
    current_numbered_products: numberedCandidates.length,
    current_don_products: donLane.length,
    future_numbered_products: futureHolds.filter(
      (row) => row.single_card_kind === "numbered_card").length,
    future_don_products: futureHolds.filter(
      (row) => row.single_card_kind === "don_card").length,
    sealed_products: sealedLane.length,
    quarantined_products: quarantine.length,
    current_numbered_set_families: setFamilies.length,
    existing_st01_products: existingRows.length,
    proposed_new_numbered_products: numberedCandidates.length - existingRows.length,
  };
  const diagnostics = {
    collision_count: collisions.length,
    collisions,
    invalid_card_number_count: invalidNumbers.length,
    invalid_card_number_product_ids: invalidNumbers,
    existing_binding_mismatch_count: existingMismatches.length,
    existing_binding_mismatches: existingMismatches.map((row) =>
      row.source_product_id),
    duplicate_printed_numbers_are_expected_product_variants: true,
    unique_printed_number_count: new Set(numberedCandidates
      .map((row) => row.card_number)).size,
    multi_product_printed_number_count: [...numberedCandidates.reduce(
      (owners, row) => {
        const productIds = owners.get(row.card_number) ?? [];
        productIds.push(row.source_product_id);
        owners.set(row.card_number, productIds);
        return owners;
      }, new Map()).values()].filter((productIds) => productIds.length > 1).length,
  };
  const core = {
    version: ONE_PIECE_COMPLETE_CANONICAL_RECONCILIATION_VERSION,
    repository: input.repository,
    source_authority: {
      immutable_staging_release_plan_fingerprint:
        input.stagingReleasePlanFingerprint,
      immutable_staging_release_payload_fingerprint:
        input.stagingReleasePayloadFingerprint,
      source_manifest_logical_sha256: input.manifestLogicalSha256,
      source_manifest_row_count: rows.length,
    },
    counts,
    set_families: setFamilies,
    numbered_candidates: numberedCandidates,
    don_lane: donLane,
    sealed_lane: sealedLane,
    future_holds: futureHolds,
    quarantine,
    diagnostics,
    boundaries: structuredClone(CLOSED_BOUNDARIES),
    promotion_policy: {
      numbered_products_require_official_number_name_authority: true,
      source_product_variants_remain_distinct_parent_candidates: true,
      printed_number_duplicates_do_not_collapse_product_identity: true,
      don_requires_separate_identity_contract: true,
      sealed_requires_separate_catalog_contract: true,
      future_and_presale_rows_remain_held: true,
      quarantined_rows_remain_excluded: true,
      existing_exact_bindings_are_retained_without_mutation: true,
    },
  };
  return {
    ...core,
    reconciliation_fingerprint_sha256: sha256(stableJson(core)),
  };
}

export function validateOnePieceCompleteCanonicalReconciliationV1(
  result,
  options = {},
) {
  const expected = options.expected ??
    ONE_PIECE_COMPLETE_CANONICAL_RECONCILIATION_EXPECTED;
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { reconciliation_fingerprint_sha256: ignored, ...core } = result ?? {};
  add(result?.version !== ONE_PIECE_COMPLETE_CANONICAL_RECONCILIATION_VERSION,
    "version_mismatch");
  add(result?.reconciliation_fingerprint_sha256 !== sha256(stableJson(core)),
    "fingerprint_mismatch");
  add(stableJson(result?.counts) !== stableJson(expected), "count_contract_mismatch");
  add(result?.counts?.source_products !==
    ONE_PIECE_COMPLETE_STAGING_EXPECTED_COUNTS.source_products &&
    options.allowFixture !== true, "staging_count_mismatch");
  add(result?.numbered_candidates?.length !== expected.current_numbered_products,
    "numbered_candidate_count_mismatch");
  add(result?.don_lane?.length !== expected.current_don_products,
    "don_lane_count_mismatch");
  add(result?.sealed_lane?.length !== expected.sealed_products,
    "sealed_lane_count_mismatch");
  add(result?.future_holds?.length !==
    expected.future_numbered_products + expected.future_don_products,
  "future_hold_count_mismatch");
  add(result?.quarantine?.length !== expected.quarantined_products,
    "quarantine_count_mismatch");
  add(result?.set_families?.length !== expected.current_numbered_set_families,
    "set_family_count_mismatch");
  add(result?.diagnostics?.collision_count !== 0, "identity_collision_present");
  add(result?.diagnostics?.invalid_card_number_count !== 0,
    "invalid_card_number_present");
  add(result?.diagnostics?.existing_binding_mismatch_count !== 0,
    "existing_binding_mismatch");
  for (const [key, value] of Object.entries(CLOSED_BOUNDARIES)) {
    add(result?.boundaries?.[key] !== value, `boundary_drift:${key}`);
  }
  for (const row of result?.numbered_candidates ?? []) {
    add(row.canonical_promotion_eligible !== false,
      `premature_promotion_eligibility:${row.source_product_id}`);
    add(!row.source_binding?.source_payload_hash,
      `missing_source_hash:${row.source_product_id}`);
    add(!onePieceSetCodeFromCardNumberV1(row.card_number),
      `invalid_number:${row.source_product_id}`);
  }
  return { valid: findings.length === 0, findings: unique(findings) };
}
