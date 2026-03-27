import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import '../env.mjs';

import { requestJustTcgJson, unwrapJustTcgData } from '../pricing/justtcg_client.mjs';
import {
  VERSION_FINISH_DECISIONS,
  interpretVersionVsFinish,
} from './version_finish_interpreter_v1.mjs';

const TARGETS = [
  {
    grookaiSetCode: 'sv8pt5',
    justtcgSetId: 'sv-prismatic-evolutions-pokemon',
    numbers: ['1', '2', '3', '10'],
  },
  {
    grookaiSetCode: 'me02.5',
    justtcgSetId: 'me-ascended-heroes-pokemon',
    numbers: ['001', '002', '010'],
  },
  {
    grookaiSetCode: 'sv02',
    justtcgSetId: 'sv02-paldea-evolved-pokemon',
    numbers: ['1'],
  },
];

const MAX_REQUESTS_PER_RUN = TARGETS.reduce((total, target) => total + target.numbers.length, 0);
const CARD_FETCH_LIMIT = '10';
const REPORT_FILE_NAME = 'version_finish_audit_report_v1.json';

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

async function fetchCandidatesForTarget(target, requestedNumber) {
  const response = await requestJustTcgJson('GET', '/cards', {
    params: {
      game: 'pokemon',
      set: target.justtcgSetId,
      number: requestedNumber,
      limit: CARD_FETCH_LIMIT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `[candidate-classification-pass] request failed for ${target.grookaiSetCode} #${requestedNumber}: ${response.error}`,
    );
  }

  return unwrapJustTcgData(response.payload);
}

function createEmptyReport() {
  return {
    generatedAt: new Date().toISOString(),
    requestCount: 0,
    requestLimit: MAX_REQUESTS_PER_RUN,
    targets: [],
    totals: {
      totalCandidates: 0,
      rowCount: 0,
      childCount: 0,
      blockedCount: 0,
    },
    bySet: {},
    blockedCases: [],
    childCandidates: [],
    rowCandidates: [],
  };
}

function ensureSetSummary(report, setCode) {
  if (!report.bySet[setCode]) {
    report.bySet[setCode] = {
      total: 0,
      row: 0,
      child: 0,
      blocked: 0,
    };
  }

  return report.bySet[setCode];
}

function addCandidateResult(report, targetContext, candidate, input, result) {
  const setSummary = ensureSetSummary(report, targetContext.grookaiSetCode);
  const row = {
    target: {
      grookaiSetCode: targetContext.grookaiSetCode,
      requestedNumber: targetContext.requestedNumber,
      justtcgSetId: targetContext.justtcgSetId,
    },
    upstreamCardId: input.upstreamCardId,
    upstreamName: input.upstreamName,
    observedPrintings: input.observedPrintings ?? [],
    heuristicFinishCandidate: input.canonicalFinishCandidate,
    decision: result.decision,
    reasonCode: result.reasonCode,
    resolvedFinishKey: result.resolvedFinishKey,
    needsPromotionReview: result.needsPromotionReview,
    explanation: result.explanation,
    variantCount: Array.isArray(candidate?.variants) ? candidate.variants.length : 0,
  };

  report.totals.totalCandidates += 1;
  setSummary.total += 1;

  if (result.decision === VERSION_FINISH_DECISIONS.ROW) {
    report.totals.rowCount += 1;
    setSummary.row += 1;
    report.rowCandidates.push(row);
    return row;
  }

  if (result.decision === VERSION_FINISH_DECISIONS.CHILD) {
    report.totals.childCount += 1;
    setSummary.child += 1;
    report.childCandidates.push(row);
    return row;
  }

  report.totals.blockedCount += 1;
  setSummary.blocked += 1;
  report.blockedCases.push(row);
  return row;
}

function printSummary(report) {
  console.log('\n=== SUMMARY ===');
  console.log(`Total Candidates: ${report.totals.totalCandidates}`);
  console.log(`ROW: ${report.totals.rowCount}`);
  console.log(`CHILD: ${report.totals.childCount}`);
  console.log(`BLOCKED: ${report.totals.blockedCount}`);

  console.log('\n=== BY SET ===');
  for (const setCode of Object.keys(report.bySet).sort((left, right) => left.localeCompare(right))) {
    const summary = report.bySet[setCode];
    console.log(`${setCode} -> ROW ${summary.row} | CHILD ${summary.child} | BLOCKED ${summary.blocked}`);
  }

  console.log('\n=== BLOCKED CASES ===');
  if (report.blockedCases.length === 0) {
    console.log('(none)');
  } else {
    for (const row of report.blockedCases) {
      console.log(`- ${row.upstreamName ?? 'null'}`);
      console.log(`  reasonCode: ${row.reasonCode}`);
      console.log(`  explanation: ${row.explanation}`);
    }
  }

  console.log('\n=== CHILD CANDIDATES ===');
  if (report.childCandidates.length === 0) {
    console.log('(none)');
  } else {
    for (const row of report.childCandidates) {
      console.log(`- ${row.upstreamName ?? 'null'} | finishKey: ${row.resolvedFinishKey ?? 'null'}`);
    }
  }

  console.log('\n=== ROW CANDIDATES ===');
  if (report.rowCandidates.length === 0) {
    console.log('(none)');
  } else {
    for (const row of report.rowCandidates) {
      console.log(`- ${row.upstreamName ?? 'null'}`);
    }
  }
}

async function writeReportFile(report) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  const outputDir = path.join(currentDir, 'output');
  const outputPath = path.join(outputDir, REPORT_FILE_NAME);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return outputPath;
}

async function main() {
  const report = createEmptyReport();

  if (MAX_REQUESTS_PER_RUN > 20) {
    throw new Error('[candidate-classification-pass] request plan exceeds bounded limit.');
  }

  for (const target of TARGETS) {
    for (const requestedNumber of target.numbers) {
      report.requestCount += 1;

      const targetContext = {
        grookaiSetCode: target.grookaiSetCode,
        justtcgSetId: target.justtcgSetId,
        requestedNumber,
      };

      const candidates = await fetchCandidatesForTarget(target, requestedNumber);
      const targetRecord = {
        ...targetContext,
        candidates: [],
      };

      for (const candidate of candidates) {
        const input = buildInterpretationInputFromJustTCGCandidate(candidate, targetContext);
        const result = interpretVersionVsFinish(input);
        const row = addCandidateResult(report, targetContext, candidate, input, result);
        targetRecord.candidates.push(row);
      }

      report.targets.push(targetRecord);
    }
  }

  printSummary(report);
  const outputPath = await writeReportFile(report);
  console.log(`\nReport written: ${outputPath}`);
}

await main();
