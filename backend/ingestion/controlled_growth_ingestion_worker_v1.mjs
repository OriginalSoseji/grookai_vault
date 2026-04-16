import '../env.mjs';
import { Client } from 'pg';
import { derivePerfectOrderVariantIdentity } from '../identity/perfect_order_variant_identity_rule_v1.mjs';

const PHASE = 'CONTROLLED_GROWTH_INGESTION_PIPELINE_V1';
const WORKER_VERSION = 'CONTROLLED_GROWTH_INGESTION_PIPELINE_V1';
const SOURCE = 'justtcg';
const KIND = 'card';
const STAGING_TABLE = 'external_discovery_candidates';
const RAW_TABLE = 'raw_imports';
const SET_MAPPINGS_TABLE = 'justtcg_set_mappings';
const CANONICAL_TABLE = 'card_prints';
const CANONICAL_SET_TABLE = 'sets';
const EXTERNAL_MAPPINGS_TABLE = 'external_mappings';
const WRITE_CHUNK_SIZE = 250;

const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const APOSTROPHE_VARIANTS_RE = /[\u2018\u2019`´]/g;
const DASH_SEPARATOR_VARIANTS_RE = /[\u2013\u2014]/g;
const TERMINAL_EX_RE = /([A-Za-z0-9])(?:\s*-\s*|\s+)+EX$/i;
const TERMINAL_GX_RE = /([A-Za-z0-9])(?:\s*-\s*|\s+)+GX$/i;
const PRODUCT_NOISE_RE = /\bcode\s*card\b/i;

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}_MUST_BE_NON_NEGATIVE_INTEGER`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    limit: null,
    offset: 0,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--limit' && argv[index + 1]) {
      const value = parsePositiveInteger(argv[index + 1], '--limit');
      options.limit = value > 0 ? value : null;
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const value = parsePositiveInteger(token.slice('--limit='.length), '--limit');
      options.limit = value > 0 ? value : null;
    } else if (token === '--offset' && argv[index + 1]) {
      options.offset = parsePositiveInteger(argv[index + 1], '--offset');
      index += 1;
    } else if (token.startsWith('--offset=')) {
      options.offset = parsePositiveInteger(token.slice('--offset='.length), '--offset');
    } else if (token === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function collapseWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function stripLeadingZeros(value) {
  const normalized = String(value ?? '').replace(/^0+/, '');
  return normalized.length > 0 ? normalized : '0';
}

function toCanonicalDisplayNameV3(name) {
  let value = String(name ?? '');
  value = value.replace(APOSTROPHE_VARIANTS_RE, "'");
  value = value.replace(DASH_SEPARATOR_VARIANTS_RE, ' ');
  value = collapseWhitespace(value);
  value = value.replace(TERMINAL_GX_RE, '$1-GX');
  value = value.replace(TERMINAL_EX_RE, '$1-EX');
  value = collapseWhitespace(value);
  return value;
}

function toNameNormalizeV3Key(name) {
  let value = String(name ?? '');
  value = value.replace(APOSTROPHE_VARIANTS_RE, "'");
  value = value.replace(DASH_SEPARATOR_VARIANTS_RE, ' ');
  value = collapseWhitespace(value);
  value = value.replace(TERMINAL_GX_RE, '$1 GX');
  value = value.replace(TERMINAL_EX_RE, '$1 EX');
  return collapseWhitespace(value).toLowerCase();
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function addToMultiMap(map, key, value) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(value);
}

function dedupeById(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (row?.id) {
      seen.set(row.id, row);
    }
  }
  return [...seen.values()];
}

function buildStrictKey(setId, nameKey, numberPlain, variantKey) {
  return `${setId}||${nameKey}||${numberPlain}||${variantKey}`;
}

function buildLooseNumberKey(setId, numberPlain) {
  return `${setId}||${numberPlain}`;
}

function buildNameKey(setId, nameKey) {
  return `${setId}||${nameKey}`;
}

function buildCandidateSetMappingSummary(mappingRows) {
  const setCodes = uniqueValues(
    mappingRows
      .map((row) => normalizeTextOrNull(row.grookai_set_code))
      .filter(Boolean),
  );

  if (setCodes.length === 0) {
    return {
      status: 'missing',
      setCodes: [],
      mappedSetId: null,
      mappedSetCode: null,
    };
  }

  if (setCodes.length === 1 && mappingRows.length === 1) {
    return {
      status: 'unique',
      setCodes,
      mappedSetId: mappingRows[0].grookai_set_id,
      mappedSetCode: mappingRows[0].grookai_set_code,
    };
  }

  return {
    status: 'ambiguous',
    setCodes,
    mappedSetId: null,
    mappedSetCode: null,
  };
}

