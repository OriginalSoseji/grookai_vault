import fs from 'node:fs/promises';
import path from 'node:path';

import { normalizeFinishKey, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const INDEX_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';

const SOURCE_CONFIGS = {
  pricecharting_csv_product: {
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/console/pokemon-cards',
    authority: 'pricecharting.com',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_csv_preservation_v1',
    report_dir: 'docs/audits/english_master_index_source_exhaustion_v1/pricecharting_csv_preservation_v1',
    fixture_name: 'pricecharting_csv_preservation_v1.json',
  },
  pokellector_set_checklist: {
    source_kind: 'collector_reference',
    source_url: 'https://www.pokellector.com/',
    authority: 'pokellector.com',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokellector_preservation_v1',
    report_dir: 'docs/audits/english_master_index_source_exhaustion_v1/pokellector_preservation_v1',
    fixture_name: 'pokellector_preservation_v1.json',
  },
  pkmncards_identity_gap: {
    source_kind: 'collector_reference',
    source_url: 'https://pkmncards.com/',
    authority: 'pkmncards.com',
    exact_source_key_only: true,
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_identity_gap_preservation_v1',
    report_dir: 'docs/audits/english_master_index_source_exhaustion_v1/pkmncards_identity_gap_preservation_v1',
    fixture_name: 'pkmncards_identity_gap_preservation_v1.json',
  },
  reverseholo_set_checklist: {
    source_kind: 'collector_reference',
    source_url: 'https://reverseholo.app/',
    authority: 'reverseholo.app',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_reverseholo_preservation_v1',
    report_dir: 'docs/audits/english_master_index_source_exhaustion_v1/reverseholo_preservation_v1',
    fixture_name: 'reverseholo_preservation_v1.json',
  },
  bulbapedia_set_list: {
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Trading_Card_Game',
    authority: 'bulbapedia.bulbagarden.net',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_set_list_preservation_v1',
    report_dir: 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_set_list_preservation_v1',
    fixture_name: 'bulbapedia_set_list_preservation_v1.json',
  },
  official_pokemon_legacy_checklist: {
    source_kind: 'official_gallery',
    source_url: 'https://www.pokemon.com/us/pokemon-tcg',
    authority: 'pokemon.com',
    exact_source_key_only: true,
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_official_pokemon_legacy_checklist_preservation_v1',
    report_dir: 'docs/audits/english_master_index_source_exhaustion_v1/official_pokemon_legacy_checklist_preservation_v1',
    fixture_name: 'official_pokemon_legacy_checklist_preservation_v1.json',
  },
  tcgcsv_prize_pack_catalog: {
    source_kind: 'marketplace_checklist',
    source_url: 'https://tcgcsv.com/tcgplayer/3/22880/products',
    authority: 'tcgplayer.com',
    exact_source_key_only: true,
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_preservation_v1',
    report_dir: 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_prize_pack_preservation_v1',
    fixture_name: 'tcgcsv_prize_pack_preservation_v1.json',
  },
};

function parseArgs(argv) {
  const options = { sourceKey: null, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--source-key') {
      options.sourceKey = next;
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.sourceKey) throw new Error('--source-key is required');
  if (!SOURCE_CONFIGS[options.sourceKey]) throw new Error(`Unsupported source key: ${options.sourceKey}`);
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function sourceUrl(row, config) {
  return (row.evidence_urls ?? []).find((url) => String(url).includes(config.authority)) ?? config.source_url;
}

function hasSource(row, sourceKey, config) {
  if (config.exact_source_key_only) return (row.sources ?? []).includes(sourceKey);
  return (row.sources ?? []).includes(sourceKey)
    || (row.source_authorities ?? []).some((authority) => String(authority).includes(config.authority))
    || (row.evidence_urls ?? []).some((url) => String(url).includes(config.authority));
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

function cardRecord(row, sourceKey, config, generatedAt, indexGeneratedAt) {
  return {
    source_key: sourceKey,
    source_kind: config.source_kind,
    source_url: sourceUrl(row, config),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: null,
    rarity: row.rarity_values?.[0] ?? null,
    evidence_type: 'card_identity',
    evidence_label: `${sourceKey} preserved card identity evidence from last promoted Master Index`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `source_preservation:${sourceKey}:${indexGeneratedAt}:${row.set_key}:${row.card_number}:identity`,
    notes: `Audit-only preservation row. This preserves previously promoted ${sourceKey} evidence under the same source authority; it is not a new independent source.`,
  };
}

function printingRecord(row, sourceKey, config, generatedAt, indexGeneratedAt) {
  return {
    source_key: sourceKey,
    source_kind: config.source_kind,
    source_url: sourceUrl(row, config),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: normalizeFinishKey(row.finish_key),
    rarity: row.rarity_values?.[0] ?? null,
    evidence_type: 'finish_presence',
    evidence_label: `${sourceKey} preserved finish evidence from last promoted Master Index`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `source_preservation:${sourceKey}:${indexGeneratedAt}:${row.set_key}:${row.card_number}:${normalizeFinishKey(row.finish_key)}`,
    notes: `Audit-only preservation row. This preserves previously promoted ${sourceKey} evidence under the same source authority; it is not a new independent source.`,
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const config = SOURCE_CONFIGS[options.sourceKey];
  const generatedAt = new Date().toISOString();
  const [index, cardsPayload, printingsPayload] = await Promise.all([
    readJson(path.join(INDEX_DIR, 'english_master_index_v1.json')),
    readJson(path.join(INDEX_DIR, 'english_master_index_cards_v1.json')),
    readJson(path.join(INDEX_DIR, 'english_master_index_printings_v1.json')),
  ]);
  const indexGeneratedAt = index.generated_at ?? 'unknown';
  const cardRecords = (cardsPayload.cards ?? [])
    .filter((row) => hasSource(row, options.sourceKey, config))
    .map((row) => cardRecord(row, options.sourceKey, config, generatedAt, indexGeneratedAt));
  const printingRecords = (printingsPayload.printings ?? [])
    .filter((row) => hasSource(row, options.sourceKey, config))
    .map((row) => printingRecord(row, options.sourceKey, config, generatedAt, indexGeneratedAt));
  const records = [...new Map([...cardRecords, ...printingRecords].map((record) => [recordKey(record), record])).values()]
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key ?? '').localeCompare(String(b.finish_key ?? '')));

  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `${options.sourceKey}_preservation_v1`,
    source_kind: config.source_kind,
    source_url: config.source_url,
    source_status: 'available_generated_preservation',
    set_key: 'source_preservation',
    set_name: `${options.sourceKey} preservation`,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:source_preservation:${options.sourceKey}:${indexGeneratedAt}:${generatedAt}`,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    generation_note: `Generated from the last promoted English Master Index to preserve ${options.sourceKey} evidence against broad fixture volatility. Rows intentionally retain source_key ${options.sourceKey}; they are not new independent evidence.`,
    records,
  };
  const report = {
    version: 'english_master_index_preserve_source_from_index_v1',
    generated_at: generatedAt,
    source_index_generated_at: indexGeneratedAt,
    source_key: options.sourceKey,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_dir: options.dryRun ? null : config.fixture_dir,
    fixture_file: options.dryRun ? null : path.join(config.fixture_dir, config.fixture_name),
    summary: {
      records_generated: records.length,
      card_identity_records: cardRecords.length,
      finish_presence_records: printingRecords.length,
      source_key_preserved_as: options.sourceKey,
      source_authority_preserved_as: config.authority,
    },
  };

  if (!options.dryRun) {
    await fs.mkdir(config.fixture_dir, { recursive: true });
    await fs.writeFile(path.join(config.fixture_dir, config.fixture_name), `${JSON.stringify(fixture, null, 2)}\n`);
    await fs.mkdir(config.report_dir, { recursive: true });
    await fs.writeFile(path.join(config.report_dir, 'source_preservation_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(config.report_dir, 'source_preservation_v1.md'), [
      `# ${options.sourceKey} Preservation V1`,
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      'This fixture preserves evidence from the last promoted English Master Index under the same source authority. It does not create a new independent source.',
      '',
      `Generated: ${generatedAt}`,
      `Source index generated: ${indexGeneratedAt}`,
      '',
      `- Records generated: ${records.length}`,
      `- Card identity records: ${cardRecords.length}`,
      `- Finish presence records: ${printingRecords.length}`,
      '',
    ].join('\n'));
  }
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[source-preservation] failed:', error);
  process.exitCode = 1;
});
