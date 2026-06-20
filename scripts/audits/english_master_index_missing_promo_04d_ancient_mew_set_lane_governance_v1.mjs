import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'ancient_mew_set_lane_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'ancient_mew_set_lane_governance_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04D-ANCIENT-MEW-SET-LANE-GOVERNANCE';

const SOURCES = [
  {
    source_key: 'bulbapedia_ancient_mew_power_of_one',
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Ancient_Mew_%28The_Power_of_One_promo%29',
    evidence_label: 'Ancient Mew The Power of One promo release information',
    supports: ['card_identity', 'miscellaneous_promotional_cards_lane', 'movie_2000_distribution', 'english_physical_release'],
  },
  {
    source_key: 'pkmncards_ancient_mew_miscellaneous',
    source_kind: 'collector_reference',
    source_url: 'https://pkmncards.com/card/ancient-mew-miscellaneous/',
    evidence_label: 'PkmnCards Ancient Mew Miscellaneous card page',
    supports: ['card_identity', 'miscellaneous_lane', 'card_content'],
  },
  {
    source_key: 'pkmncards_miscellaneous_set',
    source_kind: 'collector_reference',
    source_url: 'https://pkmncards.com/set/miscellaneous/',
    evidence_label: 'PkmnCards Miscellaneous set lane',
    supports: ['miscellaneous_lane', 'card_identity'],
  },
  {
    source_key: 'tcgplayer_ancient_mew_misc_products',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/product/108589/pokemon-miscellaneous-cards-and-products-ancient-mew',
    evidence_label: 'TCGplayer Ancient Mew Miscellaneous Cards and Products product page',
    supports: ['card_identity', 'miscellaneous_cards_and_products_lane', 'market_lane'],
  },
  {
    source_key: 'pricecharting_ancient_mew_pokemon_promo',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-promo/ancient-mew',
    evidence_label: 'PriceCharting Ancient Mew Pokemon Promo market page',
    supports: ['card_identity', 'promo_market_lane', 'holo_product_identity'],
  },
];

const ADJACENT_VARIANT_SOURCES = [
  {
    candidate_key: 'ancient_mew_japanese_exclusive_print',
    status: 'future_variant_governance_required',
    source_url: 'https://www.tcgplayer.com/product/482427/pokemon-miscellaneous-cards-and-products-ancient-mew-japanese-exclusive-print',
    evidence_label: 'TCGplayer Japanese Exclusive Print product page',
    reason: 'Do not merge this into the English movie-promo row. It needs separate language/variant governance.',
  },
  {
    candidate_key: 'ancient_mew_i_nintedo_error',
    status: 'future_variant_governance_required',
    source_url: 'https://www.elitefourum.com/t/ancient-mew-variants-and-versions-differences/40111',
    evidence_label: 'Elite Fourum Ancient Mew variant comparison',
    reason: 'Collector evidence identifies Japanese Nintedo/corrected and Ancient Mew I/II distinctions. These are not the current English physical row.',
  },
];

const RECOMMENDED_SET_LANE = {
  set_code: 'misc',
  set_name: 'Miscellaneous Cards & Products',
  printed_set_abbrev: 'MISC',
  identity_domain_default: 'pokemon_eng_standard',
  lane_type: 'english_physical_miscellaneous_promotional_cards',
  source_aliases: {
    bulbapedia: 'Miscellaneous Promotional cards',
    pkmncards: 'Miscellaneous',
    tcgplayer: 'Miscellaneous Cards & Products',
    pricecharting: 'Pokemon Promo',
  },
  governance_decision: 'Create a dedicated miscellaneous/movie-promo set lane instead of forcing Ancient Mew into basep/Wizards Black Star Promos.',
};