function normalizeCollectorToken(rawNumber) {
  const raw = normalizeTextOrNull(rawNumber);

  if (!raw) {
    return {
      rawNumber: null,
      normalizedNumber: null,
      printedTotal: null,
      extractedNumberPlain: null,
      inferredVariantKey: '',
      tokenLane: 'missing',
      hasSlashNumber: false,
      hasAlphaSuffixNumber: false,
      reviewToken: true,
      nonCanonicalReason: 'missing_number',
    };
  }

  const compact = raw
    .replace(/[‐‑–—]/g, '-')
    .replace(/[⁄∕]/g, '/')
    .replace(/\s+/g, '');

  if (compact.toUpperCase() === 'N/A') {
    return {
      rawNumber: raw,
      normalizedNumber: null,
      printedTotal: null,
      extractedNumberPlain: null,
      inferredVariantKey: '',
      tokenLane: 'non_canonical',
      hasSlashNumber: false,
      hasAlphaSuffixNumber: false,
      reviewToken: true,
      nonCanonicalReason: 'number_not_available',
    };
  }

  const slashMatch = compact.match(/^([^/]+)\/([^/]+)$/);
  const leftToken = slashMatch ? slashMatch[1] : compact;
  const printedTotal = slashMatch ? slashMatch[2] : null;
  const normalizedNumber = normalizeTextOrNull(leftToken?.toUpperCase());
  const hasSlashNumber = Boolean(slashMatch);
  const hasAlphaSuffixNumber = Boolean(normalizedNumber && /[0-9][A-Z]+$/.test(normalizedNumber));

  if (!normalizedNumber) {
    return {
      rawNumber: raw,
      normalizedNumber: null,
      printedTotal,
      extractedNumberPlain: null,
      inferredVariantKey: '',
      tokenLane: 'missing',
      hasSlashNumber,
      hasAlphaSuffixNumber,
      reviewToken: true,
      nonCanonicalReason: 'missing_number',
    };
  }

  const numericMatch = normalizedNumber.match(/^0*(\d+)$/);
  if (numericMatch) {
    return {
      rawNumber: raw,
      normalizedNumber,
      printedTotal,
      extractedNumberPlain: stripLeadingZeros(numericMatch[1]),
      inferredVariantKey: '',
      tokenLane: 'numeric',
      hasSlashNumber,
      hasAlphaSuffixNumber,
      reviewToken: false,
      nonCanonicalReason: null,
    };
  }

  const rcMatch = normalizedNumber.match(/^RC0*(\d+)$/);
  if (rcMatch) {
    return {
      rawNumber: raw,
      normalizedNumber,
      printedTotal,
      extractedNumberPlain: stripLeadingZeros(rcMatch[1]),
      inferredVariantKey: 'rc',
      tokenLane: 'rc_prefix',
      hasSlashNumber,
      hasAlphaSuffixNumber,
      reviewToken: false,
      nonCanonicalReason: null,
    };
  }

  const numericAlphaSuffixMatch = normalizedNumber.match(/^0*(\d+)([A-Z]+)$/);
  if (numericAlphaSuffixMatch) {
    return {
      rawNumber: raw,
      normalizedNumber,
      printedTotal,
      extractedNumberPlain: stripLeadingZeros(numericAlphaSuffixMatch[1]),
      inferredVariantKey: numericAlphaSuffixMatch[2].toLowerCase(),
      tokenLane: 'numeric_alpha_suffix',
      hasSlashNumber,
      hasAlphaSuffixNumber,
      reviewToken: true,
      nonCanonicalReason: null,
    };
  }

  const alphaOnlyMatch = normalizedNumber.match(/^[A-Z]+$/);
  if (alphaOnlyMatch) {
    return {
      rawNumber: raw,
      normalizedNumber,
      printedTotal,
      extractedNumberPlain: normalizedNumber,
      inferredVariantKey: normalizedNumber.toLowerCase(),
      tokenLane: 'alpha_only',
      hasSlashNumber,
      hasAlphaSuffixNumber,
      reviewToken: true,
      nonCanonicalReason: null,
    };
  }

  return {
    rawNumber: raw,
    normalizedNumber,
    printedTotal,
    extractedNumberPlain: null,
    inferredVariantKey: '',
    tokenLane: 'unsupported',
    hasSlashNumber,
    hasAlphaSuffixNumber,
    reviewToken: true,
    nonCanonicalReason: null,
  };
}

function normalizeRawNameSurface(rawName, rawNumberShape) {
  const trimmed = normalizeTextOrNull(rawName);

  if (!trimmed) {
    return {
      rawName: null,
      normalizedNameDisplay: null,
      normalizedNameKey: null,
      hasParentheticalModifier: false,
      nonCanonicalReason: 'missing_name',
    };
  }

  const withModifierMatch = trimmed.match(
    /^\s*(.*?)\s*-\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\((.+)\)\s*$/,
  );
  if (
    withModifierMatch &&
    normalizeTextOrNull(withModifierMatch[2]?.toUpperCase()) === rawNumberShape.normalizedNumber &&
    normalizeTextOrNull(withModifierMatch[3]) === rawNumberShape.printedTotal
  ) {
    const normalizedNameDisplay = toCanonicalDisplayNameV3(withModifierMatch[1]);
    return {
      rawName: trimmed,
      normalizedNameDisplay,
      normalizedNameKey: toNameNormalizeV3Key(normalizedNameDisplay),
      hasParentheticalModifier: true,
      nonCanonicalReason: null,
    };
  }

  const plainMatch = trimmed.match(
    /^\s*(.*?)\s*-\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*\/\s*([0-9A-Za-z.\-]*[0-9][0-9A-Za-z.\-]*)\s*$/,
  );
  if (
    plainMatch &&
    normalizeTextOrNull(plainMatch[2]?.toUpperCase()) === rawNumberShape.normalizedNumber &&
    normalizeTextOrNull(plainMatch[3]) === rawNumberShape.printedTotal
  ) {
    const normalizedNameDisplay = toCanonicalDisplayNameV3(plainMatch[1]);
    return {
      rawName: trimmed,
      normalizedNameDisplay,
      normalizedNameKey: toNameNormalizeV3Key(normalizedNameDisplay),
      hasParentheticalModifier: false,
      nonCanonicalReason: null,
    };
  }

  const normalizedNameDisplay = toCanonicalDisplayNameV3(trimmed);
  return {
    rawName: trimmed,
    normalizedNameDisplay,
    normalizedNameKey: toNameNormalizeV3Key(normalizedNameDisplay),
    hasParentheticalModifier: false,
    nonCanonicalReason: null,
  };
}

