import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';

export const STAMPED_IDENTITY_RULE_V1 = 'STAMPED_IDENTITY_RULE_V1';

export const STAMPED_IDENTITY_STATUS = Object.freeze({
  RESOLVED_STAMPED_IDENTITY: 'RESOLVED_STAMPED_IDENTITY',
  NOT_STAMPED_IDENTITY: 'NOT_STAMPED_IDENTITY',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  UNDERLYING_BASE_MISSING: 'UNDERLYING_BASE_MISSING',
  AMBIGUOUS_STAMPED_IDENTITY: 'AMBIGUOUS_STAMPED_IDENTITY',
});

const FINISH_ONLY_RE =
  /\b(cosmos holo|cosmo holo|cracked ice|reverse holo|line holo|sheen holo|water web holo|metal card)\b/i;
const STAFF_RE = /\bstaff\b/i;
const PRERELEASE_RE = /\bprerelease\b/i;
const EVENT_KEYWORD_RE =
  /\b(battle road|worlds|world championships?|city championships|regional championships|origins game fair|e-league|sdcc|comic con|e3)\b/i;
const PLACE_KEYWORD_RE = /\b(top\s*\d+|winner|\d(?:st|nd|rd|th)\s+place)\b/i;
const RAW_STAMP_WORD_RE = /\b(stamp|stamped)\b/i;
const PRIZE_PACK_SERIES_RE = /\bprize pack series\s*(\d+)\b/i;
const YEAR_ONLY_RE = /^\d{4}(?:-\d{4})?$/;
const STANDALONE_STAMP_NAMES = new Set([
  'league staff',
  'staff',
]);
const FAMILY_HINT_SETS = new Set([
  'prize-pack-series-cards-pokemon',
  'professor-program-promos-pokemon',
]);

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLower(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : '';
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value) {
  const normalized = collapseWhitespace(value);
  if (!normalized) {
    return null;
  }

  const acronyms = new Map([
    ['sdcc', 'SDCC'],
    ['e3', 'E3'],
    ['tcg', 'TCG'],
    ['sm', 'SM'],
    ['bw', 'BW'],
  ]);

  return normalized
    .split(' ')
    .map((word) => {
      const lowered = word.toLowerCase();
      if (acronyms.has(lowered)) {
        return acronyms.get(lowered);
      }
      if (/^\d(?:st|nd|rd|th)$/i.test(word)) {
        return word.toLowerCase();
      }
      return lowered.charAt(0).toUpperCase() + lowered.slice(1);
    })
    .join(' ');
}

function extractSegments(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return [];
  }

  const segments = [];
  const pattern = /(\(([^()]+)\)|\[([^\]]+)\])/g;
  let match = pattern.exec(normalized);

  while (match) {
    const candidate = normalizeTextOrNull(match[2] ?? match[3]);
    if (candidate) {
      segments.push(candidate);
    }
    match = pattern.exec(normalized);
  }

  return segments;
}

