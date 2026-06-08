import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const SOURCE_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const COMPLETION_DIR = 'docs/audits/english_master_index_completion_v1';
const OUTPUT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1';
const FINISH_BLOCKER_CLOSURE_FILE = 'english_master_index_finish_blocker_closure_v1.json';

const GENERATED_FILES = [
  'english_master_index_source_exhaustion_ledger_v1.json',
  'english_master_index_source_exhaustion_ledger_v1.md',
  'english_master_index_remaining_gap_facts_v1.json',
  'english_master_index_remaining_gap_facts_v1.md',
  'english_master_index_source_attempt_queue_v1.json',
  'english_master_index_source_attempt_queue_v1.md',
];

const SOURCE_CATALOG = [
  {
    source_key: 'pokemontcg_api',
    source_kind: 'structured_api',
    automation_status: 'automated',
    evidence_strength: 'card_identity_and_structured_finish_candidates',
    source_url_template: 'https://api.pokemontcg.io/v2/cards?q=set.id:{set_id}',
    finish_truth_limit: 'Structured API finish claims are not master truth without human/checklist support.',
  },
  {
    source_key: 'tcgdex',
    source_kind: 'structured_api',
    automation_status: 'automated',
    evidence_strength: 'card_identity_and_structured_finish_candidates',
    source_url_template: 'https://api.tcgdex.net/v2/en/sets/{set_id}',
    finish_truth_limit: 'Structured API finish claims are not master truth without human/checklist support.',
  },
  {
    source_key: 'thepricedex_price_list',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated',
    evidence_strength: 'card_identity_and_exact_variant_rows_when_present',
    source_url_template: 'https://www.thepricedex.com/set/{set_id}/{set_slug}/price-list',
    finish_truth_limit: 'Only explicit card-level variants become finish_presence evidence.',
  },
  {
    source_key: 'pkmncards',
    source_kind: 'collector_reference',
    automation_status: 'automated',
    evidence_strength: 'card_identity',
    source_url_template: 'https://pkmncards.com/set/{set_slug}/',
    finish_truth_limit: 'Current adapter does not emit finish truth.',
  },
  {
    source_key: 'bulbapedia_set_list',
    source_kind: 'human_readable_checklist',
    automation_status: 'optional_guarded',
    evidence_strength: 'card_identity_and_rarity_context',
    source_url_template: 'https://bulbapedia.bulbagarden.net/wiki/{set_title}_(TCG)#Set_lists',
    finish_truth_limit: 'Current adapter records rarity context but does not infer finish truth.',
  },
  {
    source_key: 'bulbapedia_battle_academy_product',
    source_kind: 'human_readable_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact_product_deck_marked_printings',
    source_url_template: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_{year}_(TCG)',
    finish_truth_limit: 'Only exact deck-list rows on pages that state Battle Academy cards have colored silhouettes/deck marks may support stamped finish truth.',
  },
  {
    source_key: 'official_pokemon_checklist',
    source_kind: 'official_gallery',
    automation_status: 'partial_parser',
    evidence_strength: 'official_checklist_when_pdf_text_is_extractable',
    source_url_template: 'https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/{set_id}_web_cardlist_en.pdf',
    finish_truth_limit: 'PDF extraction is incomplete; failed extraction is not disagreement.',
  },
  {
    source_key: 'tcgplayer_product_or_checklist',
    source_kind: 'marketplace_checklist',
    automation_status: 'queued',
    evidence_strength: 'exact_product_variant_or_price_guide_rows',
    source_url_template: 'https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q={set_name}',
    finish_truth_limit: 'Must prove exact card + finish from product/checklist page, not search result existence.',
  },
  {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact SVE reverse product/variant pages',
    source_url_template: 'https://www.gengar.cz/p/{card_slug}-reverse-holo-sve-{number}',
    finish_truth_limit: 'SVE-only lane. Accepts only exact card number, card name, Scarlet & Violet Energies context, and reverse holo page/variant evidence.',
  },
  {
    source_key: 'facetofacegames_sve_reverse_product',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact SVE reverse product pages',
    source_url_template: 'https://facetofacegames.com/products/{card_slug}-{number}-common-sve-{number}-reverse-holo',
    finish_truth_limit: 'SVE-only fallback lane. Accepts only exact product title plus reverse finish and collector number labels.',
  },
  {
    source_key: 'pokesov_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact SVE reverse product variant rows',
    source_url_template: 'https://www.pokesov.cz/{card_slug}-sve-{number}/',
    finish_truth_limit: 'SVE-only fallback lane. Accepts only exact product identity plus explicit Reverse Holo variant metadata.',
  },
  {
    source_key: 'pokescope_svp_variant',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact SVP promo product/variant pages',
    source_url_template: 'https://pokescope.app/card/svp-{number}/',
    finish_truth_limit: 'SVP-only lane. Accepts only exact Scarlet & Violet Black Star Promos identity plus explicit embedded variant/finish evidence.',
  },
  {
    source_key: 'pricecharting_svp_winner_variant',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact SVP World Championships Winner product page',
    source_url_template: 'https://www.pricecharting.com/game/pokemon-promo/pikachu-world-championships-winner-225',
    finish_truth_limit: 'Single exact SVP #225 lane. Accepts only product title/text matching Pikachu, #225, Pokemon Promo, and World Championships Winner.',
  },
  {
    source_key: 'pokescope_sv02_stamp',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact Paldea Evolved stamped product/variant pages',
    source_url_template: 'https://pokescope.app/card/sv2-{number}/',
    finish_truth_limit: 'SV02-only lane. Accepts only exact Paldea Evolved identity plus explicit embedded stamp variant evidence.',
  },
  {
    source_key: 'pokescope_me01_stamp',
    source_kind: 'marketplace_checklist',
    automation_status: 'automated_guarded',
    evidence_strength: 'exact Mega Evolution Play Pokemon stamped product/variant pages',
    source_url_template: 'https://pokescope.app/card/me1-{number}/',
    finish_truth_limit: 'ME01-only lane. Accepts only exact Mega Evolution identity plus explicit embedded Play Pokemon stamp variant evidence.',
  },
  {
    source_key: 'pokescope_pl2_variant',
    source_kind: 'marketplace_checklist',
    automation_status: 'manual_guarded',
    evidence_strength: 'exact Rising Rivals card-level variant pages',
    source_url_template: 'https://pokescope.app/card/pl2-{number}/',
    finish_truth_limit: 'PL2-only lane. Accepts only exact Rising Rivals identity plus explicit Holofoil or League Stamp variant evidence. League Stamp maps to stamped only for exact card-level source pages.',
  },
  {
    source_key: 'bulbapedia_sv085_professor_program',
    source_kind: 'human_readable_checklist',
    automation_status: 'manual_guarded',
    evidence_strength: 'exact Prismatic Evolutions additional-card Professor Program Logo rows',
    source_url_template: 'https://bulbapedia.bulbagarden.net/wiki/Prismatic_Evolutions_(TCG)',
    finish_truth_limit: 'SV08.5-only lane. Accepts only exact Additional Cards rows naming Professor Program Logo. Generic Promotion markers and rarity icons are not finish truth.',
  },
  {
    source_key: 'bulbapedia_sv05_additional_cards',
    source_kind: 'human_readable_checklist',
    automation_status: 'manual_guarded',
    evidence_strength: 'exact Temporal Forces additional-card finish and stamp rows',
    source_url_template: 'https://bulbapedia.bulbagarden.net/wiki/Temporal_Forces_(TCG)',
    finish_truth_limit: 'SV05-only lane. Accepts only exact Additional Cards rows naming Cosmos Holo or a specific stamp. Generic Promotion markers and rarity icons are not finish truth.',
  },
  {
    source_key: 'magicmadhouse_swsh9_stamps',
    source_kind: 'marketplace_checklist',
    automation_status: 'manual_guarded',
    evidence_strength: 'exact Brilliant Stars stamped product pages',
    source_url_template: 'https://magicmadhouse.co.uk/pokemon-brilliant-stars-{number}-172-{card_slug}-{variant_slug}',
    finish_truth_limit: 'SWSH9-only lane. Accepts only exact product titles naming card number, card name, and Prize Pack League Promo or Pikachu Pumpkin Stamp. No set-wide inference is allowed.',
  },
  {
    source_key: 'bulbapedia_swsh11_trick_or_trade_stamps',
    source_kind: 'human_readable_checklist',
    automation_status: 'manual_guarded',
    evidence_strength: 'exact Lost Origin Trick or Trade 2023 stamped release-info pages',
    source_url_template: 'https://bulbapedia.bulbagarden.net/wiki/{card_name}_(Lost_Origin_{number})',
    finish_truth_limit: 'SWSH11-only lane. Accepts only exact card release pages naming Lost Origin card number, card name, Mirage Holofoil, and Pikachu jack-o-lantern stamp. General Trick or Trade set membership is not enough.',
  },
  {
    source_key: 'magicmadhouse_bw1_league_promos',
    source_kind: 'marketplace_checklist',
    automation_status: 'manual_guarded',
    evidence_strength: 'exact Black & White Play! Pokemon League Promo product pages',
    source_url_template: 'https://magicmadhouse.co.uk/pokemon-black-white-{number}-114-{card_slug}-play-pokemon-league-promo',
    finish_truth_limit: 'BW1-only lane. Accepts only exact product titles naming card number, card name, and Play! Pokemon League Promo. No set-wide league-promo inference is allowed.',
  },
  {
    source_key: 'pricecharting',
    source_kind: 'marketplace_checklist',
    automation_status: 'queued',
    evidence_strength: 'card_identity_and_variant_market_rows',
    source_url_template: 'https://www.pricecharting.com/search-products?q={set_name}+pokemon&type=prices',
    finish_truth_limit: 'Must prove exact card + finish from a specific item row.',
  },
  {
    source_key: 'collectr_or_pokellector_style_checklist',
    source_kind: 'collector_reference',
    automation_status: 'queued',
    evidence_strength: 'collector_checklist_identity_and_possible_variant_context',
    source_url_template: 'source-specific set checklist URL required',
    finish_truth_limit: 'Only exact variant labels may support finish truth.',
  },
  {
    source_key: 'cardmarket_cardtrader_marketplace',
    source_kind: 'marketplace_checklist',
    automation_status: 'queued',
    evidence_strength: 'marketplace card and variant listings',
    source_url_template: 'source-specific set or product URL required',
    finish_truth_limit: 'Marketplace rows must be exact and English scoped.',
  },
  {
    source_key: 'graded_registry_or_cert_population',
    source_kind: 'collector_reference',
    automation_status: 'queued',
    evidence_strength: 'physical-card existence support for hard gaps',
    source_url_template: 'PSA/CGC/BGS certification or population search URL required',
    finish_truth_limit: 'Useful for physical existence, not bulk finish inference.',
  },
  {
    source_key: 'reddit_forum_or_photo_evidence',
    source_kind: 'manual_review',
    automation_status: 'last_resort_manual',
    evidence_strength: 'physical evidence candidate only',
    source_url_template: 'exact public post/image URL required',
    finish_truth_limit: 'Does not become master truth alone; must be paired with another independent source.',
  },
];

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
  };
}

