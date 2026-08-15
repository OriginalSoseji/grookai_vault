import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
} from "./one_piece_complete_staging_release_v1.mjs";
import {
  ONE_PIECE_GAME_CODE,
  ONE_PIECE_GAME_ID,
  ONE_PIECE_ST01_IDENTITY_DOMAIN,
  ONE_PIECE_ST01_UUID_NAMESPACE,
} from "./one_piece_st01_canonical_promotion_v1.mjs";

export const ONE_PIECE_COMPLETE_DON_PROMOTION_VERSION =
  "ONE_PIECE_COMPLETE_ENGLISH_DON_PARENT_PROMOTION_PLAN_V1";
export const ONE_PIECE_COMPLETE_DON_IDENTITY_KEY_VERSION =
  "ONE_PIECE_ENG_DON_TCGPLAYER_PRODUCT_IDENTITY_V1";
export const ONE_PIECE_COMPLETE_DON_SET_CODE = "DON";
export const ONE_PIECE_COMPLETE_DON_SET_ID = deterministicUuidV5(
  "one-piece:canonical:set:don",
  ONE_PIECE_ST01_UUID_NAMESPACE,
);
export const ONE_PIECE_COMPLETE_DON_EXPECTED = Object.freeze({
  source_don_products: 225,
  current_source_products: 223,
  current_english_products: 222,
  current_non_english_holds: 1,
  future_or_presale_holds: 2,
  set_rows: 1,
  card_prints: 222,
  identity_rows: 222,
  source_evidence_rows: 222,
  external_mappings: 222,
});
export const ONE_PIECE_COMPLETE_DON_PINNED_INPUTS = Object.freeze({
  source_manifest_gzip_sha256:
    "973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e",
  reconciliation_summary_sha256:
    "830418974b7eea09ce92f9197d0b39f643b40bd79029fcc4a84ed4e1f09d72f3",
  don_lane_sha256:
    "941c24025dafbdd705a9c373d8977eac9d818cd02e14cbfc386f226cd918a825",
});

const CLOSED_BOUNDARIES = Object.freeze({
  plan_only: true,
  database_connections: 0,
  database_writes: 0,
  updates: 0,
  deletes: 0,
  child_printing_writes: 0,
  sealed_writes: 0,
  storage_writes: 0,
  image_pointer_writes: 0,
  pricing_writes: 0,
  publication_writes: 0,
  vault_writes: 0,
  app_visibility_enabled: false,
});

