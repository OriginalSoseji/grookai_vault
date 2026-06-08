import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAP_FACTS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const CURRENT_PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const DEFAULT_CSV_PATH = 'tmp/pricecharting/pokemon_cards_pricecharting.csv';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_base_product_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pricecharting_base_product_acquisition_v1';
const SOURCE_KEY = 'pricecharting_csv_base_product';

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

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\btrading card game\b/g, ' ')
    .replace(/\benglish\b/g, ' ')
    .replace(/\bexpansion\b/g, ' ')
    .replace(/\bcollection\b/g, ' ')
    .replace(/\bset\b/g, ' ')
    .replace(/\bbasic\s+(.+?\s+energy)\b/g, '$1')
    .replace(/\btrainer\s+s\s+mail\b/g, 'trainers mail')
    .replace(/\btrainers\s+mail\b/g, 'trainers mail')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(String(value ?? '').replace(/^Pokemon\s+/i, ''));
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[''.:’]/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceUrl(row) {
  return `https://www.pricecharting.com/game/${slug(row['console-name'])}/${slug(row['product-name'])}`;
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

async function readPriceChartingCsv(csvPath) {
  const raw = await fs.readFile(csvPath, 'utf8');
  const rows = parseCsv(raw);
  const headers = rows.shift() ?? [];
  return rows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
    .filter((row) => /^Pokemon Cards?$/i.test(row['genre'] ?? '') || /^Pokemon\b/i.test(row['console-name'] ?? ''));
}

function parseProductName(productName) {
  const raw = String(productName ?? '').trim();
  const match = raw.match(/^(?<name>.+?)\s*(?<variants>(?:\[[^\]]+\]\s*)*)#(?<number>[A-Za-z0-9.-]+)(?:\b|$)/);
  if (!match?.groups) return null;
  const variantLabels = [...match.groups.variants.matchAll(/\[([^\]]+)\]/g)].map((entry) => entry[1].trim());
  return {
    raw,
    card_name: match.groups.name.trim(),
    card_number: normalizeNumber(match.groups.number),
    variant_labels: variantLabels,
  };
}

function comparableNumber(value) {
  return normalizeNumber(value).toLowerCase();
}

function isLetterSuffixedNumber(value) {
  return /^[0-9]+[a-z]$/i.test(normalizeNumber(value));
}

function loadTargetFacts(artifact) {
  return (artifact.facts ?? [])
    .filter((fact) => fact.gap_type === 'finish_human_checklist_evidence_needed')
    .filter((fact) => fact.fact_type === 'printing_finish')
    .filter((fact) => fact.status === 'candidate_unconfirmed')
    .filter((fact) => normalizeFinishKey(fact.finish_key) === 'normal')
    .filter((fact) => isLetterSuffixedNumber(fact.card_number))
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name)));
}

function setMatches(fact, row) {
  const factSet = setComparable(fact.set_name);
  const csvSet = setComparable(row['console-name']);
  return factSet === csvSet || factSet.endsWith(csvSet) || csvSet.endsWith(factSet);
}

function productMatchesFact(fact, row) {
  const parsed = parseProductName(row['product-name']);
  if (!parsed) return false;
  if (parsed.variant_labels.length > 0) return false;
  if (comparableNumber(parsed.card_number) !== comparableNumber(fact.card_number)) return false;
  if (comparable(parsed.card_name) !== comparable(fact.card_name)) return false;
  return setMatches(fact, row);
}

function recordFromMatch(fact, row, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: sourceUrl(row),
    set_key: fact.set_key,
    set_name: fact.set_name,
    card_number: normalizeNumber(fact.card_number),
    card_name: fact.card_name,
    finish_key: 'normal',
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `PriceCharting exact base product row: ${row['product-name']}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pricecharting_csv_base_product:${row.id ?? row['product-id'] ?? row['product-name']}`,
    notes: 'Constrained acquisition: only letter-suffixed alternate card numbers are considered, and only exact same-set base product rows without bracketed variant labels are accepted. Broad unlabeled marketplace rows are not treated as normal finish evidence.',
  };
}

function recordKey(record) {
  return [
    record.set_key,
    normalizeNumber(record.card_number).toLowerCase(),
    comparable(record.card_name),
    normalizeFinishKey(record.finish_key),
    record.source_url,
  ].join('|');
}