async function readJson(dir, fileName, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, fileName), 'utf8'));
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}

async function writeJson(fileName, data) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, markdown) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), markdown);
}

function evidenceUrls(row) {
  if (Array.isArray(row.evidence_urls)) return row.evidence_urls.filter(Boolean);
  return (row.evidence ?? []).map((entry) => entry.source_url).filter(Boolean);
}

function addCount(target, key, count = 1) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 40) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function sourceAvailabilityBySet(sourceAvailability) {
  const map = new Map();
  for (const row of sourceAvailability.source_availability ?? []) {
    const setKey = String(row.set_key ?? 'unknown');
    if (!map.has(setKey)) map.set(setKey, []);
    map.get(setKey).push(row);
  }
  return map;
}

function rowSetKey(row) {
  return String(row.set_key ?? row.set_code ?? 'unknown').trim() || 'unknown';
}

function finishFactKey(row) {
  return [
    row.set_key,
    row.card_number ?? '',
    String(row.card_name ?? '').trim().toLowerCase(),
    row.finish_key ?? row.gap_finish_key ?? '',
  ].join('|');
}

function buildFinishBlockerMap(blockerClosure) {
  const map = new Map();
  for (const row of blockerClosure.mapped_blockers ?? []) {
    map.set(finishFactKey(row), row);
  }
  return map;
}

