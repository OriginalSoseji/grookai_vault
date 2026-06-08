import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const DEFAULT_CSV_PATH = 'tmp/pricecharting/pokemon_cards_pricecharting.csv';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_promo_exact_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pricecharting_promo_exact_acquisition_v1';
const SOURCE_KEY = 'pricecharting_csv_promo_exact';

const PROMO_SET_KEYS = new Set(['basep', 'bwp', 'dpp', 'hsp', 'mep', 'smp', 'swshp', 'svp', 'xyp']);
const STAMP_LABEL_PATTERN = /\b(stamp|stamped|staff|prerelease|pre release|championship|championships|regional|national|worlds|winner|pokemon center|pokemon center ny|jr stamp rally|asia championship|world championships|pokemon day)\b/i;
const STAMP_EXCLUSION_PATTERN = /\b(jumbo|no\s+[a-z0-9 ]*\s*stamp)\b/i;

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
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(value)
    .replace(/\bex\b/g, ' ex ')
    .replace(/\sgx\b/g, ' gx')
    .replace(/\s+/g, ' ')
    .trim();
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
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function readCsv(file) {
  const raw = await fs.readFile(file, 'utf8');
  const rows = parseCsv(raw);
  const headers = rows.shift() ?? [];
  return rows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
    .filter((row) => row.genre === 'Pokemon Card');
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
    variant_text: variantLabels.join(' '),
  };
}

function rowSetName(row) {
  return String(row['console-name'] ?? '').replace(/^Pokemon\s+/i, '').trim();
}

function isPromoConsole(row) {
  return comparable(rowSetName(row)) === 'promo';
}

function targetFacts(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'finish_second_source_needed')
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => PROMO_SET_KEYS.has(normalizeText(row.set_key)))
    .filter((row) => ['normal', 'stamped', 'holo', 'cosmos'].includes(normalizeFinishKey(row.finish_key)))
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name)));
}

function finishMatches(fact, parsed) {
  const finish = normalizeFinishKey(fact.finish_key);
  const variant = parsed.variant_text;
  if (finish === 'normal') {
    return parsed.variant_labels.length === 0
      ? { ok: true, reason: 'promo_base_product_without_variant_label' }
      : { ok: false, reason: 'normal_not_promoted_from_variant_label' };
  }
  if (finish === 'stamped') {
    if (!variant || STAMP_EXCLUSION_PATTERN.test(variant)) return { ok: false, reason: 'stamped_label_missing_or_excluded' };
    return STAMP_LABEL_PATTERN.test(variant)
      ? { ok: true, reason: 'explicit_stamped_promo_variant_label' }
      : { ok: false, reason: 'stamped_label_not_explicit' };
  }
  if (finish === 'holo') {
    return /^holo(?:foil)?$/i.test(variant)
      ? { ok: true, reason: 'explicit_holo_variant_label' }
      : { ok: false, reason: 'holo_label_not_exact' };
  }
  if (finish === 'cosmos') {
    return /cosmos holo/i.test(variant)
      ? { ok: true, reason: 'explicit_cosmos_holo_variant_label' }
      : { ok: false, reason: 'cosmos_label_not_exact' };
  }
  return { ok: false, reason: `unsupported_finish:${finish}` };
}

function factMatchesRow(fact, row, parsed) {
  if (!isPromoConsole(row)) return { ok: false, reason: 'not_pricecharting_promo_console' };
  if (normalizeNumber(fact.card_number).toLowerCase().replace(/^0+/, '') !== parsed.card_number.toLowerCase().replace(/^0+/, '')) {
    return { ok: false, reason: 'number_mismatch' };
  }
  if (cardComparable(fact.card_name) !== cardComparable(parsed.card_name)) return { ok: false, reason: 'name_mismatch' };
  return finishMatches(fact, parsed);
}

function fixtureRecord(result, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: result.source_url,
    set_key: result.fact.set_key,
    set_name: result.fact.set_name,
    card_number: normalizeNumber(result.fact.card_number),
    card_name: result.fact.card_name,
    finish_key: normalizeFinishKey(result.fact.finish_key),
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `PriceCharting exact promo product ${result.product_id}: ${result.product_name}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pricecharting_csv_promo_exact:${result.product_id}`,
    notes: 'Exact promo-family evidence accepted only when PriceCharting console is Pokemon Promo, card number and name match the target promo fact, finish label is explicit for non-normal rows, and only one matching product exists.',
  };
}

function groupBySet(records) {
  const out = new Map();
  for (const record of records) {
    if (!out.has(record.set_key)) out.set(record.set_key, []);
    out.get(record.set_key).push(record);
  }
  return out;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, csvRows] = await Promise.all([readJson(GAPS_PATH), readCsv(options.csvPath)]);
  const facts = targetFacts(gaps);
  const parsedRows = csvRows.map((row) => ({ row, parsed: parseProductName(row['product-name']) })).filter((entry) => entry.parsed);
  const results = [];
  for (const fact of facts) {
    const reviewed = [];
    for (const entry of parsedRows) {
      const validation = factMatchesRow(fact, entry.row, entry.parsed);
      if (validation.ok || validation.reason !== 'number_mismatch') {
        reviewed.push({
          source_url: sourceUrl(entry.row),
          product_id: entry.row.id,
          console_name: entry.row['console-name'],
          product_name: entry.row['product-name'],
          variant_labels: entry.parsed.variant_labels,
          validation,
        });
      }
    }
    const valid = reviewed.filter((row) => row.validation.ok);
    if (valid.length === 1) {
      results.push({
        status: 'validated',
        fact,
        source_url: valid[0].source_url,
        product_id: valid[0].product_id,
        product_name: valid[0].product_name,
        reviewed_candidates: valid,
      });
    } else {
      results.push({
        status: valid.length > 1 ? 'ambiguous_multiple_promo_matches' : 'no_exact_promo_match',
        fact,
        valid_match_count: valid.length,
        reviewed_candidates: reviewed.slice(0, 20),
      });
    }
  }
  const records = results.filter((row) => row.status === 'validated').map((row) => fixtureRecord(row, generatedAt));
  const fixtureFiles = [];
  if (!options.dryRun) {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    for (const [setKey, setRecords] of groupBySet(records)) {
      const fixture = {
        fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
        source_key: SOURCE_KEY,
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/console/pokemon-cards',
        source_status: 'available_generated_exact_promo_rows',
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
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const report = {
    version: 'english_master_index_pricecharting_promo_exact_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    rule: 'Only exact Pokemon Promo console rows with exact card number/name and explicit non-normal finish labels are accepted. Ambiguous multiple promo rows remain blocked.',
    summary: {
      target_facts: facts.length,
      records_generated: records.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      validated_by_set: countBy(results.filter((row) => row.status === 'validated'), (row) => `${row.fact.set_key}|${row.fact.set_name}`),
    },
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_promo_exact_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_promo_exact_acquisition_v1.md'), [
    '# PriceCharting Promo Exact Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(['Metric', 'Value'], Object.entries(report.summary).map(([key, value]) => [
      key,
      typeof value === 'object' ? JSON.stringify(value) : value,
    ])),
    '',
    '## Validated Rows',
    '',
    records.length
      ? markdownTable(['set', 'number', 'card', 'finish', 'source'], records.map((row) => [
        row.set_key,
        row.card_number,
        row.card_name,
        row.finish_key,
        row.source_url,
      ]))
      : 'None.',
    '',
  ].join('\n'));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[pricecharting-promo-exact] failed:', error);
  process.exitCode = 1;
});
