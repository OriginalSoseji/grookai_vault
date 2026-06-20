import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const REPORT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17p_pokemonflashfire_league_reverse_source_v1.json');
const REPORT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17p_pokemonflashfire_league_reverse_source_v1.md');
const FIXTURE_JSON = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures', 'generated_pkg17p_pokemonflashfire_league_reverse_source_v1', 'pokemonflashfire_league_reverse_exact_sources_v1.json');

const PACKAGE_ID = 'PKG-17P-POKEMONFLASHFIRE-LEAGUE-REVERSE-SOURCE';
const SOURCE_KEY = 'pokemonflashfire_league_reverse_exact';

const SOURCE_ROWS = [
  ['bw1', '53', 'Whirlipede', 'https://pokemonflashfire.com/product/whirlipede-53114-reverse-holo-pokemon-league-promo/', 'Whirlipede 53/114 Reverse Holo Pokemon League Promo'],
  ['bw1', '79', 'Watchog', 'https://pokemonflashfire.com/product/watchog-79114-reverse-holo-pokemon-league-promo/', 'Watchog 79/114 Reverse Holo Pokemon League Promo'],
  ['bw1', '81', 'Lillipup', 'https://pokemonflashfire.com/product/lillipup-81114-reverse-holo-pokemon-league-promo/', 'Lillipup 81/114 Reverse Holo Pokemon League Promo'],
  ['bw11', '109', 'Bianca', 'https://pokemonflashfire.com/product/bianca-109113-reverse-holo-pokemon-league-promo/', 'Bianca 109/113 Reverse Holo Pokemon League Promo'],
  ['bw2', '82', 'Unfezant', 'https://pokemonflashfire.com/product/unfezant-8298-reverse-holo-pokemon-league-promo/', 'Unfezant 82/98 Reverse Holo Pokemon League Promo'],
  ['bw3', '32', 'Cryogonal', 'https://pokemonflashfire.com/product/cryogonal-32101-reverse-holo-pokemon-league-promo/', 'Cryogonal 32/101 Reverse Holo Pokemon League Promo'],
  ['bw8', '120', 'Escape Rope', 'https://pokemonflashfire.com/product/escape-rope-120135-reverse-holo-pokemon-league-promo/', 'Escape Rope 120/135 Reverse Holo Pokemon League Promo'],
  ['hgss1', '39', 'Delibird', 'https://pokemonflashfire.com/product/delibird-39123-reverse-holo-pokemon-league-promo/', 'Delibird 39/123 Reverse Holo Pokemon League Promo'],
  ['pl1', '104', 'Broken Time-Space', 'https://pokemonflashfire.com/product/broken-time-space-104127-reverse-holo-pokemon-league-promo/', 'Broken Time Space 104/127 Reverse Holo Pokemon League Promo'],
  ['pl3', '26', 'Dusknoir FB', 'https://pokemonflashfire.com/product/dusknoir-fb-26147-reverse-holo-pokemon-league-promo/', 'Dusknoir FB 26/147 Reverse Holo Pokemon League Promo'],
  ['pl4', '32', 'Spiritomb', 'https://pokemonflashfire.com/product/spiritomb-3299-reverse-holo-pokemon-league-promo/', 'Spiritomb 32/99 Reverse Holo Pokemon League promo'],
  ['pl4', '87', 'Expert Belt', 'https://pokemonflashfire.com/product/expert-belt-8799-reverse-holo-pokemon-league-promo/', 'Expert Belt 87/99 Reverse Holo Pokemon League Promo'],
  ['xy8', '101', 'Flabébé', 'https://pokemonflashfire.com/product/flabebe-101162-reverse-holo-pokemon-league-promo/', 'Flabebe 101/162 Reverse Holo Pokemon League Promo'],
  ['xy8', '102', 'Floette', 'https://pokemonflashfire.com/product/floette-102162-reverse-holo-pokemon-league-promo/', 'Floette 102/162 Reverse Holo Pokemon League Promo'],
  ['pl2', '89', "Bebe's Search", 'https://pokemonflashfire.com/product/bebes-search-89111-reverse-holo-pokemon-league-promo/', "Bebe's Search 89/111 Reverse Holo Pokemon League Promo"],
  ['pl2', '98', "Volkner's Philosophy", 'https://pokemonflashfire.com/product/volkners-philosophy-98111-reverse-holo-pokemon-league-promo/', "Volkner's Philosophy 98/111 Reverse Holo Pokemon League Promo"],
  ['pl2', '33', 'Snorlax', 'https://pokemonflashfire.com/product/snorlax-33111-reverse-holo-pokemon-league-promo/', 'Snorlax 33/111 Reverse Holo Pokemon League Promo'],
  ['pl3', '5', 'Garchomp', 'https://pokemonflashfire.com/product/garchomp-5147-2010-reverse-holo-pokemon-league-promo/', 'Garchomp 5/147 2010 Reverse Holo Pokemon League Promo'],
  ['hgss2', '7', 'Politoed', 'https://pokemonflashfire.com/product/politoed-795-reverse-holo-pokemon-league-promo/', 'Politoed 7/95 Reverse Holo Pokemon League Promo'],
  ['hgss2', '21', 'Poliwrath', 'https://pokemonflashfire.com/product/poliwrath-2195-reverse-holo-pokemon-league-promo/', 'Poliwrath 21/95 Reverse Holo Pokemon League Promo'],
  ['hgss2', '82', 'Rare Candy', 'https://pokemonflashfire.com/product/rare-candy-8295-reverse-holo-pokemon-league-promo/', 'Rare Candy 82/95 Reverse Holo Pokemon League Promo'],
  ['hgss1', '97', 'Pokémon Collector', 'https://pokemonflashfire.com/product/pokemon-collector-97123-reverse-holo-pokemon-league-promo/', 'Pokemon Collector 97/123 Reverse Holo Pokemon League Promo'],
  ['bw11', '36', 'Pokemon Catcher', 'https://pokemonflashfire.com/product/pokemon-catcher-3639-reverse-holo-pokemon-league-promo/', 'Pokemon Catcher 36/39 Reverse Holo Pokemon League Promo'],
  ['pl2', '43', 'Uxie', 'https://pokemonflashfire.com/product/uxie-43146-reverse-holo-pokemon-league-promo/', 'Uxie 43/146 Reverse Holo Pokemon League Promo'],
  ['pl2', '97', 'Underground Expedition', 'https://pokemonflashfire.com/product/underground-expedition-97111-reverse-holo-pokemon-league-promo/', 'Underground Expedition 97/111 Reverse Holo Pokemon League Promo'],
  ['pl2', '102', 'Upper Energy', 'https://pokemonflashfire.com/product/upper-energy-102111-reverse-holo-pokemon-league-promo/', 'Upper Energy 102/111 Reverse Holo Pokemon League Promo'],
  ['pl3', '136', "Cynthia's Guidance", 'https://pokemonflashfire.com/product/cynthias-guidance-136147-reverse-holo-pokemon-league-promo/', "Cynthia's Guidance 136/147 Reverse Holo Pokemon League Promo"],
  ['pl3', '56', 'Dragonite FB', 'https://pokemonflashfire.com/product/dragonite-fb-56147-reverse-holo-pokemon-league-promo/', 'Dragonite FB 56/147 Reverse Holo Pokemon League Promo'],
  ['dp6', '125', "Roseanne's Research", 'https://pokemonflashfire.com/product/roseannes-research-125132-reverse-holo-pokemon-league-promo/', "Roseanne's Research 125/132 Reverse Holo Pokemon League Promo"],
];

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

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value)).replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+/, '');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function sourceMap() {
  return new Map(SOURCE_ROWS.map(([setKey, cardNumber, cardName, sourceUrl, evidenceLabel]) => [
    [setKey, compactNumber(cardNumber), comparable(cardName)].join('|'),
    { set_key: setKey, card_number: cardNumber, card_name: cardName, source_url: sourceUrl, evidence_label: evidenceLabel },
  ]));
}

