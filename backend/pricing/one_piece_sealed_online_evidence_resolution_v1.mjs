import {
  buildSealedFamilyIdentityV1,
  buildSealedVariantIdentityV1,
  SEALED_PACKAGE_FORMS_V1,
  sha256V1,
  stableJsonV1,
} from "./cross_tcg_sealed_product_domain_v1.mjs";
import {
  deterministicUuidV5,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_ST01_UUID_NAMESPACE,
} from "./one_piece_st01_canonical_promotion_v1.mjs";

export const ONE_PIECE_SEALED_ONLINE_EVIDENCE_RESOLUTION_VERSION =
  "ONE_PIECE_SEALED_ONLINE_EVIDENCE_RESOLUTION_V1";
export const ONE_PIECE_SEALED_AUTOMATED_REVIEW_VERSION =
  "ONE_PIECE_SEALED_AUTOMATED_EVIDENCE_REVIEW_V1";
export const ONE_PIECE_SEALED_AUTOMATION_REVIEWER_ID = deterministicUuidV5(
  "one-piece:sealed:automated-online-evidence-reviewer:v1",
  ONE_PIECE_ST01_UUID_NAMESPACE,
);

const TCGPLAYER_CATEGORY_ID = 68;
const TCGCSV_HOST = "tcgcsv.com";
const TCGPLAYER_HOST = "www.tcgplayer.com";
const TCGPLAYER_IMAGE_HOST = "tcgplayer-cdn.tcgplayer.com";
const CARD_METADATA_KEYS = new Set([
  "number",
  "rarity",
  "cardtype",
  "card type",
  "cost",
  "power",
  "life",
  "counterplus",
]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeOnePieceSealedSourceTextV1(value) {
  return clean(value).normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function exactTcgplayerProductUrl(productId, value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.toLowerCase() === TCGPLAYER_HOST &&
      url.pathname.startsWith(`/product/${productId}/`);
  } catch {
    return false;
  }
}

function exactTcgplayerImageUrl(productId, value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.toLowerCase() === TCGPLAYER_IMAGE_HOST &&
      new RegExp(`/product/${productId}(?:_|\\.)`, "i").test(url.pathname);
  } catch {
    return false;
  }
}

function tcgcsvGroupUrl(categoryId, groupId, value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.toLowerCase() === TCGCSV_HOST &&
      url.pathname === `/tcgplayer/${categoryId}/${groupId}/products`;
  } catch {
    return false;
  }
}

function containsCardMetadata(product) {
  return (product?.extendedData ?? []).some((entry) =>
    CARD_METADATA_KEYS.has(clean(entry?.name ?? entry?.displayName).toLowerCase()));
}

function packageFormEvidenceValid(review) {
  const proposal = review?.proposed_variant?.package_form_proposal;
  const form = review?.proposed_variant?.proposed_package_form;
  return SEALED_PACKAGE_FORMS_V1.includes(form) &&
    proposal?.package_form === form &&
    Number(proposal?.confidence) >= 0.9 &&
    (proposal?.evidence ?? []).some((entry) =>
      entry?.source_field === "source_product_name" &&
      normalizeOnePieceSealedSourceTextV1(entry?.source_value) ===
        normalizeOnePieceSealedSourceTextV1(review?.source_product_name));
}

function dateOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function explicitJapanese(candidate) {
  return candidate?.candidate_identity?.language?.normalized === "ja";
}

function futureOrPresale(candidate, product) {
  return candidate?.candidate_identity?.release?.future_release === true ||
    candidate?.candidate_identity?.release?.explicit_presale === true ||
    product?.presaleInfo?.isPresale === true;
}

