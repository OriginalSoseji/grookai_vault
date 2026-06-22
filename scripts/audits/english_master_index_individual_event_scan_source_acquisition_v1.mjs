import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const VERSION = 'individual_event_scan_source_acquisition_v1';
const REPORT_DIR = `docs/audits/english_master_index_source_exhaustion_v1/${VERSION}`;
const FIXTURE_DIR = `docs/audits/verified_master_set_index_v1/source_fixtures/generated_${VERSION}`;
const CHECKPOINT_DIR = 'docs/checkpoints/master_index';
const ACTION_PLAN_PATH =
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_post_collexy_residual_action_plan_v1.json';

const EVIDENCE = [
  {
    set_key: 'bw1',
    set_name: 'Black & White',
    card_number: '111',
    card_name: 'Darkness Energy',
    variant_key: 'play_pokemon_stamp',
    stamp_label: 'Play! Pokemon Stamp',
    finish_key: 'holo',
    status: 'source_ready_candidate_no_db_write',
    sources: [
      {
        source_key: 'tcgculture_darkness_energy_play_pokemon_holofoil',
        source_kind: 'marketplace_checklist',
        source_url:
          'https://tcgculture.com/products/pokemon-darkness-energy-111-114-play-pokemon-promoleague-championship-cards',
        evidence_label:
          'TCG Culture Darkness Energy 111/114 Play Pokemon Promo with Holofoil condition variants',
        evidence_type: 'finish_presence',
        notes: 'Product title binds Black & White #111 Darkness Energy to Play Pokemon Promo; variant menu uses Holofoil.',
      },
    ],
  },
  {
    set_key: 'col1',
    set_name: 'Call of Legends',
    card_number: '88',
    card_name: 'Grass Energy',
    variant_key: 'player_rewards_crosshatch_stamp',
    stamp_label: 'Player Rewards Crosshatch Stamp',
    finish_key: 'holo',
    status: 'source_ready_candidate_no_db_write',
    sources: [
      {
        source_key: 'scrydex_col1_88_crosshatch_play_pokemon_holo',
        source_kind: 'collector_reference',
        source_url: 'https://scrydex.com/pokemon/cards/grass-energy/col1-88?variant=holofoil',
        evidence_label:
          'ScryDex Grass Energy COL1 #88 sales rows include Crosshatch-Play! Pokemon Grass Energy-Holo',
        evidence_type: 'finish_presence',
        notes: 'Exact set/card/number with Crosshatch-Play label and Holo wording.',
      },
    ],
  },
  {
    set_key: 'ex10',
    set_name: 'Unseen Forces',
    card_number: '29',
    card_name: 'Lugia',
    variant_key: 'pokemon_rocks_america_stamped_2005',
    stamp_label: 'Pokemon Rocks America Stamped; 2005',
    finish_key: 'normal',
    status: 'source_ready_candidate_no_db_write',
    sources: [
      {
        source_key: 'pricecharting_lugia_rocks_america_29',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-unseen-forces/lugia-rocks-america-29',
        evidence_label: 'PriceCharting Lugia [Rocks America] #29 Pokemon Unseen Forces',
        evidence_type: 'checklist_entry',
        notes: 'Product lane binds Lugia #29 to Pokemon Rocks America variant.',
      },
      {
        source_key: 'ebay_lugia_rocks_america_regular_29',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/327041957026',
        evidence_label:
          'eBay Lugia Pokemon Rocks America 2005 Promo 29/115 with product feature Finish Regular',
        evidence_type: 'finish_presence',
        notes: 'Listing/product metadata binds card number, stamp variant, and Regular finish.',
      },
    ],
  },
  {
    set_key: 'ex11',
    set_name: 'Delta Species',
    card_number: '61',
    card_name: 'Ditto',
    variant_key: 'origins_game_fair_stamped_200',
    stamp_label: 'Origins Game Fair Stamped; 200',
    finish_key: null,
    status: 'identity_supported_finish_unproven',
    sources: [
      {
        source_key: 'gamersparadise_ditto_61_origins_game_fair',
        source_kind: 'marketplace_checklist',
        source_url:
          'https://gamersparadisela.com/collections/vendors?constraint=ex-delta-species&page=3&q=pok%C3%A9mon',
        evidence_label: 'Gamers Paradise Ditto (61/113) (Origins Game Fair 2007) EX Delta Species',
        evidence_type: 'checklist_entry',
        notes: 'Useful identity/source context, but active finish is not explicit enough for promotion.',
      },
    ],
  },
  {
    set_key: 'ex11',
    set_name: 'Delta Species',
    card_number: '64',
    card_name: 'Ditto',
    variant_key: 'games_expo_stamped_2007',
    stamp_label: 'Games Expo Stamped; 2007',
    finish_key: null,
    status: 'identity_supported_finish_unproven',
    sources: [
      {
        source_key: 'pricecharting_ditto_games_expo_64',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-delta-species/ditto-games-expo-64',
        evidence_label: 'PriceCharting Ditto [Games Expo] #64 Pokemon Delta Species',
        evidence_type: 'checklist_entry',
        notes: 'Product lane supports exact card and Games Expo identity, but does not cleanly bind active finish.',
      },
    ],
  },
  {
    set_key: 'ex12',
    set_name: 'Legend Maker',
    card_number: '5',
    card_name: 'Gengar',
    variant_key: 'gym_challenge_stamped_2006_2007',
    stamp_label: 'Gym Challenge Stamped; 2006 2007',
    finish_key: 'normal',
    status: 'source_ready_candidate_no_db_write',
    sources: [
      {
        source_key: 'ebay_gengar_gym_challenge_regular_5',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/p/25047808324',
        evidence_label: 'eBay product page Gengar (Gym Challenge) 5/92 League & Championship Cards Regular',
        evidence_type: 'finish_presence',
        notes: 'Product page differentiates Gym Challenge stamped product and Regular finish.',
      },
      {
        source_key: 'pokescope_gengar_gym_challenge_5',
        source_kind: 'collector_reference',
        source_url: 'https://pokescope.app/card/ex12-5/',
        evidence_label: 'PokeScope EX Legend Maker Gengar #5 lists Gym Challenge Stamp variant',
        evidence_type: 'checklist_entry',
        notes: 'Supports distinct Gym Challenge Stamp variant for exact set/card identity.',
      },
    ],
  },
  {
    set_key: 'ex9',
    set_name: 'Emerald',
    card_number: '60',
    card_name: 'Pikachu',
    variant_key: 'san_diego_comic_con_international_stamped_2005',
    stamp_label: 'San Diego Comic Con International Stamped; 2005',
    finish_key: 'normal',
    status: 'source_ready_candidate_no_db_write',
    sources: [
      {
        source_key: 'sunvalley_pikachu_sdcc_60_regular',
        source_kind: 'marketplace_checklist',
        source_url:
          'https://www.sunvalleygaming.com/catalog/pokemon_singles-pokemon_promos/pikachu__60106__san_diego_comiccon_2005_promo/621706',
        evidence_label: 'Sun Valley Gaming Pikachu 60/106 San Diego Comic-Con 2005 Promo Finish Regular',
        evidence_type: 'finish_presence',
        notes: 'Exact set/card number/name with San Diego Comic-Con promo and Finish Regular.',
      },
      {
        source_key: 'bulbapedia_pikachu_ex_emerald_60_comic_con',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Pikachu_%28EX_Emerald_60%29',
        evidence_label: 'Bulbapedia release note for English Comic-Con stamped Pikachu',
        evidence_type: 'checklist_entry',
        notes: 'Supports English Comic-Con stamp release for EX Emerald Pikachu #60.',
      },
    ],
  },
  {
    set_key: 'ex9',
    set_name: 'Emerald',
    card_number: '70',
    card_name: 'Treecko',
    variant_key: 'indianapolis_gencon_stamped_2005',
    stamp_label: 'Indianapolis GenCon Stamped; 2005',
    finish_key: 'normal',
    status: 'source_ready_candidate_no_db_write',
    sources: [
      {
        source_key: 'pricecharting_treecko_gencon_70_non_holo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/treecko-gencon-70',
        evidence_label: 'PriceCharting Treecko [Gencon] #70 with Non-Holo GenCon sales title',
        evidence_type: 'finish_presence',
        notes: 'Exact card/number/GenCon variant with Non-Holo wording in preserved sales title.',
      },
    ],
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function loadQueueRows() {
  const plan = JSON.parse(fs.readFileSync(ACTION_PLAN_PATH, 'utf8'));
  return (plan.rows || []).filter((row) => row.blocker_class === 'individual_event_scan_needed');
}

function factKey(row) {
  return [row.set_key, row.card_number, row.card_name, row.variant_key].join('|').toLowerCase();
}

function buildFixtureRows() {
  const rows = [];
  for (const item of EVIDENCE.filter((entry) => entry.status === 'source_ready_candidate_no_db_write')) {
    for (const source of item.sources) {
      rows.push({
        source_key: source.source_key,
        source_kind: source.source_kind,
        source_url: source.source_url,
        set_key: item.set_key,
        set_name: item.set_name,
        card_number: item.card_number,
        card_name: item.card_name,
        variant_key: item.variant_key,
        stamp_label: item.stamp_label,
        finish_key: item.finish_key,
        evidence_type: source.evidence_type,
        evidence_label: source.evidence_label,
        notes: source.notes,
      });
    }
  }
  return rows;
}

function buildFixturePayload(records) {
  return {
    source_key: VERSION,
    source_kind: 'marketplace_checklist',
    source_url: 'multiple_preserved_source_urls',
    raw_snapshot_ref: `generated_${VERSION}`,
    records,
  };
}

function summarize(queueRows, evidenceRows) {
  const byStatus = {};
  for (const row of evidenceRows) byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  const attemptedKeys = new Set(evidenceRows.map(factKey));
  return {
    target_queue_rows: queueRows.length,
    rows_attempted: attemptedKeys.size,
    source_ready_candidates: evidenceRows.filter((row) => row.status === 'source_ready_candidate_no_db_write')
      .length,
    identity_supported_finish_unproven: evidenceRows.filter((row) => row.status === 'identity_supported_finish_unproven')
      .length,
    unattempted_rows: queueRows.length - attemptedKeys.size,
    fixture_records_written: buildFixtureRows().length,
    write_ready_created: 0,
    by_status: byStatus,
  };
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# Individual Event Scan Source Acquisition V1');
  lines.push('');
  lines.push('Audit-only source acquisition for the first individual-event stamped/special rows.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| metric | value |');
  lines.push('| --- | ---: |');
  for (const [key, value] of Object.entries(report.summary)) {
    if (typeof value !== 'object') lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');
  lines.push('## Evidence Rows');
  lines.push('');
  lines.push('| set | number | card | stamp | finish | status | sources |');
  lines.push('| --- | --- | --- | --- | --- | --- | ---: |');
  for (const row of report.evidence_rows) {
    lines.push(
      `| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label} | ${row.finish_key || 'unproven'} | ${row.status} | ${row.sources.length} |`,
    );
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No migrations.');
  lines.push('- No dry-run package prepared.');
  lines.push('- Source-ready means evidence was preserved for future source-delta review only.');
  lines.push('');
  lines.push(`Fixture: \`${report.fixture_output}\``);
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function appendCheckpointIndex(checkpointFile) {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  const rel = path.basename(checkpointFile);
  const line = `- 2026-06-22: Individual event scan source acquisition checkpoint V1 — preserves first-batch exact/review evidence for 8 of 28 individual-event rows, writes 10 fixture records, and keeps write_ready_now 0. See docs/checkpoints/master_index/${rel}.`;
  if (!current.includes(rel)) {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

function writeCheckpoint(report) {
  ensureDir(CHECKPOINT_DIR);
  const checkpointFile = path.join(CHECKPOINT_DIR, '20260622_individual_event_scan_source_acquisition_checkpoint_v1.md');
  const lines = [];
  lines.push('# Individual Event Scan Source Acquisition Checkpoint V1');
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push('');
  lines.push('## Outcome');
  lines.push('');
  lines.push(`- Target queue rows: ${report.summary.target_queue_rows}`);
  lines.push(`- Rows attempted: ${report.summary.rows_attempted}`);
  lines.push(`- Source-ready candidates preserved: ${report.summary.source_ready_candidates}`);
  lines.push(`- Identity-supported, finish-unproven rows: ${report.summary.identity_supported_finish_unproven}`);
  lines.push(`- Fixture records written: ${report.summary.fixture_records_written}`);
  lines.push('- `write_ready_created`: 0');
  lines.push('- No DB writes, migrations, dry-runs, applies, cleanup, or deletes.');
  fs.writeFileSync(checkpointFile, `${lines.join('\n')}\n`);
  appendCheckpointIndex(checkpointFile);
}

function main() {
  ensureDir(REPORT_DIR);
  ensureDir(FIXTURE_DIR);
  const queueRows = loadQueueRows();
  const summary = summarize(queueRows, EVIDENCE);
  const fixtureRows = buildFixtureRows();
  const fixtureOutput = path.join(FIXTURE_DIR, `${VERSION}.json`);
  const seed = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    source_queue: ACTION_PLAN_PATH,
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      dry_run_package_prepared: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_executed: false,
    },
    summary,
    evidence_rows: EVIDENCE,
    fixture_output: fixtureOutput,
  };
  const fingerprint = stableHash({
    version: seed.version,
    safety: seed.safety,
    summary: seed.summary,
    evidence_rows: seed.evidence_rows,
  });
  const report = { ...seed, fingerprint_sha256: fingerprint };
  fs.writeFileSync(fixtureOutput, `${JSON.stringify(buildFixturePayload(fixtureRows), null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.json`), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.md`), writeMarkdown(report));
  writeCheckpoint(report);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`fingerprint_sha256=${fingerprint}`);
}

main();
