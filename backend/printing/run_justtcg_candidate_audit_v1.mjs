import '../env.mjs';

import { requestJustTcgJson, unwrapJustTcgData } from '../pricing/justtcg_client.mjs';
import {
  VERSION_FINISH_DECISIONS,
  interpretVersionVsFinish,
} from './version_finish_interpreter_v1.mjs';

const TARGETS = [
  {
    grookaiSetCode: 'sv8pt5',
    requestedNumber: '1',
    justtcgSetId: 'sv-prismatic-evolutions-pokemon',
    label: 'Prismatic Evolutions #1',
  },
  {
    grookaiSetCode: 'me02.5',
    requestedNumber: '001',
    justtcgSetId: 'me-ascended-heroes-pokemon',
    label: 'Ascended Heroes #001',
  },
  {
    grookaiSetCode: 'sv02',
    requestedNumber: '1',
    justtcgSetId: 'sv02-paldea-evolved-pokemon',
    label: 'Paldea Evolved #1 (control)',
  },
];

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function uniqueSorted(values) {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function collectObservedPrintings(candidate) {
  const variants = Array.isArray(candidate?.variants) ? candidate.variants : [];
  return uniqueSorted(variants.map((variant) => normalizeTextOrNull(variant?.printing)).filter(Boolean));
}

function deriveHeuristicFromName(upstreamName) {
  const normalizedName = normalizeTextOrNull(upstreamName);
  const lowerName = normalizedName?.toLowerCase() ?? '';

  if (lowerName.includes('poke ball pattern') || lowerName.includes('poke ball')) {
    return {
      canonicalFinishCandidate: 'pokeball',
      isDifferentIssuedVersion: false,
      isFinishOnly: true,
      isRepresentableFinish: true,
    };
  }

  if (lowerName.includes('master ball pattern') || lowerName.includes('master ball')) {
    return {
      canonicalFinishCandidate: 'masterball',
      isDifferentIssuedVersion: false,
      isFinishOnly: true,
      isRepresentableFinish: true,
    };
  }

  if (
    lowerName.includes('1st edition') ||
    lowerName.includes('first edition') ||
    lowerName.includes('unlimited') ||
    lowerName.includes('staff') ||
    lowerName.includes('prerelease') ||
    lowerName.includes('league')
  ) {
    return {
      canonicalFinishCandidate: null,
      isDifferentIssuedVersion: true,
      isFinishOnly: false,
      isRepresentableFinish: false,
    };
  }

  if (lowerName.includes('energy symbol pattern')) {
    return {
      canonicalFinishCandidate: 'energy-symbol-pattern',
      isDifferentIssuedVersion: false,
      isFinishOnly: true,
      isRepresentableFinish: false,
    };
  }

  return {
    canonicalFinishCandidate: null,
    isDifferentIssuedVersion: null,
    isFinishOnly: null,
    isRepresentableFinish: null,
  };
}

function buildInterpretationInputFromJustTCGCandidate(candidate, context) {
  const upstreamName = normalizeTextOrNull(candidate?.name);
  const upstreamCardId = normalizeTextOrNull(candidate?.id);
  const observedPrintings = collectObservedPrintings(candidate);
  const heuristic = deriveHeuristicFromName(upstreamName);

  return {
    source: 'justtcg',
    setCode: normalizeTextOrNull(context?.grookaiSetCode),
    cardNumber: normalizeTextOrNull(context?.requestedNumber),
    canonicalFinishCandidate: heuristic.canonicalFinishCandidate,
    upstreamCardId,
    upstreamName,
    observedPrintings,
    isDifferentIssuedVersion: heuristic.isDifferentIssuedVersion,
    isFinishOnly: heuristic.isFinishOnly,
    isRepresentableFinish: heuristic.isRepresentableFinish,
  };
}

function printCandidateAudit(candidate, input, result) {
  console.log(`--- CANDIDATE ---`);
  console.log(`upstreamCardId: ${input.upstreamCardId ?? 'null'}`);
  console.log(`upstreamName: ${input.upstreamName ?? 'null'}`);
  console.log(`observedPrintings: ${input.observedPrintings?.join(', ') || 'none'}`);
  console.log(`heuristicFinishCandidate: ${input.canonicalFinishCandidate ?? 'null'}`);
  console.log(`decision: ${result.decision}`);
  console.log(`reasonCode: ${result.reasonCode}`);
  console.log(`resolvedFinishKey: ${result.resolvedFinishKey ?? 'null'}`);
  console.log(`needsPromotionReview: ${result.needsPromotionReview}`);
  console.log(`explanation: ${result.explanation}`);
  console.log(`variantCount: ${Array.isArray(candidate?.variants) ? candidate.variants.length : 0}`);
  console.log('');
}

function printTargetSummary(candidates, results) {
  const summary = {
    totalCandidates: candidates.length,
    rows: results.filter((result) => result.decision === VERSION_FINISH_DECISIONS.ROW).length,
    children: results.filter((result) => result.decision === VERSION_FINISH_DECISIONS.CHILD).length,
    blocked: results.filter((result) => result.decision === VERSION_FINISH_DECISIONS.BLOCKED).length,
  };

  console.log(`--- TARGET SUMMARY ---`);
  console.log(`totalCandidates: ${summary.totalCandidates}`);
  console.log(`rows: ${summary.rows}`);
  console.log(`children: ${summary.children}`);
  console.log(`blocked: ${summary.blocked}`);
  console.log('');
}

async function fetchCandidatesForTarget(target) {
  const response = await requestJustTcgJson('GET', '/cards', {
    params: {
      game: 'pokemon',
      set: target.justtcgSetId,
      number: target.requestedNumber,
      limit: '10',
    },
  });

  if (!response.ok) {
    throw new Error(
      `[justtcg-candidate-audit] request failed for ${target.grookaiSetCode} #${target.requestedNumber}: ${response.error}`,
    );
  }

  return unwrapJustTcgData(response.payload);
}

async function auditTarget(target) {
  console.log(`\n=== TARGET ===`);
  console.log(`label: ${target.label}`);
  console.log(`grookaiSetCode: ${target.grookaiSetCode}`);
  console.log(`requestedNumber: ${target.requestedNumber}`);
  console.log(`justtcgSetId: ${target.justtcgSetId}`);
  console.log('');

  const candidates = await fetchCandidatesForTarget(target);
  const results = [];

  for (const candidate of candidates) {
    const input = buildInterpretationInputFromJustTCGCandidate(candidate, target);
    const result = interpretVersionVsFinish(input);
    results.push(result);
    printCandidateAudit(candidate, input, result);
  }

  printTargetSummary(candidates, results);
}

async function main() {
  for (const target of TARGETS) {
    await auditTarget(target);
  }
}

await main();