function determineCanonGate(rowSurface) {
  if (
    rowSurface.nonCanonicalReason ||
    rowSurface.number.nonCanonicalReason ||
    rowSurface.name.nonCanonicalReason ||
    !rowSurface.upstreamId ||
    !rowSurface.rawSetId ||
    PRODUCT_NOISE_RE.test(rowSurface.rawName ?? '') ||
    String(rowSurface.rawRarity ?? '').toLowerCase() === 'code card'
  ) {
    return {
      bucket: 'NON_CANDIDATE',
      reason:
        rowSurface.nonCanonicalReason ??
        rowSurface.number.nonCanonicalReason ??
        rowSurface.name.nonCanonicalReason ??
        'product_noise',
    };
  }

  if (
    rowSurface.number.reviewToken ||
    rowSurface.name.hasParentheticalModifier ||
    rowSurface.setMapping.status !== 'unique' ||
    (
      rowSurface.variantIdentity?.applies &&
      rowSurface.variantIdentity.status !== 'RESOLVED_BY_VARIANT_KEY'
    )
  ) {
    return {
      bucket: 'PRINTED_IDENTITY_REVIEW',
      reason:
        rowSurface.variantIdentity?.applies &&
        rowSurface.variantIdentity.status !== 'RESOLVED_BY_VARIANT_KEY'
          ? 'perfect_order_variant_identity_unresolved'
          : rowSurface.setMapping.status !== 'unique'
            ? `set_mapping_${rowSurface.setMapping.status}`
            : rowSurface.name.hasParentheticalModifier
              ? 'parenthetical_modifier'
              : `token_lane_${rowSurface.number.tokenLane}`,
    };
  }

  return {
    bucket: 'CLEAN_CANON_CANDIDATE',
    reason: 'stable_printed_identity',
  };
}

function buildPartialCandidates(setId, nameKey, numberPlain, indexes) {
  const candidates = [];

  if (setId && nameKey) {
    candidates.push(...(indexes.byName.get(buildNameKey(setId, nameKey)) ?? []));
  }

  if (setId && numberPlain) {
    candidates.push(...(indexes.byNumberPlain.get(buildLooseNumberKey(setId, numberPlain)) ?? []));
  }

  return dedupeById(candidates);
}