function sourceProductEvidence(candidate, product, snapshot, review) {
  const expectedImage = candidate?.evidence?.find((entry) =>
    entry.evidence_class === "reference_only_assets_and_price_lanes")
    ?.source_image_reference_only;
  const checks = {
    source_endpoint_is_exact_group: tcgcsvGroupUrl(
      candidate.source_category_id,
      candidate.source_group_id,
      snapshot.source_url,
    ),
    category_id_matches: Number(product?.categoryId) ===
      Number(candidate.source_category_id) &&
      Number(candidate.source_category_id) === TCGPLAYER_CATEGORY_ID,
    group_id_matches: Number(product?.groupId) ===
      Number(candidate.source_group_id),
    product_id_matches: Number(product?.productId) ===
      Number(candidate.source_product_id),
    product_name_matches: normalizeOnePieceSealedSourceTextV1(product?.name) ===
      normalizeOnePieceSealedSourceTextV1(candidate.source_product_name),
    candidate_source_identity_matches:
      Number(candidate?.candidate_identity?.source_product_identity?.product_id) ===
        Number(candidate.source_product_id) &&
      Number(candidate?.candidate_identity?.source_product_identity?.group_id) ===
        Number(candidate.source_group_id) &&
      normalizeOnePieceSealedSourceTextV1(
        candidate?.candidate_identity?.source_product_identity?.product_name,
      ) === normalizeOnePieceSealedSourceTextV1(candidate.source_product_name),
    canonical_product_url_matches: exactTcgplayerProductUrl(
      candidate.source_product_id,
      product?.url,
    ),
    image_identity_matches: exactTcgplayerImageUrl(
      candidate.source_product_id,
      product?.imageUrl,
    ) && product?.imageUrl === expectedImage,
    no_card_metadata: !containsCardMetadata(product),
    package_form_supported_by_exact_source_name: packageFormEvidenceValid(review),
    response_hash_present: /^[0-9a-f]{64}$/.test(snapshot.response_sha256 ?? ""),
  };
  const core = {
    evidence_class: "tcgcsv_tcgplayer_catalog_exact_product",
    source_url: snapshot.source_url,
    source_response_sha256: snapshot.response_sha256,
    fetched_at: snapshot.fetched_at,
    transport: snapshot.transport,
    source_product: {
      product_id: Number(product?.productId),
      category_id: Number(product?.categoryId),
      group_id: Number(product?.groupId),
      name: product?.name ?? null,
      clean_name: product?.cleanName ?? null,
      canonical_tcgplayer_url: product?.url ?? null,
      image_url: product?.imageUrl ?? null,
      image_count: Number(product?.imageCount ?? 0),
      modified_on: product?.modifiedOn ?? null,
      presale_info: product?.presaleInfo ?? null,
      extended_data_count: (product?.extendedData ?? []).length,
    },
    checks,
    exact_source_identity: Object.values(checks).every(Boolean),
    image_pointer_authority: false,
    pricing_authority: false,
    publication_authority: false,
  };
  return {
    ...core,
    evidence_fingerprint_sha256: sha256V1(stableJsonV1(core)),
  };
}

function deterministicId(label) {
  return deterministicUuidV5(label, ONE_PIECE_ST01_UUID_NAMESPACE);
}

function evidenceRow({ variantId, mappingId, candidate, resolution, dimension,
  sourceField, sourceValue, normalizedValue, strength, confidence }) {
  const core = {
    variant_id: variantId,
    source_mapping_id: mappingId,
    evidence_dimension: dimension,
    source_provider: "tcgplayer",
    source_object_identity: `tcgplayer:${candidate.source_product_id}`,
    source_field: sourceField,
    source_value: clean(sourceValue),
    normalized_value: normalizedValue,
    evidence_strength: strength,
    confidence,
    source_payload_hash: candidate.source_payload_hash,
    observed_at: resolution.source_evidence.fetched_at,
  };
  const evidenceFingerprint = sha256V1(stableJsonV1(core));
  return {
    id: deterministicId(`one-piece:sealed:evidence:${evidenceFingerprint}`),
    ...core,
    evidence_fingerprint: evidenceFingerprint,
  };
}