function gapTypeForFact(row) {
  if (row.fact_type === 'card_identity') return 'card_identity_second_source_needed';
  if (row.fact_type === 'printing_finish' && row.status === 'human_source_verified') return 'finish_second_source_needed';
  if (row.fact_type === 'printing_finish') return 'finish_human_checklist_evidence_needed';
  return 'manual_review_needed';
}

function unresolvedCardFacts(cardsArtifact) {
  return (cardsArtifact.cards ?? [])
    .filter((row) => row.status !== 'master_verified' && row.status !== 'api_agreed')
    .map((row) => ({
      gap_type: gapTypeForFact(row),
      fact_type: 'card_identity',
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: null,
      status: row.status,
      sources: row.sources ?? [],
      source_authorities: row.source_authorities ?? [],
      source_kinds: row.source_kinds ?? [],
      evidence_urls: evidenceUrls(row),
      required_next_evidence: 'A second independent English source agreeing on set + number + card name.',
    }));
}

function unresolvedPrintingFacts(printingsArtifact, finishBlockerMap) {
  return (printingsArtifact.printings ?? [])
    .filter((row) => row.status !== 'master_verified')
    .map((row) => {
      const blocker = finishBlockerMap.get(finishFactKey(row));
      return {
        gap_type: blocker ? 'finish_blocker_boundary' : gapTypeForFact(row),
        fact_type: 'printing_finish',
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        status: row.status,
        sources: row.sources ?? [],
        source_authorities: row.source_authorities ?? [],
        source_kinds: row.source_kinds ?? [],
        evidence_urls: blocker?.evidence_urls ?? evidenceUrls(row),
        blocker_type: blocker?.blocker_type ?? null,
        blocker_reason: blocker?.reason_not_promoted ?? null,
        blocker_next_action: blocker?.next_action ?? null,
        required_next_evidence: blocker
          ? 'Manual finish/number adjudication is required. Do not promote from broad source acquisition.'
          : 'Exact card-level finish evidence from a human-readable, official, collector, or marketplace checklist plus independent agreement.',
      };
    });
}

