import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const GENERATED_FILES = [
  'english_master_index_alias_resolution_v1.json',
  'english_master_index_alias_resolution_v1.md',
  'english_master_index_alias_resolution_queues_v1.json',
  'english_master_index_alias_resolution_queues_v1.md',
  'english_master_index_alias_fixture_candidates_v1.json',
  'english_master_index_alias_fixture_candidates_v1.md',
];

const SOURCE_URLS = {
  pokemontcg_api: (alias) => `https://api.pokemontcg.io/v2/sets/${encodeURIComponent(alias)}`,
  tcgdex: (alias) => `https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(alias)}`,
};

const CARD_SOURCE_URLS = {
  pokemontcg_api: (setKey, cardNumber) => `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(`${setKey}-${cardNumber}`)}`,
  tcgdex: (setKey, cardNumber) => `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(`${setKey}-${cardNumber}`)}`,
};

function normalizeSetKey(value) {
  return String(value ?? 'unknown').trim() || 'unknown';
}

function addCount(target, key, count) {
  target[key] = (target[key] ?? 0) + Number(count ?? 0);
}

function sumValues(object) {
  return Object.values(object ?? {}).reduce((total, value) => total + Number(value ?? 0), 0);
}

function topEntries(object, limit = 50) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
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

function aliasEvidenceUrl(sourceKey, sourceAlias) {
  const builder = SOURCE_URLS[sourceKey];
  return builder && sourceAlias ? builder(sourceAlias) : null;
}

function cardEvidenceUrls(row) {
  return (row.index_sources ?? []).map((sourceKey) => {
    const sourceSet = row.set_key ?? row.set_code;
    const builder = CARD_SOURCE_URLS[sourceKey];
    return builder && sourceSet && row.card_number ? builder(sourceSet, row.card_number) : null;
  }).filter(Boolean);
}

function classificationForAliasQueue(category, setKey) {
  if (category === 'missing_set_code' || setKey === 'unknown') {
    return {
      classification: 'provenance_required',
      resolution_rule: 'Cannot create a set alias because Grookai row lacks a source set code. Recover original ingestion provenance or source row evidence first.',
      mutation_safe: false,
    };
  }
  if (category === 'out_of_scope_pocket') {
    return {
      classification: 'scope_exclusion_required',
      resolution_rule: 'Pocket/digital set rows must remain outside the English physical TCG master index unless scope is explicitly expanded.',
      mutation_safe: false,
    };
  }
  if (/subset|numbering|collision/i.test(category)) {
    return {
      classification: 'subset_alias_required',
      resolution_rule: 'Resolve set/subset identity with source-backed numbering evidence before any printing truth decision.',
      mutation_safe: false,
    };
  }
  if (/name|diacritic|punctuation|prefix|suffix|parenthetical|lvx/i.test(category)) {
    return {
      classification: 'name_alias_review',
      resolution_rule: 'Review card-name alias style only after set identity and card number are stable.',
      mutation_safe: false,
    };
  }
  if (category === 'legacy_orphan') {
    return {
      classification: 'legacy_orphan_review',
      resolution_rule: 'Legacy orphan rows need source provenance and set-family evidence before they can join the master index.',
      mutation_safe: false,
    };
  }
  return {
    classification: 'manual_alias_review',
    resolution_rule: 'Manual source-backed review required.',
    mutation_safe: false,
  };
}

function buildSetLookup(sets) {
  const lookup = new Map();
  for (const set of sets.sets ?? []) {
    lookup.set(normalizeSetKey(set.key), set);
  }
  return lookup;
}

function buildExistingSourceAliasCandidates(sets) {
  const candidates = [];
  for (const set of sets.sets ?? []) {
    for (const [sourceKey, sourceAlias] of Object.entries(set.source_aliases ?? {})) {
      if (!sourceAlias) continue;
      candidates.push({
        candidate_type: 'existing_master_index_source_alias',
        status: 'source_backed_reference_only',
        internal_set_key: set.key,
        set_name: set.set_name,
        source_key: sourceKey,
        source_alias: sourceAlias,
        source_url: aliasEvidenceUrl(sourceKey, sourceAlias),
        evidence_label: `${sourceKey} set alias ${sourceAlias}`,
        source_status: set.source_status?.[sourceKey] ?? null,
        note: 'This records the current source-backed index alias. It does not authorize DB mutation.',
      });
    }
  }
  return candidates.sort((left, right) => left.internal_set_key.localeCompare(right.internal_set_key) || left.source_key.localeCompare(right.source_key));
}