function normalizeName(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function stagingBinding(row) {
  const batchId = deterministicUuidV5(
    `one-piece:complete-staging-batch-v1:${ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256}:${row.source_group_id}`,
  );
  return {
    staging_row_id: deterministicUuidV5(
      `one-piece:complete-staging-row-v1:${batchId}:${row.source_product_id}`,
    ),
    staging_batch_id: batchId,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
    source_payload_hash: row.source_payload_hash,
    staging_payload_sha256: sha256(stableJson(row)),
  };
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

function buildDonRow(row) {
  const productId = Number(row.source_product_id);
  const variantKey = `tcgplayer_product_${productId}`;
  const normalizedName = normalizeName(row.source_product_name);
  const identityPayload = {
    game_code: ONE_PIECE_GAME_CODE,
    language_code: "en",
    set_code: ONE_PIECE_COMPLETE_DON_SET_CODE,
    printed_number: "DON!!",
    printed_number_semantics: "unnumbered_don_identity_token",
    normalized_printed_name: normalizedName,
    source_product_id: productId,
    source_group_id: Number(row.source_group_id),
    variant_key: variantKey,
  };
  const identityHash = sha256(stableJson(identityPayload));
  const ids = targetIds(productId, identityHash);
  const staging = stagingBinding(row);
  const evidenceSubject = {
    identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
    set_code: ONE_PIECE_COMPLETE_DON_SET_CODE,
    printed_number: "DON!!",
    printed_name: row.source_product_name,
    source_product_id: productId,
    source_group_id: Number(row.source_group_id),
    variant_key: variantKey,
  };
  const evidencePayload = {
    durable_staging: {
      ...staging,
      source_manifest_logical_sha256:
        ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
    },
    source_product: {
      source_product_id: productId,
      source_product_name: row.source_product_name,
      source_group_id: Number(row.source_group_id),
      source_group_name: row.source_group_name,
      source_image_reference_only: row.source_image_reference,
      source_image_pointer_authorized: false,
      treatment_claims: row.product_signals?.treatments ?? [],
      card_type: row.card_evidence?.card_type ?? null,
      rarity: row.card_evidence?.rarity ?? null,
      language: row.language,
      release: row.release,
    },
    authority: {
      exact_product_authority: "tcgplayer_product_id_and_structured_don_classification",
      official_visual_variant_authority: false,
      official_equivalence_authority: false,
      source_product_preserved_without_name_collapsing: true,
    },
  };
  const acquisitionKey = `one_piece:tcgplayer:product:${productId}`;
  const evidenceHash = sha256(stableJson({
    acquisition_key: acquisitionKey,
    source_key: "tcgplayer",
    evidence_subject: evidenceSubject,
    evidence_payload: evidencePayload,
  }));
  return {
    source_product_id: productId,
    source_group_id: Number(row.source_group_id),
    source_product_name: row.source_product_name,
    staging,
    card_print: {
      id: ids.card_print_id,
      game_id: ONE_PIECE_GAME_ID,
      set_id: ONE_PIECE_COMPLETE_DON_SET_ID,
      set_code: ONE_PIECE_COMPLETE_DON_SET_CODE,
      name: row.source_product_name,
      number: null,
      variant_key: variantKey,
      rarity: "DON!!",
      gv_id: row.parent_gv_id,
      tcgplayer_id: String(productId),
      external_ids: { tcgplayer: String(productId) },
      identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      print_identity_key: `${ONE_PIECE_ST01_IDENTITY_DOMAIN}:${identityHash}`,
      image_url: null,
      image_alt_url: null,
      data_quality_flags: {
        app_visibility: "hidden_by_game_release_control",
        unnumbered_don_product_identity: true,
        official_visual_variant_authority_deferred: true,
        exact_printing_children_deferred: true,
        image_acquisition_deferred: true,
        image_pointer_deferred: true,
        source_product_variant_preserved_as_parent: true,
      },
      ai_metadata: {
        canonical_authority: "exact_tcgplayer_don_product_identity",
        source_product_name_raw: row.source_product_name,
        source_group_id: Number(row.source_group_id),
        durable_staging_row_id: staging.staging_row_id,
      },
    },
    identity: {
      id: ids.identity_id,
      card_print_id: ids.card_print_id,
      identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      set_code_identity: ONE_PIECE_COMPLETE_DON_SET_CODE,
      printed_number: "DON!!",
      normalized_printed_name: normalizedName,
      source_name_raw: row.source_product_name,
      identity_payload: identityPayload,
      identity_key_version: ONE_PIECE_COMPLETE_DON_IDENTITY_KEY_VERSION,
      identity_key_hash: identityHash,
      is_active: true,
    },
    source_evidence: {
      id: ids.evidence_id,
      card_print_identity_id: ids.identity_id,
      card_print_id: ids.card_print_id,
      acquisition_key: acquisitionKey,
      source_key: "tcgplayer",
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
        source_group_id: Number(row.source_group_id),
        mapping_authority: "exact_current_english_tcgplayer_don_product",
        promotion_plan_version: ONE_PIECE_COMPLETE_DON_PROMOTION_VERSION,
      },
      active: true,
    },
  };
}

export function buildOnePieceCompleteDonPromotionPlanV1(input) {
  if (stableJson(input.inputHashes) !==
      stableJson(ONE_PIECE_COMPLETE_DON_PINNED_INPUTS)) {
    throw new Error("Pinned DON promotion inputs changed");
  }
  const allDon = (input.manifestRows ?? []).filter((row) =>
    row.single_card_kind === "don_card").sort((left, right) =>
    Number(left.source_product_id) - Number(right.source_product_id));
  const current = allDon.filter((row) =>
    row.promotion_state === "current_candidate");
  const currentLaneIds = [...new Set((input.donLane ?? []).map((row) =>
    Number(row.source_product_id)))].sort((a, b) => a - b);
  if (stableJson(currentLaneIds) !== stableJson(current.map((row) =>
    Number(row.source_product_id)))) {
    throw new Error("DON reconciliation lane does not match current manifest rows");
  }
  const eligible = current.filter((row) =>
    row.language?.normalized === "en");
  const nonEnglish = current.filter((row) =>
    row.language?.normalized !== "en");
  const future = allDon.filter((row) =>
    row.promotion_state === "future_or_presale_hold");
  const payload = {
    set_rows: [{
      id: ONE_PIECE_COMPLETE_DON_SET_ID,
      game: ONE_PIECE_GAME_CODE,
      code: ONE_PIECE_COMPLETE_DON_SET_CODE,
      name: "DON!! Cards",
      release_date: null,
      identity_domain_default: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      source: {
        grouping_authority: "derived_unnumbered_don_identity_domain",
        canonical_set_claim: false,
        exact_product_authority: "tcgplayer",
        visibility_authority: "catalog_game_release_controls:hidden",
      },
    }],
    don_cards: eligible.map(buildDonRow),
    non_english_language_holds: nonEnglish.map((row) => ({
      source_product_id: Number(row.source_product_id),
      source_product_name: row.source_product_name,
      language_key: row.language?.normalized ?? null,
      action: "hold_outside_english_canonical_apply",
    })),
    future_or_presale_holds: future.map((row) => ({
      source_product_id: Number(row.source_product_id),
      source_product_name: row.source_product_name,
      language_key: row.language?.normalized ?? null,
      release: row.release,
      action: "hold_until_current_release_evidence",
    })),
  };
  const counts = {
    source_don_products: allDon.length,
    current_source_products: current.length,
    current_english_products: eligible.length,
    current_non_english_holds: nonEnglish.length,
    future_or_presale_holds: future.length,
    set_rows: payload.set_rows.length,
    card_prints: payload.don_cards.length,
    identity_rows: payload.don_cards.length,
    source_evidence_rows: payload.don_cards.length,
    external_mappings: payload.don_cards.length,
  };
  const core = {
    version: ONE_PIECE_COMPLETE_DON_PROMOTION_VERSION,
    repository: input.repository,
    input_hashes: input.inputHashes,
    counts,
    payload_fingerprint_sha256: sha256(stableJson(payload)),
    payload,
    boundaries: structuredClone(CLOSED_BOUNDARIES),
  };
  return { ...core, plan_fingerprint_sha256: sha256(stableJson(core)) };
}

export function validateOnePieceCompleteDonPromotionPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_COMPLETE_DON_PROMOTION_VERSION,
    "version_mismatch");
  add(plan?.plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "plan_fingerprint_mismatch");
  add(plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload)),
    "payload_fingerprint_mismatch");
  add(stableJson(plan?.input_hashes) !==
    stableJson(ONE_PIECE_COMPLETE_DON_PINNED_INPUTS), "input_hashes_mismatch");
  add(stableJson(plan?.counts) !== stableJson(ONE_PIECE_COMPLETE_DON_EXPECTED),
    "counts_mismatch");
  const rows = plan?.payload?.don_cards ?? [];
  const ids = (selector) => rows.map(selector);
  for (const [label, values] of [
    ["source_product", ids((row) => row.source_product_id)],
    ["card_print", ids((row) => row.card_print?.id)],
    ["gv_id", ids((row) => row.card_print?.gv_id)],
    ["identity", ids((row) => row.identity?.identity_key_hash)],
    ["mapping", ids((row) => row.external_mapping?.external_id)],
  ]) add(new Set(values).size !== rows.length, `duplicate_${label}`);
  for (const row of rows) {
    const prefix = String(row.source_product_id);
    add(row.card_print?.set_id !== ONE_PIECE_COMPLETE_DON_SET_ID ||
      row.card_print?.set_code !== ONE_PIECE_COMPLETE_DON_SET_CODE ||
      row.card_print?.number !== null, `card_shape_mismatch:${prefix}`);
    add(row.card_print?.image_url !== null ||
      row.card_print?.image_alt_url !== null, `image_pointer_present:${prefix}`);
    add(row.identity?.printed_number !== "DON!!" ||
      row.identity?.identity_key_version !==
        ONE_PIECE_COMPLETE_DON_IDENTITY_KEY_VERSION,
    `identity_contract_mismatch:${prefix}`);
    add(row.identity?.identity_key_hash !==
      sha256(stableJson(row.identity?.identity_payload)),
    `identity_hash_mismatch:${prefix}`);
    add(row.source_evidence?.evidence_payload?.authority
      ?.official_visual_variant_authority !== false,
    `visual_authority_overclaim:${prefix}`);
    add(row.external_mapping?.external_id !== prefix,
      `mapping_mismatch:${prefix}`);
  }
  const promoted = new Set(rows.map((row) => row.source_product_id));
  for (const hold of [
    ...(plan?.payload?.non_english_language_holds ?? []),
    ...(plan?.payload?.future_or_presale_holds ?? []),
  ]) add(promoted.has(hold.source_product_id),
    `held_product_promoted:${hold.source_product_id}`);
  add(stableJson(plan?.boundaries) !== stableJson(CLOSED_BOUNDARIES),
    "boundaries_mismatch");
  return { valid: findings.length === 0, findings };
}

export function expectedOnePieceCompleteDonAttributableWritesV1() {
  return {
    sets: 1,
    card_prints: 222,
    card_print_identity: 222,
    card_print_identity_source_evidence: 222,
    external_mappings: 222,
  };
}