function suppressedFacts(suppressedArtifact) {
  return (suppressedArtifact.suppressed ?? []).map((row) => ({
    gap_type: 'suppressed_structured_claim_reviewed',
    fact_type: 'printing_finish',
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    status: row.suppression_status,
    sources: [row.source_key].filter(Boolean),
    source_authorities: [row.source_url].filter(Boolean),
    source_kinds: [row.source_kind].filter(Boolean),
    evidence_urls: [row.source_url].filter(Boolean),
    required_next_evidence: 'Exact independent evidence is required before this suppressed structured claim can re-enter working truth.',
  }));
}

function buildRemainingGapFacts({ cardsArtifact, printingsArtifact, suppressedArtifact, finishBlockerClosure, generatedAt }) {
  const finishBlockerMap = buildFinishBlockerMap(finishBlockerClosure);
  const facts = [
    ...unresolvedCardFacts(cardsArtifact),
    ...unresolvedPrintingFacts(printingsArtifact, finishBlockerMap),
    ...suppressedFacts(suppressedArtifact),
  ];
  const byGapType = {};
  const bySet = {};
  const byStatus = {};
  for (const fact of facts) {
    addCount(byGapType, fact.gap_type);
    addCount(bySet, `${fact.set_key}|${fact.set_name}`);
    addCount(byStatus, fact.status);
  }
  return {
    generated_at: generatedAt,
    version: 'english_master_index_remaining_gap_facts_v1',
    ...safety(),
    rule: 'Remaining facts are not mutation authority. They define exactly what evidence is still missing or unresolved.',
    summary: {
      total_gap_facts: facts.length,
      finish_blocker_boundary_facts: byGapType.finish_blocker_boundary ?? 0,
      by_gap_type: byGapType,
      by_status: byStatus,
      top_sets: Object.fromEntries(topEntries(bySet, 80)),
    },
    facts,
  };
}

