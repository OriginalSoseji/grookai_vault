import { contentFingerprint } from './deterministic_artifact_v1.mjs';

export const CARD_ASSERTION_VERSION =
  'JPN-MASTER-INDEX-CARD-SOURCE-ASSERTION-V1';

export const CARD_ASSERTION_REQUIRED_FIELDS = Object.freeze([
  'assertion_version',
  'assertion_key',
  'source_id',
  'source_family',
  'source_kind',
  'source_external_id',
  'source_url',
  'registry_key',
  'language',
  'parser_version',
  'raw_snapshot_ref',
  'raw_snapshot_sha256',
  'source_fields',
]);

export const CARD_ASSERTION_FORBIDDEN_FIELDS = Object.freeze([
  'card_print_id',
  'card_print_identity_id',
  'card_printing_id',
  'gv_id',
  'gvvi_id',
  'canonical_family_id',
  'pokemon_species_id',
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function textOrNull(value) {
  const normalized = String(value ?? '')
    .normalize('NFC')
    .trim();
  return normalized || null;
}

function arrayOfText(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : []).map(textOrNull).filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, 'ja'));
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalAssertionIdentity(row) {
  return {
    source_id: textOrNull(row.source_id),
    source_external_id: textOrNull(row.source_external_id),
    source_container_id: textOrNull(row.source_container_id),
    source_url: textOrNull(row.source_url),
    registry_key: textOrNull(row.registry_key),
    language: textOrNull(row.language)?.toLowerCase() ?? null,
  };
}

export function buildCardAssertionKey(row) {
  return contentFingerprint(canonicalAssertionIdentity(row));
}

export function normalizeJapaneseCardAssertion(input) {
  const normalized = {
    assertion_version: CARD_ASSERTION_VERSION,
    assertion_key: null,
    source_id: textOrNull(input.source_id),
    source_family: textOrNull(input.source_family),
    source_kind: textOrNull(input.source_kind),
    source_external_id: textOrNull(input.source_external_id),
    source_url: textOrNull(input.source_url),
    source_container_id: textOrNull(input.source_container_id),
    source_product_id: textOrNull(input.source_product_id),
    registry_key: textOrNull(input.registry_key),
    language: textOrNull(input.language)?.toLowerCase() ?? 'ja',
    parser_version: textOrNull(input.parser_version),
    retrieved_at: textOrNull(input.retrieved_at),
    raw_snapshot_ref: textOrNull(input.raw_snapshot_ref),
    raw_snapshot_sha256: textOrNull(input.raw_snapshot_sha256)?.toLowerCase(),
    printed_name: textOrNull(input.printed_name),
    english_display_name: textOrNull(input.english_display_name),
    card_number_raw: textOrNull(input.card_number_raw),
    card_number_prefix: textOrNull(input.card_number_prefix),
    card_number_numerator: integerOrNull(input.card_number_numerator),
    card_number_denominator: integerOrNull(input.card_number_denominator),
    card_number_suffix: textOrNull(input.card_number_suffix),
    unnumbered_label: textOrNull(input.unnumbered_label),
    source_set_code: textOrNull(input.source_set_code),
    source_set_name: textOrNull(input.source_set_name),
    source_product_name: textOrNull(input.source_product_name),
    category: textOrNull(input.category),
    type_line: textOrNull(input.type_line),
    rarity: textOrNull(input.rarity),
    illustrator: textOrNull(input.illustrator),
    hp: integerOrNull(input.hp),
    regulation_mark: textOrNull(input.regulation_mark),
    dex_numbers: [
      ...new Set(
        (Array.isArray(input.dex_numbers) ? input.dex_numbers : [])
          .map(integerOrNull)
          .filter((value) => value !== null),
      ),
    ].sort((left, right) => left - right),
    finish_labels: arrayOfText(input.finish_labels),
    edition_labels: arrayOfText(input.edition_labels),
    stamp_labels: arrayOfText(input.stamp_labels),
    distribution_labels: arrayOfText(input.distribution_labels),
    identity_modifiers: arrayOfText(input.identity_modifiers),
    image_urls: arrayOfText(input.image_urls),
    related_urls: arrayOfText(input.related_urls),
    release_date: textOrNull(input.release_date),
    source_fields:
      input.source_fields &&
      typeof input.source_fields === 'object' &&
      !Array.isArray(input.source_fields)
        ? input.source_fields
        : {},
  };
  normalized.assertion_key = buildCardAssertionKey(normalized);
  return normalized;
}

function hasIdentityCoordinate(row) {
  return Boolean(
    textOrNull(row.printed_name) ||
    textOrNull(row.card_number_raw) ||
    textOrNull(row.unnumbered_label) ||
    (Array.isArray(row.image_urls) && row.image_urls.length > 0),
  );
}

function findSensitiveKeys(value, path = '') {
  if (!value || typeof value !== 'object') return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (
      /(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|database[_-]?url)/i.test(
        key,
      )
    ) {
      findings.push(keyPath);
    }
    findings.push(...findSensitiveKeys(child, keyPath));
  }
  return findings;
}

export function validateJapaneseCardAssertion(row) {
  const errors = [];
  for (const field of CARD_ASSERTION_REQUIRED_FIELDS) {
    const value = row?.[field];
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && !value.trim())
    ) {
      errors.push(`missing_required_field:${field}`);
    }
  }
  for (const field of CARD_ASSERTION_FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(row ?? {}, field)) {
      errors.push(`forbidden_canonical_field:${field}`);
    }
  }
  if (row?.assertion_version !== CARD_ASSERTION_VERSION) {
    errors.push('assertion_version_mismatch');
  }
  if (String(row?.language ?? '').toLowerCase() !== 'ja') {
    errors.push('language_must_be_ja');
  }
  if (!SHA256_PATTERN.test(String(row?.assertion_key ?? ''))) {
    errors.push('assertion_key_must_be_sha256');
  } else if (row.assertion_key !== buildCardAssertionKey(row)) {
    errors.push('assertion_key_mismatch');
  }
  if (!SHA256_PATTERN.test(String(row?.raw_snapshot_sha256 ?? ''))) {
    errors.push('raw_snapshot_sha256_invalid');
  }
  if (!hasIdentityCoordinate(row)) {
    errors.push('identity_coordinate_missing');
  }
  for (const keyPath of findSensitiveKeys(row?.source_fields)) {
    errors.push(`sensitive_source_field:${keyPath}`);
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertJapaneseCardAssertion(row) {
  const validation = validateJapaneseCardAssertion(row);
  if (!validation.valid) {
    throw new Error(
      `Invalid Japanese card assertion: ${validation.errors.join(', ')}`,
    );
  }
  return row;
}
