import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const EXHAUSTION_DIR = 'docs/audits/english_master_index_source_exhaustion_v1';
const MASTER_PRINTINGS = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const OUTPUT_JSON = path.join(EXHAUSTION_DIR, 'english_master_index_source_attempt_outcomes_v1.json');
const OUTPUT_MD = path.join(EXHAUSTION_DIR, 'english_master_index_source_attempt_outcomes_v1.md');
const REMAINING_GAPS = path.join(EXHAUSTION_DIR, 'english_master_index_remaining_gap_facts_v1.json');
const FINISH_BLOCKER_CLOSURE = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_finish_blocker_closure_v1.json';
const TCGCSV_ALTERNATE_FINISH_REVIEW = path.join(
  EXHAUSTION_DIR,
  'tcgcsv_acquisition_v1',
  'tcgcsv_candidate_unconfirmed_alternate_finish_review_v1.json',
);

const REPORTS = [
  {
    source_key: 'official_pokemon_checklist_pdf',
    file: 'official_pokemon_checklist_pdf_acquisition_v1/official_pokemon_checklist_pdf_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'official_pokemon_legacy_checklist',
    file: 'official_legacy_checklist_acquisition_v1/official_legacy_checklist_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'tcgcollector_card_variants',
    file: 'tcgcollector_acquisition_v1/tcgcollector_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'reverseholo_set_checklist',
    file: 'reverseholo_acquisition_v1/reverseholo_finish_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'binderbuilder_set_variant',
    file: 'binderbuilder_acquisition_v1/binderbuilder_variant_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'cardtrader_blueprint_index',
    file: 'cardtrader_acquisition_v1/cardtrader_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'pricecharting',
    file: 'pricecharting_acquisition_v1/pricecharting_finish_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pricecharting_csv',
    file: 'pricecharting_csv_acquisition_v1/pricecharting_csv_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pricecharting_csv_promo_exact',
    file: 'pricecharting_promo_exact_acquisition_v1/pricecharting_promo_exact_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pricecharting_csv_product_stamp',
    file: 'pricecharting_product_stamp_acquisition_v1/pricecharting_product_stamp_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'gengar_sve_reverse_variant',
    file: 'gengar_sve_reverse_acquisition_v1/gengar_sve_reverse_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pokescope_svp_variant',
    file: 'pokescope_svp_variant_acquisition_v1/pokescope_svp_variant_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pokescope_sv02_stamp',
    file: 'pokescope_sv02_stamp_acquisition_v1/pokescope_sv02_stamp_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pokescope_me01_stamp',
    file: 'pokescope_me01_stamp_acquisition_v1/pokescope_me01_stamp_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pokescope_pl2_variant',
    file: 'pokescope_pl2_variant_acquisition_v1/pokescope_pl2_variant_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'bulbapedia_sv085_professor_program',
    file: 'bulbapedia_sv085_professor_program_acquisition_v1/bulbapedia_sv085_professor_program_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'bulbapedia_sv05_additional_cards',
    file: 'bulbapedia_sv05_additional_cards_acquisition_v1/bulbapedia_sv05_additional_cards_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'magicmadhouse_swsh9_stamps',
    file: 'magicmadhouse_swsh9_stamps_acquisition_v1/magicmadhouse_swsh9_stamps_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'bulbapedia_swsh11_trick_or_trade_stamps',
    file: 'bulbapedia_swsh11_trick_or_trade_stamps_acquisition_v1/bulbapedia_swsh11_trick_or_trade_stamps_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'magicmadhouse_bw1_league_promos',
    file: 'magicmadhouse_bw1_league_promos_acquisition_v1/magicmadhouse_bw1_league_promos_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pkmncards_identity_gap',
    file: 'pkmncards_identity_gap_acquisition_v1/pkmncards_identity_gap_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'pkmncollectors_sm1_energy',
    file: 'pkmncollectors_sm1_energy_acquisition_v1/pkmncollectors_sm1_energy_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'pkmncollectors_futsal',
    file: 'pkmncollectors_futsal_acquisition_v1/pkmncollectors_futsal_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'pkmncollectors_xya',
    file: 'pkmncollectors_xya_acquisition_v1/pkmncollectors_xya_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'pokemoncard_io_price_breakdown',
    file: 'pokemoncard_io_acquisition_v1/pokemoncard_finish_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'tcgcsv_tcgplayer_catalog',
    file: 'tcgcsv_acquisition_v1/tcgcsv_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'tcgcsv_prize_pack_catalog',
    file: 'tcgcsv_prize_pack_acquisition_v1/tcgcsv_prize_pack_acquisition_v1.json',
    resultSetKey: (row) => row.fact?.set_key ?? row.set_key,
  },
  {
    source_key: 'tcgcsv_tcgplayer_catalog_identity',
    file: 'tcgcsv_identity_acquisition_v1/tcgcsv_identity_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'pokellector_set_checklist',
    file: 'pokellector_identity_acquisition_v1/pokellector_identity_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'pokex_set_checklist',
    file: 'pokex_identity_acquisition_v1/pokex_identity_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'pokescope_variant',
    file: 'pokescope_variant_acquisition_v1/pokescope_variant_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'tcgplayer_pricedex_link',
    file: 'tcgplayer_pricedex_link_acquisition_v1/tcgplayer_pricedex_link_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'tcdb_checklist',
    file: 'tcdb_checklist_acquisition_v1/tcdb_checklist_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'bulbapedia_build_battle_product',
    file: 'bulbapedia_build_battle_acquisition_v1/bulbapedia_build_battle_acquisition_v1.json',
    resultSetKey: (row) => row.source_set_key,
  },
  {
    source_key: 'bulbapedia_battle_academy_product',
    file: 'bulbapedia_battle_academy_acquisition_v1/bulbapedia_battle_academy_acquisition_v1.json',
    resultSetKey: (row) => row.product_key ?? row.set_key,
  },
  {
    source_key: 'bulbapedia_card_page_release_info',
    file: 'bulbapedia_card_page_acquisition_v1/bulbapedia_card_page_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'doubleholo_set_checklist',
    file: 'doubleholo_acquisition_v1/doubleholo_finish_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
  {
    source_key: 'elitefourum_alternate_checklist',
    file: 'elitefourum_alternate_checklist_acquisition_v1/elitefourum_alternate_checklist_acquisition_v1.json',
    resultSetKey: (row) => row.set_key,
  },
];

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };
}

