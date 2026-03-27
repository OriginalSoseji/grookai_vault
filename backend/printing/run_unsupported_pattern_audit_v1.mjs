import '../env.mjs';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requestJustTcgJson, unwrapJustTcgData } from '../pricing/justtcg_client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLASSIFICATION_REPORT_PATH = path.resolve(__dirname, 'output', 'version_finish_audit_report_v1.json');
const TRIAGE_REPORT_PATH = path.resolve(__dirname, 'output', 'blocked_case_triage_report_v1.json');
const JSON_OUTPUT_PATH = path.resolve(__dirname, 'output', 'unsupported_pattern_audit_report_v1.json');
const MARKDOWN_OUTPUT_PATH = path.resolve(__dirname, 'output', 'unsupported_pattern_audit_report_v1.md');

const CONTRACT_FILES = {
  VERSION_VS_FINISH: path.resolve(__dirname, '..', '..', 'docs', 'contracts', 'VERSION_VS_FINISH_CONTRACT_V1.md'),
  CHILD_PRINTING: path.resolve(__dirname, '..', '..', 'docs', 'contracts', 'CHILD_PRINTING_CONTRACT_V1.md'),
  PRINTING_MODEL_V2: path.resolve(__dirname, '..', '..', 'docs', 'contracts', 'PRINTING_MODEL_V2.md'),
  REFERENCE_BACKED_IDENTITY: path.resolve(
    __dirname,
    '..',
    '..',
    'docs',
    'contracts',
    'REFERENCE_BACKED_IDENTITY_CONTRACT_V1.md',
  ),
};

const CONTRACT_SNIPPETS = {
  VERSION_VS_FINISH: [
    'the distinction is within the bounded finish vocabulary',
    'If not representable within finish_keys:',
    '→ BLOCKED pending explicit rule or promotion',
    'Naming patterns are not authority.',
  ],
  CHILD_PRINTING: [
    'new finish categories must not be introduced implicitly through ingestion, mapping, or source payload interpretation',
    'does not prove that every distinction expressed through a finish-like label is permanently a child distinction',
    'External mappings do not decide whether a distinction is canonical or child.',
  ],
  PRINTING_MODEL_V2: [
    'If a canon-sensitive distinction cannot be expressed lawfully through the locked finish vocabulary, V2 does not create a child row for it.',
    'Locked values remain:',
    '- `pokeball`',
    '- `masterball`',
  ],
  REFERENCE_BACKED_IDENTITY: [
    'DO NOT define canonical naming',
    'DO NOT define identity relationships',
    'External sources may assist but never define.',
  ],
};

