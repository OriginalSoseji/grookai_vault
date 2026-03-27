import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BLOCKED_TRIAGE_BUCKETS = Object.freeze({
  BASE_NO_DISTINCTION_NOISE: 'BASE_NO_DISTINCTION_NOISE',
  UNSUPPORTED_PATTERN_VOCAB: 'UNSUPPORTED_PATTERN_VOCAB',
  PREMIUM_AUTHORITY_NEEDED: 'PREMIUM_AUTHORITY_NEEDED',
  POTENTIAL_VERSION_REVIEW: 'POTENTIAL_VERSION_REVIEW',
  UNCLASSIFIED_BLOCKED: 'UNCLASSIFIED_BLOCKED',
});

const SOURCE_REPORT_PATH = path.resolve(__dirname, 'output', 'version_finish_audit_report_v1.json');
const JSON_OUTPUT_PATH = path.resolve(__dirname, 'output', 'blocked_case_triage_report_v1.json');
const MARKDOWN_OUTPUT_PATH = path.resolve(__dirname, 'output', 'blocked_case_triage_report_v1.md');

const PREMIUM_TOKENS = ['poke ball pattern', 'poke ball', 'master ball pattern', 'master ball'];
const VERSION_TOKENS = ['1st edition', 'first edition', 'unlimited', 'staff', 'prerelease', 'league'];
const UNSUPPORTED_PATTERN_TOKENS = ['energy symbol pattern'];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function containsAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function looksLikePlainBaseCard(name) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return false;
  if (containsAny(normalizedName, PREMIUM_TOKENS)) return false;
  if (containsAny(normalizedName, VERSION_TOKENS)) return false;
  if (normalizedName.includes('pattern')) return false;
  return true;
}

function classifyBlockedCase(candidate) {
  const normalizedName = normalizeText(candidate?.upstreamName);
  const reasonCode = candidate?.reasonCode ?? null;

  if (reasonCode === 'INSUFFICIENT_PROOF' && looksLikePlainBaseCard(normalizedName)) {
    return BLOCKED_TRIAGE_BUCKETS.BASE_NO_DISTINCTION_NOISE;
  }

  if (
    containsAny(normalizedName, UNSUPPORTED_PATTERN_TOKENS) ||
    (normalizedName.includes('pattern') && !containsAny(normalizedName, PREMIUM_TOKENS))
  ) {
    return BLOCKED_TRIAGE_BUCKETS.UNSUPPORTED_PATTERN_VOCAB;
  }

  if (containsAny(normalizedName, PREMIUM_TOKENS)) {
    return BLOCKED_TRIAGE_BUCKETS.PREMIUM_AUTHORITY_NEEDED;
  }

  if (containsAny(normalizedName, VERSION_TOKENS)) {
    return BLOCKED_TRIAGE_BUCKETS.POTENTIAL_VERSION_REVIEW;
  }

  return BLOCKED_TRIAGE_BUCKETS.UNCLASSIFIED_BLOCKED;
}

function detectLabelFamily(candidate) {
  const normalizedName = normalizeText(candidate?.upstreamName);

  if (containsAny(normalizedName, UNSUPPORTED_PATTERN_TOKENS)) {
    return 'ENERGY_SYMBOL_PATTERN';
  }

  if (normalizedName.includes('pattern')) {
    return 'GENERIC_PATTERN';
  }

  if (containsAny(normalizedName, VERSION_TOKENS)) {
    return 'VERSION_LIKE_LABEL';
  }

  if (looksLikePlainBaseCard(normalizedName)) {
    return 'PLAIN_BASE_NAME';
  }

  if (containsAny(normalizedName, PREMIUM_TOKENS)) {
    return 'PREMIUM_LIKE_LABEL';
  }

  return 'OTHER_BLOCKED_LABEL';
}

function createBucketCounts() {
  return {
    [BLOCKED_TRIAGE_BUCKETS.BASE_NO_DISTINCTION_NOISE]: 0,
    [BLOCKED_TRIAGE_BUCKETS.UNSUPPORTED_PATTERN_VOCAB]: 0,
    [BLOCKED_TRIAGE_BUCKETS.PREMIUM_AUTHORITY_NEEDED]: 0,
    [BLOCKED_TRIAGE_BUCKETS.POTENTIAL_VERSION_REVIEW]: 0,
    [BLOCKED_TRIAGE_BUCKETS.UNCLASSIFIED_BLOCKED]: 0,
  };
}

function createReport(sourceReportPath) {
  return {
    generatedAt: new Date().toISOString(),
    sourceReportPath,
    totals: {
      totalBlocked: 0,
      baseNoise: 0,
      unsupportedPattern: 0,
      premiumAuthorityNeeded: 0,
      potentialVersionReview: 0,
      unclassified: 0,
    },
    bySet: {},
    repeatedLabelFamilies: [],
    recommendedNextQueues: {
      ignore: [],
      unsupportedPatternReview: [],
      premiumAuthorityQueue: [],
      versionReviewQueue: [],
    },
    blockedCases: [],
  };
}

