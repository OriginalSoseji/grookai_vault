const PERFECT_ORDER_SET_ID = 'me03-perfect-order-pokemon';
const PERFECT_ORDER_RULE = 'PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1';

const SUPPORTED_CATEGORY_MAP = new Map([
  ['illustration rare', { variantKey: 'illustration_rare', illustrationCategoryLabel: 'Illustration Rare' }],
  ['shiny rare', { variantKey: 'shiny_rare', illustrationCategoryLabel: 'Shiny Rare' }],
  ['special illustration rare', {
    variantKey: 'special_illustration_rare',
    illustrationCategoryLabel: 'Special Illustration Rare',
  }],
  ['full art', { variantKey: 'full_art', illustrationCategoryLabel: 'Full Art' }],
  ['hyper rare', { variantKey: 'hyper_rare', illustrationCategoryLabel: 'Hyper Rare' }],
  ['gold rare', { variantKey: 'gold_rare', illustrationCategoryLabel: 'Gold Rare' }],
]);

const PERFECT_ORDER_COLLISION_GROUPS = new Set([
  'me03-perfect-order-pokemon::89::spewpa',
  'me03-perfect-order-pokemon::90::rowlet',
  'me03-perfect-order-pokemon::92::aurorus',
  'me03-perfect-order-pokemon::93::dedenne',
  'me03-perfect-order-pokemon::94::clefairy',
  'me03-perfect-order-pokemon::95::espurr',
]);