const CURRENT_PHASE_CONCLUSION = 'OPTION A — CORRECTLY BLOCKED AS UNSUPPORTED PATTERN';
const RECOMMENDED_NEXT_STEP = 'NO ACTION — REMAIN BLOCKED';
const CURRENT_LEGAL_STATUS = 'BLOCKED';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTextOrNull(value) {
  const normalized = normalizeText(value);
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

async function readJsonFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadContractSnippets() {
  const loaded = {};

  for (const [contractKey, filePath] of Object.entries(CONTRACT_FILES)) {
    const content = await readFile(filePath, 'utf8');
    const snippets = CONTRACT_SNIPPETS[contractKey];

    for (const snippet of snippets) {
      if (!content.includes(snippet)) {
        throw new Error(`[unsupported-pattern-audit] contract snippet missing in ${contractKey}: ${snippet}`);
      }
    }

    loaded[contractKey] = {
      filePath,
      snippets,
    };
  }

  return loaded;
}

function isolateEnergyPatternCases(classificationReport, triageReport) {
  const triageById = new Map(
    (triageReport?.blockedCases ?? [])
      .filter((entry) => normalizeText(entry?.upstreamName).toLowerCase().includes('energy symbol pattern'))
      .map((entry) => [entry.upstreamCardId, entry]),
  );

  const cases = (classificationReport?.blockedCases ?? [])
    .filter((entry) => normalizeText(entry?.upstreamName).toLowerCase().includes('energy symbol pattern'))
    .map((entry) => ({
      setCode: entry?.target?.grookaiSetCode ?? null,
      requestedNumber: entry?.target?.requestedNumber ?? null,
      justtcgSetId: entry?.target?.justtcgSetId ?? null,
      upstreamCardId: entry?.upstreamCardId ?? null,
      upstreamName: entry?.upstreamName ?? null,
      observedPrintings: entry?.observedPrintings ?? [],
      reasonCode: entry?.reasonCode ?? null,
      explanation: entry?.explanation ?? null,
      triageBucket: triageById.get(entry?.upstreamCardId)?.triageBucket ?? null,
      relevanceBucket: entry?.relevanceBucket ?? null,
      matchedSignals: entry?.matchedSignals ?? [],
    }));

  if (cases.length === 0) {
    throw new Error('[unsupported-pattern-audit] no Energy Symbol Pattern cases found in classification report');
  }

  return cases;
}

async function fetchFamilyForCase(targetCase) {
  const response = await requestJustTcgJson('GET', '/cards', {
    params: {
      game: 'pokemon',
      set: targetCase.justtcgSetId,
      number: targetCase.requestedNumber,
      limit: '10',
    },
  });

  if (!response.ok) {
    throw new Error(
      `[unsupported-pattern-audit] JustTCG recheck failed for ${targetCase.setCode} #${targetCase.requestedNumber}: ${response.error}`,
    );
  }

  const cards = unwrapJustTcgData(response.payload);
  return {
    setCode: targetCase.setCode,
    requestedNumber: targetCase.requestedNumber,
    justtcgSetId: targetCase.justtcgSetId,
    cards: cards.map((card) => ({
      upstreamCardId: normalizeTextOrNull(card?.id),
      upstreamName: normalizeTextOrNull(card?.name),
      observedPrintings: collectObservedPrintings(card),
      variantCount: Array.isArray(card?.variants) ? card.variants.length : 0,
    })),
  };
}

function evaluateCaseAgainstContracts(targetCase, family, contractSnippets) {
  const familyHasPremiumSibling = family.cards.some((card) => normalizeText(card.upstreamName).toLowerCase().includes('poke ball'));
  const familyHasBaseSibling = family.cards.some(
    (card) =>
      !normalizeText(card.upstreamName).toLowerCase().includes('pattern') &&
      !normalizeText(card.upstreamName).toLowerCase().includes('poke ball') &&
      !normalizeText(card.upstreamName).toLowerCase().includes('master ball'),
  );

  return {
    case: targetCase.upstreamName,
    contractFit: {
      VERSION_VS_FINISH: {
        governingRules: contractSnippets.VERSION_VS_FINISH.snippets,
        evaluation:
          'Current law forces BLOCKED because this distinction is expressed through an upstream naming pattern, is not representable within the locked finish vocabulary, and does not carry proof of a different issued version.',
      },
      CHILD_PRINTING: {
        governingRules: contractSnippets.CHILD_PRINTING.snippets,
        evaluation:
          'Current child-layer law does not permit implicit finish expansion from source labels. Even though the family also contains a lawful Poke Ball sibling, Energy Symbol Pattern is not itself a governed child finish.',
      },
      PRINTING_MODEL_V2: {
        governingRules: contractSnippets.PRINTING_MODEL_V2.snippets,
        evaluation:
          'V2 does not create child rows for distinctions outside the locked finish vocabulary. Energy Symbol Pattern therefore cannot materialize as a child row under current implementation law.',
      },
      REFERENCE_BACKED_IDENTITY: {
        governingRules: contractSnippets.REFERENCE_BACKED_IDENTITY.snippets,
        evaluation:
          'JustTCG card names and sibling structure are evidence only. They can support discovery, but they cannot define canonical identity or promote this label into child or row status on their own.',
      },
    },
    familySignals: {
      hasBaseSibling: familyHasBaseSibling,
      hasPremiumSibling: familyHasPremiumSibling,
      siblingCount: family.cards.length,
    },
    currentLegalStatus: CURRENT_LEGAL_STATUS,
    statusReason:
      'The family proves the label recurs as a sibling pattern alongside a base row and a lawful Poke Ball row, but current law still treats the Energy Symbol Pattern label as an unsupported external pattern outside finish_keys and without version proof.',
  };
}

function buildReport(cases, families, contractSnippets) {
  const familyByCaseKey = new Map(
    families.map((family) => [`${family.setCode}::${family.requestedNumber}`, family]),
  );

  const caseAudits = cases.map((targetCase) => {
    const family = familyByCaseKey.get(`${targetCase.setCode}::${targetCase.requestedNumber}`);
    if (!family) {
      throw new Error(
        `[unsupported-pattern-audit] missing family reconstruction for ${targetCase.setCode} #${targetCase.requestedNumber}`,
      );
    }

    return {
      ...targetCase,
      family,
      evaluation: evaluateCaseAgainstContracts(targetCase, family, contractSnippets),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceReports: {
      classification: CLASSIFICATION_REPORT_PATH,
      triage: TRIAGE_REPORT_PATH,
    },
    casesAudited: caseAudits.length,
    currentPhaseConclusion: CURRENT_PHASE_CONCLUSION,
    recommendedNextStep: RECOMMENDED_NEXT_STEP,
    summaryReason:
      'Current Grookai law already blocks Energy Symbol Pattern cleanly because it is an external naming-pattern distinction outside the locked finish vocabulary and lacks proof of a distinct issued version.',
    cases: caseAudits.map((entry) => ({
      setCode: entry.setCode,
      requestedNumber: entry.requestedNumber,
      upstreamCardId: entry.upstreamCardId,
      upstreamName: entry.upstreamName,
      observedPrintings: entry.observedPrintings,
      reasonCode: entry.reasonCode,
      triageBucket: entry.triageBucket,
      family: entry.family,
      contractFit: entry.evaluation.contractFit,
      currentLegalStatus: entry.evaluation.currentLegalStatus,
      statusReason: entry.evaluation.statusReason,
    })),
  };
}

function buildMarkdown(report) {
  const lines = [
    '# UNSUPPORTED PATTERN AUDIT REPORT V1',
    '',
    '## Cases Audited',
    `- Cases Audited: ${report.casesAudited}`,
    `- Current Phase Conclusion: ${report.currentPhaseConclusion}`,
    '',
    '## Family Reconstruction',
  ];

  for (const entry of report.cases) {
    lines.push(`- ${entry.setCode} #${entry.requestedNumber} | ${entry.upstreamName}`);
    for (const sibling of entry.family.cards) {
      lines.push(
        `  ${sibling.upstreamName} | ${sibling.upstreamCardId} | printings=${sibling.observedPrintings.join(', ') || 'none'}`,
      );
    }
  }

  lines.push('', '## Contract Fit');
  for (const entry of report.cases) {
    lines.push(`- CASE: ${entry.upstreamName}`);
    lines.push(`  VERSION_VS_FINISH: ${entry.contractFit.VERSION_VS_FINISH.evaluation}`);
    lines.push(`  CHILD_PRINTING: ${entry.contractFit.CHILD_PRINTING.evaluation}`);
    lines.push(`  PRINTING_MODEL_V2: ${entry.contractFit.PRINTING_MODEL_V2.evaluation}`);
    lines.push(`  REFERENCE_BACKED_IDENTITY: ${entry.contractFit.REFERENCE_BACKED_IDENTITY.evaluation}`);
  }

  lines.push('', '## Current Legal Status');
  for (const entry of report.cases) {
    lines.push(`- ${entry.upstreamName}: ${entry.currentLegalStatus}`);
    lines.push(`  Reason: ${entry.statusReason}`);
  }

  lines.push('', '## Recommended Next Step');
  lines.push(`- ${report.recommendedNextStep}`);
  lines.push(`- Reason: ${report.summaryReason}`);

  return `${lines.join('\n')}\n`;
}

async function writeOutputs(report, markdown) {
  await mkdir(path.dirname(JSON_OUTPUT_PATH), { recursive: true });
  await writeFile(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(MARKDOWN_OUTPUT_PATH, markdown, 'utf8');
}

function printConsoleSummary(report) {
  console.log('=== UNSUPPORTED PATTERN AUDIT SUMMARY ===');
  console.log(`Cases Audited: ${report.casesAudited}`);
  console.log(`Conclusion: ${report.recommendedNextStep}`);
  console.log('');
  console.log('Energy Symbol Pattern:');
  console.log(`- Current legal status: ${CURRENT_LEGAL_STATUS}`);
  console.log(`- Reason: ${report.summaryReason}`);
}

async function main() {
  const classificationReport = await readJsonFile(CLASSIFICATION_REPORT_PATH);
  const triageReport = await readJsonFile(TRIAGE_REPORT_PATH);
  const contractSnippets = await loadContractSnippets();
  const cases = isolateEnergyPatternCases(classificationReport, triageReport);

  console.log(`[unsupported-pattern-audit] isolated ${cases.length} Energy Symbol Pattern case(s).`);

  const families = [];
  for (const targetCase of cases) {
    families.push(await fetchFamilyForCase(targetCase));
  }

  const report = buildReport(cases, families, contractSnippets);
  const markdown = buildMarkdown(report);

  await writeOutputs(report, markdown);
  printConsoleSummary(report);
  console.log('');
  console.log(`Wrote JSON: ${JSON_OUTPUT_PATH}`);
  console.log(`Wrote Markdown: ${MARKDOWN_OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('[unsupported-pattern-audit] failed:', error?.message ?? error);
  process.exitCode = 1;
});
