import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
  sourceAuthorityKey,
  uniqueSorted,
} from './verified_master_set_index_v1/shared.mjs';

const DEFAULT_GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const DEFAULT_OUTPUT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1';
const DEFAULT_MASTER_INDEX_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';

function parseArgs(argv) {
  const options = {
    sourceKey: null,
    sourceKind: null,
    reportPath: null,
    fixtureDir: null,
    gapsPath: DEFAULT_GAPS_PATH,
    masterIndexDir: DEFAULT_MASTER_INDEX_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--source-key') {
      options.sourceKey = next;
      index += 1;
    } else if (arg === '--source-kind') {
      options.sourceKind = next;
      index += 1;
    } else if (arg === '--report') {
      options.reportPath = next;
      index += 1;
    } else if (arg === '--fixture-dir') {
      options.fixtureDir = next;
      index += 1;
    } else if (arg === '--gaps') {
      options.gapsPath = next;
      index += 1;
    } else if (arg === '--master-index-dir') {
      options.masterIndexDir = next;
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = next;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.sourceKey) throw new Error('--source-key is required');
  if (!options.reportPath && !options.fixtureDir) throw new Error('Provide --report, --fixture-dir, or both');
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function listJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function addCount(target, key, amount = 1) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + amount;
}

function cardKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function factKey(row) {
  const finish = normalizeFinishKey(row.finish_key) ?? '';
  return `${cardKey(row)}|${finish}`;
}

function evidenceAuthority(candidate) {
  return sourceAuthorityKey(candidate);
}

function isHumanLike(candidate) {
  return [
    'official_gallery',
    'human_readable_checklist',
    'marketplace_checklist',
    'collector_reference',
    'manual_review',
  ].includes(candidate.source_kind);
}

function candidateFromFixtureRecord(record, fixture, file) {
  return {
    source_key: record.source_key ?? fixture.source_key,
    source_kind: record.source_kind ?? fixture.source_kind,
    source_url: record.source_url ?? fixture.source_url,
    set_key: record.set_key ?? fixture.set_key,
    set_name: record.set_name ?? fixture.set_name,
    card_number: record.card_number,
    card_name: record.card_name,
    finish_key: normalizeFinishKey(record.finish_key),
    evidence_type: record.evidence_type,
    evidence_label: record.evidence_label,
    raw_snapshot_ref: record.raw_snapshot_ref ?? fixture.raw_snapshot_ref ?? file,
  };
}

async function loadFixtureCandidates(fixtureDir) {
  if (!fixtureDir) return [];
  if (!await fileExists(fixtureDir)) throw new Error(`Fixture dir does not exist: ${fixtureDir}`);
  const candidates = [];
  for (const file of await listJsonFiles(fixtureDir)) {
    const fixture = await readJson(file);
    for (const record of fixture.records ?? []) {
      if (!record.card_number || !record.card_name) continue;
      candidates.push(candidateFromFixtureRecord(record, fixture, file));
    }
  }
  return candidates;
}

function candidateFromResult(row, sourceKey, sourceKind) {
  const fact = row.fact ?? row;
  return {
    source_key: sourceKey,
    source_kind: row.source_kind ?? sourceKind,
    source_url: row.source_url ?? row.evidence_url ?? fact.evidence_urls?.[0],
    set_key: fact.set_key ?? row.set_key,
    set_name: fact.set_name ?? row.set_name,
    card_number: fact.card_number ?? row.card_number,
    card_name: fact.card_name ?? row.card_name,
    finish_key: normalizeFinishKey(fact.finish_key ?? row.finish_key),
    evidence_type: fact.fact_type === 'card_identity' ? 'card_identity' : 'finish_presence',
    evidence_label: row.title ?? row.evidence_label ?? row.status,
    raw_snapshot_ref: row.raw_snapshot_ref ?? row.source_url,
  };
}

async function loadReportCandidates(reportPath, sourceKey, sourceKind) {
  if (!reportPath) return [];
  const payload = await readJson(reportPath);
  return (payload.results ?? [])
    .filter((row) => ['generated', 'validated'].includes(row.status) || (row.records_generated ?? 0) > 0)
    .map((row) => candidateFromResult(row, sourceKey, sourceKind))
    .filter((row) => row.set_key && row.card_number && row.card_name);
}

function dedupeCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const key = [
      factKey(candidate),
      candidate.evidence_type ?? '',
      candidate.source_url ?? '',
      candidate.evidence_label ?? '',
    ].join('|');
    if (!byKey.has(key)) byKey.set(key, candidate);
  }
  return [...byKey.values()];
}