function buildCanonicalRows(candidate, review, binding, resolution,
  resolvedFamilyKey) {
  const family = buildSealedFamilyIdentityV1({
    game_key: "one_piece",
    family_key: resolvedFamilyKey,
    canonical_name: review.proposed_family.proposed_canonical_name,
    manufacturer_name: "Bandai",
    product_line_key: review.proposed_family.proposed_product_line_key,
  });
  const familyId = deterministicId(
    `one-piece:sealed:family:${family.identity_fingerprint}`,
  );
  const releaseDate = dateOnly(
    resolution.source_evidence.source_product.presale_info?.releasedOn,
  );
  const variant = buildSealedVariantIdentityV1({
    family_identity_fingerprint: family.identity_fingerprint,
    variant_key: review.proposed_variant.proposed_variant_key,
    canonical_name: review.proposed_variant.proposed_canonical_name,
    package_form: review.proposed_variant.proposed_package_form,
    language_code: "en",
    region_code: review.proposed_variant.proposed_region_code,
    edition: review.proposed_variant.proposed_edition,
    wave: review.proposed_variant.proposed_wave,
    explicit_contents: [],
    manufacturer_sku: review.proposed_variant.proposed_manufacturer_sku,
    upc: review.proposed_variant.proposed_upc,
    release_date: releaseDate,
  });
  const variantId = deterministicId(
    `one-piece:sealed:variant:${variant.identity_fingerprint}`,
  );
  const reviewId = deterministicId(
    `one-piece:sealed:auto-review:${candidate.id}:${resolution.resolution_fingerprint_sha256}`,
  );
  const mappingCore = {
    variant_id: variantId,
    candidate_id: candidate.id,
    review_id: reviewId,
    candidate_classification: "sealed_candidate",
    review_decision: "confirmed_sealed",
    promotion_authorized: true,
    source_provider: "tcgplayer",
    source_category_id: candidate.source_category_id,
    source_group_id: candidate.source_group_id,
    source_product_id: candidate.source_product_id,
    source_product_name: candidate.source_product_name,
    source_url: resolution.source_evidence.source_product.canonical_tcgplayer_url,
    source_payload_hash: candidate.source_payload_hash,
    classifier_version: candidate.classifier_version,
    mapping_contract_version: ONE_PIECE_SEALED_AUTOMATED_REVIEW_VERSION,
    mapping_status: "exact_reviewed",
  };
  const mappingFingerprint = sha256V1(stableJsonV1(mappingCore));
  const mappingId = deterministicId(
    `one-piece:sealed:mapping:${mappingFingerprint}`,
  );
  const official = binding?.binding_status ===
      "official_family_support_candidate_unique"
    ? binding.official_record
    : null;
  const familyRow = { id: familyId, ...family };
  const variantRow = { id: variantId, family_id: familyId, ...variant };
  const reviewRow = {
    id: reviewId,
    candidate_id: candidate.id,
    decision: "confirmed_sealed",
    promotion_authorized: true,
    reviewed_by: ONE_PIECE_SEALED_AUTOMATION_REVIEWER_ID,
    decision_evidence: {
      adjudication: "deterministic_online_source_evidence",
      source_evidence_fingerprint_sha256:
        resolution.source_evidence.evidence_fingerprint_sha256,
      resolution_fingerprint_sha256: resolution.resolution_fingerprint_sha256,
      official_family_record_fingerprint_sha256:
        official?.official_record_fingerprint_sha256 ?? null,
      official_family_support: Boolean(official),
      exact_source_identity: true,
      exact_package_form: true,
      human_judgment_used: false,
      publication_authority: false,
    },
    review_contract_version: ONE_PIECE_SEALED_AUTOMATED_REVIEW_VERSION,
  };
  const mappingRow = {
    id: mappingId,
    ...mappingCore,
    mapping_fingerprint: mappingFingerprint,
  };
  const evidence = [
    evidenceRow({
      variantId,
      mappingId,
      candidate,
      resolution,
      dimension: "product_line",
      sourceField: "groupId+name",
      sourceValue: `${candidate.source_group_id} | ${review.source_identity.group_name}`,
      normalizedValue: {
        group_id: candidate.source_group_id,
        product_line_key: family.product_line_key,
      },
      strength: "strong",
      confidence: 1,
    }),
    evidenceRow({
      variantId,
      mappingId,
      candidate,
      resolution,
      dimension: "package_form",
      sourceField: "name",
      sourceValue: candidate.source_product_name,
      normalizedValue: { package_form: variant.package_form },
      strength: "strong",
      confidence: 1,
    }),
    evidenceRow({
      variantId,
      mappingId,
      candidate,
      resolution,
      dimension: "language",
      sourceField: "categoryId+name",
      sourceValue: `${candidate.source_category_id} | ${candidate.source_product_name}`,
      normalizedValue: {
        language_code: "en",
        explicit_non_english_marker: false,
      },
      strength: "moderate",
      confidence: 0.95,
    }),
    evidenceRow({
      variantId,
      mappingId,
      candidate,
      resolution,
      dimension: "presale_state",
      sourceField: "presaleInfo",
      sourceValue: JSON.stringify(
        resolution.source_evidence.source_product.presale_info ?? null,
      ),
      normalizedValue: {
        is_presale: false,
        current_release_eligible: true,
      },
      strength: "strong",
      confidence: 1,
    }),
  ];
  if (releaseDate) {
    evidence.push(evidenceRow({
      variantId,
      mappingId,
      candidate,
      resolution,
      dimension: "release_date",
      sourceField: "presaleInfo.releasedOn",
      sourceValue:
        resolution.source_evidence.source_product.presale_info.releasedOn,
      normalizedValue: { release_date: releaseDate },
      strength: "strong",
      confidence: 1,
    }));
  }
  return { familyRow, variantRow, reviewRow, mappingRow, evidence };
}