async function preservedCurrentIndexRecords(generatedAt) {
  try {
    const currentPrintings = await readJson(CURRENT_PRINTINGS_PATH);
    const rows = Array.isArray(currentPrintings) ? currentPrintings : (currentPrintings.printings ?? []);
    return rows
      .filter((row) => row.fact_type === 'printing_finish')
      .filter((row) => normalizeFinishKey(row.finish_key) === 'normal')
      .filter((row) => (row.sources ?? []).includes(SOURCE_KEY))
      .map((row) => {
        const sourceUrl = (row.evidence_urls ?? []).find((url) => /pricecharting\.com/i.test(url));
        if (!sourceUrl) return null;
        return {
          source_key: SOURCE_KEY,
          source_kind: 'marketplace_checklist',
          source_url: sourceUrl,
          set_key: row.set_key,
          set_name: row.set_name,
          card_number: normalizeNumber(row.card_number),
          card_name: row.card_name,
          finish_key: 'normal',
          rarity: null,
          evidence_type: 'finish_presence',
          evidence_label: `PriceCharting preserved base product row: ${row.card_name} #${normalizeNumber(row.card_number)}`,
          language: 'en',
          retrieved_at: generatedAt,
          raw_snapshot_ref: `pricecharting_csv_base_product:preserved:${sourceUrl}`,
          notes: 'Preserved from the current promoted Master Index so regenerating this source lane cannot remove previously accepted exact base-product evidence.',
        };
      })
      .filter(Boolean);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const gaps = await readJson(GAP_FACTS_PATH);
  const targets = loadTargetFacts(gaps);
  const rows = await readPriceChartingCsv(options.csvPath);
  const preservedRecords = await preservedCurrentIndexRecords(generatedAt);
  const records = [...preservedRecords];
  const seenRecordKeys = new Set(records.map(recordKey));
  const results = [];

  for (const fact of targets) {
    const matches = rows.filter((row) => productMatchesFact(fact, row));
    if (matches.length === 1) {
      const record = recordFromMatch(fact, matches[0], generatedAt);
      if (!seenRecordKeys.has(recordKey(record))) {
        records.push(record);
        seenRecordKeys.add(recordKey(record));
      }
      results.push({ status: 'validated', fact, source_url: record.source_url, evidence_label: record.evidence_label });
    } else {
      results.push({
        status: matches.length > 1 ? 'ambiguous_multiple_matches' : 'no_exact_base_product_match',
        fact,
        match_count: matches.length,
      });
    }
  }

  const recordsBySet = new Map();
  for (const record of records) {
    if (!recordsBySet.has(record.set_key)) recordsBySet.set(record.set_key, []);
    recordsBySet.get(record.set_key).push(record);
  }

  const fixtureFiles = [];
  if (!options.dryRun) {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    for (const [setKey, setRecords] of recordsBySet.entries()) {
      const fixture = {
        fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
        source_key: SOURCE_KEY,
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/console/pokemon-cards',
        source_status: 'available_generated_exact_base_product_rows',
        set_key: setKey,
        set_name: setRecords[0]?.set_name,
        retrieved_at: generatedAt,
        raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
        audit_only: true,
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        records: setRecords,
      };
      const file = path.join(FIXTURE_DIR, `${setKey}.json`);
      await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
      fixtureFiles.push(file);
    }
  }

  const byStatus = {};
  for (const result of results) byStatus[result.status] = (byStatus[result.status] ?? 0) + 1;
  const report = {
    version: 'english_master_index_pricecharting_base_product_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    rule: 'Only letter-suffixed alternate card-number normal-finish gaps may use exact PriceCharting base product rows. This lane intentionally excludes broad unlabeled marketplace rows.',
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    summary: {
      target_facts: targets.length,
      preserved_current_index_records: preservedRecords.length,
      records_generated: records.length,
      fixture_files_written: fixtureFiles.length,
      by_status: byStatus,
    },
    results,
  };

  if (!options.dryRun) {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_base_product_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_base_product_acquisition_v1.md'), [
      '# PriceCharting Base Product Acquisition V1',
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      `Generated: ${generatedAt}`,
      '',
      '## Summary',
      '',
      markdownTable(['Metric', 'Value'], Object.entries(report.summary).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value])),
      '',
      '## Guardrail',
      '',
      report.rule,
      '',
      '## Validated Rows',
      '',
      records.length
        ? markdownTable(['set', 'number', 'card', 'finish', 'url'], records.map((row) => [row.set_key, row.card_number, row.card_name, row.finish_key, row.source_url]))
        : 'None.',
      '',
    ].join('\n'));
  }

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[pricecharting-base-product] failed:', error);
  process.exitCode = 1;
});
