import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'misc_promo_gap_audit_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'misc_promo_gap_audit_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-02A-MISC-PROMO-GAP-AUDIT';

const SOURCES = {
  bulbapedia_misc_1999_2008: 'https://bulbapedia.bulbagarden.net/wiki/Miscellaneous_Promotional_cards_%28TCG%29/1999-2008',
  bulbapedia_ancient_mew: 'https://bulbapedia.bulbagarden.net/wiki/Ancient_Mew_%28The_Power_of_One_promo%29',
  pkmncards_misc: 'https://pkmncards.com/set/miscellaneous/',
  tcgplayer_ancient_mew: 'https://www.tcgplayer.com/product/108589/pokemon-miscellaneous-cards-and-products-ancient-mew',
};

const HIGH_SIGNAL_MISC_CANDIDATES = [
  {
    key: 'ancient_mew_movie_2000',
    name: 'Ancient Mew',
    expected_set_lane: 'misc',
    db_probe_set_code: 'misc',
    db_probe_number: '1',
    expected_finish_key: 'cosmos',
    expected_variant_key: '',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008, SOURCES.bulbapedia_ancient_mew, SOURCES.pkmncards_misc, SOURCES.tcgplayer_ancient_mew],
    recommended_status_if_missing: 'candidate_needs_set_lane_insert',
    notes: 'Externally documented as a Miscellaneous Promotional card. Grookai governs this under misc/Miscellaneous Cards & Products with a cosmos child printing.',
  },
  {
    key: 'jungle_meowth_gold_border',
    name: 'Meowth',
    expected_set_lane: 'base2',
    db_probe_set_code: 'base2',
    db_probe_number: '56',
    expected_finish_key: 'normal',
    expected_variant_key: 'gold_border',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'High-signal miscellaneous reprint candidate; needs a second independent source before parent insertion.',
  },
  {
    key: 'expedition_hoppip_japanese_back',
    name: 'Hoppip',
    expected_set_lane: 'ecard1',
    db_probe_set_code: 'ecard1',
    db_probe_number: '112',
    expected_finish_key: 'normal',
    expected_variant_key: 'japanese_card_back',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Japanese-card-back English-side promo candidate; requires identity modifier governance before insert.',
  },
  {
    key: 'expedition_pichu_japanese_back',
    name: 'Pichu',
    expected_set_lane: 'ecard1',
    db_probe_set_code: 'ecard1',
    db_probe_number: '58',
    expected_finish_key: 'normal',
    expected_variant_key: 'japanese_card_back',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Japanese-card-back English-side promo candidate. The stale #22 holo model was rejected; source-backed lane is #58 normal.',
  },
  {
    key: 'base_pikachu_e3_stamp',
    name: 'Pikachu',
    expected_set_lane: 'base1',
    db_probe_set_code: 'base1',
    db_probe_number: '58',
    expected_finish_key: 'normal',
    expected_variant_key: 'e3_stamp',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Known E3-stamped Base Pikachu lane; this audit verifies both parent and child row presence.',
  },
  {
    key: 'basep_rapidash_pcny_stamp',
    name: 'Rapidash',
    expected_set_lane: 'basep',
    db_probe_set_code: 'basep',
    db_probe_number: '51',
    expected_finish_key: 'normal',
    expected_variant_key: 'pokemon_center_ny_stamp',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Pokemon Center NY stamped Wizards promo lane.',
  },
  {
    key: 'basep_ho_oh_pcny_stamp',
    name: 'Ho-oh',
    expected_set_lane: 'basep',
    db_probe_set_code: 'basep',
    db_probe_number: '52',
    expected_finish_key: 'normal',
    expected_variant_key: 'pokemon_center_ny_stamp',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Pokemon Center NY stamped Wizards promo lane.',
  },
  {
    key: 'ex3_charmander_city_championships',
    name: 'Charmander',
    expected_set_lane: 'ex3',
    db_probe_set_code: 'ex3',
    db_probe_number: '98',
    expected_finish_key: 'holo',
    expected_variant_key: 'city_championships_stamp',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Championship-stamped special case; parent may exist without a child printing.',
  },
  {
    key: 'ex3_charmeleon_state_championships',
    name: 'Charmeleon',
    expected_set_lane: 'ex3',
    db_probe_set_code: 'ex3',
    db_probe_number: '99',
    expected_finish_key: 'holo',
    expected_variant_key: 'state_championships_stamp',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Championship-stamped special case; parent may exist without a child printing.',
  },
  {
    key: 'ex3_charizard_national_championships',
    name: 'Charizard',
    expected_set_lane: 'ex3',
    db_probe_set_code: 'ex3',
    db_probe_number: '100',
    expected_finish_key: 'holo',
    expected_variant_key: 'national_championships_stamp',
    evidence_urls: [SOURCES.bulbapedia_misc_1999_2008],
    recommended_status_if_missing: 'candidate_needs_second_source',
    notes: 'Championship-stamped special case; parent may exist without a child printing.',
  },
];

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
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
  if (token.includes('gold_border')) return 'gold_border';
  if (token.includes('japanese')) return 'japanese_back';
  if (token.includes('stamp')) return 'other_stamp';
  return 'other_variant_or_modifier';
}

