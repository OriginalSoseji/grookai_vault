import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const DEFAULT_CSV_PATH = 'tmp/pricecharting/pokemon_cards_pricecharting.csv';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_mee_energy_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pricecharting_mee_energy_acquisition_v1';
const SOURCE_KEY = 'pricecharting_csv_mee_energy';

const ENERGY_BY_NUMBER = new Map([
  ['1', 'Basic Grass Energy'],
  ['2', 'Basic Fire Energy'],
  ['3', 'Basic Water Energy'],
  ['4', 'Basic Lightning Energy'],
  ['5', 'Basic Psychic Energy'],
  ['6', 'Basic Fighting Energy'],
  ['7', 'Basic Darkness Energy'],
  ['8', 'Basic Metal Energy'],
]);

function parseArgs(argv) {
  const options = { csvPath: DEFAULT_CSV_PATH, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--csv') {
      options.csvPath = next;
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function readCsv(csvPath) {
  const raw = await fs.readFile(csvPath, 'utf8');
  const rows = parseCsv(raw);
  const headers = rows.shift() ?? [];
  return rows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[''.:]/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceUrl(row) {
  return `https://www.pricecharting.com/game/${slug(row['console-name'])}/${slug(row['product-name'])}`;
}

function productNumber(productName) {
  const match = String(productName ?? '').match(/#([A-Za-z0-9.-]+)\b/);
  return normalizeNumber(match?.[1]);
}

function productFinish(productName) {
  const normalized = normalizeText(productName);
  if (normalized.includes('reverse holo')) return 'reverse';
  if (/\[(prize pack|cosmos|holo|ice cracked|cracked ice)\]/i.test(String(productName ?? ''))) return null;
  return 'normal';
}

function productEnergyName(productName, number) {
  const expected = ENERGY_BY_NUMBER.get(normalizeNumber(number));
  if (!expected) return null;
  const normalizedProduct = normalizeText(productName);
  const energyType = normalizeText(expected.replace(/^Basic\s+/i, '').replace(/\s+Energy$/i, ''));
  if (!normalizedProduct.includes(energyType) || !normalizedProduct.includes('energy')) return null;
  return expected;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const rows = await readCsv(options.csvPath);
  const recordsByFact = new Map();
  const reviewed = [];

  for (const row of rows) {
    if (normalizeText(row['console-name']) !== 'pokemon mega evolution energy') continue;
    const number = productNumber(row['product-name']);
    const finishKey = productFinish(row['product-name']);
    const cardName = productEnergyName(row['product-name'], number);
    if (!number || !finishKey || !cardName) continue;
    const key = `${normalizeNumber(number)}|${finishKey}`;
    const record = {
      source_key: SOURCE_KEY,
      source_kind: 'marketplace_checklist',
      source_url: sourceUrl(row),
      set_key: 'mee',
      set_name: 'Mega Evolution Energy',
      card_number: normalizeNumber(number).padStart(3, '0'),
      card_name: cardName,
      finish_key: finishKey,
      rarity: null,
      evidence_type: 'finish_presence',
      evidence_label: `PriceCharting CSV row: ${row['product-name']}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `pricecharting_csv:${row.id || row['id'] || row['product-id'] || key}`,
      notes: 'Exact PriceCharting CSV marketplace row for Mega Evolution Energy card number, card name, and finish label.',
    };
    if (!recordsByFact.has(key)) recordsByFact.set(key, record);
    reviewed.push({
      product_name: row['product-name'],
      card_number: record.card_number,
      card_name: record.card_name,
      finish_key: record.finish_key,
      source_url: record.source_url,
      accepted: recordsByFact.get(key) === record,
    });
  }

  const records = [...recordsByFact.values()]
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || a.finish_key.localeCompare(b.finish_key));

  const fixtureFile = path.join(FIXTURE_DIR, 'mee.json');
  if (!options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    await fs.writeFile(fixtureFile, `${JSON.stringify({
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: SOURCE_KEY,
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/console/pokemon-mega-evolution-energy',
      source_status: 'available_generated_csv',
      set_key: 'mee',
      set_name: 'Mega Evolution Energy',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records,
    }, null, 2)}\n`);
  }

  const report = {
    version: 'english_master_index_pricecharting_mee_energy_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    csv_path: options.csvPath,
    fixture_file: options.dryRun ? null : fixtureFile,
    summary: {
      csv_rows_read: rows.length,
      records_generated: records.length,
      by_finish: Object.fromEntries(['normal', 'reverse'].map((finish) => [finish, records.filter((record) => record.finish_key === finish).length])),
    },
    reviewed_rows: reviewed,
  };

  if (!options.dryRun) {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_mee_energy_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_mee_energy_acquisition_v1.md'), [
      '# PriceCharting MEE Energy Acquisition V1',
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      '## Summary',
      '',
      markdownTable(
        ['Metric', 'Value'],
        [
          ['csv_rows_read', report.summary.csv_rows_read],
          ['records_generated', report.summary.records_generated],
          ['normal_records', report.summary.by_finish.normal],
          ['reverse_records', report.summary.by_finish.reverse],
        ],
      ),
      '',
      '## Accepted Rows',
      '',
      markdownTable(
        ['Number', 'Name', 'Finish', 'URL'],
        records.map((record) => [record.card_number, record.card_name, record.finish_key, record.source_url]),
      ),
      '',
    ].join('\n'));
  }

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[pricecharting-mee-energy] failed:', error);
  process.exitCode = 1;
});
