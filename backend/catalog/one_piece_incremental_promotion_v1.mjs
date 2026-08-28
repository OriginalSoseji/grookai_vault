import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "../pricing/one_piece_canonical_import_staging_v1.mjs";
import { classifyOnePieceSourceProductV1 } from
  "../pricing/one_piece_canonical_catalog_candidate_v1.mjs";
import {
  bindOnePieceNumberedCandidatesToOfficialAuthorityV1,
  buildOnePieceOfficialNumberAuthorityV1,
  normalizeOnePieceOfficialNameV1,
} from "../pricing/one_piece_complete_official_catalog_authority_v1.mjs";
import {
  ONE_PIECE_GAME_CODE,
  ONE_PIECE_GAME_ID,
  ONE_PIECE_ST01_IDENTITY_DOMAIN,
  ONE_PIECE_ST01_UUID_NAMESPACE,
} from "../pricing/one_piece_st01_canonical_promotion_v1.mjs";
import {
  ONE_PIECE_COMPLETE_NUMBERED_IDENTITY_KEY_VERSION,
} from "../pricing/one_piece_complete_numbered_canonical_promotion_v1.mjs";

export const ONE_PIECE_INCREMENTAL_PROMOTION_VERSION =
  "ONE_PIECE_INCREMENTAL_CANONICAL_PROMOTION_V1";
export const ONE_PIECE_INCREMENTAL_SET_RELEASE_VERSION =
  "ONE_PIECE_INCREMENTAL_SET_RELEASE_CONTROL_V1";

