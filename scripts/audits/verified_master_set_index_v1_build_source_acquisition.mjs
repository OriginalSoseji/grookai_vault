import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const GENERATED_FILES = [
  'english_master_index_source_acquisition_v1.json',
  'english_master_index_source_acquisition_v1.md',
  'english_master_index_source_acquisition_queues_v1.json',
  'english_master_index_source_acquisition_queues_v1.md',
];

const LANE_DEFINITIONS = {
  reverse_holo: {
    label: 'Reverse Holo',
    recommended_sources: [
      'Official Pokemon card gallery or downloadable checklist when available',
      'Bulbapedia set checklist with reverse-holo notes',
      'TCGplayer or comparable checklist-style marketplace references',
      'Collector checklist references with exact card-number finish labels',
    ],
    categories: [
      'reverse_holo_overgeneration_candidate',
      'reverse_holo_single_source',
      'api_agreed_reverse_holo_needs_human_source',
      'api_agreed_missing_needs_human_source',
      'single_source_missing_needs_second_source',
    ],
  },
  holo: {
    label: 'Holo',
    recommended_sources: [
      'Official Pokemon card gallery or downloadable checklist when available',
      'Bulbapedia set checklist with rarity and holo treatment notes',
      'TCGplayer or comparable checklist-style marketplace references',
      'Collector checklist references with exact card-number finish labels',
    ],
    categories: [
      'holo_overgeneration_candidate',
      'holo_single_source',
      'api_agreed_holo_needs_human_source',
      'api_agreed_missing_needs_human_source',
      'single_source_missing_needs_second_source',
    ],
  },
  parallel: {
    label: 'Parallel',
    recommended_sources: [
      'Official product or expansion parallel description',
      'Checklist source with exact card-number parallel coverage',
      'Marketplace checklist with parallel-specific listings',
      'Manual review fixture only when the source URL and evidence label are retained',
    ],
    categories: [
      'modern_parallel_exact_finish_needs_source',
      'modern_parallel_set_review',
    ],
  },
  promo: {
    label: 'Promo',
    recommended_sources: [
      'Official promo gallery or product page',
      'Bulbapedia promo-family checklist',
      'Marketplace checklist for sealed/product-exclusive printings',
      'Collector checklist references with promo number and finish label',
    ],
    categories: [
      'promo_family_source_coverage_gap',
      'promo_family_source_only_candidate',
      'promo_family_single_source',
      'api_agreed_promo_family_needs_human_source',
    ],
  },
  subset: {
    label: 'Subset',
    recommended_sources: [
      'Official checklist showing subset numbering',
      'Bulbapedia subset page or set section',
      'Marketplace checklist with subset-specific numbering',
      'Alias governance review for TG/GG/Shiny Vault/Classic Collection-style families',
    ],
    categories: [
      'subset_or_numbering_alias_review',
      'subset_alias_or_numbering_gap',
      'subset_alias_single_source',
      'api_agreed_subset_alias_needs_human_source',
    ],
  },
  legacy: {
    label: 'Legacy',
    recommended_sources: [
      'Official archived checklist when available',
      'Bulbapedia set page with first edition/unlimited and reverse-holo notes',
      'Marketplace checklist with exact legacy finish distinctions',
      'Collector checklist references for first edition, shadowless, stamped, and e-Card-era variants',
    ],
    categories: [
      'first_edition_policy_gap',
      'legacy_or_old_era_single_source',
      'api_agreed_legacy_or_old_era_needs_human_source',
    ],
  },
  alias_resolution: {
    label: 'Alias Resolution',
    recommended_sources: [
      'Source set ID mapping between Grookai set_code and upstream set IDs',
      'Official set names and product-family names',
      'Bulbapedia set-family and subset pages',
      'Manual alias fixture with source URL, evidence label, and non-destructive notes',
    ],
    categories: [
      'set_unmapped',
      'missing_set_code',
      'legacy_orphan',
      'pokemon_pocket_or_digital_source_set',
      'unknown_set_code',
      'name_mismatch_needs_review',
      'source_coverage_or_alias_gap',
      'subset_or_numbering_alias_review',
    ],
  },
};

