import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_source_exhaustion_v1',
  'exact_finish_binding_manual_web_pass_v1',
);
const FIXTURE_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'source_fixtures',
  'generated_exact_finish_binding_manual_web_pass_v1',
);
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'exact_finish_binding_manual_web_pass_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'exact_finish_binding_manual_web_pass_v1.md');
const FIXTURE_JSON = path.join(FIXTURE_DIR, 'exact_finish_binding_manual_web_pass_v1.json');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, '20260622_exact_finish_binding_manual_web_pass_checkpoint_v1.md');

const GENERATED_AT = new Date().toISOString();

const ROWS = [
  {
    set_key: 'bw10',
    set_name: 'Plasma Blast',
    card_number: '5',
    card_name: 'Tropius',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'taxonomy_review_no_write',
    finish_key: null,
    sources: [
      {
        source_key: 'pricecharting_tropius_nationals_crosshatch_plasma_blast',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/fr/game/pokemon-plasma-blast/tropius-5',
        evidence_label: 'PriceCharting sales include Tropius 5/101 Plasma Blast Nationals Champion / National Championships crosshatch promo wording',
        evidence_type: 'needs_manual_review',
        notes: 'Evidence supports a National Championships crosshatch lane, not a generic League Stamp lane. Do not promote without taxonomy adjudication.',
      },
      {
        source_key: 'pokescope_tropius_plasma_blast_variant_list',
        source_kind: 'collector_reference',
        source_url: 'https://pokescope.app/card/bw10-5/',
        evidence_label: 'PokeScope separates Staff Stamp, League Stamp, Reverse Holofoil, and Normal variants',
        evidence_type: 'needs_manual_review',
        notes: 'Variant existence is supported, but exact League Stamp finish is not bound strongly enough here.',
      },
    ],
  },
  {
    set_key: 'dp1',
    set_name: 'Diamond & Pearl',
    card_number: '3',
    card_name: 'Electivire',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'still_blocked_no_exact_variant_finish',
    finish_key: null,
    sources: [
      {
        source_key: 'ebay_electivire_dp1_base_holo_not_league',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/286883456867',
        evidence_label: 'eBay product page supports Electivire 3/130 Diamond & Pearl Holo Rare base card',
        evidence_type: 'needs_manual_review',
        notes: 'Base holo evidence only; no League Stamp binding.',
      },
    ],
  },
  {
    set_key: 'dp1',
    set_name: 'Diamond & Pearl',
    card_number: '7',
    card_name: 'Luxray',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'still_blocked_no_exact_variant_finish',
    finish_key: null,
    sources: [
      {
        source_key: 'facebook_luxray_national_championship_staff_context',
        source_kind: 'manual_review',
        source_url: 'https://www.facebook.com/groups/pokemonarizona/posts/816786641361693/',
        evidence_label: 'Facebook snippet mentions Luxray 7/130 Diamond and Pearl National Championship Staff',
        evidence_type: 'needs_manual_review',
        notes: 'Unstable/social snippet and staff taxonomy; not enough for finish truth or generic League Stamp promotion.',
      },
    ],
  },
  {
    set_key: 'ex12',
    set_name: 'Legend Maker',
    card_number: '6',
    card_name: 'Golem',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'taxonomy_review_no_write',
    finish_key: null,
    sources: [
      {
        source_key: 'pokegym_golem_regional_championship_stamp_context',
        source_kind: 'collector_reference',
        source_url: 'https://pokegym.net/community/index.php?threads%2Fhelp-with-a-ball-park-figure-for-my-entire-collection.187964%2F=',
        evidence_label: 'PokeGym collection list includes Golem 6/92 Regional Championships Stamp',
        evidence_type: 'needs_manual_review',
        notes: 'Supports a Regional Championships stamped lane, not exact generic League Stamp finish.',
      },
      {
        source_key: 'ebay_golem_legend_maker_base_holo_not_league',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/389571470643',
        evidence_label: 'eBay product page supports Golem 6/92 Legend Maker Holo base card',
        evidence_type: 'needs_manual_review',
        notes: 'Base holo evidence only; no stamp binding.',
      },
    ],
  },
  {
    set_key: 'ex14',
    set_name: 'Crystal Guardians',
    card_number: '14',
    card_name: 'Blastoise',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'identity_supported_finish_unproven',
    finish_key: null,
    sources: [
      {
        source_key: 'pokescope_blastoise_crystal_guardians_variant_list',
        source_kind: 'collector_reference',
        source_url: 'https://pokescope.app/card/ex14-14/',
        evidence_label: 'PokeScope separates League Stamp, Reverse Holofoil, Holofoil, and Normal variants',
        evidence_type: 'checklist_entry',
        notes: 'Variant existence supported; exact League Stamp finish remains unbound.',
      },
      {
        source_key: 'ebay_blastoise_crystal_guardians_reverse_base_not_league',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/358362981791',
        evidence_label: 'eBay Blastoise 14/100 Crystal Guardians Reverse Holo',
        evidence_type: 'needs_manual_review',
        notes: 'Base reverse-holo evidence only; no League Stamp binding.',
      },
    ],
  },
  {
    set_key: 'ex5',
    set_name: 'Hidden Legends',
    card_number: '9',
    card_name: 'Machamp',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'still_blocked_no_exact_variant_finish',
    finish_key: null,
    sources: [
      {
        source_key: 'ebay_machamp_hidden_legends_reverse_base_not_league',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/147328903774',
        evidence_label: 'eBay product page supports Machamp 9/101 Hidden Legends Reverse Holo',
        evidence_type: 'needs_manual_review',
        notes: 'Base reverse-holo evidence only; no League Stamp binding.',
      },
    ],
  },
  {
    set_key: 'ex8',
    set_name: 'Deoxys',
    card_number: '16',
    card_name: 'Deoxys',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'identity_supported_finish_unproven',
    finish_key: null,
    sources: [
      {
        source_key: 'pokescope_deoxys_ex8_variant_list',
        source_kind: 'collector_reference',
        source_url: 'https://pokescope.app/card/ex8-16/',
        evidence_label: 'PokeScope separates Reverse Holofoil, Movie Stamp, League Stamp, Holofoil, and Normal variants',
        evidence_type: 'checklist_entry',
        notes: 'League Stamp identity is supported, but finish is not bound to that lane.',
      },
      {
        source_key: 'pricecharting_deoxys_16_league_championship_regional',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-deoxys/deoxys-16',
        evidence_label: 'PriceCharting sales include Deoxys 16/107 League & Championship Regional promo wording',
        evidence_type: 'needs_manual_review',
        notes: 'Useful stamp context; not sufficient for exact finish.',
      },
    ],
  },
  {
    set_key: 'ex8',
    set_name: 'Deoxys',
    card_number: '22',
    card_name: 'Rayquaza',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'still_blocked_no_exact_variant_finish',
    finish_key: null,
    sources: [
      {
        source_key: 'reddit_rayquaza_ex_deoxys_variant_context',
        source_kind: 'collector_reference',
        source_url: 'https://www.reddit.com/r/pokemoncardcollectors/comments/1rqnnmu/all_5_rayquaza_variants_from_ex_deoxys/',
        evidence_label: 'Reddit collector post describes non-holo and reverse holo stamped EX Deoxys Rayquaza variants',
        evidence_type: 'needs_manual_review',
        notes: 'Useful variant context only; does not bind a League Stamp lane.',
      },
      {
        source_key: '401games_rayquaza_ex_deoxys_reverse_base_not_league',
        source_kind: 'marketplace_checklist',
        source_url: 'https://store.401games.ca/products/rayquaza-22-107-rare-reverse-holo',
        evidence_label: '401 Games Rayquaza 22/107 EX Deoxys Reverse Holo',
        evidence_type: 'needs_manual_review',
        notes: 'Base reverse-holo evidence only; no League Stamp binding.',
      },
    ],
  },
  {
    set_key: 'ex9',
    set_name: 'Emerald',
    card_number: '3',
    card_name: 'Exploud',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'identity_supported_finish_unproven',
    finish_key: null,
    sources: [
      {
        source_key: 'scrydex_exploud_emerald_variant_list',
        source_kind: 'collector_reference',
        source_url: 'https://scrydex.com/pokemon/cards/exploud/ex9-3?variant=holofoil',
        evidence_label: 'Scrydex variant selector lists Holofoil, Reverse Holofoil, and League Stamp for Exploud #3',
        evidence_type: 'checklist_entry',
        notes: 'League Stamp identity is supported; exact finish binding remains ambiguous.',
      },
      {
        source_key: 'pricecharting_exploud_emerald_reverse_stamped_context',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/es/game/pokemon-emerald/exploud-reverse-holo-3',
        evidence_label: 'PriceCharting reverse-holo page includes EX Stamped Emerald Exploud sales titles',
        evidence_type: 'needs_manual_review',
        notes: 'Base set-stamped reverse context; does not prove generic League Stamp.',
      },
    ],
  },
  {
    set_key: 'pl2',
    set_name: 'Rising Rivals',
    card_number: '96',
    card_name: "Team Galactic's Invention G-109 SP Radar",
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'source_ready_candidate_no_db_write',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'nobleknight_sp_radar_league_promo_reverse_holo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.nobleknight.com/P/2148463851/Team-Galactics-Invention-G-109-SP-Radar---96-111-League-Promo-P-096-111-Reverse-Holo',
        evidence_label: "Noble Knight Team Galactic's Invention G-109 SP Radar 96/111 League Promo Reverse Holo",
        evidence_type: 'finish_presence',
        notes: 'Exact set/card/number/League Promo/Reverse Holo binding.',
      },
      {
        source_key: 'pokecardvalues_sp_radar_league_promo_reverse_holo',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/team-galactics-invention-g-109-sp-radar-96-111-non-holo-unlimited-rising-rivals/pl2-96-2-1/',
        evidence_label: 'PokeCardValues page lists SP Radar Reverse Holo League Promo as a distinct #96 lane',
        evidence_type: 'finish_presence',
        notes: 'Exact card number/name with Reverse Holo League Promo lane in adjacent set page.',
      },
    ],
  },
  {
    set_key: 'sv10',
    set_name: 'Destined Rivals',
    card_number: '81',
    card_name: "Team Rocket's Mewtwo ex",
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'taxonomy_review_no_write',
    finish_key: null,
    sources: [
      {
        source_key: 'pricecharting_team_rockets_mewtwo_ex_prize_pack_81',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-destined-rivals/team-rocket%27s-mewtwo-ex-prize-pack-81',
        evidence_label: "PriceCharting Team Rocket's Mewtwo ex Prize Pack #81 product lane",
        evidence_type: 'needs_manual_review',
        notes: 'Evidence points to Prize Pack, not League Stamp. Requires taxonomy reroute.',
      },
    ],
  },
  {
    set_key: 'swsh4',
    set_name: 'Vivid Voltage',
    card_number: '153',
    card_name: 'League Staff',
    variant_key: 'league_cup_staff_stamp',
    stamp_label: 'League Cup Staff Stamp',
    status: 'still_blocked_no_exact_variant_finish',
    finish_key: null,
    sources: [
      {
        source_key: 'mercari_similar_league_staff_reverse_holo_context',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.mercari.com/us/item/m37568228163/',
        evidence_label: 'Mercari similar-items snippet mentions League Staff Reverse Holo 153/185',
        evidence_type: 'needs_manual_review',
        notes: 'Insufficient: similar item context, not the exact target product page.',
      },
    ],
  },
  {
    set_key: 'swsh7',
    set_name: 'Evolving Skies',
    card_number: '49',
    card_name: 'Pikachu',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'source_ready_candidate_no_db_write',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pricecharting_pikachu_evolving_skies_league_stamp_reverse',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-evolving-skies/pikachu-league-stamp-49',
        evidence_label: 'PriceCharting Pikachu League Stamp #49 Evolving Skies sales title includes Reverse Holo',
        evidence_type: 'finish_presence',
        notes: 'Exact set/card/number/League Stamp/Reverse Holo product lane.',
      },
    ],
  },
  {
    set_key: 'xy3',
    set_name: 'Furious Fists',
    card_number: '12',
    card_name: 'Torchic',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'taxonomy_review_no_write',
    finish_key: null,
    sources: [
      {
        source_key: 'pokecardvalues_torchic_city_championships_reverse_holo',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/torchic-12-111-reverse-holo-city-championships-furious-fists/xy3-12-3-23/',
        evidence_label: 'PokeCardValues Torchic 12/111 Reverse Holo Promo City Championships Crosshatch Holo',
        evidence_type: 'needs_manual_review',
        notes: 'Exact finish exists, but taxonomy is City Championships rather than generic League Stamp.',
      },
      {
        source_key: 'sportscardinvestor_torchic_city_championships_reverse',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.sportscardinvestor.com/cards/torchic-pokemon/2014-xy-furious-fists-promo-city-championships-012-111',
        evidence_label: 'Sports Card Investor Torchic 2014 XY Furious Fists Promo City Championships 012/111 Reverse Holo',
        evidence_type: 'needs_manual_review',
        notes: 'Second source supports City Championships reverse-holo lane, not generic League Stamp.',
      },
    ],
  },
  {
    set_key: 'xy3',
    set_name: 'Furious Fists',
    card_number: '14',
    card_name: 'Blaziken',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'taxonomy_review_no_write',
    finish_key: null,
    sources: [
      {
        source_key: 'tag_blaziken_national_championships_crosshatch_holo',
        source_kind: 'collector_reference',
        source_url: 'https://my.taggrading.com/pop-report/Pokemon/2015/Pok%C3%A9mon%20XY/Blaziken/14%2F111?setName=Furious+Fists+National+Championships&variation=Crosshatch+Holo',
        evidence_label: 'TAG population page: Blaziken 14/111 Furious Fists National Championships Crosshatch Holo',
        evidence_type: 'needs_manual_review',
        notes: 'Exact finish but National Championships taxonomy, not generic League Stamp.',
      },
      {
        source_key: 'elitefourum_blaziken_staff_crosshatch_nationals',
        source_kind: 'collector_reference',
        source_url: 'https://www.elitefourum.com/t/prerelease-staff-card-rarity/25783',
        evidence_label: 'Elite Fourum list: Furious Fists 14/111 Blaziken Staff Crosshatch National Championships 2014-2015 promo',
        evidence_type: 'needs_manual_review',
        notes: 'Second source supports staff/national taxonomy and crosshatch finish; not generic League Stamp.',
      },
    ],
  },
  {
    set_key: 'xy4',
    set_name: 'Phantom Forces',
    card_number: '66',
    card_name: 'Klefki',
    variant_key: 'league_stamp',
    stamp_label: 'League Stamp',
    status: 'source_ready_candidate_no_db_write',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'ebay_klefki_phantom_forces_league_4th_place_reverse',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/226939069442',
        evidence_label: 'eBay Klefki 66/119 Phantom Forces Pokémon League 4th Place Reverse Holo Promo',
        evidence_type: 'finish_presence',
        notes: 'Exact set/card/number/Pokemon League placement/Reverse Holo binding.',
      },
      {
        source_key: 'pokecardvalues_klefki_second_place_reverse_holo_league',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/klefki-66-119-reverse-holo-2nd-place-phantom-forces/xy4-66-3-7/',
        evidence_label: 'PokeCardValues Klefki 66/119 Reverse Holo Promo 2nd Place Crosshatch Holo Pokemon League',
        evidence_type: 'finish_presence',
        notes: 'Corroborates League placement reverse-holo family for same set/card/number.',
      },
    ],
  },
];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function fixtureRecords() {
  const accepted = ROWS.filter((row) => row.status === 'source_ready_candidate_no_db_write');
  return accepted.map((row) => ({
    source_key: 'exact_finish_binding_manual_web_pass_v1',
    source_kind: 'collector_reference',
    source_url: row.sources[0].source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: row.sources[0].evidence_label,
    language: 'en',
    retrieved_at: GENERATED_AT,
    raw_snapshot_ref: `manual_web_pass:${row.set_key}:${row.card_number}:${row.variant_key}:${row.finish_key}`,
    notes: `Audit-only exact finish candidate. Supporting sources: ${row.sources.map((source) => source.source_key).join(', ')}`,
  }));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Exact Finish Binding Manual Web Pass V1');
  lines.push('');
  lines.push('Audit-only targeted web/source pass for the 16 exact-finish rows that had no preserved fixture match.');
  lines.push('');
  lines.push('- DB writes performed: false');
  lines.push('- Migrations created: false');
  lines.push('- Dry-run package prepared: false');
  lines.push('- Cleanup performed: false');
  lines.push('- Quarantine performed: false');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Rows attempted: ${report.summary.rows_attempted}`);
  lines.push(`- Source-ready candidates: ${report.summary.by_status.source_ready_candidate_no_db_write ?? 0}`);
  lines.push(`- Identity-supported finish-unproven: ${report.summary.by_status.identity_supported_finish_unproven ?? 0}`);
  lines.push(`- Taxonomy review: ${report.summary.by_status.taxonomy_review_no_write ?? 0}`);
  lines.push(`- Still blocked: ${report.summary.by_status.still_blocked_no_exact_variant_finish ?? 0}`);
  lines.push(`- Fixture records written: ${report.summary.fixture_records_written}`);
  lines.push('');
  lines.push('## Source-Ready Candidates');
  lines.push('');
  const accepted = report.rows.filter((row) => row.status === 'source_ready_candidate_no_db_write');
  lines.push('| Set | Number | Card | Variant | Finish | Sources |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const row of accepted) {
    const sources = row.sources.map((source) => `[${source.source_key}](${source.source_url})`).join('<br>');
    lines.push(`| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label} | ${row.finish_key} | ${sources} |`);
  }
  lines.push('');
  lines.push('## Review / Blocked Rows');
  lines.push('');
  lines.push('| Set | Number | Card | Status | Why |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.rows.filter((entry) => entry.status !== 'source_ready_candidate_no_db_write')) {
    const why = row.sources.map((source) => source.notes).join(' ');
    lines.push(`| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.status} | ${why} |`);
  }
  lines.push('');
  lines.push(`Fixture: \`${report.fixture_output}\``);
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function checkpoint(report) {
  const lines = [];
  lines.push('# Exact Finish Binding Manual Web Pass Checkpoint V1');
  lines.push('');
  lines.push('- Date: 2026-06-22');
  lines.push('- Mode: audit only');
  lines.push('- DB writes performed: false');
  lines.push('- Migrations created: false');
  lines.push('- Dry-run package prepared: false');
  lines.push('- Cleanup performed: false');
  lines.push('- Quarantine performed: false');
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`- Rows attempted: ${report.summary.rows_attempted}`);
  lines.push(`- Source-ready candidates: ${report.summary.by_status.source_ready_candidate_no_db_write ?? 0}`);
  lines.push(`- Identity-supported finish-unproven: ${report.summary.by_status.identity_supported_finish_unproven ?? 0}`);
  lines.push(`- Taxonomy review: ${report.summary.by_status.taxonomy_review_no_write ?? 0}`);
  lines.push(`- Still blocked: ${report.summary.by_status.still_blocked_no_exact_variant_finish ?? 0}`);
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- Report: ${path.relative(ROOT, OUTPUT_MD).replace(/\\/g, '/')}`);
  lines.push(`- JSON: ${path.relative(ROOT, OUTPUT_JSON).replace(/\\/g, '/')}`);
  lines.push(`- Fixture: ${path.relative(ROOT, FIXTURE_JSON).replace(/\\/g, '/')}`);
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  writeText(CHECKPOINT_FILE, `${lines.join('\n')}\n`);

  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  const rel = path.basename(CHECKPOINT_FILE);
  const line = `- 2026-06-22: Exact finish binding manual web pass checkpoint — attempts all 16 no-fixture rows and preserves 3 no-write source-ready candidates. See docs/checkpoints/master_index/${rel}.`;
  if (!current.includes(rel)) writeText(indexPath, `${current.trimEnd()}\n${line}\n`);
}

const seed = {
  version: 'exact_finish_binding_manual_web_pass_v1',
  generated_at: GENERATED_AT,
  safety: {
    db_writes_performed: false,
    migrations_created: false,
    dry_run_package_prepared: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_executed: false,
  },
  source_policy: 'Manual web evidence is preserved for source-delta review only. Taxonomy mismatches and base-finish-only rows are not promoted.',
  summary: {
    rows_attempted: ROWS.length,
    by_status: countBy(ROWS, (row) => row.status),
    by_finish_key: countBy(ROWS.filter((row) => row.finish_key), (row) => row.finish_key),
    fixture_records_written: fixtureRecords().length,
    write_ready_created: 0,
  },
  rows: ROWS,
  fixture_output: path.relative(ROOT, FIXTURE_JSON).replace(/\\/g, '/'),
};

const report = { ...seed, fingerprint_sha256: sha256(stableJson(seed)) };
writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeJson(FIXTURE_JSON, {
  fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
  source_key: 'exact_finish_binding_manual_web_pass_v1',
  source_kind: 'collector_reference',
  retrieved_at: GENERATED_AT,
  raw_snapshot_ref: `generated_fixture:exact_finish_binding_manual_web_pass_v1:${GENERATED_AT}`,
  records: fixtureRecords(),
});
checkpoint(report);

console.log(JSON.stringify(report.summary, null, 2));
console.log(`fingerprint_sha256=${report.fingerprint_sha256}`);