const NO_FALLBACK = Symbol('NO_FALLBACK');

async function readJson(file, fallback = NO_FALLBACK) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (fallback !== NO_FALLBACK && error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

function addCount(target, key, count = 1) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function classifyStatus(status, row = {}) {
  if ((row.records_generated ?? 0) > 0) return 'evidence_found';
  const nestedStatuses = Array.isArray(row.statuses) ? row.statuses.map((item) => item.status).join(' ') : '';
  if (!status && nestedStatuses) {
    if (/source_unavailable|source_error|unparseable|timeout|blocked|failed|error/i.test(nestedStatuses)) {
      return 'source_unavailable_or_blocked';
    }
    if (/no_search_results|no_matching|no_exact|no_target|no_usable|no_validated/i.test(nestedStatuses)) {
      return 'attempted_no_exact_match';
    }
    return 'attempted_other';
  }
  const value = String(status ?? 'unknown');
  if (value === 'generated') return 'evidence_found';
  if (value === 'validated') return 'evidence_found';
  if (value === 'manual_review_context') return 'manual_review_context';
  if (value === 'alternate_finish_observed') return 'manual_review_context';
  if (/unavailable|source_error|unparseable|timeout|blocked/i.test(value)) return 'source_unavailable_or_blocked';
  if (/no_exact|no_matching|no_target|no_usable|no_validated|validated 0/i.test(value)) return 'attempted_no_exact_match';
  return 'attempted_other';
}

function generatedRecordCount(payload) {
  if (Number.isFinite(payload.summary?.records_generated)) return payload.summary.records_generated;
  const byStatus = payload.summary?.by_status ?? {};
  return Number(byStatus.generated ?? 0) + Number(byStatus.validated ?? 0);
}

function gapKey(row) {
  return [
    row.set_key,
    row.fact_type,
    row.card_number ?? '',
    row.card_name ?? '',
    row.finish_key ?? '',
  ].join('|');
}

function finishFactKey(row) {
  return [
    row.set_key,
    row.card_number ?? '',
    String(row.card_name ?? '').trim().toLowerCase(),
    row.finish_key ?? '',
  ].join('|');
}

function buildFinishBlockerMap(blockerClosure) {
  const map = new Map();
  for (const row of blockerClosure.mapped_blockers ?? []) {
    map.set(finishFactKey(row), row);
  }
  return map;
}

function alternateFinishGapKey(row) {
  return [
    row.set_key,
    'printing_finish',
    row.card_number ?? '',
    row.card_name ?? '',
    row.target_finish_key ?? '',
  ].join('|');
}

function printingKey({ set_key, card_number, card_name, finish_key }) {
  return [
    set_key,
    String(card_number ?? '').trim(),
    String(card_name ?? '').trim().toLowerCase(),
    String(finish_key ?? '').trim(),
  ].join('|');
}

function buildMasterPrintingStatus(masterPrintings) {
  const statuses = new Map();
  for (const row of masterPrintings.printings ?? []) {
    statuses.set(printingKey(row), row.status);
  }
  return statuses;
}

function buildAlternateFinishObservations(alternateFinishReview, masterPrintingStatus) {
  const byGapKey = new Map();
  for (const row of alternateFinishReview.rows ?? []) {
    const key = alternateFinishGapKey(row);
    const observedStatus = masterPrintingStatus.get(printingKey({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.observed_finish_key,
    }));
    if (!byGapKey.has(key)) byGapKey.set(key, []);
    byGapKey.get(key).push({
      review_status: observedStatus === 'master_verified'
        ? 'resolved_by_current_master_index'
        : row.review_status,
      target_finish_key: row.target_finish_key,
      observed_finish_key: row.observed_finish_key,
      observed_finish_current_index_status: observedStatus ?? 'not_in_current_master_index',
      source_key: row.candidate_source_key,
      source_kind: row.candidate_source_kind,
      source_url: row.candidate_url,
      evidence_label: row.evidence_label,
      notes: row.notes,
    });
  }
  return byGapKey;
}

function sourceRecommendation(fact, attempts) {
  const classes = new Set(attempts.map((row) => row.result_class));
  const unresolvedAlternateFinishObservations = (fact.alternate_finish_observations ?? [])
    .filter((entry) => entry.review_status !== 'resolved_by_current_master_index');
  if (unresolvedAlternateFinishObservations.length > 0) {
    return 'Blocked from promotion: another source matched the same card identity but reported a different explicit finish. Needs manual finish adjudication.';
  }
  if (fact.gap_type === 'suppressed_structured_claim_reviewed') {
    return 'Keep suppressed until exact human/checklist evidence contradicts the suppression.';
  }
  if (fact.gap_type === 'finish_blocker_boundary' || fact.blocker_type) {
    return 'Blocked from promotion: exact evidence currently indicates a finish-label or card-number conflict. Needs manual adjudication, not more broad source acquisition.';
  }
  if (fact.gap_type === 'finish_second_source_needed') {
    return classes.has('evidence_found')
      ? 'Needs one additional independent exact finish source or manual confirmation of source independence.'
      : 'Needs another exact variant/checklist source; broad source lanes did not match this fact.';
  }
  if (fact.gap_type === 'finish_human_checklist_evidence_needed') {
    return 'Needs exact human-readable/checklist finish evidence; structured/API-only truth remains insufficient.';
  }
  if (fact.gap_type === 'card_identity_second_source_needed') {
    return classes.has('source_unavailable_or_blocked')
      ? 'Retry blocked identity/checklist sources later or use manual official/product evidence.'
      : 'Needs second exact card identity source.';
  }
  return 'Needs manual review.';
}

async function main() {
  const generatedAt = new Date().toISOString();
  const gaps = await readJson(REMAINING_GAPS);
  const finishBlockerClosure = await readJson(FINISH_BLOCKER_CLOSURE, { mapped_blockers: [], summary: {} });
  const alternateFinishReview = await readJson(TCGCSV_ALTERNATE_FINISH_REVIEW, { rows: [], summary: {} });
  const masterPrintings = await readJson(MASTER_PRINTINGS, { printings: [] });
  const finishBlockerMap = buildFinishBlockerMap(finishBlockerClosure);
  const masterPrintingStatus = buildMasterPrintingStatus(masterPrintings);
  const alternateFinishObservationsByGapKey = buildAlternateFinishObservations(alternateFinishReview, masterPrintingStatus);
  const attemptsBySet = new Map();
  const sourceSummaries = [];

  for (const report of REPORTS) {
    const payload = await readJson(path.join(EXHAUSTION_DIR, report.file), null);
    if (!payload) {
      sourceSummaries.push({
        source_key: report.source_key,
        report_file: report.file,
        status: 'report_missing',
        records_generated: 0,
      });
      continue;
    }
    const results = payload.results ?? [];
    const byClass = {};
    for (const row of results) {
      const setKey = report.resultSetKey(row);
      if (!setKey) continue;
      const result = {
        source_key: report.source_key,
        status: row.status ?? 'unknown',
        result_class: classifyStatus(row.status, row),
        records_generated: row.records_generated ?? 0,
        source_url: row.source_url ?? null,
        error: row.error ?? null,
      };
      addCount(byClass, result.result_class);
      if (!attemptsBySet.has(setKey)) attemptsBySet.set(setKey, []);
      attemptsBySet.get(setKey).push(result);
    }
    sourceSummaries.push({
      source_key: report.source_key,
      report_file: report.file,
      status: 'report_available',
      records_generated: generatedRecordCount(payload),
      manual_review_context_records: payload.summary?.by_status?.manual_review_context ?? 0,
      fixture_files_written: payload.summary?.fixture_files_written ?? payload.summary?.fixtures_written ?? 0,
      by_status: payload.summary?.by_status ?? {},
      by_result_class: byClass,
    });
  }

  const rows = [];
  const byGapType = {};
  const byRecommendation = {};
  const bySet = {};
  let alternateFinishBlockedFacts = 0;
  let finishBlockerBoundaryFacts = 0;
  for (const fact of gaps.facts ?? []) {
    const attempts = attemptsBySet.get(fact.set_key) ?? [];
    const uniqueAttemptClasses = [...new Set(attempts.map((row) => row.result_class))];
    const alternate_finish_observations = alternateFinishObservationsByGapKey.get(gapKey(fact)) ?? [];
    const unresolvedAlternateFinishObservations = alternate_finish_observations
      .filter((entry) => entry.review_status !== 'resolved_by_current_master_index');
    if (unresolvedAlternateFinishObservations.length > 0) alternateFinishBlockedFacts += 1;
    const blocker = finishBlockerMap.get(finishFactKey(fact));
    if (blocker) finishBlockerBoundaryFacts += 1;
    const factWithReviewContext = {
      ...fact,
      gap_type: blocker ? 'finish_blocker_boundary' : fact.gap_type,
      blocker_type: blocker?.blocker_type ?? fact.blocker_type ?? null,
      blocker_reason: blocker?.reason_not_promoted ?? fact.blocker_reason ?? null,
      blocker_next_action: blocker?.next_action ?? fact.blocker_next_action ?? null,
      alternate_finish_observations,
    };
    const recommendation = sourceRecommendation(factWithReviewContext, attempts);
    addCount(byGapType, factWithReviewContext.gap_type);
    addCount(byRecommendation, recommendation);
    addCount(bySet, `${fact.set_key}|${fact.set_name}`);
    rows.push({
      ...factWithReviewContext,
      gap_key: gapKey(fact),
      attempted_sources: [...new Set(attempts.map((row) => row.source_key))],
      attempt_classes: uniqueAttemptClasses,
      evidence_sources_found_in_attempts: attempts.filter((row) => row.result_class === 'evidence_found').map((row) => row.source_key),
      blocked_or_unavailable_sources: attempts.filter((row) => row.result_class === 'source_unavailable_or_blocked').map((row) => row.source_key),
      no_exact_match_sources: attempts.filter((row) => row.result_class === 'attempted_no_exact_match').map((row) => row.source_key),
      recommendation,
    });
  }

  const payload = {
    version: 'english_master_index_source_attempt_outcomes_v1',
    generated_at: generatedAt,
    ...safety(),
    summary: {
      remaining_gap_facts: rows.length,
      alternate_finish_blocked_gap_facts: alternateFinishBlockedFacts,
      finish_blocker_boundary_facts: finishBlockerBoundaryFacts,
      by_gap_type: byGapType,
      by_recommendation: byRecommendation,
      top_sets: Object.fromEntries(Object.entries(bySet).sort((a, b) => b[1] - a[1]).slice(0, 40)),
      sources: sourceSummaries,
      manual_review_context_reports: {
        tcgcsv_candidate_unconfirmed_alternate_finish_review_v1: {
          report_file: path.relative(EXHAUSTION_DIR, TCGCSV_ALTERNATE_FINISH_REVIEW),
          rows: alternateFinishReview.summary?.candidate_unconfirmed_alternate_finish_rows ?? 0,
          affected_sets: alternateFinishReview.summary?.affected_sets ?? 0,
          rule: alternateFinishReview.rule ?? 'Manual-review context only.',
        },
      },
    },
    rows,
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# English Master Index Source Attempt Outcomes V1',
    '',
    'Audit only. This report records source attempts and remaining gap classifications. It does not authorize writes, cleanup, quarantine, or public hiding.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Safety',
    '',
    markdownTable(['field', 'value'], Object.entries(safety())),
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['remaining_gap_facts', rows.length],
      ['alternate_finish_blocked_gap_facts', alternateFinishBlockedFacts],
      ['finish_blocker_boundary_facts', finishBlockerBoundaryFacts],
      ['by_gap_type', JSON.stringify(byGapType)],
      ['by_recommendation', JSON.stringify(byRecommendation)],
    ]),
    '',
    '## Source Summaries',
    '',
    markdownTable(
      ['source', 'status', 'records', 'fixtures', 'result classes'],
      sourceSummaries.map((row) => [
        row.source_key,
        row.status,
        row.manual_review_context_records
          ? `${row.records_generated} (+${row.manual_review_context_records} review context)`
          : row.records_generated,
        row.fixture_files_written ?? '',
        JSON.stringify(row.by_result_class ?? {}),
      ]),
    ),
    '',
    '## Top Remaining Sets',
    '',
    markdownTable(
      ['set', 'remaining gaps'],
      Object.entries(payload.summary.top_sets).map(([set, count]) => [set, count]),
    ),
    '',
    '## Remaining Gap Sample',
    '',
    markdownTable(
      ['set', 'number', 'name', 'finish', 'gap', 'status', 'blocker', 'attempt classes', 'alternate finish observations', 'recommendation'],
      rows.slice(0, 200).map((row) => [
        `${row.set_key} ${row.set_name}`,
        row.card_number ?? '',
        row.card_name ?? '',
        row.finish_key ?? '',
        row.gap_type,
        row.status,
        row.blocker_type ?? '',
        row.attempt_classes.join(', '),
        (row.alternate_finish_observations ?? []).map((entry) => `${entry.observed_finish_key} via ${entry.source_key}`).join('; '),
        row.recommendation,
      ]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(OUTPUT_MD, md);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((error) => {
  console.error('[source-attempt-outcomes] failed:', error);
  process.exitCode = 1;
});