async function queryCandidate(client, candidate) {
  if (candidate.key === 'ancient_mew_movie_2000') {
    const result = await client.query(
      `select cp.id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id,
              array_agg(distinct cpr.finish_key) filter (where cpr.id is not null) as finishes,
              count(distinct cpr.id)::int as child_count,
              count(distinct cpi.id) filter (where cpi.is_active)::int as active_identity_count
       from public.card_prints cp
       left join public.card_printings cpr on cpr.card_print_id = cp.id
       left join public.card_print_identity cpi on cpi.card_print_id = cp.id
       where lower(cp.name) = 'ancient mew'
       group by cp.id
       order by cp.set_code, cp.number`,
    );
    return result.rows;
  }

  const result = await client.query(
    `select cp.id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id,
            array_agg(distinct cpr.finish_key) filter (where cpr.id is not null) as finishes,
            count(distinct cpr.id)::int as child_count,
            count(distinct cpi.id) filter (where cpi.is_active)::int as active_identity_count
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.card_print_identity cpi on cpi.card_print_id = cp.id
     where lower(cp.set_code) = lower($1)
       and cp.number = $2
       and lower(cp.name) = lower($3)
       and (
         lower(coalesce(cp.variant_key, '')) = lower($4)
         or lower(coalesce(cp.printed_identity_modifier, '')) like '%' || lower($4) || '%'
       )
     group by cp.id
     order by cp.set_code, cp.number`,
    [candidate.db_probe_set_code, candidate.db_probe_number, candidate.name, candidate.expected_variant_key],
  );
  return result.rows;
}

function classifyCandidate(candidate, matches) {
  if (matches.length === 0) {
    return candidate.recommended_status_if_missing;
  }
  const childCount = matches.reduce((sum, row) => sum + Number(row.child_count ?? 0), 0);
  const activeIdentityCount = matches.reduce((sum, row) => sum + Number(row.active_identity_count ?? 0), 0);
  const hasExpectedFinish = matches.some((row) => Array.isArray(row.finishes) && row.finishes.includes(candidate.expected_finish_key));
  if (activeIdentityCount > 0 && childCount > 0 && hasExpectedFinish) return 'present_with_expected_child_printing';
  if (activeIdentityCount > 0 && childCount === 0) return 'present_parent_child_printing_missing';
  if (activeIdentityCount > 0 && childCount > 0 && !hasExpectedFinish) return 'present_finish_mismatch_review';
  return 'present_parent_identity_review';
}

