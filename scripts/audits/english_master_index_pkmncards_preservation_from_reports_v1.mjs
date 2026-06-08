import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const SOURCE_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const OUTPUT_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_preservation_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pkmncards_preservation_v1';

function pkmnCardsUrl(row) {
  return (row.evidence_urls ?? []).find((url) => /https?:\/\/(?:www\.)?pkmncards\.com\/card\//i.test(url)) ?? null;
}

function evidenceKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    pkmnCardsUrl(row),
  ].join('|');
}

function countBy(rows, selector) {
  const out = {};
  for (const row of rows) {
    const key = selector(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function groupBySet(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  return grouped;
}

function fixtureRecord(row) {
  const sourceUrl = pkmnCardsUrl(row);
  return {
    source_key: 'pkmncards',
    source_kind: 'collector_reference',
    source_url: sourceUrl,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: null,
    rarity: row.rarity_values?.[0] ?? null,
    evidence_type: 'card_identity',
    evidence_label: `PkmnCards direct card page ${row.card_name} - ${row.set_name} #${row.card_number}`,
    notes: 'Preserved from promoted Master Index baseline so live PkmnCards volatility cannot remove previously verified card identity evidence. This fixture does not create finish truth.',
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const cardsReport = await readJson(path.join(SOURCE_DIR, 'english_master_index_cards_v1.json'));
  const seen = new Set();
  const rows = [];
  for (const row of cardsReport.cards ?? []) {
    if (!(row.sources ?? []).includes('pkmncards')) continue;
    if (!pkmnCardsUrl(row)) continue;
    const key = evidenceKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const fixtureFiles = [];
  for (const [setKey, setRows] of groupBySet(rows).entries()) {
    const first = setRows[0];
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: 'pkmncards',
      source_kind: 'collector_reference',
      source_url: 'https://pkmncards.com/',
      source_status: 'available_preserved',
      set_key: setKey,
      set_name: first.set_name,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pkmncards_preservation:${setKey}:${generatedAt}`,
      generation_note: 'Preserves direct PkmnCards card-page evidence from the promoted Master Index baseline when live set-page scraping is unavailable or omits rows. This fixture does not create finish truth.',
      records: setRows
        .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true }))
        .map(fixtureRecord),
    };
    const file = path.join(OUTPUT_DIR, `${setKey}.json`);
    await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
    fixtureFiles.push(file);
  }

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const report = {
    version: 'english_master_index_pkmncards_preservation_from_reports_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_report: path.join(SOURCE_DIR, 'english_master_index_cards_v1.json'),
    fixture_dir: OUTPUT_DIR,
    summary: {
      preserved_records: rows.length,
      fixture_files_written: fixtureFiles.length,
      by_set: countBy(rows, (row) => `${row.set_key}|${row.set_name}`),
    },
    fixture_files: fixtureFiles,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'pkmncards_preservation_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
  const setRows = Object.entries(report.summary.by_set).map(([key, count]) => {
    const [setKey, setName] = key.split('|');
    return [setKey, setName, count];
  });
  await fs.writeFile(path.join(REPORT_DIR, 'pkmncards_preservation_v1.md'), [
    '# PkmnCards Preservation V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    'This preserves direct PkmnCards card-page evidence from the promoted Master Index baseline so live-source volatility cannot reduce prior evidence. It does not create finish truth.',
    '',
    markdownTable(['metric', 'value'], [
      ['preserved records', report.summary.preserved_records],
      ['fixture files written', report.summary.fixture_files_written],
      ['fixture dir', OUTPUT_DIR],
    ]),
    '',
    '## By Set',
    '',
    markdownTable(['set_key', 'set_name', 'records'], setRows),
    '',
  ].join('\n'));

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
