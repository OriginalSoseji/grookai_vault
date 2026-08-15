import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
} from "./one_piece_complete_staging_release_v1.mjs";
import {
  normalizeOnePieceOfficialNameV1,
} from "./one_piece_complete_official_catalog_authority_v1.mjs";
import {
  ONE_PIECE_GAME_CODE,
  ONE_PIECE_GAME_ID,
  ONE_PIECE_ST01_IDENTITY_DOMAIN,
  ONE_PIECE_ST01_SET_ID,
  ONE_PIECE_ST01_UUID_NAMESPACE,
  validateOnePieceSt01PromotionPlanV1,
} from "./one_piece_st01_canonical_promotion_v1.mjs";

export const ONE_PIECE_COMPLETE_NUMBERED_PROMOTION_VERSION =
  "ONE_PIECE_COMPLETE_ENGLISH_NUMBERED_PARENT_PROMOTION_PLAN_V1";
export const ONE_PIECE_COMPLETE_NUMBERED_IDENTITY_KEY_VERSION =
  "ONE_PIECE_ENG_PRODUCT_PARENT_IDENTITY_V1";
export const ONE_PIECE_COMPLETE_NUMBERED_EXPECTED = Object.freeze({
  source_numbered_products: 6547,
  authority_eligible_products: 6530,
  retained_existing_products: 17,
  new_set_rows: 58,
  new_card_prints: 6513,
  new_identity_rows: 6513,
  new_source_evidence_rows: 6513,
  new_external_mappings: 6513,
  official_catalog_gap_holds: 17,
});
export const ONE_PIECE_COMPLETE_NUMBERED_PINNED_INPUTS = Object.freeze({
  authority_summary_sha256:
    "1e5c0978f82121ed68c0cb1e080798529cd6c49b22ef5adcc4d65b87732f6ebc",
  numbered_bindings_gzip_sha256:
    "e57edabca8c86fa5555c1069ea2430bd0490613171e48ebe4ab709648332b9c6",
  official_series_sources_sha256:
    "d20fba9f8beaa1ceb2e3f3410f0bba2d24fdf90dab3bdb7f63319e6c3f157cbc",
  reconciliation_summary_sha256:
    "830418974b7eea09ce92f9197d0b39f643b40bd79029fcc4a84ed4e1f09d72f3",
  source_manifest_gzip_sha256:
    "973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e",
  existing_st01_plan_sha256:
    "10b238edc52ab8fa1271481231e6803553814c451f348d19e6e459017d9bf5e3",
});
export const ONE_PIECE_COMPLETE_NUMBERED_AUTHORITY_FINGERPRINT =
  "2de1958ea535c4dd65e3c4896bbe9a27df0f00199a7b2e69a82eb123071489f8";
export const ONE_PIECE_COMPLETE_NUMBERED_RECONCILIATION_FINGERPRINT =
  "6adf668587e16b34179950d01ea15ca3041244ed85047a37d2edfd6103a10584";

const CLOSED_BOUNDARIES = Object.freeze({
  plan_only: true,
  database_connections: 0,
  database_writes: 0,
  updates: 0,
  deletes: 0,
  child_printing_writes: 0,
  don_writes: 0,
  sealed_writes: 0,
  storage_writes: 0,
  image_pointer_writes: 0,
  pricing_writes: 0,
  publication_writes: 0,
  vault_writes: 0,
  app_visibility_enabled: false,
});