function summarizeRows(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + Number(row.count ?? 1));
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([key, count]) => ({ key, count }));
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only misc promo audit.');

  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    const auditedCandidates = [];
    for (const candidate of HIGH_SIGNAL_MISC_CANDIDATES) {
      const matches = await queryCandidate(client, candidate);
      auditedCandidates.push({
        ...candidate,
        status: classifyCandidate(candidate, matches),
        db_matches: matches,
      });
    }

    const childless = await client.query(
      `select cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id,
              count(cpr.id)::int as child_count
       from public.card_prints cp
       left join public.card_printings cpr on cpr.card_print_id = cp.id
       where cp.identity_domain = 'pokemon_eng_standard'
         and (coalesce(cp.variant_key, '') <> '' or cp.printed_identity_modifier is not null)
       group by cp.id
       having count(cpr.id) = 0
       order by cp.set_code, cp.number, cp.name`,
    );

    const missingByStatus = summarizeRows(auditedCandidates, (row) => row.status);
    const childlessRows = childless.rows.map((row) => ({ ...row, family: familyFor(row) }));
    const childlessByFamily = summarizeRows(childlessRows, (row) => row.family);
    const childlessBySet = summarizeRows(childlessRows, (row) => row.set_code);

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'read_only_audit',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      scope: {
        english_physical_only: true,
        target: 'miscellaneous promotional and special-case parent/child completeness',
        candidate_count: auditedCandidates.length,
      },
      source_urls: SOURCES,
      summary: {
        high_signal_candidates_by_status: missingByStatus,
        childless_special_parent_rows: childlessRows.length,
        childless_special_parent_rows_by_family: childlessByFamily.slice(0, 20),
        childless_special_parent_rows_by_set: childlessBySet.slice(0, 20),
      },
      candidates: auditedCandidates,
      childless_special_parent_rows: childlessRows,
      recommended_next_steps: [
        'Treat Ancient Mew, Meowth Gold Border, and E3 Japanese-back Hoppip/Pichu as applied only when live DB status is present_with_expected_child_printing.',
        'Build a child-printing readiness package for already-present special/stamped parents with zero child rows, starting with high-signal families and exact finish evidence.',
        'Keep jumbo-only items deprioritized unless collector policy changes.',
      ],
    };

    await writeJson(OUTPUT_JSON, report);

    const candidateRows = auditedCandidates.map((row) => [
      row.key,
      row.name,
      row.expected_set_lane,
      row.expected_variant_key || 'base',
      row.expected_finish_key,
      row.status,
      row.db_matches.length,
    ]);

    const childlessFamilyRows = childlessByFamily.slice(0, 15).map((row) => [row.key, row.count]);
    const childlessSetRows = childlessBySet.slice(0, 15).map((row) => [row.key, row.count]);

    const md = [
      '# Misc Promo Gap Audit V1',
      '',
      'Read-only audit for miscellaneous promotional and special-case card completeness.',
      '',
      '## Guardrails',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Cleanup performed: false',
      '- Quarantine performed: false',
      '- Ancient Mew inserted: live status checked by DB query',
      '',
      '## Source URLs',
      '',
      ...Object.entries(SOURCES).map(([key, url]) => `- ${key}: ${url}`),
      '',
      '## High-Signal Candidate Status',
      '',
      markdownTable(
        ['candidate', 'card', 'expected lane', 'variant/modifier', 'finish', 'status', 'db matches'],
        candidateRows,
      ),
      '',
      '## Childless Special Parent Rows',
      '',
      `Special/stamped parent rows with no child printing rows: ${childlessRows.length}`,
      '',
      '### By Family',
      '',
      markdownTable(['family', 'rows'], childlessFamilyRows),
      '',
      '### By Set',
      '',
      markdownTable(['set', 'rows'], childlessSetRows),
      '',
      '## Recommended Next Steps',
      '',
      '1. Treat already-applied high-signal candidates as closed only when live DB status is present_with_expected_child_printing.',
      '2. Build child-printing readiness for already-present special/stamped parents with zero child rows.',
      '3. Continue exact finish evidence acquisition for remaining childless special parents.',
      '4. Keep jumbo-only items deprioritized unless collector policy changes.',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      candidate_count: auditedCandidates.length,
      high_signal_candidates_by_status: missingByStatus,
      childless_special_parent_rows: childlessRows.length,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