function normalizePhraseRoot(value) {
  let normalized = collapseWhitespace(value);
  if (!normalized) {
    return null;
  }

  normalized = normalized.replace(/^#\d+\s+/i, '');
  normalized = normalized.replace(/\b(stamp|stamped)\b/gi, ' ');
  normalized = normalized.replace(/\bwith\b/gi, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized || null;
}

function buildStampLabel(root) {
  const normalizedRoot = normalizeTextOrNull(root);
  if (!normalizedRoot) {
    return null;
  }

  return `${toTitleCase(normalizedRoot)} Stamp`;
}

function buildVariantKey(root) {
  const normalizedRoot = normalizeTextOrNull(root);
  if (!normalizedRoot) {
    return null;
  }

  const body = normalizedRoot
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_');

  if (!body) {
    return null;
  }

  return body.endsWith('_stamp') ? body : `${body}_stamp`;
}

function buildResolvedResult({ patternFamily, rootLabel, matchedSource, candidateName, sourceExternalId }) {
  const stampLabel = buildStampLabel(rootLabel);
  const variantKey = buildVariantKey(rootLabel);

  if (!stampLabel || !variantKey) {
    return null;
  }

  return {
    rule: STAMPED_IDENTITY_RULE_V1,
    status: STAMPED_IDENTITY_STATUS.RESOLVED_STAMPED_IDENTITY,
    pattern_family: patternFamily,
    variant_key: variantKey,
    stamp_label: stampLabel,
    underlying_match_required: true,
    source_evidence: {
      candidate_name: normalizeTextOrNull(candidateName),
      source_external_id: normalizeTextOrNull(sourceExternalId),
      matched_source: matchedSource,
    },
  };
}

function buildEventStampCandidate(candidateName, sourceExternalId) {
  const segments = extractSegments(candidateName);
  const joinedSegments = collapseWhitespace(segments.join(' '));
  const externalLower = normalizeLower(sourceExternalId);

  if (!EVENT_KEYWORD_RE.test(joinedSegments) && !EVENT_KEYWORD_RE.test(externalLower)) {
    return null;
  }

  if (!joinedSegments) {
    return null;
  }

  return buildResolvedResult({
    patternFamily: 'explicit_event_stamp',
    rootLabel: joinedSegments,
    matchedSource: 'candidate_name_segments',
    candidateName,
    sourceExternalId,
  });
}

function buildNamedStampCandidate(candidateName, sourceExternalId) {
  const segments = extractSegments(candidateName);

  for (const segment of segments) {
    if (!RAW_STAMP_WORD_RE.test(segment)) {
      continue;
    }

    const root = normalizePhraseRoot(segment);
    if (!root) {
      continue;
    }

    return buildResolvedResult({
      patternFamily: /#\d+/i.test(segment) ? 'battle_academy_mascot_stamp' : 'explicit_named_stamp',
      rootLabel: root,
      matchedSource: 'candidate_name_segment',
      candidateName,
      sourceExternalId,
    });
  }

  const normalizedName = normalizeTextOrNull(candidateName) ?? '';
  if (RAW_STAMP_WORD_RE.test(normalizedName)) {
    const match = normalizedName.match(/\b([^()[\]]+?)\s+(?:stamp|stamped)\b/i);
    if (match?.[1]) {
      const root = normalizePhraseRoot(match[1]);
      if (root) {
        return buildResolvedResult({
          patternFamily: 'explicit_named_stamp',
          rootLabel: root,
          matchedSource: 'candidate_name_text',
          candidateName,
          sourceExternalId,
        });
      }
    }
  }

  const externalId = normalizeTextOrNull(sourceExternalId) ?? '';
  if (RAW_STAMP_WORD_RE.test(externalId)) {
    const normalizedExternal = externalId
      .replace(/^pokemon-/, '')
      .replace(/-promo$/, '')
      .replace(/[_-]+/g, ' ');
    const match = normalizedExternal.match(/\b([a-z0-9 ]+?)\s+(?:stamp|stamped)\b/i);
    if (match?.[1]) {
      const root = normalizePhraseRoot(match[1]);
      if (root) {
        return buildResolvedResult({
          patternFamily: 'explicit_named_stamp',
          rootLabel: root,
          matchedSource: 'source_external_id',
          candidateName,
          sourceExternalId,
        });
      }
    }
  }

  return null;
}

function buildStaffPrereleaseCandidate(candidateName, sourceExternalId) {
  const combinedText = `${normalizeTextOrNull(candidateName) ?? ''} ${normalizeTextOrNull(sourceExternalId) ?? ''}`;
  const hasStaff = STAFF_RE.test(combinedText);
  const hasPrerelease = PRERELEASE_RE.test(combinedText);

  if (!hasStaff && !hasPrerelease) {
    return null;
  }

  if (hasStaff && hasPrerelease) {
    return buildResolvedResult({
      patternFamily: 'staff_prerelease_marker',
      rootLabel: 'staff prerelease',
      matchedSource: 'combined_text',
      candidateName,
      sourceExternalId,
    });
  }

  if (hasStaff) {
    return buildResolvedResult({
      patternFamily: 'staff_marker',
      rootLabel: 'staff',
      matchedSource: 'combined_text',
      candidateName,
      sourceExternalId,
    });
  }

  return buildResolvedResult({
    patternFamily: 'prerelease_marker',
    rootLabel: 'prerelease',
    matchedSource: 'combined_text',
    candidateName,
    sourceExternalId,
  });
}

function buildPrizePackSeriesCandidate(candidateName, sourceExternalId) {
  const texts = [normalizeTextOrNull(candidateName), normalizeTextOrNull(sourceExternalId)].filter(Boolean);

  for (const text of texts) {
    const normalized = text.replace(/[_-]+/g, ' ');
    const match = normalized.match(PRIZE_PACK_SERIES_RE);
    if (!match?.[1]) {
      continue;
    }

    return buildResolvedResult({
      patternFamily: 'prize_pack_series_marker',
      rootLabel: `prize pack series ${match[1]}`,
      matchedSource: text === candidateName ? 'candidate_name_text' : 'source_external_id',
      candidateName,
      sourceExternalId,
    });
  }

  return null;
}

function detectStampedIdentity({
  candidateName,
  sourceExternalId,
  sourceSetId,
}) {
  const normalizedName = normalizeTextOrNull(candidateName);
  const nameLower = normalizeLower(candidateName);
  const sourceSetLower = normalizeLower(sourceSetId);
  const sourceExternalLower = normalizeLower(sourceExternalId);

  if (FINISH_ONLY_RE.test(`${nameLower} ${sourceExternalLower}`)) {
    return {
      rule: STAMPED_IDENTITY_RULE_V1,
      status: STAMPED_IDENTITY_STATUS.NOT_STAMPED_IDENTITY,
      pattern_family: 'finish_only_false_positive',
      variant_key: null,
      stamp_label: null,
      underlying_match_required: true,
      source_evidence: {
        candidate_name: normalizeTextOrNull(candidateName),
        source_external_id: normalizeTextOrNull(sourceExternalId),
        matched_source: 'finish_only_guard',
      },
    };
  }

  if (normalizedName && STANDALONE_STAMP_NAMES.has(nameLower)) {
    return {
      rule: STAMPED_IDENTITY_RULE_V1,
      status: STAMPED_IDENTITY_STATUS.NOT_STAMPED_IDENTITY,
      pattern_family: 'standalone_title_not_base_plus_stamp',
      variant_key: null,
      stamp_label: null,
      underlying_match_required: true,
      source_evidence: {
        candidate_name: normalizedName,
        source_external_id: normalizeTextOrNull(sourceExternalId),
        matched_source: 'standalone_name_guard',
      },
    };
  }

  const prizePackCandidate = buildPrizePackSeriesCandidate(candidateName, sourceExternalId);
  if (prizePackCandidate) {
    return prizePackCandidate;
  }

  const namedStampCandidate = buildNamedStampCandidate(candidateName, sourceExternalId);
  if (namedStampCandidate) {
    return namedStampCandidate;
  }

  const eventStampCandidate = buildEventStampCandidate(candidateName, sourceExternalId);
  if (eventStampCandidate) {
    return eventStampCandidate;
  }

  const staffPrereleaseCandidate = buildStaffPrereleaseCandidate(candidateName, sourceExternalId);
  if (staffPrereleaseCandidate && extractSegments(candidateName).length > 0) {
    return staffPrereleaseCandidate;
  }

  if (normalizedName && YEAR_ONLY_RE.test(extractSegments(candidateName)[0] ?? '')) {
    return {
      rule: STAMPED_IDENTITY_RULE_V1,
      status: STAMPED_IDENTITY_STATUS.NOT_STAMPED_IDENTITY,
      pattern_family: 'year_only_promo_label',
      variant_key: null,
      stamp_label: null,
      underlying_match_required: true,
      source_evidence: {
        candidate_name: normalizedName,
        source_external_id: normalizeTextOrNull(sourceExternalId),
        matched_source: 'year_only_parenthetical',
      },
    };
  }

  if (FAMILY_HINT_SETS.has(sourceSetLower)) {
    return {
      rule: STAMPED_IDENTITY_RULE_V1,
      status: STAMPED_IDENTITY_STATUS.INSUFFICIENT_EVIDENCE,
      pattern_family: sourceSetLower === 'prize-pack-series-cards-pokemon' ? 'prize_pack_family_only' : 'family_hint_only',
      variant_key: null,
      stamp_label: null,
      underlying_match_required: true,
      source_evidence: {
        candidate_name: normalizeTextOrNull(candidateName),
        source_external_id: normalizeTextOrNull(sourceExternalId),
        matched_source: 'family_hint_only',
      },
    };
  }

  if (STAFF_RE.test(sourceExternalLower) || PRERELEASE_RE.test(sourceExternalLower)) {
    return {
      rule: STAMPED_IDENTITY_RULE_V1,
      status: STAMPED_IDENTITY_STATUS.INSUFFICIENT_EVIDENCE,
      pattern_family: 'external_id_marker_without_printed_phrase',
      variant_key: null,
      stamp_label: null,
      underlying_match_required: true,
      source_evidence: {
        candidate_name: normalizeTextOrNull(candidateName),
        source_external_id: normalizeTextOrNull(sourceExternalId),
        matched_source: 'source_external_id_only',
      },
    };
  }

  return {
    rule: STAMPED_IDENTITY_RULE_V1,
    status: STAMPED_IDENTITY_STATUS.NOT_STAMPED_IDENTITY,
    pattern_family: 'no_stamped_basis',
    variant_key: null,
    stamp_label: null,
    underlying_match_required: true,
    source_evidence: {
      candidate_name: normalizeTextOrNull(candidateName),
      source_external_id: normalizeTextOrNull(sourceExternalId),
      matched_source: 'no_supported_pattern',
    },
  };
}

export function classifyStampedUnderlyingBaseState({ blockingReason, evidence = {} }) {
  const normalizedReason = normalizeTextOrNull(blockingReason);
  const setHint = normalizeTextOrNull(evidence.set_hint);

  if (
    normalizedReason === 'same_set_base_match_exists_but_special_identity_row_is_missing' ||
    (normalizedReason === 'unique_underlying_canon_match_supports_missing_special_identity' && setHint)
  ) {
    return 'PROVEN';
  }

  if (normalizedReason === 'unique_underlying_canon_match_supports_missing_special_identity') {
    return 'ROUTE_MISSING';
  }

  if (
    normalizedReason === 'canonical_set_exists_but_special_identity_row_is_missing' ||
    normalizedReason === 'canonical_set_absent_from_canon_outside_special_pass'
  ) {
    return 'MISSING';
  }

  if (
    normalizedReason === 'insufficient_source_or_routing_evidence' ||
    normalizedReason === 'multiple_possible_underlying_canonical_rows'
  ) {
    return 'AMBIGUOUS';
  }

  return 'AMBIGUOUS';
}

export function stripStampedModifiersFromName(value) {
  let normalized = normalizeTextOrNull(value) ?? '';
  normalized = normalized.replace(/\[[^\]]+\]/g, ' ');
  normalized = normalized.replace(/\((?:#\d+\s+)?[^()]*?\bstamped\b[^()]*\)/gi, ' ');
  normalized = normalized.replace(/\((?:battle road|worlds|world championships?|city championships|regional championships|origins game fair|e-league|sdcc|comic con|e3)[^()]*\)/gi, ' ');
  normalized = normalized.replace(/\((?:prerelease|staff)\)/gi, ' ');
  normalized = normalized.replace(/\s*-\s*[A-Za-z0-9]+(?:\/[A-Za-z0-9.-]+)?\s*$/g, ' ');
  normalized = collapseWhitespace(normalized);
  return normalizeCardNameV1(normalized).corrected_name;
}

export function deriveStampedIdentity({
  candidateName,
  sourceExternalId,
  sourceSetId,
  underlyingBaseState = null,
}) {
  const detected = detectStampedIdentity({
    candidateName,
    sourceExternalId,
    sourceSetId,
  });

  if (detected.status !== STAMPED_IDENTITY_STATUS.RESOLVED_STAMPED_IDENTITY) {
    return detected;
  }

  if (underlyingBaseState === 'ROUTE_MISSING' || underlyingBaseState === 'MISSING') {
    return {
      ...detected,
      status: STAMPED_IDENTITY_STATUS.UNDERLYING_BASE_MISSING,
    };
  }

  if (underlyingBaseState === 'AMBIGUOUS') {
    return {
      ...detected,
      status: STAMPED_IDENTITY_STATUS.AMBIGUOUS_STAMPED_IDENTITY,
    };
  }

  return detected;
}