function buildClassificationRecord(rawRow, context) {
  const upstreamId = normalizeTextOrNull(rawRow.payload?.id ?? rawRow.payload?._external_id);
  const tcgplayerId = normalizeTextOrNull(rawRow.payload?.tcgplayerId);
  const rawSetId = normalizeTextOrNull(rawRow.payload?.set ?? rawRow.payload?._set_external_id);
  const rawSetName = normalizeTextOrNull(rawRow.payload?.set_name);
  const rawName = normalizeTextOrNull(rawRow.payload?.name);
  const rawNumber = normalizeTextOrNull(rawRow.payload?.number);
  const rawRarity = normalizeTextOrNull(rawRow.payload?.rarity);

  const number = normalizeCollectorToken(rawNumber);
  const name = normalizeRawNameSurface(rawName, number);
  const variantIdentity = derivePerfectOrderVariantIdentity({
    sourceSetId: rawSetId,
    numberPlain: number.extractedNumberPlain,
    normalizedNameKey: name.normalizedNameKey,
    rawRarity,
    upstreamId,
  });
  const effectiveVariantKey =
    variantIdentity?.status === 'RESOLVED_BY_VARIANT_KEY'
      ? variantIdentity.variant_key
      : number.inferredVariantKey;
  const mappingRows = context.setMappingsBySourceSet.get(rawSetId) ?? [];
  const setMapping = buildCandidateSetMappingSummary(mappingRows);

  const rowSurface = {
    rawImportId: rawRow.id,
    ingestedAt: rawRow.ingested_at,
    upstreamId,
    tcgplayerId,
    rawSetId,
    rawSetName,
    rawName,
    rawNumber,
    rawRarity,
    number,
    name,
    variantIdentity,
    setMapping,
    nonCanonicalReason: !upstreamId || !rawSetId ? 'missing_upstream_identity' : null,
  };

  const canonGate = determineCanonGate(rowSurface);
  const candidateSetCodes = setMapping.setCodes;
  const candidateSetMapping = candidateSetCodes.length > 0 ? candidateSetCodes.join(',') : null;

  if (canonGate.bucket === 'NON_CANDIDATE') {
    return {
      raw_import_id: rawRow.id,
      ingestion_timestamp: rawRow.ingested_at,
      upstream_id: upstreamId,
      tcgplayer_id: tcgplayerId,
      raw_name: rawName,
      raw_number: rawNumber,
      raw_set: rawSetId,
      raw_set_name: rawSetName,
      normalized_name: name.normalizedNameDisplay,
      normalized_name_key: name.normalizedNameKey,
      normalized_number: number.normalizedNumber,
      extracted_number_plain: number.extractedNumberPlain,
      inferred_variant_key: effectiveVariantKey,
      variant_identity: variantIdentity,
      candidate_set_mapping: candidateSetMapping,
      candidate_set_mapping_status: setMapping.status,
      candidate_set_codes: candidateSetCodes,
      candidate_card_print_id: null,
      candidate_card_print_ids: [],
      candidate_set_code: null,
      candidate_bucket: canonGate.bucket,
      classification: 'NON_CANONICAL',
      match_status: null,
      confidence_score: 0.05,
      classification_reason: canonGate.reason,
      matched_via: null,
      has_slash_number: number.hasSlashNumber,
      has_alpha_suffix_number: number.hasAlphaSuffixNumber,
      has_parenthetical_modifier: name.hasParentheticalModifier,
      printed_total: number.printedTotal,
      raw_payload: rawRow.payload,
    };
  }

  const justtcgMapping = upstreamId ? context.justtcgMappings.get(upstreamId) ?? null : null;
  const justtcgCanonical = justtcgMapping
    ? context.canonicalById.get(justtcgMapping.card_print_id) ?? null
    : null;
  if (justtcgMapping && justtcgCanonical) {
    return {
      raw_import_id: rawRow.id,
      ingestion_timestamp: rawRow.ingested_at,
      upstream_id: upstreamId,
      tcgplayer_id: tcgplayerId,
      raw_name: rawName,
      raw_number: rawNumber,
      raw_set: rawSetId,
      raw_set_name: rawSetName,
      normalized_name: name.normalizedNameDisplay,
      normalized_name_key: name.normalizedNameKey,
      normalized_number: number.normalizedNumber,
      extracted_number_plain: number.extractedNumberPlain,
      inferred_variant_key: effectiveVariantKey,
      variant_identity: variantIdentity,
      candidate_set_mapping: candidateSetMapping,
      candidate_set_mapping_status: setMapping.status,
      candidate_set_codes: candidateSetCodes,
      candidate_card_print_id: justtcgMapping.card_print_id,
      candidate_card_print_ids: [justtcgMapping.card_print_id],
      candidate_set_code: justtcgCanonical.set_code,
      candidate_bucket:
        canonGate.bucket === 'PRINTED_IDENTITY_REVIEW' ? 'PRINTED_IDENTITY_REVIEW' : 'CLEAN_CANON_CANDIDATE',
      classification: 'MATCHED',
      match_status: 'RESOLVED',
      confidence_score: 1,
      classification_reason: 'active_justtcg_external_mapping',
      matched_via: 'justtcg_external_mapping',
      has_slash_number: number.hasSlashNumber,
      has_alpha_suffix_number: number.hasAlphaSuffixNumber,
      has_parenthetical_modifier: name.hasParentheticalModifier,
      printed_total: number.printedTotal,
      raw_payload: rawRow.payload,
    };
  }

  const tcgplayerMapping = tcgplayerId ? context.tcgplayerMappings.get(tcgplayerId) ?? null : null;
  const tcgplayerCanonical = tcgplayerMapping
    ? context.canonicalById.get(tcgplayerMapping.card_print_id) ?? null
    : null;
  if (tcgplayerMapping && tcgplayerCanonical) {
    return {
      raw_import_id: rawRow.id,
      ingestion_timestamp: rawRow.ingested_at,
      upstream_id: upstreamId,
      tcgplayer_id: tcgplayerId,
      raw_name: rawName,
      raw_number: rawNumber,
      raw_set: rawSetId,
      raw_set_name: rawSetName,
      normalized_name: name.normalizedNameDisplay,
      normalized_name_key: name.normalizedNameKey,
      normalized_number: number.normalizedNumber,
      extracted_number_plain: number.extractedNumberPlain,
      inferred_variant_key: effectiveVariantKey,
      variant_identity: variantIdentity,
      candidate_set_mapping: candidateSetMapping,
      candidate_set_mapping_status: setMapping.status,
      candidate_set_codes: candidateSetCodes,
      candidate_card_print_id: tcgplayerMapping.card_print_id,
      candidate_card_print_ids: [tcgplayerMapping.card_print_id],
      candidate_set_code: tcgplayerCanonical.set_code,
      candidate_bucket:
        canonGate.bucket === 'PRINTED_IDENTITY_REVIEW' ? 'PRINTED_IDENTITY_REVIEW' : 'CLEAN_CANON_CANDIDATE',
      classification: 'MATCHED',
      match_status: 'RESOLVED',
      confidence_score: 0.98,
      classification_reason: 'active_tcgplayer_bridge_mapping',
      matched_via: 'tcgplayer_external_mapping',
      has_slash_number: number.hasSlashNumber,
      has_alpha_suffix_number: number.hasAlphaSuffixNumber,
      has_parenthetical_modifier: name.hasParentheticalModifier,
      printed_total: number.printedTotal,
      raw_payload: rawRow.payload,
    };
  }

  if ((justtcgMapping && !justtcgCanonical) || (tcgplayerMapping && !tcgplayerCanonical)) {
    return {
      raw_import_id: rawRow.id,
      ingestion_timestamp: rawRow.ingested_at,
      upstream_id: upstreamId,
      tcgplayer_id: tcgplayerId,
      raw_name: rawName,
      raw_number: rawNumber,
      raw_set: rawSetId,
      raw_set_name: rawSetName,
      normalized_name: name.normalizedNameDisplay,
      normalized_name_key: name.normalizedNameKey,
      normalized_number: number.normalizedNumber,
      extracted_number_plain: number.extractedNumberPlain,
      inferred_variant_key: effectiveVariantKey,
      variant_identity: variantIdentity,
      candidate_set_mapping: candidateSetMapping,
      candidate_set_mapping_status: setMapping.status,
      candidate_set_codes: candidateSetCodes,
      candidate_card_print_id: null,
      candidate_card_print_ids: uniqueValues(
        [justtcgMapping?.card_print_id, tcgplayerMapping?.card_print_id].filter(Boolean),
      ),
      candidate_set_code: null,
      candidate_bucket: 'PRINTED_IDENTITY_REVIEW',
      classification: 'NEEDS_REVIEW',
      match_status: 'AMBIGUOUS',
      confidence_score: 0.45,
      classification_reason: 'mapping_target_noncanonical',
      matched_via: null,
      has_slash_number: number.hasSlashNumber,
      has_alpha_suffix_number: number.hasAlphaSuffixNumber,
      has_parenthetical_modifier: name.hasParentheticalModifier,
      printed_total: number.printedTotal,
      raw_payload: rawRow.payload,
    };
  }

  if (setMapping.status !== 'unique') {
    return {
      raw_import_id: rawRow.id,
      ingestion_timestamp: rawRow.ingested_at,
      upstream_id: upstreamId,
      tcgplayer_id: tcgplayerId,
      raw_name: rawName,
      raw_number: rawNumber,
      raw_set: rawSetId,
      raw_set_name: rawSetName,
      normalized_name: name.normalizedNameDisplay,
      normalized_name_key: name.normalizedNameKey,
      normalized_number: number.normalizedNumber,
      extracted_number_plain: number.extractedNumberPlain,
      inferred_variant_key: effectiveVariantKey,
      variant_identity: variantIdentity,
      candidate_set_mapping: candidateSetMapping,
      candidate_set_mapping_status: setMapping.status,
      candidate_set_codes: candidateSetCodes,
      candidate_card_print_id: null,
      candidate_card_print_ids: [],
      candidate_set_code: null,
      candidate_bucket: 'PRINTED_IDENTITY_REVIEW',
      classification: 'NEEDS_REVIEW',
      match_status: 'AMBIGUOUS',
      confidence_score: setMapping.status === 'missing' ? 0.35 : 0.4,
      classification_reason: `set_mapping_${setMapping.status}`,
      matched_via: null,
      has_slash_number: number.hasSlashNumber,
      has_alpha_suffix_number: number.hasAlphaSuffixNumber,
      has_parenthetical_modifier: name.hasParentheticalModifier,
      printed_total: number.printedTotal,
      raw_payload: rawRow.payload,
    };
  }

  const mappedSetId = setMapping.mappedSetId;
  const strictCandidates =
    canonGate.bucket === 'CLEAN_CANON_CANDIDATE' &&
    mappedSetId &&
    number.extractedNumberPlain &&
    name.normalizedNameKey
      ? context.strictCanonIndex.get(
          buildStrictKey(
            mappedSetId,
            name.normalizedNameKey,
            number.extractedNumberPlain,
            effectiveVariantKey,
          ),
        ) ?? []
      : [];

  if (strictCandidates.length === 1) {
    return {
      raw_import_id: rawRow.id,
      ingestion_timestamp: rawRow.ingested_at,
      upstream_id: upstreamId,
      tcgplayer_id: tcgplayerId,
      raw_name: rawName,
      raw_number: rawNumber,
      raw_set: rawSetId,
      raw_set_name: rawSetName,
      normalized_name: name.normalizedNameDisplay,
      normalized_name_key: name.normalizedNameKey,
      normalized_number: number.normalizedNumber,
      extracted_number_plain: number.extractedNumberPlain,
      inferred_variant_key: effectiveVariantKey,
      variant_identity: variantIdentity,
      candidate_set_mapping: candidateSetMapping,
      candidate_set_mapping_status: setMapping.status,
      candidate_set_codes: candidateSetCodes,
      candidate_card_print_id: strictCandidates[0].id,
      candidate_card_print_ids: [strictCandidates[0].id],
      candidate_set_code: strictCandidates[0].set_code,
      candidate_bucket: 'CLEAN_CANON_CANDIDATE',
      classification: 'MATCHED',
      match_status: 'RESOLVED',
      confidence_score: 0.96,
      classification_reason:
        variantIdentity?.status === 'RESOLVED_BY_VARIANT_KEY'
          ? 'strict_same_set_identity_match_with_variant_key'
          : 'strict_same_set_identity_match',
      matched_via: 'strict_identity',
      has_slash_number: number.hasSlashNumber,
      has_alpha_suffix_number: number.hasAlphaSuffixNumber,
      has_parenthetical_modifier: name.hasParentheticalModifier,
      printed_total: number.printedTotal,
      raw_payload: rawRow.payload,
    };
  }

  const partialCandidates = buildPartialCandidates(
    mappedSetId,
    name.normalizedNameKey,
    number.extractedNumberPlain,
    context.canonicalIndexes,
  );

  if (partialCandidates.length > 0 || canonGate.bucket === 'PRINTED_IDENTITY_REVIEW') {
    return {
      raw_import_id: rawRow.id,
      ingestion_timestamp: rawRow.ingested_at,
      upstream_id: upstreamId,
      tcgplayer_id: tcgplayerId,
      raw_name: rawName,
      raw_number: rawNumber,
      raw_set: rawSetId,
      raw_set_name: rawSetName,
      normalized_name: name.normalizedNameDisplay,
      normalized_name_key: name.normalizedNameKey,
      normalized_number: number.normalizedNumber,
      extracted_number_plain: number.extractedNumberPlain,
      inferred_variant_key: effectiveVariantKey,
      variant_identity: variantIdentity,
      candidate_set_mapping: candidateSetMapping,
      candidate_set_mapping_status: setMapping.status,
      candidate_set_codes: candidateSetCodes,
      candidate_card_print_id: null,
      candidate_card_print_ids: partialCandidates.slice(0, 5).map((row) => row.id),
      candidate_set_code: setMapping.mappedSetCode,
      candidate_bucket: 'PRINTED_IDENTITY_REVIEW',
      classification: 'NEEDS_REVIEW',
      match_status: 'AMBIGUOUS',
      confidence_score: partialCandidates.length > 0 ? 0.55 : 0.4,
      classification_reason:
        partialCandidates.length > 0 ? 'partial_same_set_candidate_surface' : canonGate.reason,
      matched_via: null,
      has_slash_number: number.hasSlashNumber,
      has_alpha_suffix_number: number.hasAlphaSuffixNumber,
      has_parenthetical_modifier: name.hasParentheticalModifier,
      printed_total: number.printedTotal,
      raw_payload: rawRow.payload,
    };
  }

  return {
    raw_import_id: rawRow.id,
    ingestion_timestamp: rawRow.ingested_at,
    upstream_id: upstreamId,
    tcgplayer_id: tcgplayerId,
    raw_name: rawName,
    raw_number: rawNumber,
    raw_set: rawSetId,
    raw_set_name: rawSetName,
    normalized_name: name.normalizedNameDisplay,
    normalized_name_key: name.normalizedNameKey,
    normalized_number: number.normalizedNumber,
    extracted_number_plain: number.extractedNumberPlain,
    inferred_variant_key: effectiveVariantKey,
    variant_identity: variantIdentity,
    candidate_set_mapping: candidateSetMapping,
    candidate_set_mapping_status: setMapping.status,
    candidate_set_codes: candidateSetCodes,
    candidate_card_print_id: null,
    candidate_card_print_ids: [],
    candidate_set_code: setMapping.mappedSetCode,
    candidate_bucket: 'CLEAN_CANON_CANDIDATE',
    classification: 'PROMOTION_CANDIDATE',
    match_status: 'UNMATCHED',
    confidence_score: 0.72,
    classification_reason:
      variantIdentity?.status === 'RESOLVED_BY_VARIANT_KEY'
        ? 'perfect_order_variant_identity_resolved'
        : 'no_same_set_canonical_match_on_clean_surface',
    matched_via: null,
    has_slash_number: number.hasSlashNumber,
    has_alpha_suffix_number: number.hasAlphaSuffixNumber,
    has_parenthetical_modifier: name.hasParentheticalModifier,
    printed_total: number.printedTotal,
    raw_payload: rawRow.payload,
  };
}