async function loadCurrentIndex(masterIndexDir) {
  const cardsPath = path.join(masterIndexDir, 'english_master_index_cards_v1.json');
  const printingsPath = path.join(masterIndexDir, 'english_master_index_printings_v1.json');
  const cardsPayload = await readJson(cardsPath);
  const printingsPayload = await readJson(printingsPath);
  return {
    cardsByKey: new Map((cardsPayload.cards ?? []).map((row) => [cardKey(row), row])),
    printingsByKey: new Map((printingsPayload.printings ?? []).map((row) => [factKey(row), row])),
    cardsPath,
    printingsPath,
  };
}

function classifyDelta(fact, candidate) {
  const authority = evidenceAuthority(candidate);
  const existingAuthorities = new Set((fact.source_authorities ?? []).map((value) => normalizeText(value)));
  const existingSources = new Set((fact.sources ?? []).map((value) => normalizeText(value)));
  const sameAuthority = existingAuthorities.has(normalizeText(authority));
  const sameSource = existingSources.has(normalizeText(candidate.source_key));
  const independent = Boolean(authority) && !sameAuthority && !sameSource;
  const humanLike = isHumanLike(candidate);

  if (fact.fact_type === 'card_identity') {
    return independent ? 'candidate_second_source' : 'same_source_or_authority';
  }
  if (candidate.evidence_type === 'finish_absence') {
    return 'potential_conflict_finish_absence';
  }
  if (fact.gap_type === 'suppressed_structured_claim_reviewed') {
    return humanLike && independent ? 'suppressed_claim_review_evidence' : 'suppressed_claim_context_only';
  }
  if (fact.gap_type === 'finish_human_checklist_evidence_needed') {
    if (!humanLike) return 'structured_context_only';
    return independent ? 'candidate_human_finish_evidence' : 'same_source_or_authority';
  }
  if (fact.gap_type === 'finish_second_source_needed') {
    return independent ? 'candidate_second_finish_source' : 'same_source_or_authority';
  }
  return 'candidate_context';
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const gaps = await readJson(options.gapsPath);
  const gapFacts = gaps.facts ?? [];
  const gapsByFactKey = new Map(
    gapFacts
      .filter((fact) => fact.fact_type === 'printing_finish')
      .map((fact) => [factKey(fact), fact]),
  );
  const gapsByCardKey = new Map(
    gapFacts
      .filter((fact) => fact.fact_type === 'card_identity')
      .map((fact) => [cardKey(fact), fact]),
  );
  const currentIndex = await loadCurrentIndex(options.masterIndexDir);

  const candidates = dedupeCandidates([
    ...await loadReportCandidates(options.reportPath, options.sourceKey, options.sourceKind),
    ...await loadFixtureCandidates(options.fixtureDir),
  ]);

  const matches = [];
  const unmatched = [];
  const alreadyInIndex = [];
  const byDeltaStatus = {};
  const byGapType = {};
  const bySet = {};
  const byUnmatchedReason = {};

  for (const candidate of candidates) {
    const key = candidate.finish_key ? factKey(candidate) : cardKey(candidate);
    const fact = candidate.finish_key ? gapsByFactKey.get(key) : gapsByCardKey.get(key);
    if (!fact) {
      const currentFact = candidate.finish_key
        ? currentIndex.printingsByKey.get(factKey(candidate))
        : currentIndex.cardsByKey.get(cardKey(candidate));
      if (currentFact) {
        const row = {
          unmatched_reason: `already_in_current_index_${currentFact.status}`,
          current_status: currentFact.status,
          set_key: candidate.set_key,
          set_name: candidate.set_name,
          card_number: candidate.card_number,
          card_name: candidate.card_name,
          finish_key: candidate.finish_key,
          candidate_source_key: candidate.source_key,
          candidate_source_kind: candidate.source_kind,
          candidate_authority: evidenceAuthority(candidate),
          candidate_url: candidate.source_url,
          evidence_label: candidate.evidence_label,
        };
        alreadyInIndex.push(row);
        addCount(byUnmatchedReason, row.unmatched_reason);
        continue;
      }
      addCount(byUnmatchedReason, 'not_in_remaining_gaps_or_current_index');
      unmatched.push(candidate);
      continue;
    }
    const delta_status = classifyDelta(fact, candidate);
    addCount(byDeltaStatus, delta_status);
    addCount(byGapType, fact.gap_type);
    addCount(bySet, `${fact.set_key}|${fact.set_name}`);
    matches.push({
      delta_status,
      gap_type: fact.gap_type,
      fact_type: fact.fact_type,
      set_key: fact.set_key,
      set_name: fact.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: fact.finish_key,
      current_status: fact.status,
      existing_sources: fact.sources ?? [],
      existing_authorities: fact.source_authorities ?? [],
      candidate_source_key: candidate.source_key,
      candidate_source_kind: candidate.source_kind,
      candidate_authority: evidenceAuthority(candidate),
      candidate_url: candidate.source_url,
      evidence_label: candidate.evidence_label,
    });
  }

  const usefulStatuses = new Set([
    'candidate_second_source',
    'candidate_human_finish_evidence',
    'candidate_second_finish_source',
    'suppressed_claim_review_evidence',
  ]);
  const usefulMatches = matches.filter((row) => usefulStatuses.has(row.delta_status));

  const output = {
    version: 'english_master_index_source_delta_audit_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_key: options.sourceKey,
    source_kind: options.sourceKind,
    inputs: {
      gaps_path: options.gapsPath,
      report_path: options.reportPath,
      fixture_dir: options.fixtureDir,
      master_index_dir: options.masterIndexDir,
      current_cards_path: currentIndex.cardsPath,
      current_printings_path: currentIndex.printingsPath,
    },
    rule: 'New sources are evaluated as isolated candidate lanes against current remaining gaps before any guarded global rebuild.',
    promotion_rule: 'Delta evidence may reduce a gap only after source independence and exact fact matching are confirmed; this report does not promote truth by itself.',
    no_global_rebuild_required_for_discovery: true,
    summary: {
      current_gap_facts: gapFacts.length,
      candidate_records_loaded: candidates.length,
      matched_gap_facts: matches.length,
      useful_candidate_matches: usefulMatches.length,
      already_in_current_index: alreadyInIndex.length,
      unmatched_candidate_records: unmatched.length,
      by_delta_status: byDeltaStatus,
      by_gap_type: byGapType,
      by_unmatched_reason: byUnmatchedReason,
      top_sets: Object.fromEntries(Object.entries(bySet).sort((a, b) => b[1] - a[1]).slice(0, 25)),
      next_step: usefulMatches.length > 0
        ? 'Review useful candidate matches, then run guarded rebuild only if the source lane is accepted.'
        : 'No useful gap-closing evidence found; do not run a global rebuild for this source.',
    },
    useful_matches: usefulMatches,
    all_matches: matches,
    already_in_current_index: alreadyInIndex,
    unmatched_candidate_sample: unmatched.slice(0, 200),
  };

  await fs.mkdir(options.outputDir, { recursive: true });
  const jsonPath = path.join(options.outputDir, `${options.sourceKey}_source_delta_audit_v1.json`);
  const mdPath = path.join(options.outputDir, `${options.sourceKey}_source_delta_audit_v1.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);

  const md = [
    `# ${options.sourceKey} Source Delta Audit V1`,
    '',
    'Audit-only source-delta report. No DB writes, migrations, cleanup, quarantine, or Master Index promotion occurred.',
    '',
    '## Guardrails',
    '',
    '- New source evidence is isolated before any global rebuild.',
    '- Candidate evidence is matched only to current remaining gap facts.',
    '- This report is not deletion, insertion, or normalization authority.',
    '- API-only evidence cannot become master truth by this report.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['Metric', 'Value'],
      [
        ['current_gap_facts', output.summary.current_gap_facts],
        ['candidate_records_loaded', output.summary.candidate_records_loaded],
        ['matched_gap_facts', output.summary.matched_gap_facts],
        ['useful_candidate_matches', output.summary.useful_candidate_matches],
        ['already_in_current_index', output.summary.already_in_current_index],
        ['unmatched_candidate_records', output.summary.unmatched_candidate_records],
        ['no_global_rebuild_required_for_discovery', 'true'],
      ],
    ),
    '',
    '## Delta Status Counts',
    '',
    markdownTable(['Status', 'Count'], Object.entries(byDeltaStatus).sort((a, b) => b[1] - a[1])),
    '',
    '## Non-Gap Candidate Counts',
    '',
    markdownTable(['Reason', 'Count'], Object.entries(byUnmatchedReason).sort((a, b) => b[1] - a[1])),
    '',
    '## Useful Matches',
    '',
    markdownTable(
      ['Status', 'Gap', 'Set', 'Number', 'Card', 'Finish', 'Candidate Source', 'Authority'],
      usefulMatches.slice(0, 100).map((row) => [
        row.delta_status,
        row.gap_type,
        row.set_key,
        row.card_number,
        row.card_name,
        row.finish_key ?? '',
        row.candidate_source_key,
        row.candidate_authority,
      ]),
    ),
    usefulMatches.length > 100 ? `\nShowing first 100 of ${usefulMatches.length} useful matches.` : '',
    '',
    '## Next Step',
    '',
    output.summary.next_step,
    '',
    '## Safety Confirmation',
    '',
    '```json',
    JSON.stringify({
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    }, null, 2),
    '```',
    '',
  ].join('\n');
  await fs.writeFile(mdPath, md);

  console.log(JSON.stringify({
    jsonPath,
    mdPath,
    summary: output.summary,
    useful_delta_statuses: uniqueSorted(Object.keys(byDeltaStatus).filter((status) => usefulStatuses.has(status))),
  }, null, 2));
}

await main();
