import fs from 'node:fs/promises';
import path from 'node:path';
import { FINISH_LABELS, markdownTable, uniqueSorted } from '../shared.mjs';

function byStatus(rows, status) {
  return rows.filter((row) => row.status === status);
}

function sourceOverlap(records) {
  const sourceToKeys = new Map();
  for (const row of records) {
    if (!sourceToKeys.has(row.source_key)) sourceToKeys.set(row.source_key, new Set());
    sourceToKeys.get(row.source_key).add(`${row.set_name}|${row.card_number}|${row.card_name}|${row.finish_key ?? ''}`);
  }
  return [...sourceToKeys.entries()].map(([source_key, keys]) => ({ source_key, facts: keys.size }));
}

function reportPayload({ records, classified, setConfigs, generatedAt, transport, sourceAvailability = [] }) {
  const cards = classified.cards;
  const printings = classified.printings;
  const finishAbsences = classified.finish_absences ?? [];
  return {
    version: 'VERIFIED_MASTER_SET_INDEX_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes: false,
    language: 'en',
    message: 'This is not a completed Verified Master Set Index. This is a source-standard and pilot validation pass.',
    sets: setConfigs,
    source_availability: sourceAvailability,
    transport,
    totals: {
      evidence_rows: records.length,
      master_verified_cards: byStatus(cards, 'master_verified').length,
      master_verified_printings: byStatus(printings, 'master_verified').length,
      api_agreed_cards: byStatus(cards, 'api_agreed').length,
      api_agreed_printings: byStatus(printings, 'api_agreed').length,
      human_source_verified_cards: byStatus(cards, 'human_source_verified').length,
      human_source_verified_printings: byStatus(printings, 'human_source_verified').length,
      candidate_cards: byStatus(cards, 'candidate_unconfirmed').length,
      candidate_printings: byStatus(printings, 'candidate_unconfirmed').length,
      conflicts: classified.conflicts.length,
      manual_review: classified.manual_review.length,
      finish_absent_source_backed: finishAbsences.length,
    },
    verified_cards: byStatus(cards, 'master_verified'),
    verified_printings: byStatus(printings, 'master_verified'),
    api_agreed_cards: byStatus(cards, 'api_agreed'),
    api_agreed_printings: byStatus(printings, 'api_agreed'),
    candidates: [
      ...byStatus(cards, 'candidate_unconfirmed'),
      ...byStatus(printings, 'candidate_unconfirmed'),
    ],
    conflicts: classified.conflicts,
    manual_review: classified.manual_review,
    finish_absences: finishAbsences,
  };
}

function buildFinishMatrix(classified) {
  const rows = [];
  const byCard = new Map();
  for (const row of [...classified.printings, ...(classified.finish_absences ?? [])]) {
    const key = `${row.set_name}|${row.card_number}|${row.card_name}`;
    if (!byCard.has(key)) {
      byCard.set(key, {
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        finishes: {},
      });
    }
    byCard.get(key).finishes[row.finish_key] = {
      status: row.status,
      sources: row.sources,
      source_kinds: row.source_kinds,
      evidence_urls: row.evidence.map((item) => item.source_url).filter(Boolean),
      notes: row.evidence.map((item) => item.notes).filter(Boolean),
    };
  }
  for (const entry of byCard.values()) rows.push(entry);
  return rows.sort((a, b) => String(a.card_number).localeCompare(String(b.card_number), undefined, { numeric: true }));
}

function buildIndexMarkdown(report) {
  const rows = [
    ['master verified cards', report.totals.master_verified_cards],
    ['master verified printings', report.totals.master_verified_printings],
    ['api agreed cards', report.totals.api_agreed_cards],
    ['api agreed printings', report.totals.api_agreed_printings],
    ['candidate cards', report.totals.candidate_cards],
    ['candidate printings', report.totals.candidate_printings],
    ['conflicts', report.totals.conflicts],
    ['manual review', report.totals.manual_review],
  ];
  const printingRows = report.api_agreed_printings.slice(0, 80).map((row) => [
    row.set_name,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.status,
    row.sources.join(', '),
  ]);

  return [
    '# Verified Master Set Index V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    report.message,
    '',
    `Transport: ${report.transport.note}`,
    '',
    '## Source Standard',
    '',
    '`api_agreed` is not master truth. Printing/finish facts require at least one human-readable, official, or checklist-style source before `master_verified`.',
    '',
    '## Totals',
    '',
    markdownTable(['metric', 'count'], rows),
    '',
    '## API-Agreed Printing Sample',
    '',
    markdownTable(['set', 'number', 'name', 'finish', 'status', 'sources'], printingRows),
    '',
  ].join('\n');
}

function buildAgreementMarkdown(payload, records) {
  const overlapRows = sourceOverlap(records).map((row) => [row.source_key, row.facts]);
  const reverseRows = payload.api_agreed_printings
    .filter((row) => row.finish_key === 'reverse')
    .slice(0, 80)
    .map((row) => [row.set_name, row.card_number, row.card_name, row.status, row.sources.join(', ')]);

  return [
    '# Source Agreement Report V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    payload.message,
    '',
    '## Source Overlap',
    '',
    markdownTable(['source', 'facts'], overlapRows),
    '',
    '## Reverse Holo API Agreement Sample',
    '',
    markdownTable(['set', 'number', 'name', 'status', 'sources'], reverseRows),
    '',
    'Finish disagreement and unsupported claims remain fail-closed until human-readable finish evidence is present.',
    '',
  ].join('\n');
}