function buildStagePayload(classification) {
  return {
    ...classification.raw_payload,
    _grookai_ingestion_v1: {
      worker_version: WORKER_VERSION,
      classification: classification.classification,
      confidence_score: classification.confidence_score,
      candidate_set_mapping: classification.candidate_set_codes,
      candidate_card_print_id: classification.candidate_card_print_id,
      candidate_card_print_ids: classification.candidate_card_print_ids,
      normalized_name_key: classification.normalized_name_key,
      normalized_number: classification.normalized_number,
      extracted_number_plain: classification.extracted_number_plain,
      inferred_variant_key: classification.inferred_variant_key,
      variant_identity: classification.variant_identity ?? null,
      classification_reason: classification.classification_reason,
      matched_via: classification.matched_via,
      source_phase: PHASE,
    },
  };
}

function toStageRow(classification) {
  return {
    source: SOURCE,
    raw_import_id: classification.raw_import_id,
    upstream_id: classification.upstream_id,
    tcgplayer_id: classification.tcgplayer_id,
    set_id: classification.raw_set,
    name_raw: classification.raw_name,
    number_raw: classification.raw_number,
    normalized_name: classification.normalized_name,
    normalized_number_left: classification.normalized_number,
    normalized_number_plain: classification.extracted_number_plain,
    normalized_printed_total: classification.printed_total,
    has_slash_number: classification.has_slash_number,
    has_alpha_suffix_number: classification.has_alpha_suffix_number,
    has_parenthetical_modifier: classification.has_parenthetical_modifier,
    match_status: classification.match_status,
    candidate_bucket: classification.candidate_bucket,
    classifier_version: WORKER_VERSION,
    payload: buildStagePayload(classification),
    resolved_set_code:
      classification.match_status === 'RESOLVED' ? classification.candidate_set_code : null,
    card_print_id:
      classification.match_status === 'RESOLVED' ? classification.candidate_card_print_id : null,
  };
}

