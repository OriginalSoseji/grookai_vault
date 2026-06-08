import fs from 'node:fs/promises';
import path from 'node:path';

import { normalizeFinishKey, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const INDEX_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_thepricedex_preservation_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/thepricedex_preservation_v1';
const SOURCE_KEY = 'thepricedex_price_list';
const SOURCE_AUTHORITY = 'thepricedex.com';

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function hasPriceDexSupport(row) {
  return (row.sources ?? []).includes(SOURCE_KEY)
    || (row.source_authorities ?? []).includes(SOURCE_AUTHORITY)
    || (row.evidence_urls ?? []).some((url) => String(url).includes(SOURCE_AUTHORITY));
}

function priceDexUrl(row) {
  return (row.evidence_urls ?? []).find((url) => String(url).includes(SOURCE_AUTHORITY))
    ?? 'https://www.thepricedex.com/';
}

function recordKey(row) {
  return [
    row.evidence_type,
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeFinishKey(row.finish_key) ?? '',
  ].join('|');
}

function cardRecord(row, generatedAt, indexGeneratedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: priceDexUrl(row),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: null,
    rarity: row.rarity_values?.[0] ?? null,
    evidence_type: 'card_identity',
    evidence_label: 'ThePriceDex preserved card identity evidence from last promoted Master Index',
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `thepricedex_preservation:${indexGeneratedAt}:${row.set_key}:${row.card_number}:identity`,
    notes: 'Audit-only preservation row. This preserves previously promoted ThePriceDex evidence under the same source authority; it is not a new independent source.',
  };
}

function printingRecord(row, generatedAt, indexGeneratedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: priceDexUrl(row),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: normalizeFinishKey(row.finish_key),
    rarity: row.rarity_values?.[0] ?? null,
    evidence_type: 'finish_presence',
    evidence_label: 'ThePriceDex preserved finish evidence from last promoted Master Index',
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `thepricedex_preservation:${indexGeneratedAt}:${row.set_key}:${row.card_number}:${normalizeFinishKey(row.finish_key)}`,
    notes: 'Audit-only preservation row. This preserves previously promoted ThePriceDex evidence under the same source authority; it is not a new independent source.',
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [index, cardsPayload, printingsPayload] = await Promise.all([
    readJson(path.join(INDEX_DIR, 'english_master_index_v1.json')),
    readJson(path.join(INDEX_DIR, 'english_master_index_cards_v1.json')),
    readJson(path.join(INDEX_DIR, 'english_master_index_printings_v1.json')),
  ]);
  const indexGeneratedAt = index.generated_at ?? 'unknown';
  const cardRecords = (cardsPayload.cards ?? [])
    .filter(hasPriceDexSupport)
    .map((row) => cardRecord(row, generatedAt, indexGeneratedAt));
  const printingRecords = (printingsPayload.printings ?? [])
    .filter(hasPriceDexSupport)
    .map((row) => printingRecord(row, generatedAt, indexGeneratedAt));
  const records = [...new Map([...cardRecords, ...printingRecords].map((row) => [recordKey(row), row])).values()]
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key ?? '').localeCompare(String(b.finish_key ?? '')));

  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: 'thepricedex_preservation_v1',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.thepricedex.com/',
    source_status: 'available_generated_preservation',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:thepricedex_preservation:${indexGeneratedAt}:${generatedAt}`,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    generation_note: 'Generated from the last promoted English Master Index to preserve ThePriceDex evidence against live source volatility. Rows intentionally retain source_key thepricedex_price_list and authority thepricedex.com; they are not new independent evidence.',
    records,
  };

  const report = {
    version: 'english_master_index_thepricedex_preservation_from_index_v1',
    generated_at: generatedAt,
    source_index_generated_at: indexGeneratedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_file: options.dryRun ? null : path.join(FIXTURE_DIR, 'thepricedex_preservation_v1.json'),
    summary: {
      records_generated: records.length,
      card_identity_records: cardRecords.length,
      finish_presence_records: printingRecords.length,
      source_key_preserved_as: SOURCE_KEY,
      source_authority_preserved_as: SOURCE_AUTHORITY,
    },
  };

  if (!options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    await fs.writeFile(path.join(FIXTURE_DIR, 'thepricedex_preservation_v1.json'), `${JSON.stringify(fixture, null, 2)}\n`);
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'thepricedex_preservation_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    const md = [
      '# ThePriceDex Preservation V1',
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      'This fixture preserves ThePriceDex evidence from the last promoted English Master Index under the same source authority. It does not create a new independent source.',
      '',
      `Generated: ${generatedAt}`,
      `Source index generated: ${indexGeneratedAt}`,
      '',
      `- Records generated: ${records.length}`,
      `- Card identity records: ${cardRecords.length}`,
      `- Finish presence records: ${printingRecords.length}`,
      '',
    ].join('\n');
    await fs.writeFile(path.join(REPORT_DIR, 'thepricedex_preservation_v1.md'), md);
  }

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[thepricedex-preservation] failed:', error);
  process.exitCode = 1;
});
