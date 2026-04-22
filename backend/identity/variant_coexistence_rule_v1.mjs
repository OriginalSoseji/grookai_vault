import { normalizeVariantKey } from '../warehouse/source_identity_contract_v1.mjs';

export const VARIANT_COEXISTENCE_RULE_V1 = 'VARIANT_COEXISTENCE_RULE_V1';

const GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1 = 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1';
const GENERIC_PLAY_POKEMON_STAMP_VARIANT_KEY = 'play_pokemon_stamp';
const ALLOWED_SET_NAME_STAMP_VARIANT_KEYS = new Set([
  'white_flare_stamp',
  'black_bolt_stamp',
  'scarlet_and_violet_stamp',
]);

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeVariantKeyOrNull(value) {
  const normalized = normalizeVariantKey(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function buildRejectedDecision(reason, details = {}) {
  return {
    rule: VARIANT_COEXISTENCE_RULE_V1,
    allowed: false,
    reason_code: reason,
    ...details,
  };
}

function collectVariantIdentityRules({ candidate, visibleIdentityHints, candidateVariantIdentity, sourceBackedIdentity }) {
  const claimed = asRecord(candidate?.claimed_identity_payload) ?? {};
  const reference = asRecord(candidate?.reference_hints_payload) ?? {};
  const claimedVariant = asRecord(claimed.variant_identity);
  const referenceVariant = asRecord(reference.variant_identity);
  const hintsVariant = asRecord(visibleIdentityHints?.variant_identity);

  return Array.from(
    new Set(
      [
        normalizeTextOrNull(candidateVariantIdentity?.rule),
        normalizeTextOrNull(sourceBackedIdentity?.variant_identity_rule),
        normalizeTextOrNull(sourceBackedIdentity?.variant_identity?.rule),
        normalizeTextOrNull(claimed.variant_identity_rule),
        normalizeTextOrNull(reference.variant_identity_rule),
        normalizeTextOrNull(claimedVariant?.rule),
        normalizeTextOrNull(referenceVariant?.rule),
        normalizeTextOrNull(hintsVariant?.rule),
      ].filter(Boolean),
    ),
  );
}

export function evaluateVariantCoexistenceV1({
  candidate = null,
  visibleIdentityHints = null,
  candidateVariantIdentity = null,
  sourceBackedIdentity = null,
  normalizedRows = [],
  matchingRows = [],
  incomingVariantKey = null,
} = {}) {
  const normalizedIncomingVariantKey = normalizeVariantKeyOrNull(incomingVariantKey);
  if (!normalizedIncomingVariantKey) {
    return buildRejectedDecision('VARIANT_KEY_MISSING');
  }

  if (normalizedIncomingVariantKey !== GENERIC_PLAY_POKEMON_STAMP_VARIANT_KEY) {
    return buildRejectedDecision('INCOMING_VARIANT_KEY_NOT_SUPPORTED', {
      incoming_variant_key: normalizedIncomingVariantKey,
    });
  }

  const variantIdentityRules = collectVariantIdentityRules({
    candidate,
    visibleIdentityHints,
    candidateVariantIdentity,
    sourceBackedIdentity,
  });

  if (!variantIdentityRules.includes(GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1)) {
    return buildRejectedDecision('VARIANT_RULE_NOT_PROVEN', {
      incoming_variant_key: normalizedIncomingVariantKey,
      variant_identity_rules: variantIdentityRules,
    });
  }

  if (!Array.isArray(normalizedRows) || normalizedRows.length === 0) {
    return buildRejectedDecision('EMPTY_SLOT_ROWS');
  }

  if (!Array.isArray(matchingRows) || matchingRows.length < 2) {
    return buildRejectedDecision('INSUFFICIENT_MATCHING_ROWS', {
      matching_row_count: Array.isArray(matchingRows) ? matchingRows.length : 0,
    });
  }

  if (normalizedRows.length !== matchingRows.length) {
    return buildRejectedDecision('UNRELATED_SLOT_OCCUPANTS_PRESENT', {
      slot_row_count: normalizedRows.length,
      matching_row_count: matchingRows.length,
    });
  }

  const normalizedMatchingRows = matchingRows.map((row) => ({
    ...row,
    variant_key: normalizeVariantKeyOrNull(row?.variant_key),
  }));

  const baseRows = normalizedMatchingRows.filter((row) => row.variant_key === null);
  const existingVariantRows = normalizedMatchingRows.filter((row) => row.variant_key !== null);
  const existingVariantKeys = existingVariantRows.map((row) => row.variant_key);
  const distinctExistingVariantKeys = new Set(existingVariantKeys);

  if (baseRows.length !== 1) {
    return buildRejectedDecision('BASE_ROW_COUNT_INVALID', {
      base_row_count: baseRows.length,
      existing_variant_keys: existingVariantKeys,
    });
  }

  if (existingVariantRows.length === 0) {
    return buildRejectedDecision('NO_EXISTING_VARIANT_ROWS', {
      base_row_count: baseRows.length,
    });
  }

  if (distinctExistingVariantKeys.size !== existingVariantKeys.length) {
    return buildRejectedDecision('DUPLICATE_EXISTING_VARIANT_KEY', {
      existing_variant_keys: existingVariantKeys,
    });
  }

  if (distinctExistingVariantKeys.has(normalizedIncomingVariantKey)) {
    return buildRejectedDecision('INCOMING_VARIANT_ALREADY_PRESENT', {
      incoming_variant_key: normalizedIncomingVariantKey,
      existing_variant_keys: existingVariantKeys,
    });
  }

  const unsupportedExistingVariantKey = existingVariantKeys.find(
    (key) => !ALLOWED_SET_NAME_STAMP_VARIANT_KEYS.has(key),
  );
  if (unsupportedExistingVariantKey) {
    return buildRejectedDecision('EXISTING_VARIANT_KEY_NOT_SUPPORTED', {
      incoming_variant_key: normalizedIncomingVariantKey,
      existing_variant_keys: existingVariantKeys,
      unsupported_existing_variant_key: unsupportedExistingVariantKey,
    });
  }

  return {
    rule: VARIANT_COEXISTENCE_RULE_V1,
    allowed: true,
    reason_code: 'VARIANT_COEXISTENCE_ALLOWED',
    incoming_variant_key: normalizedIncomingVariantKey,
    variant_identity_rules: variantIdentityRules,
    base_row_count: baseRows.length,
    coexisting_variant_keys: existingVariantKeys,
    slot_row_ids: normalizedMatchingRows.map((row) => row.id).filter(Boolean),
  };
}