function summarizeClassificationCounts(classifiedRows) {
  return classifiedRows.reduce(
    (accumulator, row) => {
      accumulator[row.classification] += 1;
      return accumulator;
    },
    {
      MATCHED: 0,
      NEEDS_REVIEW: 0,
      PROMOTION_CANDIDATE: 0,
      NON_CANONICAL: 0,
    },
  );
}

function buildSampleRows(classifiedRows) {
  const samples = {
    MATCHED: [],
    NEEDS_REVIEW: [],
    PROMOTION_CANDIDATE: [],
    NON_CANONICAL: [],
  };

  for (const row of classifiedRows) {
    if (samples[row.classification].length >= 5) {
      continue;
    }

    samples[row.classification].push({
      raw_import_id: row.raw_import_id,
      upstream_id: row.upstream_id,
      raw_name: row.raw_name,
      raw_number: row.raw_number,
      raw_set: row.raw_set,
      candidate_set_mapping: row.candidate_set_mapping,
      candidate_card_print_id: row.candidate_card_print_id,
      classification_reason: row.classification_reason,
      confidence_score: row.confidence_score,
    });
  }

  return samples;
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function loadRawRows(client, options) {
  const limitClause = options.limit != null ? `limit ${options.limit}` : '';
  const offsetClause = options.offset > 0 ? `offset ${options.offset}` : '';

  return queryRows(
    client,
    `
      select
        ri.id,
        ri.ingested_at,
        ri.payload
      from public.${RAW_TABLE} ri
      where ri.source = $1
        and coalesce(ri.payload->>'_kind', '') = $2
      order by ri.id
      ${limitClause}
      ${offsetClause}
    `,
    [SOURCE, KIND],
  );
}

async function loadSetMappings(client) {
  return queryRows(
    client,
    `
      select
        jsm.justtcg_set_id,
        jsm.justtcg_set_name,
        jsm.grookai_set_id,
        s.code as grookai_set_code,
        s.name as grookai_set_name,
        jsm.alignment_status,
        jsm.match_method
      from public.${SET_MAPPINGS_TABLE} jsm
      join public.${CANONICAL_SET_TABLE} s
        on s.id = jsm.grookai_set_id
      where jsm.active is true
      order by jsm.justtcg_set_id, s.code
    `,
  );
}

async function loadCanonicalRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id,
        cp.set_id,
        s.code as set_code,
        cp.name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        cp.gv_id
      from public.${CANONICAL_TABLE} cp
      join public.${CANONICAL_SET_TABLE} s
        on s.id = cp.set_id
      where cp.gv_id is not null
      order by cp.id
    `,
  );
}

async function loadExternalMappingsByIds(client, sourceName, externalIds) {
  if (externalIds.length === 0) {
    return [];
  }

  const rows = [];
  for (const chunk of chunkArray(externalIds, 500)) {
    rows.push(
      ...await queryRows(
        client,
        `
          select
            em.external_id,
            em.card_print_id
          from public.${EXTERNAL_MAPPINGS_TABLE} em
          where em.source = $1
            and em.active is true
            and em.external_id = any($2::text[])
        `,
        [sourceName, chunk],
      ),
    );
  }

  return rows;
}

async function loadTableCount(client, tableName, whereSql = '', params = []) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.${tableName}
      ${whereSql}
    `,
    params,
  );

  return Number(row?.row_count ?? 0);
}