const CATEGORY_TO_LANES = new Map();
for (const [lane, definition] of Object.entries(LANE_DEFINITIONS)) {
  for (const category of definition.categories) {
    if (!CATEGORY_TO_LANES.has(category)) CATEGORY_TO_LANES.set(category, []);
    CATEGORY_TO_LANES.get(category).push(lane);
  }
}

const TRIAGE_FILES = [
  { key: 'set_unmapped', file: 'english_master_index_set_unmapped_triage_v1.json', setField: 'by_set_code' },
  { key: 'name_mismatch', file: 'english_master_index_name_mismatch_triage_v1.json', setField: 'by_set_code' },
  { key: 'unsupported', file: 'english_master_index_unsupported_triage_v1.json', setField: 'by_set_code' },
  { key: 'missing_from_grookai', file: 'english_master_index_missing_from_grookai_triage_v1.json', setField: 'by_set_key' },
  { key: 'candidate_unconfirmed', file: 'english_master_index_candidate_unconfirmed_triage_v1.json', setField: 'by_set_code' },
  { key: 'api_agreed', file: 'english_master_index_api_agreed_triage_v1.json', setField: 'by_set_code' },
];

const FINISH_TO_LANE = {
  holo: 'holo',
  reverse: 'reverse_holo',
  reverse_holo: 'reverse_holo',
  pokeball: 'parallel',
  poke_ball_reverse: 'parallel',
  rocket_reverse: 'parallel',
  master_ball_reverse: 'parallel',
  cosmos: 'parallel',
  cosmos_holo: 'parallel',
  stamped: 'parallel',
  first_edition_normal: 'legacy',
  first_edition_holo: 'legacy',
};

function normalizeSetKey(value) {
  return String(value ?? 'unknown').trim() || 'unknown';
}

function sumValues(object) {
  return Object.values(object ?? {}).reduce((total, value) => total + Number(value ?? 0), 0);
}