function sourceStatusesForSet(availabilityRows) {
  return Object.fromEntries((availabilityRows ?? []).map((row) => [
    row.source_key,
    {
      runtime_status: row.runtime_status,
      evidence_rows: row.evidence_rows,
      source_alias: row.source_alias,
      error: row.error,
    },
  ]));
}

function nextSourceLanesForWorklistItem(item) {
  if ((item.lanes ?? []).includes('finish_blocker_boundary_adjudication')) {
    return ['manual_finish_number_adjudication'];
  }
  if (item.lane === 'card_identity_second_source') {
    return ['pkmncards', 'bulbapedia_set_list', 'collectr_or_pokellector_style_checklist', 'tcgplayer_product_or_checklist', 'reddit_forum_or_photo_evidence'];
  }
  if (item.lane === 'source_alias_or_adapter_required') {
    return ['pkmncards', 'bulbapedia_set_list', 'thepricedex_price_list', 'official_pokemon_checklist', 'manual_alias_research'];
  }
  return [
    'thepricedex_price_list',
    'official_pokemon_checklist',
    'tcgplayer_product_or_checklist',
    'pricecharting',
    'collectr_or_pokellector_style_checklist',
    'cardmarket_cardtrader_marketplace',
    'graded_registry_or_cert_population',
    'reddit_forum_or_photo_evidence',
  ];
}

function buildLedger({ worklistArtifact, sourceAvailability, remainingGapFacts, generatedAt }) {
  const availabilityBySet = sourceAvailabilityBySet(sourceAvailability);
  const factCountsBySet = {};
  for (const fact of remainingGapFacts.facts) addCount(factCountsBySet, `${fact.set_key}|${fact.gap_type}`);

  const sets = (worklistArtifact.worklist ?? []).map((item) => {
    const availabilityRows = availabilityBySet.get(item.set_key) ?? [];
    const attemptedSources = availabilityRows
      .filter((row) => ['collected', 'error', 'unavailable'].includes(row.runtime_status))
      .map((row) => row.source_key);
    const nextSourceLanes = nextSourceLanesForWorklistItem(item);
    const remainingUnattempted = nextSourceLanes.filter((source) => !attemptedSources.includes(source));
    const exhausted = remainingUnattempted.length === 0 && item.total_gap_count === 0;
    return {
      set_key: item.set_key,
      set_name: item.set_name,
      completion_status: item.completion_status,
      completion_score: item.completion_score,
      total_gap_count: item.total_gap_count,
      card_identity_gap_count: item.card_identity_gap_count,
      printing_finish_gap_count: item.printing_finish_gap_count,
      primary_lanes: item.lanes ?? [item.lane].filter(Boolean),
      required_evidence: item.required_evidence,
      source_statuses: sourceStatusesForSet(availabilityRows),
      attempted_sources: attemptedSources,
      next_source_lanes: nextSourceLanes,
      remaining_unattempted_source_lanes: remainingUnattempted,
      exhaustion_status: exhausted ? 'exhausted_complete' : 'not_exhausted',
      mutation_authority: 'not mutation authority',
    };
  });

  const byExhaustion = {};
  const byPrimaryLane = {};
  for (const set of sets) {
    addCount(byExhaustion, set.exhaustion_status);
    for (const lane of set.primary_lanes ?? []) addCount(byPrimaryLane, lane);
  }

  return {
    generated_at: generatedAt,
    version: 'english_master_index_source_exhaustion_ledger_v1',
    ...safety(),
    rule: 'A set is not exhausted while unresolved gaps remain or while source lanes remain unattempted. This ledger is audit-only and cannot authorize writes.',
    summary: {
      total_sets_in_ledger: sets.length,
      by_exhaustion_status: byExhaustion,
      by_primary_lane: byPrimaryLane,
      total_remaining_gap_facts: remainingGapFacts.summary.total_gap_facts,
      db_writes_performed: false,
      migrations_created: false,
    },
    source_catalog: SOURCE_CATALOG,
    sets,
  };
}