async function upsertStageRows(client, stageRows) {
  if (stageRows.length === 0) {
    return 0;
  }

  let rowsWritten = 0;

  for (const chunk of chunkArray(stageRows, WRITE_CHUNK_SIZE)) {
    const payload = JSON.stringify(chunk);
    const { rowCount } = await client.query(
      `
        with input_rows as (
          select *
          from jsonb_to_recordset($1::jsonb) as x(
            source text,
            raw_import_id bigint,
            upstream_id text,
            tcgplayer_id text,
            set_id text,
            name_raw text,
            number_raw text,
            normalized_name text,
            normalized_number_left text,
            normalized_number_plain text,
            normalized_printed_total text,
            has_slash_number boolean,
            has_alpha_suffix_number boolean,
            has_parenthetical_modifier boolean,
            match_status text,
            candidate_bucket text,
            classifier_version text,
            payload jsonb,
            resolved_set_code text,
            card_print_id uuid
          )
        )
        insert into public.${STAGING_TABLE} (
          source,
          raw_import_id,
          upstream_id,
          tcgplayer_id,
          set_id,
          name_raw,
          number_raw,
          normalized_name,
          normalized_number_left,
          normalized_number_plain,
          normalized_printed_total,
          has_slash_number,
          has_alpha_suffix_number,
          has_parenthetical_modifier,
          match_status,
          candidate_bucket,
          classifier_version,
          payload,
          resolved_set_code,
          card_print_id
        )
        select
          source,
          raw_import_id,
          upstream_id,
          tcgplayer_id,
          set_id,
          name_raw,
          number_raw,
          normalized_name,
          normalized_number_left,
          normalized_number_plain,
          normalized_printed_total,
          has_slash_number,
          has_alpha_suffix_number,
          has_parenthetical_modifier,
          match_status,
          candidate_bucket,
          classifier_version,
          payload,
          resolved_set_code,
          card_print_id
        from input_rows
        on conflict (source, upstream_id, raw_import_id)
        do update set
          tcgplayer_id = excluded.tcgplayer_id,
          set_id = excluded.set_id,
          name_raw = excluded.name_raw,
          number_raw = excluded.number_raw,
          normalized_name = excluded.normalized_name,
          normalized_number_left = excluded.normalized_number_left,
          normalized_number_plain = excluded.normalized_number_plain,
          normalized_printed_total = excluded.normalized_printed_total,
          has_slash_number = excluded.has_slash_number,
          has_alpha_suffix_number = excluded.has_alpha_suffix_number,
          has_parenthetical_modifier = excluded.has_parenthetical_modifier,
          match_status = excluded.match_status,
          candidate_bucket = excluded.candidate_bucket,
          classifier_version = excluded.classifier_version,
          payload = excluded.payload,
          resolved_set_code = excluded.resolved_set_code,
          card_print_id = excluded.card_print_id
      `,
      [payload],
    );

    rowsWritten += rowCount ?? 0;
  }

  return rowsWritten;
}