function ensureSetSummary(report, setCode) {
  if (!report.bySet[setCode]) {
    report.bySet[setCode] = {
      totalBlocked: 0,
      buckets: createBucketCounts(),
    };
  }
  return report.bySet[setCode];
}

function buildQueueEntry(candidate, triageBucket) {
  return {
    setCode: candidate?.target?.grookaiSetCode ?? null,
    requestedNumber: candidate?.target?.requestedNumber ?? null,
    upstreamCardId: candidate?.upstreamCardId ?? null,
    upstreamName: candidate?.upstreamName ?? null,
    reasonCode: candidate?.reasonCode ?? null,
    explanation: candidate?.explanation ?? null,
    triageBucket,
  };
}

function addBlockedCase(report, familyCounts, candidate) {
  const triageBucket = classifyBlockedCase(candidate);
  const setCode = candidate?.target?.grookaiSetCode ?? 'unknown';
  const family = detectLabelFamily(candidate);
  const caseEntry = buildQueueEntry(candidate, triageBucket);

  report.totals.totalBlocked += 1;
  const setSummary = ensureSetSummary(report, setCode);
  setSummary.totalBlocked += 1;
  setSummary.buckets[triageBucket] += 1;
  report.blockedCases.push(caseEntry);

  if (!familyCounts.has(family)) {
    familyCounts.set(family, {
      family,
      count: 0,
      sampleNames: new Set(),
    });
  }
  const familyEntry = familyCounts.get(family);
  familyEntry.count += 1;
  if (caseEntry.upstreamName) {
    familyEntry.sampleNames.add(caseEntry.upstreamName);
  }

  switch (triageBucket) {
    case BLOCKED_TRIAGE_BUCKETS.BASE_NO_DISTINCTION_NOISE:
      report.totals.baseNoise += 1;
      report.recommendedNextQueues.ignore.push(caseEntry);
      break;
    case BLOCKED_TRIAGE_BUCKETS.UNSUPPORTED_PATTERN_VOCAB:
      report.totals.unsupportedPattern += 1;
      report.recommendedNextQueues.unsupportedPatternReview.push(caseEntry);
      break;
    case BLOCKED_TRIAGE_BUCKETS.PREMIUM_AUTHORITY_NEEDED:
      report.totals.premiumAuthorityNeeded += 1;
      report.recommendedNextQueues.premiumAuthorityQueue.push(caseEntry);
      break;
    case BLOCKED_TRIAGE_BUCKETS.POTENTIAL_VERSION_REVIEW:
      report.totals.potentialVersionReview += 1;
      report.recommendedNextQueues.versionReviewQueue.push(caseEntry);
      break;
    default:
      report.totals.unclassified += 1;
      break;
  }
}

function finalizeRepeatedLabelFamilies(report, familyCounts) {
  report.repeatedLabelFamilies = Array.from(familyCounts.values())
    .map((entry) => ({
      family: entry.family,
      count: entry.count,
      sampleNames: Array.from(entry.sampleNames).sort(),
    }))
    .sort((left, right) => right.count - left.count || left.family.localeCompare(right.family));
}

function buildRecommendation(totals) {
  const counts = [
    { key: 'baseNoise', value: totals.baseNoise, message: 'NEXT: tighten candidate filter' },
    {
      key: 'unsupportedPattern',
      value: totals.unsupportedPattern,
      message: 'NEXT: unsupported-pattern contract/rulebook review',
    },
    {
      key: 'premiumAuthorityNeeded',
      value: totals.premiumAuthorityNeeded,
      message: 'NEXT: premium authority artifact',
    },
    {
      key: 'potentialVersionReview',
      value: totals.potentialVersionReview,
      message: 'NEXT: split premium authority and unsupported-pattern review',
    },
  ].sort((left, right) => right.value - left.value);

  if (counts[0].value === 0) {
    return 'NEXT: no blocked backlog';
  }

  if (counts.length > 1 && counts[0].value === counts[1].value) {
    return 'NEXT: split premium authority and unsupported-pattern review';
  }

  return counts[0].message;
}

function formatQueueEntries(entries) {
  if (!entries.length) {
    return ['- None'];
  }

  return entries.map(
    (entry) =>
      `- ${entry.setCode} #${entry.requestedNumber} | ${entry.upstreamName} | ${entry.reasonCode} | ${entry.triageBucket}`,
  );
}

