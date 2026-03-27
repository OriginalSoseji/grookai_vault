export const VERSION_FINISH_DECISIONS = Object.freeze({
  ROW: 'ROW',
  CHILD: 'CHILD',
  BLOCKED: 'BLOCKED',
});

export const VERSION_FINISH_REASON_CODES = Object.freeze({
  DIFFERENT_ISSUED_VERSION: 'DIFFERENT_ISSUED_VERSION',
  FINISH_ONLY_ALLOWED: 'FINISH_ONLY_ALLOWED',
  UNSUPPORTED_FINISH_VOCAB: 'UNSUPPORTED_FINISH_VOCAB',
  PATTERN_ONLY_UNPROVEN: 'PATTERN_ONLY_UNPROVEN',
  INSUFFICIENT_PROOF: 'INSUFFICIENT_PROOF',
});

const ALLOWED_FINISH_KEYS = new Set(['normal', 'holo', 'reverse', 'pokeball', 'masterball']);
const PATTERN_ONLY_TOKENS = ['pattern', 'symbol', 'suffix', 'variant', 'special', 'promo', 'ball'];

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeFinishKeyOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function hasPatternOnlySignal(input) {
  const upstreamName = normalizeTextOrNull(input?.upstreamName)?.toLowerCase() ?? '';
  if (!upstreamName) {
    return false;
  }

  if (upstreamName.includes('(') && upstreamName.includes(')')) {
    return true;
  }

  return PATTERN_ONLY_TOKENS.some((token) => upstreamName.includes(token));
}

function buildExplanation(decision, reasonCode, input, resolvedFinishKey) {
  const source = normalizeTextOrNull(input?.source) ?? 'unknown-source';
  const upstreamName = normalizeTextOrNull(input?.upstreamName) ?? 'unknown-candidate';
  const upstreamCardId = normalizeTextOrNull(input?.upstreamCardId) ?? 'unknown-upstream-id';
  const setCode = normalizeTextOrNull(input?.setCode) ?? 'unknown-set';
  const cardNumber = normalizeTextOrNull(input?.cardNumber) ?? 'unknown-number';

  if (reasonCode === VERSION_FINISH_REASON_CODES.DIFFERENT_ISSUED_VERSION) {
    return `Classified ${source} candidate ${upstreamCardId} (${upstreamName}) as ROW because it is marked as a different issued version for ${setCode} #${cardNumber}.`;
  }

  if (reasonCode === VERSION_FINISH_REASON_CODES.FINISH_ONLY_ALLOWED) {
    return `Classified ${source} candidate ${upstreamCardId} (${upstreamName}) as CHILD because it is finish-only and resolves to finish_key=${resolvedFinishKey}.`;
  }

  if (reasonCode === VERSION_FINISH_REASON_CODES.UNSUPPORTED_FINISH_VOCAB) {
    return `Blocked ${source} candidate ${upstreamCardId} (${upstreamName}) because the finish-only distinction is outside the bounded finish vocabulary.`;
  }

  if (reasonCode === VERSION_FINISH_REASON_CODES.PATTERN_ONLY_UNPROVEN) {
    return `Blocked ${source} candidate ${upstreamCardId} (${upstreamName}) because it is only pattern- or label-based evidence and is not proven as ROW or CHILD.`;
  }

  return `Blocked ${source} candidate ${upstreamCardId} (${upstreamName}) because available evidence is insufficient to classify ${setCode} #${cardNumber} as ROW or CHILD.`;
}

/**
 * @typedef {Object} InterpretationInput
 * @property {string | null | undefined} source
 * @property {string | null | undefined} setCode
 * @property {string | null | undefined} cardNumber
 * @property {string | null | undefined} canonicalFinishCandidate
 * @property {string | null | undefined} upstreamCardId
 * @property {string | null | undefined} upstreamName
 * @property {string[] | null | undefined} observedPrintings
 * @property {boolean | null | undefined} isDifferentIssuedVersion
 * @property {boolean | null | undefined} isFinishOnly
 * @property {boolean | null | undefined} isRepresentableFinish
 */

/**
 * @typedef {Object} InterpretationResult
 * @property {"ROW" | "CHILD" | "BLOCKED"} decision
 * @property {string} reasonCode
 * @property {string} explanation
 * @property {string | null} resolvedFinishKey
 * @property {boolean} needsPromotionReview
 */

/**
 * @param {InterpretationInput} input
 * @returns {InterpretationResult}
 */
export function interpretVersionVsFinish(input) {
  const normalizedFinishKey = normalizeFinishKeyOrNull(input?.canonicalFinishCandidate);

  if (input?.isDifferentIssuedVersion === true) {
    return {
      decision: VERSION_FINISH_DECISIONS.ROW,
      reasonCode: VERSION_FINISH_REASON_CODES.DIFFERENT_ISSUED_VERSION,
      explanation: buildExplanation(
        VERSION_FINISH_DECISIONS.ROW,
        VERSION_FINISH_REASON_CODES.DIFFERENT_ISSUED_VERSION,
        input,
        null,
      ),
      resolvedFinishKey: null,
      needsPromotionReview: false,
    };
  }

  if (input?.isFinishOnly === true) {
    if (normalizedFinishKey && ALLOWED_FINISH_KEYS.has(normalizedFinishKey)) {
      return {
        decision: VERSION_FINISH_DECISIONS.CHILD,
        reasonCode: VERSION_FINISH_REASON_CODES.FINISH_ONLY_ALLOWED,
        explanation: buildExplanation(
          VERSION_FINISH_DECISIONS.CHILD,
          VERSION_FINISH_REASON_CODES.FINISH_ONLY_ALLOWED,
          input,
          normalizedFinishKey,
        ),
        resolvedFinishKey: normalizedFinishKey,
        needsPromotionReview: false,
      };
    }

    return {
      decision: VERSION_FINISH_DECISIONS.BLOCKED,
      reasonCode: VERSION_FINISH_REASON_CODES.UNSUPPORTED_FINISH_VOCAB,
      explanation: buildExplanation(
        VERSION_FINISH_DECISIONS.BLOCKED,
        VERSION_FINISH_REASON_CODES.UNSUPPORTED_FINISH_VOCAB,
        input,
        null,
      ),
      resolvedFinishKey: null,
      needsPromotionReview: true,
    };
  }

  if (hasPatternOnlySignal(input)) {
    return {
      decision: VERSION_FINISH_DECISIONS.BLOCKED,
      reasonCode: VERSION_FINISH_REASON_CODES.PATTERN_ONLY_UNPROVEN,
      explanation: buildExplanation(
        VERSION_FINISH_DECISIONS.BLOCKED,
        VERSION_FINISH_REASON_CODES.PATTERN_ONLY_UNPROVEN,
        input,
        null,
      ),
      resolvedFinishKey: null,
      needsPromotionReview: true,
    };
  }

  return {
    decision: VERSION_FINISH_DECISIONS.BLOCKED,
    reasonCode: VERSION_FINISH_REASON_CODES.INSUFFICIENT_PROOF,
    explanation: buildExplanation(
      VERSION_FINISH_DECISIONS.BLOCKED,
      VERSION_FINISH_REASON_CODES.INSUFFICIENT_PROOF,
      input,
      null,
    ),
    resolvedFinishKey: null,
    needsPromotionReview: true,
  };
}