function compareText(left, right) {
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function setId(setCode) {
  return deterministicUuidV5(
    `one-piece:canonical:set:${String(setCode).toLowerCase()}`,
    ONE_PIECE_ST01_UUID_NAMESPACE,
  );
}

export function buildOnePieceCompleteStagingBindingV1(manifestRow) {
  const batchId = deterministicUuidV5(
    `one-piece:complete-staging-batch-v1:${ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256}:${manifestRow.source_group_id}`,
  );
  return {
    staging_row_id: deterministicUuidV5(
      `one-piece:complete-staging-row-v1:${batchId}:${manifestRow.source_product_id}`,
    ),
    staging_batch_id: batchId,
    source_product_id: Number(manifestRow.source_product_id),
    source_group_id: Number(manifestRow.source_group_id),
    source_payload_hash: manifestRow.source_payload_hash,
    staging_payload_sha256: sha256(stableJson(manifestRow)),
  };
}

function officialSeriesBySet(seriesSources) {
  const result = new Map();
  for (const series of seriesSources?.series ?? []) {
    if (series.supplemental_scope || series.supplemental_search) continue;
    for (const code of series.set_codes ?? []) {
      const rows = result.get(code) ?? [];
      rows.push({
        series_id: String(series.series_id),
        label: series.label,
        url: series.url,
        source_sha256: series.sha256,
        set_codes: [...series.set_codes],
      });
      result.set(code, rows);
    }
  }
  return result;
}

function releaseDateForSet(setCode, bindings) {
  if (setCode === "P" || setCode === "EB04") return null;
  const dates = [...new Set(bindings
    .filter((row) => row.set_code === setCode)
    .map((row) => row.release?.released_on)
    .filter(Boolean))].sort();
  return dates[0] ?? null;
}

function displayNameForSet(setCode, seriesRows) {
  if (setCode === "P") return "Promotion card";
  if (setCode === "EB04") return "Extra Booster [EB-04]";
  const direct = seriesRows.find((row) => row.set_codes.length === 1);
  return direct?.label ?? seriesRows[0]?.label ?? setCode;
}

function buildSetRows(bindings, seriesSources) {
  const seriesBySet = officialSeriesBySet(seriesSources);
  const setCodes = [...new Set(bindings.map((row) => row.set_code))]
    .filter((code) => code !== "ST01")
    .sort(compareText);
  return setCodes.map((code) => {
    const series = seriesBySet.get(code) ?? [];
    if (series.length === 0) {
      throw new Error(`Official series authority missing for ${code}`);
    }
    return {
      id: setId(code),
      game: ONE_PIECE_GAME_CODE,
      code,
      name: displayNameForSet(code, series),
      release_date: releaseDateForSet(code, bindings),
      identity_domain_default: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      source: {
        canonical_authority: "official_one_piece_card_game_english_card_list",
        official_series: series,
        source_release_date_policy: code === "P" || code === "EB04"
          ? "null_multi_release_family"
          : "earliest_current_source_product_release",
        visibility_authority: "catalog_game_release_controls:hidden",
      },
    };
  });
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

function buildNewNumberedRow(binding, manifestRow) {
  const productId = Number(binding.source_product_id);
  const official = binding.official_authority;
  const variantKey = `tcgplayer_product_${productId}`;
  const normalizedName = normalizeOnePieceOfficialNameV1(official.official_name);
  const identityPayload = {
    game_code: ONE_PIECE_GAME_CODE,
    language_code: "en",
    set_code: binding.set_code,
    printed_number: binding.card_number,
    normalized_printed_name: normalizedName,
    source_product_id: productId,
    variant_key: variantKey,
  };
  const identityHash = sha256(stableJson(identityPayload));
  const ids = targetIds(productId, identityHash);
  const staging = buildOnePieceCompleteStagingBindingV1(manifestRow);
  const evidenceSubject = {
    identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
    set_code: binding.set_code,
    printed_number: binding.card_number,
    printed_name: official.official_name,
    source_product_id: productId,
    variant_key: variantKey,
  };
  const evidencePayload = {
    durable_staging: {
      ...staging,
      source_manifest_logical_sha256:
        ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
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
      image_bytes_acquired: false,
    },
    source_product: {
      source_product_id: productId,
      source_product_name: binding.source_product_name,
      source_group_id: Number(binding.source_group_id),
      source_group_name: binding.source_group_name,
      source_identity_key_hash: binding.source_identity_key_hash,
      source_image_reference_only: binding.source_image_reference,
      source_image_pointer_authorized: false,
      source_name_support_kind: binding.source_name_support_kind,
      treatment_claims: binding.treatment_claims ?? [],
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
    source_product_name: binding.source_product_name,
    source_group_id: Number(binding.source_group_id),
    source_group_name: binding.source_group_name,
    card_number: binding.card_number,
    set_code: binding.set_code,
    staging,
    card_print: {
      id: ids.card_print_id,
      game_id: ONE_PIECE_GAME_ID,
      set_id: setId(binding.set_code),
      set_code: binding.set_code,
      name: official.official_name,
      number: binding.card_number,
      variant_key: variantKey,
      rarity: binding.rarity ?? official.rarities?.[0] ?? null,
      gv_id: binding.parent_gv_id,
      tcgplayer_id: String(productId),
      external_ids: { tcgplayer: String(productId) },
      identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      print_identity_key: `${ONE_PIECE_ST01_IDENTITY_DOMAIN}:${identityHash}`,
      image_url: null,
      image_alt_url: null,
      data_quality_flags: {
        app_visibility: "hidden_by_game_release_control",
        exact_printing_children_deferred: true,
        image_acquisition_deferred: true,
        image_pointer_deferred: true,
        source_product_variant_preserved_as_parent: true,
      },
      ai_metadata: {
        canonical_authority: "official_english_number_name_authority",
        source_product_name_raw: binding.source_product_name,
        source_card_type: binding.card_type ?? null,
        source_group_id: Number(binding.source_group_id),
        durable_staging_row_id: staging.staging_row_id,
      },
    },
    identity: {
      id: ids.identity_id,
      card_print_id: ids.card_print_id,
      identity_domain: ONE_PIECE_ST01_IDENTITY_DOMAIN,
      set_code_identity: binding.set_code,
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
        source_group_id: Number(binding.source_group_id),
        durable_staging_row_id: staging.staging_row_id,
        mapping_authority: "exact_durable_source_product_with_official_number_name",
        promotion_plan_version: ONE_PIECE_COMPLETE_NUMBERED_PROMOTION_VERSION,
      },
      active: true,
    },
  };
}

function retainedExistingRows(bindings, existingPlan) {
  const existingByProduct = new Map(existingPlan.payload.numbered_cards.map((row) =>
    [Number(row.source_product_id), row]));
  return bindings.filter((row) => row.existing_canonical).map((binding) => {
    const existing = existingByProduct.get(Number(binding.source_product_id));
    if (!existing || existing.card_number !== binding.card_number ||
        existing.card_print.gv_id !== binding.parent_gv_id) {
      throw new Error(`Existing ST-01 binding drift: ${binding.source_product_id}`);
    }
    return {
      source_product_id: Number(binding.source_product_id),
      card_number: binding.card_number,
      card_print_id: existing.card_print.id,
      card_print_identity_id: existing.identity.id,
      external_mapping_source: existing.external_mapping.source,
      external_mapping_id: existing.external_mapping.external_id,
      gv_id: existing.card_print.gv_id,
      action: "retain_without_write_or_mutation",
    };
  }).sort((left, right) => left.source_product_id - right.source_product_id);
}

export function buildOnePieceCompleteNumberedPromotionPlanV1(input) {
  if (stableJson(input.inputHashes) !==
      stableJson(ONE_PIECE_COMPLETE_NUMBERED_PINNED_INPUTS)) {
    throw new Error("Pinned complete-numbered promotion inputs changed");
  }
  if (input.authoritySummary?.authority_fingerprint_sha256 !==
      ONE_PIECE_COMPLETE_NUMBERED_AUTHORITY_FINGERPRINT ||
      input.reconciliationSummary?.reconciliation_fingerprint_sha256 !==
      ONE_PIECE_COMPLETE_NUMBERED_RECONCILIATION_FINGERPRINT) {
    throw new Error("Frozen reconciliation or official authority changed");
  }
  if (!validateOnePieceSt01PromotionPlanV1(input.existingSt01Plan).valid) {
    throw new Error("Existing ST-01 canonical plan is invalid");
  }

  const bindings = structuredClone(input.bindings ?? []).sort((left, right) =>
    Number(left.source_product_id) - Number(right.source_product_id));
  const eligible = bindings.filter((row) => row.canonical_promotion_eligible);
  const retainedBindings = eligible.filter((row) => row.existing_canonical);
  const newBindings = eligible.filter((row) => !row.existing_canonical);
  const holds = bindings.filter((row) => !row.canonical_promotion_eligible);
  const manifestByProduct = new Map((input.manifestRows ?? []).map((row) =>
    [Number(row.source_product_id), row]));
  const numberedCards = newBindings.map((binding) => {
    const manifestRow = manifestByProduct.get(Number(binding.source_product_id));
    if (!manifestRow || manifestRow.classification !== "exact_single_card_candidate" ||
        manifestRow.single_card_kind !== "numbered_card" ||
        manifestRow.promotion_state !== "current_candidate" ||
        manifestRow.source_payload_hash !== binding.source_binding?.source_payload_hash) {
      throw new Error(`Durable staging source mismatch: ${binding.source_product_id}`);
    }
    return buildNewNumberedRow(binding, manifestRow);
  });
  const setRows = buildSetRows(eligible, input.seriesSources);
  const retained = retainedExistingRows(retainedBindings, input.existingSt01Plan);
  const authorityHolds = holds.map((row) => ({
    source_product_id: Number(row.source_product_id),
    source_product_name: row.source_product_name,
    card_number: row.card_number,
    set_code: row.set_code,
    official_authority_status: row.official_authority_status,
    action: "hold_outside_canonical_apply",
  })).sort((left, right) => left.source_product_id - right.source_product_id);

  const payload = {
    set_rows: setRows,
    numbered_cards: numberedCards,
    retained_existing_rows: retained,
    authority_holds: authorityHolds,
  };
  const counts = {
    source_numbered_products: bindings.length,
    authority_eligible_products: eligible.length,
    retained_existing_products: retained.length,
    new_set_rows: setRows.length,
    new_card_prints: numberedCards.length,
    new_identity_rows: numberedCards.length,
    new_source_evidence_rows: numberedCards.length,
    new_external_mappings: numberedCards.length,
    official_catalog_gap_holds: authorityHolds.length,
  };
  const core = {
    version: ONE_PIECE_COMPLETE_NUMBERED_PROMOTION_VERSION,
    repository: input.repository,
    input_hashes: input.inputHashes,
    source_authority: {
      authority_fingerprint_sha256:
        input.authoritySummary.authority_fingerprint_sha256,
      reconciliation_fingerprint_sha256:
        input.reconciliationSummary.reconciliation_fingerprint_sha256,
      immutable_staging_release_plan_fingerprint:
        input.reconciliationSummary.source_authority
          ?.immutable_staging_release_plan_fingerprint,
      immutable_staging_release_payload_fingerprint:
        input.reconciliationSummary.source_authority
          ?.immutable_staging_release_payload_fingerprint,
      source_manifest_logical_sha256:
        ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
    },
    counts,
    payload_fingerprint_sha256: sha256(stableJson(payload)),
    payload,
    boundaries: structuredClone(CLOSED_BOUNDARIES),
  };
  return {
    ...core,
    plan_fingerprint_sha256: sha256(stableJson(core)),
  };
}

export function validateOnePieceCompleteNumberedPromotionPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_COMPLETE_NUMBERED_PROMOTION_VERSION,
    "version_mismatch");
  add(plan?.plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "plan_fingerprint_mismatch");
  add(plan?.payload_fingerprint_sha256 !== sha256(stableJson(plan?.payload)),
    "payload_fingerprint_mismatch");
  add(stableJson(plan?.input_hashes) !==
    stableJson(ONE_PIECE_COMPLETE_NUMBERED_PINNED_INPUTS), "input_hashes_mismatch");
  add(stableJson(plan?.counts) !==
    stableJson(ONE_PIECE_COMPLETE_NUMBERED_EXPECTED), "count_contract_mismatch");
  add(plan?.repository?.branch !== "agent/one-piece-ingestion-readiness-v1" ||
    !/^[0-9a-f]{40}$/.test(plan?.repository?.commit_sha ?? ""),
  "repository_identity_invalid");
  for (const [key, value] of Object.entries(CLOSED_BOUNDARIES)) {
    add(plan?.boundaries?.[key] !== value, `boundary_drift:${key}`);
  }

  const sets = plan?.payload?.set_rows ?? [];
  const rows = plan?.payload?.numbered_cards ?? [];
  const retained = plan?.payload?.retained_existing_rows ?? [];
  const holds = plan?.payload?.authority_holds ?? [];
  add(sets.length !== 58, "set_count_mismatch");
  add(rows.length !== 6513, "new_card_count_mismatch");
  add(retained.length !== 17, "retained_count_mismatch");
  add(holds.length !== 17, "hold_count_mismatch");
  const setIds = new Set(sets.map((row) => row.id));
  const setCodes = new Set(sets.map((row) => row.code));
  add(setCodes.has("ST01") || setIds.has(ONE_PIECE_ST01_SET_ID),
    "existing_st01_set_reinserted");
  for (const set of sets) {
    add(set.id !== setId(set.code), `set_id_mismatch:${set.code}`);
    add(set.game !== ONE_PIECE_GAME_CODE ||
      set.identity_domain_default !== ONE_PIECE_ST01_IDENTITY_DOMAIN,
    `set_contract_mismatch:${set.code}`);
    add(!set.source?.official_series?.length,
      `set_official_authority_missing:${set.code}`);
  }

  const uniqueFields = {
    source_product_id: rows.map((row) => row.source_product_id),
    gv_id: rows.map((row) => row.card_print?.gv_id),
    card_print_id: rows.map((row) => row.card_print?.id),
    identity_id: rows.map((row) => row.identity?.id),
    identity_hash: rows.map((row) => row.identity?.identity_key_hash),
    evidence_id: rows.map((row) => row.source_evidence?.id),
    evidence_hash: rows.map((row) => row.source_evidence?.evidence_key_hash),
    external_id: rows.map((row) => row.external_mapping?.external_id),
    staging_row_id: rows.map((row) => row.staging?.staging_row_id),
  };
  for (const [field, values] of Object.entries(uniqueFields)) {
    add(values.some((value) => value === null || value === undefined || value === ""),
      `missing_unique_value:${field}`);
    add(new Set(values.map(String)).size !== rows.length,
      `duplicate_value:${field}`);
  }

  for (const row of rows) {
    const prefix = row.source_product_id ?? "unknown";
    const productId = Number(row.source_product_id);
    const expectedVariant = `tcgplayer_product_${productId}`;
    const expectedSetId = row.set_code === "ST01"
      ? ONE_PIECE_ST01_SET_ID
      : setId(row.set_code);
    add(row.card_print?.set_id !== expectedSetId ||
      row.card_print?.set_code !== row.set_code,
    `set_reference_mismatch:${prefix}`);
    add(row.card_print?.variant_key !== expectedVariant ||
      row.identity?.identity_payload?.variant_key !== expectedVariant,
    `variant_key_mismatch:${prefix}`);
    add(row.identity?.identity_payload?.source_product_id !== productId,
      `identity_product_mismatch:${prefix}`);
    add(row.identity?.identity_key_hash !==
      sha256(stableJson(row.identity?.identity_payload)),
    `identity_hash_mismatch:${prefix}`);
    add(row.card_print?.id !== row.identity?.card_print_id ||
      row.card_print?.id !== row.source_evidence?.card_print_id ||
      row.identity?.id !== row.source_evidence?.card_print_identity_id,
    `reference_mismatch:${prefix}`);
    add(row.card_print?.image_url !== null || row.card_print?.image_alt_url !== null,
      `image_pointer_present:${prefix}`);
    add(row.source_evidence?.evidence_payload?.source_product
      ?.source_image_pointer_authorized !== false,
    `source_image_pointer_authority_open:${prefix}`);
    add(row.external_mapping?.source !== "tcgplayer" ||
      row.external_mapping?.external_id !== String(productId) ||
      row.external_mapping?.card_print_id !== row.card_print?.id,
    `mapping_mismatch:${prefix}`);
    add(row.staging?.source_product_id !== productId ||
      !row.staging?.staging_payload_sha256 ||
      !row.staging?.source_payload_hash,
    `staging_binding_invalid:${prefix}`);
    add(row.identity?.identity_domain !== ONE_PIECE_ST01_IDENTITY_DOMAIN ||
      row.identity?.identity_key_version !==
        ONE_PIECE_COMPLETE_NUMBERED_IDENTITY_KEY_VERSION,
    `identity_contract_mismatch:${prefix}`);
  }

  const newProducts = new Set(rows.map((row) => Number(row.source_product_id)));
  add(retained.some((row) => newProducts.has(Number(row.source_product_id))),
    "retained_product_reinserted");
  add(holds.some((row) => newProducts.has(Number(row.source_product_id))),
    "held_product_in_payload");
  add(new Set([...newProducts, ...retained.map((row) =>
    Number(row.source_product_id)), ...holds.map((row) =>
    Number(row.source_product_id))]).size !== 6547,
  "source_product_accounting_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function expectedOnePieceCompleteNumberedAttributableWritesV1() {
  return {
    sets: 58,
    card_prints: 6513,
    card_print_identity: 6513,
    card_print_identity_source_evidence: 6513,
    external_mappings: 6513,
  };
}

