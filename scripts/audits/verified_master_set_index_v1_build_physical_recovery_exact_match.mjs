import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const GENERATED_FILES = [
  'english_master_index_physical_recovery_exact_match_v1.json',
  'english_master_index_physical_recovery_exact_match_v1.md',
  'english_master_index_physical_recovery_finish_gap_v1.json',
  'english_master_index_physical_recovery_finish_gap_v1.md',
];

function addCount(target, key, count = 1) {
  const normalized = String(key ?? '').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 50) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), data);
}

function sourceNumberFromLead(lead) {
  const alias = String(lead?.source_set_alias ?? '').trim();
  const externalId = String(lead?.external_id ?? '').trim();
  if (!alias || !externalId) return null;
  const prefix = `${alias}-`;
  if (!externalId.toLowerCase().startsWith(prefix.toLowerCase())) return null;
  return externalId.slice(prefix.length) || null;
}

function cardKey(setKey, cardNumber, cardName) {
  return [
    normalizeText(setKey),
    normalizeNumber(cardNumber),
    normalizeText(cardName),
  ].join('|');
}

function setNumberKey(setKey, cardNumber) {
  return [
    normalizeText(setKey),
    normalizeNumber(cardNumber),
  ].join('|');
}

function printingKey(setKey, cardNumber, cardName, finishKey) {
  return `${cardKey(setKey, cardNumber, cardName)}|${normalizeFinishKey(finishKey) ?? ''}`;
}

function buildIndexLookups(cardsArtifact, printingsArtifact) {
  const cardsByExact = new Map();
  const cardsBySetNumber = new Map();
  const printingsByExact = new Map();

  for (const card of cardsArtifact.cards ?? []) {
    const exactKey = cardKey(card.set_key, card.card_number, card.card_name);
    cardsByExact.set(exactKey, card);
    const numberKey = setNumberKey(card.set_key, card.card_number);
    if (!cardsBySetNumber.has(numberKey)) cardsBySetNumber.set(numberKey, []);
    cardsBySetNumber.get(numberKey).push(card);
  }

  for (const printing of printingsArtifact.printings ?? []) {
    printingsByExact.set(printingKey(printing.set_key, printing.card_number, printing.card_name, printing.finish_key), printing);
  }

  return { cardsByExact, cardsBySetNumber, printingsByExact };
}

function finishKeysFromProfile(profile) {
  return uniqueSorted(String(profile ?? '')
    .split('|')
    .map((value) => normalizeFinishKey(value))
    .filter(Boolean));
}

function classifyCardMatch({ setKey, candidate, sourceNumber, lookups }) {
  if (!sourceNumber) {
    return {
      card_match_status: 'no_source_card_number',
      index_card: null,
      number_candidates: [],
    };
  }
  const exact = lookups.cardsByExact.get(cardKey(setKey, sourceNumber, candidate.card_name));
  if (exact) {
    return {
      card_match_status: 'exact_card_identity_match',
      index_card: exact,
      number_candidates: [exact],
    };
  }
  const numberCandidates = lookups.cardsBySetNumber.get(setNumberKey(setKey, sourceNumber)) ?? [];
  if (numberCandidates.length) {
    return {
      card_match_status: 'number_match_name_mismatch',
      index_card: null,
      number_candidates: numberCandidates,
    };
  }
  return {
    card_match_status: 'number_missing_from_index',
    index_card: null,
    number_candidates: [],
  };
}

function classifyFinishMatch({ setKey, candidate, sourceNumber, cardMatch, lookups }) {
  const candidateFinishes = finishKeysFromProfile(candidate.finish_profile);
  if (cardMatch.card_match_status !== 'exact_card_identity_match') {
    return {
      finish_match_status: 'blocked_until_card_identity_match',
      candidate_finishes: candidateFinishes,
      supported_finishes: [],
      unsupported_finishes: candidateFinishes,
      supported_printings: [],
    };
  }

  const supportedPrintings = [];
  const unsupportedFinishes = [];
  for (const finishKey of candidateFinishes) {
    const printing = lookups.printingsByExact.get(printingKey(setKey, sourceNumber, candidate.card_name, finishKey));
    if (printing) {
      supportedPrintings.push(printing);
    } else {
      unsupportedFinishes.push(finishKey);
    }
  }
  const supportedFinishes = uniqueSorted(supportedPrintings.map((printing) => printing.finish_key));
  const statuses = uniqueSorted(supportedPrintings.map((printing) => printing.status));

  if (!candidateFinishes.length) {
    return {
      finish_match_status: 'no_candidate_finish_profile',
      candidate_finishes: [],
      supported_finishes: [],
      unsupported_finishes: [],
      supported_printings: [],
    };
  }
  if (!supportedPrintings.length) {
    return {
      finish_match_status: 'no_finishes_supported_by_index',
      candidate_finishes: candidateFinishes,
      supported_finishes: [],
      unsupported_finishes: unsupportedFinishes,
      supported_printings: [],
    };
  }
  if (unsupportedFinishes.length) {
    return {
      finish_match_status: 'partial_finishes_supported_by_index',
      candidate_finishes: candidateFinishes,
      supported_finishes: supportedFinishes,
      unsupported_finishes: unsupportedFinishes,
      supported_printings: supportedPrintings,
    };
  }
  if (statuses.every((status) => status === 'master_verified')) {
    return {
      finish_match_status: 'all_finishes_master_verified_by_index',
      candidate_finishes: candidateFinishes,
      supported_finishes: supportedFinishes,
      unsupported_finishes: [],
      supported_printings: supportedPrintings,
    };
  }
  return {
    finish_match_status: 'all_finishes_supported_but_not_master_verified',
    candidate_finishes: candidateFinishes,
    supported_finishes: supportedFinishes,
    unsupported_finishes: [],
    supported_printings: supportedPrintings,
  };
}