function clean(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

function normalizedSetCode(value) {
  const match = clean(value).toUpperCase().match(/^(OP|ST|EB|PRB)-?(\d{2})$/);
  if (!match) throw new Error(`Unsupported One Piece set code: ${value}`);
  return `${match[1]}${match[2]}`;
}

function setCodeFromCardNumber(value) {
  const match = clean(value).toUpperCase().match(/^((?:(?:OP|ST|EB|PRB)\d{2})|P)-/);
  return match?.[1] ?? null;
}

function setId(setCode) {
  return deterministicUuidV5(
    `one-piece:canonical:set:${setCode.toLowerCase()}`,
    ONE_PIECE_ST01_UUID_NAMESPACE,
  );
}

function targetIds(productId, identityHash) {
  return {
    card_print_id: deterministicUuidV5(
      `one-piece:canonical:tcgplayer-product:${productId}`,
      ONE_PIECE_ST01_UUID_NAMESPACE,
    ),
    identity_id: deterministicUuidV5(
      `one-piece:canonical:identity:${identityHash}`,
      ONE_PIECE_ST01_UUID_NAMESPACE,
    ),
    evidence_id: deterministicUuidV5(
      `one-piece:canonical:evidence:tcgplayer:${productId}`,
      ONE_PIECE_ST01_UUID_NAMESPACE,
    ),
  };
}

function buildRow(binding, set, releaseSetCode, suppressReleaseSetRows) {
  const productId = Number(binding.source_product_id);
  const official = binding.official_authority;
  const variantKey = `tcgplayer_product_${productId}`;
  const normalizedName = normalizeOnePieceOfficialNameV1(official.official_name);
  const identityPayload = {
    game_code: ONE_PIECE_GAME_CODE,
    language_code: "en",
    set_code: set.code,
    printed_number: binding.card_number,
    normalized_printed_name: normalizedName,
    source_product_id: productId,
    variant_key: variantKey,
  };
  const identityHash = sha256(stableJson(identityPayload));
  const ids = targetIds(productId, identityHash);
  const evidenceSubject = {
    identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
    set_code: set.code,
    printed_number: binding.card_number,
    printed_name: official.official_name,
    source_product_id: productId,
    variant_key: variantKey,
  };
  const acquisitionKey = `one_piece:tcgplayer:product:${productId}`;
  const evidencePayload = {
    promotion_version: ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
    source_product: {
      source_product_id: productId,
      source_product_name: binding.source_product_name,
      source_group_id: Number(binding.source_group_id),
      source_group_name: binding.source_group_name,
      source_identity_key_hash: binding.identity_key_hash,
      source_image_reference_only: binding.source_image_reference,
      source_image_pointer_authorized: false,
      source_name_support_kind: binding.source_name_support_kind,
      treatment_claims: binding.product_signals?.treatments ?? [],
    },
    official_authority: {
      authority_status: official.authority_status,
      official_name: official.official_name,
      normalized_official_name: official.normalized_official_name,
      card_number: official.card_number,
      card_types: official.card_types,
      rarities: official.rarities,
      series_ids: official.series_ids,
      series_labels: official.series_labels,
      official_variant_ids: official.official_variant_ids,
      official_image_urls_reference_only: official.official_image_urls,
      image_pointer_authorized: false,
    },
  };
  const evidenceHash = sha256(stableJson({
    acquisition_key: acquisitionKey,
    source_key: "tcgplayer_bandai_official",
    evidence_subject: evidenceSubject,
    evidence_payload: evidencePayload,
  }));
  const shouldSuppress = set.code !== releaseSetCode || suppressReleaseSetRows;
  const suppressionReason = set.code !== releaseSetCode
    ? "cross_set_row_staged_with_hidden_incremental_release"
    : "existing_set_incremental_row_staged_for_release";
  return {
    source_product_id: productId,
    card_print: {
      id: ids.card_print_id,
      game_id: ONE_PIECE_GAME_ID,
      set_id: set.id,
      set_code: set.code,
      name: official.official_name,
      number: binding.card_number,
      variant_key: variantKey,
      rarity: binding.card_evidence?.rarity ?? official.rarities?.[0] ?? null,
      gv_id: binding.parent_gv_id,
      tcgplayer_id: String(productId),
      external_ids: { tcgplayer: String(productId) },
      identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      print_identity_key: `${ONE_PIECE_ST01_IDENTITY_DOMAIN}:${identityHash}`,
      image_url: null,
      image_alt_url: null,
      image_source: null,
      image_status: "missing",
      image_note: "Official and source images remain evidence-only until self-hosting promotion.",
      data_quality_flags: {
        catalog_incremental_promotion: ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
        incremental_release_cohort: releaseSetCode,
        exact_printing_children_deferred: true,
        image_acquisition_deferred: true,
        image_pointer_deferred: true,
        ...(shouldSuppress ? {
          app_visibility_v1: {
            status: "suppressed",
            reason: suppressionReason,
            release_set_code: releaseSetCode,
            policy_version: ONE_PIECE_INCREMENTAL_SET_RELEASE_VERSION,
          },
        } : {}),
      },
      ai_metadata: {
        canonical_authority: "bandai_official_number_name_plus_tcgplayer_product",
        source_product_name_raw: binding.source_product_name,
        source_card_type: binding.card_evidence?.card_type ?? null,
        source_group_id: Number(binding.source_group_id),
      },
    },
    identity: {
      id: ids.identity_id,
      card_print_id: ids.card_print_id,
      identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      set_code_identity: set.code,
      printed_number: binding.card_number,
      normalized_printed_name: normalizedName,
      source_name_raw: binding.source_product_name,
      identity_payload: identityPayload,
      identity_key_version: ONE_PIECE_COMPLETE_NUMBERED_IDENTITY_KEY_VERSION,
      identity_key_hash: identityHash,
      is_active: true,
    },
    source_evidence: {
      id: ids.evidence_id,
      card_print_identity_id: ids.identity_id,
      card_print_id: ids.card_print_id,
      acquisition_key: acquisitionKey,
      source_key: "tcgplayer_bandai_official",
      evidence_key_hash: evidenceHash,
      evidence_subject: evidenceSubject,
      evidence_payload: evidencePayload,
      active: true,
    },
    external_mapping: {
      card_print_id: ids.card_print_id,
      source: "tcgplayer",
      external_id: String(productId),
      meta: {
        source_group_id: Number(binding.source_group_id),
        mapping_authority: "exact_product_plus_official_number_name",
        promotion_version: ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
      },
      active: true,
    },
  };
}

export function buildOnePieceIncrementalPromotionPlanV1({
  asOf,
  setCode,
  setName,
  releaseDate,
  officialSeriesId,
  warehouseProducts,
  officialRecords,
  existingSetCodes = [],
  existingTcgplayerProductIds = [],
}) {
  const code = normalizedSetCode(setCode);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(asOf)) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(clean(releaseDate))) {
    throw new Error("One Piece incremental promotion requires exact ISO dates");
  }
  const classified = (warehouseProducts ?? []).map((row) =>
    classifyOnePieceSourceProductV1(row, { asOfDate: asOf }));
  const numbered = classified.filter((row) =>
    row.single_card_kind === "numbered_card" &&
    setCodeFromCardNumber(row.card_evidence?.number)).map((row) => ({
      ...row,
      card_number: row.card_evidence.number,
      card_type: row.card_evidence.card_type,
      rarity: row.card_evidence.rarity,
      source_identity_key_hash: row.identity_key_hash,
      treatment_claims: row.product_signals?.treatments ?? [],
    }));
  const dons = classified.filter((row) => row.single_card_kind === "don_card");
  const sealed = classified.filter((row) => row.classification === "sealed_product_candidate");
  const quarantined = classified.filter((row) => row.classification === "ambiguous_quarantine");
  const official = buildOnePieceOfficialNumberAuthorityV1(officialRecords ?? []);
  if (official.conflicts.length > 0) {
    throw new Error(`Official One Piece number conflicts: ${official.conflicts.length}`);
  }
  const binding = bindOnePieceNumberedCandidatesToOfficialAuthorityV1({
    numberedCandidates: numbered,
    officialAuthorities: official.authorities,
    officialCatalogGapsBecomeExplicitHolds: true,
  });
  const existingProducts = new Set(existingTcgplayerProductIds.map(String));
  const canonicalSetCodes = new Set(existingSetCodes.map((value) => clean(value).toUpperCase()));
  const exact = binding.rows.filter((row) => row.canonical_promotion_eligible);
  const missingPrintedSetHolds = exact.filter((row) => {
    const printedSetCode = setCodeFromCardNumber(row.card_number);
    return printedSetCode !== code && !canonicalSetCodes.has(printedSetCode);
  });
  const exactWithCanonicalSet = exact.filter((row) => !missingPrintedSetHolds.includes(row));
  const alreadyPresent = exact.filter((row) => existingProducts.has(String(row.source_product_id)));
  const missingExact = exactWithCanonicalSet.filter((row) =>
    !existingProducts.has(String(row.source_product_id)));
  const releaseEligible = releaseDate <= asOf;
  const set = {
    id: setId(code),
    game: ONE_PIECE_GAME_CODE,
    code,
    name: clean(setName) || code,
    release_date: releaseDate,
    identity_domain_default: ONE_PIECE_ST01_IDENTITY_DOMAIN,
    source: {
      canonical_authority: "bandai_official_card_list_plus_tcgcsv_tcgplayer_warehouse",
      official_series_id: String(officialSeriesId),
      release_gate: "not_before_official_release_date",
      image_policy: "evidence_only_until_self_hosted",
    },
  };
  const targetSetAlreadyExists = canonicalSetCodes.has(code);
  const rows = releaseEligible ? missingExact.map((row) => {
    const printedSetCode = setCodeFromCardNumber(row.card_number);
    return buildRow(row, printedSetCode === code ? set : {
      id: setId(printedSetCode),
      code: printedSetCode,
    }, code, targetSetAlreadyExists);
  }) : [];
  const createSet = releaseEligible && rows.length > 0 &&
    !targetSetAlreadyExists;
  const payload = {
    set: createSet ? set : null,
    set_release_control: createSet ? {
      set_id: set.id,
      release_status: "hidden",
      release_version: ONE_PIECE_INCREMENTAL_SET_RELEASE_VERSION,
      evidence: {
        staged_by: ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
        default: "fail_closed",
        canonical_promotion_authorizes_visibility: false,
        image_promotion_authorizes_visibility: false,
        price_publication_authorizes_visibility: false,
      },
      activated_at: null,
      activated_by: null,
    } : null,
    rows,
  };
  const plan = {
    version: ONE_PIECE_INCREMENTAL_PROMOTION_VERSION,
    target: `one_piece:${code}`,
    status: releaseEligible ? "release_eligible" : "held_future_release",
    as_of: asOf,
    release_date: releaseDate,
    release_eligible: releaseEligible,
    source_counts: {
      warehouse_products: classified.length,
      numbered_parent_candidates: numbered.length,
      official_base_card_numbers: official.authorities.filter((row) =>
        row.card_number.startsWith(`${code}-`)).length,
      official_series_number_authorities: official.authorities.length,
      cross_set_parent_candidates: numbered.filter((row) =>
        !row.card_number.startsWith(`${code}-`)).length,
      exact_number_name_bindings: exact.length,
      existing_exact_products: alreadyPresent.length,
      missing_exact_products: missingExact.length,
      source_name_mismatch_holds: binding.summary.source_name_mismatches,
      official_catalog_gap_holds: binding.summary.official_catalog_gap_holds,
      don_lane_products: dons.length,
      sealed_lane_products: sealed.length,
      ambiguous_products: quarantined.length,
      missing_printed_set_holds: missingPrintedSetHolds.length,
    },
    holds: [
      ...binding.rows.filter((row) => !row.canonical_promotion_eligible).map((row) => ({
        source_product_id: row.source_product_id,
        source_product_name: row.source_product_name,
        card_number: row.card_number,
        status: row.official_authority_status,
      })),
      ...missingPrintedSetHolds.map((row) => ({
        source_product_id: row.source_product_id,
        source_product_name: row.source_product_name,
        card_number: row.card_number,
        status: "printed_set_missing_from_canonical_catalog",
      })),
    ],
    counts: {
      sets: createSet ? 1 : 0,
      set_release_controls: createSet ? 1 : 0,
      card_prints: rows.length,
      identities: rows.length,
      evidence: rows.length,
      external_mappings: rows.length,
    },
    boundaries: {
      insert_only: true,
      set_release_status: "hidden",
      public_visibility_changes: 0,
      staged_rows_suppressed: rows.filter((row) =>
        row.card_print.data_quality_flags?.app_visibility_v1?.status === "suppressed").length,
      child_printings: 0,
      don_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      updates: 0,
      deletes: 0,
    },
    payload_fingerprint_sha256: sha256(stableJson(payload)),
    payload,
  };
  return plan;
}