export function buildOnePieceSealedOnlineEvidenceResolutionV1({
  repository,
  candidatePlan,
  reviewRows,
  officialBindings,
  groupSnapshots,
  sourceDeclaration,
}) {
  const candidates = candidatePlan?.payload?.candidates ?? [];
  const reviews = new Map(reviewRows.map((row) => [row.candidate_id, row]));
  const bindings = new Map(officialBindings.map((row) => [row.candidate_id, row]));
  const snapshots = new Map(groupSnapshots.map((row) => [
    `${row.category_id}:${row.group_id}`,
    row,
  ]));
  const resolutions = [];

  for (const candidate of candidates) {
    const review = reviews.get(candidate.id);
    const binding = bindings.get(candidate.id);
    const snapshot = snapshots.get(
      `${candidate.source_category_id}:${candidate.source_group_id}`,
    );
    const product = snapshot?.candidate_products?.find((row) =>
      Number(row.productId) === Number(candidate.source_product_id));
    const sourceEvidence = sourceProductEvidence(
      candidate,
      product,
      snapshot ?? {},
      review,
    );
    const languageHold = explicitJapanese(candidate);
    const releaseHold = futureOrPresale(candidate, product);
    const resolutionStatus = !sourceEvidence.exact_source_identity
      ? "evidence_gap_requires_review"
      : languageHold
        ? "scope_held_non_english"
        : releaseHold
          ? "scope_held_future_or_presale"
          : "auto_resolved_current_english";
    const core = {
      candidate_id: candidate.id,
      source_product_id: candidate.source_product_id,
      source_product_name: candidate.source_product_name,
      source_payload_hash: candidate.source_payload_hash,
      source_evidence: sourceEvidence,
      official_family_support: binding?.binding_status ===
        "official_family_support_candidate_unique",
      official_family_record_fingerprint_sha256:
        binding?.official_record?.official_record_fingerprint_sha256 ?? null,
      package_form: review?.proposed_variant?.proposed_package_form ?? null,
      language_code: candidate?.candidate_identity?.language?.normalized ?? null,
      future_or_presale: releaseHold,
      resolution_status: resolutionStatus,
      human_review_required: resolutionStatus === "evidence_gap_requires_review",
      automated_review_authority:
        resolutionStatus === "auto_resolved_current_english",
      canonical_plan_eligible:
        resolutionStatus === "auto_resolved_current_english",
      database_apply_authority: false,
      pricing_authority: false,
      publication_authority: false,
    };
    resolutions.push({
      ...core,
      resolution_fingerprint_sha256: sha256V1(stableJsonV1(core)),
    });
  }

  const familyByFingerprint = new Map();
  const productLinesByFamilyKey = new Map();
  for (const resolution of resolutions.filter((row) =>
    row.canonical_plan_eligible)) {
    const review = reviews.get(resolution.candidate_id);
    const familyKey = review.proposed_family.proposed_family_key;
    const productLineKey = review.proposed_family.proposed_product_line_key;
    const productLines = productLinesByFamilyKey.get(familyKey) ?? new Set();
    productLines.add(productLineKey);
    productLinesByFamilyKey.set(familyKey, productLines);
  }
  const variants = [];
  const automatedReviews = [];
  const sourceMappings = [];
  const variantEvidence = [];
  const candidateById = new Map(candidates.map((row) => [row.id, row]));
  for (const resolution of resolutions.filter((row) =>
    row.canonical_plan_eligible)) {
    const candidate = candidateById.get(resolution.candidate_id);
    const review = reviews.get(resolution.candidate_id);
    const binding = bindings.get(resolution.candidate_id);
    const proposedFamilyKey = review.proposed_family.proposed_family_key;
    const productLineKey = review.proposed_family.proposed_product_line_key;
    const resolvedFamilyKey = productLinesByFamilyKey.get(proposedFamilyKey)
      ?.size > 1
      ? `${productLineKey}_${proposedFamilyKey}`
      : proposedFamilyKey;
    const rows = buildCanonicalRows(candidate, review, binding, resolution,
      resolvedFamilyKey);
    const priorFamily = familyByFingerprint.get(
      rows.familyRow.identity_fingerprint,
    );
    if (priorFamily && stableJsonV1(priorFamily) !==
        stableJsonV1(rows.familyRow)) {
      throw new Error(`Family identity collision: ${rows.familyRow.family_key}`);
    }
    familyByFingerprint.set(rows.familyRow.identity_fingerprint, rows.familyRow);
    variants.push(rows.variantRow);
    automatedReviews.push(rows.reviewRow);
    sourceMappings.push(rows.mappingRow);
    variantEvidence.push(...rows.evidence);
  }

  const heldOrResidual = resolutions.filter((row) =>
    !row.canonical_plan_eligible);
  const canonicalPlan = {
    families: [...familyByFingerprint.values()].sort((a, b) =>
      a.family_key.localeCompare(b.family_key)),
    variants: variants.sort((a, b) => a.canonical_name.localeCompare(
      b.canonical_name) || a.id.localeCompare(b.id)),
    automated_reviews: automatedReviews.sort((a, b) =>
      a.candidate_id.localeCompare(b.candidate_id)),
    source_mappings: sourceMappings.sort((a, b) =>
      a.source_product_id - b.source_product_id),
    variant_evidence: variantEvidence.sort((a, b) =>
      a.id.localeCompare(b.id)),
  };
  const statusCounts = Object.fromEntries([
    "auto_resolved_current_english",
    "scope_held_non_english",
    "scope_held_future_or_presale",
    "evidence_gap_requires_review",
  ].map((status) => [status, resolutions.filter((row) =>
    row.resolution_status === status).length]));
  const core = {
    version: ONE_PIECE_SEALED_ONLINE_EVIDENCE_RESOLUTION_VERSION,
    repository,
    candidate_plan_fingerprint_sha256: candidatePlan.plan_fingerprint_sha256,
    source_declaration: sourceDeclaration,
    counts: {
      candidates: candidates.length,
      group_snapshots: groupSnapshots.length,
      exact_source_identities: resolutions.filter((row) =>
        row.source_evidence.exact_source_identity).length,
      statuses: statusCounts,
      human_review_required: resolutions.filter((row) =>
        row.human_review_required).length,
      canonical_families_planned: canonicalPlan.families.length,
      canonical_variants_planned: canonicalPlan.variants.length,
      automated_reviews_planned: canonicalPlan.automated_reviews.length,
      exact_source_mappings_planned: canonicalPlan.source_mappings.length,
      variant_evidence_rows_planned: canonicalPlan.variant_evidence.length,
      held_or_residual: heldOrResidual.length,
    },
    payload: {
      resolutions: resolutions.sort((a, b) =>
        a.source_product_id - b.source_product_id),
      canonical_plan: canonicalPlan,
      held_or_residual: heldOrResidual.sort((a, b) =>
        a.source_product_id - b.source_product_id),
    },
    boundaries: {
      network_reads: true,
      automated_evidence_adjudication: true,
      human_review_required_for_exact_source_match: false,
      database_connections: 0,
      database_writes: 0,
      storage_writes: 0,
      apply_authority: false,
      pricing_authority: false,
      publication_authority: false,
      app_visibility_enabled: false,
    },
  };
  return {
    ...core,
    resolution_fingerprint_sha256: sha256V1(stableJsonV1(core)),
  };
}