function choosePrimaryLead(candidate, setKey) {
  return (candidate.mapping_leads ?? []).find((lead) => (
    lead.matched_master_index_set?.internal_set_key === setKey
  )) ?? candidate.mapping_leads?.[0] ?? null;
}

function buildRows({ setQueue, cardsArtifact, printingsArtifact }) {
  const lookups = buildIndexLookups(cardsArtifact, printingsArtifact);
  const rows = [];

  for (const set of setQueue.sets ?? []) {
    for (const candidate of set.card_prints ?? []) {
      const lead = choosePrimaryLead(candidate, set.set_key);
      const sourceNumber = sourceNumberFromLead(lead);
      const cardMatch = classifyCardMatch({
        setKey: set.set_key,
        candidate,
        sourceNumber,
        lookups,
      });
      const finishMatch = classifyFinishMatch({
        setKey: set.set_key,
        candidate,
        sourceNumber,
        cardMatch,
        lookups,
      });
      const supportedStatuses = uniqueSorted(finishMatch.supported_printings.map((printing) => printing.status));
      const supportedSources = uniqueSorted(finishMatch.supported_printings.flatMap((printing) => printing.sources ?? []));
      const supportedSourceKinds = uniqueSorted(finishMatch.supported_printings.flatMap((printing) => printing.source_kinds ?? []));

      rows.push({
        set_key: set.set_key,
        set_name: set.set_name,
        era_lane: set.era_lane,
        card_print_id: candidate.card_print_id,
        grookai_card_name: candidate.card_name,
        source_set_alias: lead?.source_set_alias ?? null,
        source_external_id: lead?.external_id ?? null,
        source_card_number: sourceNumber,
        source_card_url: lead?.source_card_url ?? null,
        card_match_status: cardMatch.card_match_status,
        index_card_name: cardMatch.index_card?.card_name ?? null,
        index_card_status: cardMatch.index_card?.status ?? null,
        number_candidate_names: uniqueSorted(cardMatch.number_candidates.map((card) => card.card_name)),
        candidate_finish_profile: candidate.finish_profile,
        candidate_finishes: finishMatch.candidate_finishes,
        finish_match_status: finishMatch.finish_match_status,
        supported_finishes: finishMatch.supported_finishes,
        unsupported_finishes: finishMatch.unsupported_finishes,
        supported_index_statuses: supportedStatuses,
        supported_sources: supportedSources,
        supported_source_kinds: supportedSourceKinds,
        printing_count: candidate.printing_count,
        mutation_authority: 'not mutation authority',
        next_action: nextAction(cardMatch.card_match_status, finishMatch.finish_match_status),
      });
    }
  }

  return rows.sort((left, right) => (
    left.set_key.localeCompare(right.set_key)
    || String(left.source_card_number).localeCompare(String(right.source_card_number), undefined, { numeric: true })
    || left.grookai_card_name.localeCompare(right.grookai_card_name)
  ));
}

function nextAction(cardStatus, finishStatus) {
  if (cardStatus === 'exact_card_identity_match' && finishStatus === 'all_finishes_master_verified_by_index') {
    return 'Eligible for future proof-loop review only after rollback planning; this report still does not authorize mutation.';
  }
  if (cardStatus === 'exact_card_identity_match' && finishStatus === 'all_finishes_supported_but_not_master_verified') {
    return 'Acquire human-readable/checklist finish evidence before any future recovery.';
  }
  if (cardStatus === 'exact_card_identity_match' && finishStatus === 'partial_finishes_supported_by_index') {
    return 'Investigate unsupported finishes and acquire exact finish evidence. Do not recover unsupported finish rows.';
  }
  if (cardStatus === 'number_match_name_mismatch') {
    return 'Resolve name mismatch against source card evidence before any recovery.';
  }
  if (cardStatus === 'number_missing_from_index') {
    return 'Treat as index gap or bad provenance lead; verify source card and set before any recovery.';
  }
  return 'Manual source review required before this row can enter a proof loop.';
}