const RECOMMENDED_CARD_FACT = {
  set_code: RECOMMENDED_SET_LANE.set_code,
  set_name: RECOMMENDED_SET_LANE.set_name,
  name: 'Ancient Mew',
  number: '1',
  number_governance: 'catalog_assigned_number_not_physical_printed_number',
  rarity: 'Promo',
  finish_key: 'cosmos',
  variant_key: null,
  printed_identity_modifier: null,
  language: 'English',
  physical_only: true,
  recommended_gv_id: 'GV-PK-MISC-001',
  recommended_printing_gv_id: 'GV-PK-MISC-001-COSMOS',
  source_count: SOURCES.length,
  master_index_status: 'master_verified_pending_set_lane_insert',
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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

function renderMarkdown(report) {
  return [
    '# Ancient Mew Set Lane Governance V1',
    '',
    'Read-only governance report. No database writes, migrations, cleanup, inserts, deletes, merges, pricing writes, image writes, or global apply were performed.',
    '',
    '## Safety',
    '',
    markdownTable(
      ['check', 'value'],
      [
        ['db_writes_performed', String(report.db_writes_performed)],
        ['migrations_created', String(report.migrations_created)],
        ['cleanup_performed', String(report.cleanup_performed)],
        ['real_apply_performed', String(report.real_apply_performed)],
      ],
    ),
    '',
    '## Decision',
    '',
    `Ancient Mew is source-supported, but it needs a governed set lane before insertion. Recommended lane: \`${report.recommended_set_lane.set_code}\` / ${report.recommended_set_lane.set_name}.`,
    '',
    markdownTable(
      ['field', 'value'],
      Object.entries(report.recommended_set_lane).map(([key, value]) => [
        key,
        typeof value === 'object' ? JSON.stringify(value) : String(value),
      ]),
    ),
    '',
    '## Recommended Card Fact',
    '',
    markdownTable(
      ['field', 'value'],
      Object.entries(report.recommended_card_fact).map(([key, value]) => [key, value === null ? '-' : String(value)]),
    ),
    '',
    '## Source Evidence',
    '',
    markdownTable(
      ['source', 'kind', 'label', 'url'],
      report.sources.map((source) => [source.source_key, source.source_kind, source.evidence_label, source.source_url]),
    ),
    '',
    '## Live DB Read-Only Checks',
    '',
    markdownTable(
      ['check', 'count'],
      Object.entries(report.live_db_summary).map(([key, value]) => [key, String(value)]),
    ),
    '',
    '## Existing Similar Set Rows',
    '',
    report.live_db_existing_set_candidates.length
      ? markdownTable(
          ['code', 'name', 'identity_domain_default'],
          report.live_db_existing_set_candidates.map((row) => [row.code, row.name, row.identity_domain_default ?? '-']),
        )
      : 'No existing set row matches the recommended `misc` lane or common miscellaneous/movie-promo aliases.',
    '',
    '## Existing Ancient Mew Rows',
    '',
    report.live_db_existing_ancient_mew_rows.length
      ? markdownTable(
          ['id', 'set_code', 'number', 'name', 'variant_key', 'printed_identity_modifier', 'gv_id', 'child_count'],
          report.live_db_existing_ancient_mew_rows.map((row) => [
            row.id,
            row.set_code ?? '-',
            row.number ?? '-',
            row.name,
            row.variant_key ?? '-',
            row.printed_identity_modifier ?? '-',
            row.gv_id ?? '-',
            String(row.child_count),
          ]),
        )
      : 'No existing Ancient Mew parent rows found.',
    '',
    '## Adjacent Variant Boundaries',
    '',
    markdownTable(
      ['candidate', 'status', 'reason'],
      report.adjacent_variant_boundaries.map((row) => [row.candidate_key, row.status, row.reason]),
    ),
    '',
    '## Recommended Next Package',
    '',
    '- Build a guarded dry-run package for the `misc` set lane plus one Ancient Mew parent and one cosmos child printing.',
    '- Keep Japanese Exclusive Print, Nintedo error, corrected Japanese, and Ancient Mew I/II variants out of that package until separate variant governance is complete.',
    '- Do not create external mappings, pricing writes, or image writes in the first insert package.',
    '',
  ].join('\n');
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const setCandidates = await client.query(
      `select id::text, code, name, identity_domain_default
       from public.sets
       where lower(code) in ('misc', 'miscellaneous', 'movie2000', 'movie_2000', 'promo', 'promos')
          or lower(name) like '%miscellaneous%'
          or lower(name) like '%movie%'
          or lower(name) like '%promo%'
       order by code, name`,
    );

    const existingAncientMew = await client.query(
      `select
         cp.id::text,
         cp.set_code,
         cp.number,
         cp.name,
         cp.variant_key,
         cp.printed_identity_modifier,
         cp.gv_id,
         count(cpr.id)::int as child_count
       from public.card_prints cp
       left join public.card_printings cpr on cpr.card_print_id = cp.id
       where lower(cp.name) = 'ancient mew'
          or lower(coalesce(cp.gv_id, '')) like '%ancient%mew%'
       group by cp.id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id
       order by cp.set_code, cp.number, cp.name`,
    );

    const finishRows = await client.query(
      `select key, label, is_active
       from public.finish_keys
       where key in ('cosmos', 'holo', 'normal')
       order by key`,
    );

    const recommendedSetExists = setCandidates.rows.some((row) => row.code?.toLowerCase() === RECOMMENDED_SET_LANE.set_code);
    const exactParentExists = existingAncientMew.rows.some(
      (row) => row.set_code?.toLowerCase() === RECOMMENDED_SET_LANE.set_code
        && String(row.number) === RECOMMENDED_CARD_FACT.number
        && row.name === RECOMMENDED_CARD_FACT.name,
    );
    const cosmosActive = finishRows.rows.some((row) => row.key === 'cosmos' && row.is_active === true);

    const liveDbSummary = {
      recommended_set_exists: recommendedSetExists ? 1 : 0,
      existing_ancient_mew_parent_rows: existingAncientMew.rows.length,
      exact_recommended_parent_exists: exactParentExists ? 1 : 0,
      active_cosmos_finish_rows: cosmosActive ? 1 : 0,
      similar_set_candidate_rows: setCandidates.rows.length,
    };

    const readinessBlockers = [];
    if (!cosmosActive) readinessBlockers.push('cosmos_finish_key_not_active');
    if (exactParentExists) readinessBlockers.push('recommended_parent_already_exists');

    const reportBody = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      governance_status: readinessBlockers.length ? 'blocked' : 'set_lane_governed_ready_for_guarded_dry_run',
      readiness_blockers: readinessBlockers,
      recommended_set_lane: RECOMMENDED_SET_LANE,
      recommended_card_fact: RECOMMENDED_CARD_FACT,
      sources: SOURCES,
      adjacent_variant_boundaries: ADJACENT_VARIANT_SOURCES,
      live_db_summary: liveDbSummary,
      live_db_existing_set_candidates: setCandidates.rows,
      live_db_existing_ancient_mew_rows: existingAncientMew.rows,
      live_db_finish_rows: finishRows.rows,
      next_package_recommendation: {
        package_id: 'MISSING-PROMO-04E-ANCIENT-MEW-MISC-SET-PARENT-CHILD-INSERT-DRY-RUN',
        scope: 'guarded dry-run only unless separately approved',
        expected_set_inserts: recommendedSetExists ? 0 : 1,
        expected_parent_inserts: exactParentExists ? 0 : 1,
        expected_child_inserts: exactParentExists ? 0 : 1,
        expected_finish_key: RECOMMENDED_CARD_FACT.finish_key,
        expected_external_mapping_writes: 0,
        expected_pricing_writes: 0,
        expected_image_writes: 0,
      },
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_performed: false,
    };

    const fingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      recommended_set_lane: RECOMMENDED_SET_LANE,
      recommended_card_fact: RECOMMENDED_CARD_FACT,
      source_keys: SOURCES.map((source) => source.source_key),
      adjacent_variant_boundaries: ADJACENT_VARIANT_SOURCES.map((source) => source.candidate_key),
      live_db_summary: liveDbSummary,
    }));

    const report = {
      ...reportBody,
      fingerprint_sha256: fingerprint,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, `${renderMarkdown(report)}\n`);

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      fingerprint_sha256: fingerprint,
      governance_status: report.governance_status,
      recommended_set_code: RECOMMENDED_SET_LANE.set_code,
      expected_set_inserts_next: report.next_package_recommendation.expected_set_inserts,
      expected_parent_inserts_next: report.next_package_recommendation.expected_parent_inserts,
      expected_child_inserts_next: report.next_package_recommendation.expected_child_inserts,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