function buildConflictsMarkdown(payload) {
  const rows = payload.conflicts.map((row) => [
    row.set_name,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.sources.join(', '),
    row.evidence.map((item) => `${item.source_key}:${item.source_url}`).join('; '),
  ]);
  return [
    '# Source Conflicts V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Conflicts are not promoted into the verified index.',
    '',
    markdownTable(['set', 'number', 'name', 'finish', 'sources', 'evidence URLs'], rows),
    '',
  ].join('\n');
}

function comparisonPayload(payload, grookaiComparison = null) {
  if (grookaiComparison) {
    return {
      version: 'VERIFIED_MASTER_SET_INDEX_V1_GROOKAI_COMPARISON',
      generated_at: payload.generated_at,
      audit_only: true,
      db_writes: false,
      ...grookaiComparison,
    };
  }
  return {
    version: 'VERIFIED_MASTER_SET_INDEX_V1_GROOKAI_COMPARISON',
    generated_at: payload.generated_at,
    audit_only: true,
    db_writes: false,
    statuses: [
      'verified_by_index',
      'missing_from_grookai',
      'unsupported_by_index',
      'conflicting_sources',
      'needs_manual_review',
    ],
    summary: {
      executed: false,
      reason: 'This automated source-agreement phase builds the reference system first. DB comparison is reserved for the next audit-only pass.',
    },
    rows: [],
  };
}

function buildComparisonMarkdown(payload, comparison = null) {
  const comparisonRows = comparison?.rows ?? [];
  const rows = comparisonRows.map((row) => [
    row.card_number ?? '',
    row.grookai_card_name ?? row.index_card_name ?? '',
    row.finish_key ?? '',
    row.status,
    row.grookai_printing_id ?? '',
    row.note ?? row.reason ?? '',
  ]);
  const byStatusRows = Object.entries(comparison?.summary?.by_status ?? {}).map(([status, count]) => [status, count]);
  const byStatusFinish = new Map();
  for (const row of comparisonRows) {
    const key = `${row.status}|${row.finish_key ?? ''}`;
    byStatusFinish.set(key, (byStatusFinish.get(key) ?? 0) + 1);
  }
  const byStatusFinishRows = [...byStatusFinish.entries()]
    .sort()
    .map(([key, count]) => {
      const [status, finish] = key.split('|');
      return [status, finish, count];
    });
  const issueRows = comparisonRows
    .filter((row) => row.status !== 'verified_by_index')
    .map((row) => [
      row.card_number ?? '',
      row.grookai_card_name ?? '',
      row.index_card_name ?? '',
      row.finish_key ?? '',
      row.status,
      row.grookai_printing_id ?? '',
      row.note ?? '',
    ]);
  return [
    '# Grookai Comparison Report V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'This is not a completed Verified Master Set Index. This phase did not mutate Grookai DB rows.',
    '',
    comparison?.summary
      ? `Summary: ${comparison.summary.status ?? 'unknown'}${comparison.summary.reason ? ` - ${comparison.summary.reason}` : ''}`
      : 'Summary: comparison not executed.',
    '',
    comparison?.summary?.grookai_printing_rows != null
      ? `Grookai printing rows read: ${comparison.summary.grookai_printing_rows}`
      : '',
    comparison?.summary?.index_master_verified_printings != null
      ? `Index master-verified printings: ${comparison.summary.index_master_verified_printings}`
      : '',
    '',
    '## Status Summary',
    '',
    byStatusRows.length > 0 ? markdownTable(['status', 'count'], byStatusRows) : '',
    '',
    '## Status By Finish',
    '',
    byStatusFinishRows.length > 0 ? markdownTable(['status', 'finish', 'count'], byStatusFinishRows) : '',
    '',
    'Reserved statuses:',
    '',
    '- `verified_by_index`',
    '- `api_agreed_only`',
    '- `missing_from_grookai`',
    '- `unsupported_by_index`',
    '- `conflicting_sources`',
    '- `needs_manual_review`',
    '- `set_not_found_in_grookai`',
    '',
    'Stop rule: do not quarantine, hide, delete, or normalize rows based on this pilot.',
    '',
    '## Issue Rows',
    '',
    issueRows.length > 0
      ? markdownTable(['number', 'Grookai name', 'index name', 'finish', 'status', 'printing id', 'note'], issueRows)
      : 'No issue rows.',
    '',
    '## Row Detail',
    '',
    rows.length > 0 ? markdownTable(['number', 'name', 'finish', 'status', 'printing id', 'note'], rows) : '',
    '',
  ].join('\n');
}

