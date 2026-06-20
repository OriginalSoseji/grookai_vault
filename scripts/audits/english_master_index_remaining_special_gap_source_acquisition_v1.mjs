import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const INPUT_MISC = path.join(AUDIT_DIR, 'misc_promo_gap_audit_v1.json');
const INPUT_COMPLETION = path.join(AUDIT_DIR, 'special_parent_child_completion_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'remaining_special_gap_source_acquisition_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'remaining_special_gap_source_acquisition_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04A-REMAINING-SPECIAL-GAP-SOURCE-ACQUISITION';

const SOURCE_FINDINGS = [
  {
    key: 'ancient_mew_movie_2000',
    current_index_status: 'blocked_set_lane_governance',
    recommended_status: 'set_lane_governance_ready',
    recommended_next_step: 'Create a governed English physical miscellaneous/movie-promo set lane before any parent insert dry-run.',
    exact_identity_supported: true,
    exact_finish_supported: true,
    finish_key: 'cosmos',
    master_index_delta_safe: false,
    reason_not_apply_ready: 'The card is source-supported, but Grookai still needs a canonical set lane and numbering convention for standalone miscellaneous/movie promos.',
    evidence: [
      {
        source_key: 'bulbapedia_ancient_mew_power_of_one',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Ancient_Mew_%28The_Power_of_One_promo%29',
        evidence_label: 'Ancient Mew The Power of One promo release information',
        proves: ['card_identity', 'movie_promo_distribution', 'international_cosmos_holofoil_context'],
      },
      {
        source_key: 'pricecharting_ancient_mew_pokemon_promo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/ancient-mew',
        evidence_label: 'Ancient Mew Pokemon Promo product/market listing',
        proves: ['card_identity', 'standalone_promo_market_lane'],
      },
      {
        source_key: 'tcgplayer_ancient_mew_misc_products',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/108589/pokemon-miscellaneous-cards-and-products-ancient-mew',
        evidence_label: 'TCGplayer Ancient Mew Miscellaneous Cards and Products product page',
        proves: ['card_identity', 'miscellaneous_products_lane'],
      },
      {
        source_key: 'pkmncards_miscellaneous_set',
        source_kind: 'collector_reference',
        source_url: 'https://pkmncards.com/set/miscellaneous/',
        evidence_label: 'PkmnCards Miscellaneous set lane',
        proves: ['miscellaneous_promo_lane'],
      },
    ],
  },
  {
    key: 'jungle_meowth_gold_border',
    current_index_status: 'candidate_needs_second_source',
    recommended_status: 'ready_for_guarded_parent_child_insert_dry_run',
    recommended_next_step: 'Build a guarded dry-run for one gold_border parent and one normal child under base2/Jungle #56.',
    set_code: 'base2',
    number: '56',
    name: 'Meowth',
    variant_key: 'gold_border',
    finish_key: 'normal',
    master_index_delta_safe: true,
    evidence: [
      {
        source_key: 'bulbapedia_meowth_jungle_56',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Meowth_%28Jungle_56%29',
        evidence_label: 'Bulbapedia Meowth Jungle 56 release information',
        proves: ['card_identity', 'gold_border_variant', 'fruit_roll_promotion'],
      },
      {
        source_key: 'pricecharting_meowth_gold_border_56',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-jungle/meowth-gold-border-56',
        evidence_label: 'PriceCharting Meowth Gold Border #56 product lane',
        proves: ['card_identity', 'set_number', 'gold_border_variant'],
      },
      {
        source_key: 'tcgplayer_meowth_gold_bordered_promo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/126211/pokemon-miscellaneous-cards-and-products-meowth-56-64-gold-bordered-promo',
        evidence_label: 'TCGplayer Meowth 56/64 Gold Bordered Promo product page',
        proves: ['card_identity', 'set_number', 'gold_border_variant'],
      },
      {
        source_key: 'pkmncards_meowth_jungle_56',
        source_kind: 'collector_reference',
        source_url: 'https://pkmncards.com/card/meowth-jungle-ju-56/',
        evidence_label: 'PkmnCards Meowth Jungle #56 variant note',
        proves: ['card_identity', 'gold_border_variant', 'promotion_context'],
      },
    ],
  },
  {
    key: 'expedition_hoppip_japanese_back',
    current_index_status: 'candidate_needs_second_source',
    recommended_status: 'ready_for_guarded_parent_child_insert_dry_run',
    recommended_next_step: 'Build a guarded dry-run for one japanese_card_back parent and one normal child under ecard1/Expedition #112.',
    set_code: 'ecard1',
    number: '112',
    name: 'Hoppip',
    variant_key: 'japanese_card_back',
    finish_key: 'normal',
    master_index_delta_safe: true,
    evidence: [
      {
        source_key: 'bulbapedia_hoppip_expedition_112',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Hoppip_%28Expedition_112%29',
        evidence_label: 'Bulbapedia Hoppip Expedition 112 release information',
        proves: ['card_identity', 'e3_2002_early_print', 'japanese_card_back', 'non_holo'],
      },
      {
        source_key: 'heritage_hoppip_e3_japanese_back',
        source_kind: 'marketplace_checklist',
        source_url: 'https://comics.ha.com/itm/memorabilia/trading-cards/pokemon-hoppip-112-expedition-e3-convention-promo-psa-trading-card-game-gem-mint-10-the-pokemon-company-2002-japanese-back/a/7410-37009.s',
        evidence_label: 'Heritage Hoppip 112 Expedition E3 Convention Promo Japanese Back lot',
        proves: ['card_identity', 'set_number', 'e3_convention_promo', 'japanese_card_back'],
      },
      {
        source_key: 'psa_hoppip_e3_japanese_back',
        source_kind: 'collector_reference',
        source_url: 'https://www.psacard.com/auctionprices/tcg-cards/2002-pokemon-expedition/hoppip/2088678',
        evidence_label: 'PSA Hoppip E3 Convention Promo-Japanese Back index',
        proves: ['card_identity', 'japanese_card_back', 'grading_population_lane'],
      },
    ],
  },
  {
    key: 'expedition_pichu_japanese_back',
    current_index_status: 'candidate_needs_second_source',
    recommended_status: 'candidate_model_needs_correction',
    recommended_next_step: 'Do not insert the existing #22 holo candidate. Replace it with an ecard1 #58 normal japanese_card_back candidate and then dry-run that corrected lane.',
    set_code_current_candidate: 'ecard1',
    number_current_candidate: '22',
    finish_key_current_candidate: 'holo',
    corrected_set_code: 'ecard1',
    corrected_number: '58',
    corrected_finish_key: 'normal',
    variant_key: 'japanese_card_back',
    master_index_delta_safe: false,
    reason_not_apply_ready: 'The source-backed E3 Japanese-back Pichu evidence points to #58 non-holo. The existing #22 holo candidate is a standard Expedition lane, not the E3 Japanese-back special lane.',
    evidence: [
      {
        source_key: 'bulbapedia_pichu_expedition_22',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Pichu_%28Expedition_22%29',
        evidence_label: 'Bulbapedia Pichu Expedition release information',
        proves: ['card_identity', 'e3_2002_early_print', 'japanese_card_back', 'non_holo_pichu'],
      },
      {
        source_key: 'heritage_pichu_e3_japanese_back',
        source_kind: 'marketplace_checklist',
        source_url: 'https://comics.ha.com/itm/memorabilia/trading-cards/pokemon-pichu-58-expedition-e3-convention-promo-psa-trading-card-game-gem-mint-10-the-pokemon-company-2002-japanese-back/a/7410-37008.s',
        evidence_label: 'Heritage Pichu 58 Expedition E3 Convention Promo Japanese Back lot',
        proves: ['card_identity', 'set_number', 'e3_convention_promo', 'japanese_card_back'],
      },
      {
        source_key: 'psa_pichu_58_e3_japanese_back',
        source_kind: 'collector_reference',
        source_url: 'https://www.psacard.com/auctionprices/tcg-cards/2002-pokemon-expedition/pichu/auction/-2121678752405558364',
        evidence_label: 'PSA Pichu #58 E3 Convention Promo-Japanese Back index',
        proves: ['card_identity', 'set_number', 'japanese_card_back', 'grading_population_lane'],
      },
      {
        source_key: 'pokumon_pichu_58_japanese_back',
        source_kind: 'collector_reference',
        source_url: 'https://pokumon.com/card/japanese-back-pichu-58-165-e3-convention-special-print/',
        evidence_label: 'Pokumon Japanese Back Pichu 58/165 E3 Convention Special Print',
        proves: ['card_identity', 'set_number', 'japanese_card_back', 'special_print_context'],
      },
    ],
  },
];

const ACQUISITION_ROUTES = [
  {
    priority: 1,
    route_key: 'source_mapped_exact_finish_claims',
    description: 'Rows already carrying evidence URLs but no exact finish claim should be re-queried against the same source family for exact finish text.',
    eligible_families: ['wotc_stamp', 'staff_stamp', 'winner_stamp', 'league_stamp', 'prerelease_stamp', 'championship_stamp'],
    accepted_only_if: 'source proves set + number + name + variant/stamp + active finish',
  },
  {
    priority: 2,
    route_key: 'marketplace_product_page_exact_title',
    description: 'Use marketplace product pages only when the product title/page explicitly identifies the exact stamp or special variant and finish.',
    source_families: ['TCGplayer', 'PriceCharting', 'CardTrader', 'Cardmarket'],
    accepted_only_if: 'not a listing-only guess; page/product identity is stable and exact',
  },
  {
    priority: 3,
    route_key: 'bulbapedia_card_release_information',
    description: 'Use card release pages for prerelease, staff, winner, WOTC, E3, and promo release context.',
    source_families: ['Bulbapedia'],
    accepted_only_if: 'release information maps to exact Grookai parent identity and finish',
  },
  {
    priority: 4,
    route_key: 'collector_reference_special_print_archive',
    description: 'Use collector archives for rare special prints when they provide exact card identity and variant context.',
    source_families: ['Pokumon', 'Elite Fourum', 'PSA', 'Heritage Auctions'],
    accepted_only_if: 'paired with another independent source before becoming write-ready',
  },
];

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function topCounts(counts, limit = 20) {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, limit);
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

async function fetchCurrentChildlessSpecialParents(client) {
  const result = await client.query(
    `select
       cp.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cp.gv_id,
       cp.external_ids->'verified_master_index_v1' as vmi,
       cp.external_ids->'verified_master_index_v1'->>'routing_status' as routing_status,
       coalesce(cp.external_ids->'verified_master_index_v1'->'evidence_urls', '[]'::jsonb) as evidence_urls,
       coalesce(cp.external_ids->'verified_master_index_v1'->'evidence_labels', '[]'::jsonb) as evidence_labels,
       coalesce(cp.external_ids->'verified_master_index_v1'->'preserved_evidence_sources', '[]'::jsonb) as preserved_evidence_sources
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     where cp.identity_domain = 'pokemon_eng_standard'
       and (coalesce(cp.variant_key, '') <> '' or cp.printed_identity_modifier is not null)
     group by cp.id
     having count(cpr.id) = 0
     order by cp.set_code, cp.number_plain nulls last, cp.number, cp.name, cp.variant_key`,
  );
  return result.rows.map((row) => ({
    ...row,
    evidence_urls: Array.isArray(row.evidence_urls) ? row.evidence_urls : [],
    evidence_labels: Array.isArray(row.evidence_labels) ? row.evidence_labels : [],
    preserved_evidence_sources: Array.isArray(row.preserved_evidence_sources) ? row.preserved_evidence_sources : [],
  }));
}

function familyFor(row) {
  const token = `${row.variant_key ?? ''} ${row.printed_identity_modifier ?? ''}`.toLowerCase();
  if (token.includes('pokemon_center_ny')) return 'pokemon_center_ny_stamp';
  if (token.includes('pokemon_center')) return 'pokemon_center_stamp';
  if (token.includes('championship')) return 'championship_stamp';
  if (token.includes('prerelease')) return 'prerelease_stamp';
  if (token.includes('staff')) return 'staff_stamp';
  if (token.includes('winner')) return 'winner_stamp';
  if (token.includes('league')) return 'league_stamp';
  if (token.includes('worlds')) return 'worlds_stamp';
  if (token.includes('battle_road')) return 'battle_road_stamp';
  if (token.includes('wotc')) return 'wotc_stamp';
  if (token.includes('e3')) return 'e3_stamp';
  if (token.includes('stamp')) return 'other_stamp';
  return 'other_variant_or_modifier';
}

function classifyBlockedRows(rows) {
  return rows.map((row) => {
    const family = familyFor(row);
    const evidenceUrlCount = row.evidence_urls.length;
    const preservedSourceCount = row.preserved_evidence_sources.length;
    let acquisition_bucket = 'needs_new_exact_finish_source';
    if (evidenceUrlCount > 0 || preservedSourceCount > 0) acquisition_bucket = 'has_identity_evidence_needs_exact_finish';
    if (['staff_stamp', 'winner_stamp', 'prerelease_stamp', 'league_stamp', 'championship_stamp'].includes(family)) acquisition_bucket = 'likely_finish_source_acquirable';
    if (['other_stamp', 'other_variant_or_modifier'].includes(family) && evidenceUrlCount === 0) acquisition_bucket = 'needs_variant_family_identification';

    return {
      parent_id: row.id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      name: row.name,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      gv_id: row.gv_id,
      family,
      routing_status: row.routing_status,
      evidence_url_count: evidenceUrlCount,
      evidence_label_count: row.evidence_labels.length,
      preserved_source_count: preservedSourceCount,
      acquisition_bucket,
      blockers: ['no_single_exact_finish_evidence'],
      evidence_urls: row.evidence_urls,
      evidence_labels: row.evidence_labels,
      preserved_evidence_sources: row.preserved_evidence_sources,
    };
  });
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Remaining Special Gap Source Acquisition V1');
  lines.push('');
  lines.push('This is a read-only source acquisition and governance report. It does not write to the database, create migrations, insert printings, delete rows, merge parents, or promote candidates.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push(markdownTable(
    ['check', 'value'],
    [
      ['db_writes_performed', String(report.db_writes_performed)],
      ['migrations_created', String(report.migrations_created)],
      ['cleanup_performed', String(report.cleanup_performed)],
      ['quarantine_performed', String(report.quarantine_performed)],
      ['real_apply_performed', String(report.real_apply_performed)],
    ],
  ));
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(markdownTable(
    ['metric', 'value'],
    [
      ['remaining_childless_special_parents', report.summary.remaining_childless_special_parents],
      ['open_ready_missing_candidate_count', report.summary.open_ready_missing_candidate_count],
      ['closed_high_signal_candidate_count', report.summary.closed_high_signal_candidate_count],
      ['open_candidate_model_correction_count', report.summary.open_candidate_model_correction_count],
      ['open_set_lane_governance_ready_count', report.summary.open_set_lane_governance_ready_count],
      ['blocked_childless_rows', report.summary.blocked_childless_rows],
    ],
  ));
  lines.push('');
  lines.push('## Missing Candidate Source Outcomes');
  lines.push('');
  lines.push(markdownTable(
    ['candidate', 'status', 'set', 'number', 'finish', 'next step'],
    report.source_findings.map((row) => [
      row.key,
      row.recommended_status,
      row.set_code ?? row.corrected_set_code ?? row.expected_set_lane ?? '',
      row.number ?? row.corrected_number ?? '',
      row.finish_key ?? row.corrected_finish_key ?? '',
      row.recommended_next_step,
    ]),
  ));
  lines.push('');
  lines.push('## Remaining Childless Special Parents By Family');
  lines.push('');
  lines.push(markdownTable(['family', 'count'], report.summary.remaining_by_family.map((row) => [row.key, row.count])));
  lines.push('');
  lines.push('## Remaining Childless Special Parents By Set');
  lines.push('');
  lines.push(markdownTable(['set', 'count'], report.summary.remaining_by_set.map((row) => [row.key, row.count])));
  lines.push('');
  lines.push('## Acquisition Buckets');
  lines.push('');
  lines.push(markdownTable(['bucket', 'count'], report.summary.remaining_by_acquisition_bucket.map((row) => [row.key, row.count])));
  lines.push('');
  lines.push('## Source Acquisition Routes');
  lines.push('');
  lines.push(markdownTable(
    ['priority', 'route', 'description', 'acceptance'],
    report.acquisition_routes.map((row) => [row.priority, row.route_key, row.description, row.accepted_only_if]),
  ));
  lines.push('');
  lines.push('## Important Governance Notes');
  lines.push('');
  lines.push('- Ancient Mew is source-supported, but it is not write-ready until Grookai has a governed English physical miscellaneous/movie-promo set lane.');
  lines.push('- Meowth Gold Border has enough independent source support for a future guarded parent/child insert dry-run.');
  lines.push('- Hoppip Japanese-back has enough independent source support for a future guarded parent/child insert dry-run.');
  lines.push('- The current Pichu Japanese-back candidate should not be inserted as #22 holo. Source evidence points to #58 non-holo for the E3 Japanese-back lane.');
  lines.push('- Live high-signal candidate closure is governed by the misc promo audit. Rows marked `present_with_expected_child_printing` are not re-opened by this source-acquisition report.');
  lines.push('- The remaining childless special parent rows still need exact finish evidence. Identity evidence alone is not enough to create child printings.');
  lines.push('');
  lines.push('## Output');
  lines.push('');
  lines.push(`Machine report: \`${rel(OUTPUT_JSON)}\``);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const [miscAudit, completionDryRun] = await Promise.all([readJson(INPUT_MISC), readJson(INPUT_COMPLETION)]);
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only source acquisition.');

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  let currentRows;
  try {
    currentRows = await fetchCurrentChildlessSpecialParents(client);
  } finally {
    await client.end();
  }

  const classifiedRows = classifyBlockedRows(currentRows);
  const miscCandidateByKey = new Map((miscAudit.candidates ?? []).map((row) => [row.key, row]));
  const sourceFindings = SOURCE_FINDINGS.map((row) => {
    const liveCandidate = miscCandidateByKey.get(row.key);
    const liveStatus = liveCandidate?.status ?? null;
    const isClosed = liveStatus === 'present_with_expected_child_printing';
    return {
      ...row,
      live_misc_audit_status: liveStatus,
      live_db_closed: isClosed,
      recommended_status: isClosed ? 'closed_present_with_expected_child_printing' : row.recommended_status,
      recommended_next_step: isClosed ? 'No further missing-promo insert package needed for this candidate.' : row.recommended_next_step,
    };
  });
  const openSourceFindings = sourceFindings.filter((row) => !row.live_db_closed);
  const readyMissingCandidates = openSourceFindings.filter((row) => row.recommended_status === 'ready_for_guarded_parent_child_insert_dry_run');
  const modelCorrections = openSourceFindings.filter((row) => row.recommended_status === 'candidate_model_needs_correction');
  const setLaneGovernanceReady = openSourceFindings.filter((row) => row.recommended_status === 'set_lane_governance_ready');
  const closedHighSignalCandidates = sourceFindings.filter((row) => row.live_db_closed);

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_source_acquisition',
    db_reads_performed: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_performed: false,
    source_research_performed: true,
    input_artifacts: {
      misc_promo_gap_audit: rel(INPUT_MISC),
      special_parent_child_completion_guarded_dry_run: rel(INPUT_COMPLETION),
    },
    source_acquisition_fingerprint_sha256: sha256(stableJson({
      package_id: PACKAGE_ID,
      source_findings: SOURCE_FINDINGS,
      current_childless_parent_ids: classifiedRows.map((row) => row.parent_id).sort(),
    })),
    summary: {
      prior_childless_special_parents_before_missing_promo_03a: completionDryRun.summary?.total_childless_special_parent_rows ?? null,
      missing_promo_03a_ready_count: completionDryRun.summary?.ready_target_count ?? null,
      remaining_childless_special_parents: classifiedRows.length,
      blocked_childless_rows: classifiedRows.length,
      open_ready_missing_candidate_count: readyMissingCandidates.length,
      closed_high_signal_candidate_count: closedHighSignalCandidates.length,
      open_candidate_model_correction_count: modelCorrections.length,
      open_set_lane_governance_ready_count: setLaneGovernanceReady.length,
      remaining_by_family: topCounts(countBy(classifiedRows, (row) => row.family), 30),
      remaining_by_set: topCounts(countBy(classifiedRows, (row) => row.set_code), 30),
      remaining_by_acquisition_bucket: topCounts(countBy(classifiedRows, (row) => row.acquisition_bucket), 30),
      remaining_with_existing_evidence_urls: classifiedRows.filter((row) => row.evidence_url_count > 0).length,
      remaining_without_evidence_urls: classifiedRows.filter((row) => row.evidence_url_count === 0).length,
    },
    misc_audit_candidate_snapshot: miscAudit.candidates,
    source_findings: sourceFindings,
    acquisition_routes: ACQUISITION_ROUTES,
    remaining_childless_special_parents: classifiedRows,
    recommended_next_steps: [
      {
        step: 'MISSING-PROMO-04B/04C/04D/04E-HIGH-SIGNAL-CANDIDATES-CLOSED',
        scope: 'Meowth Gold Border, E3 Japanese-back Hoppip/Pichu, and Ancient Mew are closed when live misc audit reports present_with_expected_child_printing.',
        writes_allowed_now: false,
      },
      {
        step: 'MISSING-PROMO-04F-BLOCKED-SPECIAL-FINISH-ACQUISITION',
        scope: 'Acquire exact finish evidence for the remaining childless special parents using the acquisition bucket priorities in this report.',
        writes_allowed_now: false,
      },
    ],
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