function currentLeagueReverseTargets(pkg17a) {
  return (pkg17a.rows ?? [])
    .filter((row) => row.queue_status === 'active_finish_required')
    .filter((row) => row.variant_key === 'league_stamp')
    .filter((row) => row.card_number && row.card_name && row.set_key)
    .map((row) => ({
      ...row,
      source_key: [row.set_key, compactNumber(row.card_number), comparable(row.card_name)].join('|'),
    }));
}

function renderMarkdown(report) {
  const acceptedRows = report.records.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.source_url,
  ]);
  const skippedRows = report.skipped_rows.map((row) => [row.set_key, row.card_number, row.card_name, row.reason]);

  return `# PKG-17P PokemonFlashfire League Reverse Source V1

Audit-only fixture generation from manually reviewed PokemonFlashfire/DJS Pokemon Cards League reverse product and category pages.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['source_rows_reviewed', report.summary.source_rows_reviewed],
    ['current_queue_matches', report.summary.current_queue_matches],
    ['fixture_records_written', report.summary.fixture_records_written],
    ['skipped_rows', report.summary.skipped_rows],
  ])}

## Fixture Records

${acceptedRows.length ? markdownTable(['set', 'number', 'name', 'finish', 'source url'], acceptedRows) : 'None.'}

## Skipped Rows

${skippedRows.length ? markdownTable(['set', 'number', 'name', 'reason'], skippedRows) : 'None.'}

## Source Handling

The fixture stores URL and label evidence only. It does not store page dumps. This lane is not a DB write package.
`;
}