const EXTERNAL_ID_CATEGORY_PATTERNS = [
  { pattern: /(?:^|[-_])special[-_]?illustration[-_]?rare(?:$|[-_])/i, label: 'special illustration rare' },
  { pattern: /(?:^|[-_])illustration[-_]?rare(?:$|[-_])/i, label: 'illustration rare' },
  { pattern: /(?:^|[-_])shiny[-_]?rare(?:$|[-_])/i, label: 'shiny rare' },
  { pattern: /(?:^|[-_])full[-_]?art(?:$|[-_])/i, label: 'full art' },
  { pattern: /(?:^|[-_])hyper[-_]?rare(?:$|[-_])/i, label: 'hyper rare' },
  { pattern: /(?:^|[-_])gold[-_]?rare(?:$|[-_])/i, label: 'gold rare' },
];

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeNameKey(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalizeSpaces(
    normalized
      .replace(/[’`]/g, "'")
      .replace(/[\u2013\u2014]/g, ' ')
      .toLowerCase(),
  );
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return digits.length > 0 ? digits : null;
}

function normalizeCategoryLabel(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalizeSpaces(
    normalized
      .replace(/[_-]+/g, ' ')
      .replace(/[()]/g, ' ')
      .toLowerCase(),
  );
}

function deriveCategoryFromExternalId(externalId) {
  const normalized = normalizeTextOrNull(externalId);
  if (!normalized) {
    return null;
  }

  for (const candidate of EXTERNAL_ID_CATEGORY_PATTERNS) {
    if (candidate.pattern.test(normalized)) {
      return candidate.label;
    }
  }

  return null;
}

export function buildPerfectOrderCollisionGroupKey({ sourceSetId, numberPlain, normalizedNameKey }) {
  const setId = normalizeTextOrNull(sourceSetId);
  const plain = normalizeNumberPlain(numberPlain);
  const nameKey = normalizeNameKey(normalizedNameKey);

  if (!setId || !plain || !nameKey) {
    return null;
  }

  return `${setId}::${plain}::${nameKey}`;
}

export function normalizePerfectOrderIllustrationCategory(rawLabel) {
  const normalizedLabel = normalizeCategoryLabel(rawLabel);
  if (!normalizedLabel) {
    return null;
  }

  const match = SUPPORTED_CATEGORY_MAP.get(normalizedLabel);
  if (!match) {
    return null;
  }

  return {
    normalizedSourceLabel: normalizedLabel,
    variantKey: match.variantKey,
    illustrationCategoryLabel: match.illustrationCategoryLabel,
  };
}

export function derivePerfectOrderVariantIdentity({
  sourceSetId,
  numberPlain,
  normalizedNameKey,
  rawRarity,
  upstreamId,
  candidateLabels = [],
}) {
  const collisionGroupKey = buildPerfectOrderCollisionGroupKey({
    sourceSetId,
    numberPlain,
    normalizedNameKey,
  });

  if (
    normalizeTextOrNull(sourceSetId) !== PERFECT_ORDER_SET_ID ||
    !collisionGroupKey ||
    !PERFECT_ORDER_COLLISION_GROUPS.has(collisionGroupKey)
  ) {
    return null;
  }

  const evidenceCandidates = [
    { source: 'raw_rarity', value: rawRarity },
    ...candidateLabels.map((value) => ({ source: 'candidate_label', value })),
    { source: 'external_id_suffix', value: deriveCategoryFromExternalId(upstreamId) },
  ];

  for (const candidate of evidenceCandidates) {
    const normalized = normalizePerfectOrderIllustrationCategory(candidate.value);
    if (!normalized) {
      continue;
    }

    return {
      rule: PERFECT_ORDER_RULE,
      applies: true,
      status: 'RESOLVED_BY_VARIANT_KEY',
      collision_group_key: collisionGroupKey,
      collision_resolution_reason: 'resolved_by_variant_key',
      variant_key: normalized.variantKey,
      illustration_category: normalized.illustrationCategoryLabel,
      source_evidence: {
        source_set_id: PERFECT_ORDER_SET_ID,
        raw_rarity: normalizeTextOrNull(rawRarity),
        upstream_id: normalizeTextOrNull(upstreamId),
        matched_source: candidate.source,
        matched_label: normalizeTextOrNull(candidate.value),
        normalized_label: normalized.normalizedSourceLabel,
      },
    };
  }

  return {
    rule: PERFECT_ORDER_RULE,
    applies: true,
    status: 'BLOCKED_UNLABELED_COLLISION',
    collision_group_key: collisionGroupKey,
    collision_resolution_reason: 'blocked_missing_supported_illustration_category',
    variant_key: null,
    illustration_category: null,
    source_evidence: {
      source_set_id: PERFECT_ORDER_SET_ID,
      raw_rarity: normalizeTextOrNull(rawRarity),
      upstream_id: normalizeTextOrNull(upstreamId),
    },
  };
}

export function coercePerfectOrderVariantIdentity(value) {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!record) {
    return null;
  }

  const rule = normalizeTextOrNull(record.rule);
  const status = normalizeTextOrNull(record.status);
  const variantKey = normalizeTextOrNull(record.variant_key);
  const illustrationCategory = normalizeTextOrNull(record.illustration_category);
  const collisionGroupKey = normalizeTextOrNull(record.collision_group_key);
  const collisionResolutionReason = normalizeTextOrNull(record.collision_resolution_reason);
  const sourceEvidence =
    record.source_evidence && typeof record.source_evidence === 'object' && !Array.isArray(record.source_evidence)
      ? record.source_evidence
      : null;
  const sourceSetId = normalizeTextOrNull(sourceEvidence?.source_set_id);
  const isPerfectOrderIdentity = rule === PERFECT_ORDER_RULE || sourceSetId === PERFECT_ORDER_SET_ID;

  if (
    !isPerfectOrderIdentity &&
    !variantKey &&
    !illustrationCategory &&
    !collisionGroupKey &&
    !status
  ) {
    return null;
  }

  if (!isPerfectOrderIdentity) {
    return null;
  }

  return {
    rule: rule ?? PERFECT_ORDER_RULE,
    applies: true,
    status,
    collision_group_key: collisionGroupKey,
    collision_resolution_reason: collisionResolutionReason,
    variant_key: variantKey,
    illustration_category: illustrationCategory,
    source_evidence: sourceEvidence,
  };
}

export function validatePerfectOrderVariantIdentityForPromotion(variantIdentity, variantKey) {
  const normalizedIdentity = coercePerfectOrderVariantIdentity(variantIdentity);
  if (!normalizedIdentity?.applies) {
    return { ok: true, reason: null, missing_requirements: [] };
  }

  if (normalizedIdentity.status !== 'RESOLVED_BY_VARIANT_KEY') {
    return {
      ok: false,
      reason: 'Perfect Order collision group is still unlabeled and cannot promote.',
      missing_requirements: ['deterministic variant_key', 'illustration_category'],
    };
  }

  const normalizedVariantKey = normalizeTextOrNull(variantKey);
  if (!normalizedVariantKey) {
    return {
      ok: false,
      reason: 'Missing required variant_key for collision-resolved promotion target.',
      missing_requirements: ['variant_key'],
    };
  }

  if (normalizedVariantKey !== normalizedIdentity.variant_key) {
    return {
      ok: false,
      reason: 'variant_key does not match the resolved Perfect Order collision identity.',
      missing_requirements: ['variant_key_alignment'],
    };
  }

  return { ok: true, reason: null, missing_requirements: [] };
}

export const PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1 = PERFECT_ORDER_RULE;
export const PERFECT_ORDER_VARIANT_IDENTITY_SET_ID = PERFECT_ORDER_SET_ID;
export const PERFECT_ORDER_VARIANT_IDENTITY_FIXTURES = [
  {
    name: 'Spewpa',
    number_plain: '89',
    rows: [
      { raw_rarity: 'Illustration Rare', upstream_id: 'spewpa-089-088-illustration-rare' },
      { raw_rarity: 'Shiny Rare', upstream_id: 'spewpa-089-088-shiny-rare' },
    ],
  },
  {
    name: 'Rowlet',
    number_plain: '90',
    rows: [
      { raw_rarity: 'Illustration Rare', upstream_id: 'rowlet-090-088-illustration-rare' },
      { raw_rarity: 'Shiny Rare', upstream_id: 'rowlet-090-088-shiny-rare' },
    ],
  },
  {
    name: 'Aurorus',
    number_plain: '92',
    rows: [
      { raw_rarity: 'Illustration Rare', upstream_id: 'aurorus-092-088-illustration-rare' },
      { raw_rarity: 'Shiny Rare', upstream_id: 'aurorus-092-088-shiny-rare' },
    ],
  },
  {
    name: 'Dedenne',
    number_plain: '93',
    rows: [
      { raw_rarity: 'Illustration Rare', upstream_id: 'dedenne-093-088-illustration-rare' },
      { raw_rarity: 'Shiny Rare', upstream_id: 'dedenne-093-088-shiny-rare' },
    ],
  },
  {
    name: 'Clefairy',
    number_plain: '94',
    rows: [
      { raw_rarity: 'Illustration Rare', upstream_id: 'clefairy-094-088-illustration-rare' },
      { raw_rarity: 'Shiny Rare', upstream_id: 'clefairy-094-088-shiny-rare' },
    ],
  },
  {
    name: 'Espurr',
    number_plain: '95',
    rows: [
      { raw_rarity: 'Illustration Rare', upstream_id: 'espurr-095-088-illustration-rare' },
      { raw_rarity: 'Shiny Rare', upstream_id: 'espurr-095-088-shiny-rare' },
    ],
  },
];
