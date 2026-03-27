export const JUSTTCG_CANDIDATE_RELEVANCE_BUCKETS = Object.freeze({
  PREMIUM_LIKE: 'PREMIUM_LIKE',
  VERSION_LIKE: 'VERSION_LIKE',
  UNSUPPORTED_PATTERN: 'UNSUPPORTED_PATTERN',
  BASE_NOISE: 'BASE_NOISE',
});

const PREMIUM_SIGNALS = ['Poke Ball Pattern', 'Poke Ball', 'Master Ball Pattern', 'Master Ball'];
const VERSION_SIGNALS = ['1st Edition', 'First Edition', 'Unlimited', 'Staff', 'Prerelease', 'League'];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getCandidateName(candidate) {
  return normalizeText(candidate?.upstreamName ?? candidate?.name ?? null);
}

function getMatchedSignals(name, signals) {
  const lowerName = name.toLowerCase();
  return signals.filter((signal) => lowerName.includes(signal.toLowerCase()));
}

export function classifyJustTCGCandidateRelevance(candidate) {
  const upstreamName = getCandidateName(candidate);

  if (!upstreamName) {
    return {
      isRelevant: false,
      relevanceBucket: JUSTTCG_CANDIDATE_RELEVANCE_BUCKETS.BASE_NOISE,
      matchedSignals: [],
      explanation: 'Suppressed candidate because no distinguishing upstream name was available.',
    };
  }

  const premiumSignals = getMatchedSignals(upstreamName, PREMIUM_SIGNALS);
  if (premiumSignals.length > 0) {
    return {
      isRelevant: true,
      relevanceBucket: JUSTTCG_CANDIDATE_RELEVANCE_BUCKETS.PREMIUM_LIKE,
      matchedSignals: premiumSignals,
      explanation: `Kept candidate because upstream name matches premium-like signal(s): ${premiumSignals.join(', ')}.`,
    };
  }

  const versionSignals = getMatchedSignals(upstreamName, VERSION_SIGNALS);
  if (versionSignals.length > 0) {
    return {
      isRelevant: true,
      relevanceBucket: JUSTTCG_CANDIDATE_RELEVANCE_BUCKETS.VERSION_LIKE,
      matchedSignals: versionSignals,
      explanation: `Kept candidate because upstream name matches version-like signal(s): ${versionSignals.join(', ')}.`,
    };
  }

  if (upstreamName.toLowerCase().includes('pattern')) {
    return {
      isRelevant: true,
      relevanceBucket: JUSTTCG_CANDIDATE_RELEVANCE_BUCKETS.UNSUPPORTED_PATTERN,
      matchedSignals: ['Pattern'],
      explanation: 'Kept candidate because upstream name contains unsupported pattern-style wording.',
    };
  }

  return {
    isRelevant: false,
    relevanceBucket: JUSTTCG_CANDIDATE_RELEVANCE_BUCKETS.BASE_NOISE,
    matchedSignals: [],
    explanation: 'Suppressed candidate because it appears to be a plain base-card row with no bounded premium, version, or unsupported-pattern signal.',
  };
}

export function isRelevantJustTCGCandidate(candidate) {
  return classifyJustTCGCandidateRelevance(candidate).isRelevant;
}