function summarize(rows) {
  const bySet = {};
  const byCardStatus = {};
  const byFinishStatus = {};
  const byCombinedStatus = {};
  const byEra = {};
  const printingRowsByFinishStatus = {};
  for (const row of rows) {
    addCount(bySet, row.set_key);
    addCount(byCardStatus, row.card_match_status);
    addCount(byFinishStatus, row.finish_match_status);
    addCount(byCombinedStatus, `${row.card_match_status} / ${row.finish_match_status}`);
    addCount(byEra, row.era_lane);
    addCount(printingRowsByFinishStatus, row.finish_match_status, row.printing_count);
  }
  return {
    candidate_card_prints: rows.length,
    candidate_printing_rows: rows.reduce((total, row) => total + Number(row.printing_count ?? 0), 0),
    by_set: bySet,
    by_card_match_status: byCardStatus,
    by_finish_match_status: byFinishStatus,
    by_combined_status: byCombinedStatus,
    by_era_lane: byEra,
    printing_rows_by_finish_status: printingRowsByFinishStatus,
  };
}

function buildArtifacts(rows) {
  const summary = summarize(rows);
  const finishGaps = rows.filter((row) => row.unsupported_finishes.length || row.finish_match_status !== 'all_finishes_master_verified_by_index');
  return {
    exactMatch: {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_physical_recovery_exact_match_v1',
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      rule: 'This report checks feasibility only. Source/card matches and API-supported finishes are not mutation authority.',
      summary,
      guardrails: [
        'exact card identity match is not DB recovery authority',
        'API-supported finish is not master truth without human-readable/checklist evidence',
        'unsupported finish rows must not be recovered',
        'no DB writes, migrations, cleanup, quarantine, or apply paths are allowed',
      ],
      rows,
    },
    finishGap: {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_physical_recovery_finish_gap_v1',
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      summary: summarize(finishGaps),
      rows: finishGaps,
    },
  };
}

function buildExactMatchMarkdown(artifact) {
  const cardRows = topEntries(artifact.summary.by_card_match_status, 20).map(([status, count]) => [status, count]);
  const finishRows = topEntries(artifact.summary.by_finish_match_status, 20).map(([status, count]) => [status, count]);
  const setRows = topEntries(artifact.summary.by_set, 30).map(([setKey, count]) => [setKey, count]);
  const sampleRows = artifact.rows.slice(0, 80).map((row) => [
    row.set_key,
    row.source_external_id,
    row.grookai_card_name,
    row.card_match_status,
    row.finish_match_status,
    row.candidate_finish_profile,
    row.supported_finishes.join(', '),
    row.unsupported_finishes.join(', '),
  ]);

  return `# English Master Index Physical Recovery Exact Match V1

This is an audit-only feasibility check for physical TCG \`missing_set_code\` recovery candidates. It does not assign set identity and does not authorize mutation.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}

## Summary

- candidate_card_prints: ${artifact.summary.candidate_card_prints}
- candidate_printing_rows: ${artifact.summary.candidate_printing_rows}

## Card Match Status

${markdownTable(['status', 'card prints'], cardRows)}

## Finish Match Status

${markdownTable(['status', 'card prints'], finishRows)}

## Top Sets

${markdownTable(['set_key', 'card prints'], setRows)}

## Sample Rows

${markdownTable(['set', 'external_id', 'card', 'card_status', 'finish_status', 'candidate_finishes', 'supported', 'unsupported'], sampleRows)}

## Guardrails

${artifact.guardrails.map((guardrail) => `- ${guardrail}`).join('\n')}
`;
}

function buildFinishGapMarkdown(artifact) {
  const rows = artifact.rows.slice(0, 120).map((row) => [
    row.set_key,
    row.source_external_id,
    row.grookai_card_name,
    row.card_match_status,
    row.finish_match_status,
    row.candidate_finishes.join(', '),
    row.supported_finishes.join(', '),
    row.unsupported_finishes.join(', '),
    row.next_action,
  ]);

  return `# Physical Recovery Finish Gap V1

This report lists physical recovery candidates that still need human/checklist finish evidence, exact card identity resolution, or unsupported-finish review.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}

## Summary

- candidate_card_prints: ${artifact.summary.candidate_card_prints}
- candidate_printing_rows: ${artifact.summary.candidate_printing_rows}

## Gap Rows

${markdownTable(['set', 'external_id', 'card', 'card_status', 'finish_status', 'candidate', 'supported', 'unsupported', 'next_action'], rows)}
`;
}

async function main() {
  const setQueue = await readJson('english_master_index_physical_recovery_set_queue_v1.json');
  const cardsArtifact = await readJson('english_master_index_cards_v1.json');
  const printingsArtifact = await readJson('english_master_index_printings_v1.json');
  const rows = buildRows({ setQueue, cardsArtifact, printingsArtifact });
  const artifacts = buildArtifacts(rows);

  await writeJson('english_master_index_physical_recovery_exact_match_v1.json', artifacts.exactMatch);
  await writeMarkdown('english_master_index_physical_recovery_exact_match_v1.md', buildExactMatchMarkdown(artifacts.exactMatch));
  await writeJson('english_master_index_physical_recovery_finish_gap_v1.json', artifacts.finishGap);
  await writeMarkdown('english_master_index_physical_recovery_finish_gap_v1.md', buildFinishGapMarkdown(artifacts.finishGap));

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    summary: artifacts.exactMatch.summary,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