export function validateOnePieceSealedOnlineEvidenceResolutionV1(result) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { resolution_fingerprint_sha256: ignored, ...core } = result ?? {};
  const resolutions = result?.payload?.resolutions ?? [];
  const plan = result?.payload?.canonical_plan ?? {};
  const counts = result?.counts ?? {};
  add(result?.version !== ONE_PIECE_SEALED_ONLINE_EVIDENCE_RESOLUTION_VERSION,
    "version_mismatch");
  add(result?.resolution_fingerprint_sha256 !==
    sha256V1(stableJsonV1(core)), "resolution_fingerprint_mismatch");
  add(result?.source_declaration?.direct_tcgplayer_api_export !== true ||
    !/^[0-9a-f]{64}$/.test(
      result?.source_declaration?.response_sha256 ?? ""),
  "source_declaration_missing");
  add(resolutions.length !== 403 || counts.candidates !== 403,
    "candidate_count_mismatch");
  add(new Set(resolutions.map((row) => row.candidate_id)).size !== 403,
    "candidate_identity_mismatch");
  add(new Set(resolutions.map((row) => row.source_product_id)).size !== 403,
    "source_product_identity_mismatch");
  for (const row of resolutions) {
    const { resolution_fingerprint_sha256: fingerprint, ...rowCore } = row;
    add(fingerprint !== sha256V1(stableJsonV1(rowCore)),
      `row_fingerprint_mismatch:${row.source_product_id}`);
    add(row.source_evidence?.exact_source_identity !== true,
      `source_identity_not_exact:${row.source_product_id}`);
    add(row.database_apply_authority !== false ||
      row.pricing_authority !== false || row.publication_authority !== false,
    `row_authority_overclaim:${row.source_product_id}`);
  }
  add(counts.exact_source_identities !== 403,
    "exact_source_identity_count_mismatch");
  add(counts.statuses?.auto_resolved_current_english !== 390,
    "auto_resolution_count_mismatch");
  add(counts.statuses?.scope_held_non_english !== 3,
    "language_hold_count_mismatch");
  add(counts.statuses?.scope_held_future_or_presale !== 10,
    "future_hold_count_mismatch");
  add(counts.statuses?.evidence_gap_requires_review !== 0 ||
    counts.human_review_required !== 0,
  "manual_review_residual_present");
  for (const [label, rows] of [
    ["variants", plan.variants ?? []],
    ["automated_reviews", plan.automated_reviews ?? []],
    ["source_mappings", plan.source_mappings ?? []],
  ]) {
    add(rows.length !== 390, `${label}_count_mismatch`);
    add(new Set(rows.map((row) => row.id)).size !== rows.length,
      `${label}_duplicate_id`);
  }
  const families = plan.families ?? [];
  add(new Set(families.map((row) => `${row.game_key}|${row.family_key}`))
    .size !== families.length, "families_duplicate_game_key_family_key");
  add(new Set(families.map((row) => row.identity_fingerprint)).size !==
    families.length, "families_duplicate_identity_fingerprint");
  const variants = plan.variants ?? [];
  add(new Set(variants.map((row) => `${row.family_id}|${row.variant_key}`))
    .size !== variants.length, "variants_duplicate_family_id_variant_key");
  add(new Set(variants.map((row) => row.identity_fingerprint)).size !==
    variants.length, "variants_duplicate_identity_fingerprint");
  const mappings = plan.source_mappings ?? [];
  add(new Set(mappings.map((row) =>
    `${row.source_provider}|${row.source_category_id}|${row.source_group_id}|${row.source_product_id}`,
  )).size !== mappings.length, "source_mappings_duplicate_exact_source");
  add(new Set(mappings.map((row) => row.mapping_fingerprint)).size !==
    mappings.length, "source_mappings_duplicate_fingerprint");
  const evidenceRows = plan.variant_evidence ?? [];
  add(new Set(evidenceRows.map((row) => row.evidence_fingerprint)).size !==
    evidenceRows.length, "variant_evidence_duplicate_fingerprint");
  add((plan.automated_reviews ?? []).some((row) =>
    row.decision !== "confirmed_sealed" || row.promotion_authorized !== true ||
    row.reviewed_by !== ONE_PIECE_SEALED_AUTOMATION_REVIEWER_ID ||
    row.decision_evidence?.human_judgment_used !== false),
  "automated_review_contract_mismatch");
  add((plan.source_mappings ?? []).some((row) =>
    row.mapping_status !== "exact_reviewed" ||
    row.promotion_authorized !== true || row.source_provider !== "tcgplayer"),
  "source_mapping_contract_mismatch");
  add((plan.variant_evidence ?? []).some((row) =>
    row.source_provider !== "tcgplayer" ||
    !/^[0-9a-f]{64}$/.test(row.evidence_fingerprint ?? "")),
  "variant_evidence_contract_mismatch");
  const boundaries = result?.boundaries ?? {};
  add(boundaries.network_reads !== true ||
    boundaries.automated_evidence_adjudication !== true ||
    boundaries.human_review_required_for_exact_source_match !== false ||
    boundaries.database_connections !== 0 || boundaries.database_writes !== 0 ||
    boundaries.storage_writes !== 0 || boundaries.apply_authority !== false ||
    boundaries.pricing_authority !== false ||
    boundaries.publication_authority !== false ||
    boundaries.app_visibility_enabled !== false,
  "boundaries_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