async function main() {
  const pkg17a = await readJson(PKG17A_JSON);
  const targets = currentLeagueReverseTargets(pkg17a);
  const targetsByKey = new Map(targets.map((row) => [row.source_key, row]));
  const sourceRowsByKey = sourceMap();
  const records = [];
  const skippedRows = [];

  for (const [key, source] of sourceRowsByKey.entries()) {
    const target = targetsByKey.get(key);
    if (!target) {
      skippedRows.push({ ...source, reason: 'not_in_current_pkg17a_active_finish_queue' });
      continue;
    }
    records.push({
      source_key: SOURCE_KEY,
      source_kind: 'marketplace_checklist',
      source_url: source.source_url,
      set_key: target.set_key,
      set_name: target.set_name,
      card_number: target.card_number,
      card_name: target.card_name,
      finish_key: 'reverse',
      rarity: null,
      variant_key: target.variant_key,
      stamp_label: target.stamp_label,
      evidence_type: 'finish_presence',
      evidence_label: `PokemonFlashfire product/category label: ${source.evidence_label}`,
      evidence_text_or_label: source.evidence_label,
      language: 'en',
      retrieved_at: new Date().toISOString(),
      raw_snapshot_ref: `pokemonflashfire:${target.set_key}:${target.card_number}:league_stamp:reverse`,
      notes: 'Accepted only because the reviewed PokemonFlashfire/DJS source label states card number, Reverse Holo, and Pokemon League Promo for a current PKG-17A queue row.',
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17p_pokemonflashfire_league_reverse_source_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: rel(PKG17A_JSON),
      fixture_json: rel(FIXTURE_JSON),
    },
    fingerprint_sha256: sha256(stableJson(records)),
    summary: {
      source_rows_reviewed: SOURCE_ROWS.length,
      current_queue_matches: records.length,
      fixture_records_written: records.length,
      skipped_rows: skippedRows.length,
    },
    records,
    skipped_rows: skippedRows,
  };

  await writeJson(FIXTURE_JSON, {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_status: 'manual_url_label_fixture',
    generated_at: report.generated_at,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    generation_note: 'Generated from manually reviewed PokemonFlashfire/DJS Pokemon Cards League reverse product/category labels. URL and label evidence only; no page dumps.',
    records,
  });
  await writeJson(REPORT_JSON, report);
  await writeText(REPORT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(REPORT_JSON),
    output_md: rel(REPORT_MD),
    fixture_json: rel(FIXTURE_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