function addCount(target, key, count) {
  target[key] = (target[key] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 25) {
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

function getSetMap(setAudit, truthReadiness) {
  const map = new Map();
  for (const set of setAudit.sets ?? []) {
    map.set(normalizeSetKey(set.key), {
      set_key: normalizeSetKey(set.key),
      set_name: set.set_name ?? null,
      source_status: set.source_status ?? {},
      source_evidence_rows: Object.fromEntries((set.source_availability ?? []).map((source) => [
        source.source_key,
        source.evidence_rows ?? 0,
      ])),
    });
  }
  for (const set of truthReadiness.sets ?? []) {
    const key = normalizeSetKey(set.set_key);
    const existing = map.get(key) ?? { set_key: key, set_name: set.set_name ?? null, source_status: {}, source_evidence_rows: {} };
    existing.set_name = existing.set_name ?? set.set_name ?? null;
    existing.readiness = {
      classification: set.classification,
      readiness_score: set.readiness_score,
      source_coverage_score: set.source_coverage_score,
      finish_profile_score: set.finish_profile_score,
      human_evidence_score: set.human_evidence_score,
      alias_stability_score: set.alias_stability_score,
      conflict_score: set.conflict_score,
      candidate_ratio: set.candidate_ratio,
      master_verified_ratio: set.master_verified_ratio,
      unsupported_ratio: set.unsupported_ratio,
    };
    map.set(key, existing);
  }
  return map;
}

function laneForCategoryAndFinish(category, finishKey) {
  const lanes = CATEGORY_TO_LANES.get(category);
  if (lanes?.length) return lanes;
  const finishLane = FINISH_TO_LANE[String(finishKey ?? '').toLowerCase()];
  return finishLane ? [finishLane] : [];
}

function sampleRowsForCategory(entry, limit = 20) {
  const rows = entry.rows ?? entry.sample_rows ?? [];
  return rows.slice(0, limit).map((row) => ({
    category: row.category,
    status: row.status,
    set_key: normalizeSetKey(row.set_key ?? row.set_code),
    set_code: row.set_code ?? null,
    card_number: row.card_number ?? null,
    card_name: row.index_card_name ?? row.grookai_card_name ?? null,
    finish_key: row.finish_key ?? null,
    source_count: row.source_count ?? null,
    index_sources: row.index_sources ?? [],
    evidence_urls: row.index_evidence_urls ?? [],
    note: row.note ?? row.reason ?? null,
  }));
}

function queuePriority({ lane, category, setCount, readiness }) {
  let score = Number(setCount ?? 0);
  if (lane === 'alias_resolution') score += 250;
  if (lane === 'reverse_holo' || lane === 'holo') score += 120;
  if (lane === 'parallel') score += 100;
  if (/overgeneration|unsupported|invalid|unknown/i.test(category)) score += 150;
  if (/api_agreed/i.test(category)) score += 60;
  if (/single_source|candidate/i.test(category)) score += 40;
  if (readiness?.classification === 'moderate_confidence') score += 40;
  if (readiness?.classification === 'source_limited') score += 20;
  if (readiness?.classification === 'blocked') score -= 20;
  return Number(score.toFixed(2));
}

function workTypeForCategory(category) {
  if (/set_unmapped|set_code|alias|numbering|source_coverage_or_alias|legacy_orphan/i.test(category)) {
    return 'alias_governance';
  }
  if (/overgeneration|unsupported|invalid|unknown/i.test(category)) {
    return 'finish_disproof_or_overgeneration_review';
  }
  if (/api_agreed/i.test(category)) {
    return 'human_checklist_evidence';
  }
  if (/single_source|candidate/i.test(category)) {
    return 'second_source_evidence';
  }
  if (/first_edition|legacy/i.test(category)) {
    return 'legacy_policy_evidence';
  }
  return 'source_acquisition';
}

function mutationAuthorityForCategory(category) {
  if (/set_unmapped|set_code|alias|numbering|source_coverage_or_alias|legacy_orphan/i.test(category)) {
    return 'not mutation authority';
  }
  if (/missing/i.test(category)) return 'not insertion authority';
  if (/unsupported|overgeneration|invalid|unknown/i.test(category)) return 'not deletion authority';
  if (/api_agreed/i.test(category)) return 'not master truth';
  if (/single_source|candidate/i.test(category)) return 'not truth';
  return 'not mutation authority';
}

function addQueueRecord(queueMap, record) {
  const key = [
    record.lane,
    record.set_key,
    record.category,
    record.source_report,
  ].join('|');
  const existing = queueMap.get(key);
  if (!existing) {
    queueMap.set(key, record);
    return;
  }
  existing.row_count += record.row_count;
  existing.priority_score = queuePriority({
    lane: existing.lane,
    category: existing.category,
    setCount: existing.row_count,
    readiness: existing.readiness,
  });
}

function collectTriages({ triages, setMap }) {
  const queueMap = new Map();
  const laneSummaries = Object.fromEntries(Object.keys(LANE_DEFINITIONS).map((lane) => [lane, {
    lane,
    label: LANE_DEFINITIONS[lane].label,
    row_count: 0,
    set_count: 0,
    category_counts: {},
    by_set: {},
    recommended_sources: LANE_DEFINITIONS[lane].recommended_sources,
  }]));
  const categorySummaries = {};
  const samplesByCategory = {};

  for (const triage of triages) {
    for (const [category, entry] of Object.entries(triage.payload.categories ?? {})) {
      const bySet = entry[triage.setField] ?? {};
      const categoryCount = Number(entry.count ?? sumValues(bySet));
      categorySummaries[category] = {
        source_report: triage.file,
        source_key: triage.key,
        count: categoryCount,
        work_type: workTypeForCategory(category),
        mutation_authority: mutationAuthorityForCategory(category),
        lanes: [],
        by_set: bySet,
      };
      samplesByCategory[category] = sampleRowsForCategory(entry);

      for (const [setKeyRaw, countRaw] of Object.entries(bySet)) {
        const setKey = normalizeSetKey(setKeyRaw);
        const count = Number(countRaw ?? 0);
        const set = setMap.get(setKey) ?? { set_key: setKey, set_name: null, source_status: {}, source_evidence_rows: {} };
        const lanes = laneForCategoryAndFinish(category, null);
        if (!lanes.length) continue;
        categorySummaries[category].lanes = [...new Set([...categorySummaries[category].lanes, ...lanes])].sort();

        for (const lane of lanes) {
          const laneSummary = laneSummaries[lane];
          laneSummary.row_count += count;
          addCount(laneSummary.category_counts, category, count);
          addCount(laneSummary.by_set, setKey, count);
          addQueueRecord(queueMap, {
            lane,
            lane_label: LANE_DEFINITIONS[lane].label,
            set_key: setKey,
            set_name: set.set_name ?? null,
            category,
            source_report: triage.file,
            row_count: count,
            priority_score: queuePriority({ lane, category, setCount: count, readiness: set.readiness }),
            work_type: workTypeForCategory(category),
            mutation_authority: mutationAuthorityForCategory(category),
            readiness: set.readiness ?? null,
            source_status: set.source_status ?? {},
            source_evidence_rows: set.source_evidence_rows ?? {},
            recommended_sources: LANE_DEFINITIONS[lane].recommended_sources,
          });
        }
      }
    }
  }

  for (const lane of Object.values(laneSummaries)) {
    lane.set_count = Object.keys(lane.by_set).length;
    lane.top_sets = topEntries(lane.by_set, 25).map(([setKey, count]) => ({
      set_key: setKey,
      set_name: setMap.get(setKey)?.set_name ?? null,
      row_count: count,
      readiness: setMap.get(setKey)?.readiness ?? null,
    }));
  }

  const queue = [...queueMap.values()]
    .sort((left, right) => right.priority_score - left.priority_score || right.row_count - left.row_count || left.set_key.localeCompare(right.set_key));

  return { laneSummaries, categorySummaries, samplesByCategory, queue };
}

function buildReport({ generatedAt, actionPlan, setAudit, truthReadiness, triagePayloads }) {
  const setMap = getSetMap(setAudit, truthReadiness);
  const {
    laneSummaries,
    categorySummaries,
    samplesByCategory,
    queue,
  } = collectTriages({ triages: triagePayloads, setMap });

  const queueSummary = {
    total_queue_items: queue.length,
    by_lane: Object.fromEntries(Object.entries(laneSummaries).map(([lane, summary]) => [lane, summary.row_count])),
    by_work_type: {},
    by_mutation_authority_warning: {},
  };
  for (const record of queue) {
    addCount(queueSummary.by_work_type, record.work_type, record.row_count);
    addCount(queueSummary.by_mutation_authority_warning, record.mutation_authority, record.row_count);
  }

  return {
    version: 'ENGLISH_MASTER_INDEX_SOURCE_ACQUISITION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_reports: [
      'english_master_index_action_plan_v1.json',
      'english_master_index_truth_readiness_v1.json',
      'english_master_index_set_audit_v1.json',
      ...TRIAGE_FILES.map((entry) => entry.file),
    ],
    rule: 'This report creates source-acquisition queues only. It does not promote any fact to master truth and does not authorize insert, update, delete, quarantine, cleanup, or apply.',
    principles: actionPlan.principles,
    safety_checks: {
      report_only_generator: 'scripts/audits/verified_master_set_index_v1_build_source_acquisition.mjs',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_runners_imported: false,
      maintenance_mutation_code_touched: false,
    },
    summary: {
      master_index_sets: actionPlan.summary?.master_index_sets ?? null,
      readiness_by_classification: actionPlan.summary?.readiness_by_classification ?? {},
      queue_summary: queueSummary,
    },
    lanes: laneSummaries,
    categories: categorySummaries,
    evidence_samples_by_category: samplesByCategory,
  };
}

function buildQueueReport({ generatedAt, queue }) {
  return {
    version: 'ENGLISH_MASTER_INDEX_SOURCE_ACQUISITION_QUEUES_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    rule: 'Queue records are planning work only. They are not mutation authority.',
    queues: queue,
  };
}

function buildSourceAcquisitionMarkdown(report) {
  const laneRows = Object.values(report.lanes)
    .sort((left, right) => right.row_count - left.row_count || left.lane.localeCompare(right.lane))
    .map((lane) => [
      lane.lane,
      lane.row_count,
      lane.set_count,
      Object.entries(lane.category_counts).map(([category, count]) => `${category}:${count}`).join(', '),
    ]);
  const categoryRows = Object.entries(report.categories)
    .sort((left, right) => Number(right[1].count) - Number(left[1].count) || left[0].localeCompare(right[0]))
    .slice(0, 80)
    .map(([category, entry]) => [
      category,
      entry.count,
      entry.work_type,
      entry.lanes.length ? entry.lanes.join(', ') : 'not_queued_to_requested_lanes',
      entry.mutation_authority,
    ]);
  const topSetRows = Object.values(report.lanes)
    .flatMap((lane) => lane.top_sets.slice(0, 10).map((set) => [
      lane.lane,
      set.set_key,
      set.set_name ?? '',
      set.row_count,
      set.readiness?.classification ?? '',
      set.readiness?.readiness_score ?? '',
    ]))
    .sort((left, right) => Number(right[3]) - Number(left[3]) || String(left[1]).localeCompare(String(right[1])))
    .slice(0, 80);
  const sourceRows = Object.entries(LANE_DEFINITIONS).map(([lane, definition]) => [
    lane,
    definition.recommended_sources.join('; '),
  ]);
  return [
    '# English Master Index Source Acquisition V1',
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
    '## Queue Summary',
    '',
    markdownTable(['lane', 'rows', 'sets', 'categories'], laneRows),
    '',
    '## Category Summary',
    '',
    markdownTable(['category', 'rows', 'work_type', 'lanes', 'mutation_warning'], categoryRows),
    '',
    '## Top Set Work',
    '',
    markdownTable(['lane', 'set', 'name', 'rows', 'readiness', 'score'], topSetRows),
    '',
    '## Recommended Source Lanes',
    '',
    markdownTable(['lane', 'recommended_sources'], sourceRows),
    '',
    '## Non-Authority Rules',
    '',
    '- `unsupported_by_current_index` is not deletion authority.',
    '- `missing_from_grookai` is not insertion authority.',
    '- `candidate_unconfirmed` is not truth.',
    '- `api_agreed` is not master truth.',
    '- Queue priority is not repair approval.',
    '',
  ].join('\n');
}

function buildQueueMarkdown(report) {
  const rows = report.queues.slice(0, 200).map((record) => [
    record.priority_score,
    record.lane,
    record.set_key,
    record.set_name ?? '',
    record.category,
    record.row_count,
    record.work_type,
    record.readiness?.classification ?? '',
    record.mutation_authority,
  ]);
  return [
    '# English Master Index Source Acquisition Queues V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    report.rule,
    '',
    'This is the ranked queue for evidence acquisition only. It does not authorize database mutation.',
    '',
    markdownTable([
      'priority',
      'lane',
      'set',
      'name',
      'category',
      'rows',
      'work_type',
      'readiness',
      'mutation_warning',
    ], rows),
    '',
  ].join('\n');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [
    actionPlan,
    truthReadiness,
    setAudit,
    ...triages
  ] = await Promise.all([
    readJson('english_master_index_action_plan_v1.json'),
    readJson('english_master_index_truth_readiness_v1.json'),
    readJson('english_master_index_set_audit_v1.json'),
    ...TRIAGE_FILES.map((entry) => readJson(entry.file)),
  ]);

  const triagePayloads = TRIAGE_FILES.map((entry, index) => ({
    ...entry,
    payload: triages[index],
  }));
  const setMap = getSetMap(setAudit, truthReadiness);
  const { queue } = collectTriages({ triages: triagePayloads, setMap });
  const acquisitionReport = buildReport({
    generatedAt,
    actionPlan,
    setAudit,
    truthReadiness,
    triagePayloads,
  });
  const queueReport = buildQueueReport({ generatedAt, queue });

  await Promise.all([
    writeJson('english_master_index_source_acquisition_v1.json', acquisitionReport),
    writeMarkdown('english_master_index_source_acquisition_v1.md', buildSourceAcquisitionMarkdown(acquisitionReport)),
    writeJson('english_master_index_source_acquisition_queues_v1.json', queueReport),
    writeMarkdown('english_master_index_source_acquisition_queues_v1.md', buildQueueMarkdown(queueReport)),
  ]);

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    queue_summary: acquisitionReport.summary.queue_summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[master-index-source-acquisition] failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