function buildMarkdownReport(report, recommendation) {
  const lines = [
    '# BLOCKED CASE TRIAGE REPORT V1',
    '',
    '## Summary',
    `- Total Blocked: ${report.totals.totalBlocked}`,
    `- BASE_NO_DISTINCTION_NOISE: ${report.totals.baseNoise}`,
    `- UNSUPPORTED_PATTERN_VOCAB: ${report.totals.unsupportedPattern}`,
    `- PREMIUM_AUTHORITY_NEEDED: ${report.totals.premiumAuthorityNeeded}`,
    `- POTENTIAL_VERSION_REVIEW: ${report.totals.potentialVersionReview}`,
    `- UNCLASSIFIED_BLOCKED: ${report.totals.unclassified}`,
    `- Recommendation: ${recommendation}`,
    '',
    '## By Set',
  ];

  const setCodes = Object.keys(report.bySet).sort();
  if (!setCodes.length) {
    lines.push('- None');
  } else {
    for (const setCode of setCodes) {
      const summary = report.bySet[setCode];
      lines.push(
        `- ${setCode}: total=${summary.totalBlocked}, baseNoise=${summary.buckets.BASE_NO_DISTINCTION_NOISE}, unsupportedPattern=${summary.buckets.UNSUPPORTED_PATTERN_VOCAB}, premiumAuthorityNeeded=${summary.buckets.PREMIUM_AUTHORITY_NEEDED}, potentialVersionReview=${summary.buckets.POTENTIAL_VERSION_REVIEW}, unclassified=${summary.buckets.UNCLASSIFIED_BLOCKED}`,
      );
    }
  }

  lines.push('', '## Repeated Label Families');
  if (!report.repeatedLabelFamilies.length) {
    lines.push('- None');
  } else {
    for (const family of report.repeatedLabelFamilies) {
      lines.push(`- ${family.family}: ${family.count} (${family.sampleNames.join('; ')})`);
    }
  }

  lines.push('', '## Ignore Queue');
  lines.push(...formatQueueEntries(report.recommendedNextQueues.ignore));

  lines.push('', '## Unsupported Pattern Review Queue');
  lines.push(...formatQueueEntries(report.recommendedNextQueues.unsupportedPatternReview));

  lines.push('', '## Premium Authority Queue');
  lines.push(...formatQueueEntries(report.recommendedNextQueues.premiumAuthorityQueue));

  lines.push('', '## Potential Version Review Queue');
  lines.push(...formatQueueEntries(report.recommendedNextQueues.versionReviewQueue));

  lines.push('', '## Unclassified');
  lines.push(
    ...formatQueueEntries(
      report.blockedCases.filter(
        (entry) => entry.triageBucket === BLOCKED_TRIAGE_BUCKETS.UNCLASSIFIED_BLOCKED,
      ),
    ),
  );

  return `${lines.join('\n')}\n`;
}

async function readSourceReport(sourceReportPath) {
  const raw = await readFile(sourceReportPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed?.blockedCases)) {
    throw new Error('Blocked case triage requires source report blockedCases[]');
  }

  return parsed;
}

async function writeOutputs(report, markdown) {
  await mkdir(path.dirname(JSON_OUTPUT_PATH), { recursive: true });
  await writeFile(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(MARKDOWN_OUTPUT_PATH, markdown, 'utf8');
}

function printConsoleSummary(report, recommendation) {
  console.log('=== BLOCKED TRIAGE SUMMARY ===');
  console.log(`Total Blocked: ${report.totals.totalBlocked}`);
  console.log('');
  console.log(`BASE_NO_DISTINCTION_NOISE: ${report.totals.baseNoise}`);
  console.log(`UNSUPPORTED_PATTERN_VOCAB: ${report.totals.unsupportedPattern}`);
  console.log(`PREMIUM_AUTHORITY_NEEDED: ${report.totals.premiumAuthorityNeeded}`);
  console.log(`POTENTIAL_VERSION_REVIEW: ${report.totals.potentialVersionReview}`);
  console.log(`UNCLASSIFIED_BLOCKED: ${report.totals.unclassified}`);
  console.log('');
  console.log(recommendation);
}

async function main() {
  const sourceReport = await readSourceReport(SOURCE_REPORT_PATH);
  const report = createReport(SOURCE_REPORT_PATH);
  const familyCounts = new Map();

  for (const candidate of sourceReport.blockedCases) {
    addBlockedCase(report, familyCounts, candidate);
  }

  finalizeRepeatedLabelFamilies(report, familyCounts);
  const recommendation = buildRecommendation(report.totals);
  const markdown = buildMarkdownReport(report, recommendation);

  await writeOutputs(report, markdown);
  printConsoleSummary(report, recommendation);

  console.log('');
  console.log(`Wrote JSON: ${JSON_OUTPUT_PATH}`);
  console.log(`Wrote Markdown: ${MARKDOWN_OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('[printing][blocked-triage] failed:', error?.message ?? error);
  process.exitCode = 1;
});