function buildHardeningMarkdown(payload) {
  return [
    '# Source Standard Hardening V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    payload.message,
    '',
    'Structured API agreement is useful but not final printing truth. API-only printings remain `api_agreed`.',
    '',
    'A printing/finish fact can become `master_verified` only when source_count >= 2 and at least one official/checklist/collector source supports that exact finish fact.',
    '',
  ].join('\n');
}

async function writeJson(outputDir, fileName, data) {
  await fs.writeFile(path.join(outputDir, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

function buildAscendedIndexMarkdown(payload) {
  const rows = [
    ['source evidence rows', payload.totals.evidence_rows],
    ['master verified cards', payload.totals.master_verified_cards],
    ['master verified printings', payload.totals.master_verified_printings],
    ['api agreed cards', payload.totals.api_agreed_cards],
    ['api agreed printings', payload.totals.api_agreed_printings],
    ['candidate cards', payload.totals.candidate_cards],
    ['candidate printings', payload.totals.candidate_printings],
    ['conflicts', payload.totals.conflicts],
    ['manual review', payload.totals.manual_review],
    ['finish absent source backed', payload.totals.finish_absent_source_backed],
  ];
  const availabilityRows = payload.source_availability.flatMap((set) => Object.entries(set.source_status ?? {}).map(([source, status]) => [
    source,
    set.source_aliases?.[source] ?? set.source_aliases?.pokemontcg_io ?? '',
    status,
  ]));
  return [
    '# Ascended Heroes Verified Index V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Audit only. No DB writes, quarantine, deletes, or public hiding.',
    '',
    'Ascended Heroes is a stress pilot. API agreement is not master truth, and exact finishes fail closed without human-readable finish evidence.',
    '',
    '## Strict Guardrails',
    '',
    '- Stop immediately if source conflicts appear.',
    '- Stop immediately if a not-applicable finish, including Master Ball, is asserted as present.',
    '- Stop immediately if a master-verified finish has fewer than two independent source authorities.',
    '- Stop immediately if a batch does not match its expected finish-count checkpoint.',
    '- Stop immediately if exact unverified printing rows appear during a controlled paired-source batch.',
    '',
    '## Source Availability',
    '',
    markdownTable(['source', 'alias', 'status'], availabilityRows),
    '',
    '## Totals',
    '',
    markdownTable(['metric', 'count'], rows),
    '',
  ].join('\n');
}

function buildAscendedAgreementMarkdown(payload, records) {
  const overlapRows = sourceOverlap(records).map((row) => [row.source_key, row.facts]);
  const manualRows = payload.manual_review.slice(0, 80).map((row) => [
    row.set_name,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.status,
    row.sources.join(', '),
  ]);
  return [
    '# Ascended Heroes Source Agreement V1',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'Source agreement is partial. Unavailable structured sources are source availability facts, not disagreements.',
    '',
    '## Source Overlap',
    '',
    markdownTable(['source', 'facts'], overlapRows),
    '',
    '## Manual Review Sample',
    '',
    markdownTable(['set', 'number', 'name', 'finish', 'status', 'sources'], manualRows),
    '',
  ].join('\n');
}

function ascendedFocusFinishSummary(classified, setConfig) {
  const focusFinishes = setConfig.finish_profile?.focus_finishes ?? ['normal', 'holo', 'reverse', 'pokeball', 'rocket_reverse', 'stamped', 'cosmos', 'cracked_ice', 'other'];
  return focusFinishes.map((finish) => {
    const exactRows = classified.printings.filter((row) => row.finish_key === finish);
    const absenceRows = (classified.finish_absences ?? []).filter((row) => row.finish_key === finish);
    const setLevelRows = classified.manual_review.filter((row) => row.finish_key === finish);
    if (exactRows.some((row) => row.status === 'master_verified')) {
      return { finish_key: finish, status: 'master_verified', evidence_count: exactRows.length };
    }
    if (exactRows.some((row) => row.status === 'api_agreed')) {
      return { finish_key: finish, status: 'api_agreed', evidence_count: exactRows.length };
    }
    if (exactRows.some((row) => row.status === 'human_source_verified')) {
      return { finish_key: finish, status: 'human_source_verified', evidence_count: exactRows.length };
    }
    if (absenceRows.length > 0) {
      return { finish_key: finish, status: 'finish_absent_source_backed', evidence_count: absenceRows.length };
    }
    if (setLevelRows.length > 0) {
      return {
        finish_key: finish,
        status: 'needs_manual_review',
        evidence_count: setLevelRows.length,
        reason: 'set-level discussion exists but exact card-level coverage is not proven',
      };
    }
    return { finish_key: finish, status: 'source_unavailable', evidence_count: 0 };
  });
}

function buildAscendedFinishMatrixMarkdown(finishMatrix, focusSummary, setConfig) {
  const focusFinishes = setConfig.finish_profile?.focus_finishes ?? ['normal', 'holo', 'reverse', 'pokeball', 'rocket_reverse', 'stamped', 'cosmos', 'cracked_ice', 'other'];
  const notApplicableFinishes = setConfig.finish_profile?.not_applicable_finishes ?? [];
  const rows = finishMatrix.flatMap((card) => (
    Object.entries(card.finishes).map(([finishKey, fact]) => [
      card.card_number,
      card.card_name,
      finishKey,
      fact.status,
      fact.sources.join(', '),
      fact.evidence_urls.join('; '),
      fact.notes.join('; '),
    ])
  )).slice(0, 300);
  const gridRows = finishMatrix.slice(0, 120).map((card) => [
    card.card_number,
    card.card_name,
    ...focusFinishes.map((finish) => card.finishes[finish]?.status ?? ''),
  ]);
  return [
    '# Ascended Heroes Finish Matrix V1',
    '',
    'Empty cells mean no source-backed exact finish evidence was collected in this pilot.',
    '',
    '## Set Finish Profile',
    '',
    setConfig.finish_profile
      ? [
        `Profile: ${setConfig.finish_profile.profile_key}`,
        `Source: ${setConfig.finish_profile.source_url}`,
        `Notes: ${setConfig.finish_profile.notes}`,
      ].join('\n\n')
      : 'No set-specific finish profile configured.',
    '',
    '## Not Applicable Finishes',
    '',
    markdownTable(
      ['finish', 'status', 'source'],
      notApplicableFinishes.map((finish) => [
        FINISH_LABELS[finish] ?? finish,
        'not_applicable',
        setConfig.finish_profile?.source_url ?? '',
      ]),
    ),
    '',
    '## Focus Finish Summary',
    '',
    markdownTable(
      ['finish', 'status', 'evidence count', 'reason'],
      focusSummary.map((row) => [FINISH_LABELS[row.finish_key] ?? row.finish_key, row.status, row.evidence_count, row.reason ?? '']),
    ),
    '',
    '## Exact Card Finish Evidence',
    '',
    markdownTable(['card_number', 'card_name', 'finish_key', 'status', 'supporting_sources', 'evidence_urls', 'notes'], rows),
    '',
    '## Finish Grid',
    '',
    markdownTable(['number', 'name', ...focusFinishes.map((finish) => FINISH_LABELS[finish] ?? finish)], gridRows),
    '',
  ].join('\n');
}

function buildAscendedFinishEvidenceGaps(payload, classified, focusSummary) {
  const rows = [
    ...focusSummary
      .filter((row) => row.status === 'source_unavailable' || row.status === 'needs_manual_review')
      .map((row) => ({
        set_name: 'Ascended Heroes',
        card_number: null,
        card_name: null,
        finish_key: row.finish_key,
        status: row.status,
        reason: row.reason ?? 'no usable exact card-level finish source in pilot',
      })),
    ...classified.manual_review.map((row) => ({
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      status: row.status,
      reason: row.evidence?.map((item) => item.notes ?? item.evidence_label).filter(Boolean).join('; ') ?? '',
    })),
  ];
  return {
    version: 'ASCENDED_HEROES_FINISH_EVIDENCE_GAPS_V1',
    generated_at: payload.generated_at,
    rule: 'Lack of matrix evidence is not proof of absence unless a source-backed finish_absence row exists.',
    rows,
  };
}

function buildAscendedFinishEvidenceGapsMarkdown(gaps) {
  return [
    '# Ascended Heroes Finish Evidence Gaps V1',
    '',
    gaps.rule,
    '',
    markdownTable(
      ['set', 'number', 'name', 'finish', 'status', 'reason'],
      gaps.rows.map((row) => [row.set_name, row.card_number, row.card_name, row.finish_key, row.status, row.reason]),
    ),
    '',
  ].join('\n');
}

function buildAscendedParallelCoverage(payload, classified, setConfig) {
  const expectedCounts = setConfig.finish_profile?.expected_parallel_counts ?? {};
  const rows = Object.entries(expectedCounts).map(([finishKey, expected]) => {
    const verifiedRows = classified.printings.filter((row) => (
      row.finish_key === finishKey && row.status === 'master_verified'
    ));
    const expectedCount = Number(expected.expected_count ?? 0);
    const verifiedCount = verifiedRows.length;
    const gapCount = Math.max(0, expectedCount - verifiedCount);
    const notApplicable = (setConfig.finish_profile?.not_applicable_finishes ?? []).includes(finishKey);
    return {
      finish_key: finishKey,
      label: FINISH_LABELS[finishKey] ?? finishKey,
      expected_count: expectedCount,
      master_verified_count: verifiedCount,
      gap_count: gapCount,
      status: notApplicable
        ? 'not_applicable'
        : (gapCount === 0 ? 'coverage_complete' : 'coverage_incomplete'),
      basis: expected.basis,
      source_urls: expected.source_urls ?? [],
      verified_rows: verifiedRows.map((row) => ({
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        sources: row.sources,
        evidence_urls: row.evidence.map((item) => item.source_url).filter(Boolean),
      })),
    };
  });

  return {
    version: 'ASCENDED_HEROES_PARALLEL_COVERAGE_V1',
    generated_at: payload.generated_at,
    audit_only: true,
    db_writes: false,
    rule: 'Expected coverage is source-backed planning data only. A row is master_verified only when exact card-level finish evidence has 2+ independent sources.',
    rows,
  };
}

function buildAscendedParallelCoverageMarkdown(coverage) {
  return [
    '# Ascended Heroes Parallel Coverage V1',
    '',
    coverage.rule,
    '',
    '## Coverage Summary',
    '',
    markdownTable(
      ['finish', 'expected', 'master verified', 'gap', 'status', 'basis'],
      coverage.rows.map((row) => [
        row.label,
        row.expected_count,
        row.master_verified_count,
        row.gap_count,
        row.status,
        row.basis,
      ]),
    ),
    '',
    '## Verified Parallel Rows',
    '',
    markdownTable(
      ['finish', 'number', 'name', 'sources', 'evidence URLs'],
      coverage.rows.flatMap((row) => row.verified_rows.map((verified) => [
        row.label,
        verified.card_number,
        verified.card_name,
        verified.sources.join(', '),
        verified.evidence_urls.join('; '),
      ])),
    ),
    '',
  ].join('\n');
}

function buildAscendedParallelAcquisitionQueue(payload, classified, setConfig, coverage) {
  const expectedKeys = new Set(Object.keys(setConfig.finish_profile?.expected_parallel_counts ?? {}));
  const verifiedKeys = new Set(classified.printings
    .filter((row) => row.status === 'master_verified')
    .map((row) => `${row.card_number}|${row.card_name}|${row.finish_key}`));
  const candidateRows = [
    ...classified.printings.filter((row) => (
      row.status === 'human_source_verified' || row.status === 'candidate_unconfirmed'
    )),
    ...classified.manual_review,
  ]
    .filter((row) => (
      row.fact_type === 'printing_finish'
      && row.card_number
      && row.card_name
      && expectedKeys.has(row.finish_key)
      && !verifiedKeys.has(`${row.card_number}|${row.card_name}|${row.finish_key}`)
    ))
    .map((row) => ({
      queue_type: 'exact_candidate_needs_second_source',
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      current_status: row.status === 'human_source_verified' ? 'human_source_verified_needs_second_source' : 'single_source_candidate',
      source_count: row.source_count,
      existing_sources: row.sources,
      evidence_urls: row.evidence.map((item) => item.source_url).filter(Boolean),
      expected_basis: setConfig.finish_profile?.expected_parallel_counts?.[row.finish_key]?.basis ?? '',
      recommended_source_1: row.sources.join(', '),
      recommended_source_2: 'Find one independent exact card-level checklist, marketplace listing, or collector reference with the same card number, name, and finish.',
    }));

  const candidateCountByFinish = new Map();
  for (const row of candidateRows) {
    candidateCountByFinish.set(row.finish_key, (candidateCountByFinish.get(row.finish_key) ?? 0) + 1);
  }

  const laneRows = coverage.rows
    .filter((row) => row.status === 'coverage_incomplete')
    .map((row) => ({
      queue_type: 'lane_candidate_map_gap',
      set_name: 'Ascended Heroes',
      card_number: null,
      card_name: null,
      finish_key: row.finish_key,
      current_status: 'candidate_map_incomplete',
      expected_count: row.expected_count,
      master_verified_count: row.master_verified_count,
      exact_candidate_count: candidateCountByFinish.get(row.finish_key) ?? 0,
      remaining_gap_after_candidates: Math.max(0, row.gap_count - (candidateCountByFinish.get(row.finish_key) ?? 0)),
      expected_basis: row.basis,
      recommended_source_1: row.source_urls.join(', '),
      recommended_source_2: 'Capture exact card-level candidate rows before attempting verification or Grookai comparison.',
    }));

  return {
    version: 'ASCENDED_HEROES_PARALLEL_ACQUISITION_QUEUE_V1',
    generated_at: payload.generated_at,
    audit_only: true,
    db_writes: false,
    rule: 'Queue rows are work items only. They do not create master truth and must not drive cleanup.',
    summary: {
      exact_candidate_rows: candidateRows.length,
      lane_gap_rows: laneRows.length,
      next_recommended_batch: 'Complete second-source evidence for rocket_reverse candidates first because the lane is bounded at 10 expected rows.',
    },
    rows: [...candidateRows, ...laneRows],
  };
}

function buildAscendedParallelAcquisitionQueueMarkdown(queue) {
  return [
    '# Ascended Heroes Parallel Acquisition Queue V1',
    '',
    queue.rule,
    '',
    `Next recommended batch: ${queue.summary.next_recommended_batch}`,
    '',
    '## Exact Candidate Rows',
    '',
    markdownTable(
      ['finish', 'number', 'name', 'status', 'existing sources', 'recommended second source'],
      queue.rows
        .filter((row) => row.queue_type === 'exact_candidate_needs_second_source')
        .map((row) => [
          FINISH_LABELS[row.finish_key] ?? row.finish_key,
          row.card_number,
          row.card_name,
          row.current_status,
          row.existing_sources.join(', '),
          row.recommended_source_2,
        ]),
    ),
    '',
    '## Lane Map Gaps',
    '',
    markdownTable(
      ['finish', 'expected', 'verified', 'exact candidates', 'remaining map gap', 'recommended action'],
      queue.rows
        .filter((row) => row.queue_type === 'lane_candidate_map_gap')
        .map((row) => [
          FINISH_LABELS[row.finish_key] ?? row.finish_key,
          row.expected_count,
          row.master_verified_count,
          row.exact_candidate_count,
          row.remaining_gap_after_candidates,
          row.recommended_source_2,
        ]),
    ),
    '',
  ].join('\n');
}

function summarizeBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort().map(([key, count]) => [key, count]);
}

function dependencyTotal(row) {
  if (Number.isFinite(Number(row.dependency_total))) return Number(row.dependency_total);
  return Object.values(row.dependency_counts ?? {})
    .reduce((sum, value) => sum + Number(value ?? 0), 0);
}

function applyBlockers(row) {
  return Array.isArray(row.apply_blockers) ? row.apply_blockers.filter(Boolean) : [];
}

function formatDependencyCounts(row) {
  const counts = row.dependency_counts ?? {};
  return [
    `vault_item_instances=${Number(counts.vault_item_instances ?? 0)}`,
    `external_printing_mappings=${Number(counts.external_printing_mappings ?? 0)}`,
    `canon_warehouse_candidates=${Number(counts.canon_warehouse_candidates ?? 0)}`,
  ].join('; ');
}

function buildAscendedNormalizationPlan(comparison) {
  const comparisonRows = comparison?.rows ?? [];
  const unsupportedRows = comparisonRows.filter((row) => row.status === 'unsupported_by_index');
  const safeRemoveRows = unsupportedRows
    .filter((row) => dependencyTotal(row) === 0)
    .map((row) => ({
      action: 'remove_or_quarantine_candidate',
      safety_class: 'audit_only_candidate',
      reason: 'Grookai printing row is not supported by the completed Ascended Heroes Verified Master Set Index.',
      requires_approval_before_apply: true,
      ...row,
    }));
  const dependencyHoldRows = unsupportedRows
    .filter((row) => dependencyTotal(row) > 0)
    .map((row) => ({
      action: 'manual_review_required',
      safety_class: 'hold_dependency_present',
      reason: 'Unsupported Grookai printing row has downstream references and cannot be removed or quarantined without dependency handling.',
      requires_approval_before_apply: true,
      ...row,
    }));
  const safeAddRows = comparisonRows
    .filter((row) => row.status === 'missing_from_grookai' && applyBlockers(row).length === 0)
    .map((row) => ({
      action: 'add_missing_printing_candidate',
      safety_class: 'audit_only_candidate',
      reason: 'Verified Master Set Index supports this printing, but Grookai does not currently store it.',
      requires_approval_before_apply: true,
      ...row,
    }));
  const blockedAddRows = comparisonRows
    .filter((row) => row.status === 'missing_from_grookai' && applyBlockers(row).length > 0)
    .map((row) => ({
      action: 'manual_review_required',
      safety_class: 'hold_apply_blocker',
      reason: `Missing Grookai printing cannot be inserted until blockers are cleared: ${applyBlockers(row).join(', ')}.`,
      requires_approval_before_apply: true,
      ...row,
    }));
  const manualReviewRows = [
    ...dependencyHoldRows,
    ...blockedAddRows,
    ...comparisonRows
      .filter((row) => row.status === 'needs_manual_review' || row.status === 'finish_absent_conflict')
      .map((row) => ({
        action: 'manual_review_required',
        safety_class: 'hold',
        reason: row.note ?? 'Manual review required before any remediation.',
        requires_approval_before_apply: true,
        ...row,
      })),
  ];

  return {
    version: 'ASCENDED_HEROES_NORMALIZATION_PLAN_V1',
    generated_at: comparison?.generated_at ?? null,
    audit_only: true,
    db_writes: false,
    quarantine_applied: false,
    destructive_actions_applied: false,
    rule: 'This plan is evidence-backed remediation planning only. It must not be applied without a separate approved migration or maintenance path.',
    stop_rules: [
      'Do not delete or quarantine rows from this report directly.',
      'Stop if ownership/vault/provenance dependencies are found for any candidate row.',
      'Stop if a candidate row has unresolved identity ambiguity.',
      'Stop if another source contradicts the Verified Master Set Index.',
      'Stop if apply logic cannot be made transactional and reversible.',
    ],
    summary: {
      remove_or_quarantine_candidates: safeRemoveRows.length,
      add_missing_printing_candidates: safeAddRows.length,
      manual_review_required: manualReviewRows.length,
      dependency_hold_candidates: dependencyHoldRows.length,
      add_blocked_by_apply_guardrail: blockedAddRows.length,
      add_blockers_by_type: Object.fromEntries(summarizeBy(blockedAddRows.flatMap((row) => applyBlockers(row)), (value) => value)),
      remove_candidates_by_finish: Object.fromEntries(summarizeBy(safeRemoveRows, (row) => row.finish_key)),
      add_candidates_by_finish: Object.fromEntries(summarizeBy(safeAddRows, (row) => row.finish_key)),
      blocked_adds_by_finish: Object.fromEntries(summarizeBy(blockedAddRows, (row) => row.finish_key)),
      dependency_holds_by_finish: Object.fromEntries(summarizeBy(dependencyHoldRows, (row) => row.finish_key)),
    },
    rows: [...safeRemoveRows, ...safeAddRows, ...manualReviewRows],
  };
}

function buildAscendedNormalizationPlanMarkdown(plan) {
  const removeRows = plan.rows.filter((row) => row.action === 'remove_or_quarantine_candidate');
  const addRows = plan.rows.filter((row) => row.action === 'add_missing_printing_candidate');
  const manualRows = plan.rows.filter((row) => row.action === 'manual_review_required');

  return [
    '# Ascended Heroes Normalization Plan V1',
    '',
    plan.rule,
    '',
    'Audit only. No DB writes, quarantine, deletes, or public hiding were applied.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'count'],
      [
        ['remove_or_quarantine_candidates', plan.summary.remove_or_quarantine_candidates],
        ['add_missing_printing_candidates', plan.summary.add_missing_printing_candidates],
        ['manual_review_required', plan.summary.manual_review_required],
        ['dependency_hold_candidates', plan.summary.dependency_hold_candidates ?? 0],
        ['add_blocked_by_apply_guardrail', plan.summary.add_blocked_by_apply_guardrail ?? 0],
      ],
    ),
    '',
    '## Remove Candidate Counts By Finish',
    '',
    markdownTable(['finish', 'count'], Object.entries(plan.summary.remove_candidates_by_finish)),
    '',
    '## Add Candidate Counts By Finish',
    '',
    markdownTable(['finish', 'count'], Object.entries(plan.summary.add_candidates_by_finish)),
    '',
    '## Blocked Add Counts By Finish',
    '',
    markdownTable(['finish', 'count'], Object.entries(plan.summary.blocked_adds_by_finish ?? {})),
    '',
    '## Add Blockers By Type',
    '',
    markdownTable(['blocker', 'count'], Object.entries(plan.summary.add_blockers_by_type ?? {})),
    '',
    '## Dependency Hold Counts By Finish',
    '',
    markdownTable(['finish', 'count'], Object.entries(plan.summary.dependency_holds_by_finish ?? {})),
    '',
    '## Stop Rules',
    '',
    ...plan.stop_rules.map((rule) => `- ${rule}`),
    '',
    '## Add Missing Printing Candidates',
    '',
    markdownTable(
      ['number', 'index name', 'finish', 'evidence URLs'],
      addRows.map((row) => [
        row.card_number,
        row.index_card_name,
        row.finish_key,
        (row.index_evidence_urls ?? []).join('; '),
      ]),
    ),
    '',
    '## Remove Or Quarantine Candidates',
    '',
    markdownTable(
      ['number', 'Grookai name', 'finish', 'printing id', 'dependencies', 'reason'],
      removeRows.map((row) => [
        row.card_number,
        row.grookai_card_name,
        row.finish_key,
        row.grookai_printing_id,
        formatDependencyCounts(row),
        row.reason,
      ]),
    ),
    '',
    '## Manual Review Holds',
    '',
    manualRows.length > 0
      ? markdownTable(
        ['number', 'Grookai name', 'index name', 'finish', 'status', 'dependencies', 'reason'],
        manualRows.map((row) => [
          row.card_number,
          row.grookai_card_name,
          row.index_card_name,
          row.finish_key,
          row.status,
          formatDependencyCounts(row),
          applyBlockers(row).length > 0 ? `${row.reason} blockers=${applyBlockers(row).join(', ')}` : row.reason,
        ]),
      )
      : 'No manual review holds in this plan.',
    '',
  ].join('\n');
}

function buildAscendedConflictsMarkdown(payload) {
  return buildConflictsMarkdown(payload).replace('# Source Conflicts V1', '# Ascended Heroes Conflicts V1');
}

function buildAscendedComparisonMarkdown(payload, comparison) {
  return buildComparisonMarkdown(payload, comparison).replace('# Grookai Comparison Report V1', '# Ascended Heroes Grookai Comparison V1');
}

async function writeAscendedReports({ outputDir, payload, records, classified, comparison }) {
  const ascendedDir = path.join(outputDir, 'ascended_heroes');
  const setConfig = payload.sets[0];
  await fs.mkdir(ascendedDir, { recursive: true });
  const finishMatrix = buildFinishMatrix(classified);
  const focusSummary = ascendedFocusFinishSummary(classified, setConfig);
  const agreement = {
    version: 'ASCENDED_HEROES_SOURCE_AGREEMENT_V1',
    generated_at: payload.generated_at,
    source_availability: payload.source_availability,
    source_overlap: sourceOverlap(records),
    source_disagreement: classified.conflicts,
    finish_disagreement: classified.conflicts.filter((row) => row.fact_type === 'printing_finish'),
    reverse_holo_disagreement: classified.conflicts.filter((row) => row.finish_key === 'reverse'),
    unsupported_claims: classified.manual_review,
  };
  const conflicts = {
    version: 'ASCENDED_HEROES_CONFLICTS_V1',
    generated_at: payload.generated_at,
    conflicts: classified.conflicts,
  };
  const gaps = buildAscendedFinishEvidenceGaps(payload, classified, focusSummary);
  const parallelCoverage = buildAscendedParallelCoverage(payload, classified, setConfig);
  const acquisitionQueue = buildAscendedParallelAcquisitionQueue(payload, classified, setConfig, parallelCoverage);
  const normalizationPlan = buildAscendedNormalizationPlan(comparison);

  await writeJson(ascendedDir, 'ascended_heroes_verified_index_v1.json', payload);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_verified_index_v1.md'), buildAscendedIndexMarkdown(payload));
  await writeJson(ascendedDir, 'ascended_heroes_source_agreement_v1.json', agreement);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_source_agreement_v1.md'), buildAscendedAgreementMarkdown(payload, records));
  await writeJson(ascendedDir, 'ascended_heroes_finish_matrix_v1.json', {
    version: 'ASCENDED_HEROES_FINISH_MATRIX_V1',
    generated_at: payload.generated_at,
    finish_profile: setConfig.finish_profile ?? null,
    focus_finishes: setConfig.finish_profile?.focus_finishes ?? uniqueSorted(Object.keys(FINISH_LABELS)),
    not_applicable_finishes: setConfig.finish_profile?.not_applicable_finishes ?? [],
    focus_finish_summary: focusSummary,
    rows: finishMatrix,
  });
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_finish_matrix_v1.md'), buildAscendedFinishMatrixMarkdown(finishMatrix, focusSummary, setConfig));
  await writeJson(ascendedDir, 'ascended_heroes_finish_evidence_gaps_v1.json', gaps);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_finish_evidence_gaps_v1.md'), buildAscendedFinishEvidenceGapsMarkdown(gaps));
  await writeJson(ascendedDir, 'ascended_heroes_parallel_coverage_v1.json', parallelCoverage);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_parallel_coverage_v1.md'), buildAscendedParallelCoverageMarkdown(parallelCoverage));
  await writeJson(ascendedDir, 'ascended_heroes_parallel_acquisition_queue_v1.json', acquisitionQueue);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_parallel_acquisition_queue_v1.md'), buildAscendedParallelAcquisitionQueueMarkdown(acquisitionQueue));
  await writeJson(ascendedDir, 'ascended_heroes_conflicts_v1.json', conflicts);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_conflicts_v1.md'), buildAscendedConflictsMarkdown(payload));
  await writeJson(ascendedDir, 'ascended_heroes_grookai_comparison_v1.json', comparison);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_grookai_comparison_v1.md'), buildAscendedComparisonMarkdown(payload, comparison));
  await writeJson(ascendedDir, 'ascended_heroes_normalization_plan_v1.json', normalizationPlan);
  await fs.writeFile(path.join(ascendedDir, 'ascended_heroes_normalization_plan_v1.md'), buildAscendedNormalizationPlanMarkdown(normalizationPlan));
}

export async function writeReports({
  records,
  classified,
  setConfigs,
  generatedAt,
  outputDir,
  transport,
  sourceAvailability = [],
  grookaiComparison = null,
}) {
  await fs.mkdir(outputDir, { recursive: true });
  const payload = reportPayload({ records, classified, setConfigs, generatedAt, transport, sourceAvailability });
  const agreement = {
    version: 'VERIFIED_MASTER_SET_INDEX_V1_SOURCE_AGREEMENT',
    generated_at: generatedAt,
    source_overlap: sourceOverlap(records),
    source_disagreement: classified.conflicts,
    finish_disagreement: classified.conflicts.filter((row) => row.fact_type === 'printing_finish'),
    reverse_holo_disagreement: classified.conflicts.filter((row) => row.finish_key === 'reverse'),
    unsupported_claims: classified.manual_review,
  };
  const conflicts = {
    version: 'VERIFIED_MASTER_SET_INDEX_V1_CONFLICTS',
    generated_at: generatedAt,
    conflicts: classified.conflicts,
  };
  const comparison = comparisonPayload(payload, grookaiComparison);

  await writeJson(outputDir, 'verified_master_set_index_v1.json', payload);
  await fs.writeFile(path.join(outputDir, 'verified_master_set_index_v1.md'), buildIndexMarkdown(payload));
  await writeJson(outputDir, 'source_agreement_report_v1.json', agreement);
  await fs.writeFile(path.join(outputDir, 'source_agreement_report_v1.md'), buildAgreementMarkdown(payload, records));
  await writeJson(outputDir, 'source_conflicts_v1.json', conflicts);
  await fs.writeFile(path.join(outputDir, 'source_conflicts_v1.md'), buildConflictsMarkdown(payload));
  await writeJson(outputDir, 'grookai_comparison_report_v1.json', comparison);
  await fs.writeFile(path.join(outputDir, 'grookai_comparison_report_v1.md'), buildComparisonMarkdown(payload, comparison));
  await fs.writeFile(path.join(outputDir, 'source_standard_hardening_v1.md'), buildHardeningMarkdown(payload));

  if (setConfigs.length === 1 && setConfigs[0].key === 'ascended_heroes') {
    await writeAscendedReports({ outputDir, payload, records, classified, comparison });
  }

  return payload;
}
