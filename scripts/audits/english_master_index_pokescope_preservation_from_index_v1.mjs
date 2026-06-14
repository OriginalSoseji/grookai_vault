import fs from 'node:fs/promises';
import path from 'node:path';

import { normalizeFinishKey, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const INDEX_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokescope_preservation_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokescope_preservation_v1';
const SOURCE_AUTHORITY = 'pokescope.app';

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

function pokescopeSources(row) {
  return (row.sources ?? []).filter((source) => String(source).startsWith('pokescope'));
}

function hasPokeScopeSupport(row) {
  return pokescopeSources(row).length > 0
    || (row.source_authorities ?? []).includes(SOURCE_AUTHORITY)
    || (row.evidence_urls ?? []).some((url) => String(url).includes(SOURCE_AUTHORITY));
}

function pokescopeUrl(row) {
  return (row.evidence_urls ?? []).find((url) => String(url).includes(SOURCE_AUTHORITY))
    ?? 'https://pokescope.app/';
}

function preservedSourceKey(row) {
  return pokescopeSources(row)[0] ?? 'pokescope_preserved_from_index';
}

function recordKey(row) {
  return [
    row.source_key,
    row.evidence_type,
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeFinishKey(row.finish_key) ?? '',
  ].join('|');
}

function cardRecord(row, generatedAt, indexGeneratedAt) {
  const sourceKey = preservedSourceKey(row);
  return {
    source_key: sourceKey,
    source_kind: 'marketplace_checklist',
    source_url: pokescopeUrl(row),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: null,
    rarity: row.rarity_values?.[0] ?? null,
    evidence_type: 'card_identity',
    evidence_label: 'PokeScope preserved card identity evidence from last promoted Master Index',
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pokescope_preservation:${indexGeneratedAt}:${sourceKey}:${row.set_key}:${row.card_number}:identity`,
    notes: 'Audit-only preservation row. This preserves previously promoted PokeScope evidence under the same source authority; it is not a new independent source.',
  };
}

function printingRecord(row, generatedAt, indexGeneratedAt) {
  const sourceKey = preservedSourceKey(row);
  return {
    source_key: sourceKey,
    source_kind: 'marketplace_checklist',
    source_url: pokescopeUrl(row),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: normalizeFinishKey(row.finish_key),
    rarity: row.rarity_values?.[0] ?? null,
    evidence_type: 'finish_presence',
    evidence_label: 'PokeScope preserved finish evidence from last promoted Master Index',
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pokescope_preservation:${indexGeneratedAt}:${sourceKey}:${row.set_key}:${row.card_number}:${normalizeFinishKey(row.finish_key)}`,
    notes: 'Audit-only preservation row. This preserves previously promoted PokeScope evidence under the same source authority; it is not a new independent source.',
  };
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
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
    .filter(hasPokeScopeSupport)
    .map((row) => cardRecord(row, generatedAt, indexGeneratedAt));
  const printingRecords = (printingsPayload.printings ?? [])
    .filter(hasPokeScopeSupport)
    .map((row) => printingRecord(row, generatedAt, indexGeneratedAt));
  const records = [...new Map([...cardRecords, ...printingRecords].map((row) => [recordKey(row), row])).values()]
    .sort((a, b) => String(a.source_key).localeCompare(String(b.source_key))
      || String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key ?? '').localeCompare(String(b.finish_key ?? '')));

  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: 'pokescope_preservation_v1',
    source_kind: 'marketplace_checklist',
    source_url: 'https://pokescope.app/',
    source_status: 'available_generated_preservation',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:pokescope_preservation:${indexGeneratedAt}:${generatedAt}`,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    generation_note: 'Generated from the last promoted English Master Index to preserve PokeScope evidence against live source volatility. Rows intentionally retain the original PokeScope source_key and authority; they are not new independent evidence.',
    records,
  };

  const report = {
    version: 'english_master_index_pokescope_preservation_from_index_v1',
    generated_at: generatedAt,
    source_index_generated_at: indexGeneratedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_file: options.dryRun ? null : path.join(FIXTURE_DIR, 'pokescope_preservation_v1.json'),
    summary: {
      records_generated: records.length,
      card_identity_records: cardRecords.length,
      finish_presence_records: printingRecords.length,
      source_authority_preserved_as: SOURCE_AUTHORITY,
      by_source_key: countBy(records, (row) => row.source_key),
      by_set_key: countBy(records, (row) => row.set_key),
    },
  };

  if (!options.dryRun) {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    await fs.writeFile(path.join(FIXTURE_DIR, 'pokescope_preservation_v1.json'), `${JSON.stringify(fixture, null, 2)}\n`);
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'pokescope_preservation_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    const md = [
      '# PokeScope Preservation V1',
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      'This fixture preserves PokeScope evidence from the last promoted English Master Index under the same source authority. It does not create a new independent source.',
      '',
      `Generated: ${generatedAt}`,
      `Source index generated: ${indexGeneratedAt}`,
      '',
      `- Records generated: ${records.length}`,
      `- Card identity records: ${cardRecords.length}`,
      `- Finish presence records: ${printingRecords.length}`,
      '',
    ].join('\n');
    await fs.writeFile(path.join(REPORT_DIR, 'pokescope_preservation_v1.md'), md);
  }

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[pokescope-preservation] failed:', error);
  process.exitCode = 1;
});