function buildSourceAttemptQueue({ ledger, generatedAt }) {
  const queue = [];
  for (const set of ledger.sets) {
    for (const sourceKey of set.remaining_unattempted_source_lanes ?? []) {
      const source = SOURCE_CATALOG.find((entry) => entry.source_key === sourceKey) ?? {
        source_key: sourceKey,
        source_kind: 'manual_review',
        automation_status: 'queued',
        evidence_strength: 'manual source research',
        source_url_template: 'manual URL required',
        finish_truth_limit: 'Manual review required.',
      };
      queue.push({
        set_key: set.set_key,
        set_name: set.set_name,
        total_gap_count: set.total_gap_count,
        card_identity_gap_count: set.card_identity_gap_count,
        printing_finish_gap_count: set.printing_finish_gap_count,
        source_key: source.source_key,
        source_kind: source.source_kind,
        automation_status: source.automation_status,
        evidence_strength: source.evidence_strength,
        source_url_template: source.source_url_template,
        finish_truth_limit: source.finish_truth_limit,
        mutation_authority: 'not mutation authority',
      });
    }
  }
  const bySource = {};
  const byAutomation = {};
  for (const item of queue) {
    addCount(bySource, item.source_key);
    addCount(byAutomation, item.automation_status);
  }
  return {
    generated_at: generatedAt,
    version: 'english_master_index_source_attempt_queue_v1',
    ...safety(),
    rule: 'Queue of source lanes still required before remaining gaps can be considered exhausted.',
    summary: {
      total_queue_items: queue.length,
      by_source: bySource,
      by_automation_status: byAutomation,
    },
    queue,
  };
}

function buildRemainingGapMarkdown(payload) {
  const summaryRows = Object.entries(payload.summary.by_gap_type).map(([key, value]) => [key, value]);
  const setRows = topEntries(payload.summary.top_sets, 40).map(([key, value]) => {
    const [setKey, setName] = key.split('|');
    return [setKey, setName, value];
  });
  const sampleRows = payload.facts.slice(0, 200).map((row) => [
    row.gap_type,
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key ?? '',
    row.status,
    (row.sources ?? []).join(', '),
  ]);
  return [
    '# English Master Index Remaining Gap Facts V1',
    '',
    'Audit only. These rows are not mutation, insertion, deletion, cleanup, or quarantine authority.',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    '## Summary By Gap Type',
    '',
    markdownTable(['gap_type', 'count'], summaryRows),
    '',
    '## Top Sets',
    '',
    markdownTable(['set_key', 'set_name', 'gap facts'], setRows),
    '',
    '## Sample Gap Facts',
    '',
    markdownTable(['gap_type', 'set', 'number', 'name', 'finish', 'status', 'sources'], sampleRows),
    '',
  ].join('\n');
}