function sampleRows(entry, limit = 25) {
  return (entry.rows ?? entry.sample_rows ?? []).slice(0, limit).map((row) => ({
    category: row.category,
    status: row.status,
    set_key: normalizeSetKey(row.set_key ?? row.set_code),
    set_code: row.set_code ?? null,
    card_number: row.card_number ?? null,
    grookai_card_name: row.grookai_card_name ?? null,
    index_card_name: row.index_card_name ?? null,
    finish_key: row.finish_key ?? null,
    grookai_card_print_id: row.grookai_card_print_id ?? null,
    grookai_printing_id: row.grookai_printing_id ?? null,
    index_sources: row.index_sources ?? [],
    evidence_urls: cardEvidenceUrls(row),
    note: row.note ?? null,
  }));
}

function collectAliasQueue({ sourceAcquisitionQueues, setUnmapped, nameMismatch, unsupported, setLookup }) {
  const queues = [];
  const byCategory = {};
  const bySet = {};
  const samples = {};

  for (const record of sourceAcquisitionQueues.queues ?? []) {
    if (record.lane !== 'alias_resolution') continue;
    const rule = classificationForAliasQueue(record.category, record.set_key);
    queues.push({
      ...record,
      alias_classification: rule.classification,
      resolution_rule: rule.resolution_rule,
      mutation_safe: rule.mutation_safe,
      source_requirement: 'At least one human-readable, official, or checklist-style source URL plus exact evidence label before alias fixture approval.',
    });
    addCount(byCategory, record.category, record.row_count);
    addCount(bySet, record.set_key, record.row_count);
  }

  for (const [sourceName, payload] of Object.entries({ setUnmapped, nameMismatch, unsupported })) {
    for (const [category, entry] of Object.entries(payload.categories ?? {})) {
      if (!/set|alias|number|collision|energy|diacritic|punctuation|suffix|parenthetical|orphan|scope|pocket/i.test(category)) continue;
      samples[category] = {
        source_report: payload.source_report ?? `${sourceName}.json`,
        count: Number(entry.count ?? sumValues(entry.by_set_code ?? entry.by_set_key ?? {})),
        sample_rows: sampleRows(entry),
      };
      if (sourceName === 'setUnmapped' || sourceName === 'nameMismatch') {
        for (const [setKeyRaw, count] of Object.entries(entry.by_set_code ?? {})) {
          const setKey = normalizeSetKey(setKeyRaw);
          const rule = classificationForAliasQueue(category, setKey);
          queues.push({
            lane: 'alias_resolution',
            lane_label: 'Alias Resolution',
            set_key: setKey,
            set_name: setLookup.get(setKey)?.set_name ?? null,
            category,
            source_report: sourceName === 'setUnmapped'
              ? 'english_master_index_set_unmapped_triage_v1.json'
              : 'english_master_index_name_mismatch_triage_v1.json',
            row_count: Number(count ?? 0),
            priority_score: Number((Number(count ?? 0) + 180).toFixed(2)),
            work_type: 'alias_governance',
            mutation_authority: 'not mutation authority',
            alias_classification: rule.classification,
            resolution_rule: rule.resolution_rule,
            mutation_safe: false,
            source_requirement: 'Card-name alias evidence must remain separate from set-alias evidence.',
          });
          addCount(byCategory, category, count);
          addCount(bySet, setKey, count);
        }
      }
    }
  }

  const deduped = new Map();
  for (const queue of queues) {
    const key = `${queue.set_key}|${queue.category}|${queue.source_report}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, queue);
      continue;
    }
    existing.row_count = Math.max(existing.row_count, queue.row_count);
    existing.priority_score = Math.max(existing.priority_score ?? 0, queue.priority_score ?? 0);
  }

  const dedupedQueues = [...deduped.values()]
    .sort((left, right) => Number(right.priority_score ?? 0) - Number(left.priority_score ?? 0) || Number(right.row_count ?? 0) - Number(left.row_count ?? 0) || left.set_key.localeCompare(right.set_key));
  const finalByCategory = {};
  const finalBySet = {};
  for (const queue of dedupedQueues) {
    addCount(finalByCategory, queue.category, queue.row_count);
    addCount(finalBySet, queue.set_key, queue.row_count);
  }

  return {
    queues: dedupedQueues,
    byCategory: finalByCategory,
    bySet: finalBySet,
    samples,
  };
}

function buildManualFixtureCandidates({ aliasQueues, sourceAliasCandidates }) {
  const manualCandidates = aliasQueues.queues.slice(0, 100).map((queue) => ({
    candidate_type: 'manual_alias_resolution_needed',
    status: queue.alias_classification,
    internal_set_key: queue.set_key,
    set_name: queue.set_name,
    category: queue.category,
    row_count: queue.row_count,
    source_key: null,
    source_alias: null,
    source_url: null,
    evidence_label: null,
    required_fields: [
      'source_key',
      'source_kind',
      'source_url',
      'internal_set_key',
      'external_set_alias',
      'set_name',
      'evidence_type',
      'evidence_label',
      'notes',
    ],
    note: queue.resolution_rule,
  }));
  return [...sourceAliasCandidates, ...manualCandidates];
}

function buildAliasResolutionReport({
  generatedAt,
  actionPlan,
  setUnmapped,
  nameMismatch,
  sourceAcquisition,
  aliasQueues,
  fixtureCandidates,
}) {
  return {
    version: 'ENGLISH_MASTER_INDEX_ALIAS_RESOLUTION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_reports: [
      'english_master_index_action_plan_v1.json',
      'english_master_index_source_acquisition_v1.json',
      'english_master_index_source_acquisition_queues_v1.json',
      'english_master_index_set_unmapped_triage_v1.json',
      'english_master_index_name_mismatch_triage_v1.json',
      'english_master_index_unsupported_triage_v1.json',
      'english_master_index_sets_v1.json',
    ],
    rule: 'Alias Resolution V1 is audit-only. It creates source-backed alias candidates and manual review queues only; it does not mutate canon or resolve aliases automatically.',
    principles: actionPlan.principles,
    safety_checks: {
      report_only_generator: 'scripts/audits/verified_master_set_index_v1_build_alias_resolution.mjs',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_runners_imported: false,
      maintenance_mutation_code_touched: false,
    },
    summary: {
      set_unmapped_total: setUnmapped.summary?.total_set_unmapped ?? 0,
      name_mismatch_total: nameMismatch.summary?.total_name_mismatch ?? 0,
      source_acquisition_alias_rows: sourceAcquisition.summary?.queue_summary?.by_lane?.alias_resolution ?? 0,
      alias_queue_items: aliasQueues.queues.length,
      source_backed_existing_alias_candidates: fixtureCandidates.filter((row) => row.candidate_type === 'existing_master_index_source_alias').length,
      manual_alias_resolution_candidates: fixtureCandidates.filter((row) => row.candidate_type === 'manual_alias_resolution_needed').length,
      by_category: aliasQueues.byCategory,
      top_sets: topEntries(aliasQueues.bySet, 25).map(([setKey, count]) => ({ set_key: setKey, row_count: count })),
    },
    blocked_rules: {
      missing_set_code: 'Blocked until source provenance is recovered. Do not infer set identity from name/number alone.',
      out_of_scope_pocket: 'Blocked from English physical TCG master index unless scope changes.',
      subset_number_collision: 'Blocked until subset numbering and source set alias are proven together.',
      name_mismatch: 'Blocked from identity rewrite; review as card-name display/alias evidence only.',
    },
    evidence_samples_by_category: aliasQueues.samples,
  };
}

function buildQueueReport(generatedAt, aliasQueues) {
  return {
    version: 'ENGLISH_MASTER_INDEX_ALIAS_RESOLUTION_QUEUES_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    rule: 'Alias queue rows are planning-only and never mutation authority.',
    queues: aliasQueues.queues,
  };
}

function buildFixtureReport(generatedAt, fixtureCandidates) {
  return {
    version: 'ENGLISH_MASTER_INDEX_ALIAS_FIXTURE_CANDIDATES_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    rule: 'Fixture candidates are evidence scaffolds only. Manual candidates require URLs and evidence labels before they can become approved fixtures.',
    required_fixture_shape: {
      source_key: 'string',
      source_kind: 'official_gallery | human_readable_checklist | marketplace_checklist | collector_reference | manual_review',
      source_url: 'string',
      internal_set_key: 'string',
      external_set_alias: 'string',
      set_name: 'string',
      evidence_type: 'set_alias | subset_alias | numbering_rule | scope_exclusion | name_alias_review',
      evidence_label: 'short human-readable label',
      notes: 'short note explaining exactly what the source proves',
    },
    candidates: fixtureCandidates,
  };
}

function buildAliasMarkdown(report) {
  const summaryRows = Object.entries(report.summary).filter(([, value]) => typeof value !== 'object').map(([key, value]) => [key, value]);
  const categoryRows = Object.entries(report.summary.by_category ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .map(([category, count]) => [category, count]);
  const topSetRows = report.summary.top_sets.map((row) => [row.set_key, row.row_count]);
  const blockedRows = Object.entries(report.blocked_rules).map(([key, value]) => [key, value]);
  return [
    '# English Master Index Alias Resolution V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    report.rule,
    '',
    'No DB writes, migrations, cleanup, quarantine, apply, insert, update, or delete operations were performed.',
    '',
    '## Safety Confirmation',
    '',
    markdownTable(['check', 'value'], Object.entries(report.safety_checks).map(([key, value]) => [key, value])),
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], summaryRows),
    '',
    '## Category Counts',
    '',
    markdownTable(['category', 'rows'], categoryRows),
    '',
    '## Top Alias Blocked Sets',
    '',
    markdownTable(['set', 'rows'], topSetRows),
    '',
    '## Blocked Rules',
    '',
    markdownTable(['bucket', 'rule'], blockedRows),
    '',
    '## Non-Authority Rules',
    '',
    '- Missing set code is not alias evidence.',
    '- Subset number collision is not proof of the target subset.',
    '- Name mismatch is not identity rewrite authority.',
    '- Existing source aliases are reference evidence only until a controlled proof loop consumes them.',
    '',
  ].join('\n');
}

function buildQueueMarkdown(report) {
  const rows = report.queues.slice(0, 200).map((queue) => [
    queue.priority_score,
    queue.alias_classification,
    queue.set_key,
    queue.set_name ?? '',
    queue.category,
    queue.row_count,
    queue.source_report,
    queue.resolution_rule,
  ]);
  return [
    '# English Master Index Alias Resolution Queues V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    report.rule,
    '',
    markdownTable(['priority', 'classification', 'set', 'name', 'category', 'rows', 'source_report', 'resolution_rule'], rows),
    '',
  ].join('\n');
}

function buildFixtureMarkdown(report) {
  const rows = report.candidates.slice(0, 200).map((candidate) => [
    candidate.candidate_type,
    candidate.status,
    candidate.internal_set_key,
    candidate.set_name ?? '',
    candidate.source_key ?? '',
    candidate.source_alias ?? '',
    candidate.source_url ?? '',
    candidate.evidence_label ?? '',
  ]);
  return [
    '# English Master Index Alias Fixture Candidates V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    report.rule,
    '',
    'Manual candidates with blank source fields are not approved fixtures. They are work items for evidence acquisition.',
    '',
    markdownTable(['type', 'status', 'set', 'name', 'source', 'alias', 'url', 'evidence'], rows),
    '',
  ].join('\n');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [
    actionPlan,
    sourceAcquisition,
    sourceAcquisitionQueues,
    setUnmapped,
    nameMismatch,
    unsupported,
    sets,
  ] = await Promise.all([
    readJson('english_master_index_action_plan_v1.json'),
    readJson('english_master_index_source_acquisition_v1.json'),
    readJson('english_master_index_source_acquisition_queues_v1.json'),
    readJson('english_master_index_set_unmapped_triage_v1.json'),
    readJson('english_master_index_name_mismatch_triage_v1.json'),
    readJson('english_master_index_unsupported_triage_v1.json'),
    readJson('english_master_index_sets_v1.json'),
  ]);

  const setLookup = buildSetLookup(sets);
  const sourceAliasCandidates = buildExistingSourceAliasCandidates(sets);
  const aliasQueues = collectAliasQueue({
    sourceAcquisitionQueues,
    setUnmapped,
    nameMismatch,
    unsupported,
    setLookup,
  });
  const fixtureCandidates = buildManualFixtureCandidates({
    aliasQueues,
    sourceAliasCandidates,
  });
  const aliasReport = buildAliasResolutionReport({
    generatedAt,
    actionPlan,
    setUnmapped,
    nameMismatch,
    sourceAcquisition,
    aliasQueues,
    fixtureCandidates,
  });
  const queueReport = buildQueueReport(generatedAt, aliasQueues);
  const fixtureReport = buildFixtureReport(generatedAt, fixtureCandidates);

  await Promise.all([
    writeJson('english_master_index_alias_resolution_v1.json', aliasReport),
    writeMarkdown('english_master_index_alias_resolution_v1.md', buildAliasMarkdown(aliasReport)),
    writeJson('english_master_index_alias_resolution_queues_v1.json', queueReport),
    writeMarkdown('english_master_index_alias_resolution_queues_v1.md', buildQueueMarkdown(queueReport)),
    writeJson('english_master_index_alias_fixture_candidates_v1.json', fixtureReport),
    writeMarkdown('english_master_index_alias_fixture_candidates_v1.md', buildFixtureMarkdown(fixtureReport)),
  ]);

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    alias_queue_items: aliasQueues.queues.length,
    fixture_candidates: fixtureCandidates.length,
    top_alias_sets: aliasReport.summary.top_sets.slice(0, 10),
  }, null, 2));
}

main().catch((error) => {
  console.error(`[master-index-alias-resolution] failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
