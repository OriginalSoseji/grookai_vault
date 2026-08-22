import { createHash } from 'node:crypto';

import { deterministicUuidV5 } from './one_piece_canonical_import_staging_v1.mjs';
import { classifyCrossTcgSealedProductV1 } from './cross_tcg_sealed_product_identity_v1.mjs';
import { classifyOnePieceSealedPriceLineageV1 } from './one_piece_sealed_pricing_lineage_v1.mjs';

export const MTG_SEALED_WORLD_V1 = 'MTG_SEALED_WORLD_V1';
export const MTG_SEALED_GAME_KEY = 'mtg';
export const MTG_SEALED_CATEGORY_ID = 1;
export const MTG_SEALED_REVIEWER_ID = deterministicUuidV5(
  'grookai:system-actor:mtg-sealed-world-v1',
);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function stableJsonMtgSealedV1(value) {
  return JSON.stringify(stable(value));
}

export function hashMtgSealedV1(value) {
  return createHash('sha256').update(
    typeof value === 'string' || Buffer.isBuffer(value)
      ? value
      : stableJsonMtgSealedV1(value),
  ).digest('hex');
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function language(row) {
  const value = clean(row.name).toLowerCase();
  const markers = [
    ['chinese', 'zh'], ['french', 'fr'], ['german', 'de'], ['italian', 'it'],
    ['japanese', 'ja'], ['korean', 'ko'], ['portuguese', 'pt'],
    ['russian', 'ru'], ['spanish', 'es'],
  ];
  const explicit = markers.find(([marker]) =>
    new RegExp(`(^|[^a-z])${marker}([^a-z]|$)`, 'i').test(value));
  return explicit
    ? { code: explicit[1], authority: 'explicit_source_product_name', source_value: explicit[0] }
    : { code: 'en', authority: 'tcgplayer_magic_default_language_lane',
      source_value: row.category_display_name };
}

function isoDay(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function candidateId(row) {
  return deterministicUuidV5(
    `mtg:sealed:candidate:${row.category_id}:${row.group_id}:${row.product_id}:${row.payload_hash}`,
  );
}

function familyId(row) {
  return deterministicUuidV5(`mtg:sealed:family:tcgplayer-group:${row.group_id}`);
}

function variantId(row) {
  return deterministicUuidV5(`mtg:sealed:variant:tcgplayer-product:${row.product_id}`);
}

function reviewId(row) {
  return deterministicUuidV5(`mtg:sealed:review:tcgplayer-product:${row.product_id}`);
}

function mappingId(row) {
  return deterministicUuidV5(`mtg:sealed:mapping:tcgplayer-product:${row.product_id}`);
}

function evidenceId(row, dimension, ordinal = 0) {
  return deterministicUuidV5(
    `mtg:sealed:evidence:${row.product_id}:${dimension}:${ordinal}`,
  );
}

function qualificationId(row, price) {
  return deterministicUuidV5(
    `mtg:sealed:qualification:${row.product_id}:${price.source_price_row_identity}:${price.observed_on}`,
  );
}

function familyRow(row) {
  const identity = {
    game_key: MTG_SEALED_GAME_KEY,
    family_key: `tcgplayer_group_${row.group_id}`,
    canonical_name: clean(row.group_name),
    manufacturer_name: 'Wizards of the Coast',
    product_line_key: `tcgplayer_group_${row.group_id}`,
    identity_contract_version: MTG_SEALED_WORLD_V1,
  };
  return { id: familyId(row), ...identity,
    identity_fingerprint: hashMtgSealedV1(identity) };
}

function variantRow(row, classification) {
  const locale = language(row);
  const quantities = classification.candidate_identity.quantity_contents ?? [];
  const releaseDate = isoDay(
    classification.candidate_identity.release_presale_state?.released_on,
  );
  const editionWave = classification.candidate_identity.edition_wave ?? [];
  const identity = {
    family_id: familyId(row),
    variant_key: `tcgplayer_product_${row.product_id}`,
    canonical_name: clean(row.name),
    package_form: classification.candidate_identity.package_form,
    language_code: locale.code,
    region_code: null,
    edition: editionWave[0] ?? null,
    wave: editionWave.find((value) => /^wave\b/i.test(value)) ?? null,
    explicit_contents: quantities.map(({ quantity, unit }) => ({ quantity, unit })),
    manufacturer_sku: null,
    upc: null,
    release_date: releaseDate,
    identity_contract_version: MTG_SEALED_WORLD_V1,
  };
  return { id: variantId(row), ...identity,
    identity_fingerprint: hashMtgSealedV1(identity) };
}

function candidateRow(row, classification) {
  const locale = language(row);
  return {
    id: candidateId(row),
    source_provider: 'tcgplayer',
    source_category_id: Number(row.category_id),
    source_group_id: Number(row.group_id),
    source_product_id: Number(row.product_id),
    source_product_name: clean(row.name),
    source_payload_hash: row.payload_hash,
    classifier_version: MTG_SEALED_WORLD_V1,
    classification: 'sealed_candidate',
    confidence: Number(classification.confidence),
    evidence: classification.evidence,
    candidate_identity: {
      game_key: MTG_SEALED_GAME_KEY,
      source_group_name: clean(row.group_name),
      package_form: classification.candidate_identity.package_form,
      language_code: locale.code,
      release_presale_state:
        classification.candidate_identity.release_presale_state,
      quantity_contents: classification.candidate_identity.quantity_contents,
      exact_source_mapping:
        classification.candidate_identity.exact_source_mapping,
    },
    ambiguity_reasons: ['canonical_authority_is_separate_from_source_classification'],
    requires_review: true,
    promotion_eligible: false,
    canonical_authority: false,
    publication_authority: false,
  };
}

function reviewRow(row, classification) {
  return {
    id: reviewId(row),
    candidate_id: candidateId(row),
    decision: 'confirmed_sealed',
    promotion_authorized: true,
    reviewed_by: MTG_SEALED_REVIEWER_ID,
    decision_evidence: {
      authority: 'deterministic_source_evidence',
      source_category_id: MTG_SEALED_CATEGORY_ID,
      source_group_id: Number(row.group_id),
      source_product_id: Number(row.product_id),
      classifier_policy_version: classification.policy_version,
      classifier_confidence: Number(classification.confidence),
      package_form: classification.candidate_identity.package_form,
      exact_source_product_identity_preserved: true,
      human_review_claimed: false,
    },
    review_contract_version: MTG_SEALED_WORLD_V1,
  };
}

function mappingRow(row) {
  const core = {
    variant_id: variantId(row),
    candidate_id: candidateId(row),
    review_id: reviewId(row),
    candidate_classification: 'sealed_candidate',
    review_decision: 'confirmed_sealed',
    promotion_authorized: true,
    source_provider: 'tcgplayer',
    source_category_id: Number(row.category_id),
    source_group_id: Number(row.group_id),
    source_product_id: Number(row.product_id),
    source_product_name: clean(row.name),
    source_url: clean(row.source_url) || null,
    source_payload_hash: row.payload_hash,
    classifier_version: MTG_SEALED_WORLD_V1,
    mapping_contract_version: MTG_SEALED_WORLD_V1,
    mapping_status: 'exact_reviewed',
  };
  return { id: mappingId(row), ...core,
    mapping_fingerprint: hashMtgSealedV1(core) };
}

function evidenceRow(row, dimension, sourceField, sourceValue, normalizedValue,
  strength, confidence, ordinal = 0) {
  const core = {
    variant_id: variantId(row),
    source_mapping_id: mappingId(row),
    evidence_dimension: dimension,
    source_provider: 'tcgplayer',
    source_object_identity:
      `tcgplayer:${row.category_id}:${row.group_id}:${row.product_id}`,
    source_field: sourceField,
    source_value: clean(sourceValue),
    normalized_value: normalizedValue,
    evidence_strength: strength,
    confidence,
    source_payload_hash: row.payload_hash,
    observed_at: null,
  };
  return { id: evidenceId(row, dimension, ordinal), ...core,
    evidence_fingerprint: hashMtgSealedV1(core) };
}

function evidenceRows(row, classification) {
  const locale = language(row);
  const rows = [
    evidenceRow(row, 'product_line', 'tcgcsv_source_groups.name', row.group_name,
      { group_id: Number(row.group_id), group_name: clean(row.group_name) },
      'strong', 1),
    evidenceRow(row, 'manufacturer', 'tcgcsv_source_categories.display_name',
      row.category_display_name, { manufacturer_name: 'Wizards of the Coast' },
      'moderate', 0.95),
    evidenceRow(row, 'package_form', 'tcgcsv_source_products.name', row.name,
      { package_form: classification.candidate_identity.package_form },
      'strong', Number(classification.confidence)),
    evidenceRow(row, 'language', locale.authority, locale.source_value,
      { language_code: locale.code }, locale.code === 'en' ? 'moderate' : 'strong',
      locale.code === 'en' ? 0.95 : 1),
  ];
  for (const [index, quantity] of
    (classification.candidate_identity.quantity_contents ?? []).entries()) {
    rows.push(evidenceRow(row, 'contents', quantity.source_field,
      quantity.matched_text, { quantity: quantity.quantity, unit: quantity.unit },
      'strong', 1, index));
  }
  const release = classification.candidate_identity.release_presale_state;
  if (release?.released_on) {
    rows.push(evidenceRow(row, 'release_date', 'tcgcsv_source_products.presale_info',
      release.released_on, { release_date: isoDay(release.released_on) },
      'strong', 1));
  }
  if (release?.is_presale) {
    rows.push(evidenceRow(row, 'presale_state', 'tcgcsv_source_products.presale_info',
      'presale', { is_presale: true }, 'strong', 1));
  }
  return rows;
}

function buildQualification(row, canonical, prices, latestSync) {
  const lineage = classifyOnePieceSealedPriceLineageV1({ canonical,
    latestPrices: prices, authorityObservedOn: latestSync.observed_on });
  if (!lineage.persistable_in_existing_qualification_table ||
      !lineage.currency || !/^[A-Z]{3}$/.test(lineage.currency) ||
      !lineage.source_observation_fingerprint) {
    return { hold: lineage, qualification: null };
  }
  const selected = prices.find((price) =>
    price.source_price_row_identity === lineage.source_price_row_identity);
  const core = {
    variant_id: canonical.variant_id,
    source_mapping_id: canonical.source_mapping_id,
    source_price_row_identity: lineage.source_price_row_identity,
    source_subtype_name_normalized: lineage.source_subtype_name_normalized,
    observed_on: lineage.observed_on,
    currency: lineage.currency,
    qualification_status: lineage.qualification_status,
    qualification_evidence: {
      policy: 'tcgplayer_market_price_exact_product_v1',
      reason: lineage.qualification_reason,
      observation_age_days: lineage.observation_age_days,
      observation: {
        market_price: lineage.market_price,
        low_price: lineage.low_price,
        source_price_row_identity: lineage.source_price_row_identity,
      },
    },
    source_observation_fingerprint: selected.payload_hash,
    qualification_contract_version: MTG_SEALED_WORLD_V1,
    publication_authority: false,
  };
  return { hold: null, qualification: {
    id: qualificationId(row, lineage), ...core,
  } };
}

export function buildMtgSealedWorldPlanV1({ sourceRows, latestPriceRows,
  latestSync, producerCommit }) {
  if (!latestSync?.id || latestSync.status !== 'completed' ||
      !isoDay(latestSync.observed_on)) {
    throw new Error('A completed current-full-sync authority row is required');
  }
  if (!/^[0-9a-f]{40}$/.test(producerCommit ?? '')) {
    throw new Error('An exact producer commit SHA is required');
  }
  const pricesByProduct = new Map();
  for (const price of latestPriceRows ?? []) {
    const key = Number(price.product_id);
    const values = pricesByProduct.get(key) ?? [];
    values.push(price);
    pricesByProduct.set(key, values);
  }
  const candidates = [];
  const held = [];
  for (const row of [...(sourceRows ?? [])].sort((a, b) =>
    Number(a.product_id) - Number(b.product_id))) {
    const classification = classifyCrossTcgSealedProductV1(row);
    if (classification.classification !== 'sealed_candidate' ||
        !classification.candidate_identity.package_form ||
        Number(row.category_id) !== MTG_SEALED_CATEGORY_ID ||
        !row.source_active || !row.group_id || !clean(row.group_name) ||
        !/^[0-9a-f]{64}$/.test(row.payload_hash ?? '')) {
      continue;
    }
    const locale = language(row);
    if (locale.code !== 'en') {
      held.push({ source_product_id: Number(row.product_id),
        reason: 'non_english_scope_hold', language_code: locale.code });
      continue;
    }
    candidates.push({ row, classification });
  }
  const familiesById = new Map();
  const payload = { candidates: [], families: [], variants: [], reviews: [],
    mappings: [], evidence: [], qualifications: [], qualification_holds: held,
    releases: [], members: [] };
  for (const item of candidates) {
    const { row, classification } = item;
    const family = familyRow(row);
    familiesById.set(family.id, family);
    const variant = variantRow(row, classification);
    payload.candidates.push(candidateRow(row, classification));
    payload.variants.push(variant);
    payload.reviews.push(reviewRow(row, classification));
    payload.mappings.push(mappingRow(row));
    payload.evidence.push(...evidenceRows(row, classification));
    const canonical = { variant_id: variant.id, family_id: family.id,
      source_mapping_id: mappingId(row), source_product_id: Number(row.product_id),
      source_product_name: clean(row.name), package_form: variant.package_form,
      language_code: variant.language_code, source_active: row.source_active,
      catalog_metadata_status: row.catalog_metadata_status,
      canonical_lineage_exact: true };
    const result = buildQualification(row, canonical,
      pricesByProduct.get(Number(row.product_id)) ?? [], latestSync);
    if (result.qualification) payload.qualifications.push(result.qualification);
    else payload.qualification_holds.push(result.hold);
  }
  payload.families = [...familiesById.values()].sort((a, b) =>
    a.family_key.localeCompare(b.family_key));
  for (const key of ['candidates', 'variants', 'reviews', 'mappings', 'evidence',
    'qualifications']) payload[key].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const qualified = payload.qualifications.filter((row) =>
    row.qualification_status === 'qualified_exact');
  const sourceFingerprint = hashMtgSealedV1({
    source_products: payload.candidates.map((row) => [row.source_product_id,
      row.source_payload_hash]), latest_sync_id: latestSync.id,
  });
  const releaseId = deterministicUuidV5(`mtg:sealed:release:${sourceFingerprint}`);
  payload.members = qualified.map((qualification) => {
    const identity = { release_id: releaseId, variant_id: qualification.variant_id,
      source_mapping_id: qualification.source_mapping_id,
      qualification_id: qualification.id, qualification_status: 'qualified_exact' };
    const memberFingerprint = hashMtgSealedV1(identity);
    return { id: deterministicUuidV5(`mtg:sealed:release-member:${memberFingerprint}`),
      ...identity, member_fingerprint: memberFingerprint };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const manifestFingerprint = hashMtgSealedV1(payload.members);
  payload.releases = [{
    id: releaseId,
    game_key: MTG_SEALED_GAME_KEY,
    release_key: `mtg-sealed-${sourceFingerprint.slice(0, 20)}`,
    release_state: 'draft',
    source_audit_producer_sha: producerCommit,
    source_sample_logical_hash: sourceFingerprint,
    release_contract_version: MTG_SEALED_WORLD_V1,
    manifest_fingerprint: manifestFingerprint,
    expected_member_count: payload.members.length,
    created_by: MTG_SEALED_REVIEWER_ID,
  }];
  const counts = Object.fromEntries(Object.entries(payload)
    .map(([key, value]) => [key, value.length]));
  const statusCounts = Object.fromEntries([...new Set(payload.qualifications.map((row) =>
    row.qualification_status))].sort().map((status) => [status,
    payload.qualifications.filter((row) => row.qualification_status === status).length]));
  const core = { version: MTG_SEALED_WORLD_V1, game_key: MTG_SEALED_GAME_KEY,
    producer_commit: producerCommit, latest_sync: latestSync,
    source_fingerprint_sha256: sourceFingerprint, counts,
    qualification_status_counts: statusCounts, payload,
    boundaries: { card_writes: 0, storage_writes: 0, vault_writes: 0,
      catalog_release_control_writes: 0, one_piece_writes: 0,
      anonymous_visibility: false, authenticated_visibility_before_catalog_release: false } };
  return { ...core, plan_fingerprint_sha256: hashMtgSealedV1(core) };
}

export function validateMtgSealedWorldPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { plan_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  add(plan?.version !== MTG_SEALED_WORLD_V1, 'version_mismatch');
  add(fingerprint !== hashMtgSealedV1(core), 'plan_fingerprint_mismatch');
  const payload = plan?.payload ?? {};
  const variants = payload.variants ?? [];
  add(variants.length === 0, 'empty_variant_payload');
  add((payload.candidates ?? []).length !== variants.length,
    'candidate_variant_count_mismatch');
  add((payload.reviews ?? []).length !== variants.length,
    'review_variant_count_mismatch');
  add((payload.mappings ?? []).length !== variants.length,
    'mapping_variant_count_mismatch');
  for (const key of ['candidates', 'families', 'variants', 'reviews', 'mappings',
    'evidence', 'qualifications', 'members']) {
    const rows = payload[key] ?? [];
    add(new Set(rows.map((row) => row.id)).size !== rows.length,
      `duplicate_id:${key}`);
  }
  add((payload.releases ?? []).length !== 1, 'release_count_mismatch');
  add(payload.releases?.[0]?.game_key !== MTG_SEALED_GAME_KEY,
    'release_game_mismatch');
  add(payload.releases?.[0]?.expected_member_count !== (payload.members ?? []).length,
    'release_member_count_mismatch');
  add(payload.releases?.[0]?.manifest_fingerprint !==
    hashMtgSealedV1(payload.members ?? []), 'release_manifest_mismatch');
  add((payload.members ?? []).some((row) =>
    row.qualification_status !== 'qualified_exact'), 'nonqualified_release_member');
  add((payload.members ?? []).length === 0, 'empty_release_members');
  add((payload.variants ?? []).some((row) => row.language_code !== 'en'),
    'non_english_variant_promoted');
  add((payload.mappings ?? []).some((row) => row.source_category_id !== 1 ||
    row.mapping_status !== 'exact_reviewed'), 'mapping_scope_mismatch');
  const candidateIds = new Set((payload.candidates ?? []).map((row) => row.id));
  const familyIds = new Set((payload.families ?? []).map((row) => row.id));
  const variantIds = new Set((payload.variants ?? []).map((row) => row.id));
  const reviewIds = new Set((payload.reviews ?? []).map((row) => row.id));
  const mappingIds = new Set((payload.mappings ?? []).map((row) => row.id));
  const qualificationIds = new Set((payload.qualifications ?? []).map((row) => row.id));
  add((payload.variants ?? []).some((row) => !familyIds.has(row.family_id)),
    'variant_family_reference_missing');
  add((payload.reviews ?? []).some((row) => !candidateIds.has(row.candidate_id)),
    'review_candidate_reference_missing');
  add((payload.mappings ?? []).some((row) =>
    !variantIds.has(row.variant_id) || !candidateIds.has(row.candidate_id) ||
    !reviewIds.has(row.review_id)), 'mapping_reference_missing');
  add((payload.evidence ?? []).some((row) =>
    !variantIds.has(row.variant_id) || !mappingIds.has(row.source_mapping_id)),
  'evidence_reference_missing');
  add((payload.qualifications ?? []).some((row) =>
    !variantIds.has(row.variant_id) || !mappingIds.has(row.source_mapping_id)),
  'qualification_reference_missing');
  add((payload.members ?? []).some((row) =>
    !variantIds.has(row.variant_id) || !mappingIds.has(row.source_mapping_id) ||
    !qualificationIds.has(row.qualification_id)), 'member_reference_missing');
  add(Object.values(plan?.boundaries ?? {}).some((value) =>
    value !== 0 && value !== false), 'boundary_overclaim');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