function buildCanonicalIndexes(canonicalRows) {
  const canonicalById = new Map();
  const strictCanonIndex = new Map();
  const byNumberPlain = new Map();
  const byName = new Map();

  for (const row of canonicalRows) {
    const normalizedNameDisplay = toCanonicalDisplayNameV3(row.name);
    const normalizedNameKey = toNameNormalizeV3Key(normalizedNameDisplay);
    const normalizedRow = {
      ...row,
      normalized_name: normalizedNameDisplay,
      normalized_name_key: normalizedNameKey,
    };

    canonicalById.set(row.id, normalizedRow);
    addToMultiMap(
      strictCanonIndex,
      buildStrictKey(
        row.set_id,
        normalizedNameKey,
        normalizeTextOrNull(row.number_plain),
        normalizeTextOrNull(row.variant_key) ?? '',
      ),
      normalizedRow,
    );

    if (row.set_id && row.number_plain) {
      addToMultiMap(
        byNumberPlain,
        buildLooseNumberKey(row.set_id, normalizeTextOrNull(row.number_plain)),
        normalizedRow,
      );
    }

    if (row.set_id && normalizedNameKey) {
      addToMultiMap(byName, buildNameKey(row.set_id, normalizedNameKey), normalizedRow);
    }
  }

  return {
    canonicalById,
    strictCanonIndex,
    canonicalIndexes: {
      byNumberPlain,
      byName,
    },
  };
}

function buildExternalMappingIndex(rows, label) {
  const index = new Map();

  for (const row of rows) {
    const externalId = normalizeTextOrNull(row.external_id);
    const cardPrintId = normalizeTextOrNull(row.card_print_id);

    if (!externalId || !cardPrintId) {
      throw new Error(`${label}_MALFORMED_MAPPING_ROW`);
    }

    if (index.has(externalId)) {
      throw new Error(`${label}_DUPLICATE_ACTIVE_MAPPING:${externalId}`);
    }

    index.set(externalId, {
      external_id: externalId,
      card_print_id: cardPrintId,
    });
  }

  return index;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const options = parseArgs(process.argv.slice(2));

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    source: SOURCE,
    kind: KIND,
    rows_processed: 0,
    classification_counts: null,
    promotion_candidate_count: 0,
    stage_rows_targeted: 0,
    stage_rows_written: 0,
    stage_rows_with_worker_version_before: 0,
    stage_rows_with_worker_version_after: 0,
    canonical_row_count_before: 0,
    canonical_row_count_after: 0,
    canonical_writes_detected: 0,
    sample_rows: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    application_name: `${PHASE}:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    report.canonical_row_count_before = await loadTableCount(client, CANONICAL_TABLE);
    report.stage_rows_with_worker_version_before = await loadTableCount(
      client,
      STAGING_TABLE,
      'where classifier_version = $1',
      [WORKER_VERSION],
    );

    const [rawRows, setMappings, canonicalRows] = await Promise.all([
      loadRawRows(client, options),
      loadSetMappings(client),
      loadCanonicalRows(client),
    ]);

    const rawJusttcgIds = uniqueValues(
      rawRows.map((row) => normalizeTextOrNull(row.payload?.id ?? row.payload?._external_id)).filter(Boolean),
    );
    const rawTcgplayerIds = uniqueValues(
      rawRows.map((row) => normalizeTextOrNull(row.payload?.tcgplayerId)).filter(Boolean),
    );

    const [justtcgMappings, tcgplayerMappings] = await Promise.all([
      loadExternalMappingsByIds(client, SOURCE, rawJusttcgIds),
      loadExternalMappingsByIds(client, 'tcgplayer', rawTcgplayerIds),
    ]);

    const { canonicalById, strictCanonIndex, canonicalIndexes } = buildCanonicalIndexes(canonicalRows);
    const setMappingsBySourceSet = new Map();
    for (const row of setMappings) {
      addToMultiMap(setMappingsBySourceSet, normalizeTextOrNull(row.justtcg_set_id), {
        justtcg_set_id: normalizeTextOrNull(row.justtcg_set_id),
        justtcg_set_name: normalizeTextOrNull(row.justtcg_set_name),
        grookai_set_id: normalizeTextOrNull(row.grookai_set_id),
        grookai_set_code: normalizeTextOrNull(row.grookai_set_code),
        grookai_set_name: normalizeTextOrNull(row.grookai_set_name),
      });
    }

    const context = {
      setMappingsBySourceSet,
      canonicalById,
      strictCanonIndex,
      canonicalIndexes,
      justtcgMappings: buildExternalMappingIndex(justtcgMappings, 'JUSTTCG'),
      tcgplayerMappings: buildExternalMappingIndex(tcgplayerMappings, 'TCGPLAYER'),
    };

    const classifiedRows = rawRows.map((row) => buildClassificationRecord(row, context));
    const stageRows = classifiedRows
      .filter((row) => row.classification !== 'NON_CANONICAL')
      .map((row) => toStageRow(row));

    report.rows_processed = classifiedRows.length;
    report.classification_counts = summarizeClassificationCounts(classifiedRows);
    report.promotion_candidate_count = report.classification_counts.PROMOTION_CANDIDATE;
    report.stage_rows_targeted = stageRows.length;
    report.sample_rows = buildSampleRows(classifiedRows);

    if (MODE === 'apply') {
      report.stage_rows_written = await upsertStageRows(client, stageRows);
    }

    report.stage_rows_with_worker_version_after = await loadTableCount(
      client,
      STAGING_TABLE,
      'where classifier_version = $1',
      [WORKER_VERSION],
    );
    report.canonical_row_count_after = await loadTableCount(client, CANONICAL_TABLE);
    report.canonical_writes_detected =
      report.canonical_row_count_after === report.canonical_row_count_before ? 0 : 1;

    if (report.canonical_writes_detected !== 0) {
      throw new Error(
        `CANONICAL_WRITE_DETECTED:${report.canonical_row_count_before}:${report.canonical_row_count_after}`,
      );
    }

    report.status = MODE === 'apply' ? 'apply_passed' : 'dry_run_passed';

    if (MODE === 'apply') {
      await client.query('commit');
    } else {
      await client.query('rollback');
    }

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original error.
    }

    report.status = 'failed';
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