function buildLedgerMarkdown(payload) {
  const rows = payload.sets.slice(0, 200).map((row) => [
    row.set_key,
    row.set_name,
    row.completion_status,
    row.total_gap_count,
    row.exhaustion_status,
    (row.remaining_unattempted_source_lanes ?? []).join(', '),
  ]);
  return [
    '# English Master Index Source Exhaustion Ledger V1',
    '',
    'Audit only. A set is not exhausted while gaps or unattempted source lanes remain.',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    '## Safety',
    '',
    markdownTable(['guardrail', 'value'], [
      ['db_writes_performed', payload.db_writes_performed],
      ['migrations_created', payload.migrations_created],
      ['cleanup_performed', payload.cleanup_performed],
      ['quarantine_performed', payload.quarantine_performed],
    ]),
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['total_sets_in_ledger', payload.summary.total_sets_in_ledger],
      ['total_remaining_gap_facts', payload.summary.total_remaining_gap_facts],
      ['by_exhaustion_status', JSON.stringify(payload.summary.by_exhaustion_status)],
    ]),
    '',
    '## Set Ledger',
    '',
    markdownTable(['set_key', 'set_name', 'completion_status', 'gap_count', 'exhaustion_status', 'remaining source lanes'], rows),
    '',
  ].join('\n');
}

function buildSourceAttemptMarkdown(payload) {
  const sourceRows = Object.entries(payload.summary.by_source).map(([source, count]) => [source, count]);
  const sampleRows = payload.queue.slice(0, 250).map((row) => [
    row.set_key,
    row.set_name,
    row.source_key,
    row.automation_status,
    row.total_gap_count,
    row.evidence_strength,
  ]);
  return [
    '# English Master Index Source Attempt Queue V1',
    '',
    'Audit only. This queue defines remaining source lanes to exhaust; it does not schedule DB writes.',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    '## Summary By Source',
    '',
    markdownTable(['source', 'sets queued'], sourceRows),
    '',
    '## Source Queue',
    '',
    markdownTable(['set_key', 'set_name', 'source', 'automation_status', 'gap_count', 'evidence_strength'], sampleRows),
    '',
  ].join('\n');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const cardsArtifact = await readJson(SOURCE_DIR, 'english_master_index_cards_v1.json');
  const printingsArtifact = await readJson(SOURCE_DIR, 'english_master_index_printings_v1.json');
  const sourceAvailability = await readJson(SOURCE_DIR, 'english_master_index_source_availability_v1.json');
  const suppressedArtifact = await readJson(SOURCE_DIR, 'english_master_index_suppressed_structured_finish_candidates_v1.json', { suppressed: [] });
  const finishBlockerClosure = await readJson(SOURCE_DIR, FINISH_BLOCKER_CLOSURE_FILE, { mapped_blockers: [], summary: {} });
  const worklistArtifact = await readJson(COMPLETION_DIR, 'english_master_index_source_worklist_v1.json');

  const remainingGapFacts = buildRemainingGapFacts({
    cardsArtifact,
    printingsArtifact,
    suppressedArtifact,
    finishBlockerClosure,
    generatedAt,
  });
  const ledger = buildLedger({
    worklistArtifact,
    sourceAvailability,
    remainingGapFacts,
    generatedAt,
  });
  const sourceAttemptQueue = buildSourceAttemptQueue({ ledger, generatedAt });

  for (const fileName of GENERATED_FILES) {
    await fs.rm(path.join(OUTPUT_DIR, fileName), { force: true });
  }
  await writeJson('english_master_index_remaining_gap_facts_v1.json', remainingGapFacts);
  await writeMarkdown('english_master_index_remaining_gap_facts_v1.md', buildRemainingGapMarkdown(remainingGapFacts));
  await writeJson('english_master_index_source_exhaustion_ledger_v1.json', ledger);
  await writeMarkdown('english_master_index_source_exhaustion_ledger_v1.md', buildLedgerMarkdown(ledger));
  await writeJson('english_master_index_source_attempt_queue_v1.json', sourceAttemptQueue);
  await writeMarkdown('english_master_index_source_attempt_queue_v1.md', buildSourceAttemptMarkdown(sourceAttemptQueue));

  console.log(`[source-exhaustion] wrote reports to ${OUTPUT_DIR}`);
  console.log(`[source-exhaustion] remaining gap facts ${remainingGapFacts.summary.total_gap_facts}`);
  console.log(`[source-exhaustion] queued source attempts ${sourceAttemptQueue.summary.total_queue_items}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