export function validateOnePieceIncrementalPromotionPlanV1(plan) {
  const findings = [];
  const rows = plan?.payload?.rows ?? [];
  const releaseSetCode = clean(plan?.target).split(":").at(-1)?.toUpperCase() ?? "";
  if (plan?.version !== ONE_PIECE_INCREMENTAL_PROMOTION_VERSION) findings.push("version_mismatch");
  if (!plan?.release_eligible && (rows.length > 0 || plan?.payload?.set)) {
    findings.push("future_release_contains_writes");
  }
  if (plan?.payload?.set) {
    const control = plan?.payload?.set_release_control;
    if (!control || control.set_id !== plan.payload.set.id) {
      findings.push("missing_atomic_set_release_control");
    } else if (control.release_status !== "hidden" || control.activated_at !== null) {
      findings.push("new_set_release_control_not_hidden");
    }
  } else if (plan?.payload?.set_release_control) {
    findings.push("orphan_set_release_control");
  }
  if (!plan?.payload?.set_release_control && rows.some((row) =>
    row.card_print.data_quality_flags?.app_visibility_v1?.status !== "suppressed")) {
    findings.push("existing_set_incremental_row_not_suppressed");
  }
  for (const field of ["source_product_id", "card_print.id", "identity.id"]) {
    const values = rows.map((row) => field.split(".").reduce((value, key) => value?.[key], row));
    if (new Set(values).size !== values.length) findings.push(`duplicate:${field}`);
  }
  for (const row of rows) {
    if (row.card_print.image_url !== null || row.card_print.image_source !== null) {
      findings.push(`external_image_pointer:${row.source_product_id}`);
    }
    if (row.identity.card_print_id !== row.card_print.id ||
        row.source_evidence.card_print_id !== row.card_print.id ||
        row.external_mapping.card_print_id !== row.card_print.id) {
      findings.push(`foreign_key_mismatch:${row.source_product_id}`);
    }
    if (row.source_evidence.card_print_identity_id !== row.identity.id) {
      findings.push(`identity_evidence_mismatch:${row.source_product_id}`);
    }
    if (row.card_print.set_code !== releaseSetCode &&
        row.card_print.data_quality_flags?.app_visibility_v1?.status !== "suppressed") {
      findings.push(`cross_set_row_not_suppressed:${row.source_product_id}`);
    }
  }
  if (plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload))) {
    findings.push("payload_fingerprint_mismatch");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
